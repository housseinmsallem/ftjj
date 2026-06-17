import axios from 'axios';
import storage from '../utils/storage';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = storage.get('ftjj_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r=>r, async (error)=>{
  const original = error.config;
  const refreshToken = storage.get('ftjj_refresh');
  if (error.response?.status === 401 && original && !original._retry && refreshToken) {
    original._retry = true;
    const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
    storage.set('ftjj_token', data.token);
    original.headers.Authorization = `Bearer ${data.token}`;
    return api(original);
  }
  return Promise.reject(error);
});
export const publicApi = {
  home: () => api.get('/public/home').then(r=>r.data),
  competitions: () => api.get('/public/competitions').then(r=>r.data),
  rankings: () => api.get('/public/rankings').then(r=>r.data),
  live: () => api.get('/public/live').then(r=>r.data),
  athletes: (q='') => api.get('/public/athletes', { params:{ q } }).then(r=>r.data),
  clubs: () => api.get('/public/clubs').then(r=>r.data),
  coaches: (q='') => api.get('/public/coaches', { params:{ q } }).then(r=>r.data),
  referees: (q='') => api.get('/public/referees', { params:{ q } }).then(r=>r.data),
};
export const profileApi = {
  me: () => api.get('/profile/me').then(r => r.data),
  update: (payload) => api.put('/profile/me', payload).then(r => r.data)
};
export const adminApi = { list: (resource) => api.get(`/${resource}`).then(r=>r.data), create: (resource, payload) => api.post(`/${resource}`, payload).then(r=>r.data), update: (resource, id, payload) => api.put(`/${resource}/${id}`, payload).then(r=>r.data), remove: (resource, id) => api.delete(`/${resource}/${id}`).then(r=>r.data), stats: () => api.get('/dashboard/stats').then(r=>r.data), exportUrl: (resource) => `${api.defaults.baseURL}/exports/${resource}.csv` };
export default api;
