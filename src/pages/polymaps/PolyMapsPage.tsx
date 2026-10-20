import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Search, Navigation, MapPin, Building2, Layers, Clock, X, Menu, 
  ChevronDown, ChevronRight, ChevronUp, Share2, Coffee, Moon, Droplets, 
  CreditCard, BookOpen, ImageIcon, Map as MapIcon, DoorOpen,
  CloudRain, Sun, HelpCircle, Loader2, Umbrella, CornerUpLeft, 
  CornerUpRight, Compass, Trophy, ShoppingBag, Calendar, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToJppAndSuperAdmin } from '@/lib/notifications';
import { BottomNav } from '@/components/layout/BottomNav';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { Pannellum360Viewer } from '@/components/polymaps/Pannellum360Viewer';
import { 
  getBuilding360Url, 
  getLocation360Url, 
  isBuilding360Active, 
  isLocation360Active 
} from '@/lib/polymaps360Data';

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


// Smooth GPS follow during navigation

function MapRecenter({ lat, lng, zoom }: { lat: number, lng: number, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

// Smooth GPS follow during navigation
// Low-end: instant setView (no animation cost). High-end: smooth panTo.
function MapFollower({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.5, easeLinearity: 0.5 });
  }, [lat, lng, map]);
  return null;
}

