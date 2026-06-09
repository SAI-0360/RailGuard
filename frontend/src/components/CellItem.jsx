import React from 'react';

export default function CellItem({ segment, onSelect }) {
  const { segmentId, status, riskScore } = segment || {};

  // Extract the segment number (e.g., "042" from "SEG-042" or just get it from the segmentId)
  const segmentNumber = segmentId ? segmentId.replace('SEG-', '') : '00';

  // Determine styling based on status
  let statusClasses = '';
  switch (status) {
    case 'warning':
      statusClasses = 'bg-warning/80 text-white border-warning hover:bg-warning animate-pulse-warning';
      break;
    case 'critical':
      statusClasses = 'bg-critical/80 text-white border-critical hover:bg-critical animate-pulse-critical';
      break;
    case 'healthy':
    default:
      statusClasses = 'bg-healthy/20 text-healthy border-healthy/30 hover:bg-healthy/30 hover:text-white';
      break;
  }

  return (
    <button
      onClick={() => onSelect && onSelect(segmentId)}
      className={`flex flex-col items-center justify-center h-[60px] w-full rounded-lg border text-center transition-all duration-300 ${statusClasses}`}
      title={`Segment ${segmentId}: ${status} (Risk: ${riskScore})`}
    >
      <span className="text-sm font-bold tracking-tight">
        {segmentNumber}
      </span>
      <span className="text-[10px] opacity-80 font-medium">
        {riskScore !== undefined ? riskScore.toFixed(0) : '0'}
      </span>
    </button>
  );
}
