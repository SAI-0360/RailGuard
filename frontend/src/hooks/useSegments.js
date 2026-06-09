import { useState, useEffect } from "react";
import { getSegments } from "../services/api";

const POLLING_INTERVAL_MS = 5000;

function useSegments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSegments() {
    try {
      const data = await getSegments();
      setSegments(data.segments);
      setError(null);
    } catch (err) {
      const message =
        err?.response?.data?.error || err.message || "Failed to fetch segments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSegments();

    const intervalId = setInterval(fetchSegments, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return { segments, loading, error, refetch: fetchSegments };
}

export default useSegments;
