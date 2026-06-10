import React from 'react';
import { motion } from 'framer-motion';

/**
 * AiExplanation — Displays Gemini-generated risk explanation text.
 * Shows a placeholder message when no explanation is available.
 * @param {{ explanation: string }} props
 */
export default function AiExplanation({ explanation }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          AI Risk Analysis
        </h4>
        <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/20">
          Gemini
        </span>
      </div>

      {/* Explanation content */}
      {explanation ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-sm text-gray-300 leading-relaxed"
        >
          {explanation}
        </motion.p>
      ) : (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-2">
          <svg className="w-5 h-5 animate-pulse text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
          <span>AI risk analysis will appear here when data is available.</span>
        </div>
      )}
    </div>
  );
}
