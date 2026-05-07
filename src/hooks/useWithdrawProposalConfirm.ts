'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { withdrawService } from '@/src/services/withdraw.service';
import { transactionService } from '@/src/services/transaction.service';
import type { ExecuteTransactionRequest } from '@/src/types/api.types';
import { hasTxBytes, isMessageOnly, isPaymentRedirect } from '@/src/lib/withdrawConfirm';

export type PayOSDialogState = {
  open: boolean;
  url: string;
  paymentId?: string | number;
  title?: string;
};

const initialPayOS: PayOSDialogState = { open: false, url: '' };

/**
 * Handles POST /withdraw-proposals/:id/confirm — on-chain tx, PayOS redirect, or message-only.
 */
export function useWithdrawProposalConfirm() {
  const [busy, setBusy] = useState(false);
  const [payOS, setPayOS] = useState<PayOSDialogState>(initialPayOS);

  const closePayOS = useCallback(() => setPayOS(initialPayOS), []);

  const runConfirm = useCallback(
    async (id: string, options?: { successMessage?: string }): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await withdrawService.confirm(id);
        const data = res.data;

        if (isPaymentRedirect(data)) {
          const paymentId = data.payment_id ?? data.id ?? data.order_code;
          setPayOS({
            open: true,
            url: data.url,
            paymentId,
            title: 'Hoàn tất thanh toán PayOS',
          });
          toast.success('Mở PayOS để chuyển tiền. Kiểm tra trạng thái bên dưới.');
          return true;
        }

        if (hasTxBytes(data)) {
          const executeReq: ExecuteTransactionRequest = {
            tx_bytes: data.tx_bytes,
            signature: data.tx_bytes,
            center_req: data.center_req,
            registration_req: data.registration_req,
            upload_child_req: data.upload_child_req,
            proposal_id: data.proposal_id,
          };
          await transactionService.execute(executeReq);
          toast.success(options?.successMessage || 'Proposal confirmed & executed');
          return true;
        }

        if (isMessageOnly(data)) {
          toast.success(data.message || options?.successMessage || 'Completed');
          return true;
        }

        toast.success(options?.successMessage || 'Proposal confirmed');
        return true;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        toast.error(msg || 'Confirm failed');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const runMainPoolConfirm = useCallback(
    async (id: string, imageBlobId: string, options?: { successMessage?: string }): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await withdrawService.mainPoolConfirm(id, imageBlobId);
        const data = res.data;

        if (hasTxBytes(data)) {
          const executeReq: ExecuteTransactionRequest = {
            tx_bytes: data.tx_bytes,
            signature: data.tx_bytes,
            center_req: data.center_req,
            registration_req: data.registration_req,
            upload_child_req: data.upload_child_req,
            proposal_id: data.proposal_id,
          };
          await transactionService.execute(executeReq);
          toast.success(options?.successMessage || 'Transfer confirmed on-chain');
          return true;
        }

        toast.success(options?.successMessage || 'Recorded');
        return true;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        toast.error(msg || 'Confirm failed');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, payOS, closePayOS, runConfirm, runMainPoolConfirm };
}
