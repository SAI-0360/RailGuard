import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Severity badge color mapping.
 */
const SEVERITY_STYLES = {
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/15 text-red-400 border-red-500/20',
};

/**
 * DefectList — Displays active defects for a segment.
 * @param {{ defects: Array, segmentId: string }} props
 */
export default function DefectList({ defects = [], segmentId }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Active Defects
        </h4>
        {defects.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
            {defects.length}
          </span>
        )}
      </div>

      {/* Defect cards or empty state */}
      {defects.length === 0 ? (
        <div className="flex items-center gap-3 py-4 text-sm text-gray-500">
          <svg className="w-5 h-5 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>No active defects — {segmentId || 'segment'} is clear.</span>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {defects.map((defect, index) => (
              <motion.div
                key={defect.defectId || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2"
              >
                {/* Defect header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {defect.defectId && (
                      <span className="text-[10px] font-mono text-gray-500">{defect.defectId}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      SEVERITY_STYLES[defect.severity] || SEVERITY_STYLES.medium
                    }`}>
                      {defect.severity || 'unknown'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{defect.defectType || 'Unknown Type'}</span>
                </div>

                {/* Location */}
                {defect.location && (
                  <p className="text-xs text-gray-400">
                    📍 {defect.location}
                  </p>
                )}

                {/* Description */}
                {defect.description && (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {defect.description}
                  </p>
                )}

                {/* Recommended action */}
                {defect.recommendedAction && (
                  <div className="flex items-start gap-2 mt-1 pt-2 border-t border-white/5">
                    <span className="text-xs text-amber-500 mt-0.5">⚡</span>
                    <p className="text-xs text-amber-400/80">{defect.recommendedAction}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
