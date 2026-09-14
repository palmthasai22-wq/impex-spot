import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const baseURL = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('impex_session_id');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  const token = localStorage.getItem('impex_admin_token');
  if (token && config.url.includes('/admin')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getPins = async (bounds, filters) => {
  const res = await api.get('/pins', { params: { ...bounds, ...filters } });
  return res.data;
};

export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data.urls || [];
};

export const createPin = async (pinData) => {
  const res = await api.post('/pins', pinData);
  return res.data;
};

export const verifyPin = async (pinId) => {
  const res = await api.put(`/pins/${pinId}/verify`);
  return res.data;
};

export const addReview = async (pinId, review) => {
  const res = await api.put(`/pins/${pinId}/review`, review);
  return res.data;
};

export const createEmergency = async (data) => {
  const res = await api.post('/emergency', data);
  return res.data;
};

export const adminLogin = async (credentials) => {
  const res = await api.post('/admin/login', credentials);
  return res.data;
};

export const fetchDispatchedResponders = async () => {
  const res = await api.get('/responder/active');
  return res.data;
};

export default api;
