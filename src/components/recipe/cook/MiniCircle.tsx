interface MiniCircleProps {
  timeLeft: number;
  initialSeconds: number;
}

export default function MiniCircle({ timeLeft, initialSeconds }: MiniCircleProps) {
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
