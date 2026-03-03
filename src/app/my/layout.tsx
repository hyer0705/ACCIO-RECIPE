'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: '대시보드', href: '/my/dashboard' },
    { label: '최근 요리 기록', href: '/my/archive' },
    { label: '냉장고 관리', href: '/my/fridge' },
    { label: '설정', href: '/my/settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF9F1]">
      <Header />
      <div className="flex flex-1 max-w-7xl w-full mx-auto px-8">
        {/* LNB (Local Navigation Bar) */}
        <aside className="w-56 py-12 shrink-0">
          <nav className="flex flex-col gap-6">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[16px] font-bold transition-colors ${
                    isActive ? 'text-[#FF5722]' : 'text-[#3C2D23] hover:text-[#FF5722]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 py-12 pl-12 border-l border-[#F0EBE0] min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
