import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import AdminCameraForm from './AdminCameraForm';
import LiveViewer from './LiveViewer';
import './cctv.css';

const connectionLabels = { lan_ip: 'สาย LAN / IP', wifi_local: 'Wi-Fi ภายในเครือข่าย', onvif: 'ONVIF' };
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export default function AdminMonitorGrid({ token, onBack, onLogout }) {
  const [cameras, setCameras] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState(null);
  const [discovery, setDiscovery] = useState(null);
  const [page, setPage] = useState(0);
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/monitor', { headers: { Authorization: `Bearer ${token}` }, params: { limit: 9, offset: page * 9 } });
      setCameras(data); setError('');
    } catch (e) {
      setCameras([]);
      setError(e.response?.status === 403 || e.response?.status === 401 ? 'ต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลกล้องที่ใช้งานอยู่' : 'ไม่สามารถโหลดกล้องได้ ลองรีเฟรชอีกครั้ง');
    } finally { setLoading(false); }
  }, [token, page]);
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]);
  const action = async fn => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (requestError) { setError(requestError.userMessage || 'ดำเนินการไม่สำเร็จ โปรดลองอีกครั้ง'); } finally { setBusy(false); }
  };
  const scan = async (camera, refresh) => {
    const { data } = await api.get('/admin/cameras/discover', { ...config, params: { pinId: camera.id, refresh } });
    setDiscovery({ ...data, camera });
    return data;
  };
  const connectDiscovered = async (camera, device) => {
    await api.put(`/admin/cameras/${camera.id}`, {
      camera_ip: device.camera_ip,
      connection_type: 'wifi_local',
      owner_consent: camera.owner_consent === true,
    }, config);
    await api.post(`/admin/cameras/${camera.id}/health`, {}, config);
    setDiscovery({ camera, devices: [device], pending: false, connected: true });
  };
  const scanAndConnect = async camera => {
    await scan(camera, true);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await wait(2000);
      const result = await scan(camera, false);
      if (!result.pending && result.devices.length === 1) {
        await connectDiscovered(camera, result.devices[0]);
        return;
      }
      if (!result.pending && result.devices.length > 1) return;
      if (!result.pending) break;
    }
    const timeout = new Error('Relay discovery timeout');
    timeout.userMessage = 'ยังไม่พบกล้อง ตรวจสอบว่า Relay เปิดอยู่และเชื่อมต่อ Wi-Fi เดียวกับกล้อง';
    throw timeout;
  };
  return <div className="cctv-admin">
    <header className="cctv-admin-header"><div><p>รู้ทัน · ผู้ดูแลระบบ</p><h1>กล้อง CCTV</h1><p>ภาพสดจากกล้องที่เจ้าของอนุญาต</p></div><div className="cctv-actions"><button onClick={onBack}>กลับ</button><button onClick={onLogout}>ออกจากระบบ</button><button onClick={() => { setEditing({}); setPairing(null); }}>+ เพิ่มกล้อง</button></div></header>
    {loading && <p role="status">กำลังโหลดกล้อง…</p>}
    {error && <p className="cctv-notice" role="alert">{error} <button onClick={load}>รีเฟรช</button></p>}
    {editing && <AdminCameraForm key={`${editing.id || 'new'}-${editing.camera_ip || ''}`} camera={editing.id ? editing : undefined} onCancel={() => setEditing(null)} onSave={async body => {
      if (editing.id) await api.put(`/admin/cameras/${editing.id}`, body, config);
      else {
        const { data: created } = await api.post('/admin/cameras', body, config);
        const { data: relay } = await api.post(`/admin/cameras/${created.id}/relay-token`, {}, config);
        setPairing(relay);
      }
      setEditing(null); await load();
    }} />}
    {pairing && <section className="cctv-form"><h2>ตั้งค่า Relay ใกล้กล้อง</h2><p>ระบบบันทึกรายการกล้องแล้ว ให้นำโทเคนนี้ไปเปิด Relay บนเครื่องที่ต่อ Wi-Fi วงเดียวกับกล้อง เมื่อ Relay เริ่มทำงาน ระบบจะค้นหาและบันทึก IP ให้อัตโนมัติ</p><label>Camera ID<input readOnly value={pairing.pin_id} /></label><label>Relay token<input readOnly value={pairing.relay_token} /></label><button onClick={() => setPairing(null)}>ปิดและซ่อนโทเคน</button></section>}
    {discovery && <section className="cctv-form"><h2>ค้นหาและเชื่อมต่อกล้องบน Wi-Fi</h2><p>{discovery.connected ? 'เชื่อมต่อข้อมูลกล้องแล้ว กำลังรอสัญญาณภาพจาก Relay' : discovery.pending ? 'Relay กำลังค้นหา ใช้เวลาประมาณ 10–20 วินาที' : `พบ ${discovery.devices.length} กล้อง${discovery.devices.length > 1 ? ' กรุณาเลือกกล้องที่ต้องการ' : ''}`}</p><div className="cctv-actions">{!discovery.connected && <button disabled={busy} onClick={() => action(() => scanAndConnect(discovery.camera))}>ค้นหาอีกครั้ง</button>}<button onClick={() => setDiscovery(null)}>ปิด</button></div>
      {!discovery.connected && discovery.devices.map(device => <button disabled={busy} key={device.camera_ip} onClick={() => action(() => connectDiscovered(discovery.camera, device))}>{device.camera_ip} · เชื่อมต่อกล้องนี้</button>)}
    </section>}
    {!loading && !error && cameras.length === 0 && <div className="cctv-empty"><h2>ยังไม่มีกล้องในหน้านี้</h2><p>เพิ่มกล้องและตรวจสอบความยินยอมของเจ้าของเพื่อเริ่มเผยแพร่ภาพสด</p></div>}
    <div className="cctv-grid">{cameras.map(camera => <article key={camera.id} className="cctv-card">
      {camera.public_stream_url ? <LiveViewer camera={camera} /> : <div className="cctv-placeholder">{camera.owner_consent ? 'กล้องยังไม่ออนไลน์' : 'รอการตรวจสอบและความยินยอม'}</div>}
      <div className="cctv-card-details"><strong>CCTV · {camera.id.slice(0, 8)}</strong><span className={`cctv-status ${camera.status}`}>{camera.status}</span><p>{camera.owner_type} · {connectionLabels[camera.connection_type] || camera.connection_type}</p><p>Relay: {camera.relay_last_seen_at ? new Date(camera.relay_last_seen_at).toLocaleString('th-TH') : 'ยังไม่เชื่อมต่อ'}</p><div className="cctv-actions">
        <button disabled={busy} onClick={() => setEditing(camera)}>แก้ไข</button>
        <button disabled={busy} onClick={() => action(async () => { await api.post(`/admin/cameras/${camera.id}/health`, {}, config); })}>ตรวจสอบ</button>
        <button disabled={busy} onClick={() => action(async () => { if (camera.relay_paired && !window.confirm('สร้างโทเคนใหม่จะยกเลิก Relay เดิม ต้องการดำเนินการต่อ?')) return; const { data } = await api.post(`/admin/cameras/${camera.id}/relay-token`, {}, config); setPairing(data); })}>จับคู่ Relay</button>
        <button disabled={busy || !camera.relay_paired} onClick={() => action(() => scanAndConnect(camera))}>ค้นหาและเชื่อมต่อ</button>
        <button disabled={busy} onClick={() => action(async () => { if (window.confirm('ลบกล้องนี้และหยุดเผยแพร่ภาพสด?')) await api.delete(`/admin/cameras/${camera.id}`, config); })}>ลบ</button>
      </div></div>
    </article>)}</div>
    <nav className="cctv-actions" aria-label="หน้ากล้อง"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>ก่อนหน้า</button><span>หน้า {page + 1}</span><button disabled={cameras.length < 9} onClick={() => setPage(p => p + 1)}>ถัดไป</button></nav>
  </div>;
}
