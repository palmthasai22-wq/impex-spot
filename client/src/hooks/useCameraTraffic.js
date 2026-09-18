import { useEffect, useState } from 'react';

const normalize = data => {
  const raw = String(data?.status ?? data?.traffic_status ?? data?.density_level ?? data?.level ?? '').toLowerCase();
  const percent = Number(data?.percent ?? data?.jam_index ?? data?.congestion ?? 0);
  const explicitStatus = raw.includes('jam') || raw.includes('ติด') || raw === 'red' ? 'jam'
    : raw.includes('slow') || raw.includes('ชะลอ') || raw === 'yellow' ? 'slow'
      : raw.includes('flow') || raw.includes('คล่อง') || raw === 'green' ? 'flow' : 'unknown';
  // ถ้า API ส่งมาเฉพาะเปอร์เซ็นต์: 0–39 คล่อง, 40–74 ชะลอ, 75–100 ติดขัด
  const status = explicitStatus !== 'unknown' ? explicitStatus
    : Number.isFinite(percent) ? (percent >= 75 ? 'jam' : percent >= 40 ? 'slow' : 'flow') : 'unknown';
  return { ...data, status, jam_index: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0 };
};

// จุดต่อ API กลาง: เปลี่ยนรูปแบบ response ในฟังก์ชันนี้ได้โดยไม่กระทบแผนที่
export async function fetchTrafficStatus(camera, signal) {
  const url = camera.ai_detection_url?.trim();
  if (!url) return null;
  if (url.startsWith('mock:')) {
    const values = [{ status:'flow', jam_index:22 }, { status:'slow', jam_index:64 }, { status:'jam', jam_index:88 }];
    return values[Math.floor(Date.now() / 10000 + String(camera.id).length) % values.length];
  }
  const requestUrl = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://') ? `https://${url.slice(7)}` : url;
  const response = await fetch(requestUrl, { signal, headers: { Accept:'application/json' } });
  if (!response.ok) throw new Error(`Traffic API ${response.status}`);
  return normalize(await response.json());
}

export default function useCameraTraffic(cameras, intervalSeconds = 30) {
  const [statuses, setStatuses] = useState({});
  useEffect(() => {
    const controller = new AbortController(); let timer;
    const poll = async () => {
      const entries = await Promise.all(cameras.filter(c=>c.ai_detection_url).map(async camera => {
        try { return [camera.id, await fetchTrafficStatus(camera, controller.signal)]; }
        catch { return [camera.id, { status:'unknown', jam_index:0 }]; }
      }));
      if (!controller.signal.aborted) { setStatuses(old => ({ ...old, ...Object.fromEntries(entries) })); timer = setTimeout(poll, Math.max(5, intervalSeconds) * 1000); }
    };
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [cameras, intervalSeconds]);
  return statuses;
}
