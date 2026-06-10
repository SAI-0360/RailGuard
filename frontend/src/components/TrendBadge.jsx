import React from 'react';
import { motion } from 'framer-motion';

/**
 * TrendBadge Component
 * Displays a pill-shaped predictive warning when a segment is trending toward critical.
 *
 * Props:
 * - prediction: { predictedDaysToCritical: number, trendDirection: string, slopePerReading: number } | null
 */
export default function TrendBadge({ prediction }) {
  if (!prediction || prediction.predictedDaysToCritical == null) return null;

  const days = prediction.predictedDaysToCritical;
  const isUrgent = days <= 3;

  const colorClasses = isUrgent
    ? 'border-red-500/40 bg-red-500/10 text-red-300'
    : 'border-amber-500/40 bg-amber-500/10 text-amber-300';

  const dotClass = isUrgent
    ? 'bg-red-400 animate-pulse'
    : 'bg-amber-400 animate-pulse';

  const label =
    days === 0
      ? 'Critical now — immediate attention'
      : `Predicted critical in ~${days} day${days !== 1 ? 's' : ''}`;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full border ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      {label}
    </motion.span>
  );
}
