'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ImageLightboxContextValue = {
  open: (src: string) => void;
  close: () => void;
};

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(null);

/** Safe where a provider is optional (e.g. tests); returns null if missing. */
export function useImageLightboxOptional() {
  return useContext(ImageLightboxContext);
}

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);

  const open = useCallback((url: string) => {
    const u = url.trim();
    if (u) setSrc(u);
  }, []);

  const close = useCallback(() => setSrc(null), []);

  useEffect(() => {
    if (!src) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [src, close]);

  return (
    <ImageLightboxContext.Provider value={{ open, close }}>
      {children}
      {src ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[min(92vh,100%)] max-w-[min(96vw,100%)] cursor-default object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </ImageLightboxContext.Provider>
  );
}
