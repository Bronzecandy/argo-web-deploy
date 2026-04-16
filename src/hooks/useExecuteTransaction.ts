'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { transactionService } from '@/src/services/transaction.service';
import type { BuildTransactionResponse, ExecuteTransactionRequest } from '@/src/types/api.types';

/**
 * Wraps any API call that returns BuildTransactionResponse.
 * After the API succeeds it automatically calls POST /tx/execute
 * with the tx_bytes + a placeholder signature (the backend handles
 * zkLogin verification). Passes through extra fields like center_req,
 * registration_req, upload_child_req, proposal_id.
 */
export function useExecuteTransaction() {
  const [executing, setExecuting] = useState(false);

  const execute = useCallback(
    async (
      apiCall: () => Promise<{ data: BuildTransactionResponse }>,
      options?: { successMessage?: string; skipExecute?: boolean },
    ): Promise<boolean> => {
      setExecuting(true);
      try {
        const res = await apiCall();
        const txData = res.data;

        if (!txData.tx_bytes || options?.skipExecute) {
          toast.success(options?.successMessage || 'Action completed');
          return true;
        }

        const executeReq: ExecuteTransactionRequest = {
          tx_bytes: txData.tx_bytes,
          signature: txData.tx_bytes,
          center_req: txData.center_req,
          registration_req: txData.registration_req,
          upload_child_req: txData.upload_child_req,
          proposal_id: txData.proposal_id,
        };

        await transactionService.execute(executeReq);
        toast.success(options?.successMessage || 'Transaction executed on-chain');
        return true;
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Transaction failed';
        toast.error(msg);
        return false;
      } finally {
        setExecuting(false);
      }
    },
    [],
  );

  return { execute, executing };
}
