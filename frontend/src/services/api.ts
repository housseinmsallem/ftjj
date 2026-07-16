import axios, { InternalAxiosRequestConfig } from "axios";
import storage from "../utils/storage";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || "/api",
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get("ftjj_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const refreshToken = storage.get("ftjj_refresh");
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      refreshToken
    ) {
      original._retry = true;
      const response = await axios.post<{ data: { token: string } }>(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );
      storage.set("ftjj_token", response.data.data.token);
      original.headers.Authorization = `Bearer ${response.data.data.token}`;
      return api(original);
    }
    return Promise.reject(error);
  },
);

export const publicApi = {
  home: () => api.get("/public/home").then((r) => r.data),
  competitions: () => api.get("/public/competitions").then((r) => r.data),
  rankings: () => api.get("/public/rankings").then((r) => r.data),
  live: () => api.get("/public/live").then((r) => r.data),
  athletes: (q = "") =>
    api.get("/public/athletes", { params: { q } }).then((r) => r.data),
  clubs: () => api.get("/public/clubs").then((r) => r.data),
  coaches: (q = "") =>
    api.get("/public/coaches", { params: { q } }).then((r) => r.data),
  referees: (q = "") =>
    api.get("/public/referees", { params: { q } }).then((r) => r.data),
};

export const profileApi = {
  me: () => api.get("/profile/me").then((r) => r.data),
  update: (payload: Record<string, unknown>) =>
    api.put("/profile/me", payload).then((r) => r.data),
};

export const adminApi = {
  list: (resource: string) => api.get(`/${resource}`).then((r) => r.data),
  create: (resource: string, payload: Record<string, unknown>) =>
    api.post(`/${resource}`, payload).then((r) => r.data),
  update: (resource: string, id: string, payload: Record<string, unknown>) =>
    api.put(`/${resource}/${id}`, payload).then((r) => r.data),
  remove: (resource: string, id: string) =>
    api.delete(`/${resource}/${id}`).then((r) => r.data),
  stats: () => api.get("/dashboard/stats").then((r) => r.data),
  exportUrl: (resource: string) =>
    `${api.defaults.baseURL}/exports/${resource}.csv`,
};

export const scoringApi = {
  listSessions: (params?: Record<string, unknown>) =>
    api.get("/scoring/sessions", { params }).then((r) => r.data),
  getSession: (id: string) =>
    api.get(`/scoring/sessions/${id}`).then((r) => r.data),
  createSession: (payload: Record<string, unknown>) =>
    api.post("/scoring/sessions", payload).then((r) => r.data),
  startSession: (id: string) =>
    api.patch(`/scoring/sessions/${id}/start`).then((r) => r.data),
  pauseSession: (id: string) =>
    api.patch(`/scoring/sessions/${id}/pause`).then((r) => r.data),
  resumeSession: (id: string) =>
    api.patch(`/scoring/sessions/${id}/resume`).then((r) => r.data),
  doctorTime: (id: string) =>
    api.patch(`/scoring/sessions/${id}/doctor-time`).then((r) => r.data),
  waitingTime: (id: string) =>
    api.patch(`/scoring/sessions/${id}/waiting-time`).then((r) => r.data),
  sendAction: (
    id: string,
    payload: { side: string; type: string; value?: number; reason?: string },
  ) => api.patch(`/scoring/sessions/${id}/action`, payload).then((r) => r.data),
  finishSession: (id: string, payload: Record<string, unknown>) =>
    api.patch(`/scoring/sessions/${id}/finish`, payload).then((r) => r.data),
  validateSession: (id: string) =>
    api.patch(`/scoring/sessions/${id}/validate`).then((r) => r.data),
  undoAction: (id: string) =>
    api.patch(`/scoring/sessions/${id}/undo`).then((r) => r.data),
  getRuleset: (discipline: string) =>
    api.get(`/scoring/rulesets/${discipline}`).then((r) => r.data),
  getPublicSession: (id: string) =>
    api.get(`/scoring/sessions/${id}/public`).then((r) => r.data),
  getPublicSessionByFight: (fightId: string) =>
    api.get(`/scoring/fight/${fightId}/public`).then((r) => r.data),
  listPublicSessions: (params?: Record<string, unknown>) =>
    api.get("/scoring/public/sessions", { params }).then((r) => r.data),
};

export default api;
