import React, { useState } from 'react';
import LiveViewer from './LiveViewer';

export default function AdminCameraForm({ camera, onSave, onCancel }) {
  const [data, setData] = useState({ name: camera?.name || '', camera_category: camera?.camera_category || 'แยกหลัก', ai_detection_url: camera?.ai_detection_url || '', lat: camera?.location.lat ?? 13.9126, lng: camera?.location.lng ?? 100.5530,
    coverage_direction: camera?.coverage_direction ?? 0, owner_type: camera?.owner_type || 'government',
    connection_type: 'lan_ip', camera_ip: camera?.camera_ip || '', rtsp_path: camera?.rtsp_path || '/stream1',
    external_stream_url: camera?.external_stream_url || '',
    detec_camera_id: camera?.detec_camera_id || '',
    verification_status: camera?.verification_status || 'pending', owner_consent: camera?.owner_consent || false });
  const [credentials, setCredentials] = useState({ username: '', password: '', port: 554 });
  const [replaceCredentials, setReplaceCredentials] = useState(!camera?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const change = (key, value) => setData(old => ({ ...old, [key]: value,
    ...(['camera_ip', 'rtsp_path', 'connection_type', 'owner_type', 'verification_status'].includes(key) ? { owner_consent: false } : {}) }));
  const numeric = (key, label, min, max, step = 'any') => <label>{label}<input required type="number" min={min} max={max} step={step} value={data[key]} onChange={e => change(key, e.target.value === '' ? '' : Number(e.target.value))} /></label>;
  return <form className="cctv-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const hasExternalUrl = data.external_stream_url && data.external_stream_url.trim() !== '';
      const body = {
        ...data,
        // ถ้าไม่มี external URL ให้ส่ง camera_ip ปกติ; ถ้ามีให้ส่งเป็น '' ได้
        camera_ip: hasExternalUrl ? (data.camera_ip || '') : data.camera_ip,
        // ส่ง external_stream_url เป็น null ถ้าว่าง
        external_stream_url: hasExternalUrl ? data.external_stream_url.trim() : '',
        ...(replaceCredentials ? { credentials } : {}),
      };
      await onSave(body);
    }
    catch (requestError) {
      console.error('Save error:', requestError.response?.data);
      setError(requestError.response?.status === 400
        ? `ข้อมูลกล้องไม่ถูกต้อง: ${requestError.response?.data?.error || 'กรุณาตรวจสอบ URL และข้อมูล'}`
        : 'บันทึกไม่สำเร็จ ตรวจสอบข้อมูลและสิทธิ์ผู้ดูแล');
    }
    finally { setBusy(false); }
  }}>
    <h2>{camera?.id ? 'แก้ไขกล้อง' : 'เพิ่มกล้อง CCTV'}</h2>
    <div style={{background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', border: '1px solid #bbf7d0'}}>
      💡 <b>ทิปส์:</b> หากต้องการเพิ่มกล้องใหม่ให้ง่ายขึ้น คุณสามารถไปที่ <b>หน้าแผนที่หลัก</b> นอกสุด แล้วกดปุ่ม <b>"CCTV" (สีชมพู)</b> ด้านล่าง เพื่อจิ้มเลือกลงบนแผนที่ได้เลยครับ
    </div>
    <p className="cctv-form-help">เชื่อมต่อผ่าน Wi-Fi วงเดียวกับเครื่อง Relay ระบบจะค้นหาและบันทึก IP กล้องให้อัตโนมัติ</p>
    <div className="cctv-fields">
      <label>ชื่อกล้อง/สถานที่<input required maxLength="160" placeholder="เช่น แยกหน้าเมืองทองธานี" value={data.name} onChange={e => change('name', e.target.value)} /></label>
      <label>หมวดหมู่ย่อย<select value={data.camera_category} onChange={e => change('camera_category', e.target.value)}><option>ทางเข้า-ออก</option><option>แยกหลัก</option><option>ลานจอดรถ</option><option>หน้าอาคาร/ฮอลล์</option><option>จุดทั่วไป</option></select></label>
      {numeric('lat', 'ละติจูด', -90, 90)}{numeric('lng', 'ลองจิจูด', -180, 180)}{numeric('coverage_direction', 'ทิศทางกล้อง (0° = เหนือ)', 0, 359, 1)}
      <label>เจ้าของ<select value={data.owner_type} onChange={e => change('owner_type', e.target.value)}><option value="government">ภาครัฐ</option><option value="business">ธุรกิจ</option><option value="household">ครัวเรือน</option><option value="agency">หน่วยงาน</option></select></label>
      <label>การเชื่อมต่อ<input readOnly value="Wi-Fi วงเดียวกับ Relay" /></label>
      <label>IP กล้อง<input readOnly value={data.camera_ip || 'ค้นหาและบันทึกอัตโนมัติ'} /></label>
      <label>RTSP path<input required value={data.rtsp_path} onChange={e => change('rtsp_path', e.target.value)} /></label>
      <label>URL สตรีมภายนอก (ไม่บังคับ)
        <input
          type="text"
          placeholder="เช่น https://detec-production.up.railway.app/live/{uuid}"
          value={data.external_stream_url}
          onChange={e => change('external_stream_url', e.target.value)}
        />
        <small style={{fontSize:'0.72em',color:'#6b7280'}}>วาง URL จอมอนิเตอร์ที่คัดลอกจาก Detec เพื่อแสดงเฉพาะภาพวิเคราะห์แบบเต็มจอ</small>
      </label>
      <label>Detec Camera ID (ไม่บังคับ)
        <input type="number" min="1" step="1" placeholder="เช่น 12" value={data.detec_camera_id}
          onChange={e => change('detec_camera_id', e.target.value === '' ? '' : Number(e.target.value))} />
        <small style={{fontSize:'0.72em',color:'#6b7280'}}>ระบุ ID กล้องจาก detec เพื่อเชื่อมภาพ AI และสถานะจราจรกับหมุดนี้ หากเว้นว่างระบบจะจับคู่จาก GPS ภายใน 150 เมตร</small>
      </label>
      <label>URL API วิเคราะห์จราจร (ไม่บังคับ)
        <input type="text" placeholder="https://.../traffic หรือ mock:random" value={data.ai_detection_url} onChange={e => change('ai_detection_url', e.target.value)} />
        <small style={{fontSize:'0.72em',color:'#6b7280'}}>แยกจาก URL ภาพสด รองรับ API ที่คืน status/เปอร์เซ็นต์ หรือใช้ mock:random เพื่อทดลองสีหมุด</small>
      </label>
      {camera?.id ? <label>การตรวจสอบ<select value={data.verification_status} onChange={e => change('verification_status', e.target.value)}><option value="pending">รอตรวจสอบ</option><option value="verified">ตรวจสอบแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label> : <label>การตรวจสอบ<input readOnly value="รอตรวจสอบหลังเชื่อมต่อ" /></label>}
    </div>
    {data.external_stream_url && <div className="cctv-preview-box">
      <button type="button" onClick={() => setPreview(value => !value)}>{preview ? 'ซ่อนพรีวิว' : '▶ พรีวิวภาพสดก่อนบันทึก'}</button>
      {preview && <LiveViewer camera={{ ...data, status:'online' }} />}
    </div>}
    {camera?.id && <label className="cctv-check"><input type="checkbox" checked={replaceCredentials} onChange={e => { setReplaceCredentials(e.target.checked); change('owner_consent', false); }} />เปลี่ยนข้อมูลเข้าสู่ระบบกล้อง</label>}
    {replaceCredentials && <div className="cctv-fields">
      <label>ชื่อผู้ใช้กล้อง<input autoComplete="off" value={credentials.username} onChange={e => { setCredentials(c => ({ ...c, username: e.target.value })); change('owner_consent', false); }} /></label>
      <label>รหัสผ่านกล้อง<input type="password" autoComplete="new-password" value={credentials.password} onChange={e => { setCredentials(c => ({ ...c, password: e.target.value })); change('owner_consent', false); }} /></label>
      <label>RTSP port<input type="number" required min="1" max="65535" value={credentials.port} onChange={e => { setCredentials(c => ({ ...c, port: Number(e.target.value) })); change('owner_consent', false); }} /></label>
    </div>}
    {camera?.id && <label className="cctv-check cctv-consent"><input type="checkbox" disabled={data.verification_status !== 'verified'} checked={data.owner_consent} onChange={e => change('owner_consent', e.target.checked)} />ฉันตรวจสอบเจ้าของกล้องแล้ว และยืนยันว่าเจ้าของยินยอมให้เผยแพร่ภาพสดต่อสาธารณะ</label>}
    {error && <p role="alert">{error}</p>}
    <div className="cctv-actions"><button disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : camera?.id ? 'บันทึกการตั้งค่า' : 'สร้างกล้องและตั้งค่า Relay'}</button><button type="button" onClick={onCancel}>ยกเลิก</button></div>
  </form>;
}
