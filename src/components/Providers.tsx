'use client';

import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { useEffect } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { restoreSession } from '@/src/store/authSlice';
import { Toaster } from 'sonner';

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
        {children}
        <Toaster position="top-right" richColors closeButton />
      </AuthRestorer>
    </Provider>
  );
}
