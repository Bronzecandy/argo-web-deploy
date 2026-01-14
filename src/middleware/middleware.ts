// src/middleware.ts (root middleware file)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from './authMiddleware';
import { roleMiddleware } from './roleMiddleware';

export function middleware(request: NextRequest) {
  // Run auth middleware
  const authResponse = authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // Run role middleware
  const roleResponse = roleMiddleware(request);
  if (roleResponse.status !== 200) {
    return roleResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};