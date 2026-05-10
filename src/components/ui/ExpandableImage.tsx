'use client';

import { useCallback, type ImgHTMLAttributes, type MouseEvent } from 'react';
import { useImageLightboxOptional } from '@/src/contexts/ImageLightboxContext';

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** When false, behaves like a normal img (no overlay). Default true when provider exists. */
  expandable?: boolean;
};

/**
 * Thumbnail or inline image: click opens the global fullscreen lightbox (backdrop / Esc to close).
 * Clicks call preventDefault + stopPropagation so parent Link rows do not navigate.
 */
export default function ExpandableImage({
  expandable = true,
  src,
  alt = '',
  className,
  onClick,
  ...rest
}: Props) {
  const lb = useImageLightboxOptional();
  const canExpand = Boolean(expandable && lb && src && String(src).trim());

  const handleClick = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      onClick?.(e);
      if (!canExpand || src == null) return;
      if (e.defaultPrevented) return;
      e.preventDefault();
      e.stopPropagation();
      lb!.open(String(src).trim());
    },
    [onClick, canExpand, lb, src],
  );

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={canExpand ? [className, 'cursor-pointer'].filter(Boolean).join(' ') : className}
      onClick={handleClick}
    />
  );
}
