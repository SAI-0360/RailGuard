import { useState, useEffect } from "react";
import { getSegment } from "../services/api";

function useSelectedSegment() {
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function selectSegment(segmentId) {
    setSelectedSegmentId(segmentId);
  }

  function clearSelection() {
    setSelectedSegmentId(null);
    setSelectedSegment(null);
  }

  useEffect(() => {
    if (!selectedSegmentId) return;

    async function fetchSegment() {
      setLoading(true);
      setError(null);
      try {
        const data = await getSegment(selectedSegmentId);
        setSelectedSegment(data.segment);
      } catch (err) {
        const message =
          err?.response?.data?.error || err.message || "Failed to fetch segment";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchSegment();
  }, [selectedSegmentId]);

  return { selectedSegment, selectSegment, clearSelection, loading, error };
}

export default useSelectedSegment;
