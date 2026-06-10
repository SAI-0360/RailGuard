import { useState, useEffect, useCallback } from "react";
import { getWorkOrders } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

/**
 * useWorkOrders — Polls GET /api/work-orders every 5s.
 * Returns { workOrders, loading, error }.
 */
function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const data = await getWorkOrders();
      // API may return { workOrders: [...] } or array directly
      setWorkOrders(Array.isArray(data) ? data : data.workOrders || []);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch work orders";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();

    const intervalId = setInterval(fetchWorkOrders, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchWorkOrders]);

  return { workOrders, loading, error, refetch: fetchWorkOrders };
}

export default useWorkOrders;
