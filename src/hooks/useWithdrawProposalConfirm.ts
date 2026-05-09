'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { withdrawService } from '@/src/services/withdraw.service';
import { transactionService } from '@/src/services/transaction.service';
import { paymentService } from '@/src/services/payment.service';
import type { ExecuteTransactionRequest } from '@/src/types/api.types';
import {
  hasTxBytes,
  isManualBankTransferConfirm,
  isMessageOnly,
  isPaymentRedirect,
} from '@/src/lib/withdrawConfirm';

export type PayOSDialogState = {
  open: boolean;
  url: string;
  paymentId?: string | number;
  title?: string;
};

const initialPayOS: PayOSDialogState = { open: false, url: '' };

type ConfirmContext = {
  proofBlobId?: string;
  successMessage?: string;
};

type ConfirmHandled =
  | { kind: 'done'; ok: boolean }
  | { kind: 'payos'; state: PayOSDialogState };

/**
 * Shared handler for POST /withdraw-proposals/:id/confirm response body.
 * @param proofBlobId Required when response is manual bank transfer (`payment_callback`).
 */
async function handleConfirmResponse(data: unknown, ctx: ConfirmContext): Promise<ConfirmHandled> {
  const successMessage = ctx.successMessage;

  if (isManualBankTransferConfirm(data)) {
    const blob = ctx.proofBlobId?.trim();
    if (!blob) {
      toast.error('Manual bank transfer requires an uploaded proof image (blob id)');
      return { kind: 'done', ok: false };
    }
    try {
      await paymentService.submitWithdrawAuthCallback(data.payment_callback, blob);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to submit proof to payment callback');
      return { kind: 'done', ok: false };
    }
    toast.success(successMessage || 'Transfer proof submitted & payment recorded');
    return { kind: 'done', ok: true };
  }

  if (isPaymentRedirect(data)) {
    const paymentId = data.payment_id ?? data.id ?? data.order_code;
    return {
      kind: 'payos',
      state: {
        open: true,
        url: data.url,
        paymentId,
        title: 'Complete PayOS payment',
      },
    };
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
    toast.success(successMessage || 'Proposal confirmed & executed');
    return { kind: 'done', ok: true };
  }

  if (isMessageOnly(data)) {
    toast.success(data.message || successMessage || 'Completed');
    return { kind: 'done', ok: true };
  }

  toast.success(successMessage || 'Proposal confirmed');
  return { kind: 'done', ok: true };
}

/**
 * Handles POST /withdraw-proposals/:id/confirm — on-chain tx, PayOS redirect, manual bank callback, or message-only.
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
        const result = await handleConfirmResponse(res.data, { successMessage: options?.successMessage });
        if (result.kind === 'payos') {
          setPayOS(result.state);
          toast.success('Open PayOS to pay. Poll status below.');
          return true;
        }
        return result.ok;
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

  /**
   * Supplies proof `blob_id` for manual (non-PayOS) bank flow (`payment_callback`).
   * PayOS / on-chain responses ignore the blob.
   */
  const runConfirmWithProof = useCallback(
    async (id: string, proofBlobId: string, options?: { successMessage?: string }): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await withdrawService.confirm(id);
        const result = await handleConfirmResponse(res.data, {
          proofBlobId,
          successMessage: options?.successMessage,
        });
        if (result.kind === 'payos') {
          setPayOS(result.state);
          toast.success('Open PayOS to pay. Poll status below.');
          return true;
        }
        return result.ok;
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

  return { busy, payOS, closePayOS, runConfirm, runConfirmWithProof, runMainPoolConfirm };
}
