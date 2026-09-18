import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { EVENT_TYPES, VENUE_LOCATIONS, formatEventRange, getVenueLocation } from '../../utils/events';

const empty = { eventName:'', eventType:'exhibition_public', startDate:'', endDate:'', startTime:'10:00', endTime:'18:00', venueName:'', lat:13.9145, lng:100.5545, organizer:'', sourceUrl:'https://www.impact.co.th/th/visitors/event-calendar', hideWhenEnded:false };

export default function EventsTab({ token }) {
  const [events, setEvents] = useState([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState(''); const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };
  const load = async () => { try { setEvents((await api.get('/admin/events', { headers })).data); } catch { toast.error('โหลดปฏิทินงานไม่สำเร็จ'); } };
  useEffect(() => { load(); }, [token]);
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const changeVenue = value => {
    const location = getVenueLocation(value);
    setForm(old => ({ ...old, venueName:value, ...(location || {}) }));
  };
  const submit = async e => { e.preventDefault(); setBusy(true); try { editing ? await api.put(`/admin/events/${editing}`, form, { headers }) : await api.post('/admin/events', form, { headers }); toast.success(editing ? 'แก้ไขงานแล้ว' : 'เพิ่มงานแล้ว'); setForm(empty); setEditing(''); await load(); } catch { toast.error('กรุณาตรวจสอบชื่อ วันเวลา พิกัด และ URL อ้างอิง'); } finally { setBusy(false); } };
  const edit = event => { setEditing(event.id); setForm({ ...empty, ...event }); window.scrollTo({ top:0, behavior:'smooth' }); };
  const remove = async event => { if (!window.confirm(`ลบงาน “${event.eventName}” หรือไม่?`)) return; await api.delete(`/admin/events/${event.id}`, { headers }); toast.success('ลบงานแล้ว'); load(); };
  const syncImpact = async () => { setBusy(true); toast.loading('กำลังดึงข้อมูล...'); try { const res = await api.post('/admin/events/sync', {}, { headers }); toast.dismiss(); toast.success(`ดึงข้อมูลสำเร็จ! พบ ${res.data.totalFound} งาน, เพิ่มใหม่ ${res.data.added} งาน`); load(); } catch { toast.dismiss(); toast.error('ดึงข้อมูลไม่สำเร็จ'); } finally { setBusy(false); } };
  return <div className="event-admin-grid">
    <form className="event-admin-form" onSubmit={submit}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2>📅 จัดการปฏิทินงาน</h2><button type="button" onClick={syncImpact} disabled={busy} style={{height:'36px',padding:'0 15px',background:'#2563eb',color:'#fff',borderRadius:'8px',border:'none',cursor:'pointer'}}>ดึงข้อมูลจากเว็บ IMPACT</button></div>
      <p>กรอกตามปฏิทินทางการของ IMPACT แล้วหมุดจะขึ้นตามวันเวลาจริง</p>
      <label>ชื่องาน<input required value={form.eventName} onChange={e=>change('eventName',e.target.value)} /></label>
      <label>ประเภท<select value={form.eventType} onChange={e=>change('eventType',e.target.value)}>{Object.entries(EVENT_TYPES).map(([id,type])=><option key={id} value={id}>{type.emoji} {type.label}</option>)}</select></label>
      <div className="event-admin-row"><label>วันเริ่ม<input required type="date" value={form.startDate} onChange={e=>change('startDate',e.target.value)} /></label><label>วันสิ้นสุด<input required type="date" value={form.endDate} onChange={e=>change('endDate',e.target.value)} /></label></div>
      <div className="event-admin-row"><label>เวลาเริ่ม<input required type="time" value={form.startTime} onChange={e=>change('startTime',e.target.value)} /></label><label>เวลาสิ้นสุด<input required type="time" value={form.endTime} onChange={e=>change('endTime',e.target.value)} /></label></div>
      <label>ฮอลล์/สถานที่<input required list="impact-venues" value={form.venueName} onChange={e=>changeVenue(e.target.value)} placeholder="เลือกหรือพิมพ์ชื่อฮอลล์" /><datalist id="impact-venues">{Object.keys(VENUE_LOCATIONS).map(name=><option key={name} value={name} />)}</datalist><small>เลือกจากรายการเพื่อใส่พิกัดจริงให้อัตโนมัติ</small></label>
      <div className="event-admin-row"><label>ละติจูด<input required type="number" step="any" value={form.lat} onChange={e=>change('lat',Number(e.target.value))} /></label><label>ลองจิจูด<input required type="number" step="any" value={form.lng} onChange={e=>change('lng',Number(e.target.value))} /></label></div>
      <label>ผู้จัด<input value={form.organizer} onChange={e=>change('organizer',e.target.value)} /></label>
      <label>ลิงก์โปสเตอร์ (URL)<input type="url" value={form.posterUrl || ''} onChange={e=>change('posterUrl',e.target.value)} placeholder="https://..." /></label>
      <label>ลิงก์อ้างอิง<input type="url" value={form.sourceUrl} onChange={e=>change('sourceUrl',e.target.value)} /></label>
      <label className="event-check"><input type="checkbox" checked={form.hideWhenEnded} onChange={e=>change('hideWhenEnded',e.target.checked)} /> ซ่อนหมุดเมื่อจบงาน</label>
      <div className="event-admin-actions"><button disabled={busy}>{busy?'กำลังบันทึก…':editing?'บันทึกการแก้ไข':'เพิ่มงาน'}</button>{editing&&<button type="button" onClick={()=>{setEditing('');setForm(empty);}}>ยกเลิก</button>}</div>
    </form>
    <section className="event-admin-list"><h3>งานทั้งหมด ({events.length})</h3>{events.map(event=><article key={event.id}><div><strong>{EVENT_TYPES[event.eventType]?.emoji} {event.eventName}</strong><span>{formatEventRange(event)}</span><span>📍 {event.venueName}</span></div><div><button onClick={()=>edit(event)}>แก้ไข</button><button className="danger" onClick={()=>remove(event)}>ลบ</button></div></article>)}</section>
  </div>;
}
