'use client';

export interface ActiveTimer {
  stepOrder: number;
  instruction: string;
  initialSeconds: number;
  timeLeft: number;
  isRunning: boolean;
}

interface TimerPanelProps {
  timers: ActiveTimer[];
  onToggle: (stepOrder: number) => void;
  onReset: (stepOrder: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function MiniCircle({ timeLeft, initialSeconds }: { timeLeft: number; initialSeconds: number }) {
  const r = 28;
  const stroke = 6;
  const circumference = 2 * Math.PI * r;
  const progress = initialSeconds > 0 ? timeLeft / initialSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={r * 2 + stroke} height={r * 2 + stroke} className="-rotate-90">
      <circle
        cx={r + stroke / 2}
        cy={r + stroke / 2}
        r={r}
        fill="none"
        stroke="#5B4A40"
        strokeWidth={stroke}
      />
      <circle
        cx={r + stroke / 2}
        cy={r + stroke / 2}
        r={r}
        fill="none"
        stroke="#FF5A28"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

export default function TimerPanel({ timers, onToggle, onReset }: TimerPanelProps) {
  if (timers.length === 0) return null;

  // timeLeft 오름차순 정렬 (가장 먼저 끝나는 것이 맨 위)
  const sorted = [...timers].sort((a, b) => a.timeLeft - b.timeLeft);
  const [urgent, ...rest] = sorted;

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

      {/* Bottom fade hint */}
      <div className="shrink-0 h-6 bg-linear-to-t from-[#2A1F18] to-transparent pointer-events-none -mt-6 relative z-10" />
    </div>
  );
}
