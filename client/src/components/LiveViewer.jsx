import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { getDetecApiUrl } from '../utils/detecApi';
import { TRAFFIC_LEVELS, getTrafficLevel } from '../utils/traffic';
import './cctv.css';

// ── ตรวจจับ YouTube URL และดึง video ID ──
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/live/')) return u.pathname.split('/live/')[1].split('?')[0];
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1].split('?')[0];
  } catch { /* invalid URL */ }
  return null;
}

const toggleFullscreen = (e) => {
  const container = e.currentTarget.closest('.cctv-viewer');
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) container.requestFullscreen();
    else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
};

// ── YouTube iframe embed ──
function YouTubeViewer({ videoId, onClose }) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0`;
  return (
    <section className="cctv-viewer" aria-label="ภาพสดจาก YouTube">
      <header>
        <strong>▶️ YouTube Live</strong>
        <div className="flex gap-2">
          <button aria-label="เต็มจอ" onClick={toggleFullscreen}>🔲</button>
          {onClose && <button aria-label="ปิดภาพสด" onClick={onClose}>✕</button>}
        </div>
      </header>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
        <iframe
          src={embedUrl}
          title="YouTube Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
      <div className="cctv-controls" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>ควบคุมผ่านตัวเล่น YouTube โดยตรง</span>
      </div>
    </section>
  );
}

// ── HLS / Relay viewer ──
function HlsViewer({ camera, onClose, externalUrl }) {
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

    const loadHls = async (url) => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else {
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
    };

    const load = async () => {
      try {
        if (externalUrl) { await loadHls(externalUrl); return; }
        const { data } = await api.get(`/streams/${camera.id}`, { signal: controller.signal });
        if (cancelled) return;
        const streamPath = data.public_stream_url;
        if (streamPath !== `/streams/${camera.id}/index.m3u8`) throw new Error();
        const backend = new URL(api.defaults.baseURL, window.location.origin);
        await loadHls(new URL(streamPath, backend.origin).href);
      } catch {
        if (!cancelled) { setError('กล้องออฟไลน์หรือยังไม่ได้รับอนุญาตให้ออกอากาศ'); setLoading(false); }
      }
    };

    load();

    let consentTimer;
    if (!externalUrl) {
      consentTimer = setInterval(async () => {
        try { await api.get(`/streams/${camera.id}`, { signal: controller.signal }); }
        catch { if (!cancelled) { hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load(); setError('การถ่ายทอดสดสิ้นสุดแล้ว'); setLoading(false); } }
      }, 10000);
    }

    return () => {
      cancelled = true; controller.abort();
      if (consentTimer) clearInterval(consentTimer);
      hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load();
    };
  }, [camera.id, externalUrl, retry]);

  return (
    <section className="cctv-viewer" aria-label="ภาพสดจากกล้อง CCTV">
      <header>
        <strong>{externalUrl ? '🔗 สตรีมภายนอก' : '📡 ภาพสด · CCTV'}</strong>
        <div className="flex gap-2">
          <button aria-label="เต็มจอ" onClick={toggleFullscreen}>🔲</button>
          {onClose && <button aria-label="ปิดภาพสด" onClick={onClose}>✕</button>}
        </div>
      </header>
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
        <label>เสียง <input aria-label="ระดับเสียง" type="range" min="0" max="1" step="0.05" value={volume}
          onChange={e => { const v = Number(e.target.value); setVolume(v); videoRef.current.volume = v; }} /></label>
      </div>
    </section>
  );
}

// ── Webpage iframe embed ──
function IframeViewer({ url, onClose }) {
  return (
    <section className="cctv-viewer" aria-label="แหล่งภาพภายนอก">
      <header>
        <strong>🔗 แหล่งภาพภายนอก</strong>
        <div className="flex gap-2">
          <button aria-label="เต็มจอ" onClick={toggleFullscreen}>🔲</button>
          {onClose && <button aria-label="ปิดภาพ" onClick={onClose}>✕</button>}
        </div>
      </header>
      <div style={{ position: 'relative', width: '100%', height: '350px', background: '#000' }}>
        <iframe
          src={url}
          title="แหล่งภาพภายนอก"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
      <div className="cctv-controls" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>เปิดจากเว็บไซต์ภายนอกโดยตรง</span>
      </div>
    </section>
  );
}

function DetecViewer({ camera, onClose }) {
  const [error, setError] = useState('');
  const detec = camera.detec_camera || {};
  const traffic = camera.ai_traffic ? TRAFFIC_LEVELS[getTrafficLevel(camera.ai_traffic)] : null;
  const isViewOnly = !detec.url && detec.embed_url;
  const monitorUrl = detec.public_id ? `${getDetecApiUrl()}/live/${detec.public_id}` : null;
  const source = isViewOnly ? detec.embed_url : monitorUrl || `${getDetecApiUrl()}/api/streams/${camera.detec_camera_id}`;

  return (
    <section className="cctv-viewer" aria-label="ภาพสด CCTV ที่วิเคราะห์ด้วย Detec">
      <header>
        <strong>🤖 CCTV + Detec #{camera.detec_camera_id}</strong>
        <div className="flex items-center gap-2">
          {traffic && <span style={{background:traffic.background,color:traffic.text,borderRadius:999,padding:'3px 8px',fontSize:11}}>{traffic.emoji} {traffic.label}</span>}
          <button aria-label="เต็มจอ" onClick={toggleFullscreen}>🔲</button>
          {onClose && <button aria-label="ปิดภาพสด" onClick={onClose}>✕</button>}
        </div>
      </header>
      <div style={{position:'relative',width:'100%',height:350,background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {(isViewOnly && detec.embed_mode === 'iframe') || monitorUrl ? (
          <iframe src={source} title={`Detec camera ${camera.detec_camera_id}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer"
            style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}} />
        ) : (
          <img src={source} alt={`Detec camera ${camera.detec_camera_id}`} referrerPolicy="no-referrer"
            onLoad={() => setError('')} onError={() => setError('Detec ยังไม่สามารถเปิดภาพจากกล้องนี้ได้')}
            style={{width:'100%',height:'100%',objectFit:'contain'}} />
        )}
        {error && <p role="alert" style={{position:'absolute',background:'rgba(0,0,0,.75)',color:'#fff',padding:12,borderRadius:10}}>{error}</p>}
      </div>
      <div className="cctv-controls" style={{justifyContent:'center',gap:14}}>
        <span>Jam Index: {Number(camera.ai_traffic?.jam_index || 0)}%</span>
        <span>รถ: {Number(camera.ai_traffic?.current_vehicles || 0)} คัน</span>
      </div>
    </section>
  );
}

