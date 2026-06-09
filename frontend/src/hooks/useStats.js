import { useState, useEffect } from "react";
import { getStats } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

function useStats() {
  const [stats, setStats] = useState({ total: 100, healthy: 0, warning: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchStats() {
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
  }

  useEffect(() => {
    fetchStats();

    const intervalId = setInterval(fetchStats, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return { stats, loading, error };
}

export default useStats;
