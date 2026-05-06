'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { transactionService } from '@/src/services/transaction.service';
import type {
  BuildTransactionResponse,
  ExecuteTransactionRequest,
  MessageResponse,
  PendingSpecialNeedProposal,
} from '@/src/types/api.types';

type ExecuteApiPayload =
  | BuildTransactionResponse
  | MessageResponse
  | PendingSpecialNeedProposal
  | Record<string, unknown>;

function hasTxBytes(data: ExecuteApiPayload): data is BuildTransactionResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tx_bytes' in data &&
    typeof (data as BuildTransactionResponse).tx_bytes === 'string' &&
    !!(data as BuildTransactionResponse).tx_bytes
  );
}

/**
 * Wraps API calls that return BuildTransactionResponse (on-chain) or MessageResponse only.
 * When tx_bytes is present it calls POST /tx/execute; otherwise shows success without execute.
 */
export function useExecuteTransaction() {
  const [executing, setExecuting] = useState(false);

  const execute = useCallback(
    async (
      apiCall: () => Promise<{ data: ExecuteApiPayload }>,
      options?: { successMessage?: string; skipExecute?: boolean },
    ): Promise<boolean> => {
      setExecuting(true);
      try {
        const res = await apiCall();
        const txData = res.data;

        if (!hasTxBytes(txData) || options?.skipExecute) {
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
