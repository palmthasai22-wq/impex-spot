import React, { useMemo, useState } from 'react';
import { eventOccursOn } from '../utils/events';

const normalize = value => String(value || '').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
const fuzzyMatch = (text, query) => {
  const source=normalize(text); const q=normalize(query); if(source.includes(q)) return true;
  let index=0; for(const char of source){if(char===q[index]) index+=1;if(index===q.length)return true;} return false;
};

export default function MapExplorerControls({ cameras, events, onSelect, selectedDate, onDate, pollingSeconds, onPolling }) {
  const [query,setQuery]=useState(''); const [searchOpen,setSearchOpen]=useState(false); const [calendarOpen,setCalendarOpen]=useState(false);
  const results=useMemo(()=>{const q=normalize(query);if(!q)return[];return [
    ...cameras.filter(c=>fuzzyMatch(`${c.name} ${c.camera_category}`,q)).map(item=>({kind:'camera',id:item.id,label:item.name||'กล้อง CCTV',sub:item.camera_category||'CCTV',item})),
    ...events.filter(e=>fuzzyMatch(`${e.eventName} ${e.venueName}`,q)).map(item=>({kind:'event',id:item.id,label:item.eventName,sub:item.venueName,item}))
  ].slice(0,8);},[query,cameras,events]);
  const month=selectedDate?.slice(0,7)||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}).slice(0,7);
  const [year,monthNo]=month.split('-').map(Number); const days=new Date(year,monthNo,0).getDate(); const first=new Date(year,monthNo-1,1).getDay();
  const pick=result=>{onSelect(result);setSearchOpen(false);setQuery(result.label);};
  return <div className="map-explorer" aria-label="ค้นหาและปฏิทินงาน">
    <div className="map-explorer-row">
      <button className="mobile-tool-toggle" aria-label="เปิดการค้นหา" onClick={()=>setSearchOpen(v=>!v)}>🔎</button>
      <div className={`map-search ${searchOpen?'open':''}`}><input aria-label="ค้นหากล้อง สถานที่ หรืองาน" value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setSearchOpen(true);}} placeholder="ค้นหากล้อง สถานที่ หรืองาน…" />{searchOpen&&query&&<div className="map-search-results" role="listbox">{results.length?<><small>พบ {results.length} ผลลัพธ์</small>{results.map(result=><button key={`${result.kind}-${result.id}`} onClick={()=>pick(result)}><span>{result.kind==='camera'?'📹':'🎪'}</span><span><strong>{result.label}</strong><small>{result.sub}</small></span></button>)}</>:<p>ไม่พบสถานที่ที่ค้นหา</p>}</div>}</div>
      <button className="calendar-toggle" aria-expanded={calendarOpen} onClick={()=>setCalendarOpen(v=>!v)}>📅 <span>{selectedDate||'เลือกวันที่'}</span></button>
      <label className="polling-control">AI <select aria-label="ความถี่อัปเดตสถานะจราจร" value={pollingSeconds} onChange={e=>onPolling(Number(e.target.value))}><option value="5">5 วิ</option><option value="15">15 วิ</option><option value="30">30 วิ</option><option value="60">1 นาที</option></select></label>
    </div>
    {calendarOpen&&<div className="mini-calendar"><header><strong>{new Date(year,monthNo-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'})}</strong><button aria-label="ปิดปฏิทิน" onClick={()=>setCalendarOpen(false)}>✕</button></header><div className="calendar-week"><span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span></div><div className="calendar-days">{Array.from({length:first}).map((_,i)=><i key={`blank-${i}`} />)}{Array.from({length:days},(_,i)=>{const iso=`${month}-${String(i+1).padStart(2,'0')}`;const has=events.some(e=>eventOccursOn(e,iso));return <button key={iso} className={`${selectedDate===iso?'selected':''} ${has?'has-event':''}`} onClick={()=>{onDate(selectedDate===iso?'':iso);setCalendarOpen(false);}}>{i+1}{has&&<b aria-label="มีงาน" />}</button>;})}</div><button className="clear-date" onClick={()=>{onDate('');setCalendarOpen(false);}}>แสดงทุกวัน</button></div>}
  </div>;
}
