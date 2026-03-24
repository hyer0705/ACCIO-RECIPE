'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: '대시보드', href: '/my/dashboard' },
    { label: '레시피', href: '/my/recipes' },
    { label: '요리 서재', href: '/my/archive' },
    { label: '냉장고 관리', href: '/my/fridge' },
    { label: '설정', href: '/my/settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF9F1]">
      <Header />
      <div className="flex flex-1 w-full md:pr-8">
        {/* LNB (Local Navigation Bar) */}
        <aside className="w-[260px] bg-white/50 py-12 pl-8 pr-4 shrink-0 h-[calc(100vh-77px)] sticky top-[77px] overflow-y-auto">
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
        <main className="flex-1 py-12 pl-8 lg:pl-12 border-l border-[#F0EBE0]">{children}</main>
      </div>
    </div>
  );
}
