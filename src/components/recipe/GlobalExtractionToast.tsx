'use client';

import { useExtractionStore } from '@/store/useExtractionStore';
import { useRouter, usePathname } from 'next/navigation';
import { X, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GlobalExtractionToast() {
  const { isExtracting, completedRecipeId, activeTitle, clearCompleted } = useExtractionStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // 마이페이지 계열(/my/*) 경로에서만 보이도록 제한
  const isMyPage = pathname?.startsWith('/my');

  useEffect(() => {
    if (!isExtracting && completedRecipeId && isMyPage) {
      // 직접 호출 시 발생하는 cascading render 에러 방지를 위해 비동기 처리
      const showTimer = setTimeout(() => setIsVisible(true), 0);

      // 10초 후 자동 숨김
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => clearCompleted(), 300); // 애니메이션 후 클리어
      }, 10000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setTimeout(() => setIsVisible(false), 0);
    }
  }, [isExtracting, completedRecipeId, clearCompleted]);

  // 완료된 ID가 없거나 화면에서 즉시 사라져야 하면 렌더 안함
  if (!completedRecipeId && !isVisible) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => clearCompleted(), 300);
  };

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(() => {
      clearCompleted();
      router.push(`/recipes/preview/${completedRecipeId}`);
    }, 300);
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[400px] h-[120px] bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-500 ease-out cursor-pointer group flex flex-col justify-center ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      }`}
      onClick={handleClick}
    >
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10 p-1 rounded-full hover:bg-gray-100"
        aria-label="닫기"
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      <div className="flex items-center w-full px-5 gap-4">
        {/* 썸네일 영역 */}
        <div className="w-20 h-20 rounded-xl bg-[#3C2D23] flex shrink-0 items-center justify-center text-3xl shadow-sm">
          🍝
        </div>

        <div className="flex flex-col flex-1 justify-center pr-2">
          <h4 className="text-[#10B981] font-extrabold text-[16px] flex items-center gap-1 mb-1">
            <span className="text-[14px]">▶</span> 레시피 구조화 완료!
          </h4>
          <p className="font-bold text-[#3C2D23] text-[15px] truncate max-w-[210px]">
            {activeTitle || '새로운 레시피'}
          </p>
          <p className="text-gray-500 text-[13px] font-medium mt-1">
            터치해서 조리 서재로 바로 이동하기
          </p>
        </div>

        {/* 화살표 아이콘 */}
        <div className="w-[30px] h-[30px] rounded-full bg-[#FFF5F5] flex shrink-0 items-center justify-center group-hover:bg-[#FFEAE0] transition-colors">
          <ChevronRight size={18} className="text-[#FF5A28]" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
