'use client';

import { useEffect, useState } from 'react';
import { walrusBlobSrcList } from '@/src/services/blob.service';

type Props = {
  blobId: string;
  alt?: string;
  className?: string;
};

/**
 * Tries several Walrus testnet aggregators (primary often returns 403 or fails to load in browsers).
 */
export default function WalrusFallbackImg({ blobId, alt = '', className = '' }: Props) {
  const trimmed = blobId?.trim() ?? '';
  const urls = trimmed ? walrusBlobSrcList(trimmed) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [trimmed]);

  if (!trimmed || urls.length === 0) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic Walrus URLs with fallback */
    <img
      src={urls[index]}
      alt={alt}
      className={className}
      onError={() => {
        setIndex((i) => (i + 1 < urls.length ? i + 1 : i));
      }}
    />
  );
}
