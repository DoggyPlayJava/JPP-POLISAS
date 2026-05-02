// ============================================================
// KlkHotspotMap — Peta Hotspot Kawasan Kediaman Pelajar
// Menggunakan react-leaflet + OpenStreetMap (free)
// Lazy loaded — import secara dynamic dalam KlkDashboard
// ============================================================
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface KawasanData {
  name: string;
  latitude: number;
  longitude: number;
  count: number;
}

interface Props {
  data: KawasanData[];
}

// Pre-defined coordinates untuk kawasan Kuantan/sekitar POLISAS
// Akan dikemaskini dari DB (klk_kawasan) bila MCP on
const DEFAULT_COORDS: Record<string, [number, number]> = {
  'SEMAMBU':           [3.8172, 103.3414],
  'TAMAN TAS':         [3.8103, 103.3320],
  'KUBANG BUAYA':      [3.7899, 103.3219],
  'ALOR AKAR':         [3.7500, 103.2900],
  'AIR PUTIH':         [3.8400, 103.3600],
  'BUKIT SEKILAU':     [3.8217, 103.3289],
  'INDERA MAHKOTA':    [3.8050, 103.3180],
  'SUNGAI ISAP':       [3.8300, 103.3450],
  'BUKIT RANGIN':      [3.8100, 103.3100],
  'PERMATANG BADAK':   [3.7800, 103.2800],
  'PELINDUNG':         [3.8500, 103.3700],
  'BESERAH':           [3.8650, 103.3800],
  'BUKIT GOH':         [3.7600, 103.2700],
  'KOTASAS':           [3.7400, 103.2600],
  'BANDAR DAMANSARA':  [3.8000, 103.3000],
};

function getHotspotColor(count: number): string {
  if (count >= 20) return '#EF4444'; // Hot — merah
  if (count >= 10) return '#F59E0B'; // Medium — kuning
  if (count >= 5)  return '#60A5FA'; // Mild — biru
  return '#22C55E';                   // Cool — hijau
}

function getRadius(count: number): number {
  return Math.max(8, Math.min(30, Math.sqrt(count + 1) * 6));
}

export function KlkHotspotMap({ data }: Props) {
  // Merge coords — gunakan data dari DB jika ada, fallback ke DEFAULT_COORDS
  const markers = data
    .filter(d => d.latitude || DEFAULT_COORDS[d.name])
    .map(d => ({
      ...d,
      lat: d.latitude || DEFAULT_COORDS[d.name]?.[0] || 0,
      lng: d.longitude || DEFAULT_COORDS[d.name]?.[1] || 0,
    }))
    .filter(d => d.lat && d.lng);

  // Juga tunjuk kawasan yang ada dalam DEFAULT_COORDS tapi tiada data (count=0)
  const existingNames = new Set(data.map(d => d.name));
  const emptyMarkers = Object.entries(DEFAULT_COORDS)
    .filter(([name]) => !existingNames.has(name))
    .map(([name, [lat, lng]]) => ({ name, lat, lng, count: 0, latitude: lat, longitude: lng }));

  const allMarkers = [...markers, ...emptyMarkers];

  return (
    <MapContainer
      center={[3.8103, 103.3320]}
      zoom={12}
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      {allMarkers.map(m => (
        <CircleMarker
          key={m.name}
          center={[m.lat, m.lng]}
          radius={getRadius(m.count)}
          pathOptions={{
            color: getHotspotColor(m.count),
            fillColor: getHotspotColor(m.count),
            fillOpacity: m.count > 0 ? 0.7 : 0.15,
            weight: m.count > 0 ? 2 : 1,
            opacity: m.count > 0 ? 0.9 : 0.3,
          }}
        >
          <Tooltip permanent={m.count >= 10} direction="top" offset={[0, -8]}>
            <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700 }}>
              <strong>{m.name}</strong>
              <br />
              {m.count > 0 ? `${m.count} pelajar` : 'Tiada data'}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
