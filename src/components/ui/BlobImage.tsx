'use client';

import { useMemo } from 'react';
import { BLOB_URL } from '@/src/lib/constants';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';

type BlobSource = 'walrus' | 'api';

interface BlobImageProps {
  blobId: string | undefined | null;
  /** Walrus aggregator vs API /blobs route (child uploads often use API base). */
  source?: BlobSource;
  alt?: string;
  className?: string;
}

export function resolveBlobUrl(blobId: string, source: BlobSource = 'walrus'): string {
  if (!blobId?.trim()) return '';
  return source === 'api' ? BLOB_URL(blobId.trim()) : blobService.getUrl(blobId.trim());
}

export default function BlobImage({ blobId, source = 'walrus', alt = '', className = '' }: BlobImageProps) {
  const apiUrl = useMemo(() => {
    if (!blobId?.trim() || source !== 'api') return '';
    return BLOB_URL(blobId.trim());
  }, [blobId, source]);

  if (!blobId?.trim()) return null;

  if (source === 'walrus') {
    return <WalrusFallbackImg blobId={blobId} alt={alt} className={className} />;
  }

  if (!apiUrl) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic blob URLs */
    <img src={apiUrl} alt={alt} className={className} />
  );
}
