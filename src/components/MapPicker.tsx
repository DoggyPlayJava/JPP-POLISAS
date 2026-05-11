import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, Loader } from 'lucide-react';

// Fix for default leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Reverse geocode using Nominatim (free, no API key)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ms`,
      { headers: { 'User-Agent': 'JPP-POLISAS-PolyRider/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.amenity ||
      addr.building ||
      addr.road ||
      addr.neighbourhood ||
      addr.suburb ||
      addr.village ||
      addr.town ||
      addr.city ||
      data.display_name?.split(',')[0] ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface MapPickerProps {
  position: [number, number] | null;
  onPositionChange: (pos: [number, number]) => void;
  onNameChange?: (name: string) => void; // NEW: auto-fills the text input
  label?: string; // e.g. "Pickup" or "Dropoff"
}

function LocationMarker({
  position,
  onPick,
}: {
  position: [number, number] | null;
  onPick: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={customIcon} /> : null;
}

export function MapPicker({ position, onPositionChange, onNameChange, label }: MapPickerProps) {
  const defaultCenter: [number, number] = [3.8625, 103.3153]; // POLISAS
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  const handlePick = async (pos: [number, number]) => {
    onPositionChange(pos);
    setResolvedName(null);
    if (onNameChange) {
      setIsGeocoding(true);
      const name = await reverseGeocode(pos[0], pos[1]);
      setResolvedName(name);
      onNameChange(name);
      setIsGeocoding(false);
    }
  };

  // Clear resolved name if position is reset
  useEffect(() => {
    if (!position) setResolvedName(null);
  }, [position]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-white/10">
        <MapContainer
          center={position || defaultCenter}
          zoom={16}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPick={handlePick} />
        </MapContainer>

        {/* Instruction badge */}
        <div className="absolute bottom-3 left-0 right-0 z-[10] flex justify-center pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full">
            Ketik pada peta untuk pin lokasi
          </div>
        </div>
      </div>

      {/* Live address preview — shows reverse geocoded name */}
      {(position || isGeocoding) && (
        <div className="mt-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-start gap-3 min-h-[52px]">
          {isGeocoding ? (
            <>
              <Loader className="w-4 h-4 text-amber-500 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-0.5">
                  {label || 'Lokasi'} Dipilih
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-white/50 italic">
                  Mengesan nama lokasi...
                </p>
              </div>
            </>
          ) : resolvedName ? (
            <>
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-0.5">
                  {label || 'Lokasi'} Dipilih
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {resolvedName}
                </p>
              </div>
            </>
          ) : position ? (
            <>
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-0.5">
                  Koordinat
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-white/60">
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
