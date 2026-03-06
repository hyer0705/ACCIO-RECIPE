'use client';

import { useEffect } from 'react';
import { playTimerCompletionSound } from '@/lib/recipe/cook/timerSound';

interface TimerCompleteModalProps {
  stepOrder: number;
  instruction: string;
  onConfirm: () => void;
}

export default function TimerCompleteModal({
  stepOrder,
  instruction,
  onConfirm,
}: TimerCompleteModalProps) {
  // 컴포넌트 마운트 완료 후(Commit 단계) 한 번만 소리 재생
  useEffect(() => {
    playTimerCompletionSound();
  }, []);

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#2A1F18] border border-[#FF5A28] rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Icon */}
        <div className="text-center text-5xl mb-4">⏰</div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-white mb-6">
          STEP {stepOrder} 타이머 완료!
        </h2>

        {/* Divider */}
        <div className="border-t border-white/10 mb-5" />

        {/* Body */}
        <p className="text-xs text-white/40 text-center mb-2">지금 해야 할 일:</p>
        <p className="text-center text-white/90 font-semibold text-base leading-relaxed mb-6">
          &ldquo;{instruction}&rdquo;
        </p>

        {/* Divider */}
        <div className="border-t border-white/10 mb-6" />

        {/* Confirm button */}
        <button
          onClick={onConfirm}
          className="w-full h-13 bg-[#FF5A28] text-white font-bold text-base rounded-full py-4 hover:bg-[#ff460f] transition-colors"
        >
          확인했어요 ✓
        </button>
      </div>
    </div>
  );
}
