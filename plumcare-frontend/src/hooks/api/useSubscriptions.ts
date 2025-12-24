import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, type SubscriptionConfig, type Subscription } from '../../services/api';

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.getAll(),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: SubscriptionConfig) => subscriptionsApi.create(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useCreateDefaultSubscriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionsApi.createDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.resume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export type { SubscriptionConfig, Subscription };
