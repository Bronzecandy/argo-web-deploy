'use client';

import { useEffect, useState } from 'react';
import { walrusBlobSrcList } from '@/src/services/blob.service';

import { useImageLightboxOptional } from '@/src/contexts/ImageLightboxContext';

type Props = {
  blobId: string;
  alt?: string;
  className?: string;
  /** When false, click does not open the fullscreen preview. Default true. */
  expandable?: boolean;
};

/**
 * Tries several Walrus testnet aggregators (primary often returns 403 or fails to load in browsers).
 */
export default function WalrusFallbackImg({
  blobId,
  alt = '',
  className = '',
  expandable = true,
}: Props) {
  const trimmed = blobId?.trim() ?? '';
  const urls = trimmed ? walrusBlobSrcList(trimmed) : [];
  const [index, setIndex] = useState(0);
  const lb = useImageLightboxOptional();

  useEffect(() => {
    setIndex(0);
  }, [trimmed]);

  if (!trimmed || urls.length === 0) return null;

  const currentSrc = urls[index];
  const canExpand = Boolean(expandable && lb && currentSrc);

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic Walrus URLs with fallback */
    <img
      src={currentSrc}
      alt={alt}
      className={[className, canExpand ? 'cursor-pointer' : ''].filter(Boolean).join(' ')}
      onError={() => {
        setIndex((i) => (i + 1 < urls.length ? i + 1 : i));
      }}
      onClick={(e) => {
        if (!canExpand) return;
        e.preventDefault();
        e.stopPropagation();
        lb!.open(currentSrc);
      }}
    />
  );
}
