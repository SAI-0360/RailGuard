import React from 'react';

/**
 * AiExplanation — the agent's risk reasoning in plain language.
 * Attribution via a quiet mono tag; trust comes from the content, not sparkle.
 */
export default function AiExplanation({ explanation }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title">AI analysis</h3>
        <span className="font-mono text-[10px] uppercase tracking-wide text-accent">agent</span>
      </div>

      {explanation ? (
        <p className="text-xs text-ink-2 leading-relaxed rounded-lg border border-line bg-surface-2 px-3 py-2.5">
          {explanation}
        </p>
      ) : (
        <p className="text-xs text-ink-3 py-1">
          Analysis appears here after the agent processes this segment.
        </p>
      )}
    </div>
  );
}
