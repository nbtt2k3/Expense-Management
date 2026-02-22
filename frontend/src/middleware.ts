import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/expenses', '/incomes', '/budget', '/analytics', '/settings', '/categories'];
// Routes that should redirect to dashboard if already logged in (but NOT verify-otp/forgot-password/reset-password)
const authRoutes = ['/login', '/register'];
// Public auth routes that should always be accessible
const publicAuthRoutes = ['/verify-otp', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for access token in cookies (set by client after login)
    const token = request.cookies.get('access_token')?.value;

    // If trying to access protected routes without token → redirect to login
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If already logged in and trying to visit auth pages → redirect to dashboard
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/expenses/:path*',
        '/incomes/:path*',
        '/budget/:path*',
        '/analytics/:path*',
        '/settings/:path*',
        '/categories/:path*',
        '/login',
        '/register',
        '/verify-otp',
        '/forgot-password',
        '/reset-password',
    ],
};
