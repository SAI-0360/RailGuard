import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AlertBanner — System-wide alert bar when any segment is critical.
 * Appears at the top of the dashboard with a dismissible red gradient banner.
 * @param {{ segments: Array }} props
 */
export default function AlertBanner({ segments = [] }) {
  const [dismissed, setDismissed] = useState(false);

  const criticalSegments = segments.filter(s => s.status === 'critical');

  // Don't render if no critical segments or dismissed
  if (criticalSegments.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/15 via-red-600/10 to-red-500/15 backdrop-blur-xl"
      >
        {/* Animated pulse background */}
        <div className="absolute inset-0 bg-red-500/5 animate-pulse-critical pointer-events-none" />

        <div className="relative flex items-center justify-between px-5 py-3">
          {/* Alert content */}
          <div className="flex items-center gap-3">
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>

            <div>
              <p className="text-sm font-semibold text-red-300">
                🚨 {criticalSegments.length} Critical Segment{criticalSegments.length > 1 ? 's' : ''} Detected
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                {criticalSegments.slice(0, 5).map(s => s.segmentId).join(', ')}
                {criticalSegments.length > 5 && ` +${criticalSegments.length - 5} more`}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="text-red-400/60 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
