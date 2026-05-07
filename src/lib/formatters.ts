export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
  return 'text-slate-600 bg-slate-50 border-slate-200';
}
