'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { centerService } from '@/src/services/center.service';
import { useAppSelector } from '@/src/store/hooks';
import type { SupportCenter } from '@/src/types/api.types';

export type LeaderCenterLoadStatus = 'loading' | 'has_center' | 'no_center' | 'error';

type LeaderCenterContextValue = {
  status: LeaderCenterLoadStatus;
  center: SupportCenter | null;
  errorMessage: string | null;
  refetch: () => Promise<void>;
};

const LeaderCenterContext = createContext<LeaderCenterContextValue | null>(null);

/** GET /centers/leader may return 200 with a stub row before address/phone are set — treat as no center yet. */
function isCompleteLeaderCenter(data: unknown): data is SupportCenter {
  if (data == null || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  const addr = typeof o.center_address === 'string' ? o.center_address.trim() : '';
  const phone = typeof o.center_phone_number === 'string' ? o.center_phone_number.trim() : '';
  return Boolean(addr && phone);
}

function getAxiosStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'response' in e) {
    const s = (e as { response?: { status?: number } }).response?.status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

export function LeaderCenterProvider({ children }: { children: ReactNode }) {
  const address = useAppSelector((s) => s.auth.user?.address);
  const [status, setStatus] = useState<LeaderCenterLoadStatus>('loading');
  const [center, setCenter] = useState<SupportCenter | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const addr = address?.trim();
    if (!addr) {
      setCenter(null);
      setErrorMessage(null);
      setStatus('loading');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await centerService.getLeaderCenter();
      const body = res.data;
      if (isCompleteLeaderCenter(body)) {
        setCenter(body);
        setStatus('has_center');
      } else {
        setCenter(null);
        setStatus('no_center');
      }
    } catch (e: unknown) {
      const http = getAxiosStatus(e);
      if (http === 400 || http === 404) {
        setCenter(null);
        setStatus('no_center');
        return;
      }
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setCenter(null);
      setErrorMessage(msg || 'Failed to load center status');
      setStatus('error');
    }
  }, [address]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      status,
      center,
      errorMessage,
      refetch,
    }),
    [status, center, errorMessage, refetch],
  );

  return <LeaderCenterContext.Provider value={value}>{children}</LeaderCenterContext.Provider>;
}

export function useLeaderCenter() {
  const ctx = useContext(LeaderCenterContext);
  if (!ctx) throw new Error('useLeaderCenter must be used within LeaderCenterProvider');
  return ctx;
}
