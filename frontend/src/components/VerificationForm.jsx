import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyRepair } from '../services/api';

/**
 * VerificationForm — Submit a repair description for Gemini AI verification.
 * @param {{ segmentId: string, defects: Array, onVerified: function }} props
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

  // If no defects, show a message
  if (defects.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔧</span>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Repair Verification
          </h4>
        </div>
        <p className="text-xs text-gray-500 py-2">
          No active defects to verify repairs against. Extract a defect first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔧</span>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Repair Verification
        </h4>
        <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          AI
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Defect selector */}
        <div>
          <label htmlFor="verify-defect-select" className="text-xs text-gray-400 block mb-1.5">
            Select defect to verify against
          </label>
          <select
            id="verify-defect-select"
            value={selectedDefectId}
            onChange={(e) => setSelectedDefectId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="" className="bg-gray-900 text-gray-400">— Select a defect —</option>
            {defects.map((d, idx) => (
              <option key={d.defectId || idx} value={d.defectId || `defect-${idx}`} className="bg-gray-900 text-white">
                {d.defectId || `Defect ${idx + 1}`} — {d.defectType || 'Unknown'} ({d.severity || '?'})
              </option>
            ))}
          </select>
        </div>

        {/* Repair description */}
        <div>
          <label htmlFor="repair-description" className="text-xs text-gray-400 block mb-1.5">
            Describe the repair performed
          </label>
          <textarea
            id="repair-description"
            value={repairDescription}
            onChange={(e) => setRepairDescription(e.target.value)}
            placeholder="Describe the repair actions taken to address the defect..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !repairDescription.trim() || !selectedDefectId}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            loading || !repairDescription.trim() || !selectedDefectId
              ? 'bg-emerald-500/10 text-emerald-500/40 cursor-not-allowed border border-emerald-500/10'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying...
            </>
          ) : (
            <>🔧 Verify Repair</>
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

      {/* Verification result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-white/3 border border-white/5 rounded-xl p-4 space-y-3"
          >
            {/* Verified / Not Verified badge */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                result.verification?.isVerified
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/15 text-red-400 border-red-500/20'
              }`}>
                {result.verification?.isVerified ? '✓ Verified' : '✗ Not Verified'}
              </span>

              {result.verification?.confidence !== undefined && (
                <span className="text-xs text-gray-400">
                  Confidence: <span className="text-white font-semibold">{(result.verification.confidence * 100).toFixed(0)}%</span>
                </span>
              )}
            </div>

            {/* Reasoning */}
            {result.verification?.verificationReasoning && (
              <p className="text-xs text-gray-300 leading-relaxed">
                {result.verification.verificationReasoning}
              </p>
            )}

            {/* Status recommendation */}
            {result.verification?.statusRecommendation && (
              <div className="text-xs text-gray-400">
                Recommendation: <span className={`font-semibold ${
                  result.verification.statusRecommendation === 'healthy' ? 'text-emerald-400' :
                  result.verification.statusRecommendation === 'warning' ? 'text-amber-400' : 'text-red-400'
                }`}>{result.verification.statusRecommendation}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
