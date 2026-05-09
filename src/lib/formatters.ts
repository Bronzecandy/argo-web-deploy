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
export function formatDateTimeSeconds(dateString: string): string {
  if (!dateString) return '-';
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

export type WithdrawProposalUiStatusLabel = 'Đang bỏ phiếu' | 'Chờ nhận tiền' | 'Từ chối' | 'đã nhận tiền';

export function getWithdrawProposalUiStatus(r: {
  is_executed: boolean;
  closed_at: string;
  approve_weight: number;
  withdraw_amount: number;
}): WithdrawProposalUiStatusLabel {
  if (r.is_executed) return 'đã nhận tiền';
  const closed = r.closed_at?.trim();
  if (!closed) return 'Đang bỏ phiếu';
  const end = new Date(closed).getTime();
  if (Number.isNaN(end)) return 'Đang bỏ phiếu';
  if (Date.now() < end) return 'Đang bỏ phiếu';
  if (!(r.withdraw_amount > 0)) return 'Từ chối';
  const ratio = r.approve_weight / r.withdraw_amount;
  if (ratio > 0.7) return 'Chờ nhận tiền';
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
