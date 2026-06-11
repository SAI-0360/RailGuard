import { useState, useEffect, useCallback } from "react";
import { getChiHistory } from "../services/api";

// CHI is a daily index — it moves slowly, so poll lazily.
const POLLING_INTERVAL_MS = 15000;

/**
 * useChiHistory — polls GET /api/chi-history for the 10-day Corridor Health
 * Index trend shown in the DEN HQ command view. Returns { history, ... }.
 */
function useChiHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getChiHistory();
      setHistory(Array.isArray(data) ? data : data.history || []);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch CHI history";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const intervalId = setInterval(fetchHistory, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

export default useChiHistory;
