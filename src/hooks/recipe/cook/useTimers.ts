import { useEffect, useCallback, useState } from 'react';
import { ActiveTimer } from '@/types/timer';
import { useCookStore } from '@/store/useCookStore';

export function useTimers() {
  const { activeTimers, setActiveTimers } = useCookStore();
  const [completedTimer, setCompletedTimer] = useState<ActiveTimer | null>(null);

  // 1초마다 모든 실행 중인 타이머 감소
  useEffect(() => {
    if (activeTimers.length === 0) return undefined;

    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        const completed: ActiveTimer[] = [];

        const updated = prev.map((t) => {
          if (!t.isRunning || t.timeLeft <= 0) return t;

          const next = t.timeLeft - 1;
          if (next === 0) {
            const done = { ...t, timeLeft: 0, isRunning: false };
            completed.push(done);
            return done;
          }
          return { ...t, timeLeft: next };
        });

        if (completed.length > 0) {
          const snapshot = completed.slice();
          setTimeout(() => snapshot.forEach((t) => setCompletedTimer(t)), 0);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers.length, setActiveTimers]);

  const startTimer = useCallback(
    (stepOrder: number, instruction: string, seconds: number) => {
      if (!seconds || seconds <= 0) return;

      setActiveTimers((prev) => {
        const exists = prev.find((t) => t.stepOrder === stepOrder);
        if (exists) return prev; // 중복 방지

        return [
          ...prev,
          {
            stepOrder,
            instruction,
            initialSeconds: seconds,
            timeLeft: seconds,
            isRunning: true,
          },
        ];
      });
    },
    [setActiveTimers],
  );

  const toggleTimer = useCallback(
    (stepOrder: number) => {
      setActiveTimers((prev) =>
        prev.map((t) => (t.stepOrder === stepOrder ? { ...t, isRunning: !t.isRunning } : t)),
      );
    },
    [setActiveTimers],
  );

  const resetTimer = useCallback(
    (stepOrder: number) => {
      setActiveTimers((prev) =>
        prev.map((t) =>
          t.stepOrder === stepOrder ? { ...t, timeLeft: t.initialSeconds, isRunning: false } : t,
        ),
      );
    },
    [setActiveTimers],
  );

  const dismissModal = useCallback(() => {
    if (completedTimer) {
      setActiveTimers((prev) => prev.filter((t) => t.stepOrder !== completedTimer.stepOrder));
    }
    setCompletedTimer(null);
  }, [completedTimer, setActiveTimers]);

  return {
    activeTimers,
    completedTimer,
    startTimer,
    toggleTimer,
    resetTimer,
    dismissModal,
  };
}
