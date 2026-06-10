import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractDefect } from '../services/api';

/** Example placeholder text to guide users. */
const EXAMPLE_REPORT = `Routine inspection of track segment revealed a transverse crack approximately 15mm in length on the rail head at the gauge corner. Vibration readings elevated to 8.2 mm/s RMS. Visual signs of metal fatigue and surface spalling observed near the weld joint. Recommend immediate speed restriction and scheduling of rail grinding or replacement.`;

/**
 * ExtractionForm — Submit an inspection report for Gemini AI defect extraction.
 * @param {{ segmentId: string, onExtracted: function }} props
 */
export default function ExtractionForm({ segmentId, onExtracted }) {
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim() || !segmentId) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await extractDefect(segmentId, reportText.trim());
      setResult(data);
      if (onExtracted) onExtracted(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    setReportText(EXAMPLE_REPORT);
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔍</span>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Defect Extraction
        </h4>
        <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/20">
          AI
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="extraction-report" className="text-xs text-gray-400">
              Paste inspection report text
            </label>
            <button
              type="button"
              onClick={fillExample}
              className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              Fill example →
            </button>
          </div>
          <textarea
            id="extraction-report"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Enter or paste the raw inspection report text here..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !reportText.trim()}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            loading || !reportText.trim()
              ? 'bg-violet-500/10 text-violet-500/40 cursor-not-allowed border border-violet-500/10'
              : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 cursor-pointer'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Extracting...
            </>
          ) : (
            <>✨ Extract Defect</>
          )}
        </button>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
          >
            ✗ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extraction result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-white/3 border border-white/5 rounded-xl p-4 space-y-2"
          >
            <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              ✓ Extracted Defect
            </h5>
            {result.defect && (
              <div className="space-y-1.5 text-xs">
                <Row label="Type" value={result.defect.defectType} />
                <Row label="Severity" value={result.defect.severity} highlight />
                <Row label="Location" value={result.defect.location} />
                <Row label="Description" value={result.defect.description} />
                <Row label="Action" value={result.defect.recommendedAction} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small helper row for key-value display. */
function Row({ label, value, highlight = false }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}:</span>
      <span className={highlight ? 'text-amber-400 font-semibold uppercase' : 'text-gray-300'}>
        {value}
      </span>
    </div>
  );
}
