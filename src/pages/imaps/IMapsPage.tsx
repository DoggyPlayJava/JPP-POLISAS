import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ArrowLeft, Search, Navigation, MapPin, Building2, Layers, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom User Location Icon
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Destination Icon
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default Building Icon
const buildingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when destination changes
function MapRecenter({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// Calculate ETA based on straight-line distance (haversine) and walking speed
function calculateWalkingETA(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c;
  
  const walkingSpeedKmH = 4.5;
  const timeMinutes = Math.ceil((distance / walkingSpeedKmH) * 60);
  
  // Add 1 min penalty for indoor finding
  return timeMinutes + 1;
}

interface Building {
  id: string;
  name: string;
  code: string;
  center_lat: number;
  center_lng: number;
  drone_image_url: string;
}

interface Location {
  id: string;
  room_code: string;
  floor_level: number;
  direction_text: string;
  building: Building;
}

export function IMapsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // POLISAS Center Coordinates
  const polisasCenter: [number, number] = [3.8569, 103.3283];

  useEffect(() => {
    fetchAllBuildings();
    fetchLocations('');
  }, []);

  const fetchAllBuildings = async () => {
    const { data } = await supabase.from('imaps_buildings').select('*');
    if (data) setAllBuildings(data);
  };

  const fetchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const q = query.toLowerCase();
      // Search buildings locally
      const matchedBuildings = allBuildings.filter(b => 
        b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
      );
      
      const buildingResults = matchedBuildings.map(b => ({
        id: `b-${b.id}`,
        room_code: b.name,
        floor_level: 0,
        direction_text: '',
        building: b
      })) as unknown as Location[];

      const { data, error } = await supabase
        .from('imaps_locations')
        .select(`
          id, room_code, floor_level, direction_text, search_tags,
          building:building_id (
            id, name, code, center_lat, center_lng, drone_image_url
          )
        `)
        .or(`room_code.ilike.%${query}%,search_tags.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const formattedData = (data || []).map(item => ({
        ...item,
        building: Array.isArray(item.building) ? item.building[0] : item.building
      })) as Location[];

      // Combine building results and location results
      setSearchResults([...buildingResults, ...formattedData]);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Gagal membuat carian.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLocations(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setActiveBuilding(loc.building);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectBuildingMapMarker = (b: Building) => {
    setSelectedLocation(null);
    setActiveBuilding(b);
  };

  const locateUser = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error('GPS tidak disokong oleh peranti anda.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
        toast.success('Lokasi berjaya dikesan!');
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Sila benarkan akses GPS untuk fungsi laluan.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const etaMinutes = useMemo(() => {
    if (userLocation && activeBuilding?.center_lat) {
      return calculateWalkingETA(
        userLocation[0], userLocation[1], 
        activeBuilding.center_lat, activeBuilding.center_lng
      );
    }
    return null;
  }, [userLocation, activeBuilding]);

  return (
    <div className="h-screen w-screen flex flex-col relative bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── HEADER & SEARCH BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-safe-top pointer-events-none">
        <div className="max-w-md mx-auto space-y-4 pointer-events-auto">
          {/* Top Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-white shrink-0 hover:scale-105 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2.5 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kelas (Cth: A301, JKM)..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[40vh] overflow-y-auto"
              >
                {searchResults.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-4 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-white">{loc.room_code}</p>
                      <p className="text-xs font-bold text-slate-500">{loc.building?.name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer 
          center={polisasCenter} 
          zoom={16} 
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {activeBuilding?.center_lat && (
            <MapRecenter 
              center={[activeBuilding.center_lat, activeBuilding.center_lng]} 
              zoom={18} 
            />
          )}

          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
          )}

          {/* Render All Buildings */}
          {allBuildings.map(b => {
            if (!b.center_lat) return null;
            const isActive = activeBuilding?.id === b.id;
            return (
              <Marker 
                key={b.id}
                position={[b.center_lat, b.center_lng]}
                icon={isActive ? destinationIcon : buildingIcon}
                eventHandlers={{
                  click: () => handleSelectBuildingMapMarker(b)
                }}
              >
                <Popup>{b.name} ({b.code})</Popup>
              </Marker>
            );
          })}

          {/* Draw Polyline if both user and destination are known */}
          {userLocation && activeBuilding && activeBuilding.center_lat && (
            <Polyline 
              positions={[
                userLocation,
                [activeBuilding.center_lat, activeBuilding.center_lng]
              ]}
              color="#3b82f6"
              weight={4}
              dashArray="10, 10"
              className="animate-pulse"
            />
          )}
        </MapContainer>
      </div>

      {/* ── BOTTOM CONTROLS & INFO SHEET ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pointer-events-none pb-safe">
        <div className="max-w-md mx-auto pointer-events-auto flex flex-col gap-4">
          
          {/* Map Controls */}
          <div className="flex justify-between items-end">
            {etaMinutes !== null && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl px-4 py-2 border border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white">
                  Anggaran: <span className="text-sky-500">{etaMinutes} min</span>
                </span>
              </motion.div>
            )}
            <div className="flex-1" />
            <button
              onClick={locateUser}
              className={cn(
                "w-12 h-12 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all shrink-0",
                isLocating 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                  : userLocation 
                    ? "bg-blue-500 text-white border-blue-500" 
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:scale-105 active:scale-95"
              )}
            >
              <Navigation className={cn("w-5 h-5", isLocating && "animate-spin")} />
            </button>
          </div>

          {/* Info Card / Drone View */}
          <AnimatePresence>
            {activeBuilding && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                {/* Drone Image Area */}
                <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 relative">
                  {activeBuilding.drone_image_url ? (
                    <img 
                      src={activeBuilding.drone_image_url} 
                      alt="Drone View"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Building2 className="w-10 h-10 mb-2 opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Tiada Imej Dron</span>
                    </div>
                  )}
                  {selectedLocation && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                      PANDUAN INDOOR
                    </div>
                  )}
                </div>

                {/* Details Area */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {selectedLocation ? selectedLocation.room_code : activeBuilding.name}
                      </h2>
                      {selectedLocation && (
                        <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                          <Building2 className="w-4 h-4" /> {activeBuilding.name}
                        </p>
                      )}
                      {!selectedLocation && (
                        <p className="text-sm font-bold text-sky-500 flex items-center gap-1.5 mt-1">
                          Kod: {activeBuilding.code}
                        </p>
                      )}
                    </div>
                    {selectedLocation && (
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center shrink-0 ml-3">
                        <Layers className="w-4 h-4" />
                        <span className="text-[10px] font-black">T{selectedLocation.floor_level}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                    <Navigation className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
                      {selectedLocation 
                        ? (selectedLocation.direction_text || "Sila rujuk papan tanda di pintu masuk bangunan.")
                        : "Sila gunakan fungsi carian di atas untuk mendapatkan panduan arah kelas yang spesifik."}
                    </p>
                  </div>

                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBuilding.center_lat},${activeBuilding.center_lng}`, '_blank')}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-sm transition-colors"
                  >
                    <MapPin className="w-4 h-4" /> Buka di Google Maps
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

