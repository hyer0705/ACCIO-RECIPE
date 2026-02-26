import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
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

// 보호할 경로 목록 — /login, /signup, /api/*, /docs, /_next 는 제외
export const config = {
  matcher: ['/((?!login|signup|api|docs|_next/static|_next/image|favicon.ico).*)'],
};
