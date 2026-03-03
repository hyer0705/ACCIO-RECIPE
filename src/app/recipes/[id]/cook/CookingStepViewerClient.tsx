'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CookingTimer from '@/components/recipe/cook/CookingTimer';

export interface CookingStep {
  step_order: number;
  instruction: string;
  timer_seconds?: number | null;
}

interface CookingStepViewerClientProps {
  recipeId: number;
  steps: CookingStep[];
}

export default function CookingStepViewerClient({ recipeId, steps }: CookingStepViewerClientProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const nextStep = () => {
    if (!isLastStep) setCurrentStepIndex((prev) => prev + 1);
  };

  const prevStep = () => {
    if (!isFirstStep) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleFinish = () => {
    router.push(`/recipes/${recipeId}/cook/log`);
  };

  // 텍스트 강조 처리 (단순 예시: 추후 형태소 분석이나 키워드 매칭 로직으로 고도화 가능)
  // 여기서는 단순히 전체 텍스트 렌더링
  const renderInstruction = (text: string) => {
    return (
      <p className="text-4xl leading-snug font-bold text-white whitespace-pre-line break-keep">
        {text}
      </p>
    );
  };

  if (!steps || steps.length === 0) {
    return <div className="text-white">레시피 단계가 없습니다.</div>;
  }

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-6 py-8 relative">
      {/* Header Area */}
      <header className="flex justify-between items-center shrink-0 mb-16">
        <div className="text-[#FF5A28] font-black text-xl tracking-wider">ACCIO RECIPE</div>
        <button
          onClick={handleFinish}
          className="border border-[#FF5A28] text-[#FF5A28] px-6 py-2 rounded-full font-bold hover:bg-[#FF5A28] hover:text-white transition-colors"
        >
          조리 종료
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1">
          <h2 className="text-[#DFB500] font-bold text-2xl mb-6">STEP {currentStep.step_order}</h2>
          {renderInstruction(currentStep.instruction)}
        </div>

        {/* Timer Area */}
        <div className="w-[300px] flex justify-center shrink-0">
          <CookingTimer
            key={currentStep.timer_seconds ?? 0}
            initialSeconds={currentStep.timer_seconds || 0}
          />
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="shrink-0 flex justify-between items-center mt-12 pb-6">
        <button
          onClick={prevStep}
          disabled={isFirstStep}
          className={`px-10 py-4 rounded-full font-bold text-lg transition-colors border ${
            isFirstStep
              ? 'border-gray-500 text-gray-500 opacity-50 cursor-not-allowed'
              : 'border-white text-white hover:bg-white/10 cursor-pointer'
          }`}
        >
          이전 단계
        </button>
        <button
          onClick={isLastStep ? handleFinish : nextStep}
          className="px-10 py-4 rounded-full font-bold text-lg cursor-pointer bg-[#FF5A28] text-white hover:bg-[#ff460f] transition-colors"
        >
          {isLastStep ? '요리 끝내기' : '다음 단계'}
        </button>
      </footer>
    </div>
  );
}
