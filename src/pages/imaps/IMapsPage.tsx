import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Search, Navigation, MapPin, Building2, Layers, Clock, X, Menu, 
  ChevronDown, ChevronRight, Share2, Coffee, Moon, Droplets, 
  CreditCard, BookOpen, ImageIcon, Map as MapIcon, DoorOpen,
  CloudRain, Sun
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/layout/BottomNav';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const buildingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ── Low-end device detection (run once on mount) ──────────────────────────────
function isLowEndDevice(): boolean {
  const lowCpu = navigator.hardwareConcurrency <= 4;
  const lowRam = (navigator as any).deviceMemory != null && (navigator as any).deviceMemory < 4;
  const conn = (navigator as any).connection;
  const slowNet = conn && ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return lowCpu || lowRam || slowNet || prefersReduced;
}

function MapRecenter({ lat, lng, zoom }: { lat: number, lng: number, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

// Smooth GPS follow during navigation
// Low-end: instant setView (no animation cost). High-end: smooth panTo.
function MapFollower({ lat, lng, isLowEnd }: { lat: number, lng: number, isLowEnd: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isLowEnd) {
      map.setView([lat, lng], map.getZoom(), { animate: false });
    } else {
      map.panTo([lat, lng], { animate: true, duration: 0.5, easeLinearity: 0.5 });
    }
  }, [lat, lng, map, isLowEnd]);
  return null;
}

