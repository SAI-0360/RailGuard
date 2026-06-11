import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * CriticalBanner — escalation tier of the alert system.
 * Appears once per new critical segment with a single deliberate entrance,
 * then holds completely still: persistence is the signal, not motion.
 * Alerts are acknowledged (operator takes ownership), not dismissed.
 * Re-fires automatically if a new segment goes critical after acknowledgement.
 */
export default function CriticalBanner({ segments = [], onSelect }) {
  const [ackIds, setAckIds] = useState(() => new Set());
  const reduceMotion = useReducedMotion();

  const critical = segments.filter((s) => s.status === 'critical');
  const unacked = critical.filter((s) => !ackIds.has(s.segmentId));

  const acknowledge = () => {
    setAckIds((prev) => {
      const next = new Set(prev);
      critical.forEach((s) => next.add(s.segmentId));
      return next;
    });
  };

  return (
    <AnimatePresence>
      {unacked.length > 0 && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="bg-crit/10 border-b border-crit/30"
        >
          <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-2 flex items-center gap-3">
            <span className="chip-crit shrink-0">Critical</span>
            <p className="text-xs text-ink min-w-0 truncate">
              {unacked.length} segment{unacked.length > 1 ? 's' : ''} requiring response:{' '}
              {unacked.slice(0, 5).map((s, i) => (
                <React.Fragment key={s.segmentId}>
                  {i > 0 && ', '}
                  <button
                    onClick={() => onSelect && onSelect(s.segmentId)}
                    className="font-mono text-crit hover:underline"
                  >
                    {s.segmentId}
                  </button>
                </React.Fragment>
              ))}
              {unacked.length > 5 && ` +${unacked.length - 5} more`}
            </p>
            <button onClick={acknowledge} className="btn-ghost px-2.5 py-1 ml-auto shrink-0">
              Acknowledge
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
