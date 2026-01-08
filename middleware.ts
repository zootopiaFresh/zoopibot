import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요한 경로
const protectedPaths = ['/query-generator', '/documentation'];

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ['/login', '/register'];

// 어드민만 접근 가능한 경로
const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const isAdmin = token?.role === 'admin';

  // 인증이 필요한 페이지에 비로그인 사용자 접근
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
  }

  // 로그인/회원가입 페이지에 이미 로그인한 사용자 접근
  if (authPaths.some(path => pathname.startsWith(path))) {
    if (isAuthenticated) {
      const url = new URL('/query-generator', request.url);
      return NextResponse.redirect(url);
    }
  }

  // 어드민 페이지에 비어드민 사용자 접근
  if (adminPaths.some(path => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      const url = new URL('/query-generator', request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/query-generator/:path*',
    '/documentation/:path*',
    '/login',
    '/register',
    '/admin',
    '/admin/:path*',
  ],
};
