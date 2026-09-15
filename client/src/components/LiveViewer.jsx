import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import './cctv.css';

export default function LiveViewer({ camera, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let hls;
    const video = videoRef.current;
    const controller = new AbortController();
    setError(''); setPlaying(false); setLoading(true);
    const load = async () => {
      try {
        const { data } = await api.get(`/streams/${camera.id}`, { signal: controller.signal });
        if (cancelled) return;
        const streamPath = data.public_stream_url;
        if (streamPath !== `/streams/${camera.id}/index.m3u8`) throw new Error();
        // Resolve relative to API host for split frontend/backend deployments.
        const backend = new URL(api.defaults.baseURL, window.location.origin);
        const url = new URL(streamPath, backend.origin).href;
        if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
        else {
          const { default: Hls } = await import('hls.js');
          if (cancelled) return;
          if (!Hls.isSupported()) { setError('เบราว์เซอร์นี้ไม่รองรับวิดีโอสด'); setLoading(false); return; }
          hls = new Hls({ maxBufferLength: 6, backBufferLength: 0 });
          hls.on(Hls.Events.ERROR, (_event, info) => {
            if (info.fatal) { hls.destroy(); video.pause(); setError('สตรีมไม่พร้อมใช้งาน ลองอีกครั้ง'); setLoading(false); }
          });
          hls.loadSource(url);
          hls.attachMedia(video);
        }
      } catch {
        if (!cancelled) { setError('กล้องออฟไลน์หรือยังไม่ได้รับอนุญาตให้ออกอากาศ'); setLoading(false); }
      }
    };
    load();
    // Re-check consent while open; edge also checks every playlist and segment.
    const consentTimer = setInterval(async () => {
      try { await api.get(`/streams/${camera.id}`, { signal: controller.signal }); }
      catch { if (!cancelled) { hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load(); setError('การถ่ายทอดสดสิ้นสุดแล้ว'); setLoading(false); } }
    }, 10000);
    return () => { cancelled = true; controller.abort(); clearInterval(consentTimer); hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load(); };
  }, [camera.id, retry]);

  return <section className="cctv-viewer" aria-label="ภาพสดจากกล้อง CCTV">
    <header><strong>ภาพสด · CCTV</strong>{onClose && <button aria-label="ปิดภาพสด" onClick={onClose}>✕</button>}</header>
    <video ref={videoRef} playsInline muted={volume === 0} disablePictureInPicture preload="auto"
      onCanPlay={() => setLoading(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onError={() => { setError('ไม่สามารถเล่นภาพสดได้'); setLoading(false); }} />
    {loading && !error && <p role="status">กำลังเชื่อมต่อภาพสด…</p>}
    {error && <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>ลองอีกครั้ง</button></p>}
    <div className="cctv-controls">
      <button disabled={!!error || loading} onClick={async () => {
        if (playing) videoRef.current.pause();
        else { try { await videoRef.current.play(); } catch { setError('กดลองอีกครั้งเพื่อเล่นภาพสด'); } }
      }}>{playing ? 'หยุดชั่วคราว' : 'เล่นภาพสด'}</button>
      <label>เสียง <input aria-label="ระดับเสียง" type="range" min="0" max="1" step="0.05" value={volume} onChange={event => { const value = Number(event.target.value); setVolume(value); videoRef.current.volume = value; }} /></label>
    </div>
  </section>;
}
