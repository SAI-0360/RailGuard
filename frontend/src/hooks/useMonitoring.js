import { useState, useEffect, useCallback } from "react";
import { startMonitoring, stopMonitoring, getMonitoringStatus } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

/**
 * useMonitoring — owns the autonomous-agent monitoring state.
 * Polls GET /api/monitoring/status and exposes start/stop controls.
 */
function useMonitoring() {
  const [active, setActive] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getMonitoringStatus();
      setActive(data.active);
      setCycleCount(data.cycleCount || 0);
    } catch (err) {
      // Backend may not expose this route yet; stay quiet.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLLING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const start = useCallback(async () => {
    try {
      await startMonitoring();
      setActive(true);
      setError(null);
    } catch (err) {
      setError("Failed to start agent");
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await stopMonitoring();
      setActive(false);
      setError(null);
    } catch (err) {
      setError("Failed to stop agent");
    }
  }, []);

  return { active, cycleCount, error, start, stop };
}

export default useMonitoring;
