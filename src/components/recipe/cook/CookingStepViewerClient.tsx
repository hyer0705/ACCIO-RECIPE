'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWakeLock } from '@/hooks/recipe/cook/useWakeLock';
import { useTimers } from '@/hooks/recipe/cook/useTimers';
import { useCookStore } from '@/store/useCookStore';

import TimerPanel from '@/components/recipe/cook/TimerPanel';
import TimerCompleteModal from '@/components/recipe/cook/TimerCompleteModal';
import StepIngredientChips from '@/components/recipe/cook/StepIngredientChips';

import { CookingStep } from '@/types/recipe';

interface CookingStepViewerClientProps {
  recipeId: number;
  steps: CookingStep[];
}

export default function CookingStepViewerClient({ recipeId, steps }: CookingStepViewerClientProps) {
  const router = useRouter();
  const { currentStepIndex, setCurrentStepIndex, resetCookState } = useCookStore();
  const { activeTimers, completedTimer, startTimer, toggleTimer, resetTimer, dismissModal } =
    useTimers();

  const { releaseWakeLock } = useWakeLock();

  useEffect(() => {
    resetCookState();
    return () => {
      resetCookState();
    };
  }, [recipeId, resetCookState]);

  // ── 현재 단계에 타이머가 있으면 타이머 목록에 추가 ────────────
  const safeIndex =
    steps.length > 0 ? Math.min(Math.max(0, currentStepIndex), steps.length - 1) : 0;
  const currentStep = steps[safeIndex];
  const isLastStep = steps.length > 0 && safeIndex === steps.length - 1;
  const isFirstStep = safeIndex === 0;

  const handleStartTimer = useCallback(() => {
    const seconds = currentStep?.timer_seconds;
    if (seconds && seconds > 0) {
      startTimer(currentStep.step_order, currentStep.instruction, seconds);
    }
  }, [currentStep, startTimer]);

  const nextStep = () => {
    if (!isLastStep) setCurrentStepIndex((prev) => prev + 1);
  };

  const prevStep = () => {
    if (!isFirstStep) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleFinish = () => {
    releaseWakeLock();
    router.push(`/recipes/${recipeId}/cook/log`);
  };

  if (!steps || steps.length === 0) {
    return <div className="text-white">레시피 단계가 없습니다.</div>;
  }

  const hasTimer = !!currentStep.timer_seconds && currentStep.timer_seconds > 0;
  const isCurrentTimerActive = activeTimers.some((t) => t.stepOrder === currentStep.step_order);

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-8 relative">
      {/* ── Header ── */}
      <header className="flex justify-between items-center shrink-0 mb-12">
        <div className="text-[#FF5A28] font-black text-xl tracking-wider">ACCIO RECIPE</div>
        <button
          onClick={handleFinish}
          className="border border-[#FF5A28] text-[#FF5A28] px-6 py-2 rounded-full font-bold hover:bg-[#FF5A28] hover:text-white transition-colors"
        >
          조리 종료
        </button>
      </header>

      {/* ── Main: Instruction (left) + Timer Panel (right) ── */}
      <main className="flex-1 flex flex-row gap-8 min-h-0">
        {/* Instruction Area */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h2 className="text-[#DFB500] font-bold text-xl mb-5">STEP {currentStep.step_order}</h2>
          <p className="text-4xl leading-snug font-bold text-white whitespace-pre-line break-keep mb-8">
            {currentStep.instruction}
          </p>

          {/* 이 단계에서 필요한 재료 칩 */}
          <div className="mt-4">
            <StepIngredientChips step={currentStep} />
          </div>

          {/* 현재 단계에 타이머가 있고 아직 시작 안 했을 경우 시작 버튼 표시 */}
          {hasTimer && !isCurrentTimerActive && (
            <div className="mt-8">
              <button
                onClick={handleStartTimer}
                className="self-start flex items-center gap-2 bg-[#FF5A28]/20 border border-[#FF5A28]/50 text-[#FF5A28] font-bold px-5 py-3 rounded-full hover:bg-[#FF5A28]/30 transition-colors"
              >
                ⏱ 이 단계 타이머 시작
              </button>
            </div>
          )}
        </div>

        {/* Timer Panel (right, fixed width, internal scroll) */}
        {activeTimers.length > 0 && (
          <div className="w-80 shrink-0">
            <TimerPanel timers={activeTimers} onToggle={toggleTimer} onReset={resetTimer} />
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ── */}
      <footer className="shrink-0 flex justify-between items-center mt-8 pb-4">
        <button
          onClick={prevStep}
          disabled={isFirstStep}
          className={`px-10 py-4 rounded-full font-bold text-lg transition-colors border ${
            isFirstStep
              ? 'border-gray-600 text-gray-600 cursor-not-allowed'
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

      {/* ── Timer Complete Modal ── */}
      {completedTimer && (
        <TimerCompleteModal
          stepOrder={completedTimer.stepOrder}
          instruction={completedTimer.instruction}
          onConfirm={dismissModal}
        />
      )}
    </div>
  );
}
