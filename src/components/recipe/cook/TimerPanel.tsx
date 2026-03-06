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
  // 1. 오름차순(Step) 정렬 유지를 위해 정렬 조건을 단계순으로 고정합니다.
  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => a.stepOrder - b.stepOrder);
  }, [timers]);

  // 2. 가장 먼저 끝나는 타이머 찾기 (0초과인 것 중 가장 작은 timeLeft)
  const urgentTimerId = useMemo(() => {
    let minTime = Infinity;
    let id = -1;
    sortedTimers.forEach((t) => {
      if (t.timeLeft > 0 && t.timeLeft < minTime) {
        minTime = t.timeLeft;
        id = t.stepOrder;
      }
    });
    return id;
  }, [sortedTimers]);

  if (timers.length === 0) return null;

  // 3. 노출 개수 제한 (최대 3개 표시 — 버튼 잘림 방지 및 인지 부하 감소)
  const visibleTimers = sortedTimers.slice(0, 3);
  const extraCount = sortedTimers.length - 3;

  return (
    <div className="flex flex-col h-full bg-[#2A1F18] rounded-3xl overflow-hidden">
      {/* Panel Header */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <p className="text-xs font-bold text-white/40 tracking-widest text-center uppercase">
          실행 중인 타이머
        </p>
      </div>
      <div className="mx-5 border-t border-white/10 shrink-0" />

      {/* Timer List — no scroll, 3 items max, each 130px */}
      <div className="flex-1 overflow-hidden px-3 py-1.5 space-y-2">
        {visibleTimers.map((timer) => {
          const isCompleted = timer.timeLeft === 0;
          const isUrgent = timer.stepOrder === urgentTimerId;

          let wrapperClass = 'h-[130px] rounded-xl p-2.5 border transition-colors overflow-hidden ';
          if (isCompleted) {
            wrapperClass += 'bg-[#2E231D]/80 border-[#A9A39D]/50 opacity-80';
          } else if (isUrgent) {
            wrapperClass += 'bg-[#1A0F08] border-[#FF5A28]';
          } else {
            wrapperClass += 'bg-white/5 border-white/10';
          }

          return (
            <div key={timer.stepOrder} className={wrapperClass}>
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {isCompleted && (
                  <>
                    <span className="text-[10px] font-bold text-[#A9A39D] bg-[#A9A39D]/20 px-2 py-0.5 rounded-full">
                      STEP {timer.stepOrder}
                    </span>
                    <span className="text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/20 border border-[#4CAF50]/50 px-2 py-0.5 rounded-full">
                      완료 ✔
                    </span>
                  </>
                )}
                {isUrgent && (
                  <>
                    <span className="text-[10px] font-bold text-[#FF5A28] bg-[#FF5A28]/15 border border-[#FF5A28]/40 px-2 py-0.5 rounded-full">
                      ⏰ 곧 완료 예정
                    </span>
                    <span className="text-[10px] font-bold text-white bg-[#FF5A28] px-2 py-0.5 rounded-full">
                      STEP {timer.stepOrder}
                    </span>
                  </>
                )}
                {!isCompleted && !isUrgent && (
                  <span className="text-[10px] font-bold text-[#FF5A28] bg-[#FF5A28]/20 border border-[#FF5A28]/30 px-2 py-0.5 rounded-full">
                    STEP {timer.stepOrder}
                  </span>
                )}
              </div>

              {/* Ring + Time + Instruction */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <MiniCircle
                    timeLeft={timer.timeLeft}
                    initialSeconds={timer.initialSeconds}
                    color={isCompleted ? '#4CAF50' : '#FF5A28'}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-[10px] font-bold tracking-tighter ${isCompleted ? 'text-[#4CAF50]' : 'text-[#FF5A28]'}`}
                    >
                      {formatTime(timer.timeLeft)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-[12px] leading-snug line-clamp-2 ${isCompleted ? 'text-white/40' : isUrgent ? 'text-white font-bold' : 'text-white/70'}`}
                  >
                    &ldquo;{timer.instruction}&rdquo;
                  </p>
                  {isUrgent && (
                    <p className="text-[10px] text-[#FF5A28] font-bold mt-0.5">
                      진행 상황을 확인하세요!
                    </p>
                  )}
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => onToggle(timer.stepOrder)}
                  disabled={isCompleted}
                  className={`flex-1 py-1 rounded-full font-bold text-xs transition-colors ${
                    isCompleted
                      ? 'bg-transparent border border-[#A9A39D]/30 text-[#A9A39D]/50 cursor-not-allowed'
                      : isUrgent
                        ? 'bg-[#FF5A28] text-white hover:bg-[#ff460f]'
                        : 'bg-[#FF5A28]/30 border border-[#FF5A28]/50 text-[#FF5A28] hover:bg-[#FF5A28]/50'
                  }`}
                >
                  {timer.isRunning ? '일시정지' : '재개'}
                </button>
                <button
                  onClick={() => onReset(timer.stepOrder)}
                  className={`flex-1 py-1 rounded-full border font-bold text-xs transition-colors ${
                    isCompleted
                      ? 'border-[#A9A39D]/30 text-[#A9A39D]/50 hover:border-[#A9A39D]/60 hover:text-[#A9A39D]'
                      : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'
                  }`}
                >
                  리셋
                </button>
              </div>
            </div>
          );
        })}

        {/* More Indicator — not a button, just info */}
        {extraCount > 0 && (
          <p className="text-center text-[11px] text-white/40 py-1">외 {extraCount}개 진행 중</p>
        )}
      </div>

      <div className="shrink-0 h-6 bg-linear-to-t from-[#2A1F18] to-transparent pointer-events-none -mt-6 relative z-10" />
    </div>
  );
}

export default memo(TimerPanel);
