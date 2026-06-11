import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
export default function FocusPanel({ segment, loading, canAct = true, canVerify = false, onClose, onDefectExtracted, onRepairVerified, verifyPrefill = null }) {
  const reduceMotion = useReducedMotion();
  const [aiExplanation, setAiExplanation] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (segment) setAiExplanation(segment.riskExplanation || null);
  }, [segment?.segmentId, segment?.riskExplanation]);

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

  const {
    segmentId, status, riskScore = 0, vibrationLevel, crackCount = 0,
    incidentCount = 0, daysSinceInspection = 0, activeDefects = [],
    vibrationHistory = [], prediction = null, repairLog = [],
    radiusOfCurvature,
  } = segment;

  const handleExtracted = (response) => {
    if (response?.explanation) setAiExplanation(response.explanation);
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

              <AiExplanation explanation={aiExplanation} />

              <DefectList defects={activeDefects} segmentId={segmentId} />

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
