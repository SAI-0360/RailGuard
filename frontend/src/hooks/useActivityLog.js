import { useState, useEffect, useCallback } from "react";
import { getActivityLog } from "../services/api";

const POLLING_INTERVAL_MS = 3000;

/**
 * useActivityLog — Polls GET /api/activity-log every 3s.
 * Returns { logs, loading, error }.
 */
function useActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getActivityLog(100);
      // API may return array directly or { logs: [...] }
      setLogs(Array.isArray(data) ? data : data.logs || []);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch activity log";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const intervalId = setInterval(fetchLogs, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

export default useActivityLog;
