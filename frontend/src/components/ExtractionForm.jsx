import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractDefect } from '../services/api';

/** Example placeholder text to guide users. */
const EXAMPLE_REPORT = `Routine inspection of track segment revealed a transverse crack approximately 15mm in length on the rail head at the gauge corner. Vibration readings elevated to 8.2 mm/s RMS. Visual signs of metal fatigue and surface spalling observed near the weld joint. Recommend immediate speed restriction and scheduling of rail grinding or replacement.`;

/**
 * ExtractionForm — submit an inspection report; the agent extracts a structured defect.
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title">Log inspection report</h3>
        <button
          type="button"
          onClick={fillExample}
          className="font-mono text-[10px] text-accent hover:underline cursor-pointer"
        >
          fill example
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          id="extraction-report"
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Paste the raw inspection report. The agent extracts a structured defect."
          rows={4}
          aria-label="Inspection report text"
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
            placeholder-ink-3 resize-none focus:outline-none focus:border-accent/60
            transition-colors duration-150"
        />

        <button
          type="submit"
          disabled={loading || !reportText.trim()}
          className="btn-accent w-full px-4 py-2"
        >
          {loading ? (
            <>
              <Spinner />
              Extracting defect
            </>
          ) : (
            'Extract defect'
          )}
        </button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && result.defect && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mt-2 border border-line rounded-lg bg-surface-2 px-3 py-2.5 space-y-1"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-ok mb-1.5">
              Defect extracted
            </p>
            <Row label="Type" value={result.defect.defectType} />
            <Row label="Severity" value={result.defect.severity} highlight />
            <Row label="Location" value={result.defect.location} />
            <Row label="Description" value={result.defect.description} />
            <Row label="Action" value={result.defect.recommendedAction} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small key-value row. */
function Row({ label, value, highlight = false }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-ink-3 w-20 shrink-0">{label}</span>
      <span className={highlight ? 'text-warn font-medium uppercase' : 'text-ink-2'}>
        {value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
