import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

export const TOKEN_STORAGE_KEY = "railguard_token";
export const USER_STORAGE_KEY = "railguard_user";

const client = axios.create({ baseURL: API_BASE });

// Bearer interceptor — reads the token from localStorage on every request,
// so auth works even for requests fired before React context mounts.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;

// Auth
export const login = (email, password) =>
  client.post("/api/auth/login", { email, password }).then(r => r.data);
export const getMe = () => client.get("/api/auth/me").then(r => r.data);

// Route filter params are optional: { startStation, endStation }
export const getSegments = (routeParams) =>
  client.get("/api/segments", { params: routeParams || undefined }).then(r => r.data);

export const getStations = () => client.get("/api/stations").then(r => r.data);

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

// Advance a work order's worker status one step:
// unacknowledged → acknowledged → in_progress → done
export const progressWorkOrder = (workOrderId) =>
  client.post(`/api/work-orders/${workOrderId}/progress`).then(r => r.data);

// Demo Scenarios
export const triggerScenario = (scenario) =>
  client.post("/api/demo/scenario", { scenario }).then(r => r.data);
