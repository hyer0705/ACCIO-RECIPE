'use client';

import { memo, useMemo } from 'react';

import { ActiveTimer } from '@/types/timer';
import TimerItem from '@/components/recipe/cook/TimerItem';

interface TimerPanelProps {
  timers: ActiveTimer[];
  onToggle: (stepOrder: number) => void;
  onReset: (stepOrder: number) => void;
}

function TimerPanel({ timers, onToggle, onReset }: TimerPanelProps) {
  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => a.stepOrder - b.stepOrder);
  }, [timers]);

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
        {visibleTimers.map((timer) => (
          <TimerItem
            key={timer.stepOrder}
            timer={timer}
            isUrgent={timer.stepOrder === urgentTimerId}
            onToggle={onToggle}
            onReset={onReset}
          />
        ))}

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
