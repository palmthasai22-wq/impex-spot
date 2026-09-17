import { useEffect, useState } from 'react';
import axios from 'axios';
import { getDetecApiUrl } from '../utils/detecApi';

export default function useTrafficFlow() {
  const [trafficNodes, setTrafficNodes] = useState([]);
  const [detecCameras, setDetecCameras] = useState([]);
  const [trafficError, setError] = useState('');
  const [trafficLoading, setLoading] = useState(true);
  const [trafficUpdatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let timer;
    let mounted = true;
    const controller = new AbortController();

    const fetchTraffic = async () => {
      try {
        const apiUrl = getDetecApiUrl();
        const requestOptions = { signal: controller.signal, timeout: 8000 };
        const [{ data }, { data: cameraData }] = await Promise.all([
          axios.get(`${apiUrl}/api/analytics/live_traffic`, requestOptions),
          axios.get(`${apiUrl}/api/cameras`, requestOptions),
        ]);
        const nodes = Array.isArray(data) ? data : data?.traffic ?? data?.items ?? [];
        if (!Array.isArray(nodes)) throw new Error('Invalid traffic response');
        const cameraList = Array.isArray(cameraData) ? cameraData : [];
        if (!mounted) return;
        setTrafficNodes(nodes);
        setDetecCameras(cameraList);
        setError('');
        setUpdatedAt(new Date());
      } catch (err) {
        if (!mounted || axios.isCancel(err)) return;
        // Keep the last good snapshot visible while a later poll is failing.
        setError('ไม่สามารถอัปเดตข้อมูลจราจรจาก AI ได้');
      } finally {
        if (!mounted) return;
        setLoading(false);
        timer = window.setTimeout(fetchTraffic, 5000);
      }
    };

    fetchTraffic();

    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return { trafficNodes, detecCameras, trafficError, trafficLoading, trafficUpdatedAt };
}
