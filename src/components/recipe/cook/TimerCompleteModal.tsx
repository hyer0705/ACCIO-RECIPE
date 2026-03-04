'use client';

interface TimerCompleteModalProps {
  stepOrder: number;
  instruction: string;
  onConfirm: () => void;
}

// Web Audio API로 알림음 재생 (외부 라이브러리 없음)
function playChime() {
  try {
    const ctx = new AudioContext();
    const notes = [880, 1100, 1320]; // A5 → C#6 → E6 상행 화음
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.5);
    });
  } catch {
    // AudioContext 미지원 환경 무시
  }
}

export default function TimerCompleteModal({
  stepOrder,
  instruction,
  onConfirm,
}: TimerCompleteModalProps) {
  // 모달이 마운트될 때 소리 재생
  // (useEffect 대신 렌더 외부에서 한 번만 실행)
  if (typeof window !== 'undefined') {
    // setTimeout 0으로 마운트 직후 실행 (상태 업데이트 사이클 이후)
    setTimeout(playChime, 0);
  }

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
