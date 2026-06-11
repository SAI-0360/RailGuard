import React from 'react';
import SituationBar from './components/SituationBar';
import CriticalBanner from './components/CriticalBanner';
import AttentionQueue from './components/AttentionQueue';
import TrackStrip from './components/TrackStrip';
import FocusPanel from './components/FocusPanel';
import ActivityLedger from './components/ActivityLedger';
import WorkOrderPipeline from './components/WorkOrderPipeline';
import DrillPanel from './components/DrillPanel';
import useSegments from './hooks/useSegments';
import useStats from './hooks/useStats';
import useSelectedSegment from './hooks/useSelectedSegment';
import useActivityLog from './hooks/useActivityLog';
import useWorkOrders from './hooks/useWorkOrders';
import useMonitoring from './hooks/useMonitoring';

/**
 * RailGuard Operations Console.
 *
 * Work-by-exception layout: the Attention Queue (degraded segments, triaged)
 * is the primary surface; the Focus Panel binds to the selected incident;
 * healthy segments collapse to a count, a search, and the track schematic.
 */
export default function App() {
  const { segments, loading: loadingSegments, error: errorSegments, refetch: refetchSegments } = useSegments();
  const { stats, error: errorStats, refetch: refetchStats } = useStats();
  const {
    selectedSegment,
    selectSegment,
    clearSelection,
    loading: loadingSelected,
    error: errorSelected,
    refetch: refetchSelected,
  } = useSelectedSegment();
  const { logs } = useActivityLog();
  const { workOrders } = useWorkOrders();
  const monitoring = useMonitoring();

  const handleActionComplete = (actionName, segmentId) => {
    refetchSegments();
    refetchStats();
    if (actionName === 'resetAll') {
      clearSelection();
    } else if (selectedSegment && selectedSegment.segmentId === segmentId) {
      refetchSelected();
    }
  };

  const refreshAll = () => {
    refetchSegments();
    refetchStats();
    refetchSelected();
  };

  const errorMessage = errorSegments || errorStats || errorSelected;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SituationBar stats={stats} monitoring={monitoring} />

      {/* Escalation tier: persistent until acknowledged, motionless once present */}
      <CriticalBanner segments={segments} onSelect={selectSegment} />

      {/* Connection failure: solid, plain, no decoration */}
      {errorMessage && (
        <div className="bg-crit/10 border-b border-crit/30">
          <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-2 text-xs text-crit">
            Backend connection error: {errorMessage}
          </div>
        </div>
      )}

      <main className="max-w-[1500px] mx-auto px-4 lg:px-6 py-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
        {/* Primary: the worklist, spatial reference, and accountability ledger */}
        <div className="flex flex-col gap-4 min-w-0">
          <AttentionQueue
            segments={segments}
            workOrders={workOrders}
            selectedId={selectedSegment?.segmentId}
            onSelect={selectSegment}
            loading={loadingSegments}
          />
          <TrackStrip
            segments={segments}
            selectedId={selectedSegment?.segmentId}
            onSelect={selectSegment}
          />
          <ActivityLedger logs={logs} live={monitoring.active} />
        </div>

        {/* Secondary: the focused incident and the maintenance pipeline */}
        <div className="flex flex-col gap-4 min-w-0">
          <FocusPanel
            segment={selectedSegment}
            loading={loadingSelected}
            onClose={clearSelection}
            onDefectExtracted={refreshAll}
            onRepairVerified={refreshAll}
          />
          <WorkOrderPipeline workOrders={workOrders} onSelectSegment={selectSegment} />
          <DrillPanel onActionComplete={handleActionComplete} />
        </div>
      </main>
    </div>
  );
}
