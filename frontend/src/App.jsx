import React from 'react';
import MetricCards from './components/MetricCards';
import CellGrid from './components/CellGrid';
import TelemetryPanel from './components/TelemetryPanel';
import SimulatorPanel from './components/SimulatorPanel';
import AlertBanner from './components/AlertBanner';
import AgentActivityLog from './components/AgentActivityLog';
import WorkOrderPanel from './components/WorkOrderPanel';
import useSegments from './hooks/useSegments';
import useStats from './hooks/useStats';
import useSelectedSegment from './hooks/useSelectedSegment';
import useActivityLog from './hooks/useActivityLog';
import useWorkOrders from './hooks/useWorkOrders';

export default function App() {
  const { segments, loading: loadingSegments, error: errorSegments, refetch: refetchSegments } = useSegments();
  const { stats, loading: loadingStats, error: errorStats, refetch: refetchStats } = useStats();
  const {
    selectedSegment,
    selectSegment,
    clearSelection,
    loading: loadingSelected,
    error: errorSelected,
    refetch: refetchSelected
  } = useSelectedSegment();
  const { logs } = useActivityLog();
  const { workOrders } = useWorkOrders();

  const handleActionComplete = (actionName, segmentId) => {
    refetchSegments();
    refetchStats();
    if (actionName === 'resetAll') {
      clearSelection();
    } else if (selectedSegment && selectedSegment.segmentId === segmentId) {
      refetchSelected();
    }
  };

  const handleDefectExtracted = () => {
    refetchSegments();
    refetchStats();
    refetchSelected();
  };

  const handleRepairVerified = () => {
    refetchSegments();
    refetchStats();
    refetchSelected();
  };

  const hasErrors = errorSegments || errorStats || errorSelected;
  const errorMessage = errorSegments || errorStats || errorSelected;

  const criticalSegments = segments ? segments.filter(s => s.status === 'critical') : [];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              RailGuard
            </h1>
            <p className="text-sm text-gray-400 font-medium mt-1">
              Autonomous Railway Safety Inspector Cockpit
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
              System Active
            </span>
          </div>
        </header>

        {/* Global Error Banner */}
        {hasErrors && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <span>✗</span>
            <span>Error connecting to RailGuard backend: {errorMessage}</span>
          </div>
        )}

        {/* System-wide Critical Alert Banner */}
        <AlertBanner segments={criticalSegments} />

        {/* Telemetry Stats cards */}
        <MetricCards stats={stats} />

        {/* Dashboard Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          {/* Status grid (70% width on large screens) */}
          <div className="lg:col-span-7 w-full">
            {loadingSegments && segments.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading track grid...</span>
              </div>
            ) : (
              <CellGrid segments={segments} onSelect={selectSegment} />
            )}

            {/* Agent Activity Log — always visible below the grid */}
            <AgentActivityLog logs={logs} />
          </div>

          {/* Right sidebar details panel / simulator (30% width on large screens) */}
          <div className="lg:col-span-3 w-full flex flex-col gap-6 lg:h-[calc(100vh-12rem)]">
            {/* Top Section */}
            <div className="flex-1 overflow-y-auto pr-1 max-h-[600px] lg:max-h-[none]">
              {selectedSegment ? (
                <TelemetryPanel
                  segment={selectedSegment}
                  onClose={clearSelection}
                  onDefectExtracted={handleDefectExtracted}
                  onRepairVerified={handleRepairVerified}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center text-gray-400 min-h-[300px] h-full border-dashed">
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
                  <div>
                    <h4 className="text-white font-bold mb-2">No Segment Selected</h4>
                    <p className="text-sm">
                      Select a track segment from the status grid on the left to view detailed live telemetry and risk parameters.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section */}
            <div className="shrink-0 flex flex-col gap-6">
              <SimulatorPanel onActionComplete={handleActionComplete} />
              <WorkOrderPanel workOrders={workOrders} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
