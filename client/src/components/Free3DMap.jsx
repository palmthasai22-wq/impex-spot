import React, { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CAMERA_ICON, coverageCone } from './CameraPin';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

function createMascotElement(className = '', image = '/images/mascot_impact.png') {
  const element = document.createElement('div');
  element.className = `free-map-mascot ${className}`;
  element.innerHTML = `<img src="${image}" alt="หมุด" />`;
  return element;
}

export default function Free3DMap({ pins, cameras = [], onCameraClick, userPosition, selectedPosition, limitedBounds, onMapSelect, onPinClick, onReady, onUnavailable }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const fallbackTimerRef = useRef(null);
  const [mapError, setMapError] = React.useState('');
  const onMapSelectRef = useRef(onMapSelect);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onMapSelectRef.current = onMapSelect;
  }, [onMapSelect]);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = new Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [100.5534, 13.9127],
      zoom: 14,
      pitch: 55,
      bearing: -12,
      maxPitch: 75,
      attributionControl: true,
    });
    mapRef.current = map;
    onReady(map);
    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-left');
    map.on('error', event => {
      console.error('MapLibre error:', event.error);
      setMapError('โหลดข้อมูลแผนที่ 3D ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ');
      onUnavailableRef.current();
    });

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
      const layers = map.getStyle().layers || [];
      const buildingLayer = layers.find(layer => layer.id === 'building-3d' || layer.type === 'fill-extrusion');
      if (!map.getSource('osm-raster-fallback')) {
        map.addSource('osm-raster-fallback', {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        });
        map.addLayer({
          id: 'osm-raster-fallback-layer',
          type: 'raster',
          source: 'osm-raster-fallback',
          paint: { 'raster-opacity': 0.9 },
        }, buildingLayer?.id);
      }
      if (buildingLayer) {
        map.setPaintProperty(buildingLayer.id, 'fill-extrusion-height', ['coalesce', ['get', 'render_height'], ['get', 'height'], 10]);
        map.setPaintProperty(buildingLayer.id, 'fill-extrusion-base', ['coalesce', ['get', 'render_min_height'], 0]);
        map.setPaintProperty(buildingLayer.id, 'fill-extrusion-color', '#aebdaf');
        map.setPaintProperty(buildingLayer.id, 'fill-extrusion-opacity', 0.92);
      } else if (map.getSource('openmaptiles')) {
        map.addLayer({
          id: 'impex-3d-buildings',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#aebdaf',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.92,
          },
        });
      }
      fallbackTimerRef.current = window.setTimeout(() => {
        if (!map.areTilesLoaded()) onUnavailableRef.current();
      }, 4500);
    });

    const handleClick = event => {
      onMapSelectRef.current([event.lngLat.lat, event.lngLat.lng]);
    };
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      markersRef.current.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
      onReady(null);
    };
  }, [onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMaxBounds(limitedBounds ? [[limitedBounds[0][1], limitedBounds[0][0]], [limitedBounds[1][1], limitedBounds[1][0]]] : null);
  }, [limitedBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const addMarker = (position, className, clickHandler, image) => {
      const marker = new Marker({ element: createMascotElement(className, image), anchor: 'bottom' })
        .setLngLat([position[1], position[0]])
        .addTo(map);
      if (clickHandler) marker.getElement().addEventListener('click', clickHandler);
      markersRef.current.push(marker);
    };

    pins.filter(pin => pin.status === 'active').forEach(pin => {
      const category = pin.type || pin.category;
      const image = category === 'emergency'
        ? '/images/5-transparent.png'
        : category === 'traffic'
          ? '/images/3-transparent.png'
          : category === 'cctv'
            ? '/images/cctv.png'
          : '/images/2.png';
      addMarker([pin.lat, pin.lng], `free-map-pin${image ? ' free-map-emergency' : ''}`, () => onPinClick(pin), image);
    });
    if (userPosition) addMarker(userPosition, 'free-map-user');
    if (selectedPosition) addMarker(selectedPosition, 'free-map-selected');
  }, [pins, userPosition, selectedPosition, onPinClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const data = { type: 'FeatureCollection', features: cameras.map(camera => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coverageCone(camera).map(([lat, lng]) => [lng, lat])] } })) };
    if (!map.getSource('cctv-cones')) {
      map.addSource('cctv-cones', { type: 'geojson', data });
      map.addLayer({ id: 'cctv-cones', type: 'fill', source: 'cctv-cones', paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.18 } });
    } else map.getSource('cctv-cones').setData(data);
    const markers = cameras.map(camera => {
      const element = document.createElement('button');
      element.type = 'button'; element.className = `cctv-marker ${camera.status === 'online' ? 'is-online' : ''}`;
      element.innerHTML = CAMERA_ICON; element.setAttribute('aria-label', `CCTV · ${camera.status}`);
      element.addEventListener('click', event => { event.stopPropagation(); onCameraClick(camera); });
      return new Marker({ element, anchor: 'bottom' }).setLngLat([camera.location.lng, camera.location.lat]).addTo(map);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [cameras, onCameraClick, mapLoaded]);

  return (
    <div ref={containerRef} className="free-3d-map" aria-label="แผนที่ 3 มิติ">
      {mapError && <div className="free-map-error">{mapError}</div>}
    </div>
  );
}
