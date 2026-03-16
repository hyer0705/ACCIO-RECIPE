'use client';

import { useEffect, useRef } from 'react';
import { playTimerCompletionSound } from '@/lib/recipe/cook/timerSound';

interface TimerCompleteModalProps {
  stepOrder: number;
  instruction: string;
  onConfirm: () => void;
}

const TITLE_ID = 'timer-modal-title';
const DESC_ID = 'timer-modal-desc';

export default function TimerCompleteModal({
  stepOrder,
  instruction,
  onConfirm,
}: TimerCompleteModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // 컴포넌트 마운트 완료 후(Commit 단계) 한 번만 소리 재생 + 포커스 이동
  useEffect(() => {
    playTimerCompletionSound();
    previousFocusRef.current = document.activeElement;
    confirmRef.current?.focus();
    return () => {
      (previousFocusRef.current as HTMLElement)?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onConfirm();
      return;
    }
    // Focus trap: confirm button is the only focusable element
    if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={DESC_ID}
        onKeyDown={handleKeyDown}
        className="bg-[#2A1F18] border border-[#FF5A28] rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl"
      >
        {/* Icon */}
        <div className="text-center text-5xl mb-4">⏰</div>

        {/* Title */}
        <h2 id={TITLE_ID} className="text-center text-xl font-bold text-white mb-6">
          STEP {stepOrder} 타이머 완료!
        </h2>

        {/* Divider */}
        <div className="border-t border-white/10 mb-5" />

        {/* Body */}
        <p className="text-xs text-white/40 text-center mb-2">마무리 된 조리:</p>
        <p
          id={DESC_ID}
          className="text-center text-white/90 font-semibold text-base leading-relaxed mb-6"
        >
          &ldquo;{instruction}&rdquo;
        </p>

        {/* Divider */}
        <div className="border-t border-white/10 mb-6" />

        {/* Confirm button */}
        <button
          ref={confirmRef}
          onClick={onConfirm}
          className="w-full h-13 bg-[#FF5A28] text-white font-bold text-base rounded-full py-4 hover:bg-[#ff460f] transition-colors"
        >
          확인했어요 ✓
        </button>
      </div>
    </div>
  );
}
