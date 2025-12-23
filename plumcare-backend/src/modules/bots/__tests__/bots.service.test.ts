import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as botsService from '../bots.service.js';
import { getMedplumClient } from '../../../shared/medplum/index.js';

// Mock the Medplum client
vi.mock('../../../shared/medplum/index.js', () => ({
  getMedplumClient: vi.fn(),
}));

// Mock Redis
vi.mock('../../../core/database/index.js', () => ({
  redis: {
    isReady: vi.fn().mockReturnValue(false),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
  },
  CacheKeys: {
    botExecutions: (id: string) => `bot:executions:${id}`,
  },
  CacheTTL: {
    BOT_EXECUTIONS: 3600,
  },
}));

describe('BotsService', () => {
  const mockMedplumClient = {
    createResource: vi.fn(),
    readResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    searchResources: vi.fn(),
    post: vi.fn(),
    fhirUrl: vi.fn().mockReturnValue('http://test/Bot/123/$deploy'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMedplumClient).mockReturnValue(mockMedplumClient as any);
  });

  describe('getBots', () => {
    it('should return all bots from Medplum', async () => {
      const mockBots = [
        { resourceType: 'Bot', id: 'bot-1', name: 'Test Bot 1' },
        { resourceType: 'Bot', id: 'bot-2', name: 'Test Bot 2' },
      ];
      mockMedplumClient.searchResources.mockResolvedValue(mockBots);

      const result = await botsService.getBots();

      expect(mockMedplumClient.searchResources).toHaveBeenCalledWith('Bot', { _count: '100' });
      expect(result).toEqual(mockBots);
    });
  });

  describe('getBot', () => {
    it('should return a specific bot by ID', async () => {
      const mockBot = { resourceType: 'Bot', id: 'bot-1', name: 'Test Bot' };
      mockMedplumClient.readResource.mockResolvedValue(mockBot);

      const result = await botsService.getBot('bot-1');

      expect(mockMedplumClient.readResource).toHaveBeenCalledWith('Bot', 'bot-1');
      expect(result).toEqual(mockBot);
    });

    it('should return undefined if bot not found', async () => {
      mockMedplumClient.readResource.mockRejectedValue(new Error('Not found'));

      const result = await botsService.getBot('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('createBot', () => {
    it('should create a new bot in Medplum', async () => {
      const mockCreatedBot = { resourceType: 'Bot', id: 'new-bot', name: 'New Bot' };
      mockMedplumClient.createResource.mockResolvedValue(mockCreatedBot);

      const result = await botsService.createBot({
        name: 'New Bot',
        description: 'A test bot',
        code: '',
      });

      expect(mockMedplumClient.createResource).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Bot',
          name: 'New Bot',
          description: 'A test bot',
        })
      );
      expect(result).toEqual(mockCreatedBot);
    });

    it('should create bot and deploy code if provided', async () => {
      const mockCreatedBot = { resourceType: 'Bot', id: 'new-bot', name: 'New Bot' };
      mockMedplumClient.createResource.mockResolvedValue(mockCreatedBot);
      mockMedplumClient.post.mockResolvedValue({ success: true });

      const result = await botsService.createBot({
        name: 'New Bot',
        description: 'A test bot',
        code: 'console.log("Hello");',
      });

      expect(mockMedplumClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedBot);
    });
  });

  describe('updateBot', () => {
    it('should update bot metadata', async () => {
      const existingBot = { resourceType: 'Bot', id: 'bot-1', name: 'Old Name' };
      const updatedBot = { resourceType: 'Bot', id: 'bot-1', name: 'New Name' };

      mockMedplumClient.readResource.mockResolvedValue(existingBot);
      mockMedplumClient.updateResource.mockResolvedValue(updatedBot);

      const result = await botsService.updateBot('bot-1', { name: 'New Name' });

      expect(mockMedplumClient.updateResource).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' })
      );
      expect(result).toEqual(updatedBot);
    });
  });

  describe('deleteBot', () => {
    it('should delete a bot from Medplum', async () => {
      mockMedplumClient.deleteResource.mockResolvedValue(undefined);

      await botsService.deleteBot('bot-1');

      expect(mockMedplumClient.deleteResource).toHaveBeenCalledWith('Bot', 'bot-1');
    });
  });

  describe('executeBot', () => {
    it('should execute a bot and record success', async () => {
      const mockResult = { success: true, data: 'result' };
      mockMedplumClient.post.mockResolvedValue(mockResult);

      const result = await botsService.executeBot('bot-1', { test: 'input' });

      expect(result).toEqual(mockResult);
    });

    it('should record error execution on failure', async () => {
      mockMedplumClient.post.mockRejectedValue(new Error('Execution failed'));

      await expect(botsService.executeBot('bot-1', { test: 'input' }))
        .rejects.toThrow('Execution failed');
    });
  });

  describe('getBotExecutions', () => {
    it('should return executions from fallback when Redis is not ready', async () => {
      const executions = await botsService.getBotExecutions('bot-1', 10);

      expect(Array.isArray(executions)).toBe(true);
    });
  });

  describe('getBotTemplates', () => {
    it('should return available bot templates', () => {
      const templates = botsService.getBotTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('description');
      expect(templates[0]).toHaveProperty('key');
    });
  });

  describe('getBotTemplateByKey', () => {
    it('should return template code for valid key', () => {
      const template = botsService.getBotTemplateByKey('welcomeEmail');

      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template).toContain('handler');
    });

    it('should return undefined for invalid key', () => {
      const template = botsService.getBotTemplateByKey('nonExistentTemplate');

      expect(template).toBeUndefined();
    });
  });

  describe('createBotSubscription', () => {
    it('should create a subscription for a bot', async () => {
      const mockSubscription = {
        resourceType: 'Subscription',
        id: 'sub-1',
        status: 'active',
        criteria: 'Patient',
      };
      mockMedplumClient.createResource.mockResolvedValue(mockSubscription);

      const result = await botsService.createBotSubscription('bot-1', 'Patient', 'create');

      expect(mockMedplumClient.createResource).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Subscription',
          status: 'active',
          criteria: 'Patient',
        })
      );
      expect(result).toEqual(mockSubscription);
    });
  });
});
