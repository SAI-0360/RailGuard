import { useState, useEffect, useCallback } from "react";
import { getSegments } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

/**
 * Polls GET /api/segments every 5s.
 * @param {{startStation: string, endStation: string}|null} routeQuery
 *   Optional route filter — when set, the backend JIT-computes segments for
 *   that route from raw track data. Null = default full-corridor route.
 */
function useSegments(routeQuery = null) {
  const [segments, setSegments] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const startStation = routeQuery?.startStation || null;
  const endStation = routeQuery?.endStation || null;

  const fetchSegments = useCallback(async () => {
    try {
      const params =
        startStation && endStation ? { startStation, endStation } : undefined;
      const data = await getSegments(params);
      setSegments(data.segments);
      setRouteInfo(data.route || null);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch segments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startStation, endStation]);

  useEffect(() => {
    setLoading(true);
    fetchSegments();

    const intervalId = setInterval(fetchSegments, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchSegments]);

  return { segments, routeInfo, loading, error, refetch: fetchSegments };
}

export default useSegments;
