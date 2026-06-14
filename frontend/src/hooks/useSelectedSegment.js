import { useState, useEffect, useCallback, useRef } from "react";
import { getSegment } from "../services/api";

/**
 * Module-level telemetry cache (NOT a component ref). Living outside the hook
 * means it survives React mount/unmount cycles — notably a logout, which tears
 * down the component tree and would wipe any useRef/useState-held cache. The
 * cache therefore persists for the lifetime of the loaded tab/session.
 *
 * Shape: { [segmentId]: { segment, ticketId } }
 *   segment  — the detailed telemetry payload (with prediction + trendSummary)
 *   ticketId — the active work-order id for that segment when cached, or null.
 *              Used as a validity key: if the segment's live ticket no longer
 *              matches, the cached copy is stale and must be re-fetched.
 */
const segmentCache = {};

function clearWholeCache() {
  for (const key of Object.keys(segmentCache)) delete segmentCache[key];
}

/**
 * useSelectedSegment — fetches one segment's detailed telemetry when an operator
 * focuses it, backed by a session-persistent cache so flipping between already-
 * viewed segments is instant and doesn't re-hit the API.
 *
 * Cache lifecycle:
 *   • JIT lookup        — a hit serves instantly; only a miss fires a request.
 *   • Ticket validation — a hit is honored only while the segment's live active
 *                         work-order id still matches the cached one. A new /
 *                         cleared ticket invalidates the entry and forces a pull.
 *   • Force bypass      — refetch() ignores the cache and refreshes the entry.
 *   • Invalidation      — invalidateSegment(id) drops one entry; clearCache()
 *                         wipes everything (e.g. after a global reset).
 *
 * @param {Object<string,string|null>} [ticketBySegment] - live map of
 *   segmentId → active (pending) work-order id, polled by the parent. Read at
 *   fetch time via a ref so polling never forces a re-fetch on its own.
 */
function useSelectedSegment(ticketBySegment = {}) {
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep the latest ticket map in a ref so the fetch logic can read the current
  // ticket id without the selection effect depending on (and re-running every
  // 5s poll of) the work-order list.
  const ticketMapRef = useRef(ticketBySegment);
  ticketMapRef.current = ticketBySegment;

  const ticketIdFor = useCallback(
    (segmentId) => (segmentId && ticketMapRef.current ? ticketMapRef.current[segmentId] ?? null : null),
    []
  );

  const selectSegment = useCallback((segmentId) => {
    setSelectedSegmentId(segmentId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSegmentId(null);
    setSelectedSegment(null);
    setError(null);
  }, []);

  /** Drop one segment's cached telemetry so its next view re-fetches fresh. */
  const invalidateSegment = useCallback((segmentId) => {
    if (segmentId && segmentCache[segmentId]) {
      delete segmentCache[segmentId];
    }
  }, []);

  /** Wipe the entire telemetry cache (e.g. after a system-wide reset). */
  const clearCache = useCallback(() => {
    clearWholeCache();
  }, []);

  /**
   * Fetch a segment's telemetry, honoring the cache unless `force` is set or the
   * cached ticket id no longer matches the segment's live ticket id.
   * @param {string} segmentId - id to fetch; defaults to the current selection
   * @param {{force?: boolean}} [opts] - force=true bypasses + refreshes the cache
   */
  const fetchSegment = useCallback(
    async (segmentId, { force = false } = {}) => {
      const id = segmentId || selectedSegmentId;
      if (!id) return;

      const currentTicketId = ticketIdFor(id);
      const cached = segmentCache[id];

      // JIT cache lookup with ticket validation: serve instantly only when the
      // cached entry exists AND its ticket id still matches the live one.
      if (!force && cached && cached.ticketId === currentTicketId) {
        setSelectedSegment(cached.segment);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getSegment(id);
        // Re-read the ticket id at store time in case it changed during the await.
        segmentCache[id] = { segment: data.segment, ticketId: ticketIdFor(id) };
        setSelectedSegment(data.segment);
      } catch (err) {
        // On failure, ensure no stale copy lingers for this id.
        delete segmentCache[id];
        const message =
          err?.response?.data?.error || err.message || "Failed to fetch segment";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [selectedSegmentId, ticketIdFor]
  );

  // On selection change: cache hit (valid ticket) → instant; otherwise one fetch.
  useEffect(() => {
    if (!selectedSegmentId) return;
    fetchSegment(selectedSegmentId);
  }, [selectedSegmentId, fetchSegment]);

  /** Force a fresh pull of the currently-selected segment (bypasses the cache). */
  const refetch = useCallback(() => {
    if (selectedSegmentId) fetchSegment(selectedSegmentId, { force: true });
  }, [selectedSegmentId, fetchSegment]);

  return {
    selectedSegment,
    selectSegment,
    clearSelection,
    loading,
    error,
    refetch,
    invalidateSegment,
    clearCache,
  };
}

export default useSelectedSegment;
