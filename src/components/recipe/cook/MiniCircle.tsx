interface MiniCircleProps {
  timeLeft: number;
  initialSeconds: number;
  color?: string;
}

export default function MiniCircle({
  timeLeft,
  initialSeconds,
  color = '#FF5A28',
}: MiniCircleProps) {
  // SVG 크기가 40x40이 되도록 설정 (r * 2 + stroke = 36 + 4 = 40)
  const r = 18;
  const stroke = 4;
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
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}