// ── Main export — เลือก viewer ตาม URL type ──
export default function LiveViewer({ camera, onClose }) {
  if (camera.detec_camera_id) return <DetecViewer camera={camera} onClose={onClose} />;
  let externalUrl = camera.external_stream_url || null;
  
  // แปลง input ให้เป็น URL ที่ใช้งานได้เสมอ
  if (externalUrl) {
    externalUrl = externalUrl.trim();
    // ถ้าใส่มาเป็น iframe ให้ดึงเฉพาะ src ออกมา
    const iframeMatch = externalUrl.match(/<iframe.*?src=["'](.*?)["']/i);
    if (iframeMatch) externalUrl = iframeMatch[1];
    
    // ถ้าไม่มี http/https ให้เติมเข้าไปอัตโนมัติ
    if (!externalUrl.startsWith('http://') && !externalUrl.startsWith('https://')) {
      externalUrl = 'https://' + externalUrl;
    }
  }

  const youtubeId = getYouTubeId(externalUrl);
  if (youtubeId) return <YouTubeViewer videoId={youtubeId} onClose={onClose} />;
  
  // ตรวจสอบว่าเป็นลิงก์วิดีโอ/สตรีมโดยตรงหรือไม่
  const isVideo = externalUrl && (
    externalUrl.toLowerCase().includes('.m3u8') || 
    externalUrl.toLowerCase().includes('.mp4') || 
    externalUrl.toLowerCase().includes('.webm')
  );
  
  if (externalUrl && !isVideo) return <IframeViewer url={externalUrl} onClose={onClose} />;
  return <HlsViewer camera={camera} onClose={onClose} externalUrl={externalUrl} />;
}
