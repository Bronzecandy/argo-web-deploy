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
  /** `region` from GET /centers/leader (200) — use for API filters even before address/phone are set. */
  leaderRegion: string | null;
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

/** Region string from leader center payload (may exist before center is "complete"). */
function extractLeaderRegion(body: unknown): string | null {
  if (body == null || typeof body !== 'object') return null;
  const r = (body as Record<string, unknown>).region;
  if (typeof r !== 'string') return null;
  const t = r.trim();
  return t || null;
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
  const [leaderRegion, setLeaderRegion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const addr = address?.trim();
    if (!addr) {
      setCenter(null);
      setLeaderRegion(null);
      setErrorMessage(null);
      setStatus('loading');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await centerService.getLeaderCenter();
      const body = res.data;
      setLeaderRegion(extractLeaderRegion(body));
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
        setLeaderRegion(null);
        setStatus('no_center');
        return;
      }
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setCenter(null);
      setLeaderRegion(null);
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
      leaderRegion,
      errorMessage,
      refetch,
    }),
    [status, center, leaderRegion, errorMessage, refetch],
  );

  return <LeaderCenterContext.Provider value={value}>{children}</LeaderCenterContext.Provider>;
}

export function useLeaderCenter() {
  const ctx = useContext(LeaderCenterContext);
  if (!ctx) throw new Error('useLeaderCenter must be used within LeaderCenterProvider');
  return ctx;
}
