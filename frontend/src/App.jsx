import React, { useState } from 'react';
import MetricCards from './components/MetricCards';
import CellGrid from './components/CellGrid';

export default function App() {
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  const stats = {
    total: 100,
    healthy: 98,
    warning: 1,
    critical: 1
  };

  const handleSelectSegment = (segmentId) => {
    setSelectedSegmentId(segmentId);
    console.log('Selected segment:', segmentId);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
        {/* Header Section */}
        <header className="text-left border-b border-white/5 pb-4">
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            RailGuard
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Railway Maintenance Intelligence
          </p>
        </header>

        {/* Telemetry Stats row */}
        <MetricCards stats={stats} />

        {/* Dashboard Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          {/* Status grid (70% width on large screens) */}
          <div className="lg:col-span-7 w-full">
            <CellGrid onSelect={handleSelectSegment} />
          </div>

          {/* Right sidebar placeholder (30% width on large screens) */}
          <div className="lg:col-span-3 w-full h-full">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center text-gray-400 min-h-[400px] border-dashed">
              <svg
                className="w-12 h-12 text-gray-500 mb-4 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {selectedSegmentId ? (
                <div>
                  <h4 className="text-white font-bold mb-2">Telemetry Panel</h4>
                  <p className="text-sm">
                    Telemetry data for <span className="text-healthy font-semibold">{selectedSegmentId}</span> will be displayed here in Day 2.
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-white font-bold mb-2">No Segment Selected</h4>
                  <p className="text-sm">
                    Select a track segment from the status grid on the left to view detailed live telemetry and risk parameters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
