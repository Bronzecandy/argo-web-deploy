export function formatVND(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Integer counts / non-currency amounts with en-US grouping (e.g. 1,234,567). */
export function formatInteger(value: number | null | undefined, emptyDisplay = '0'): string {
  if (value == null || Number.isNaN(Number(value))) return emptyDisplay;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value));
}

/** Strip non-digits; empty or non-finite result → null. */
export function parseDigitsToNumber(s: string): number | null {
  const d = s.replace(/\D/g, '');
  if (!d) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString?.trim()) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString?.trim()) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Full date/time including seconds (e.g. withdraw proposal `closed_at`). */
export function formatDateTimeSeconds(dateString: string | null | undefined): string {
  if (!dateString?.trim()) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/** Ngưỡng trọng số duyệt / số tiền rút để đề xuất được chấp nhận (on-chain). */
export const WITHDRAW_APPROVAL_THRESHOLD = 0.7;

export type WithdrawProposalUiStatusLabel = 'Đang bỏ phiếu' | 'Chờ nhận tiền' | 'Từ chối' | 'đã nhận tiền';

/** BE dùng epoch khi phiên chưa đóng theo thời gian — không coi là đã hết hạn / từ chối. */
export function isWithdrawEpochClosedAt(closed_at?: string | null): boolean {
  const closed = closed_at?.trim();
  if (!closed) return false;
  const end = new Date(closed).getTime();
  return !Number.isNaN(end) && end <= 0;
}

export function getWithdrawApprovalPercent(r: {
  approve_weight: number;
  withdraw_amount: number;
}): number {
  if (!(r.withdraw_amount > 0)) return 0;
  return Math.min(100, Math.round((r.approve_weight / r.withdraw_amount) * 100));
}

export function getWithdrawRefusePercent(r: {
  refuse_weight: number;
  withdraw_amount: number;
}): number {
  if (!(r.withdraw_amount > 0)) return 0;
  return Math.min(100, Math.round((r.refuse_weight / r.withdraw_amount) * 100));
}

export function getWithdrawProposalUiStatus(r: {
  is_executed: boolean;
  closed_at: string;
  approve_weight: number;
  withdraw_amount: number;
}): WithdrawProposalUiStatusLabel {
  if (r.is_executed) return 'đã nhận tiền';
  if (isWithdrawEpochClosedAt(r.closed_at)) return 'Chờ nhận tiền';
  const closed = r.closed_at?.trim();
  if (!closed) return 'Đang bỏ phiếu';
  const end = new Date(closed).getTime();
  if (Number.isNaN(end)) return 'Đang bỏ phiếu';
  if (Date.now() < end) return 'Đang bỏ phiếu';
  if (!(r.withdraw_amount > 0)) return 'Từ chối';
  const ratio = r.approve_weight / r.withdraw_amount;
  if (ratio > WITHDRAW_APPROVAL_THRESHOLD) return 'Chờ nhận tiền';
  return 'Từ chối';
}

/**
 * Convert yyyy-mm-dd (HTML date input) to dd/mm/yyyy (BE expected format).
 */
export function toDDMMYYYY(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Human-readable status for badges (keeps API value for color matching). */
export function formatStatusLabel(status: string): string {
  const s = (status || '').trim();
  if (!s) return '—';
  const map: Record<string, string> = {
    pending: 'Đang chờ',
    pending_review: 'Chờ duyệt',
    Pending: 'Đang chờ',
    PendingReview: 'Chờ duyệt',
    approved: 'Đã duyệt',
    Approved: 'Đã duyệt',
    refused: 'Từ chối',
    Refused: 'Từ chối',
    rejected: 'Bị từ chối',
    Rejected: 'Bị từ chối',
    open: 'Mở',
    submitted: 'Đã gửi',
    completed: 'Hoàn thành',
    executed: 'Đã thực thi',
    invalid: 'Không hợp lệ',
    valid: 'Hợp lệ',
    Cancel: 'Đã hủy',
    Success: 'Thành công',
  };
  if (map[s]) return map[s];
  return s.replace(/_/g, ' ');
}

export function getStatusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === 'approved' || s === 'active' || s === 'verified') return 'text-blue-900 bg-blue-50 border-blue-200';
  if (s === 'pending' || s === 'pending_review') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (s === 'refused' || s === 'rejected' || s === 'banned') return 'text-red-700 bg-red-50 border-red-200';
  if (s === 'closed' || s === 'executed') return 'text-slate-700 bg-slate-50 border-slate-200';
  if (s === 'voting' || s === 'đang bỏ phiếu') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (s === 'chờ nhận tiền') return 'text-amber-800 bg-amber-50 border-amber-200';
  if (s === 'đã nhận tiền') return 'text-blue-900 bg-blue-50 border-blue-200';
  if (s === 'từ chối') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}
