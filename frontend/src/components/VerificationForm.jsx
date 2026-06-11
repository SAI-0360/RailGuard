import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyRepair } from '../services/api';

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236A7383' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;

/**
 * VerificationForm — describe a completed repair; the agent verifies it
 * against the defect and recommends a status. Closes the maintenance loop.
 */
export default function VerificationForm({ segmentId, defects = [], onVerified }) {
  const [selectedDefectId, setSelectedDefectId] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repairDescription.trim() || !segmentId || !selectedDefectId) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await verifyRepair(segmentId, selectedDefectId, repairDescription.trim());
      setResult(data);
      if (onVerified) onVerified(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (defects.length === 0) {
    return (
      <div>
        <h3 className="panel-title mb-1.5">Verify repair</h3>
        <p className="text-xs text-ink-3">
          No active defects to verify against. Log an inspection report first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="panel-title mb-2">Verify repair</h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label htmlFor="verify-defect-select" className="block text-[11px] text-ink-2 mb-1">
            Defect to verify against
          </label>
          <select
            id="verify-defect-select"
            value={selectedDefectId}
            onChange={(e) => setSelectedDefectId(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink
              focus:outline-none focus:border-accent/60 appearance-none cursor-pointer
              transition-colors duration-150"
            style={{
              backgroundImage: SELECT_ARROW,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="" className="bg-surface-3 text-ink-2">Select a defect</option>
            {defects.map((d, idx) => (
              <option
                key={d.defectId || idx}
                value={d.defectId || `defect-${idx}`}
                className="bg-surface-3 text-ink"
              >
                {d.defectId || `Defect ${idx + 1}`} · {d.defectType || 'Unknown'} ({d.severity || '?'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="repair-description" className="block text-[11px] text-ink-2 mb-1">
            Repair performed
          </label>
          <textarea
            id="repair-description"
            value={repairDescription}
            onChange={(e) => setRepairDescription(e.target.value)}
            placeholder="Describe the repair actions taken to address the defect."
            rows={3}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
              placeholder-ink-3 resize-none focus:outline-none focus:border-accent/60
              transition-colors duration-150"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !repairDescription.trim() || !selectedDefectId}
          className="btn-accent w-full px-4 py-2"
        >
          {loading ? (
            <>
              <Spinner />
              Verifying repair
            </>
          ) : (
            'Verify repair'
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
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mt-2 border border-line rounded-lg bg-surface-2 px-3 py-2.5 space-y-2"
          >
            <div className="flex items-center gap-3">
              <span className={result.verification?.isVerified ? 'chip-ok' : 'chip-crit'}>
                {result.verification?.isVerified ? 'Verified' : 'Not verified'}
              </span>
              {result.verification?.confidence !== undefined && (
                <span className="font-mono text-[11px] text-ink-2">
                  confidence {(result.verification.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {result.verification?.verificationReasoning && (
              <p className="text-[11px] text-ink-2 leading-relaxed">
                {result.verification.verificationReasoning}
              </p>
            )}

            {result.verification?.statusRecommendation && (
              <p className="text-[11px] text-ink-3">
                Recommended status:{' '}
                <span className={
                  result.verification.statusRecommendation === 'healthy' ? 'text-ok' :
                  result.verification.statusRecommendation === 'warning' ? 'text-warn' : 'text-crit'
                }>
                  {result.verification.statusRecommendation}
                </span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
