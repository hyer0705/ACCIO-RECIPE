'use client';

import { Star, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useExtractionStore } from '@/store/useExtractionStore';

const TIPS = [
  '유튜브 링크뿐만 아니라 블로그 링크도 가능해요!',
  'AI가 요리 난이도와 필요한 재료 양을 계산해 드립니다.',
  '생성된 레시피는 내 아카이브에 자동 저장됩니다.',
  '정확한 계량 수치가 없는 레시피도 AI가 유추해 냅니다.',
];

export default function ExtractionLoading() {
  const { progress, cancelExtraction } = useExtractionStore();
  const [tipIndex, setTipIndex] = useState(0);

  // 꿀팁 롤링 타이머
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);

  const currentStep = progress?.step || 1;
  const totalSteps = progress?.total || 4;
  const percent = Math.round((currentStep / totalSteps) * 100);
  const message = progress?.message || '잠시만 기다려주세요...';

  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-16 w-full max-w-md text-center mx-auto">
      {/* 겹겹이 겹친 둥근 배경 형태 애니메이션 */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        <div className="absolute inset-0 bg-[#FDF7E1] rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute inset-2 bg-[#FCECB8] rounded-full opacity-70 animate-pulse delay-75"></div>
        <div className="absolute inset-4 bg-[#FBE08F] rounded-full flex items-center justify-center shadow-lg">
          <Star className="text-[#F59E0B] w-10 h-10 fill-[#F59E0B]" />
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-[#3C2D23] mb-3 transition-all">
        {message}
      </h2>

      {/* 꿀팁 롤링 정보 */}
      <div className="h-6 mb-8 mt-2 overflow-hidden">
        <p key={tipIndex} className="text-[#8B7355] text-sm font-medium animate-fade-in-up">
          💡 {TIPS[tipIndex]}
        </p>
      </div>

      {/* 로딩 스텝퍼 (Determinate Progress) */}
      <div className="w-full px-4 mb-10">
        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
          <span>진행 단계</span>
          <span>
            {currentStep} / {totalSteps} ({percent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-[#EFE9DB] rounded-full overflow-hidden shadow-inner flex relative">
          <div
            className="h-full bg-linear-to-r from-[#FF9A44] to-[#FF5A28] rounded-full transition-all duration-700 ease-in-out relative overflow-hidden"
            style={{ width: `${percent}%` }}
          >
            {/* 스트라이프 애니메이션 효과 (AI 처리 중임을 강조) */}
            <div
              className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-progress-stripe"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
                backgroundSize: '1rem 1rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* 사용자 제어 버튼 (Abort) */}
      <button
        onClick={cancelExtraction}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full text-gray-600 font-bold hover:bg-gray-50 hover:text-red-500 hover:border-red-300 transition-all shadow-sm group"
      >
        <XCircle className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
        추출 취소하기
      </button>

      {/* 추가적인 스타일 정의 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 4s ease-in-out infinite;
        }
        @keyframes progress-stripe {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
        .animate-progress-stripe {
          animation: progress-stripe 1s linear infinite;
        }
      `,
        }}
      />
    </div>
  );
}
