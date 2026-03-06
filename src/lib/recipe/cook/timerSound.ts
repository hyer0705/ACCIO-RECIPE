/**
 * Web Audio API를 사용하여 타이머 완료 알림음을 재생합니다.
 * 외부 라이브러리 없이 브라우저 내장 API를 활용합니다.
 */
export function playTimerCompletionSound() {
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
  } catch (error) {
    // AudioContext 미지원 환경 또는 재생 실패 시 무시하되 로그는 남김
    console.warn('Web Audio API를 통한 알림음 재생에 실패했습니다:', error);
  }
}
