import { useState, useEffect, useCallback } from "react";
import { getStats } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

function useStats() {
  const [stats, setStats] = useState({ total: 100, healthy: 0, warning: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch stats";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const intervalId = setInterval(fetchStats, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export default useStats;
