import React, { useState } from 'react';

export default function AdminCameraForm({ camera, onSave, onCancel }) {
  const [data, setData] = useState({ lat: camera?.location.lat ?? 13.7563, lng: camera?.location.lng ?? 100.5018,
    coverage_direction: camera?.coverage_direction ?? 0, owner_type: camera?.owner_type || 'government',
    connection_type: 'lan_ip', camera_ip: camera?.camera_ip || '', rtsp_path: camera?.rtsp_path || '/stream1',
    verification_status: camera?.verification_status || 'pending', owner_consent: camera?.owner_consent || false });
  const [credentials, setCredentials] = useState({ username: '', password: '', port: 554 });
  const [replaceCredentials, setReplaceCredentials] = useState(!camera?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (key, value) => setData(old => ({ ...old, [key]: value,
    ...(['camera_ip', 'rtsp_path', 'connection_type', 'owner_type', 'verification_status'].includes(key) ? { owner_consent: false } : {}) }));
  const numeric = (key, label, min, max, step = 'any') => <label>{label}<input required type="number" min={min} max={max} step={step} value={data[key]} onChange={e => change(key, e.target.value === '' ? '' : Number(e.target.value))} /></label>;
  return <form className="cctv-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave({ ...data, ...(replaceCredentials ? { credentials } : {}) }); }
    catch { setError('บันทึกไม่สำเร็จ ตรวจสอบข้อมูลและสิทธิ์ผู้ดูแล'); }
    finally { setBusy(false); }
  }}>
    <h2>{camera?.id ? 'แก้ไขกล้อง' : 'เพิ่มกล้อง CCTV'}</h2>
    <div className="cctv-fields">
      {numeric('lat', 'ละติจูด', -90, 90)}{numeric('lng', 'ลองจิจูด', -180, 180)}{numeric('coverage_direction', 'ทิศทางกล้อง (0° = เหนือ)', 0, 359, 1)}
      <label>เจ้าของ<select value={data.owner_type} onChange={e => change('owner_type', e.target.value)}><option value="government">ภาครัฐ</option><option value="business">ธุรกิจ</option><option value="household">ครัวเรือน</option><option value="agency">หน่วยงาน</option></select></label>
      <label>การเชื่อมต่อ<select value={data.connection_type} onChange={e => change('connection_type', e.target.value)}><option value="lan_ip">เชื่อมต่อด้วย IP</option></select></label>
      <label>IP กล้อง<input required value={data.camera_ip} onChange={e => change('camera_ip', e.target.value)} placeholder="192.168.1.20" /></label>
      <label>RTSP path<input required value={data.rtsp_path} onChange={e => change('rtsp_path', e.target.value)} /></label>
      <label>การตรวจสอบ<select value={data.verification_status} onChange={e => change('verification_status', e.target.value)}><option value="pending">รอตรวจสอบ</option><option value="verified">ตรวจสอบแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label>
    </div>
    {camera?.id && <label className="cctv-check"><input type="checkbox" checked={replaceCredentials} onChange={e => { setReplaceCredentials(e.target.checked); change('owner_consent', false); }} />เปลี่ยนข้อมูลเข้าสู่ระบบกล้อง</label>}
    {replaceCredentials && <div className="cctv-fields">
      <label>ชื่อผู้ใช้กล้อง<input autoComplete="off" value={credentials.username} onChange={e => { setCredentials(c => ({ ...c, username: e.target.value })); change('owner_consent', false); }} /></label>
      <label>รหัสผ่านกล้อง<input type="password" autoComplete="new-password" value={credentials.password} onChange={e => { setCredentials(c => ({ ...c, password: e.target.value })); change('owner_consent', false); }} /></label>
      <label>RTSP port<input type="number" required min="1" max="65535" value={credentials.port} onChange={e => { setCredentials(c => ({ ...c, port: Number(e.target.value) })); change('owner_consent', false); }} /></label>
    </div>}
    <label className="cctv-check cctv-consent"><input type="checkbox" disabled={data.verification_status !== 'verified'} checked={data.owner_consent} onChange={e => change('owner_consent', e.target.checked)} />ฉันตรวจสอบเจ้าของกล้องแล้ว และยืนยันว่าเจ้าของยินยอมให้เผยแพร่ภาพสดต่อสาธารณะ</label>
    {error && <p role="alert">{error}</p>}
    <div className="cctv-actions"><button disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : 'บันทึกกล้อง'}</button><button type="button" onClick={onCancel}>ยกเลิก</button></div>
  </form>;
}
