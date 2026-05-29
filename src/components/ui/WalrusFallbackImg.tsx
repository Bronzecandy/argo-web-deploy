'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
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
  const [failed, setFailed] = useState(false);
  const lb = useImageLightboxOptional();

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [trimmed]);

  if (!trimmed || urls.length === 0) return null;

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-200 bg-slate-50 text-slate-400 ${className}`}
        title="Không tải được ảnh"
      >
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="text-[10px]">Không có ảnh</span>
      </div>
    );
  }

  const currentSrc = urls[index];
  const canExpand = Boolean(expandable && lb && currentSrc);

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic Walrus URLs with fallback */
    <img
      src={currentSrc}
      alt={alt}
      className={[className, canExpand ? 'cursor-pointer' : ''].filter(Boolean).join(' ')}
      onError={() => {
        setIndex((i) => {
          if (i + 1 < urls.length) return i + 1;
          setFailed(true);
          return i;
        });
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
