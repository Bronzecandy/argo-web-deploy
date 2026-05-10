'use client';

import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { useEffect } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { restoreSession } from '@/src/store/authSlice';
import { Toaster } from 'sonner';
import { ImageLightboxProvider } from '@/src/contexts/ImageLightboxContext';

function AuthRestorer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthRestorer>
        <ImageLightboxProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ImageLightboxProvider>
      </AuthRestorer>
    </Provider>
  );
}
