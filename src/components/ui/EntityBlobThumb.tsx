'use client';

import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import BlobImage from '@/src/components/ui/BlobImage';

type Source = 'walrus' | 'api';

/**
 * Thumbnail for Walrus-style blob ids (same pattern as leader task-proofs table).
 * Use `source="api"` when the image is loaded from the app API host (blob route).
 */
export default function EntityBlobThumb({
  blobId,
  source = 'walrus',
  alt = '',
  className = 'h-16 w-16 rounded-md border border-slate-200 object-cover',
}: {
  blobId: string | undefined | null;
  source?: Source;
  alt?: string;
  className?: string;
}) {
  if (!blobId?.trim()) return null;
  if (source === 'api') {
    return <BlobImage blobId={blobId} source="api" alt={alt} className={className} />;
  }
  return <WalrusFallbackImg blobId={blobId} alt={alt} className={className} />;
}
