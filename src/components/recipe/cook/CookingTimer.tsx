'use client';

import { useState, useEffect } from 'react';

interface CookingTimerProps {
  initialSeconds: number;
}

// NOTE: 부모에서 key={timer_seconds}로 사용해야 단계 변경 시 자동 리셋됩니다.
export default function CookingTimer({ initialSeconds }: CookingTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  // isRunning이 true이고 시간이 남아있을 때만 인터벌 실행
  // timeLeft가 0이 되면 guard에 막혀 interval이 자동으로 시작되지 않음
  // → setState in effect 없이 완료 처리 가능
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return undefined;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // 실제로 카운트다운 중인지 나타내는 파생값
  const isActive = isRunning && timeLeft > 0;

  const toggleTimer = () => {
    if (timeLeft <= 0) {
      // 시간 초과 상태에서 누르면 리셋 후 시작
      setTimeLeft(initialSeconds);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    initialSeconds > 0
      ? circumference - (timeLeft / initialSeconds) * circumference
      : circumference;

  if (initialSeconds === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center relative w-[300px] h-[300px]">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90 pointer-events-none"
      >
        <circle
          stroke="#5B4A40"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#FF5A28"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
        <span className="text-5xl font-bold text-[#FF5A28] mb-4">{formatTime(timeLeft)}</span>
        <button
          onClick={toggleTimer}
          className="bg-[#FF5A28] text-white font-bold rounded-full hover:bg-[#ff460f] transition-colors whitespace-nowrap"
          style={{ width: '80px', height: '40px', fontSize: '13px' }}
        >
          {isActive ? '일시정지' : '시작'}
        </button>
        <button
          onClick={resetTimer}
          className="text-gray-400 text-sm mt-2 hover:text-white transition-colors"
        >
          리셋
        </button>
      </div>
    </div>
  );
}
