import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { botsApi, type BotConfig, type Bot, type BotExecution } from '../../services/api';

export function useBots() {
  return useQuery({
    queryKey: ['bots'],
    queryFn: () => botsApi.getAll(),
  });
}

export function useBotTemplates() {
  return useQuery({
    queryKey: ['bots', 'templates'],
    queryFn: () => botsApi.getTemplates(),
  });
}

export function useBotTemplateCode(key: string) {
  return useQuery({
    queryKey: ['bots', 'templates', key],
    queryFn: () => botsApi.getTemplateCode(key),
    enabled: !!key,
  });
}

export function useBotExecutions(botId?: string, limit = 20) {
  return useQuery({
    queryKey: ['bots', 'executions', botId, limit],
    queryFn: () => botsApi.getExecutions(botId, limit),
  });
}

export function useCreateBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: BotConfig) => botsApi.create(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });
}

export function useCreateBotFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, templateKey, description }: { name: string; templateKey: string; description?: string }) =>
      botsApi.createFromTemplate(name, templateKey, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });
}

export function useExecuteBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, input }: { botId: string; input?: unknown }) => botsApi.execute(botId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots', 'executions'] });
    },
  });
}

export function useDeleteBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => botsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });
}

export function useCreateBotSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, criteria, interaction }: { botId: string; criteria: string; interaction?: 'create' | 'update' | 'delete' }) =>
      botsApi.createSubscription(botId, criteria, interaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export type { BotConfig, Bot, BotExecution };
