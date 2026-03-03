'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ExtractionLoading() {
  const [progress, setProgress] = useState(0);

  // 로딩바 애니메이션 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // API 응답이 안왔을 때 90%에서 멈추도록
        return prev + 5;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-16 w-full text-center">
      {/* 겹겹이 겹친 둥근 배경 형태 */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        <div className="absolute inset-0 bg-[#FDF7E1] rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute inset-2 bg-[#FCECB8] rounded-full opacity-70 animate-pulse delay-75"></div>
        <div className="absolute inset-4 bg-[#FBE08F] rounded-full flex items-center justify-center shadow-lg">
          <Star className="text-[#F59E0B] w-10 h-10 fill-[#F59E0B]" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#3C2D23] mb-3">
        레시피를 마법처럼 정리하고 있어요...
      </h2>
      <p className="text-[#8B7355] text-sm mb-6 font-medium">
        모호한 표현들을 정확한 계량 수치로 바꾸는 중입니다.
      </p>

      {/* 로딩 프로그레스 바 영역 */}
      <div className="w-64 h-2 bg-[#EFE9DB] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FF5A28] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
