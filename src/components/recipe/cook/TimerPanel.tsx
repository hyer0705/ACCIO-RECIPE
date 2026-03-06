'use client';

import { memo, useMemo } from 'react';

import { ActiveTimer } from '@/types/timer';
import { formatTime } from '@/lib/recipe/cook/timerUtils';
import MiniCircle from '@/components/recipe/cook/MiniCircle';

interface TimerPanelProps {
  timers: ActiveTimer[];
  onToggle: (stepOrder: number) => void;
  onReset: (stepOrder: number) => void;
}

function TimerPanel({ timers, onToggle, onReset }: TimerPanelProps) {
  // useMemo를 사용하여 timers 배열이 변경될 때만 정렬을 수행하도록 최적화합니다.
  // Hook은 조건문(Early Return)보다 항상 위에 있어야 합니다.
  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => a.timeLeft - b.timeLeft);
  }, [timers]);

  if (timers.length === 0) return null;

  const [urgent, ...rest] = sortedTimers;

  return (
    <div className="flex flex-col h-full bg-[#2A1F18] rounded-3xl overflow-hidden">
      {/* Panel Header */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <p className="text-xs font-bold text-white/40 tracking-widest text-center uppercase">
          실행 중인 타이머
        </p>
      </div>
      <div className="mx-5 border-t border-white/10 shrink-0" />

      {/* Timer List — internal scroll only */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-[#FF5A28]/40 scrollbar-track-transparent">
        {/* Urgent timer (pinned highlight) */}
        <div className="rounded-2xl bg-[#1A0F08] border border-[#FF5A28] p-4">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-[#FF5A28] bg-[#FF5A28]/15 border border-[#FF5A28]/40 px-2.5 py-0.5 rounded-full">
              ⏰ 가장 먼저 끝남
            </span>
            <span className="text-[10px] font-bold text-white bg-[#FF5A28] px-2.5 py-0.5 rounded-full">
              STEP {urgent.stepOrder}
            </span>
          </div>

          {/* Ring + Time + Instruction */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <MiniCircle timeLeft={urgent.timeLeft} initialSeconds={urgent.initialSeconds} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#FF5A28]">
                  {formatTime(urgent.timeLeft)}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-white/75 leading-snug line-clamp-2">
              &ldquo;{urgent.instruction}&rdquo;
            </p>
          </div>

          {/* Control buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onToggle(urgent.stepOrder)}
              className="flex-1 py-2 rounded-full bg-[#FF5A28] text-white font-bold text-xs hover:bg-[#ff460f] transition-colors"
            >
              {urgent.isRunning ? '일시정지' : '재개'}
            </button>
            <button
              onClick={() => onReset(urgent.stepOrder)}
              className="flex-1 py-2 rounded-full border border-white/30 text-white/60 font-bold text-xs hover:border-white/60 transition-colors"
            >
              리셋
            </button>
          </div>
        </div>

        {/* Rest of timers */}
        {rest.map((timer) => (
          <div key={timer.stepOrder} className="rounded-2xl bg-white/4 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-[#FF5A28] bg-[#FF5A28]/20 border border-[#FF5A28]/30 px-2.5 py-0.5 rounded-full">
                STEP {timer.stepOrder}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <MiniCircle timeLeft={timer.timeLeft} initialSeconds={timer.initialSeconds} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#FF5A28]">
                    {formatTime(timer.timeLeft)}
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-white/55 leading-snug line-clamp-2">
                &ldquo;{timer.instruction}&rdquo;
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onToggle(timer.stepOrder)}
                className="flex-1 py-1.5 rounded-full bg-[#FF5A28]/30 border border-[#FF5A28]/50 text-[#FF5A28] font-bold text-xs hover:bg-[#FF5A28]/50 transition-colors"
              >
                {timer.isRunning ? '일시정지' : '재개'}
              </button>
              <button
                onClick={() => onReset(timer.stepOrder)}
                className="flex-1 py-1.5 rounded-full border border-white/20 text-white/40 font-bold text-xs hover:border-white/40 transition-colors"
              >
                리셋
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 h-6 bg-linear-to-t from-[#2A1F18] to-transparent pointer-events-none -mt-6 relative z-10" />
    </div>
  );
}

export default memo(TimerPanel);
