import { useQuery } from '@tanstack/react-query';
import { webhooksApi } from '../../services/api';

export function useWebhookEvents(limit = 20) {
  return useQuery({
    queryKey: ['webhookEvents', limit],
    queryFn: () => webhooksApi.getEvents(limit),
  });
}
