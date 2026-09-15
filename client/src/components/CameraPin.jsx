import React from 'react';
import { Marker, Polygon } from 'react-leaflet';
import L from 'leaflet';

export const CAMERA_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="6" width="13" height="12" rx="3"/><path d="m15 10 7-4v12l-7-4z"/></svg>';
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
  const icon = L.divIcon({ className: 'cctv-marker-wrap', html: `<span class="cctv-marker ${camera.status === 'online' ? 'is-online' : ''}">${CAMERA_ICON}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
  return <>
    <Polygon positions={coverageCone(camera)} interactive={false} pathOptions={{ color: '#0d9488', weight: 1, fillOpacity: 0.14 }} />
    <Marker position={[camera.location.lat, camera.location.lng]} icon={icon} title={`CCTV · ${camera.status}`} bubblingMouseEvents={false} eventHandlers={{ click: () => onSelect(camera) }} />
  </>;
}
