'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a1108] text-white">
      <h1 className="text-4xl font-bold text-orange-400" style={{ fontFamily: 'Georgia, serif' }}>
        🍳 ACCIO RECIPE
      </h1>
      {session ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/70">
            안녕하세요, <span className="text-orange-300 font-semibold">{session.user?.name}</span>
            님!
          </p>
          <div className="flex gap-3">
            <Link
              href="/docs"
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 rounded-xl font-semibold transition-colors text-sm"
            >
              Swagger API 문서
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/50 text-sm">API 테스트를 위해 로그인이 필요합니다.</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-500 hover:bg-orange-400 rounded-xl font-semibold transition-colors"
          >
            로그인하기
          </Link>
        </div>
      )}
    </div>
  );
}
