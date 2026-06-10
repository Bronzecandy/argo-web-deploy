'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { useImageLightboxOptional } from '@/src/contexts/ImageLightboxContext';

type DetailMediaTileProps = {
  label: string;
  imageUrl?: string | null;
  blobId?: string | null;
};

/** Ô ảnh lớn trong modal chi tiết — ưu tiên URL, fallback blob Walrus. */
export default function DetailMediaTile({ label, imageUrl, blobId }: DetailMediaTileProps) {
  const url = imageUrl?.trim() || '';
  const blob = blobId?.trim() || '';
  const lb = useImageLightboxOptional();
  const [urlFailed, setUrlFailed] = useState(false);

  useEffect(() => {
    setUrlFailed(false);
  }, [url]);

  const imgClass =
    'mx-auto max-h-56 w-full cursor-pointer rounded-lg object-contain sm:max-h-64';

  let body: ReactNode;

  if (url && !urlFailed) {
    body = (
      /* eslint-disable-next-line @next/next/no-img-element -- URL từ API */
      <img
        src={url}
        alt={label}
        className={lb ? imgClass : imgClass.replace('cursor-pointer', '')}
        onError={() => setUrlFailed(true)}
        onClick={() => lb?.open(url)}
      />
    );
  } else if (blob && (!url || urlFailed)) {
    body = (
      <WalrusFallbackImg
        blobId={blob}
        alt={label}
        className={imgClass}
        expandable={Boolean(lb)}
      />
    );
  } else {
    body = (
      <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white text-slate-400">
        <ImageOff className="h-8 w-8" aria-hidden />
        <span className="text-xs">Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 shadow-sm">
      <figcaption className="border-b border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
        {label}
      </figcaption>
      <div className="p-3 sm:p-4">{body}</div>
    </figure>
  );
}