// One-shot initial zoom when navigation starts: flies once then calls onDone
function MapFlyOnce({ lat, lng, zoom, onDone }: { lat: number, lng: number, zoom: number, onDone: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: run once on mount only
  return null;
}

// Detects when the user manually drags the map → signals to exit follow mode
function MapDragDetector({ onDrag }: { onDrag: () => void }) {
  useMapEvents({
    dragstart: () => onDrag(),
  });
  return null;
}

// Cache: divIcon builders are pure functions of their args — building one per render
// forces react-leaflet to redraw every marker DOM node on any state change.
const _iconCache = new Map<string, L.DivIcon>();
const getCustomIcon = (code: string, isActive: boolean) => {
  const key = `${code}|${isActive}`;
  const hit = _iconCache.get(key);
  if (hit) return hit;
  const labelStyle = `background-color: rgba(15, 23, 42, 0.95); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.5px; z-index: ${isActive ? 1000 : 10}; position: relative;`;

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
  const icon = L.divIcon({
    className: '',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
  _iconCache.set(key, icon);
  return icon;
};

export type OverlayFilter = 'ALL' | 'BUILDINGS' | 'EMS' | 'POLYMART';
export type SheetSnapLevel = 'PEEK' | 'HALF' | 'FULL';

export interface EmsEventItem {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  location?: string | null;
  status: string;
  lat: number;
  lng: number;
}

export interface PolyMartHubItem {
  id: string;
  name: string;
  description: string;
  operating_hours: string;
  lat: number;
  lng: number;
  pickup_instructions: string;
}

export const POLYMART_HUBS: PolyMartHubItem[] = [
  {
    id: 'hub-koperasi',
    name: 'Koperasi Siswa POLISAS',
    description: 'Pusat serahan & pengambilan rasmi pesanan PolyMart bagi barangan keperluan siswa & alat tulis.',
    operating_hours: '8:30 PG - 4:30 PTG (Isnin - Jumaat)',
    lat: 3.8628,
    lng: 103.3148,
    pickup_instructions: 'Tunjukkan nombor pesanan PolyMart anda di kaunter utama Koperasi.'
  },
  {
    id: 'hub-kafeteria',
    name: 'Kafeteria Pusat POLISAS',
    description: 'Hub serahan dan pengambilan pesanan makanan dan minuman PolyMart siswa.',
    operating_hours: '7:30 PG - 6:00 PTG (Setiap Hari)',
    lat: 3.8621,
    lng: 103.3160,
    pickup_instructions: 'Ambil pesanan di Kaunter Pengambilan Pantas Kafeteria.'
  },
  {
    id: 'hub-jpp',
    name: 'Kaunter JPP Siswa',
    description: 'Hub serahan barangan rasmi program kampus & barangan merchandise PolyMart.',
    operating_hours: '9:00 PG - 5:00 PTG (Hari Bekerja)',
    lat: 3.8617,
    lng: 103.3152,
    pickup_instructions: 'Hadir ke kaunter khidmat pelanggan JPP di Aras 1 Pentadbiran.'
  }
];

function mapEventLocationToCoords(locationStr: string | null | undefined, buildings: Building[]): [number, number] {
  if (!locationStr) {
    return [3.8625, 103.3153];
  }
  const locLower = locationStr.toLowerCase();

  const matched = buildings.find(b => 
    b.name.toLowerCase().includes(locLower) || 
    locLower.includes(b.name.toLowerCase()) ||
    (b.code && locLower.includes(b.code.toLowerCase()))
  );
  if (matched && matched.center_lat && matched.center_lng) {
    return [matched.center_lat, matched.center_lng];
  }

  if (locLower.includes('jubli') || locLower.includes('dewan')) return [3.8620, 103.3150];
  if (locLower.includes('padang') || locLower.includes('sukan')) return [3.8635, 103.3160];
  if (locLower.includes('islam') || locLower.includes('masjid')) return [3.8615, 103.3145];
  if (locLower.includes('kafe') || locLower.includes('kafeteria')) return [3.8621, 103.3160];
  if (locLower.includes('koperasi')) return [3.8628, 103.3148];

  let hash = 0;
  for (let i = 0; i < locationStr.length; i++) {
    hash = ((hash << 5) - hash) + locationStr.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.00002;
  const offsetLng = ((Math.abs(hash >> 2) % 100) - 50) * 0.00002;
  return [3.8625 + offsetLat, 103.3153 + offsetLng];
}

const getEmsMarkerIcon = (title: string, isActive: boolean) => {
  const pingEffect = '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>';
  const labelStyle = `background-color: rgba(180, 83, 9, 0.95); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(251,191,36,0.6); text-transform: uppercase; letter-spacing: 0.5px; z-index: ${isActive ? 1000 : 20}; position: relative;`;

  const markerRing = 'width: 22px; height: 22px; border-radius: 50%; background-color: #f59e0b; border: 3px solid #fbbf24; outline: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: ' + (isActive ? 1000 : 20) + '; position: relative; display: flex; align-items: center; justify-content: center;';

  const html = `
    <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="${markerRing}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${pingEffect}
      </div>
      <div style="${labelStyle}">
        ${title.length > 16 ? title.slice(0, 14) + '…' : title}
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

const getPolyMartMarkerIcon = (name: string, isActive: boolean) => {
  const pingEffect = '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>';
  const labelStyle = `background-color: rgba(6, 95, 70, 0.95); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(52,211,153,0.6); text-transform: uppercase; letter-spacing: 0.5px; z-index: ${isActive ? 1000 : 20}; position: relative;`;

  const markerRing = 'width: 22px; height: 22px; border-radius: 50%; background-color: #10b981; border: 3px solid #34d153; outline: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: ' + (isActive ? 1000 : 20) + '; position: relative; display: flex; align-items: center; justify-content: center;';

  const html = `
    <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="${markerRing}">
        <div style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></div>
        ${pingEffect}
      </div>
      <div style="${labelStyle}">
        ${name.length > 16 ? name.slice(0, 14) + '…' : name}
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

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

interface Building {
  id: string;
  name: string;
  code: string;
  center_lat: number;
  center_lng: number;
  zone_name?: string | null;
  is_facility?: boolean;
  facility_type?: string;
  op_start?: string;
  op_end?: string;
  floorplan_image_url?: string;
  entrance_image_url?: string;
  drone_image_url?: string | null;
  panorama_360_url?: string | null;
  is_360_enabled?: boolean;
}

interface GraphNode {
  lat: number;
  lng: number;
  key: string;
  neighbors: Map<string, { distance: number; isCovered: boolean } | number>;
}

function findShortestPath(
  nodesMap: Map<string, GraphNode>,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  preferCovered: boolean = false
): [number, number][] | null {
  if (nodesMap.size === 0) return null;

  let startKey: string | null = null;
  let minDistStart = Infinity;
  let endKey: string | null = null;
  let minDistEnd = Infinity;

  for (const node of nodesMap.values()) {
    const dStart = calculateDistanceInMeters(startLat, startLng, node.lat, node.lng);
    if (dStart < minDistStart) {
      minDistStart = dStart;
      startKey = node.key;
    }
    const dEnd = calculateDistanceInMeters(endLat, endLng, node.lat, node.lng);
    if (dEnd < minDistEnd) {
      minDistEnd = dEnd;
      endKey = node.key;
    }
  }

  if (!startKey || !endKey) return null;

  const tempStartKey = "temp_start";
  const tempEndKey = "temp_end";

  const neighborsCopy = new Map<string, Map<string, { distance: number; isCovered: boolean } | number>>();
  for (const [key, node] of nodesMap.entries()) {
    neighborsCopy.set(key, new Map(node.neighbors));
  }

  neighborsCopy.set(tempStartKey, new Map([[startKey, minDistStart]]));
  if (neighborsCopy.has(startKey)) {
    neighborsCopy.get(startKey)!.set(tempStartKey, minDistStart);
  }

  neighborsCopy.set(tempEndKey, new Map([[endKey, minDistEnd]]));
  if (neighborsCopy.has(endKey)) {
    neighborsCopy.get(endKey)!.set(tempEndKey, minDistEnd);
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const key of neighborsCopy.keys()) {
    distances.set(key, Infinity);
    previous.set(key, null);
  }
  distances.set(tempStartKey, 0);

  const unvisitedKeys = new Set<string>(neighborsCopy.keys());

  while (unvisitedKeys.size > 0) {
    let currentKey: string | null = null;
    let minD = Infinity;
    for (const key of unvisitedKeys) {
      const d = distances.get(key) ?? Infinity;
      if (d < minD) {
        minD = d;
        currentKey = key;
      }
    }

    if (currentKey === null || minD === Infinity) break;
    if (currentKey === tempEndKey) break;

    unvisitedKeys.delete(currentKey);
    visited.add(currentKey);

    const neighbors = neighborsCopy.get(currentKey);
    if (neighbors) {
      for (const [neighborKey, edgeVal] of neighbors.entries()) {
        if (visited.has(neighborKey)) continue;
        
        let weight = 0;
        if (typeof edgeVal === 'number') {
          weight = edgeVal;
        } else if (edgeVal && typeof edgeVal === 'object') {
          weight = edgeVal.distance;
          if (preferCovered && !edgeVal.isCovered) {
            weight *= 8.0; // Apply 8x penalty to uncovered path segments
          }
        }
        
        const alt = minD + weight;
        if (alt < (distances.get(neighborKey) ?? Infinity)) {
          distances.set(neighborKey, alt);
          previous.set(neighborKey, currentKey);
        }
      }
    }
  }

  if (distances.get(tempEndKey) === Infinity) return null;

  const pathKeys: string[] = [];
  let curr: string | null = tempEndKey;
  while (curr !== null) {
    pathKeys.push(curr);
    curr = previous.get(curr) ?? null;
  }
  pathKeys.reverse();

  const pathCoordinates: [number, number][] = [];
  for (const key of pathKeys) {
    if (key === tempStartKey) {
      pathCoordinates.push([startLat, startLng]);
    } else if (key === tempEndKey) {
      pathCoordinates.push([endLat, endLng]);
    } else {
      const node = nodesMap.get(key);
      if (node) {
        pathCoordinates.push([node.lat, node.lng]);
      }
    }
  }

  return pathCoordinates;
}

const _userIconCache = new Map<string, L.DivIcon>();
const getUserIcon = (heading: number | null) => {
  // Round to 5° so compass jitter doesn't rebuild the icon every deviceorientation frame.
  const rounded = heading === null ? 'null' : String(Math.round(heading / 5) * 5);
  const hit = _userIconCache.get(rounded);
  if (hit) return hit;
  const rotation = heading !== null ? heading : 0;
  const html = `
    <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px;">
      ${heading !== null ? `
        <div style="
          position: absolute; 
          width: 0; 
          height: 0; 
          border-left: 20px solid transparent; 
          border-right: 20px solid transparent; 
          border-top: 55px solid rgba(14, 165, 233, 0.4); 
          filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.6));
          top: -10px; 
          transform-origin: 50% 100%;
          transform: rotate(${rotation}deg);
          pointer-events: none;
          z-index: 100;
        "></div>
      ` : ''}
      <div style="
        width: 18px; 
        height: 18px; 
        border-radius: 50%; 
        background-color: #0ea5e9; 
        border: 3px solid white; 
        box-shadow: 0 0 10px rgba(14, 165, 233, 0.8), 0 3px 6px rgba(0,0,0,0.4); 
        z-index: 200; 
        position: relative;
      ">
        <div class="animate-pulse" style="position: absolute; top: -3px; left: -3px; width: 18px; height: 18px; border-radius: 50%; background-color: rgba(14, 165, 233, 0.4);"></div>
      </div>
    </div>
  `;
  const icon = L.divIcon({
    className: '',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
  _userIconCache.set(rounded, icon);
  return icon;
};

interface Location {
  id: string;
  room_code: string;
  floor_level: number;
  direction_text: string;
  image_url?: string;
  panorama_360_url?: string | null;
  building: Building;
  building_id: string;
  is_360_enabled?: boolean;
  op_start?: string;
  op_end?: string;
}

interface ZoneMarkerInfo {
  zone_name: string;
  lat: number;
  lng: number;
  buildings: Building[];
}

import { resolveRoomLocation } from '@/lib/polyMapsResolver';
export { resolveRoomLocation } from '@/lib/polyMapsResolver';

export function PolyMapsPage() {
  const { t } = useTranslation(['services', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeOverlayFilter, setActiveOverlayFilter] = useState<OverlayFilter>('ALL');
  const [sheetSnap, setSheetSnap] = useState<SheetSnapLevel>('HALF');
  
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [emsEvents, setEmsEvents] = useState<EmsEventItem[]>([]);

  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedEmsEvent, setSelectedEmsEvent] = useState<EmsEventItem | null>(null);
  const [selectedPolyMartHub, setSelectedPolyMartHub] = useState<PolyMartHubItem | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasArrivedManual, setHasArrivedManual] = useState(false);
  const [hasZoomedToNavigation, setHasZoomedToNavigation] = useState(false);
  // Follow mode: true = map follows user; false = user panned away (show re-center button)
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const { user, profile } = useAuth();
  // DragControls lets the sheet scroll freely (iOS) while the HANDLE alone triggers
  // the drag gesture. Attaching drag="y" to the whole sheet made iOS Safari's native
  // scroll swallow the gesture -> sheet never snapped (Android worked, iOS didn't).
  const sheetDragControls = useDragControls();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportForm, setReportForm] = useState({
    room_code: '',
    building_id: '',
    building_name_suggestion: '',
    floor_level: '0',
    description: ''
  });

  const [walkways, setWalkways] = useState<{ id: string; name: string; coordinates: [number, number][]; is_covered?: boolean; is_blocked?: boolean }[]>([]);
  const [heading, setHeading] = useState<number | null>(null);
  const [preferCovered, setPreferCovered] = useState(false);
  const [showTbtSteps, setShowTbtSteps] = useState(false);

  const graph = useMemo(() => {
    const nodesMap = new Map<string, GraphNode>();
    
    walkways.forEach(w => {
      if (w.is_blocked) return; // Skip blocked walkways

      w.coordinates.forEach((coord, i) => {
        const lat = coord[0];
        const lng = coord[1];
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        if (!nodesMap.has(key)) {
          nodesMap.set(key, {
            lat,
            lng,
            key,
            neighbors: new Map<string, { distance: number; isCovered: boolean } | number>()
          });
        }
        
        if (i > 0) {
          const prevCoord = w.coordinates[i-1];
          const prevLat = prevCoord[0];
          const prevLng = prevCoord[1];
          const prevKey = `${prevLat.toFixed(6)},${prevLng.toFixed(6)}`;
          
          const d = calculateDistanceInMeters(prevLat, prevLng, lat, lng);
          const isCovered = w.is_covered || false;
          
          nodesMap.get(prevKey)?.neighbors.set(key, { distance: d, isCovered });
          nodesMap.get(key)?.neighbors.set(prevKey, { distance: d, isCovered });
        }
      });
    });
    
    const nodeList = Array.from(nodesMap.values());
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];
        
        const d = calculateDistanceInMeters(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
        if (d <= 8.0) {
          nodeA.neighbors.set(nodeB.key, d); // Junction bridge (uncovered plain distance)
          nodeB.neighbors.set(nodeA.key, d);
        }
      }
    }
    
    return nodesMap;
  }, [walkways]);

  const shortestPath = useMemo(() => {
    if (isNavigating && userLocation && activeBuilding?.center_lat) {
      return findShortestPath(
        graph,
        userLocation[0],
        userLocation[1],
        activeBuilding.center_lat,
        activeBuilding.center_lng,
        preferCovered
      );
    }
    return null;
  }, [isNavigating, userLocation, activeBuilding, graph, preferCovered]);

  const navigationStats = useMemo(() => {
    if (!userLocation || !activeBuilding?.center_lat) {
      return { distance: null, eta: null };
    }
    
    if (shortestPath && shortestPath.length > 0) {
      let totalDistance = 0;
      for (let i = 1; i < shortestPath.length; i++) {
        totalDistance += calculateDistanceInMeters(
          shortestPath[i-1][0], shortestPath[i-1][1],
          shortestPath[i][0], shortestPath[i][1]
        );
      }
      const eta = Math.ceil(totalDistance / 75);
      return { distance: totalDistance, eta: eta || 1 };
    } else {
      const directDist = calculateDistanceInMeters(
        userLocation[0], userLocation[1],
        activeBuilding.center_lat, activeBuilding.center_lng
      );
      const eta = Math.ceil((directDist / 4.5e3) * 60) + 1;
      return { distance: directDist, eta };
    }
  }, [userLocation, activeBuilding, shortestPath]);

  const findWalkwayNameForSegment = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    for (const w of walkways) {
      for (let i = 1; i < w.coordinates.length; i++) {
        const p1 = w.coordinates[i-1];
        const p2 = w.coordinates[i];
        const matchForward = (Math.abs(p1[0] - lat1) < 1e-6 && Math.abs(p1[1] - lng1) < 1e-6 &&
                              Math.abs(p2[0] - lat2) < 1e-6 && Math.abs(p2[1] - lng2) < 1e-6);
        const matchBackward = (Math.abs(p1[0] - lat2) < 1e-6 && Math.abs(p1[1] - lng2) < 1e-6 &&
                               Math.abs(p2[0] - lat1) < 1e-6 && Math.abs(p2[1] - lng1) < 1e-6);
        if (matchForward || matchBackward) {
          return w.name;
        }
      }
    }
    return "Laluan Kampus";
  };

  const navigationSteps = useMemo(() => {
    if (!shortestPath || shortestPath.length < 2) return [];

    const steps: { instruction: string; distance: number; isCovered: boolean }[] = [];
    
    let currentWalkwayName = findWalkwayNameForSegment(
      shortestPath[0][0], shortestPath[0][1],
      shortestPath[1][0], shortestPath[1][1]
    );
    
    const firstSegmentWalkway = walkways.find(w => w.name === currentWalkwayName);
    let isCurrentCovered = firstSegmentWalkway?.is_covered || false;

    let segmentDistance = calculateDistanceInMeters(
      shortestPath[0][0], shortestPath[0][1],
      shortestPath[1][0], shortestPath[1][1]
    );
    
    let lastBearing = calculateBearing(
      shortestPath[0][0], shortestPath[0][1],
      shortestPath[1][0], shortestPath[1][1]
    );

    let accumulatedDistance = segmentDistance;

    for (let i = 2; i < shortestPath.length; i++) {
      const pPrev = shortestPath[i-2];
      const pCurr = shortestPath[i-1];
      const pNext = shortestPath[i];

      const segmentWalkway = findWalkwayNameForSegment(pCurr[0], pCurr[1], pNext[0], pNext[1]);
      const segmentWalkwayObj = walkways.find(w => w.name === segmentWalkway);
      const isSegmentCovered = segmentWalkwayObj?.is_covered || false;

      const currentBearing = calculateBearing(pCurr[0], pCurr[1], pNext[0], pNext[1]);
      const bearingDiff = (currentBearing - lastBearing + 540) % 360 - 180;
      
      const dist = calculateDistanceInMeters(pCurr[0], pCurr[1], pNext[0], pNext[1]);

      const isTurn = Math.abs(bearingDiff) > 25;
      const isWalkwayChange = segmentWalkway !== currentWalkwayName;
      const isCoveredChange = isSegmentCovered !== isCurrentCovered;

      if (isTurn || isWalkwayChange || isCoveredChange) {
        let turnText = "Ikuti";
        if (steps.length > 0 && isTurn) {
          if (bearingDiff >= 25 && bearingDiff < 110) {
            turnText = "Belok kanan ke";
          } else if (bearingDiff >= 110) {
            turnText = "Belok tajam ke kanan ke";
          } else if (bearingDiff <= -25 && bearingDiff > -110) {
            turnText = "Belok kiri ke";
          } else {
            turnText = "Belok tajam ke kiri ke";
          }
        }
        steps.push({
          instruction: `${turnText} ${currentWalkwayName}${isCurrentCovered ? ' (Berbumbung)' : ''}`,
          distance: Math.round(accumulatedDistance),
          isCovered: isCurrentCovered
        });

        currentWalkwayName = segmentWalkway;
        isCurrentCovered = isSegmentCovered;
        accumulatedDistance = dist;
      } else {
        accumulatedDistance += dist;
      }
      lastBearing = currentBearing;
    }

    steps.push({
      instruction: `Teruskan ke destinasi melalui ${currentWalkwayName}${isCurrentCovered ? ' (Berbumbung)' : ''}`,
      distance: Math.round(accumulatedDistance),
      isCovered: isCurrentCovered
    });

    steps.push({
      instruction: `Anda telah sampai ke destinasi: ${activeBuilding?.name || 'Destinasi'}`,
      distance: 0,
      isCovered: false
    });

    return steps;
  }, [shortestPath, walkways, activeBuilding]);

  const getPathDistanceAndETA = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    const path = findShortestPath(graph, startLat, startLng, endLat, endLng, preferCovered);
    if (path && path.length > 0) {
      let totalDistance = 0;
      for (let i = 1; i < path.length; i++) {
        totalDistance += calculateDistanceInMeters(
          path[i-1][0], path[i-1][1],
          path[i][0], path[i][1]
        );
      }
      const eta = Math.ceil(totalDistance / 75);
      return { distance: totalDistance, eta: eta || 1 };
    } else {
      const directDist = calculateDistanceInMeters(startLat, startLng, endLat, endLng);
      const eta = Math.ceil((directDist / 4.5e3) * 60) + 1;
      return { distance: directDist, eta };
    }
  };

  const requestCompassPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          console.log('Compass permission granted');
        } else {
          toast.error('Kebenaran kompas ditolak. Navigasi tetap berfungsi tanpa penunjuk arah.');
        }
      } catch (error) {
        console.error('Error requesting compass permission:', error);
      }
    }
  };

  const handleOpenReportModal = () => {
    setReportForm({
      room_code: searchQuery,
      building_id: '',
      building_name_suggestion: '',
      floor_level: '0',
      description: ''
    });
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sila log masuk untuk membuat aduan.');
      return;
    }
    if (!reportForm.room_code.trim()) {
      toast.error('Sila isi nama tempat.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { error } = await supabase.from('imaps_missing_reports').insert({
        student_id: user.id,
        room_code: reportForm.room_code,
        building_id: reportForm.building_id && reportForm.building_id !== 'new' ? reportForm.building_id : null,
        building_name_suggestion: reportForm.building_id === 'new' ? reportForm.building_name_suggestion : null,
        floor_level: parseInt(reportForm.floor_level, 10),
        description: reportForm.description,
        status: 'pending'
      });

      if (error) throw error;

      // Hantar notifikasi kepada JPP
      const studentName = profile?.full_name || 'Pelajar';
      await sendNotificationToJppAndSuperAdmin({
        title: 'Laporan Tempat Hilang Baru',
        message: `${studentName} melaporkan tempat hilang: "${reportForm.room_code}"`,
        type: 'MAPS_MISSING_REPORT',
        module: 'JPP',
        link: '/jpp/polymaps?tab=reports'
      });

      toast.success('Aduan berjaya dihantar! Terima kasih atas bantuan anda.');
      setIsReportModalOpen(false);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      toast.error('Gagal menghantar aduan.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'akademik' | 'fasiliti'>('akademik');
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [expandedFacilityType, setExpandedFacilityType] = useState<string | null>(null);
  const [expandedFloorLevel, setExpandedFloorLevel] = useState<string | null>(null);
  
  const [mapZoom, setMapZoom] = useState(16);
  const [zones, setZones] = useState<ZoneMarkerInfo[]>([]);

  const [activeImageTab, setActiveImageTab] = useState<'entrance' | 'floorplan' | 'room' | '360'>('entrance');
  const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);
  const [fullscreen360Url, setFullscreen360Url] = useState<string | null>(null);
  const [fullscreen360Title, setFullscreen360Title] = useState<string>('');
  const [cardExpanded, setCardExpanded] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [weather, setWeather] = useState<{ isRaining: boolean, isHot: boolean } | null>(null);

  const { runTour, startTour, closeTour } = useTour('POLYMAPS_PAGE', true, 2500);

  const polisasCenter: [number, number] = [3.8625, 103.3153];

  useEffect(() => {
    fetchInitialData();
    
    // Fetch basic weather for Kuantan (POLISAS coords)
    // Best-effort with timeout: open-meteo can 503/504 transiently; never block the page.
    const weatherCtrl = new AbortController();
    const weatherTimeout = setTimeout(() => weatherCtrl.abort(), 8000);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=3.8168&longitude=103.3317&current_weather=true', {
      signal: weatherCtrl.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`weather HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          const temp = data.current_weather.temperature;
          setWeather({
            isRaining: code >= 50 && code <= 99,
            isHot: temp >= 32
          });
        }
      })
      .catch(e => {
        if (e?.name === 'AbortError') console.log('Weather fetch timed out');
        else console.log('Weather fetch failed', e);
      })
      .finally(() => clearTimeout(weatherTimeout));
  }, []);

  useEffect(() => {
    if (weather?.isRaining) {
      setPreferCovered(true);
      toast.success('Hari hujan! Mod laluan berbumbung diaktifkan secara automatik.', { id: 'rain-toggle-toast' });
    }
  }, [weather?.isRaining]);

  // Reactive handler for deep links (?room=..., ?b=..., ?q=...)
  const handledSearchParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!location.search) {
      handledSearchParamRef.current = null;
      return;
    }
    if (handledSearchParamRef.current === location.search) return;

    const searchParams = new URLSearchParams(location.search);
    const rId = searchParams.get('room') || searchParams.get('roomId');
    const bId = searchParams.get('b') || searchParams.get('building') || searchParams.get('buildingId');
    const queryParam = searchParams.get('q') || searchParams.get('search');

    if (!rId && !bId && !queryParam) return;

    // Handle room deep link (?room=...)
    if (rId) {
      if (!allLocations || allLocations.length === 0) return;
      const targetRoom = resolveRoomLocation(rId, allLocations);
      if (targetRoom) {
        handledSearchParamRef.current = location.search;
        setSelectedLocation(targetRoom);
        setActiveBuilding(targetRoom.building);
        const hasActive360 = isLocation360Active(targetRoom) || (targetRoom.building && isBuilding360Active(targetRoom.building));
        setActiveImageTab(hasActive360 ? '360' : (targetRoom.image_url ? 'room' : (targetRoom.building?.entrance_image_url ? 'entrance' : 'floorplan')));
        setCardExpanded(true);
        setSheetSnap('HALF');
        // Clean URL search params so student can freely close or select another building without being locked
        navigate(location.pathname, { replace: true });
      }
      return;
    }

    // Handle building deep link (?b=...)
    if (bId) {
      if (!allBuildings || allBuildings.length === 0) return;
      const bClean = bId.toLowerCase().trim();
      const targetBuilding = allBuildings.find(b => 
        b.id === bId || 
        b.code?.toLowerCase() === bClean || 
        b.name?.toLowerCase().includes(bClean) || 
        bClean.includes(b.name?.toLowerCase() || '')
      );
      if (targetBuilding) {
        handledSearchParamRef.current = location.search;
        setActiveBuilding(targetBuilding);
        setSelectedLocation(null);
        const hasActive360 = isBuilding360Active(targetBuilding);
        setActiveImageTab(hasActive360 ? '360' : (targetBuilding.entrance_image_url ? 'entrance' : 'floorplan'));
        setCardExpanded(true);
        setSheetSnap('HALF');
        navigate(location.pathname, { replace: true });
      }
      return;
    }

    // Handle search query deep link (?q=...)
    if (queryParam) {
      if (!allBuildings || allBuildings.length === 0) return;
      const qClean = queryParam.toLowerCase().trim();
      const targetBuilding = allBuildings.find(b => 
        b.code?.toLowerCase() === qClean || 
        b.name?.toLowerCase().includes(qClean) || 
        qClean.includes(b.name?.toLowerCase() || '')
      );
      if (targetBuilding) {
        handledSearchParamRef.current = location.search;
        setActiveBuilding(targetBuilding);
        setSelectedLocation(null);
        const hasActive360 = isBuilding360Active(targetBuilding);
        setActiveImageTab(hasActive360 ? '360' : (targetBuilding.entrance_image_url ? 'entrance' : 'floorplan'));
        setCardExpanded(true);
        setSheetSnap('HALF');
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, location.pathname, allLocations, allBuildings, navigate]);

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

  // ── Nexus AI State Bridge (sessionStorage) ───────────────────────────────
  // Writes current PolyMaps state so FloatingChatAI can read it lazily.
  // No realtime subscription needed: AI reads once on chat open.
  useEffect(() => {
    const checkIsOpen = (opStart?: string, opEnd?: string): boolean => {
      if (!opStart || !opEnd) return true; // no hours set = always open
      const now = new Date();
      const [sh, sm] = opStart.split(':').map(Number);
      const [eh, em] = opEnd.split(':').map(Number);
      const cur = now.getHours() * 60 + now.getMinutes();
      return cur >= sh * 60 + sm && cur <= eh * 60 + em;
    };

    try {
      const bridgeData = {
        activeBuildingName: activeBuilding ? `${activeBuilding.name}${activeBuilding.zone_name ? ` - ${activeBuilding.zone_name}` : ''}` : null,
        activeBuildingCode: activeBuilding?.code ?? null,
        activeBuildingZone: activeBuilding?.zone_name ?? null,
        facilityStatus: activeBuilding?.is_facility
          ? (checkIsOpen(activeBuilding.op_start, activeBuilding.op_end)
            ? `BUKA${activeBuilding.op_start ? ` (${activeBuilding.op_start}-${activeBuilding.op_end})` : ''}`
            : 'TUTUP')
          : null,
        isNavigating,
        targetRoomCode: selectedLocation?.room_code ?? null,
      };
      sessionStorage.setItem('nexus_polymaps_ctx', JSON.stringify(bridgeData));
    } catch { /* silent fail: private browsing may block sessionStorage */ }

    return () => {
      try { sessionStorage.removeItem('nexus_polymaps_ctx'); } catch { /* ignore */ }
    };
  }, [activeBuilding, isNavigating, selectedLocation]);

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
    // This is optional: page works fully for unauthenticated users too
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
      // Ignore auth errors: page is public, auth is optional
    }

    // Fetch buildings, locations, walkways, and ems_events in parallel
    const [bRes, lRes, wRes, eRes] = await Promise.all([
      supabase.from('imaps_buildings').select('*').order('name'),
      supabase.from('imaps_locations').select('*, building:building_id(*)').order('floor_level'),
      supabase.from('imaps_walkways').select('*').order('created_at', { ascending: false }),
      supabase.from('ems_events').select('*').in('status', ['ACTIVE', 'APPROVED']).order('event_date', { ascending: true })
    ]);

    if (bRes.error) {
      console.error('PolyMaps: Failed to load buildings:', bRes.error.message);
    }
    const bData = bRes.data;
    if (bData) {
      const enhancedBuildings = bData.map((b: any) => ({
        ...b,
        panorama_360_url: b.panorama_360_url || getBuilding360Url(b)
      }));
      setAllBuildings(enhancedBuildings);
    }
    
    if (lRes.error) {
      console.error('PolyMaps: Failed to load locations:', lRes.error.message);
    }
    const lData = lRes.data;
    const formatted = (lData || []).map((item: any) => {
      const building = Array.isArray(item.building) ? item.building[0] : item.building;
      const enhancedBuilding = building ? {
        ...building,
        panorama_360_url: building.panorama_360_url || getBuilding360Url(building)
      } : building;
      return {
        ...item,
        building: enhancedBuilding,
        panorama_360_url: item.panorama_360_url || getLocation360Url({ ...item, building: enhancedBuilding })
      };
    });
    if (formatted.length > 0) {
      setAllLocations(formatted);
    }

    if (wRes.error) {
      console.error('PolyMaps: Failed to load walkways:', wRes.error.message);
    }
    if (wRes.data) {
      const parsedWalkways = wRes.data.map((w: any) => ({
        id: w.id,
        name: w.name,
        coordinates: Array.isArray(w.coordinates) ? w.coordinates : JSON.parse(w.coordinates)
      }));
      setWalkways(parsedWalkways);
    }

    if (eRes.error) {
      console.warn('PolyMaps: Failed to load ems_events:', eRes.error.message);
    }
    const rawEvents = eRes.data || [];
    const mappedEvents: EmsEventItem[] = rawEvents.map((evt: any) => {
      const coords = mapEventLocationToCoords(evt.location, bData || []);
      return {
        ...evt,
        lat: coords[0],
        lng: coords[1]
      };
    });
    if (mappedEvents.length === 0) {
      setEmsEvents([
        {
          id: 'ems-showcase-1',
          title: 'Karnival Inovasi & TVET POLISAS 2026',
          description: 'Pameran projek inovasi, pertandingan teknikal, dan showcase industri siswa POLISAS.',
          category: 'INOVASI',
          event_type: 'EXHIBITION',
          event_date: new Date(Date.now() + 86400000 * 2).toISOString(),
          location: 'Dewan Jubli Perak',
          status: 'ACTIVE',
          lat: 3.8620,
          lng: 103.3150
        }
      ]);
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
            id, name, code, center_lat, center_lng, entrance_image_url, floorplan_image_url, zone_name
          )
        `)
        .or(`room_code.ilike.%${query}%,search_tags.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => {
        const rawBuilding = Array.isArray(item.building) ? item.building[0] : item.building;
        const enhancedBuilding = rawBuilding ? {
          ...rawBuilding,
          panorama_360_url: rawBuilding.panorama_360_url || getBuilding360Url(rawBuilding)
        } : rawBuilding;
        return {
          ...item,
          building: enhancedBuilding,
          panorama_360_url: item.panorama_360_url || getLocation360Url({ ...item, building: enhancedBuilding })
        };
      }) as Location[];

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
          eta = getPathDistanceAndETA(userLocation[0], userLocation[1], b.center_lat, b.center_lng).eta;
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
          eta = getPathDistanceAndETA(userLocation[0], userLocation[1], loc.building.center_lat, loc.building.center_lng).eta;
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
    setSelectedEmsEvent(null);
    setSelectedPolyMartHub(null);
    setSelectedLocation(loc);
    setActiveBuilding(loc.building);
    const has360 = isLocation360Active(loc) || (loc.building && isBuilding360Active(loc.building));
    setActiveImageTab(has360 ? '360' : (loc.image_url ? 'room' : (loc.building?.entrance_image_url ? 'entrance' : 'floorplan')));
    setCurrentStep(0);
    setSearchQuery('');
    setSearchResults([]);
    setActiveFilter(null);
    setIsSidebarOpen(false);
    setCardExpanded(true);
    setSheetSnap('HALF');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const handleSelectBuildingMapMarker = (b: Building) => {
    setSelectedEmsEvent(null);
    setSelectedPolyMartHub(null);
    setSelectedLocation(null);
    setActiveBuilding(b);
    const has360 = isBuilding360Active(b);
    setActiveImageTab(has360 ? '360' : (b.entrance_image_url ? 'entrance' : 'floorplan'));
    setCardExpanded(true);
    setSheetSnap('HALF');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const handleSelectEmsEvent = (event: EmsEventItem) => {
    setSelectedEmsEvent(event);
    setSelectedPolyMartHub(null);
    setActiveBuilding(null);
    setSelectedLocation(null);
    setCardExpanded(true);
    setSheetSnap('HALF');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const handleSelectPolyMartHub = (hub: PolyMartHubItem) => {
    setSelectedPolyMartHub(hub);
    setSelectedEmsEvent(null);
    setActiveBuilding(null);
    setSelectedLocation(null);
    setCardExpanded(true);
    setSheetSnap('HALF');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const startNavigationToCoords = (lat: number, lng: number, title: string) => {
    requestCompassPermission();
    setActiveBuilding({
      id: `coord-${Date.now()}`,
      name: title,
      code: 'NAV',
      center_lat: lat,
      center_lng: lng
    });
    setSelectedLocation(null);
    setSelectedEmsEvent(null);
    setSelectedPolyMartHub(null);
    setIsNavigating(true);
    setHasArrivedManual(false);
    setHasZoomedToNavigation(false);
    setIsFollowingUser(false);
    setCardExpanded(false);
    setSheetSnap('HALF');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const dismissCard = () => {
    setActiveBuilding(null);
    setSelectedLocation(null);
    setSelectedEmsEvent(null);
    setSelectedPolyMartHub(null);
    setIsNavigating(false);
    setCurrentStep(0);
    setHasArrivedManual(false);
    setHasZoomedToNavigation(false);
    setIsFollowingUser(false);
    setCardExpanded(false);
    setSheetSnap('PEEK');
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const startNavigation = () => {
    requestCompassPermission();
    setIsNavigating(true);
    setHasArrivedManual(false);
    setHasZoomedToNavigation(false);
    setIsFollowingUser(false); // Will become true after MapFlyOnce completes
    setCardExpanded(false); // Collapse to HUD mini bar during active navigation
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
          // Always use high accuracy GPS: arrival detection threshold is 30m.
          // Network GPS (10-50m error) would cause missed arrivals on low-end devices.
          // Low-end gets a longer timeout (more patient for first GPS fix),
          // but accuracy is NEVER sacrificed.
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isNavigating]);

  useEffect(() => {
    let lastHeading = Infinity;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let h: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined) {
        h = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        h = 360 - e.alpha;
      }
      if (h === null) return;
      // Only commit state when heading moved ≥3° — cuts re-render rate ~10x on compass jitter.
      if (Math.abs(h - lastHeading) < 3) return;
      lastHeading = h;
      setHeading(h);
    };

    if (isNavigating) {
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      setHeading(null);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [isNavigating]);

  const etaMinutes = useMemo(() => {
    return navigationStats.eta;
  }, [navigationStats.eta]);

  // Auto-expand nav card when user arrives within 30m
  useEffect(() => {
    if (!isNavigating || !activeBuilding || !userLocation) return;
    const dist = calculateDistanceInMeters(
      userLocation[0], userLocation[1],
      activeBuilding.center_lat, activeBuilding.center_lng
    );
    const arrived = hasArrivedManual || dist <= 30;
    if (arrived && !cardExpanded) {
      setCardExpanded(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }, [isNavigating, activeBuilding, userLocation, hasArrivedManual, selectedLocation, cardExpanded]);

  // Sidebar Grouping Logic
  const getLocationsForBuilding = (bId: string) => allLocations.filter(l => l.building_id === bId);
  const getFloorsForBuilding = (bId: string) => {
    const locs = getLocationsForBuilding(bId);
    const floors = Array.from(new Set(locs.map(l => Number(l.floor_level) || 0))).sort((a: number, b: number) => a - b);
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
      navigator.clipboard.writeText(`Lihat lokasi bilik/kelas ${selectedLocation.room_code} di PolyMaps POLISAS:\n${url}`);
      toast.success('Pautan kelas disalin!');
    } else if (activeBuilding) {
      const url = `${window.location.origin}${window.location.pathname}?b=${activeBuilding.id}`;
      navigator.clipboard.writeText(`Lihat lokasi ${activeBuilding.name} di PolyMaps POLISAS:\n${url}`);
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
        <h1 className="sr-only">{t('polymaps_title', { defaultValue: 'PolyMaps — GPS Kampus Interaktif & Direktori' })}</h1>
        <div className="sr-only">
          <span>{t('route_directions', { defaultValue: 'Dapatkan Panduan Laluan Berjalan' })}</span>
          <span>{t('select_starting_point', { defaultValue: 'Pilih Titik Permulaan' })}</span>
          <span>{t('select_destination', { defaultValue: 'Pilih Destinasi' })}</span>
          <span>{t('campus_zones', { defaultValue: 'Zon Kampus POLISAS' })}</span>
        </div>
        <div className="max-w-md mx-auto space-y-3 pointer-events-auto">
          {/* Top Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 rounded-full bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)] flex items-center justify-center text-[#2E3A2F] dark:text-[#F8F6EE] shrink-0 hover:scale-105 active:scale-95 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="tour-polymaps-search flex-1 bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)] rounded-full px-4 py-2.5 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#6B7F5B]" />
              <input
                type="text"
                placeholder={t('search_locations', { defaultValue: 'Cari bilik kuliah, dewan kuliah, jabatan, atau makmal...' })}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE] placeholder:text-[#556453]/60 dark:placeholder:text-[#A3B39F]/60"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveFilter(null);
                }}
              />
            </div>
            <button
              onClick={startTour}
              className="w-10 h-10 rounded-full bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)] text-[#6B7F5B] flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="tour-polymaps-quick flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                setActiveFilter(null);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shadow-sm",
                !activeFilter
                  ? "bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white"
                  : "bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]"
              )}
            >
              Semua
            </button>
            <button 
              onClick={() => handleFilterClick('cafe')} 
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", 
                activeFilter === 'cafe' 
                  ? "bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white" 
                  : "bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]"
              )}
            >
              <Coffee className="w-3.5 h-3.5" /> {t('cafeterias', { defaultValue: 'Kafeteria & Tempat Makan' })}
            </button>
            <button 
              onClick={() => handleFilterClick('surau')} 
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", 
                activeFilter === 'surau' 
                  ? "bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white" 
                  : "bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]"
              )}
            >
              <Moon className="w-3.5 h-3.5" /> Surau
            </button>
            <button 
              onClick={() => handleFilterClick('toilet')} 
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 shadow-sm", 
                activeFilter === 'toilet' 
                  ? "bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white" 
                  : "bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]"
              )}
            >
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
                className="bg-[#F8F6EE]/95 dark:bg-[#151D16]/95 rounded-2xl shadow-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] overflow-hidden max-h-[40vh] overflow-y-auto"
              >
                {searchResults.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left px-4 py-3 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] last:border-0 hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F]/70 flex items-center gap-4 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-[#2E3A2F] dark:text-[#F8F6EE] flex items-center gap-2">
                        {loc.room_code}
                        {loc.building?.zone_name && (
                          <span className="text-[10px] bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase">
                            {t('services:zone_prefix', 'Zon {{name}}', { name: loc.building.zone_name })}
                          </span>
                        )}
                        {(isLocation360Active(loc) || (loc.building && isBuilding360Active(loc.building))) && (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] border border-[#6B7F5B]/30 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                            <Compass className="w-2.5 h-2.5" /> {t('services:panorama_360_active', '360 AKTIF')}
                          </span>
                        )}
                        {loc.op_start && loc.op_end && (
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-sm font-black tracking-wider uppercase",
                            checkIsOpen(loc.op_start, loc.op_end) ? "bg-[#6B7F5B]/20 text-[#6B7F5B] dark:text-[#A3B39F]" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}>
                            {checkIsOpen(loc.op_start, loc.op_end) ? t('services:facility_open', 'BUKA') : t('services:facility_closed', 'TUTUP')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#556453] dark:text-[#A3B39F] flex items-center gap-2 mt-0.5">
                        {loc.id.startsWith('b-') ? 'Bangunan' : loc.building?.name}
                        {activeFilter && loc.floor_level > 0 && (
                          <span className="text-[#6B7F5B] flex items-center gap-1 bg-[#6B7F5B]/10 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> {loc.floor_level} min
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#F8F6EE]/95 dark:bg-[#151D16]/95 rounded-2xl shadow-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] p-4 text-center space-y-3"
              >
                <p className="text-[#556453] dark:text-[#A3B39F] text-xs font-bold leading-normal">
                  Tidak jumpa tempat yang anda cari?
                </p>
                <button
                  onClick={handleOpenReportModal}
                  className="w-full bg-[#C96F4F] hover:bg-[#B35F41] text-white font-bold py-2 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-colors shadow-md active:scale-95"
                >
                  Maklumkan kepada JPP
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 w-full relative z-0 after:content-[''] after:block after:h-40 after:shrink-0">
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
            updateWhenIdle={false}          // Update tiles as map moves (responsive)
            keepBuffer={2}                   // Pre-load 2 tile border
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
            <MapFollower lat={userLocation[0]} lng={userLocation[1]} />
          )}

          {/* Render walkways with covered & blocked styles */}
          {walkways.map((w, idx) => {
            let color = '#64748b'; // standard grey
            let weight = 2.5;
            let dashArray = '5, 8';
            let opacity = 0.5;
            if (w.is_blocked) {
              color = '#ef4444'; // red
              weight = 3;
              dashArray = '3, 6';
              opacity = 0.6;
            } else if (w.is_covered) {
              color = '#10b981'; // emerald green
              weight = 3;
              dashArray = undefined; // solid line for covered
              opacity = 0.6;
            }
            return (
              <Polyline
                key={`walkway-${w.id || idx}`}
                positions={w.coordinates}
                pathOptions={{ color, weight, dashArray, opacity }}
              />
            );
          })}

          {userLocation && (
            <Marker position={userLocation} icon={getUserIcon(heading)}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
          )}

          {/* Render Zones when zoomed out */}
          {(activeOverlayFilter === 'ALL' || activeOverlayFilter === 'BUILDINGS') && mapZoom < 18 && zones.map(z => (
            <Marker 
              key={`zone-${z.zone_name}`}
              position={[z.lat, z.lng]}
              icon={getCustomIcon(z.zone_name, false)}
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

          {(activeOverlayFilter === 'ALL' || activeOverlayFilter === 'BUILDINGS') && allBuildings.map(b => {
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
                icon={getCustomIcon(b.code, isActive)}
                eventHandlers={{
                  click: () => handleSelectBuildingMapMarker(b)
                }}
              >
              </Marker>
            );
          })}

          {/* EMS and PolyMart overlays temporarily disabled pending venue data audit */}
          {/*
          {(activeOverlayFilter === 'ALL' || activeOverlayFilter === 'EMS') && emsEvents.map(evt => {
            const isSelected = selectedEmsEvent?.id === evt.id;
            return (
              <Marker
                key={`ems-${evt.id}`}
                position={[evt.lat, evt.lng]}
                icon={getEmsMarkerIcon(evt.title, isSelected)}
                eventHandlers={{
                  click: () => handleSelectEmsEvent(evt)
                }}
              />
            );
          })}

          {(activeOverlayFilter === 'ALL' || activeOverlayFilter === 'POLYMART') && POLYMART_HUBS.map(hub => {
            const isSelected = selectedPolyMartHub?.id === hub.id;
            return (
              <Marker
                key={`hub-${hub.id}`}
                position={[hub.lat, hub.lng]}
                icon={getPolyMartMarkerIcon(hub.name, isSelected)}
                eventHandlers={{
                  click: () => handleSelectPolyMartHub(hub)
                }}
              />
            );
          })}
          */}

          {isNavigating && userLocation && activeBuilding && activeBuilding.center_lat && (
            <Polyline 
              positions={shortestPath && shortestPath.length > 0 ? shortestPath : [
                userLocation,
                [activeBuilding.center_lat, activeBuilding.center_lng]
              ]}
              pathOptions={{
                color: '#0ea5e9',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
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
              className="absolute inset-0 bg-slate-900/80 z-[10000]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-80 bg-[#F8F6EE] dark:bg-[#151D16] z-[10001] shadow-2xl flex flex-col border-r border-[#D9C9B2]/50 dark:border-[#3A4A3B]"
            >
              <div className="p-5 border-b border-[#D9C9B2]/50 dark:border-[#3A4A3B] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#2E3A2F] dark:text-[#F8F6EE]">{t('services:maps_directory', 'Direktori')}</h2>
                  <p className="text-xs font-bold text-[#556453] dark:text-[#A3B39F]">{t('services:maps_explore_buildings', 'Terokai Bangunan & Kelas')}</p>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-[#D9C9B2]/30 dark:hover:bg-[#1E271F] transition-colors">
                  <X className="w-5 h-5 text-[#556453] dark:text-[#A3B39F]" />
                </button>
              </div>
              <div className="p-2 border-b border-[#D9C9B2]/50 dark:border-[#3A4A3B]">
                <div className="flex bg-[#D9C9B2]/20 dark:bg-[#1E271F] rounded-xl p-1">
                  <button onClick={() => setActiveSidebarTab('akademik')} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-all", activeSidebarTab === 'akademik' ? "bg-white dark:bg-[#2E3A2F] shadow text-[#2E3A2F] dark:text-[#F8F6EE]" : "text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F]")}>{t('campus_zones', { defaultValue: 'Zon Kampus POLISAS' })}</button>
                  <button onClick={() => setActiveSidebarTab('fasiliti')} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-all", activeSidebarTab === 'fasiliti' ? "bg-white dark:bg-[#2E3A2F] shadow text-[#2E3A2F] dark:text-[#F8F6EE]" : "text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F]")}>{t('services:maps_main_facilities', 'Fasiliti Utama')}</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {activeSidebarTab === 'akademik' && (
                  <>
                    {zones.map(z => {
                      const isZoneExpanded = expandedZone === z.zone_name;
                      return (
                        <div key={`sidebar-zone-${z.zone_name}`} className="bg-[#F8F6EE]/60 dark:bg-[#1E271F]/60 rounded-2xl overflow-hidden border border-[#D9C9B2]/50 dark:border-[#3A4A3B]">
                          <button 
                            onClick={() => setExpandedZone(isZoneExpanded ? null : z.zone_name)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <p className="font-bold text-sm text-[#2E3A2F] dark:text-[#F8F6EE] leading-tight">{t('services:zone_prefix', 'Zon {{name}}', { name: z.zone_name })}</p>
                            </div>
                            {isZoneExpanded ? <ChevronDown className="w-4 h-4 text-[#556453] dark:text-[#A3B39F]" /> : <ChevronRight className="w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />}
                          </button>
                          
                          <AnimatePresence>
                            {isZoneExpanded && (
                              <motion.div initial={{ }} animate={{ }} exit={{ }} className="overflow-hidden bg-white/70 dark:bg-[#151D16]/70 border-t border-[#D9C9B2]/50 dark:border-[#3A4A3B] px-3 py-2 space-y-1">
                                {z.buildings.map(b => (
                                  <button
                                    key={b.id}
                                    onClick={() => {
                                      handleSelectBuildingMapMarker(b);
                                      setIsSidebarOpen(false);
                                    }}
                                    className="w-full py-2 px-3 flex flex-col text-left hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F]/60 rounded-xl transition-colors"
                                  >
                                    <span className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{b.name}</span>
                                    <span className="text-[10px] font-black text-[#556453] dark:text-[#A3B39F]">{b.code}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    
                    {allBuildings.filter(b => !b.zone_name && !b.is_facility).map(b => (
                      <div key={b.id} className="bg-[#F8F6EE]/60 dark:bg-[#1E271F]/60 rounded-2xl overflow-hidden border border-[#D9C9B2]/50 dark:border-[#3A4A3B]">
                         <button 
                            onClick={() => {
                              handleSelectBuildingMapMarker(b);
                              setIsSidebarOpen(false);
                            }}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-[#2E3A2F] dark:text-[#F8F6EE] leading-tight">{b.name}</p>
                                <p className="text-[10px] font-black text-[#556453] dark:text-[#A3B39F] mt-0.5">{b.code}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />
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
                      <div key={`facility-type-${type}`} className="bg-[#F8F6EE]/60 dark:bg-[#1E271F]/60 rounded-2xl overflow-hidden border border-[#D9C9B2]/50 dark:border-[#3A4A3B]">
                        <button 
                          onClick={() => setExpandedFacilityType(isTypeExpanded ? null : type)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex items-center justify-center">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <p className="font-bold text-sm text-[#2E3A2F] dark:text-[#F8F6EE] leading-tight">{type}</p>
                          </div>
                          {isTypeExpanded ? <ChevronDown className="w-4 h-4 text-[#556453] dark:text-[#A3B39F]" /> : <ChevronRight className="w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />}
                        </button>
                        
                        <AnimatePresence>
                          {isTypeExpanded && (
                            <motion.div initial={{ }} animate={{ }} exit={{ }} className="overflow-hidden bg-white/70 dark:bg-[#151D16]/70 border-t border-[#D9C9B2]/50 dark:border-[#3A4A3B] px-3 py-2 space-y-1">
                              {facilities.map(b => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    handleSelectBuildingMapMarker(b);
                                    setIsSidebarOpen(false);
                                  }}
                                  className="w-full py-2 px-3 flex flex-col text-left hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F]/60 rounded-xl transition-colors"
                                >
                                  <span className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{b.name}</span>
                                  <span className="text-[10px] font-black text-[#556453] dark:text-[#A3B39F]">{b.code}</span>
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
          
          {/* Navigation: Collapsible Mini Bar + Expand */}
          <AnimatePresence>
            {isNavigating && activeBuilding && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                transition={{ layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                className={`rounded-3xl shadow-2xl border border-blue-400/30 overflow-hidden relative bg-blue-600`}
              >
                {/* ── COLLAPSED: Mini Nav Bar ── */}
                {!cardExpanded && (
                  <div 
                    onClick={() => setCardExpanded(true)}
                    className="flex items-center justify-between px-5 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Navigation className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white/80 uppercase tracking-widest">{t('services:navigating_to', 'Memandu Arah Ke')}</p>
                        <p className="text-base font-black text-white truncate leading-tight">
                          {selectedLocation ? selectedLocation.room_code : activeBuilding.code}
                        </p>
                        {etaMinutes && (
                          <p className="text-[10px] font-bold text-blue-200 mt-0.5">
                            <Clock className="w-3 h-3 inline mr-0.5" />{etaMinutes} minit
                            {navigationStats.distance !== null && (
                              <span className="text-blue-300 ml-1">
                                ({navigationStats.distance < 1000 ? `${Math.round(navigationStats.distance)}m` : `${(navigationStats.distance / 1000).toFixed(1)}km`})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="text-[10px] font-bold text-emerald-300 flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{t('services:active_status', 'Aktif')}</span>
                      </div>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setIsNavigating(false); 
                          setHasArrivedManual(false); 
                          setCardExpanded(false);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors active:scale-95"
                      >
                        {t('services:end_navigation', 'Tamat')}
                      </button>
                    </div>
                    
                    {/* Arrival detector: shown in collapsed bar when user arrives */}
                    {(() => {
                      const dist = userLocation && activeBuilding?.center_lat
                        ? calculateDistanceInMeters(userLocation[0], userLocation[1], activeBuilding.center_lat, activeBuilding.center_lng)
                        : null;
                      const arrived = hasArrivedManual || (dist !== null && dist <= 30);
                      const hasIndoor = selectedLocation && selectedLocation.direction_text;
                      if (!arrived || !hasIndoor) return null;
                      return (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setCardExpanded(true); }}
                            className="flex items-center gap-2.5 bg-emerald-500/20 rounded-xl px-3 py-2.5 cursor-pointer active:scale-[0.98] transition-transform group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0 animate-bounce">
                              <DoorOpen className="w-4 h-4 text-emerald-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-emerald-300">{t('services:you_have_arrived', 'Anda Telah Sampai!')}</p>
                              <p className="text-[11px] font-bold text-emerald-200/80">{t('services:open_indoor_directions', 'Buka Panduan Dalaman →')}</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/50 transition-colors">
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-300" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── EXPANDED: Full Nav Details ── */}
                {cardExpanded && (
                  <div className="p-4 flex flex-col gap-3">
                    {/* Header with collapse */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCardExpanded(false)}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors active:scale-90"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <div>
                          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{t('services:navigating_to', 'Memandu Arah Ke')}</p>
                          <p className="text-white font-black text-lg">{selectedLocation ? selectedLocation.room_code : activeBuilding.code}</p>
                          {etaMinutes && (
                            <p className="text-blue-200 text-xs font-bold mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t('services:estimated_time', 'Anggaran: {{mins}} minit', { mins: etaMinutes })}</span>
                              {navigationStats.distance !== null && (
                                <span className="text-blue-300 font-medium">({navigationStats.distance < 1000 ? `${Math.round(navigationStats.distance)}m` : `${(navigationStats.distance / 1000).toFixed(1)}km`})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => { setIsNavigating(false); setHasArrivedManual(false); setCardExpanded(false); }}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shrink-0 ml-3"
                      >
                        {t('services:end_navigation', 'Tamat')}
                      </button>
                    </div>

                    {/* Weather alert warning / covered suggestion */}
                    {weather?.isRaining && (
                      <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center gap-2 text-emerald-100 text-xs mt-1">
                        <CloudRain className="w-4 h-4 shrink-0 text-emerald-300 animate-bounce" />
                        <span>{t('services:rain_detected_covered_route', 'Hujan dikesan! Laluan berbumbung diutamakan secara automatik.')}</span>
                      </div>
                    )}

                    {/* Prefer Covered Walkway Toggle */}
                    <div className="flex items-center justify-between bg-white/10 rounded-2xl p-3 border border-white/10 mt-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/10 rounded-lg text-white">
                          <Umbrella className="w-4 h-4 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Utamakan Laluan Berbumbung</p>
                          <p className="text-[10px] text-blue-200">Elakkan hujan & panas di kampus</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(20);
                          setPreferCovered(!preferCovered);
                        }}
                        className={cn(
                          "w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center",
                          preferCovered ? "bg-emerald-400" : "bg-white/25"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                            preferCovered ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Directions Section */}
                    {(() => {
                      const distanceMeters = userLocation && activeBuilding?.center_lat
                        ? calculateDistanceInMeters(userLocation[0], userLocation[1], activeBuilding.center_lat, activeBuilding.center_lng)
                        : null;
                      
                      const hasArrived = hasArrivedManual || (distanceMeters !== null && distanceMeters <= 30);
                      const hasIndoorDirections = selectedLocation && selectedLocation.direction_text;

                      // If they have arrived AND we have indoor directions, show the Indoor (Langkah Dalaman) card
                      if (hasIndoorDirections && hasArrived) {
                        const steps = selectedLocation.direction_text.split(/\r?\n/).filter(s => s.trim().length > 0);
                        const isMultiStep = steps.length > 1;

                        return (
                          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 mt-1">
                            <div className="flex gap-3">
                              <DoorOpen className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                {isMultiStep ? (
                                  <div className="flex flex-col">
                                    {/* Segmented Progress Bar */}
                                    <div className="flex gap-1.5 mb-3 w-full">
                                      {steps.map((_, idx) => (
                                        <div key={idx} className="h-1 rounded-full flex-1 bg-white/20 overflow-hidden">
                                          <motion.div 
                                            className="h-full w-full origin-left bg-white"
                                            initial={false}
                                            animate={{ 
                                              scaleX: idx <= currentStep ? 1 : 0 
                                            }}
                                            transition={{ duration: 0.3 }}
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    <motion.div key={currentStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 mb-1 block">
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
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 mb-1 block">
                                      Panduan Dalaman
                                    </span>
                                    <p className="text-sm font-bold text-white leading-relaxed">
                                      {selectedLocation.direction_text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Otherwise, show external walkways navigation (Dijkstra Turn-by-Turn list) and hasArrived toggle if needed
                      return (
                        <div className="flex flex-col gap-2 mt-1">
                          {/* External Walkways Turn-by-Turn Card */}
                          {navigationSteps.length > 0 && (
                            <div className="bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
                              <button
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(25);
                                  setShowTbtSteps(!showTbtSteps);
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left focus:outline-none"
                              >
                                <div className="flex items-center gap-2">
                                  <Compass className="w-4 h-4 text-blue-200 shrink-0" />
                                  <span className="text-xs font-bold text-white">Langkah Perjalanan ({navigationSteps.length - 1} langkah)</span>
                                </div>
                                {showTbtSteps ? (
                                  <ChevronDown className="w-4 h-4 text-white/70" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-white/70" />
                                )}
                              </button>
                              
                              <AnimatePresence>
                                {showTbtSteps && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="border-t border-white/10 max-h-48 overflow-y-auto px-3 py-2 space-y-2.5 bg-black/15 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                                  >
                                    {navigationSteps.map((step, idx) => {
                                      // Determine step icon
                                      let stepIcon = <Navigation className="w-3.5 h-3.5 text-blue-300 rotate-90" />;
                                      if (step.instruction.toLowerCase().includes('kanan')) {
                                        stepIcon = <CornerUpRight className="w-3.5 h-3.5 text-emerald-400" />;
                                      } else if (step.instruction.toLowerCase().includes('kiri')) {
                                        stepIcon = <CornerUpLeft className="w-3.5 h-3.5 text-rose-400" />;
                                      } else if (step.instruction.toLowerCase().includes('sampai') || step.instruction.toLowerCase().includes('destinasi')) {
                                        stepIcon = <MapPin className="w-3.5 h-3.5 text-blue-400" />;
                                      }

                                      return (
                                        <div key={idx} className="flex gap-2.5 items-start text-xs">
                                          <div className="p-1 bg-white/10 rounded-md shrink-0 mt-0.5">
                                            {stepIcon}
                                          </div>
                                          <div className="flex-1">
                                            <p className="font-semibold text-white leading-tight">{step.instruction}</p>
                                            {step.distance > 0 && (
                                              <p className="text-[10px] text-blue-200 mt-0.5 flex items-center gap-1.5">
                                                <span>Jalan terus {step.distance}m</span>
                                                {step.isCovered && (
                                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase">
                                                    <Umbrella className="w-2.5 h-2.5" /> Berbumbung
                                                  </span>
                                                )}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Manual "Seterusnya" for indoor entrance */}
                          {hasIndoorDirections && !hasArrived && (
                            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col gap-2">
                              <p className="text-xs text-white leading-relaxed">
                                Panduan dalaman bilik akan dibuka secara automatik apabila anda berada &lt; 30m dari bangunan.
                              </p>
                              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                <span className="text-[10px] font-bold text-white/60">Jarak ke bangunan: {distanceMeters !== null ? `${Math.round(distanceMeters)}m` : 'mengira...'}</span>
                                <button 
                                  onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(40);
                                    setHasArrivedManual(true);
                                  }}
                                  className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                                >
                                  Seterusnya <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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

          {/* ── DRAGGABLE GESTURE BOTTOM SHEET (BUILDING, EMS EVENT, POLYMART HUB) ── */}
          <AnimatePresence>
            {(activeBuilding || selectedEmsEvent || selectedPolyMartHub) && !isNavigating && (
              <motion.div
                layout
                drag="y"
                dragListener={false}
                dragControls={sheetDragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, info) => {
                  if (info.offset.y < -35 || info.velocity.y < -250) {
                    setSheetSnap(prev => (prev === 'PEEK' ? 'HALF' : 'FULL'));
                  } else if (info.offset.y > 35 || info.velocity.y > 250) {
                    setSheetSnap(prev => (prev === 'FULL' ? 'HALF' : 'PEEK'));
                  }
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className={cn(
                  "rounded-3xl shadow-2xl overflow-hidden relative flex flex-col",
                  "bg-white dark:bg-[#151D16] border-t border-[#D9C9B2]/80 dark:border-[#3A4A3B]",
                  sheetSnap === 'PEEK' && "max-h-[116px]",
                  sheetSnap === 'HALF' && "max-h-[48vh] overflow-y-auto no-scrollbar",
                  sheetSnap === 'FULL' && "max-h-[85vh] overflow-y-auto"
                )}
              >
                {/* Drag Handle Bar */}
                <div 
                  className="w-full pt-3 pb-2 flex flex-col items-center justify-center select-none shrink-0 touch-none cursor-grab active:cursor-grabbing"
                  title="Tarik atau tekan untuk tukar saiz paparan"
                  onPointerDown={(e) => sheetDragControls.start(e)}
                >
                  <div 
                    onClick={() => {
                      setSheetSnap(prev => prev === 'PEEK' ? 'HALF' : prev === 'HALF' ? 'FULL' : 'PEEK');
                    }}
                    className="w-12 h-1.5 bg-[#D9C9B2] dark:bg-[#3A4A3B] rounded-full mx-auto cursor-grab active:cursor-grabbing touch-none transition-transform active:scale-95" 
                  />
                </div>

                {/* ── EMS EVENT PREVIEW ── */}
                {selectedEmsEvent && (
                  <>
                    {sheetSnap === 'PEEK' ? (
                      <div 
                        onClick={() => setSheetSnap('HALF')}
                        className="flex items-center justify-between px-5 pb-3 cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                              {selectedEmsEvent.title}
                            </p>
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate">
                              {selectedEmsEvent.category || 'Acara EMS'} · {selectedEmsEvent.event_date ? new Date(selectedEmsEvent.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) : 'Akan Datang'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/ems/hub'); }}
                            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 rounded-xl font-black text-xs transition-colors shadow-lg shadow-amber-500/30 active:scale-95"
                          >
                            <span>{t('services:open_ems', 'Buka EMS')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSheetSnap('HALF'); }}
                            className="w-7 h-7 rounded-full bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                            className="w-7 h-7 rounded-full bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 pb-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mb-1.5">
                              <Trophy className="w-3 h-3" /> Acara EMS
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                              {selectedEmsEvent.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                              {selectedEmsEvent.category && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {selectedEmsEvent.category}
                                </span>
                              )}
                              {selectedEmsEvent.event_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(selectedEmsEvent.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {selectedEmsEvent.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {selectedEmsEvent.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={dismissCard}
                            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {selectedEmsEvent.description && (
                          <p className={cn("text-xs text-slate-600 dark:text-slate-300 mb-4", sheetSnap === 'HALF' && "line-clamp-3")}>
                            {selectedEmsEvent.description}
                          </p>
                        )}

                        {sheetSnap === 'HALF' ? (
                          <button
                            onClick={() => setSheetSnap('FULL')}
                            className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Keterangan Lanjut</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSheetSnap('HALF')}
                            className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{t('services:collapse_view', 'Kecilkan Paparan')}</span>
                          </button>
                        )}

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => navigate('/ems/hub')}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-amber-500/30 active:scale-[0.98]"
                          >
                            <span>{t('services:open_ems', 'Buka EMS')}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startNavigationToCoords(selectedEmsEvent.lat, selectedEmsEvent.lng, selectedEmsEvent.title)}
                            className="w-full flex items-center justify-center gap-2 bg-[#C96F4F] hover:bg-[#B35F41] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-md shadow-[#C96F4F]/25 active:scale-[0.98]"
                          >
                            <Navigation className="w-3.5 h-3.5" /> {t('services:navigate_to_location', 'Navigasi ke Lokasi')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── POLYMART HUB PREVIEW ── */}
                {selectedPolyMartHub && (
                  <>
                    {sheetSnap === 'PEEK' ? (
                      <div 
                        onClick={() => setSheetSnap('HALF')}
                        className="flex items-center justify-between px-5 pb-3 cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                              {selectedPolyMartHub.name}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{selectedPolyMartHub.operating_hours}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/polymart'); }}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-black text-xs transition-colors shadow-lg shadow-emerald-600/30 active:scale-95"
                          >
                            <span>{t('services:open_polymart', 'Buka PolyMart')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSheetSnap('HALF'); }}
                            className="w-7 h-7 rounded-full bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                            className="w-7 h-7 rounded-full bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 pb-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 mb-1.5">
                              <ShoppingBag className="w-3 h-3" /> PolyMart Hub
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                              {selectedPolyMartHub.name}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              {selectedPolyMartHub.operating_hours}
                            </p>
                          </div>
                          <button 
                            onClick={dismissCard}
                            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                          {selectedPolyMartHub.description}
                        </p>

                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 mb-4 text-xs text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">
                          <span className="font-bold block text-emerald-800 dark:text-emerald-300 mb-0.5">{t('services:pickup_guide_label', 'Panduan Pengambilan:')}</span>
                          {selectedPolyMartHub.pickup_instructions}
                        </div>

                        {sheetSnap === 'HALF' ? (
                          <button
                            onClick={() => setSheetSnap('FULL')}
                            className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{t('services:hub_more_info', 'Maklumat Lanjut Hub')}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSheetSnap('HALF')}
                            className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{t('services:collapse_view', 'Kecilkan Paparan')}</span>
                          </button>
                        )}

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => navigate('/polymart')}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-emerald-600/30 active:scale-[0.98]"
                          >
                            <span>{t('services:open_polymart', 'Buka PolyMart')}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startNavigationToCoords(selectedPolyMartHub.lat, selectedPolyMartHub.lng, selectedPolyMartHub.name)}
                            className="w-full flex items-center justify-center gap-2 bg-[#C96F4F] hover:bg-[#B35F41] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-md shadow-[#C96F4F]/25 active:scale-[0.98]"
                          >
                            <Navigation className="w-3.5 h-3.5" /> {t('services:navigate_to_hub', 'Pandu Arah ke Hub')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── BUILDING / ROOM PREVIEW ── */}
                {activeBuilding && !selectedEmsEvent && !selectedPolyMartHub && (
                  <>
                    {/* PEEK Snap Level */}
                    {sheetSnap === 'PEEK' && (
                      <div 
                        onClick={() => setSheetSnap('HALF')}
                        className="flex items-center justify-between px-5 pb-3 cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate leading-tight">
                              {selectedLocation ? selectedLocation.room_code : activeBuilding.name}
                            </p>
                            {selectedLocation && (
                              <p className="text-[10px] font-bold text-[#556453] dark:text-[#A3B39F] truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{activeBuilding.name} · T{selectedLocation.floor_level}</span>
                              </p>
                            )}
                            {!selectedLocation && (
                              <p className="text-[10px] font-bold text-[#6B7F5B] dark:text-[#A3B39F] truncate">
                                {t('services:code_prefix', 'Kod: {{code}}', { code: activeBuilding.code })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {((selectedLocation ? isLocation360Active(selectedLocation) : isBuilding360Active(activeBuilding)) && (selectedLocation?.panorama_360_url || activeBuilding.panorama_360_url)) && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const pano = selectedLocation?.panorama_360_url || activeBuilding.panorama_360_url;
                                if (pano) {
                                  setFullscreen360Url(pano);
                                  setFullscreen360Title(selectedLocation ? `${selectedLocation.room_code} (${activeBuilding.name})` : activeBuilding.name);
                                }
                              }}
                              className="flex items-center gap-1.5 bg-[#6B7F5B]/15 hover:bg-[#6B7F5B]/25 text-[#6B7F5B] dark:text-[#A3B39F] border border-[#6B7F5B]/30 px-3 py-2 rounded-xl font-black text-xs transition-all shadow-sm active:scale-95"
                              title="Buka 360 Panorama"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{t('services:panorama_360_active', '360 AKTIF')}</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); startNavigation(); }}
                            className="flex items-center gap-1.5 bg-[#C96F4F] hover:bg-[#B35F41] text-white px-4 py-2 rounded-xl font-black text-xs transition-colors shadow-lg shadow-[#C96F4F]/25 active:scale-95"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Pandu</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSheetSnap('HALF'); }}
                            className="w-7 h-7 rounded-full bg-[#D9C9B2]/30 dark:bg-[#1E271F] hover:bg-[#D9C9B2]/50 flex items-center justify-center text-[#556453] dark:text-[#A3B39F] transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                            className="w-7 h-7 rounded-full bg-[#D9C9B2]/30 dark:bg-[#1E271F] hover:bg-[#D9C9B2]/50 flex items-center justify-center text-[#556453] dark:text-[#A3B39F] transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* HALF & FULL Snap Levels */}
                    {(sheetSnap === 'HALF' || sheetSnap === 'FULL') && (
                      <>
                        {/* Top-Right Controls: Minimize to Peek & Dismiss */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => setSheetSnap('PEEK')}
                            className={`w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors active:scale-95 `}
                            title="Lipat ke bawah"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                            className={`w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors active:scale-95 `}
                            title="Tutup maklumat"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Media Area */}
                        {(() => {
                          const is360Permitted = selectedLocation ? isLocation360Active(selectedLocation) : isBuilding360Active(activeBuilding);
                          const activePanoUrl = is360Permitted ? (selectedLocation?.panorama_360_url || activeBuilding.panorama_360_url) : null;
                          const hasMultipleMedia = ((activeBuilding.entrance_image_url ? 1 : 0) + (activeBuilding.floorplan_image_url ? 1 : 0) + ((selectedLocation && selectedLocation.image_url) ? 1 : 0) + (activePanoUrl ? 1 : 0)) > 1;

                          return (
                            <div className="w-full h-36 sm:h-52 bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
                              {/* Media Content */}
                              {activeImageTab === '360' && activePanoUrl && (
                                <div className="w-full h-full relative">
                                  <Pannellum360Viewer
                                    imageUrl={activePanoUrl}
                                    title={selectedLocation ? selectedLocation.room_code : activeBuilding.name}
                                    height="100%"
                                    className="w-full h-full"
                                    onToggleFullscreen={() => {
                                      setFullscreen360Url(activePanoUrl);
                                      setFullscreen360Title(selectedLocation ? `${selectedLocation.room_code} (${activeBuilding.name})` : activeBuilding.name);
                                    }}
                                  />
                                </div>
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
                              {((activeImageTab === 'entrance' && !activeBuilding.entrance_image_url) || 
                                (activeImageTab === 'floorplan' && !activeBuilding.floorplan_image_url) ||
                                (activeImageTab === 'room' && !selectedLocation?.image_url) ||
                                (activeImageTab === '360' && !activePanoUrl)) && (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  {activeImageTab === 'floorplan' ? (
                                    <MapIcon className="w-10 h-10 mb-2 opacity-50" />
                                  ) : activeImageTab === '360' ? (
                                    <Compass className="w-10 h-10 mb-2 opacity-50 text-emerald-400" />
                                  ) : (
                                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                  )}
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    Tiada Imej {activeImageTab === 'entrance' ? 'Pintu Masuk' : activeImageTab === 'floorplan' ? 'Pelan Lantai' : activeImageTab === '360' ? 'Panorama 360°' : 'Bilik'}
                                  </span>
                                </div>
                              )}
                              
                              {selectedLocation && (
                                <div className={`absolute top-3 left-3 bg-emerald-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase  z-10`}>
                                  LOKASI JUMPA
                                </div>
                              )}

                              {/* Media Tabs */}
                              {hasMultipleMedia && (
                                <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 p-1 rounded-full border border-white/10  z-10`}>
                                  {activePanoUrl && (
                                    <button 
                                      onClick={() => setActiveImageTab('360')} 
                                      className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap", 
                                        activeImageTab === '360' ? "bg-[#6B7F5B] text-white shadow-sm" : "text-white hover:bg-white/20"
                                      )}
                                    >
                                      <Compass className="w-3 h-3" />
                                      {t('services:panorama_360_active', '360 AKTIF')}
                                    </button>
                                  )}
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
                              )}
                            </div>
                          );
                        })()}

                        {/* Details Area */}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-[#2E3A2F] dark:text-[#F8F6EE] leading-tight">
                                  {selectedLocation ? selectedLocation.room_code : activeBuilding.name}
                                </h2>
                                {((selectedLocation ? isLocation360Active(selectedLocation) : isBuilding360Active(activeBuilding)) && (selectedLocation?.panorama_360_url || activeBuilding.panorama_360_url)) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const pano = selectedLocation?.panorama_360_url || activeBuilding.panorama_360_url;
                                      if (pano) {
                                        setFullscreen360Url(pano);
                                        setFullscreen360Title(selectedLocation ? `${selectedLocation.room_code} (${activeBuilding.name})` : activeBuilding.name);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] bg-[#6B7F5B]/15 hover:bg-[#6B7F5B]/25 text-[#6B7F5B] dark:text-[#A3B39F] border border-[#6B7F5B]/30 px-2 py-0.5 rounded-full font-black tracking-wider uppercase transition-colors cursor-pointer active:scale-95"
                                    title={t('services:open_360_panorama', 'Buka 360 Panorama Penuh')}
                                  >
                                    <Compass className="w-3 h-3" /> {t('services:panorama_360_active', '360 AKTIF')}
                                  </button>
                                )}
                              </div>
                              
                              {/* Facility Live Status */}
                              {activeBuilding.is_facility && activeBuilding.op_start && activeBuilding.op_end && !selectedLocation && (
                                <div className="mt-1 mb-2 flex items-center gap-1.5">
                                  {checkIsOpen(activeBuilding.op_start, activeBuilding.op_end) ? (
                                    <span className="inline-flex items-center gap-1 bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B] animate-pulse"></span> {t('services:facility_open', 'BUKA')} ({activeBuilding.op_start.slice(0,5)} - {activeBuilding.op_end.slice(0,5)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {t('services:facility_closed', 'TUTUP')}
                                    </span>
                                  )}
                                </div>
                              )}

                              {selectedLocation && (
                                <p className="text-sm font-bold text-[#556453] dark:text-[#A3B39F] flex items-center gap-1.5 mt-1">
                                  <Building2 className="w-4 h-4" /> {activeBuilding.name}
                                </p>
                              )}
                              {!selectedLocation && (
                                <p className="text-sm font-bold text-[#6B7F5B] dark:text-[#A3B39F] flex items-center gap-1.5 mt-1">
                                  {t('services:code_prefix', 'Kod: {{code}}', { code: activeBuilding.code })}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {selectedLocation && (
                                <div className="w-12 h-12 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] dark:text-[#A3B39F] flex flex-col items-center justify-center shrink-0 ml-3">
                                  <Layers className="w-4 h-4" />
                                  <span className="text-[10px] font-black">{t('services:floor_short', 'T{{level}}', { level: selectedLocation.floor_level })}</span>
                                </div>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                className="p-2 rounded-xl bg-[#F8F6EE] dark:bg-[#1E271F] border border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-[#556453] dark:text-[#A3B39F] hover:bg-[#D9C9B2]/30 transition-colors"
                                title={t('services:share_location', 'Kongsi Lokasi')}
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Snap Toggle Button */}
                          {sheetSnap === 'HALF' ? (
                            <button
                              onClick={() => setSheetSnap('FULL')}
                              className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-[#6B7F5B] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-white transition-colors active:scale-95"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>{t('services:show_full_directory', 'Lihat Direktori Penuh & Laluan Luar')}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSheetSnap('HALF')}
                              className="w-full mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-white transition-colors active:scale-95"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>{t('services:collapse_card', 'Lipat Kad')}</span>
                            </button>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startNavigation(); }}
                              className="tour-polymaps-navigate w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-colors active:scale-[0.98] bg-[#C96F4F] hover:bg-[#B35F41] text-white shadow-lg shadow-[#C96F4F]/25"
                            >
                              <Navigation className="w-4 h-4" /> {t('route_directions', { defaultValue: 'Dapatkan Panduan Laluan Berjalan' })}
                            </button>
                            
                            <button
                              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeBuilding.center_lat},${activeBuilding.center_lng}`, '_blank')}
                              className="w-full text-center text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-white text-xs font-bold transition-colors mt-1 underline underline-offset-2"
                            >
                              {t('services:drive_from_outside_google_maps', 'Memandu dari luar kampus? Buka Google Maps')}
                            </button>

                            {/* FULL Snap Level: Full Building Directory */}
                            {sheetSnap === 'FULL' && (
                              <div className="mt-3 pt-3 border-t border-[#D9C9B2]/50 dark:border-[#3A4A3B]">
                                <p className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE] uppercase tracking-wider mb-2">
                                  {t('services:room_directory_count', 'Direktori Bilik & Ruang ({{count}})', { count: getLocationsForBuilding(activeBuilding.id).length })}
                                </p>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                  {getLocationsForBuilding(activeBuilding.id).map(room => (
                                    <button
                                      key={room.id}
                                      onClick={() => handleSelectLocation(room)}
                                      className={cn(
                                        "w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors border",
                                        selectedLocation?.id === room.id
                                          ? "bg-[#2E3A2F] text-[#F8F6EE] font-black border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white"
                                          : "bg-[#F8F6EE]/60 dark:bg-[#1E271F]/60 border-[#D9C9B2]/60 dark:border-[#3A4A3B] hover:bg-[#F8F6EE] dark:hover:bg-[#1E271F] text-[#2E3A2F] dark:text-[#F8F6EE] font-bold"
                                      )}
                                    >
                                      <span className="truncate">{room.room_code}</span>
                                      <span className="text-[10px] text-[#556453] dark:text-[#A3B39F] shrink-0 ml-2">T{room.floor_level}</span>
                                    </button>
                                  ))}
                                  {getLocationsForBuilding(activeBuilding.id).length === 0 && (
                                    <p className="text-xs text-[#556453] dark:text-[#A3B39F] italic py-1">Tiada data bilik terperinci direkodkan.</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dismiss card */}
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                              className="w-full text-center text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] text-[10px] font-bold transition-colors mt-1"
                            >
                              Tutup
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
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
            className={`fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black`}
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

      {/* ── LIGHTBOX FOR FULLSCREEN 360 PANORAMA ── */}
      <AnimatePresence>
        {fullscreen360Url && (
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3500] bg-black flex flex-col"
          >
            <Pannellum360Viewer
              imageUrl={fullscreen360Url}
              title={fullscreen360Title || activeBuilding?.name || 'POLISAS 360°'}
              height="100%"
              className="w-full h-full"
              isFullscreen={true}
              onClose={() => setFullscreen360Url(null)}
              onToggleFullscreen={() => setFullscreen360Url(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MISSING LOCATION REPORT MODAL ── */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className={`absolute inset-0 bg-slate-900/90`}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('services:report_missing_location_title', 'Laporkan Lokasi Tiada')}</h3>
                  <p className="text-xs font-bold text-slate-500 font-sans">{t('services:report_missing_location_subtitle', 'Bantu JPP kemas kini peta kampus')}</p>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('services:place_name_label', 'Nama Tempat / Bilik / Ruang')}
                  </label>
                  <input
                    type="text"
                    required
                    value={reportForm.room_code}
                    onChange={(e) => setReportForm(prev => ({ ...prev, room_code: e.target.value }))}
                    placeholder={t('services:place_name_placeholder', 'Contoh: A302, Makmal CAD 2')}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('services:building_suggestion_label', 'Cadangan Bangunan / Blok')}
                  </label>
                  <select
                    value={reportForm.building_id}
                    onChange={(e) => setReportForm(prev => ({ ...prev, building_id: e.target.value, building_name_suggestion: e.target.value === 'new' ? '' : prev.building_name_suggestion }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-rose-500 transition-all"
                  >
                    <option value="">{t('services:select_building_optional', '-- Pilih Bangunan (Jika Tahu) --')}</option>
                    {allBuildings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                    <option value="new">{t('services:other_or_new_building', 'Lain-lain / Bangunan Baru')}</option>
                  </select>
                </div>

                {reportForm.building_id === 'new' && (
                  <motion.div
                    initial={{ opacity: 0, }}
                    animate={{ opacity: 1, }}
                    exit={{ opacity: 0, }}
                  >
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t('services:new_building_name_label', 'Nama Bangunan / Cadangan Baru')}
                    </label>
                    <input
                      type="text"
                      required
                      value={reportForm.building_name_suggestion}
                      onChange={(e) => setReportForm(prev => ({ ...prev, building_name_suggestion: e.target.value }))}
                      placeholder={t('services:new_building_placeholder', 'Masukkan nama bangunan/blok')}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 transition-all"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('services:floor_level_label', 'Aras (Tingkat)')}
                  </label>
                  <select
                    value={reportForm.floor_level}
                    onChange={(e) => setReportForm(prev => ({ ...prev, floor_level: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-rose-500 transition-all"
                  >
                    <option value="0">{t('services:ground_floor', 'Aras Bawah (Ground)')}</option>
                    <option value="1">{t('services:floor_n', 'Aras {{level}}', { level: 1 })}</option>
                    <option value="2">{t('services:floor_n', 'Aras {{level}}', { level: 2 })}</option>
                    <option value="3">{t('services:floor_n', 'Aras {{level}}', { level: 3 })}</option>
                    <option value="4">{t('services:floor_n', 'Aras {{level}}', { level: 4 })}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('services:additional_notes_landmark', 'Nota Tambahan (Landmark / Posisi)')}
                  </label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('services:landmark_placeholder', 'Contoh: Sebelah lif utama, berdekatan bilik pensyarah JTM')}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 transition-all resize-none font-bold"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95"
                  >
                    {t('common:cancel', 'Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('services:submitting', 'Hantar...')}
                      </>
                    ) : (
                      t('services:submit_report_button', 'Hantar Laporan')
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* duplicate lightbox removed */}


      {/* ── GLOBAL BOTTOM NAV ── */}
      <BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} forceShowDesktop={true} />

      <SystemTour run={runTour} onClose={closeTour} tourKey="POLYMAPS_PAGE" />
      <FloatingAiChat />
    </div>
  );
}

