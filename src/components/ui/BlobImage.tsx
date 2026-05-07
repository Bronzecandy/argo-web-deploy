'use client';

import { useMemo } from 'react';
import { blobService } from '@/src/services/blob.service';
import { BLOB_URL } from '@/src/lib/constants';

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
  const url = useMemo(() => (blobId?.trim() ? resolveBlobUrl(blobId, source) : ''), [blobId, source]);

  if (!url) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic blob URLs */
    <img src={url} alt={alt} className={className} />
  );
}
