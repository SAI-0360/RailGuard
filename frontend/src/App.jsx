import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SituationBar from './components/SituationBar';
import RouteFilter from './components/RouteFilter';
import LiveMap from './components/LiveMap';
import CriticalBanner from './components/CriticalBanner';
import AttentionQueue from './components/AttentionQueue';
import TrackStrip from './components/TrackStrip';
import FocusPanel from './components/FocusPanel';
import ActivityLedger from './components/ActivityLedger';
import WorkOrderPipeline from './components/WorkOrderPipeline';
import DrillPanel from './components/DrillPanel';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import JEFieldView from './components/JEFieldView';
import DENCommandView from './components/DENCommandView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isAdminRole, isSSERole, isJERole, isDENRole } from './utils/roles';
import useSegments from './hooks/useSegments';
import useStats from './hooks/useStats';
import useSelectedSegment from './hooks/useSelectedSegment';
import useActivityLog from './hooks/useActivityLog';
import useWorkOrders from './hooks/useWorkOrders';
import useMonitoring from './hooks/useMonitoring';

const VIEW_TABS = [
  { id: 'console', label: 'Console' },
  { id: 'map', label: 'Live map' },
];

const swiftOut = [0.23, 1, 0.32, 1];

/**
 * RailGuard Operations Console.
 *
 * Role scoping: admins see the whole network plus drill controls; workers
 * see only their assignedSegments, with severity counts derived from that
 * scope so the Situation Bar never claims more than the operator owns.
 */
function Console() {
  const { user, logout } = useAuth();
  // Route scope: null = default full-corridor view; otherwise the backend
  // JIT-computes segments for { startStation, endStation } from raw track data
  const [routeQuery, setRouteQuery] = useState(null);
  // Primary column view: schematic worklist or geographic live map
  const [view, setView] = useState('console');
  const { segments, routeInfo, loading: loadingSegments, error: errorSegments, refetch: refetchSegments } = useSegments(routeQuery);
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
  // "Verify with AI →" from a work order: focus the segment and seed the
  // verification form with the JE's field report. Tagged with segmentId so the
  // form only pre-fills for the matching segment; key re-seeds on each click.
  const [verifyPrefill, setVerifyPrefill] = useState(null);

  const isAdmin = isAdminRole(user?.role); // den / sse (or legacy admin): full network + drill
  const isSSE = isSSERole(user?.role);     // sse (or legacy admin): may verify repairs

  // Worker scope: only assigned segments exist in their console
  const assignedSet = useMemo(
    () => new Set(user?.assignedSegments || []),
    [user]
  );
  const visibleSegments = useMemo(
    () => (isAdmin ? segments : segments.filter((s) => assignedSet.has(s.segmentId))),
    [segments, isAdmin, assignedSet]
  );
  const visibleWorkOrders = useMemo(
    () => (isAdmin ? workOrders : workOrders.filter((wo) => assignedSet.has(wo.segmentId))),
    [workOrders, isAdmin, assignedSet]
  );

  // Situation Bar truth follows the operator's scope
  const visibleStats = useMemo(() => {
    if (isAdmin) return stats;
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    visibleSegments.forEach((s) => {
      if (s.status === 'critical') critical++;
      else if (s.status === 'warning') warning++;
      else healthy++;
    });
    return { total: visibleSegments.length, healthy, warning, critical };
  }, [isAdmin, stats, visibleSegments]);

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

  const handleVerifyReport = (order) => {
    selectSegment(order.segmentId);
    setVerifyPrefill({
      segmentId: order.segmentId,
      text: order.completionReport || '',
      key: `${order.workOrderId}-${Date.now()}`,
    });
  };

  const errorMessage = errorSegments || errorStats || errorSelected;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SituationBar
        stats={visibleStats}
        monitoring={monitoring}
        user={user}
        onLogout={logout}
      />

      {/* Escalation tier: persistent until acknowledged, motionless once present */}
      <CriticalBanner segments={visibleSegments} onSelect={selectSegment} />

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
          <RouteFilter
            routeQuery={routeQuery}
            routeInfo={routeInfo}
            onRouteChange={setRouteQuery}
          />

          {/* View tabs: schematic console vs geographic map. Same data, two lenses. */}
          <div role="tablist" aria-label="Primary view" className="flex items-center gap-1 border-b border-line -mb-2">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => setView(tab.id)}
                className={`relative px-3 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer
                  ${view === tab.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
              >
                {tab.label}
                {view === tab.id && (
                  <motion.span
                    layoutId="view-tab-underline"
                    className="absolute inset-x-1 -bottom-px h-[2px] bg-accent rounded-full"
                    transition={{ duration: 0.18, ease: swiftOut }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: swiftOut }}
              className="flex flex-col gap-4 min-w-0"
            >
              {view === 'console' ? (
                <>
                  <AttentionQueue
                    segments={visibleSegments}
                    workOrders={visibleWorkOrders}
                    selectedId={selectedSegment?.segmentId}
                    onSelect={selectSegment}
                    loading={loadingSegments}
                  />
                  <TrackStrip
                    segments={visibleSegments}
                    selectedId={selectedSegment?.segmentId}
                    onSelect={selectSegment}
                  />
                </>
              ) : (
                <LiveMap
                  segments={visibleSegments}
                  selectedId={selectedSegment?.segmentId}
                  onSelect={selectSegment}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <ActivityLedger logs={logs} live={monitoring.active} />
        </div>

        {/* Secondary: the focused incident and the maintenance pipeline */}
        <div className="flex flex-col gap-4 min-w-0">
          <FocusPanel
            segment={selectedSegment}
            loading={loadingSelected}
            canAct={isAdmin}
            canVerify={isSSE}
            onClose={clearSelection}
            onDefectExtracted={refreshAll}
            onRepairVerified={refreshAll}
            verifyPrefill={verifyPrefill}
          />
          <WorkOrderPipeline
            workOrders={visibleWorkOrders}
            onSelectSegment={selectSegment}
            onVerifyReport={isSSE ? handleVerifyReport : null}
          />
          {/* Drill mode is an admin instrument; workers never see synthetic controls */}
          {isAdmin && <DrillPanel onActionComplete={handleActionComplete} />}
        </div>
      </main>
    </div>
  );
}

/**
 * RoleHome — routes by role after auth:
 *   den            → read-only HQ command terminal
 *   sse / admin    → full operations console
 *   je / worker    → mobile field view
 * An unrecognized role is signed out; ProtectedRoute then sends it to /login.
 */
function RoleHome() {
  const { user } = useAuth();
  const role = user?.role;
  if (isDENRole(role)) return <DENCommandView />;
  if (isSSERole(role)) return <Console />; // sse + legacy admin
  if (isJERole(role)) return <JEFieldView />; // je + legacy worker
  return <UnknownRoleRedirect />;
}

/**
 * UnknownRoleRedirect — clears the session for an unrecognized role. Once the
 * user is null, the wrapping ProtectedRoute redirects to /login (no manual
 * navigation, so there's no bounce-back loop with LoginPage).
 */
function UnknownRoleRedirect() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <span className="font-mono text-xs text-ink-3">Unrecognized role — returning to sign-in…</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <RoleHome />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
