'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserCircle } from 'lucide-react'; // 아이콘 라이브러리 (필요시 교체)

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="w-full flex justify-between items-center py-6 px-8 bg-[#FFFFFF] sticky top-0 z-50 border-b border-[#F0EBE0]">
      {/* 왼쪽 로고 영역 */}
      <Link href="/" className="text-xl font-bold text-[#FF5A28]">
        ACCIO RECIPE
      </Link>

      {/* 오른쪽 메뉴 영역 */}
      <div className="flex items-center gap-6 text-sm font-semibold text-[#3C2D23]">
        <Link
          href="/"
          className={`transition-colors ${
            pathname === '/' ? 'text-[#FF5722] font-bold text-[16px]' : 'hover:text-[#FF5A28]'
          }`}
        >
          레시피 입력
        </Link>
        <Link
          href="/my/archive"
          className={`transition-colors ${
            pathname.startsWith('/my')
              ? 'text-[#FF5722] font-bold text-[16px]'
              : 'hover:text-[#FF5A28]'
          }`}
        >
          나의 요리 서재
        </Link>

        {session ? (
          <Link
            href="/my/dashboard"
            className="w-8 h-8 rounded-full bg-[#3C2D23] flex items-center justify-center text-white overflow-hidden hover:opacity-80 transition-opacity"
            title="마이페이지"
          >
            {session.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={20} />
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white hover:opacity-80"
          >
            <UserCircle size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}
