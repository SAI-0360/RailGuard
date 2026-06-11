import React from 'react';

/** Severity chip mapping for defects. */
const SEVERITY_CHIP = {
  low: 'chip bg-surface-3 text-ink-2',
  medium: 'chip-warn',
  high: 'chip-warn',
  critical: 'chip-crit',
};

/**
 * DefectList — active defects as hairline-divided rows, not nested cards.
 */
export default function DefectList({ defects = [], segmentId }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title">Active defects</h3>
        {defects.length > 0 && (
          <span className="font-mono text-[11px] text-crit">{defects.length}</span>
        )}
      </div>

      {defects.length === 0 ? (
        <p className="text-xs text-ink-3 py-1.5">
          No active defects on {segmentId || 'this segment'}.
        </p>
      ) : (
        <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">
          {defects.map((defect, index) => (
            <div key={defect.defectId || index} className="px-3 py-2.5 bg-surface-1">
              <div className="flex items-center gap-2">
                {defect.defectId && (
                  <span className="font-mono text-[10px] text-ink-3">{defect.defectId}</span>
                )}
                <span className={SEVERITY_CHIP[defect.severity] || SEVERITY_CHIP.medium}>
                  {defect.severity || 'unknown'}
                </span>
                <span className="ml-auto text-[11px] text-ink-2">
                  {defect.defectType || 'Unknown type'}
                </span>
              </div>

              {defect.location && (
                <p className="text-[11px] text-ink-3 mt-1">{defect.location}</p>
              )}
              {defect.description && (
                <p className="text-xs text-ink-2 leading-relaxed mt-1">{defect.description}</p>
              )}
              {defect.recommendedAction && (
                <p className="text-[11px] text-warn mt-1.5">
                  Recommended: {defect.recommendedAction}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
