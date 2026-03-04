'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TimerPanel, { ActiveTimer } from '@/components/recipe/cook/TimerPanel';
import TimerCompleteModal from '@/components/recipe/cook/TimerCompleteModal';

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

  // ── 다중 타이머 상태 ──────────────────────────────────────────
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);

  // 완료 모달: 어느 타이머가 완료됐는지 보관
  const [completedTimer, setCompletedTimer] = useState<ActiveTimer | null>(null);

  // Wake Lock ref (cleanup용)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ── Screen Wake Lock ────────────────────────────────────────
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake Lock 권한 거부 또는 미지원 → 무시
      }
    }
    requestWakeLock();

    return () => {
      wakeLockRef.current?.release();
    };
  }, []);

  // ── 타이머 틱 (1초마다 모든 실행 중인 타이머 감소) ─────────────
  useEffect(() => {
    if (activeTimers.length === 0) return undefined;

    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        let justCompleted: ActiveTimer | null = null;

        const updated = prev.map((t) => {
          if (!t.isRunning || t.timeLeft <= 0) return t;

          const next = t.timeLeft - 1;
          if (next === 0) {
            // 완료된 타이머를 별도 변수에 캡처
            justCompleted = { ...t, timeLeft: 0, isRunning: false };
            return justCompleted;
          }
          return { ...t, timeLeft: next };
        });

        if (justCompleted) {
          // 다음 렌더 사이클에서 모달 표시 (setState in callback → 허용)
          setTimeout(() => setCompletedTimer(justCompleted), 0);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers]);

  // ── 현재 단계에 타이머가 있으면 타이머 목록에 추가 ────────────
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleStartTimer = useCallback(() => {
    const seconds = currentStep.timer_seconds;
    if (!seconds || seconds <= 0) return;

    setActiveTimers((prev) => {
      const exists = prev.find((t) => t.stepOrder === currentStep.step_order);
      if (exists) return prev; // 이미 등록된 타이머 중복 방지

      return [
        ...prev,
        {
          stepOrder: currentStep.step_order,
          instruction: currentStep.instruction,
          initialSeconds: seconds,
          timeLeft: seconds,
          isRunning: true,
        },
      ];
    });
  }, [currentStep]);

  const handleToggleTimer = useCallback((stepOrder: number) => {
    setActiveTimers((prev) =>
      prev.map((t) => (t.stepOrder === stepOrder ? { ...t, isRunning: !t.isRunning } : t)),
    );
  }, []);

  const handleResetTimer = useCallback((stepOrder: number) => {
    setActiveTimers((prev) =>
      prev.map((t) =>
        t.stepOrder === stepOrder ? { ...t, timeLeft: t.initialSeconds, isRunning: false } : t,
      ),
    );
  }, []);

  const handleDismissModal = useCallback(() => {
    // 완료된 타이머를 목록에서 제거
    if (completedTimer) {
      setActiveTimers((prev) => prev.filter((t) => t.stepOrder !== completedTimer.stepOrder));
    }
    setCompletedTimer(null);
  }, [completedTimer]);

  const nextStep = () => {
    if (!isLastStep) setCurrentStepIndex((prev) => prev + 1);
  };

  const prevStep = () => {
    if (!isFirstStep) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleFinish = () => {
    wakeLockRef.current?.release();
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

          {/* 현재 단계에 타이머가 있고 아직 시작 안 했을 경우 시작 버튼 표시 */}
          {hasTimer && !isCurrentTimerActive && (
            <button
              onClick={handleStartTimer}
              className="self-start flex items-center gap-2 bg-[#FF5A28]/20 border border-[#FF5A28]/50 text-[#FF5A28] font-bold px-5 py-3 rounded-full hover:bg-[#FF5A28]/30 transition-colors"
            >
              ⏱ 이 단계 타이머 시작
            </button>
          )}
        </div>

        {/* Timer Panel (right, fixed width, internal scroll) */}
        {activeTimers.length > 0 && (
          <div className="w-80 shrink-0">
            <TimerPanel
              timers={activeTimers}
              onToggle={handleToggleTimer}
              onReset={handleResetTimer}
            />
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
          onConfirm={handleDismissModal}
        />
      )}
    </div>
  );
}
