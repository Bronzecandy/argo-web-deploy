'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { loginWithZKLogin, clearError } from '@/src/store/authSlice';
import { ROLES, GOOGLE_CLIENT_ID } from '@/src/lib/constants';
import { getSafeReturnPath } from '@/src/lib/safe-return-url';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, error } = useAppSelector((state) => state.auth);
  const returnUrl = getSafeReturnPath(searchParams.get('returnUrl'));

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (returnUrl) {
      router.replace(returnUrl);
      return;
    }
    if (user.role === ROLES.ADMIN) router.replace('/admin');
    else if (user.role === ROLES.LOCAL_LEADER) router.replace('/leader');
    else if (user.role === ROLES.VOLUNTEER) router.replace('/volunteer');
    else if (user.role === ROLES.DONOR || user.role === ROLES.USER) router.replace('/donor');
    else toast.error('Your role does not have access to this platform');
  }, [isAuthenticated, user, router, returnUrl]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  return (
    <div className="flex min-h-screen">
      <div className="hidden items-center justify-center bg-gradient-to-br from-blue-800 to-blue-900 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">AgroTrust</h1>
          </div>
          <h2 className="mb-4 text-2xl font-semibold">Transparent Child Support Platform</h2>
          <p className="leading-relaxed text-blue-100">
            Powered by blockchain technology. Every donation is traceable, every action is transparent. Together, we build trust for
            a better future.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold">100%</div>
              <div className="mt-1 text-xs text-blue-200">Transparent</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold">On-chain</div>
              <div className="mt-1 text-xs text-blue-200">Verified</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold">Sui</div>
              <div className="mt-1 text-xs text-blue-200">Blockchain</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-800">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900">AgroTrust</h1>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Welcome</h2>
            <p className="mb-6 text-slate-500">Sign in with your Google account to continue</p>
            <p className="mb-6 text-center text-sm">
              <Link href="/" className="font-medium text-blue-800 hover:underline">
                ← Back to home
              </Link>
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
                <span className="ml-3 text-sm text-slate-500">Signing in...</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      dispatch(loginWithZKLogin(credentialResponse.credential));
                    } else {
                      toast.error('No credential received from Google');
                    }
                  }}
                  onError={() => {
                    toast.error('Google login failed');
                  }}
                  size="large"
                  width="350"
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                />
              </div>
            )}

            <p className="mt-6 text-center text-xs text-slate-400">
              By signing in, you agree to AgroTrust&apos;s Terms of Service and Privacy Policy.
              <br />
              Authentication uses ZKLogin on Sui blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
