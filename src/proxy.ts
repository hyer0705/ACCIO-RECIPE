import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // 인증은 되었으나 추가 정보 입력(isComplete)이 안 된 경우 /signup으로 리다이렉트
    if (token && !token.isComplete && pathname !== '/signup') {
      return NextResponse.redirect(new URL('/signup', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  },
);

// 보호할 경로 목록 — /login, /api/*, /docs, /_next 는 제외
export const config = {
  matcher: ['/((?!login|api|docs|_next/static|_next/image|favicon.ico).*)'],
};
