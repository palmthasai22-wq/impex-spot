import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function useEvents() {
  const [events, setEvents] = useState([]);
  const [eventError, setEventError] = useState('');
  useEffect(() => {
    let active = true; let timer;
    const load = async () => {
      try {
        const { data } = await api.get('/events');
        if (active) { setEvents(Array.isArray(data) ? data : []); setEventError(''); }
      } catch { if (active) setEventError('ยังโหลดปฏิทินงานไม่ได้'); }
      if (active) timer = setTimeout(load, 60000);
    };
    load();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return { events, eventError };
}
