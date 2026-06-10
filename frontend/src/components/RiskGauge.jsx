import React from 'react';
import { motion } from 'framer-motion';

/**
 * RiskGauge — Semicircular SVG gauge for visualizing risk score (0-100).
 * Colors dynamically based on status: healthy (emerald), warning (amber), critical (red).
 * @param {{ riskScore: number, status: string }} props
 */
export default function RiskGauge({ riskScore = 0, status = 'healthy' }) {
  const clampedScore = Math.min(100, Math.max(0, riskScore));

  // SVG arc parameters
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10; // shift down slightly so arc is centered visually

  // Semicircle arc (180 degrees) — from left to right
  const startAngle = Math.PI; // 180° (left)
  const endAngle = 0;        // 0° (right)

  // Full arc length for the semicircle
  const arcLength = Math.PI * radius;

  // How much of the arc to fill (0-100 → 0% to 100%)
  const fillRatio = clampedScore / 100;
  const dashOffset = arcLength * (1 - fillRatio);

  // Arc path (semicircle from left to right)
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Status-based colors
  const colorMap = {
    healthy: { stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.3)', text: 'text-emerald-400' },
    warning: { stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)', text: 'text-amber-400' },
    critical: { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)', text: 'text-red-400' },
  };

  const colors = colorMap[status] || colorMap.healthy;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`} className="overflow-visible">
        {/* Glow filter */}
        <defs>
          <filter id={`gauge-glow-${status}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc (animated) */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          filter={`url(#gauge-glow-${status})`}
        />

        {/* Score text */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="fill-white font-extrabold"
          style={{ fontSize: '36px', fontFamily: 'Inter, sans-serif' }}
        >
          {clampedScore.toFixed(1)}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          Risk Score
        </text>

        {/* Min / Max labels */}
        <text x={cx - radius} y={cy + 24} textAnchor="middle" className="fill-gray-500" style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>0</text>
        <text x={cx + radius} y={cy + 24} textAnchor="middle" className="fill-gray-500" style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>100</text>
      </svg>

      {/* Status badge */}
      <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
        status === 'healthy' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
        status === 'warning' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
        'bg-red-500/15 text-red-400 border border-red-500/20'
      }`}>
        {status}
      </div>
    </div>
  );
}
