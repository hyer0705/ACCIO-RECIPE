'use client';

import { useExtractionStore } from '@/store/useExtractionStore';
import { Settings } from 'lucide-react';

interface Props {
  variant?: 'square' | 'landscape';
}

export default function ExtractionProgressCard({ variant = 'square' }: Props) {
  const { isExtracting, activeTitle, progress } = useExtractionStore();

  if (!isExtracting) return null;

  const currentStep = progress?.step || 1;
  const totalSteps = progress?.total || 4;
  const percent = Math.min(Math.round((currentStep / totalSteps) * 100), 99); // 완료 직전까지만 표시
  const message = progress?.message || '레시피 구조 분석 중...';

  if (variant === 'landscape') {
    return (
      <div className="relative w-full h-[130px] rounded-[16px] bg-[#3C2D23] overflow-hidden shadow-sm flex flex-col justify-between p-5 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="absolute inset-0 bg-linear-to-br from-[#FF9A44]/10 to-transparent pointer-events-none"></div>

        <div className="relative z-10">
          <h3 className="text-[16px] font-extrabold text-white mb-1 truncate">
            {activeTitle || '추출 중인 레시피...'}
          </h3>
          <p className="text-[13px] text-gray-300">{message}</p>
        </div>

        <div className="relative z-10 w-full">
          <div className="w-full h-2 bg-[#5A473D] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#FF5A28] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <p className="text-[12px] font-bold text-white">{percent}% 완료</p>
        </div>
      </div>
    );
  }

  // Square variant (default for grid lists)
  return (
    <div className="relative w-full aspect-square rounded-[16px] bg-[#3C2D23] overflow-hidden shadow-md flex items-center justify-center">
      <div className="absolute inset-0 bg-[#C7B3A2] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center p-6 w-full h-full text-center">
        <div className="w-12 h-12 rounded-full bg-[#FCECB8] flex items-center justify-center mb-4 shadow-sm">
          <Settings className="text-[#FF5A28] animate-[spin_3s_linear_infinite] w-6 h-6" />
        </div>

        <h3 className="text-[18px] font-extrabold text-white mb-2 line-clamp-1 w-full px-2">
          {activeTitle || '추출 중인 레시피...'}
        </h3>

        <p className="text-[14px] font-bold text-gray-300 mb-6">{message}</p>

        <div className="w-full max-w-[85%] mt-auto pb-2">
          <div className="w-full h-2 bg-[#5A473D] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#FF5A28] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <p className="text-[13px] font-bold text-white text-center">{percent}% 완료</p>
        </div>
      </div>
    </div>
  );
}
