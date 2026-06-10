import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const client = axios.create({ baseURL: API_BASE });

export const getSegments = () => client.get("/api/segments").then(r => r.data);

export const getSegment = (id) => client.get(`/api/segments/${id}`).then(r => r.data);

export const getStats = () => client.get("/api/stats").then(r => r.data);

export const simulateAction = (id, action, value) =>
  client.post(`/api/segments/${id}/simulate`, { action, value }).then(r => r.data);

export const extractDefect = (segmentId, reportText) =>
  client.post("/api/extract-defect", { segmentId, reportText }).then(r => r.data);

export const verifyRepair = (segmentId, defectId, repairDescription) =>
  client.post("/api/verify-repair", { segmentId, defectId, repairDescription }).then(r => r.data);

export const resetAll = () => client.post("/api/reset-all").then(r => r.data);

// Monitoring control
export const startMonitoring = () => client.post("/api/monitoring/start").then(r => r.data);
export const stopMonitoring = () => client.post("/api/monitoring/stop").then(r => r.data);
export const getMonitoringStatus = () => client.get("/api/monitoring/status").then(r => r.data);

// Activity Log
export const getActivityLog = (limit = 100) => client.get(`/api/activity-log?limit=${limit}`).then(r => r.data);
export const clearActivityLog = () => client.post("/api/activity-log/clear").then(r => r.data);

// Work Orders
export const getWorkOrders = (status) => {
  const params = status ? `?status=${status}` : "";
  return client.get(`/api/work-orders${params}`).then(r => r.data);
};
