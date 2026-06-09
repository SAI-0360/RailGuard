import React from 'react';
import CellItem from './CellItem';

export default function CellGrid({ segments, onSelect }) {
  // Generate 100 default segments if not passed
  const displaySegments = segments && segments.length > 0 ? segments : Array.from({ length: 100 }, (_, i) => {
    const idNum = String(i + 1).padStart(3, '0');
    const segmentId = `SEG-${idNum}`;
    let status = 'healthy';
    let riskScore = 10.5;

    if (segmentId === 'SEG-042') {
      status = 'warning';
      riskScore = 40.32;
    } else if (segmentId === 'SEG-077') {
      status = 'critical';
      riskScore = 70.46;
    }

    return {
      segmentId,
      status,
      riskScore
    };
  });

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-left">
        Segment Status Grid
      </h3>
      <div className="grid grid-cols-10 gap-2">
        {displaySegments.map((segment) => (
          <CellItem
            key={segment.segmentId}
            segment={segment}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