// One-shot initial zoom when navigation starts — flies once then calls onDone
function MapFlyOnce({ lat, lng, zoom, onDone }: { lat: number, lng: number, zoom: number, onDone: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only
  return null;
}

// Detects when the user manually drags the map → signals to exit follow mode
function MapDragDetector({ onDrag }: { onDrag: () => void }) {
  useMapEvents({
    dragstart: () => onDrag(),
  });
  return null;
}

const getCustomIcon = (code: string, isActive: boolean, lowEnd = false) => {
  // Low-end: avoid backdrop-filter (creates extra GPU compositing layer per marker)
  const labelStyle = lowEnd
    ? `background-color: rgba(15, 23, 42, 0.95); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.5px; z-index: ${isActive ? 1000 : 10}; position: relative;`
    : `background-color: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.5px; z-index: ${isActive ? 1000 : 10}; position: relative;`;

  const html = `
    <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
      <div style="width: 18px; height: 18px; border-radius: 50%; background-color: ${isActive ? '#ef4444' : '#0ea5e9'}; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); z-index: ${isActive ? 1000 : 10}; position: relative;">
        ${isActive ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background: white; border-radius: 50%;"></div>' : ''}
      </div>
      <div style="${labelStyle}">
        ${code}
      </div>
    </div>
  `;
  return L.divIcon({
    className: '',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function calculateWalkingETA(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c;
  const timeMinutes = Math.ceil((distance / 4.5) * 60);
  return timeMinutes + 1;
}

function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dPhi = (lat2 - lat1) * Math.PI/180;
  const dLambda = (lon2 - lon1) * Math.PI/180;

  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface Building {
  id: string;
  name: string;
  code: string;
  center_lat: number;
  center_lng: number;
  zone_name?: string | null;
  drone_image_url: string;
  is_facility?: boolean;
  facility_type?: string;
  op_start?: string;
  op_end?: string;
  floorplan_image_url?: string;
  entrance_image_url?: string;
}

interface Location {
  id: string;
  room_code: string;
  floor_level: number;
  direction_text: string;
  image_url?: string;
  building: Building;
  building_id: string;
  op_start?: string;
  op_end?: string;
}

interface ZoneMarkerInfo {
  zone_name: string;
  lat: number;
  lng: number;
  buildings: Building[];
}

export function IMapsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasArrivedManual, setHasArrivedManual] = useState(false);
  const [hasZoomedToNavigation, setHasZoomedToNavigation] = useState(false);
  // Follow mode: true = map follows user; false = user panned away (show re-center button)
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  // Run device detection once on mount
  const isLowEnd = React.useRef(isLowEndDevice()).current;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'akademik' | 'fasiliti'>('akademik');
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [expandedFacilityType, setExpandedFacilityType] = useState<string | null>(null);
  const [expandedFloorLevel, setExpandedFloorLevel] = useState<string | null>(null);
  
  const [mapZoom, setMapZoom] = useState(16);
  const [zones, setZones] = useState<ZoneMarkerInfo[]>([]);

  const [activeImageTab, setActiveImageTab] = useState<'drone' | 'entrance' | 'floorplan' | 'room'>('drone');
  const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [weather, setWeather] = useState<{ isRaining: boolean, isHot: boolean } | null>(null);

  const polisasCenter: [number, number] = [3.8625, 103.3153];

  useEffect(() => {
    fetchInitialData();
    
    // Fetch basic weather for Kuantan (POLISAS coords)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=3.8168&longitude=103.3317&current_weather=true')
      .then(res => res.json())
      .then(data => {
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          const temp = data.current_weather.temperature;
          setWeather({
            isRaining: code >= 50 && code <= 99,
            isHot: temp >= 32
          });
        }
      }).catch(e => console.log('Weather fetch failed', e));
  }, []);

  useEffect(() => {
    const zoneMap: Record<string, Building[]> = {};
    allBuildings.forEach(b => {
      if (b.zone_name && b.center_lat && b.center_lng) {
        if (!zoneMap[b.zone_name]) zoneMap[b.zone_name] = [];
        zoneMap[b.zone_name].push(b);
      }
    });

    const parsedZones: ZoneMarkerInfo[] = [];
    Object.entries(zoneMap).forEach(([zone_name, buildings]) => {
      const sumLat = buildings.reduce((acc, b) => acc + b.center_lat, 0);
      const sumLng = buildings.reduce((acc, b) => acc + b.center_lng, 0);
      parsedZones.push({
        zone_name,
        lat: sumLat / buildings.length,
        lng: sumLng / buildings.length,
        buildings
      });
    });
    setZones(parsedZones);
  }, [allBuildings]);

  const ZoomTracker = () => {
    useMapEvents({
      zoomend: (e) => {
        setMapZoom(e.target.getZoom());
      }
    });
    return null;
  };

  const fetchInitialData = async () => {
    // Check if user is logged in and is an admin/JPP member
    // This is optional — page works fully for unauthenticated users too
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile && ['JPP', 'SUPER_ADMIN_JPP', 'ADMIN'].includes(profile.role)) {
          setIsAdmin(true);
        }
      }
    } catch {
      // Ignore auth errors — page is public, auth is optional
    }

    // Fetch buildings — public RLS policy allows anon access
    const { data: bData, error: bError } = await supabase
      .from('imaps_buildings')
      .select('*')
      .order('name');
    if (bError) {
      console.error('iMaps: Failed to load buildings:', bError.message);
    }
    if (bData) setAllBuildings(bData);
    
    // Fetch all locations — public RLS policy allows anon access
    const { data: lData, error: lError } = await supabase
      .from('imaps_locations')
      .select('*, building:building_id(*)')
      .order('floor_level');
    if (lError) {
      console.error('iMaps: Failed to load locations:', lError.message);
    }
    const formatted = (lData || []).map((item: any) => ({
      ...item,
      building: Array.isArray(item.building) ? item.building[0] : item.building
    }));
    if (formatted.length > 0) {
      setAllLocations(formatted);
    }
    
    // Handle Deep Link (?b=building_id or ?room=room_id)
    const searchParams = new URLSearchParams(window.location.search);
    const bId = searchParams.get('b');
    const rId = searchParams.get('room');
    
    if (rId && formatted.length > 0) {
      // Find the room
      const targetRoom = formatted.find((r: any) => r.id === rId);
      if (targetRoom) {
        setTimeout(() => {
          setSelectedLocation(targetRoom);
          setActiveBuilding(targetRoom.building);
          setActiveImageTab(targetRoom.image_url ? 'room' : 'drone');
        }, 300);
      }
    } else if (bId && bData) {
      const targetBuilding = bData.find(b => b.id === bId);
      if (targetBuilding) {
        setTimeout(() => {
          setActiveBuilding(targetBuilding);
          setActiveImageTab('drone');
        }, 300);
      }
    }
  };

  const fetchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const q = query.toLowerCase();
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
          id, room_code, floor_level, direction_text, search_tags, image_url,
          building:building_id (
            id, name, code, center_lat, center_lng, drone_image_url, zone_name
          )
        `)
        .or(`room_code.ilike.%${query}%,search_tags.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const formattedData = (data || []).map(item => ({
        ...item,
        building: Array.isArray(item.building) ? item.building[0] : item.building
      })) as Location[];

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

  useEffect(() => {
    if (activeFilter) {
      const filter = activeFilter.toLowerCase();
      let filtered = allBuildings.filter(b => {
        if (!b.is_facility) return false;
        const bType = b.facility_type?.toLowerCase() || '';
        return bType === filter || 
               (filter === 'cafe' && bType === 'kafe') ||
               (filter === 'kafe' && bType === 'cafe') ||
               (filter === 'surau' && bType.includes('surau')) ||
               (filter === 'toilet' && bType === 'tandas') ||
               (filter === 'tandas' && bType === 'toilet');
      });
      
      const mappedBuildings = filtered.map(b => {
        let eta = null;
        if (userLocation && b.center_lat) {
          eta = calculateWalkingETA(userLocation[0], userLocation[1], b.center_lat, b.center_lng);
        }
        return {
          id: `b-${b.id}`,
          room_code: b.name,
          floor_level: eta, // We'll hijack floor_level temporarily to store ETA for sorting/display
          direction_text: '',
          building: b
        } as unknown as Location;
      });

      // Juga cari Lokasi (kelas/bilik) yang sepadan dengan filter (melalui nama atau tag carian)
      const locationKeywords = {
        cafe: ['kafe', 'cafe', 'kantin', 'makan'],
        surau: ['surau', 'masjid', 'solat'],
        toilet: ['tandas', 'toilet', 'washroom']
      };
      
      const targetKeywords = locationKeywords[filter as keyof typeof locationKeywords] || [filter];
      
      const matchedLocations = allLocations.filter(loc => {
        const textToSearch = `${loc.room_code} ${loc.search_tags || ''}`.toLowerCase();
        return targetKeywords.some(keyword => textToSearch.includes(keyword));
      });

      const mappedLocations = matchedLocations.map(loc => {
        let eta = null;
        if (userLocation && loc.building?.center_lat) {
          eta = calculateWalkingETA(userLocation[0], userLocation[1], loc.building.center_lat, loc.building.center_lng);
        }
        return {
          ...loc,
          floor_level: eta // Use the hijacked floor_level for ETA sorting to mix perfectly with buildings
        };
      });

      const combined = [...mappedBuildings, ...mappedLocations];

      // Sort by ETA (closest first) if GPS is available
      if (userLocation) {
        combined.sort((a, b) => (a.floor_level || 999) - (b.floor_level || 999));
      }

      setSearchResults(combined);
    } else if (!searchQuery) {
      setSearchResults([]);
    }
  }, [activeFilter, userLocation, allBuildings]);

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setActiveBuilding(loc.building);
    setActiveImageTab(loc.image_url ? 'room' : 'drone');
    setCurrentStep(0);
    setSearchQuery('');
    setSearchResults([]);
    setActiveFilter(null);
    setIsSidebarOpen(false);
  };

  const handleSelectBuildingMapMarker = (b: Building) => {
    setSelectedLocation(null);
    setActiveBuilding(b);
  };

  const dismissCard = () => {
    setActiveBuilding(null);
    setSelectedLocation(null);
    setIsNavigating(false);
    setCurrentStep(0);
    setHasArrivedManual(false);
    setHasZoomedToNavigation(false);
    setIsFollowingUser(false);
  };

  const startNavigation = () => {
    setIsNavigating(true);
    setHasArrivedManual(false);
    setHasZoomedToNavigation(false);
    setIsFollowingUser(false); // Will become true after MapFlyOnce completes
    // NOTE: Do NOT call locateUser() here.
    // watchPosition (in useEffect below) handles first fix + continuous tracking.
    // Calling getCurrentPosition separately → double-trigger → white screen.
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

  // Continuous GPS Tracking during Navigation
  useEffect(() => {
    let watchId: number;

    if (isNavigating && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Continuous GPS error:", error);
        },
        {
          // Always use high accuracy GPS — arrival detection threshold is 30m.
          // Network GPS (10-50m error) would cause missed arrivals on low-end devices.
          // Low-end gets a longer timeout (more patient for first GPS fix),
          // but accuracy is NEVER sacrificed.
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: isLowEnd ? 10000 : 5000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isNavigating, isLowEnd]);

  const etaMinutes = useMemo(() => {
    if (userLocation && activeBuilding?.center_lat) {
      return calculateWalkingETA(
        userLocation[0], userLocation[1], 
        activeBuilding.center_lat, activeBuilding.center_lng
      );
    }
    return null;
  }, [userLocation, activeBuilding]);

  // Sidebar Grouping Logic
  const getLocationsForBuilding = (bId: string) => allLocations.filter(l => l.building_id === bId);
  const getFloorsForBuilding = (bId: string) => {
    const locs = getLocationsForBuilding(bId);
    const floors = Array.from(new Set(locs.map(l => l.floor_level))).sort((a, b) => a - b);
    return floors;
  };

  // Live Status Logic
  const checkIsOpen = (start?: string, end?: string) => {
    if (!start || !end) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = start.split(':').map(Number);
    const startMins = startH * 60 + startM;
    
    const [endH, endM] = end.split(':').map(Number);
    const endMins = endH * 60 + endM;
    
    return currentMins >= startMins && currentMins <= endMins;
  };

  const handleShare = () => {
    if (selectedLocation) {
      const url = `${window.location.origin}${window.location.pathname}?room=${selectedLocation.id}`;
      navigator.clipboard.writeText(`📍 Lihat lokasi bilik/kelas ${selectedLocation.room_code} di iMaps POLISAS:\n${url}`);
      toast.success('Pautan kelas disalin!');
    } else if (activeBuilding) {
      const url = `${window.location.origin}${window.location.pathname}?b=${activeBuilding.id}`;
      navigator.clipboard.writeText(`📍 Lihat lokasi ${activeBuilding.name} di iMaps POLISAS:\n${url}`);
      toast.success('Pautan bangunan disalin!');
    }
  };

  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
      if (!userLocation) {
        locateUser(); // Auto trigger GPS to calculate nearest facility
      }
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col relative bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* ── HEADER & SEARCH BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-safe-top pointer-events-none">
        <div className="max-w-md mx-auto space-y-3 pointer-events-auto">
          {/* Top Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-white shrink-0 hover:scale-105 active:scale-95 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2.5 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kelas (Cth: A301, JKM)..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveFilter(null);
                }}
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveFilter(null)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shadow-sm", !activeFilter ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}
            >
              Semua
            </button>
            <button onClick={() => handleFilterClick('cafe')} className={cn("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", activeFilter === 'cafe' ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}>
              <Coffee className="w-3.5 h-3.5" /> Kafe
            </button>
            <button onClick={() => handleFilterClick('surau')} className={cn("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", activeFilter === 'surau' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}>
              <Moon className="w-3.5 h-3.5" /> Surau
            </button>
            <button onClick={() => handleFilterClick('toilet')} className={cn("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", activeFilter === 'toilet' ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}>
              <Droplets className="w-3.5 h-3.5" /> Tandas
            </button>
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
                      <div className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {loc.room_code}
                        {loc.building?.zone_name && (
                          <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase">
                            Zon {loc.building.zone_name}
                          </span>
                        )}
                        {loc.op_start && loc.op_end && (
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-sm font-black tracking-wider uppercase",
                            checkIsOpen(loc.op_start, loc.op_end) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}>
                            {checkIsOpen(loc.op_start, loc.op_end) ? "BUKA" : "TUTUP"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-2 mt-0.5">
                        {loc.id.startsWith('b-') ? 'Bangunan' : loc.building?.name}
                        {activeFilter && loc.floor_level > 0 && (
                          <span className="text-sky-500 flex items-center gap-1 bg-sky-500/10 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> {loc.floor_level} min
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 w-full relative z-0 pb-20">
        <MapContainer 
          center={polisasCenter} 
          zoom={16} 
          className="w-full h-full"
          zoomControl={false}
          preferCanvas={true}  // All devices: render vector layers (Polyline etc) on canvas → fewer DOM nodes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            maxZoom={20}
            updateWhenZooming={false}       // Only update tiles after zoom ends (saves requests during pinch-zoom)
            updateWhenIdle={isLowEnd}       // Low-end: only update when map stops moving
            keepBuffer={isLowEnd ? 1 : 2}  // Low-end: pre-load 1 tile border vs default 2
          />
          <ZoomTracker />

          {!isNavigating && activeBuilding?.center_lat && (
            <MapRecenter 
              lat={activeBuilding.center_lat - 0.0010}
              lng={activeBuilding.center_lng} 
              zoom={18} 
            />
          )}

          {/* Detect manual drag → exit follow mode, show re-center button */}
          {isNavigating && (
            <MapDragDetector onDrag={() => setIsFollowingUser(false)} />
          )}

          {/* Navigation: fly ONCE to zoom=19 on first GPS fix */}
          {isNavigating && userLocation && !hasZoomedToNavigation && (
            <MapFlyOnce
              lat={userLocation[0]}
              lng={userLocation[1]}
              zoom={19}
              onDone={() => {
                setHasZoomedToNavigation(true);
                setIsFollowingUser(true); // Activate follow mode after initial zoom
              }}
            />
          )}
          {/* Follow mode: smoothly track user after initial zoom */}
          {isNavigating && userLocation && hasZoomedToNavigation && isFollowingUser && (
            <MapFollower lat={userLocation[0]} lng={userLocation[1]} isLowEnd={isLowEnd} />
          )}

          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
          )}

          {/* Render Zones when zoomed out */}
          {mapZoom < 18 && zones.map(z => (
            <Marker 
              key={`zone-${z.zone_name}`}
              position={[z.lat, z.lng]}
              icon={getCustomIcon(z.zone_name, false, isLowEnd)}
              eventHandlers={{
                click: () => {
                  // Apabila zon ditekan, auto-zoom in supaya pecah jadi bangunan
                  const map = z.buildings[0];
                  if (map) {
                     // We just fake an active building select so it centers and zooms in
                     handleSelectBuildingMapMarker(map);
                  }
                }
              }}
            />
          ))}

          {allBuildings.map(b => {
            if (!b.center_lat) return null;
            const isActive = activeBuilding?.id === b.id;
            
            // Sembunyikan bangunan dalam zon kalau masih zoom out, TAPI biarkan kalau bangunan tu tengah aktif (dipilih)
            if (b.zone_name && mapZoom < 18 && !isActive) return null;

            // Jika activeFilter wujud, sembunyikan bangunan yang tak sepadan
            if (activeFilter) {
              const bType = b.facility_type?.toLowerCase() || '';
              const filter = activeFilter.toLowerCase();
              const isMatch = bType === filter || 
                             (filter === 'cafe' && bType === 'kafe') ||
                             (filter === 'kafe' && bType === 'cafe') ||
                             (filter === 'surau' && bType.includes('surau')) ||
                             (filter === 'toilet' && bType === 'tandas') ||
                             (filter === 'tandas' && bType === 'toilet');
              if (!isMatch && !isActive) return null;
            }

            // Sembunyikan fasiliti kecil (seperti Tandas) secara default melainkan difilter atau sedang aktif
            const isTandas = b.facility_type?.toLowerCase() === 'tandas' || b.facility_type?.toLowerCase() === 'toilet';
            const isToiletFilterActive = activeFilter?.toLowerCase() === 'toilet' || activeFilter?.toLowerCase() === 'tandas';
            if (b.is_facility && isTandas && !isToiletFilterActive && !isActive) {
              return null;
            }
            
            return (
              <Marker 
                key={b.id}
                position={[b.center_lat, b.center_lng]}
                icon={getCustomIcon(b.code, isActive, isLowEnd)}
                eventHandlers={{
                  click: () => handleSelectBuildingMapMarker(b)
                }}
              >
              </Marker>
            );
          })}

          {isNavigating && userLocation && activeBuilding && activeBuilding.center_lat && (
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

      {/* ── EXPLORE SIDEBAR ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className={isLowEnd
                ? "absolute inset-0 bg-slate-900/80 z-[10000]"
                : "absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000]"}
            />
            <motion.div 
              initial={isLowEnd ? { opacity: 0 } : { x: '-100%' }}
              animate={isLowEnd ? { opacity: 1 } : { x: 0 }}
              exit={isLowEnd ? { opacity: 0 } : { x: '-100%' }}
              transition={isLowEnd ? { duration: 0.15 } : { type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-80 bg-white dark:bg-slate-900 z-[10001] shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Direktori</h2>
                  <p className="text-xs font-bold text-slate-500">Terokai Bangunan & Kelas</p>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <button onClick={() => setActiveSidebarTab('akademik')} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-all", activeSidebarTab === 'akademik' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Zon / Jabatan</button>
                  <button onClick={() => setActiveSidebarTab('fasiliti')} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-all", activeSidebarTab === 'fasiliti' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Fasiliti Utama</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {activeSidebarTab === 'akademik' && (
                  <>
                    {zones.map(z => {
                      const isZoneExpanded = expandedZone === z.zone_name;
                      return (
                        <div key={`sidebar-zone-${z.zone_name}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                          <button 
                            onClick={() => setExpandedZone(isZoneExpanded ? null : z.zone_name)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Zon {z.zone_name}</p>
                            </div>
                            {isZoneExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </button>
                          
                          <AnimatePresence>
                            {isZoneExpanded && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1">
                                {z.buildings.map(b => (
                                  <button
                                    key={b.id}
                                    onClick={() => {
                                      handleSelectBuildingMapMarker(b);
                                      setIsSidebarOpen(false);
                                    }}
                                    className="w-full py-2 px-3 flex flex-col text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                                  >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{b.name}</span>
                                    <span className="text-[10px] font-black text-slate-400">{b.code}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    
                    {allBuildings.filter(b => !b.zone_name && !b.is_facility).map(b => (
                      <div key={b.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                         <button 
                            onClick={() => {
                              handleSelectBuildingMapMarker(b);
                              setIsSidebarOpen(false);
                            }}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{b.name}</p>
                                <p className="text-[10px] font-black text-slate-400 mt-0.5">{b.code}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                      </div>
                    ))}
                  </>
                )}

                {activeSidebarTab === 'fasiliti' && (() => {
                  const facilityMap: Record<string, Building[]> = {};
                  allBuildings.filter(b => b.is_facility).forEach(b => {
                    const type = b.facility_type || 'Lain-lain';
                    if (!facilityMap[type]) facilityMap[type] = [];
                    facilityMap[type].push(b);
                  });

                  return Object.entries(facilityMap).map(([type, facilities]) => {
                    const isTypeExpanded = expandedFacilityType === type;
                    return (
                      <div key={`facility-type-${type}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => setExpandedFacilityType(isTypeExpanded ? null : type)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{type}</p>
                          </div>
                          {isTypeExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        
                        <AnimatePresence>
                          {isTypeExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1">
                              {facilities.map(b => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    handleSelectBuildingMapMarker(b);
                                    setIsSidebarOpen(false);
                                  }}
                                  className="w-full py-2 px-3 flex flex-col text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                                >
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{b.name}</span>
                                  <span className="text-[10px] font-black text-slate-400">{b.code}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── RE-CENTER BUTTON (visible in free mode during navigation) ── */}
      <AnimatePresence>
        {isNavigating && userLocation && hasZoomedToNavigation && !isFollowingUser && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsFollowingUser(true)}
            className="absolute bottom-[200px] right-4 z-[1001] w-12 h-12 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 active:scale-90 transition-colors"
            title="Kembali ke lokasi saya"
          >
            <Navigation className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── BOTTOM CONTROLS & INFO SHEET ── */}
      <div className="absolute bottom-[70px] sm:bottom-[90px] left-0 right-0 z-[1000] p-3 sm:p-4 pointer-events-none pb-safe">
        <div className="max-w-md mx-auto pointer-events-auto flex flex-col gap-4">
          
          {/* Navigation Active Banner */}
          <AnimatePresence>
            {isNavigating && activeBuilding && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="bg-blue-600 rounded-3xl shadow-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Memandu Arah Ke</p>
                    <p className="text-white font-black text-lg">{selectedLocation ? selectedLocation.room_code : activeBuilding.code}</p>
                    {etaMinutes && (
                      <p className="text-blue-200 text-xs font-bold mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Anggaran: {etaMinutes} minit
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => { setIsNavigating(false); setHasArrivedManual(false); }}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                  >
                    Tamat
                  </button>
                </div>

                {/* Inject Step-By-Step Directions into Active Navigation */}
                {selectedLocation && selectedLocation.direction_text && (
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10 mt-1">
                    <div className="flex gap-3">
                      <Navigation className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        {(() => {
                          const distanceMeters = userLocation && activeBuilding?.center_lat
                            ? calculateDistanceInMeters(userLocation[0], userLocation[1], activeBuilding.center_lat, activeBuilding.center_lng)
                            : null;
                          
                          // Admin bypass removed — use manual "Seterusnya" button or GPS proximity (<= 30m)
                          const hasArrived = hasArrivedManual || (distanceMeters !== null && distanceMeters <= 30);

                          if (!hasArrived) {
                            return (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1 block">
                                  Langkah Luaran (Menuju Bangunan)
                                </span>
                                <p className="text-sm font-bold text-white leading-relaxed mb-3">
                                  Sila ikuti panduan arah pada peta untuk tiba di bangunan ini terlebih dahulu. Panduan dalaman akan dibuka automatik jika jarak &lt; 30m, atau teruskan manual.
                                </p>

                                {distanceMeters !== null && distanceMeters > 200 && weather && (weather.isRaining || weather.isHot) && (
                                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 flex items-start gap-3">
                                    <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                                      {weather.isRaining ? <CloudRain className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-amber-400 mb-0.5">Jarak Agak Jauh ({(distanceMeters / 1000).toFixed(1)}km)</p>
                                      <p className="text-[10px] text-amber-500/80 leading-snug">
                                        Cuaca sekarang {weather.isRaining ? 'sedang hujan' : 'agak panas'}. Pastikan anda bawa payung untuk berjalan ke destinasi!
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end pt-3 border-t border-white/10">
                                  <button 
                                    onClick={() => setHasArrivedManual(true)}
                                    className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                                  >
                                    Seterusnya <Navigation className="w-3 h-3 rotate-90" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          }

                          const steps = selectedLocation.direction_text.split(/\r?\n/).filter(s => s.trim().length > 0);
                          const isMultiStep = steps.length > 1;

                          return isMultiStep ? (
                            <div className="flex flex-col">
                              {/* Segmented Progress Bar */}
                              <div className="flex gap-1.5 mb-3 w-full">
                                {steps.map((_, idx) => (
                                  <div key={idx} className="h-1 rounded-full flex-1 bg-white/20 overflow-hidden">
                                    <motion.div 
                                      className="h-full bg-white"
                                      initial={false}
                                      animate={{ 
                                        width: idx <= currentStep ? '100%' : '0%' 
                                      }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                ))}
                              </div>

                              <motion.div key={currentStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1 block">
                                  Langkah Dalaman ({currentStep + 1} / {steps.length})
                                </span>
                                <p className="text-sm font-bold text-white leading-relaxed min-h-[40px]">
                                  {steps[currentStep]}
                                </p>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                                  <button 
                                    disabled={currentStep === 0} 
                                    onClick={() => {
                                      if (navigator.vibrate) navigator.vibrate(30);
                                      setCurrentStep(prev => prev - 1);
                                    }}
                                    className="text-xs font-bold text-white/70 disabled:opacity-30 transition-opacity px-3 py-1.5 -ml-3"
                                  >
                                    Kembali
                                  </button>
                                  <button 
                                    disabled={currentStep === steps.length - 1} 
                                    onClick={() => {
                                      if (navigator.vibrate) navigator.vibrate(50);
                                      setCurrentStep(prev => prev + 1);
                                    }}
                                    className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:bg-transparent transition-colors px-4 py-1.5"
                                  >
                                    Seterusnya
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1 block">
                                Panduan Dalaman
                              </span>
                              <p className="text-sm font-bold text-white leading-relaxed">
                                {selectedLocation.direction_text}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Controls */}
          {!isNavigating && (
            <div className="flex justify-between items-end">
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
          )}

          {/* Info Card / Drone View */}
          <AnimatePresence>
            {activeBuilding && !isNavigating && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
              >
                {/* Close Button */}
                <button 
                  onClick={dismissCard}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Media Area */}
                <div className="w-full h-32 sm:h-48 bg-slate-100 dark:bg-slate-800 relative">
                  {/* Media Content */}
                  {activeImageTab === 'drone' && activeBuilding.drone_image_url && (
                    <img src={activeBuilding.drone_image_url} alt="Drone View" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                  {activeImageTab === 'entrance' && activeBuilding.entrance_image_url && (
                    <img src={activeBuilding.entrance_image_url} alt="Entrance View" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                  {activeImageTab === 'floorplan' && activeBuilding.floorplan_image_url && (
                    <div className="w-full h-full relative group cursor-pointer" onClick={() => setShowFullscreenImage(activeBuilding.floorplan_image_url!)}>
                      <img src={activeBuilding.floorplan_image_url} alt="Floorplan View" loading="lazy" decoding="async" className="w-full h-full object-contain bg-white dark:bg-slate-900 p-2" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full">Tekan untuk Zoom</span>
                      </div>
                    </div>
                  )}
                  {activeImageTab === 'room' && selectedLocation?.image_url && (
                    <div className="w-full h-full relative group cursor-pointer" onClick={() => setShowFullscreenImage(selectedLocation.image_url!)}>
                      <img src={selectedLocation.image_url} alt="Room View" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full">Tekan untuk Zoom</span>
                      </div>
                    </div>
                  )}

                  {/* Empty state fallback */}
                  {((activeImageTab === 'drone' && !activeBuilding.drone_image_url) || 
                    (activeImageTab === 'entrance' && !activeBuilding.entrance_image_url) || 
                    (activeImageTab === 'floorplan' && !activeBuilding.floorplan_image_url) ||
                    (activeImageTab === 'room' && !selectedLocation?.image_url)) && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      {activeImageTab === 'floorplan' ? <MapIcon className="w-10 h-10 mb-2 opacity-50" /> : <ImageIcon className="w-10 h-10 mb-2 opacity-50" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">Tiada Imej {activeImageTab === 'entrance' ? 'Pintu Masuk' : activeImageTab === 'floorplan' ? 'Pelan Lantai' : activeImageTab === 'room' ? 'Bilik' : 'Dron'}</span>
                    </div>
                  )}
                  
                  {selectedLocation && (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                      LOKASI JUMPA
                    </div>
                  )}

                  {/* Media Tabs */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
                    <button onClick={() => setActiveImageTab('drone')} className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap", activeImageTab === 'drone' ? "bg-white text-black" : "text-white hover:bg-white/20")}>Dron</button>
                    {activeBuilding.entrance_image_url && (
                      <button onClick={() => setActiveImageTab('entrance')} className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap", activeImageTab === 'entrance' ? "bg-white text-black" : "text-white hover:bg-white/20")}>Depan</button>
                    )}
                    {activeBuilding.floorplan_image_url && (
                      <button onClick={() => setActiveImageTab('floorplan')} className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap", activeImageTab === 'floorplan' ? "bg-white text-black" : "text-white hover:bg-white/20")}>Lantai</button>
                    )}
                    {selectedLocation && selectedLocation.image_url && (
                      <button onClick={() => setActiveImageTab('room')} className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap", activeImageTab === 'room' ? "bg-white text-black" : "text-white hover:bg-white/20")}>Bilik</button>
                    )}
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                          {selectedLocation ? selectedLocation.room_code : activeBuilding.name}
                        </h2>
                      </div>
                      
                      {/* Facility Live Status */}
                      {activeBuilding.is_facility && activeBuilding.op_start && activeBuilding.op_end && !selectedLocation && (
                        <div className="mt-1 mb-2 flex items-center gap-1.5">
                          {checkIsOpen(activeBuilding.op_start, activeBuilding.op_end) ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> BUKA ({activeBuilding.op_start.slice(0,5)} - {activeBuilding.op_end.slice(0,5)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> TUTUP
                            </span>
                          )}
                        </div>
                      )}

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
                    <div className="flex flex-col gap-2 items-end">
                      {selectedLocation && (
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center shrink-0 ml-3">
                          <Layers className="w-4 h-4" />
                          <span className="text-[10px] font-black">T{selectedLocation.floor_level}</span>
                        </div>
                      )}
                      <button 
                        onClick={handleShare}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Kongsi Lokasi"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>


                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={startNavigation}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-blue-500/30"
                    >
                      <Navigation className="w-4 h-4" /> Mula Pandu Arah
                    </button>
                    
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBuilding.center_lat},${activeBuilding.center_lng}`, '_blank')}
                      className="w-full text-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold transition-colors mt-1 underline underline-offset-2"
                    >
                      Memandu dari luar kampus? Buka Google Maps
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* ── LIGHTBOX FOR FULLSCREEN IMAGES ── */}
      <AnimatePresence>
        {showFullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setShowFullscreenImage(null)}
              className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={showFullscreenImage} 
              alt="Fullscreen View" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* duplicate lightbox removed */}


      {/* ── GLOBAL BOTTOM NAV ── */}
      <BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} forceShowDesktop={true} />
    </div>
  );
}

