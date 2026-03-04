export default function HealthGauge({ score, size = 64 }) {
  const strokeWidth = size >= 80 ? 5 : size >= 48 ? 4 : 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score || 0, 0), 100);
  const offset = circumference - (normalizedScore / 100) * circumference;

  let color = '#ef4444';
  if (normalizedScore >= 80) color = '#22c55e';
  else if (normalizedScore >= 65) color = '#14b8a6';
  else if (normalizedScore >= 50) color = '#f59e0b';
  else if (normalizedScore >= 35) color = '#f97316';

  const fontSize = size >= 80 ? 20 : size >= 56 ? 18 : size >= 48 ? 14 : 10;

  // Glow color (extract rgb values for shadow)
  const glowMap = {
    '#22c55e': 'rgba(34,197,94,0.3)',
    '#14b8a6': 'rgba(20,184,166,0.3)',
    '#f59e0b': 'rgba(245,158,11,0.3)',
    '#f97316': 'rgba(249,115,22,0.3)',
    '#ef4444': 'rgba(239,68,68,0.3)',
  };
  const glow = glowMap[color] || 'rgba(128,128,128,0.2)';

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: '50%',
      boxShadow: `0 0 12px ${glow}`,
    }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-ring-track)"
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
