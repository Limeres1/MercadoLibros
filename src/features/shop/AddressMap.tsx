import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { divIcon, map as createMap, marker as createMarker, tileLayer } from 'leaflet';

import { ADDRESS_MAP_ZOOM, MAP_TILES } from '@/constants/geo';
import { GeoPoint } from '@/services/geocoding';

import 'leaflet/dist/leaflet.css';

const PIN_ICON = divIcon({
  className: '',
  html: '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;background:#d97706;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.45);transform:rotate(-45deg)"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface AddressMapProps {
  point: GeoPoint;
  onMove: (point: GeoPoint) => void;
}

const AddressMap: React.FC<AddressMapProps> = ({ point, onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onMoveRef = useRef(onMove);
  const initialPointRef = useRef(point);

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const initial = initialPointRef.current;
    const leafletMap = createMap(containerRef.current, { scrollWheelZoom: false }).setView(
      [initial.lat, initial.lng],
      ADDRESS_MAP_ZOOM,
    );
    tileLayer(MAP_TILES.url, { attribution: MAP_TILES.attribution, maxZoom: 19 }).addTo(leafletMap);
    const pin = createMarker([initial.lat, initial.lng], { draggable: true, icon: PIN_ICON, keyboard: true }).addTo(
      leafletMap,
    );
    pin.on('dragend', () => {
      const position = pin.getLatLng();
      onMoveRef.current({ lat: position.lat, lng: position.lng });
    });
    leafletMap.on('click', event => {
      pin.setLatLng(event.latlng);
      onMoveRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    mapRef.current = leafletMap;
    markerRef.current = pin;
    return () => {
      leafletMap.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const current = markerRef.current?.getLatLng();
    if (current && current.lat === point.lat && current.lng === point.lng) return;
    markerRef.current?.setLatLng([point.lat, point.lng]);
    mapRef.current?.setView([point.lat, point.lng], ADDRESS_MAP_ZOOM);
  }, [point]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa de la dirección de envío. Arrastrá el marcador para ajustar el punto."
      className="h-48 w-full overflow-hidden rounded-lg border border-slate-300"
    />
  );
};

export default AddressMap;
