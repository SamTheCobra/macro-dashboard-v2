export default function HealthGauge({ score, size = 64 }) {
  const strokeWidth = size >= 80 ? 5 : size >= 48 ? 3.5 : 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score || 0, 0), 100);
  const offset = circumference - (normalizedScore / 100) * circumference;

  let color = '#ef4444';
  if (normalizedScore >= 70) color = '#22c55e';
  else if (normalizedScore >= 50) color = '#f59e0b';

  const fontSize = size >= 80 ? 18 : size >= 64 ? 14 : size >= 48 ? 12 : 10;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        color,
      }}>
        {Math.round(normalizedScore)}
      </span>
    </div>
  );
}
