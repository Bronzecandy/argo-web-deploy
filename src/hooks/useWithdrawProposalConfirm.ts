'use client';

/** Withdraw proposal confirm + PayOS polling for **Admin treasury** (`/admin/treasury`). Not used on leader routes. */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { withdrawService } from '@/src/services/withdraw.service';
import { transactionService } from '@/src/services/transaction.service';
import { paymentService } from '@/src/services/payment.service';
import type { ExecuteTransactionRequest, ManualBankTransferConfirmResponse } from '@/src/types/api.types';
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
  /** Withdraw proposal id — used to clear session draft after PayOS success. */
  proposalId?: string | null;
};

const initialPayOS: PayOSDialogState = { open: false, url: '' };

type ConfirmContext = {
  proofBlobId?: string;
  successMessage?: string;
  /** When true, manual bank response without proof returns `manual_pending` instead of erroring. */
  allowManualWithoutProof?: boolean;
};

export type ConfirmDispatchResult =
  | { kind: 'done'; ok: boolean }
  | { kind: 'payos'; state: PayOSDialogState }
  | { kind: 'manual_pending'; data: ManualBankTransferConfirmResponse };

/**
 * Parses POST /withdraw-proposals/:id/confirm body. For manual bank, either submits proof or defers when allowed.
 */
export async function dispatchWithdrawConfirmResponse(
  data: unknown,
  ctx: ConfirmContext,
): Promise<ConfirmDispatchResult> {
  const successMessage = ctx.successMessage;

  if (isManualBankTransferConfirm(data)) {
    const blob = ctx.proofBlobId?.trim();
    if (!blob) {
      if (ctx.allowManualWithoutProof) {
        return { kind: 'manual_pending', data };
      }
      toast.error('Chuyển khoản thủ công cần ảnh chứng từ (blob id)');
      return { kind: 'done', ok: false };
    }
    const ok = await submitManualBankTransferProof(data, blob, successMessage);
    return { kind: 'done', ok };
  }

  if (isPaymentRedirect(data)) {
    const paymentId = data.payment_id ?? data.id ?? data.order_code;
    return {
      kind: 'payos',
      state: {
        open: true,
        url: data.url,
        paymentId,
        title: 'Thanh toán PayOS',
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
    toast.success(successMessage || 'Đã xác nhận và thực hiện đề xuất');
    return { kind: 'done', ok: true };
  }

  if (isMessageOnly(data)) {
    toast.success(data.message || successMessage || 'Hoàn tất');
    return { kind: 'done', ok: true };
  }

  toast.success(successMessage || 'Đã xác nhận đề xuất');
  return { kind: 'done', ok: true };
}

export async function submitManualBankTransferProof(
  data: ManualBankTransferConfirmResponse,
  proofBlobId: string,
  successMessage?: string,
): Promise<boolean> {
  const blob = proofBlobId.trim();
  if (!blob) {
    toast.error('Thiếu ảnh chứng từ (blob id)');
    return false;
  }
  try {
    await paymentService.submitWithdrawAuthCallback(data.payment_callback, blob);
    toast.success(successMessage || 'Đã gửi bằng chứng và ghi nhận thanh toán');
    return true;
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
        : '';
    toast.error(msg || 'Gửi chứng từ thất bại');
    return false;
  }
}

export function useWithdrawProposalConfirm() {
  const [busy, setBusy] = useState(false);
  const [payOS, setPayOS] = useState<PayOSDialogState>(initialPayOS);

  const closePayOS = useCallback(() => setPayOS(initialPayOS), []);

  const runConfirm = useCallback(async (id: string, options?: { successMessage?: string }): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await withdrawService.confirm(id);
      const result = await dispatchWithdrawConfirmResponse(res.data, { successMessage: options?.successMessage });
      if (result.kind === 'payos') {
        setPayOS(result.state);
        toast.success('Mở PayOS để thanh toán.');
        return true;
      }
      return result.kind === 'done' && result.ok;
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Xác nhận thất bại');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const runConfirmWithProof = useCallback(
    async (id: string, proofBlobId: string, options?: { successMessage?: string }): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await withdrawService.confirm(id);
        const result = await dispatchWithdrawConfirmResponse(res.data, {
          proofBlobId,
          successMessage: options?.successMessage,
          allowManualWithoutProof: false,
        });
        if (result.kind === 'payos') {
          setPayOS(result.state);
          toast.success('Mở PayOS để thanh toán.');
          return true;
        }
        return result.kind === 'done' && result.ok;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        toast.error(msg || 'Xác nhận thất bại');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /** Single confirm call; defers manual bank until proof (returns `manual_pending`). */
  const runConfirmFirstStep = useCallback(async (id: string, options?: { successMessage?: string }) => {
    setBusy(true);
    try {
      const res = await withdrawService.confirm(id);
      return await dispatchWithdrawConfirmResponse(res.data, {
        successMessage: options?.successMessage,
        allowManualWithoutProof: true,
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Xác nhận thất bại');
      return { kind: 'done' as const, ok: false };
    } finally {
      setBusy(false);
    }
  }, []);

  const applyPayOSFromResult = useCallback((state: PayOSDialogState) => {
    setPayOS(state);
    toast.success('Mở PayOS để thanh toán.');
  }, []);

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
          toast.success(options?.successMessage || 'Đã xác nhận chuyển khoản trên chuỗi');
          return true;
        }

        toast.success(options?.successMessage || 'Đã ghi nhận');
        return true;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        toast.error(msg || 'Xác nhận thất bại');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    busy,
    payOS,
    closePayOS,
    runConfirm,
    runConfirmWithProof,
    runConfirmFirstStep,
    applyPayOSFromResult,
    runMainPoolConfirm,
    submitManualBankTransferProof,
  };
}
