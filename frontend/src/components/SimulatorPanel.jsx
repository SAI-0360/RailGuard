import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { simulateAction, resetAll } from "../services/api";
import { TOTAL_SEGMENTS, SEGMENT_ID_PREFIX, DEFAULT_SPIKE_VALUE } from "../utils/constants";

// Generate segment ID options (SEG-001 to SEG-100)
const segmentOptions = Array.from({ length: TOTAL_SEGMENTS }, (_, i) =>
  `${SEGMENT_ID_PREFIX}${String(i + 1).padStart(3, "0")}`
);

function SimulatorPanel({ onActionComplete }) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState("SEG-042");
  const [loadingAction, setLoadingAction] = useState(null); // tracks which button is loading
  const [lastResult, setLastResult] = useState(null);

  const handleAction = async (actionName, action, value) => {
    setLoadingAction(actionName);
    setLastResult(null);
    try {
      if (actionName === "resetAll") {
        await resetAll();
        setLastResult({ success: true, message: "All segments reset to healthy" });
      } else {
        const result = await simulateAction(selectedSegmentId, action, value);
        const seg = result.segment;
        setLastResult({
          success: true,
          message: `${selectedSegmentId} → ${seg.status} (risk: ${seg.riskScore})`,
        });
      }
      if (onActionComplete) {
        onActionComplete(actionName, selectedSegmentId);
      }
    } catch (err) {
      setLastResult({
        success: false,
        message: err?.response?.data?.error || "Action failed",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-semibold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-amber-500">⚡</span>
          Simulator Panel
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          ▼
        </motion.span>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5">
              {/* DEV ONLY Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Dev Only
                </span>
                <span className="text-xs text-gray-500">Demo & Testing Controls</span>
              </div>

              {/* Segment Selector */}
              <div>
                <label
                  htmlFor="sim-segment-select"
                  className="block text-xs text-gray-400 uppercase tracking-wider mb-2"
                >
                  Target Segment
                </label>
                <select
                  id="sim-segment-select"
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                  }}
                >
                  {segmentOptions.map((id) => (
                    <option key={id} value={id} className="bg-gray-900 text-white">
                      {id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Simulate Vibration Spike */}
                <SimButton
                  label="Simulate Vibration Spike"
                  icon="📈"
                  sublabel={`Set vibration to ${DEFAULT_SPIKE_VALUE} mm/s`}
                  loading={loadingAction === "spike"}
                  disabled={loadingAction !== null}
                  variant="warning"
                  onClick={() => handleAction("spike", "spike", DEFAULT_SPIKE_VALUE)}
                />

                {/* Simulate Crack Detection */}
                <SimButton
                  label="Simulate Crack Detection"
                  icon="🔨"
                  sublabel="Increment crack count by 1"
                  loading={loadingAction === "crack"}
                  disabled={loadingAction !== null}
                  variant="warning"
                  onClick={() => handleAction("crack", "crack")}
                />

                {/* Reset Segment */}
                <SimButton
                  label="Reset Segment"
                  icon="🔄"
                  sublabel="Return segment to healthy defaults"
                  loading={loadingAction === "reset"}
                  disabled={loadingAction !== null}
                  variant="success"
                  onClick={() => handleAction("reset", "reset")}
                />

                {/* Divider before destructive action */}
                <div className="border-t border-white/5" />

                {/* Reset All Segments */}
                <SimButton
                  label="Reset All Segments"
                  icon="⚠️"
                  sublabel="Reset all 100 segments to healthy"
                  loading={loadingAction === "resetAll"}
                  disabled={loadingAction !== null}
                  variant="danger"
                  onClick={() => handleAction("resetAll")}
                />
              </div>

              {/* Result Feedback */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={`text-xs px-3 py-2 rounded-lg border ${
                      lastResult.success
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    {lastResult.success ? "✓" : "✗"} {lastResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Reusable Button Sub-Component ────────────────────────────────────────────

const VARIANT_STYLES = {
  warning:
    "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400",
  success:
    "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400",
  danger:
    "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400",
};

function SimButton({ label, icon, sublabel, loading, disabled, variant, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
        VARIANT_STYLES[variant]
      } ${disabled && !loading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-lg flex-shrink-0">{loading ? <Spinner /> : icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {sublabel && (
          <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>
        )}
      </div>
    </button>
  );
}

// ─── Spinner Sub-Component ────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-amber-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default SimulatorPanel;
