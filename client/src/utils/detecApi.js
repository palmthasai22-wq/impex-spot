export function getDetecApiUrl() {
  return (import.meta.env.VITE_DETEC_API_URL
    || (import.meta.env.PROD ? 'https://detec-production.up.railway.app' : 'http://localhost:8000'))
    .replace(/\/$/, '');
}
