import React from 'react';
import { Marker, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { TRAFFIC_LEVELS, getTrafficLevel } from '../utils/traffic';

export const CAMERA_IMAGE = '/images/cctv.png';
export const CAMERA_ICON = `<img src="${CAMERA_IMAGE}" alt="" aria-hidden="true" />`;
export function coverageCone(camera) {
  const { lat, lng } = camera.location;
  const origin = [lat, lng];
  const points = [origin];
  const distance = 70 / 6371000;
  const rad = Math.PI / 180;
  for (let angle = -30; angle <= 30; angle += 5) {
    const bearing = (camera.coverage_direction + angle) * rad;
    const lat2 = Math.asin(Math.sin(lat * rad) * Math.cos(distance) + Math.cos(lat * rad) * Math.sin(distance) * Math.cos(bearing));
    const lng2 = lng * rad + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat * rad), Math.cos(distance) - Math.sin(lat * rad) * Math.sin(lat2));
    points.push([lat2 / rad, lng2 / rad]);
  }
  return [...points, origin];
}

export default function CameraPin({ camera, onSelect }) {
  const traffic = camera.ai_traffic ? TRAFFIC_LEVELS[getTrafficLevel(camera.ai_traffic)] : null;
  const aiStyle = traffic ? `style="--ai-traffic-color:${traffic.color};box-shadow:0 0 0 4px ${traffic.color},0 6px 18px rgba(15,23,42,.35)"` : '';
  const icon = L.divIcon({ className: 'cctv-marker-wrap', html: `<span class="cctv-marker ${camera.status === 'online' ? 'is-online' : ''} ${traffic ? 'has-ai-traffic' : ''}" ${aiStyle}>${CAMERA_ICON}</span>`, iconSize: [62, 82], iconAnchor: [31, 82] });
  const title = camera.detec_camera_id
    ? `CCTV + Detec #${camera.detec_camera_id}${traffic ? ` · ${traffic.label}` : ''}`
    : `CCTV · ${camera.status}`;
  return <>
    <Polygon positions={coverageCone(camera)} interactive={false} pathOptions={{ color: '#0d9488', weight: 1, fillOpacity: 0.14 }} />
    <Marker position={[camera.location.lat, camera.location.lng]} icon={icon} title={title} bubblingMouseEvents={false} eventHandlers={{ click: () => onSelect(camera) }} />
  </>;
}
