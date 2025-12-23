import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { validateRequest } from '../validation.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../__tests__/utils/test-helpers.js';

// Test DTO classes
class TestBodyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class TestParamsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

class TestQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

describe('validateRequest middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('body validation', () => {
    it('should pass valid body and call next', async () => {
      const middleware = validateRequest({ body: TestBodyDto });
      const req = createMockRequest({
        body: { name: 'Test Name', description: 'Test Description' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should pass with optional field missing', async () => {
      const middleware = validateRequest({ body: TestBodyDto });
      const req = createMockRequest({
        body: { name: 'Test Name' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should fail with missing required field', async () => {
      const middleware = validateRequest({ body: TestBodyDto });
      const req = createMockRequest({
        body: { description: 'Only description' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });

    it('should fail with invalid type', async () => {
      const middleware = validateRequest({ body: TestBodyDto });
      const req = createMockRequest({
        body: { name: 123 }, // Should be string
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });

  describe('params validation', () => {
    it('should pass valid params', async () => {
      const middleware = validateRequest({ params: TestParamsDto });
      const req = createMockRequest({
        params: { id: 'valid-id-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should fail with empty param', async () => {
      const middleware = validateRequest({ params: TestParamsDto });
      const req = createMockRequest({
        params: { id: '' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });

  describe('query validation', () => {
    it('should pass valid query params', async () => {
      const middleware = validateRequest({ query: TestQueryDto });
      const req = createMockRequest({
        query: { limit: '50' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should pass with no query params (all optional)', async () => {
      const middleware = validateRequest({ query: TestQueryDto });
      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should fail with limit below minimum', async () => {
      const middleware = validateRequest({ query: TestQueryDto });
      const req = createMockRequest({
        query: { limit: '0' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });

    it('should fail with limit above maximum', async () => {
      const middleware = validateRequest({ query: TestQueryDto });
      const req = createMockRequest({
        query: { limit: '200' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });

  describe('combined validation', () => {
    it('should validate body, params, and query together', async () => {
      const middleware = validateRequest({
        body: TestBodyDto,
        params: TestParamsDto,
        query: TestQueryDto,
      });
      const req = createMockRequest({
        body: { name: 'Test Name' },
        params: { id: 'test-id' },
        query: { limit: '10' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next._error).toBeUndefined();
    });

    it('should fail if any validation fails', async () => {
      const middleware = validateRequest({
        body: TestBodyDto,
        params: TestParamsDto,
        query: TestQueryDto,
      });
      const req = createMockRequest({
        body: { name: 'Test Name' },
        params: { id: '' }, // Invalid
        query: { limit: '10' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });
});
