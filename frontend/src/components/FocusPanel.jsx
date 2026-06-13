import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { analyseSegment, createManualWorkOrder } from '../services/api';
import VibrationChart from './VibrationChart';
import DefectList from './DefectList';
import AiExplanation from './AiExplanation';
import ExtractionForm from './ExtractionForm';
import VerificationForm from './VerificationForm';
import TrendBadge from './TrendBadge';
import {
  WEIGHT_VIBRATION, WEIGHT_CRACK, WEIGHT_INCIDENT, WEIGHT_AGE, WEIGHT_CURVATURE,
  THRESHOLD_HEALTHY_MAX, THRESHOLD_WARNING_MAX,
} from '../utils/constants';
import { getStatusColors } from '../utils/statusColors';

/**
 * FocusPanel — the incident workspace for one selected segment.
 * Vital strip, linear risk meter with threshold ticks, telemetry chart,
 * honest risk decomposition (real model weights), AI analysis, defects, actions.
 */
export default function FocusPanel({ segment, loading, canAct = true, canVerify = false, onClose, onDefectExtracted, onRepairVerified, verifyPrefill = null, escalatedWorkOrder = null, onInstruct, onEscalateDen, workOrders = [], userRole = '', onProactiveDispatched }) {
  const reduceMotion = useReducedMotion();
  const [aiExplanation, setAiExplanation] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisNonce, setAnalysisNonce] = useState(0);
  const [tab, setTab] = useState('overview');
  // Cache AI analysis per segmentId so the 5s segment poll and re-renders don't
  // re-call Gemini. Invalidated (via analysisNonce) when a defect is extracted.
  const analysisCache = useRef({});

  const segmentId = segment?.segmentId;
  const status = segment?.status;

  // Proactive dispatch eligibility — must be above early returns (rules of hooks).
  // (A) user is SSE, (B) segment status is 'warning', (C) no active pending work orders
  const hasActiveWorkOrder = useMemo(
    () => workOrders.some((wo) => wo.segmentId === segmentId && wo.status === 'pending'),
    [workOrders, segmentId]
  );
  const showProactiveDispatch = (userRole === 'sse' || userRole === 'admin') && status === 'warning' && !hasActiveWorkOrder;

  // Auto-analyse a degraded segment when it enters focus. Healthy track needs
  // no narration; cached segments display instantly without another API call.
  useEffect(() => {
    if (!segmentId) {
      setAiExplanation(null);
      return undefined;
    }
    if (analysisCache.current[segmentId] !== undefined) {
      setAiExplanation(analysisCache.current[segmentId]);
      setAnalysisLoading(false);
      return undefined;
    }
    if (status === 'healthy') {
      setAiExplanation(null);
      return undefined;
    }

    let cancelled = false;
    setAnalysisLoading(true);
    setAiExplanation(null);
    analyseSegment(segmentId)
      .then((data) => {
        if (cancelled) return;
        const text = data?.explanation || null;
        analysisCache.current[segmentId] = text;
        setAiExplanation(text);
      })
      .catch(() => {
        if (!cancelled) setAiExplanation(null);
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [segmentId, status, analysisNonce]);

  // A new segment in focus always opens on Overview
  useEffect(() => {
    setTab('overview');
  }, [segment?.segmentId]);

  if (!segment) {
    return (
      <section className="panel p-6 min-h-[260px] flex flex-col items-center justify-center text-center">
        <p className="text-sm text-ink-2">No segment in focus.</p>
        <p className="text-xs text-ink-3 mt-1 max-w-[28ch]">
          Select an incident from the queue or a cell on the track schematic.
        </p>
      </section>
    );
  }

  if (loading && !segment.vibrationHistory) {
    return (
      <section className="panel p-4 space-y-3">
        <div className="h-6 w-32 rounded bg-surface-2 animate-pulse" />
        <div className="h-24 rounded-lg bg-surface-2 animate-pulse" />
        <div className="h-40 rounded-lg bg-surface-2 animate-pulse" />
      </section>
    );
  }

  // segmentId + status are declared above (drive the analysis effect)
  const {
    riskScore = 0, vibrationLevel, crackCount = 0,
    incidentCount = 0, daysSinceInspection = 0, activeDefects = [],
    vibrationHistory = [], prediction = null, repairLog = [],
    radiusOfCurvature,
  } = segment;


  const handleExtracted = (response) => {
    // A new defect changes the risk picture — drop the cached analysis and
    // force a re-analysis so the summary reflects the freshly logged defect.
    if (segmentId) delete analysisCache.current[segmentId];
    setAnalysisNonce((n) => n + 1);
    if (onDefectExtracted) onDefectExtracted(response);
  };

  const chipClass =
    status === 'critical' ? 'chip-crit' : status === 'warning' ? 'chip-warn' : 'chip-ok';

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={segmentId}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="panel"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <h2 className="font-mono text-base font-semibold text-ink">{segmentId}</h2>
          <span className={chipClass}>{status}</span>
          <button
            onClick={onClose}
            aria-label="Close focus panel"
            className="ml-auto p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2
              transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Escalation: a JE on this segment is blocked and needs the SSE's
              guidance. Surfaced first — it's the most time-sensitive thing here. */}
          {canVerify && escalatedWorkOrder && (
            <EscalationResponse
              workOrder={escalatedWorkOrder}
              onInstruct={onInstruct}
              onEscalateDen={onEscalateDen}
            />
          )}

          {/* Vital strip: the "is this getting worse right now" answer */}
          <div>
            <div className="flex items-baseline gap-3">
              <span className={`font-mono text-3xl font-semibold ${getStatusColors(status).text}`}>
                {riskScore.toFixed(1)}
              </span>
              <span className="font-mono text-[11px] uppercase text-ink-3">risk score</span>
              {prediction && <TrendBadge prediction={prediction} />}
            </div>
            <RiskMeter score={riskScore} status={status} />
          </div>

          {/* Live readouts — hairline-separated instruments, not stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-line border border-line rounded-lg overflow-hidden">
            <Readout
              label="Vibration"
              value={vibrationLevel !== undefined ? vibrationLevel.toFixed(1) : '0.0'}
              unit="mm/s"
              alert={vibrationLevel >= 7.1 ? 'crit' : vibrationLevel >= 4.1 ? 'warn' : null}
            />
            <Readout label="Cracks" value={String(crackCount)} alert={crackCount > 0 ? 'warn' : null} />
            <Readout label="Incidents" value={String(incidentCount)} alert={incidentCount > 0 ? 'crit' : null} />
            <Readout
              label="Inspected"
              value={`${daysSinceInspection}d`}
              unit="ago"
              alert={daysSinceInspection > 15 ? 'warn' : null}
            />
          </div>

          {/* View tabs: live workspace vs the segment's chronological record */}
          <div role="tablist" aria-label="Segment view" className="flex items-center gap-1 border-b border-line">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'history', label: 'History' },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer
                  ${tab === t.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
              >
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="focus-tab-underline"
                    className="absolute inset-x-1 -bottom-px h-[2px] bg-accent rounded-full"
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <>
              {/* Telemetry chart */}
              <div>
                <h3 className="panel-title mb-2">Vibration, recent readings</h3>
                <VibrationChart vibrationHistory={vibrationHistory} status={status} />
              </div>

              {/* Risk decomposition — why the score is what it is, from the real model weights */}
              <RiskFactors
                vibrationLevel={vibrationLevel}
                crackCount={crackCount}
                incidentCount={incidentCount}
                daysSinceInspection={daysSinceInspection}
                radiusOfCurvature={radiusOfCurvature}
              />

              <AiExplanation explanation={aiExplanation} loading={analysisLoading} />

              <DefectList defects={activeDefects} segmentId={segmentId} />

              {/* Proactive Dispatch — SSE manually assigns a crew to a warning
                  segment before autonomous escalation kicks in. Only rendered when
                  all three conditions are met (SSE + warning + no active WO). */}
              {showProactiveDispatch && (
                <ProactiveDispatch
                  segmentId={segmentId}
                  onDispatched={onProactiveDispatched}
                />
              )}

              {/* Action rail (backend enforces): inspection logging is senior
                  staff (DEN/SSE); repair verification is the SSE's sign-off. */}
              {canAct ? (
                <div className="space-y-4 border-t border-line pt-4">
                  <ExtractionForm segmentId={segmentId} onExtracted={handleExtracted} />
                  {canVerify ? (
                    <VerificationForm
                      segmentId={segmentId}
                      defects={activeDefects}
                      onVerified={onRepairVerified}
                      prefill={verifyPrefill && verifyPrefill.segmentId === segmentId ? verifyPrefill : null}
                    />
                  ) : (
                    <p className="text-[11px] text-ink-3">
                      Repair verification is restricted to the SSE (Senior Section Engineer).
                    </p>
                  )}
                </div>
              ) : (
                <p className="border-t border-line pt-4 text-[11px] text-ink-3">
                  Inspection logging and repair verification require senior (DEN/SSE) role.
                  Report findings to your section engineer.
                </p>
              )}
            </>
          ) : (
            <SegmentHistory
              vibrationHistory={vibrationHistory}
              activeDefects={activeDefects}
              repairLog={repairLog}
              crackCount={crackCount}
            />
          )}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

/**
 * EscalationResponse — the SSE's seat in the three-tier hierarchy. Shows the
 * JE's note and lets the SSE either (a) instruct the JE directly, or (b) escalate
 * up to the DEN when they can't resolve it themselves. When the DEN replies, the
 * directive appears here and pre-fills the JE instruction for one-tap relay.
 * Deterministic, no AI.
 */
function EscalationResponse({ workOrder, onInstruct, onEscalateDen }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Tier 2 — escalate up to the DEN
  const [showDen, setShowDen] = useState(false);
  const [denNote, setDenNote] = useState('');
  const [denBusy, setDenBusy] = useState(false);
  const [denError, setDenError] = useState(null);

  const denStatus = workOrder.denEscalationStatus || null;

  // When the DEN's directive lands, pre-fill the JE instruction so the SSE can
  // relay it in one tap — but never clobber what the SSE has already typed.
  useEffect(() => {
    if (denStatus === 'resolved' && workOrder.denInstruction && !text) {
      setText(workOrder.denInstruction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denStatus, workOrder.denInstruction]);

  const submit = async () => {
    const instruction = text.trim();
    if (!instruction || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onInstruct(workOrder.workOrderId, instruction);
      setText('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not send instruction');
    } finally {
      setBusy(false);
    }
  };

  const submitDen = async () => {
    const note = denNote.trim();
    if (!note || denBusy || !onEscalateDen) return;
    setDenBusy(true);
    setDenError(null);
    try {
      await onEscalateDen(workOrder.workOrderId, note);
      setDenNote('');
      setShowDen(false);
    } catch (err) {
      setDenError(err?.response?.data?.error || 'Could not escalate to DEN');
    } finally {
      setDenBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-warn/40 bg-warn/[0.07] px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="chip bg-warn/15 text-warn border border-warn/40">⚠️ AWAITING GUIDANCE</span>
        <span className="font-mono text-[11px] text-ink-3 truncate">
          {workOrder.workOrderId} · {workOrder.assignedWorker}
        </span>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">JE note</p>
        <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap rounded-lg border border-line bg-surface-2 px-3 py-2">
          {workOrder.jeNote || '(no note provided)'}
        </p>
      </div>

      {/* DEN directive received — relay it to the JE */}
      {denStatus === 'resolved' && workOrder.denInstruction && (
        <div className="rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-accent mb-1">
            DEN Directive — relay to the JE
          </p>
          <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
            {workOrder.denInstruction}
          </p>
        </div>
      )}

      {/* Escalated up — waiting on the Division Engineer */}
      {denStatus === 'requested' && (
        <div className="rounded-lg border border-warn/30 bg-warn/[0.08] px-3 py-2.5 text-center">
          <p className="text-sm font-medium text-warn">⏳ Awaiting DEN directive…</p>
          {workOrder.sseNote && (
            <p className="text-[11px] text-ink-3 mt-1">Your note to DEN: “{workOrder.sseNote}”</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="sse-instruction" className="block text-[11px] text-ink-2 mb-1">
          Send Instruction to JE
        </label>
        <textarea
          id="sse-instruction"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Diagnose and direct: e.g. That's a thermite weld failure — apply a joggled fishplate as a temporary measure, restrict to 30 km/h, and schedule a re-weld."
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
            placeholder-ink-3 resize-none focus:outline-none focus:border-warn/60 transition-colors duration-150"
        />
      </div>

      {error && (
        <p className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={busy || !text.trim()}
        className="btn-accent w-full px-4 py-2"
      >
        {busy ? 'Sending…' : 'Send instruction →'}
      </button>

      {/* Tier 2 — escalate up to the DEN, only if not already escalated */}
      {onEscalateDen && denStatus === null && (
        showDen ? (
          <div className="space-y-2 border-t border-warn/20 pt-3">
            <label htmlFor="sse-den-note" className="block text-[11px] text-ink-2">
              Escalate to DEN — what do you need a call on?
            </label>
            <textarea
              id="sse-den-note"
              value={denNote}
              onChange={(e) => setDenNote(e.target.value)}
              rows={2}
              autoFocus
              placeholder="e.g. Recurring weld failures across this corridor — need a division-level call on a speed cap and a re-weld programme."
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
                placeholder-ink-3 resize-none focus:outline-none focus:border-warn/60 transition-colors duration-150"
            />
            {denError && (
              <p className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">{denError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={submitDen}
                disabled={denBusy || !denNote.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-warn/30
                  bg-warn/10 text-warn hover:bg-warn/15 disabled:opacity-50 transition-colors
                  duration-150 cursor-pointer"
              >
                {denBusy ? 'Escalating…' : 'Send to DEN →'}
              </button>
              <button
                onClick={() => setShowDen(false)}
                disabled={denBusy}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-line
                  bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors
                  duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDen(true)}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-warn/30
              bg-warn/5 text-warn hover:bg-warn/10 transition-colors duration-150 cursor-pointer"
          >
            Escalate to DEN →
          </button>
        )
      )}
    </div>
  );
}

/** Linear risk meter with structural threshold ticks at 30 (warn) and 60 (crit). */
function RiskMeter({ score, status }) {
  const clamped = Math.min(100, Math.max(0, score));
  const fill = getStatusColors(status).bg;

  return (
    <div className="mt-2">
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-visible">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fill} transition-[width] duration-300 ease-swift`}
          style={{ width: `${clamped}%` }}
        />
        {/* Threshold ticks: how far past safe, not just an abstract bar */}
        <span
          className="absolute -top-0.5 h-2.5 w-px bg-ink-3"
          style={{ left: `${THRESHOLD_HEALTHY_MAX}%` }}
          title={`Warning threshold (${THRESHOLD_HEALTHY_MAX})`}
        />
        <span
          className="absolute -top-0.5 h-2.5 w-px bg-ink-3"
          style={{ left: `${THRESHOLD_WARNING_MAX}%` }}
          title={`Critical threshold (${THRESHOLD_WARNING_MAX})`}
        />
      </div>
      <div className="relative mt-1 h-3 font-mono text-[9px] text-ink-3">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${THRESHOLD_HEALTHY_MAX}%` }}>
          {THRESHOLD_HEALTHY_MAX.toFixed(0)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${THRESHOLD_WARNING_MAX}%` }}>
          {THRESHOLD_WARNING_MAX.toFixed(0)}
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}

const HISTORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'readings', label: 'Readings' },
  { id: 'cracks', label: 'Cracks' },
  { id: 'defects', label: 'Defects' },
  { id: 'repairs', label: 'Repairs' },
];

function historyTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} ${d.toLocaleTimeString(undefined, { hour12: false })}`;
}

/**
 * SegmentHistory — the segment's chronological record, newest first:
 * telemetry readings (vibration + crack flags), defects as they were logged,
 * and verified repairs attributed to the worker who closed the work order.
 * Monospaced rows, hairline dividers, severity tints only on genuine events.
 */
function SegmentHistory({ vibrationHistory = [], activeDefects = [], repairLog = [], crackCount = 0 }) {
  const [filter, setFilter] = useState('all');

  const events = [
    ...vibrationHistory.map((h) => ({
      t: h.timestamp,
      type: h.crackDetected ? 'cracks' : 'readings',
      vib: h.vibrationLevel,
      crackDetected: h.crackDetected,
    })),
    ...activeDefects.map((d) => ({
      t: d.reportedAt,
      type: 'defects',
      defectType: d.defectType || 'defect',
      severity: d.severity || 'medium',
      defectId: d.defectId,
    })),
    ...repairLog.map((r) => ({
      t: r.repairedAt,
      type: 'repairs',
      defectType: r.defectType,
      repairedBy: r.repairedBy,
      workOrderId: r.workOrderId,
    })),
  ].sort((a, b) => new Date(b.t) - new Date(a.t));

  const visible = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'readings') return e.type === 'readings' || e.type === 'cracks';
    return e.type === filter;
  });

  const counts = {
    cracks: events.filter((e) => e.type === 'cracks').length,
    defects: activeDefects.length,
    repairs: repairLog.length,
  };

  return (
    <div>
      {/* Context strip: what the record contains right now */}
      <p className="font-mono text-[10px] text-ink-3 mb-2">
        {vibrationHistory.length} readings · {crackCount} open cracks · {counts.defects} active defects · {counts.repairs} repairs
      </p>

      {/* Filter rail */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3" role="group" aria-label="History filter">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wide border
              transition-colors duration-150 cursor-pointer
              ${filter === f.id
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'bg-surface-2 border-line text-ink-3 hover:text-ink-2'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[11px] text-ink-3 py-6 text-center">
          No {filter === 'all' ? 'events' : filter} recorded for this segment yet.
        </p>
      ) : (
        <div className="divide-y divide-line border border-line rounded-lg overflow-hidden max-h-[340px] overflow-y-auto">
          {visible.map((e, i) => (
            <HistoryRow key={`${e.type}-${e.t}-${i}`} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ event }) {
  return (
    <div className="flex items-baseline gap-2.5 px-3 py-1.5 font-mono text-[11px] bg-surface-1">
      <span className="text-ink-3 whitespace-nowrap shrink-0">{historyTime(event.t)}</span>

      {event.type === 'readings' && (
        <span className="text-ink-2">{event.vib?.toFixed(2)} <span className="text-ink-3">mm/s</span></span>
      )}

      {event.type === 'cracks' && (
        <>
          <span className="text-ink-2">{event.vib?.toFixed(2)} <span className="text-ink-3">mm/s</span></span>
          <span className="chip-warn ml-auto">crack detected</span>
        </>
      )}

      {event.type === 'defects' && (
        <>
          <span className="text-ink">{event.defectType}</span>
          <span
            className={`ml-auto ${
              event.severity === 'critical' || event.severity === 'high' ? 'chip-crit' : 'chip-warn'
            }`}
          >
            {event.severity}
          </span>
        </>
      )}

      {event.type === 'repairs' && (
        <>
          <span className="text-ink">
            <span className="text-accent">{event.repairedBy}</span> fixed {event.defectType}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {event.workOrderId && <span className="text-ink-3">{event.workOrderId}</span>}
            <span className="chip-ok">repaired</span>
          </span>
        </>
      )}
    </div>
  );
}

/** One live instrument readout. Severity color only when the factor is in alarm. */
function Readout({ label, value, unit, alert }) {
  const valueColor = alert === 'crit' ? 'text-crit' : alert === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="px-3 py-2.5 bg-surface-1">
      <p className="text-[10px] text-ink-3 mb-0.5">{label}</p>
      <p className={`font-mono text-sm font-medium ${valueColor}`}>
        {value}
        {unit && <span className="text-[10px] text-ink-3 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * RiskFactors — decomposes the score using the documented model weights
 * (vibration 35%, cracks 25%, incidents 15%, age 10%, curvature 15%).
 * Bars show each factor's normalized stress level; weights are the real constants.
 */
function RiskFactors({ vibrationLevel = 0, crackCount = 0, incidentCount = 0, daysSinceInspection = 0, radiusOfCurvature }) {
  const factors = [
    {
      label: 'Vibration',
      reading: `${vibrationLevel.toFixed(1)} mm/s`,
      weight: WEIGHT_VIBRATION,
      norm: Math.min(vibrationLevel / 10, 1),
      alarm: vibrationLevel >= 7.1 ? 'crit' : vibrationLevel >= 4.1 ? 'warn' : null,
    },
    {
      label: 'Cracks',
      reading: String(crackCount),
      weight: WEIGHT_CRACK,
      norm: Math.min(crackCount / 4, 1),
      alarm: crackCount >= 3 ? 'crit' : crackCount > 0 ? 'warn' : null,
    },
    {
      label: 'Incidents',
      reading: String(incidentCount),
      weight: WEIGHT_INCIDENT,
      norm: Math.min(incidentCount / 4, 1),
      alarm: incidentCount > 0 ? 'warn' : null,
    },
    {
      label: 'Inspection age',
      reading: `${daysSinceInspection}d`,
      weight: WEIGHT_AGE,
      norm: Math.min(daysSinceInspection / 30, 1),
      alarm: daysSinceInspection > 15 ? 'warn' : null,
    },
  ];

  // Curvature appears once route geometry has been computed for this segment.
  // Penalty scales inversely with circumcircle radius; 0 = straight = no risk.
  if (radiusOfCurvature !== undefined) {
    const curved = radiusOfCurvature > 0;
    factors.push({
      label: 'Curvature',
      reading: curved ? `R ${Math.round(radiusOfCurvature)}m` : 'straight',
      weight: WEIGHT_CURVATURE,
      norm: curved ? Math.min(300 / radiusOfCurvature, 1) : 0,
      alarm: curved && radiusOfCurvature <= 400 ? 'crit' : curved && radiusOfCurvature <= 1000 ? 'warn' : null,
    });
  }

  return (
    <div>
      <h3 className="panel-title mb-2">Risk model factors</h3>
      <div className="space-y-2">
        {factors.map((f) => {
          const barColor =
            f.alarm === 'crit' ? 'bg-crit' : f.alarm === 'warn' ? 'bg-warn' : 'bg-ink-3';
          return (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-ink-2">{f.label}</span>
              <span className="w-16 shrink-0 font-mono text-[11px] text-ink text-right">
                {f.reading}
              </span>
              <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-[width] duration-300 ease-swift`}
                  style={{ width: `${f.norm * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 font-mono text-[10px] text-ink-3 text-right">
                w {f.weight.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ProactiveDispatch — the SSE's preemptive crew-assignment form for warning
 * segments. Lets the SSE act before the autonomous monitor escalates. Dark
 * glassmorphic card with amber/orange accents to signal warning mitigation.
 *
 * Props:
 *   segmentId          — the segment to dispatch against
 *   onDispatched       — callback after successful dispatch (triggers parent refresh)
 */
const FIELD_CREWS = [
  { value: 'je1', label: 'JE Track Worker 1 (JE1)' },
  { value: 'je2', label: 'JE Track Worker 2 (JE2)' },
  { value: 'je3', label: 'JE Track Worker 3 (JE3)' },
];

function ProactiveDispatch({ segmentId, onDispatched }) {
  const [assignedTo, setAssignedTo] = useState(FIELD_CREWS[0].value);
  const [directives, setDirectives] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when the segment changes
  useEffect(() => {
    setDirectives('');
    setErrorMessage(null);
    setIsSuccess(false);
    setAssignedTo(FIELD_CREWS[0].value);
  }, [segmentId]);

  const handleSubmit = async () => {
    const instruction = directives.trim();
    if (!instruction || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setIsSuccess(false);

    try {
      await createManualWorkOrder(segmentId, instruction, assignedTo);
      setIsSuccess(true);
      setDirectives('');
      if (onDispatched) onDispatched();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 409) {
        setErrorMessage(msg || 'A work order already exists for this segment.');
      } else {
        setErrorMessage(msg || 'Failed to create work order. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/[0.07] px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm">✓</span>
          <span className="text-sm font-medium text-accent">Crew dispatched</span>
        </div>
        <p className="text-[11px] text-ink-3">
          Work order created for {segmentId}. The assigned JE will see it in their field queue.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warn/30 bg-surface-2/40 backdrop-blur-sm px-4 py-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-warn text-sm">⚡</span>
        <h4 className="font-mono text-[11px] uppercase tracking-wide font-medium text-warn">
          Proactive Dispatch
        </h4>
        <span className="ml-auto font-mono text-[10px] text-ink-3">{segmentId}</span>
      </div>

      {/* Field Crew select */}
      <div>
        <label htmlFor="proactive-crew" className="block text-[11px] text-ink-2 mb-1">
          Assign Field Crew
        </label>
        <select
          id="proactive-crew"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          disabled={isSubmitting}
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink
            focus:outline-none focus:border-warn/60 transition-colors duration-150
            appearance-none cursor-pointer"
        >
          {FIELD_CREWS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* SSE Directives textarea */}
      <div>
        <label htmlFor="proactive-directives" className="block text-[11px] text-ink-2 mb-1">
          SSE Directives
        </label>
        <textarea
          id="proactive-directives"
          value={directives}
          onChange={(e) => setDirectives(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          placeholder="e.g. Vibration trending upward on approach curve — inspect rail joints, check for loosened fastenings, and report back before next block window."
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
            placeholder-ink-3 resize-none focus:outline-none focus:border-warn/60 transition-colors duration-150"
        />
      </div>

      {/* Error display */}
      {errorMessage && (
        <p className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">
          {errorMessage}
        </p>
      )}

      {/* Submit button — amber/orange accent for warning mitigation */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !directives.trim()}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-warn/40
          bg-warn/15 text-warn hover:bg-warn/25 disabled:opacity-40
          transition-colors duration-150 cursor-pointer"
      >
        {isSubmitting ? 'Dispatching…' : 'Dispatch crew →'}
      </button>
    </div>
  );
}
