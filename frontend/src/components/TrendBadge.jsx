
/**
 * TrendBadge — predictive escalation chip. Static: the prediction is the
 * signal, motion would only desensitize.
 */
export default function TrendBadge({ prediction }) {
  if (!prediction || prediction.predictedDaysToCritical == null) return null;

  const days = prediction.predictedDaysToCritical;
  const isUrgent = days <= 3;

  const label =
    days === 0
      ? 'critical now'
      : `critical in ~${days}d`;

  return (
    <span className={isUrgent ? 'chip-crit' : 'chip-warn'}>
      {label}
    </span>
  );
}
