import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi, type MockDataSyncRequest, type MockDataSyncResponse } from '../../services/api';

export function useSyncMockData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: MockDataSyncRequest) => syncApi.syncMockData(options),
    onSuccess: () => {
      // Invalidate any EHR-related queries after sync
      queryClient.invalidateQueries({ queryKey: ['ehr'] });
      queryClient.invalidateQueries({ queryKey: ['webhookEvents'] });
    },
  });
}

export type { MockDataSyncRequest, MockDataSyncResponse };
