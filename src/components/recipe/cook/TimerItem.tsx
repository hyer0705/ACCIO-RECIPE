'use client';

import { memo } from 'react';
import { ActiveTimer } from '@/types/timer';
import { formatTime } from '@/lib/recipe/cook/timerUtils';
import MiniCircle from '@/components/recipe/cook/MiniCircle';

interface TimerItemProps {
  timer: ActiveTimer;
  isUrgent: boolean;
  onToggle: (stepOrder: number) => void;
  onReset: (stepOrder: number) => void;
}

function TimerItem({ timer, isUrgent, onToggle, onReset }: TimerItemProps) {
  const isCompleted = timer.timeLeft === 0;

  let wrapperClass = 'h-[130px] rounded-xl p-2.5 border transition-colors overflow-hidden ';
  if (isCompleted) {
    wrapperClass += 'bg-[#2E231D]/80 border-[#A9A39D]/50 opacity-80';
  } else if (isUrgent) {
    wrapperClass += 'bg-[#1A0F08] border-[#FF5A28]';
  } else {
    wrapperClass += 'bg-white/5 border-white/10';
  }

  return (
    <div className={wrapperClass}>
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
            <p className="text-[10px] text-[#FF5A28] font-bold mt-0.5">진행 상황을 확인하세요!</p>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={() => onToggle(timer.stepOrder)}
          disabled={isCompleted}
          aria-label={timer.isRunning ? '타이머 일시정지' : '타이머 재개'}
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
          aria-label="타이머 리셋"
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
}

export default memo(TimerItem);
