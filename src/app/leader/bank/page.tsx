'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import { useAppSelector } from '@/src/store/hooks';
import { bankService } from '@/src/services/bank.service';
import type { BankProfile, CreateBankProfileRequest, UpdateBankProfileRequest } from '@/src/types/api.types';
import PageSection from '@/src/components/ui/PageSection';
import { btnPrimary, btnSecondary, inputClass } from '@/src/lib/uiClasses';

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export default function LeaderBankPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState<BankProfile | null>(null);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    bank_code: '',
    bank_org: '',
    owner_name: '',
    payos_client_id: '',
    payos_api_key: '',
    payos_check_sum_key: '',
  });

  const loadBank = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setBank(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await bankService.getByWallet(addr);
      setBank(res.data);
      setForm({
        bank_code: res.data.bank_code ?? '',
        bank_org: res.data.bank_org ?? '',
        owner_name: res.data.owner_name ?? '',
        payos_client_id: res.data.payos_client_id ?? '',
        payos_api_key: res.data.payos_api_key ?? '',
        payos_check_sum_key: res.data.payos_check_sum_key ?? '',
      });
      setEditing(false);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        setBank(null);
        setForm({
          bank_code: '',
          bank_org: '',
          owner_name: '',
          payos_client_id: '',
          payos_api_key: '',
          payos_check_sum_key: '',
        });
      } else {
        toast.error(getErrorMessage(e, 'Không tải được hồ sơ ngân hàng'));
        setBank(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadBank();
  }, [loadBank]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank_code.trim() || !form.bank_org.trim() || !form.owner_name.trim()) {
      toast.error('Cần mã ngân hàng, tên tổ chức và tên chủ tài khoản');
      return;
    }
    const payload: CreateBankProfileRequest = {
      bank_code: form.bank_code.trim(),
      bank_org: form.bank_org.trim(),
      owner_name: form.owner_name.trim(),
      payos_client_id: form.payos_client_id.trim() || undefined,
      payos_api_key: form.payos_api_key.trim() || undefined,
      payos_check_sum_key: form.payos_check_sum_key.trim() || undefined,
    };
    setSaving(true);
    try {
      if (bank) {
        const updatePayload: UpdateBankProfileRequest = { ...payload };
        const res = await bankService.update(bank.id, updatePayload);
        setBank(res.data);
        toast.success('Đã cập nhật hồ sơ ngân hàng');
        setEditing(false);
      } else {
        const res = await bankService.create(payload);
        setBank(res.data);
        toast.success('Đã tạo hồ sơ ngân hàng');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, bank ? 'Cập nhật thất bại' : 'Tạo mới thất bại'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tài khoản ngân hàng"
        description="Quản lý thông tin thanh toán và tích hợp PayOS"
        actions={
          bank && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={btnPrimary}
            >
              <Pencil className="h-4 w-4" />
              Sửa
            </button>
          ) : null
        }
      />

      {bank && !editing ? (
        <PageSection>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổ chức ngân hàng</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{bank.bank_org}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Mã ngân hàng</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{bank.bank_code}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Chủ tài khoản</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{bank.owner_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Mã client PayOS</dt>
              <dd className="mt-1 font-mono text-sm text-slate-700">{bank.payos_client_id || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Khóa API PayOS</dt>
              <dd className="mt-1 font-mono text-sm text-slate-700">
                {bank.payos_api_key ? '••••••••' : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Khóa checksum PayOS</dt>
              <dd className="mt-1 font-mono text-sm text-slate-700">
                {bank.payos_check_sum_key ? '••••••••' : '—'}
              </dd>
            </div>
          </dl>
        </PageSection>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
        <PageSection>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{bank ? 'Sửa hồ sơ ngân hàng' : 'Tạo hồ sơ ngân hàng'}</h2>
            {bank && editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    bank_code: bank.bank_code ?? '',
                    bank_org: bank.bank_org ?? '',
                    owner_name: bank.owner_name ?? '',
                    payos_client_id: bank.payos_client_id ?? '',
                    payos_api_key: bank.payos_api_key ?? '',
                    payos_check_sum_key: bank.payos_check_sum_key ?? '',
                  });
                }}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mã ngân hàng</label>
              <input
                className={inputClass}
                value={form.bank_code}
                onChange={(ev) => updateField('bank_code', ev.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tổ chức / chi nhánh</label>
              <input
                className={inputClass}
                value={form.bank_org}
                onChange={(ev) => updateField('bank_org', ev.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tên chủ tài khoản</label>
              <input
                className={inputClass}
                value={form.owner_name}
                onChange={(ev) => updateField('owner_name', ev.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">PayOS client ID (tùy chọn)</label>
              <input
                className={inputClass}
                value={form.payos_client_id}
                onChange={(ev) => updateField('payos_client_id', ev.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">PayOS API key (tùy chọn)</label>
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                value={form.payos_api_key}
                onChange={(ev) => updateField('payos_api_key', ev.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">PayOS checksum key (tùy chọn)</label>
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                value={form.payos_check_sum_key}
                onChange={(ev) => updateField('payos_check_sum_key', ev.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Đang lưu…' : bank ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
          </button>
        </PageSection>
        </form>
      )}
    </div>
  );
}
