import React, { useState } from 'react';
import { simulateAction, resetAll, triggerScenario } from '../services/api';
import { TOTAL_SEGMENTS, SEGMENT_ID_PREFIX, DEFAULT_SPIKE_VALUE } from '../utils/constants';

const segmentOptions = Array.from({ length: TOTAL_SEGMENTS }, (_, i) =>
  `${SEGMENT_ID_PREFIX}${String(i + 1).padStart(3, '0')}`
);

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236A7383' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;

/**
 * DrillPanel — synthetic fault injection for demos and operator drills.
 * Deliberately quarantined from live controls: dashed border, SYNTHETIC tag,
 * collapsed by default. In a real ops room, confusing drill controls with
 * live state is dangerous; the visual treatment encodes that boundary.
 */
export default function DrillPanel({ onActionComplete }) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('SEG-042');
  const [loadingAction, setLoadingAction] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [scenario, setScenario] = useState('critical_degrade');

  const handleAction = async (actionName, action, value) => {
    setLoadingAction(actionName);
    setLastResult(null);
    try {
      if (actionName === 'resetAll') {
        await resetAll();
        setLastResult({ success: true, message: 'All segments reset to healthy' });
      } else {
        const result = await simulateAction(targetId, action, value);
        const seg = result.segment;
        setLastResult({
          success: true,
          message: `${targetId} now ${seg.status} (risk ${seg.riskScore})`,
        });
      }
      if (onActionComplete) onActionComplete(actionName, targetId);
    } catch (err) {
      setLastResult({
        success: false,
        message: err?.response?.data?.error || 'Action failed',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunScenario = async () => {
    setLoadingAction('scenario');
    setLastResult(null);
    try {
      const result = await triggerScenario(scenario);
      setLastResult({ success: true, message: result.message || 'Scenario triggered' });
      if (onActionComplete) {
        if (scenario === 'clear_all') {
          onActionComplete('resetAll');
        } else {
          onActionComplete('scenario', scenario === 'critical_degrade' ? 'SEG-042' : null);
        }
      }
    } catch (err) {
      setLastResult({
        success: false,
        message: err?.response?.data?.error || 'Failed to trigger scenario',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const busy = loadingAction !== null;

  return (
    <section className="rounded-lg border border-dashed border-line bg-surface-1/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer"
      >
        <h2 className="panel-title">Drill mode</h2>
        <span className="chip bg-surface-3 text-ink-3">synthetic</span>
        <span className="ml-auto font-mono text-[10px] text-ink-3">{open ? 'hide' : 'show'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-ink-3">
            Inject synthetic faults to test operator response and agent behavior.
            Nothing here reflects real track state.
          </p>

          {/* Target segment */}
          <div>
            <label htmlFor="drill-segment-select" className="block text-[11px] text-ink-2 mb-1">
              Target segment
            </label>
            <select
              id="drill-segment-select"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 font-mono text-xs
                text-ink focus:outline-none focus:border-accent/60 appearance-none cursor-pointer"
              style={{
                backgroundImage: SELECT_ARROW,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              {segmentOptions.map((id) => (
                <option key={id} value={id} className="bg-surface-3 text-ink">{id}</option>
              ))}
            </select>
          </div>

          {/* Fault injections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleAction('spike', 'spike', DEFAULT_SPIKE_VALUE)}
              disabled={busy}
              className="btn-ghost px-3 py-2"
            >
              {loadingAction === 'spike' ? 'Injecting' : `Vibration ${DEFAULT_SPIKE_VALUE}`}
            </button>
            <button
              onClick={() => handleAction('crack', 'crack')}
              disabled={busy}
              className="btn-ghost px-3 py-2"
            >
              {loadingAction === 'crack' ? 'Injecting' : 'Crack +1'}
            </button>
            <button
              onClick={() => handleAction('reset', 'reset')}
              disabled={busy}
              className="btn-ghost px-3 py-2"
            >
              {loadingAction === 'reset' ? 'Resetting' : 'Reset segment'}
            </button>
          </div>

          {/* Scenarios */}
          <div className="flex gap-2 pt-1 border-t border-line">
            <select
              id="drill-scenario-select"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              aria-label="Drill scenario"
              className="flex-1 mt-2 bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs
                text-ink focus:outline-none focus:border-accent/60 appearance-none cursor-pointer"
              style={{
                backgroundImage: SELECT_ARROW,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="critical_degrade" className="bg-surface-3 text-ink">Degrade SEG-042 to critical</option>
              <option value="mass_degrade" className="bg-surface-3 text-ink">Mass track degradation</option>
              <option value="clear_all" className="bg-surface-3 text-ink">Reset all to healthy</option>
            </select>
            <button
              onClick={handleRunScenario}
              disabled={busy}
              className="btn-accent mt-2 px-4 py-2"
            >
              {loadingAction === 'scenario' ? 'Running' : 'Run'}
            </button>
          </div>

          {/* Reset everything */}
          <button
            onClick={() => handleAction('resetAll')}
            disabled={busy}
            className="btn-crit w-full px-3 py-2"
          >
            {loadingAction === 'resetAll' ? 'Resetting all segments' : 'Reset all 100 segments'}
          </button>

          {/* Result feedback */}
          {lastResult && (
            <p
              className={`px-3 py-2 rounded-lg border text-[11px] ${
                lastResult.success
                  ? 'bg-surface-2 border-line text-ink-2'
                  : 'bg-crit/10 border-crit/25 text-crit'
              }`}
            >
              {lastResult.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
