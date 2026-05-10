import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

interface RouteViewerProps {
  pickup: [number | null, number | null];
  dropoff: [number | null, number | null];
  pickupName?: string;
  dropoffName?: string;
}

// Validate that a coordinate pair is usable
function isValidCoord(coord: [number | null, number | null]): coord is [number, number] {
  return (
    coord != null &&
    typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
    !isNaN(coord[0]) && !isNaN(coord[1]) &&
    coord[0] !== 0 && coord[1] !== 0 &&
    coord[0] >= -90 && coord[0] <= 90 &&
    coord[1] >= -180 && coord[1] <= 180
  );
}

// Component to fit bounds
function FitBounds({ pickup, dropoff }: { pickup: [number, number]; dropoff: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    try {
      const bounds = L.latLngBounds([pickup, dropoff]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      // Silently ignore invalid bounds
    }
  }, [pickup, dropoff, map]);
  return null;
}

export function RouteViewer({ pickup, dropoff, pickupName, dropoffName }: RouteViewerProps) {
  const validPickup = isValidCoord(pickup);
  const validDropoff = isValidCoord(dropoff);

  // Fallback UI when coordinates are missing
  if (!validPickup || !validDropoff) {
    return (
      <div className="h-[120px] w-full rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2">
        <MapPin className="w-5 h-5 text-slate-300 dark:text-white/20" />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
            Tiada Koordinat Peta
          </p>
          {(pickupName || dropoffName) && (
            <p className="text-xs font-bold text-slate-500 dark:text-white/40 mt-1 max-w-[200px] truncate">
              {pickupName} → {dropoffName}
            </p>
          )}
        </div>
      </div>
    );
  }

  const center: [number, number] = [
    ((pickup as [number, number])[0] + (dropoff as [number, number])[0]) / 2,
    ((pickup as [number, number])[1] + (dropoff as [number, number])[1]) / 2,
  ];

  return (
    <div className="h-[200px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-white/10 z-0 relative">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={pickup as [number, number]} icon={pickupIcon}>
          <Popup>Pickup{pickupName ? `: ${pickupName}` : ''}</Popup>
        </Marker>
        <Marker position={dropoff as [number, number]} icon={dropoffIcon}>
          <Popup>Dropoff{dropoffName ? `: ${dropoffName}` : ''}</Popup>
        </Marker>
        <FitBounds pickup={pickup as [number, number]} dropoff={dropoff as [number, number]} />
      </MapContainer>
    </div>
  );
}
