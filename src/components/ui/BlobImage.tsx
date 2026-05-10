'use client';

import { useMemo } from 'react';
import { BLOB_URL } from '@/src/lib/constants';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { useImageLightboxOptional } from '@/src/contexts/ImageLightboxContext';

type BlobSource = 'walrus' | 'api';

interface BlobImageProps {
  blobId: string | undefined | null;
  /** Walrus aggregator vs in-app blob route (e.g. child avatars on API host). */
  source?: BlobSource;
  alt?: string;
  className?: string;
  expandable?: boolean;
}

export function resolveBlobUrl(blobId: string, source: BlobSource = 'walrus'): string {
  if (!blobId?.trim()) return '';
  return source === 'api' ? BLOB_URL(blobId.trim()) : blobService.getUrl(blobId.trim());
}

export default function BlobImage({
  blobId,
  source = 'walrus',
  alt = '',
  className = '',
  expandable = true,
}: BlobImageProps) {
  const apiUrl = useMemo(() => {
    if (!blobId?.trim() || source !== 'api') return '';
    return BLOB_URL(blobId.trim());
  }, [blobId, source]);

  if (!blobId?.trim()) return null;

  if (source === 'walrus') {
    return (
      <WalrusFallbackImg blobId={blobId} alt={alt} className={className} expandable={expandable} />
    );
  }

  if (!apiUrl) return null;

  const lb = useImageLightboxOptional();
  const canExpand = Boolean(expandable && lb && apiUrl);

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic blob URLs */
    <img
      src={apiUrl}
      alt={alt}
      className={[className, canExpand ? 'cursor-pointer' : ''].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (!canExpand) return;
        e.preventDefault();
        e.stopPropagation();
        lb!.open(apiUrl);
      }}
    />
  );
}
