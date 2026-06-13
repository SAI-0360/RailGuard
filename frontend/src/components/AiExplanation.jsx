import React from 'react';

/**
 * AiExplanation — the agent's risk reasoning in plain language.
 * Attribution via a quiet mono tag; trust comes from the content, not sparkle.
 * While the agent is composing the summary, a spinner holds the space so the
 * SSE knows analysis is in flight rather than absent.
 */
export default function AiExplanation({ explanation, loading = false }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title">AI analysis</h3>
        <span className="font-mono text-[10px] uppercase tracking-wide text-accent">agent</span>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-ink-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
          <Spinner />
          Analysing telemetry…
        </p>
      ) : explanation ? (
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

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
