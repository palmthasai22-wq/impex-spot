import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function useCameras() {
  const [cameras, setCameras] = useState([]);
  const [cameraError, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const load = async () => {
      try {
        const all = [];
        for (let offset = 0; offset <= 100000; offset += 200) {
          const { data } = await api.get('/pins/cctv', { params: { limit: 200, offset }, signal: controller.signal });
          all.push(...data);
          if (data.length < 200) break;
        }
        if (!controller.signal.aborted) { setCameras(all); setError(''); }
      } catch {
        if (!controller.signal.aborted) { setCameras([]); setError('CCTV ไม่พร้อมใช้งาน'); }
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 30000);
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return { cameras, cameraError };
}
