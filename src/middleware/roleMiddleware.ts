// src/middleware/roleMiddleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function roleMiddleware(request: NextRequest) {
  const userRole = request.cookies.get('userRole')?.value;
  const { pathname } = request.nextUrl;

  // Define role-based route access
  const roleRoutes: Record<string, string[]> = {
    admin: ['/admin', '/dashboard', '/users'],
    manager: ['/dashboard', '/users'],
    user: ['/dashboard'],
  };

  // Check if user has access to the route
  if (userRole) {
    const allowedRoutes = roleRoutes[userRole] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess && pathname !== '/unauthorized') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}