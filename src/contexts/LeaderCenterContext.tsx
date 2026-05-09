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
      setCenter(res.data);
      setStatus('has_center');
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
