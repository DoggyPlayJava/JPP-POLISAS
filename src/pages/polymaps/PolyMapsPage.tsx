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
  CloudRain, Sun, HelpCircle, Loader2, Umbrella, CornerUpLeft, 
  CornerUpRight, Compass
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToJppAndSuperAdmin } from '@/lib/notifications';
import { BottomNav } from '@/components/layout/BottomNav';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

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

const getUserIcon = (heading: number | null) => {
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
  return L.divIcon({
    className: '',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

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

export function PolyMapsPage() {
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
  const { user, profile } = useAuth();
  const isLowEnd = React.useRef(isLowEndDevice()).current;
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

  const [activeImageTab, setActiveImageTab] = useState<'entrance' | 'floorplan' | 'room'>('entrance');
  const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [weather, setWeather] = useState<{ isRaining: boolean, isHot: boolean } | null>(null);

  const { runTour, startTour, closeTour } = useTour('POLYMAPS_PAGE', true, 2500);

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
    if (weather?.isRaining) {
      setPreferCovered(true);
      toast.success('Hari hujan! Mod laluan berbumbung diaktifkan secara automatik.', { id: 'rain-toggle-toast' });
    }
  }, [weather?.isRaining]);

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
  // No realtime subscription needed — AI reads once on chat open.
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
    } catch { /* silent fail — private browsing may block sessionStorage */ }

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

    // Fetch buildings, locations, and walkways in parallel
    const [bRes, lRes, wRes] = await Promise.all([
      supabase.from('imaps_buildings').select('*').order('name'),
      supabase.from('imaps_locations').select('*, building:building_id(*)').order('floor_level'),
      supabase.from('imaps_walkways').select('*').order('created_at', { ascending: false })
    ]);

    if (bRes.error) {
      console.error('PolyMaps: Failed to load buildings:', bRes.error.message);
    }
    const bData = bRes.data;
    if (bData) setAllBuildings(bData);
    
    if (lRes.error) {
      console.error('PolyMaps: Failed to load locations:', lRes.error.message);
    }
    const lData = lRes.data;
    const formatted = (lData || []).map((item: any) => ({
      ...item,
      building: Array.isArray(item.building) ? item.building[0] : item.building
    }));
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
          setActiveImageTab(targetRoom.image_url ? 'room' : (targetRoom.building?.entrance_image_url ? 'entrance' : 'floorplan'));
        }, 300);
      }
    } else if (bId && bData) {
      const targetBuilding = bData.find(b => b.id === bId);
      if (targetBuilding) {
        setTimeout(() => {
          setActiveBuilding(targetBuilding);
          setActiveImageTab(targetBuilding.entrance_image_url ? 'entrance' : 'floorplan');
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
            id, name, code, center_lat, center_lng, entrance_image_url, floorplan_image_url, zone_name
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
    setSelectedLocation(loc);
    setActiveBuilding(loc.building);
    setActiveImageTab(loc.image_url ? 'room' : (loc.building?.entrance_image_url ? 'entrance' : 'floorplan'));
    setCurrentStep(0);
    setSearchQuery('');
    setSearchResults([]);
    setActiveFilter(null);
    setIsSidebarOpen(false);
  };

  const handleSelectBuildingMapMarker = (b: Building) => {
    setSelectedLocation(null);
    setActiveBuilding(b);
    setActiveImageTab(b.entrance_image_url ? 'entrance' : 'floorplan');
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
    requestCompassPermission();
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

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if ((e as any).webkitCompassHeading !== undefined) {
        setHeading((e as any).webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
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
      navigator.clipboard.writeText(`📍 Lihat lokasi bilik/kelas ${selectedLocation.room_code} di PolyMaps POLISAS:\n${url}`);
      toast.success('Pautan kelas disalin!');
    } else if (activeBuilding) {
      const url = `${window.location.origin}${window.location.pathname}?b=${activeBuilding.id}`;
      navigator.clipboard.writeText(`📍 Lihat lokasi ${activeBuilding.name} di PolyMaps POLISAS:\n${url}`);
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
            <div className="tour-polymaps-search flex-1 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2.5 flex items-center gap-3">
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
            <button
              onClick={startTour}
              className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 shadow-lg border border-blue-200 dark:border-blue-800/50 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="tour-polymaps-quick flex gap-2 overflow-x-auto no-scrollbar pb-1">
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

            {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 text-center space-y-3"
              >
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-normal">
                  Tidak jumpa tempat yang anda cari?
                </p>
                <button
                  onClick={handleOpenReportModal}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-colors shadow-md active:scale-95"
                >
                  Maklumkan kepada JPP
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 w-full relative z-0 after:content-[''] after:block after:h-32 after:shrink-0">
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
                      <p className="text-blue-200 text-xs font-bold mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Anggaran: {etaMinutes} minit</span>
                        {navigationStats.distance !== null && (
                          <span className="text-blue-300 font-medium">({navigationStats.distance < 1000 ? `${Math.round(navigationStats.distance)}m` : `${(navigationStats.distance / 1000).toFixed(1)}km`})</span>
                        )}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => { setIsNavigating(false); setHasArrivedManual(false); }}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                  >
                    Tamat
                  </button>
                </div>                {/* Weather alert warning / covered suggestion */}
                {weather?.isRaining && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center gap-2 text-emerald-100 text-xs mt-1">
                    <CloudRain className="w-4 h-4 shrink-0 text-emerald-300 animate-bounce" />
                    <span>Hujan dikesan! Laluan berbumbung diutamakan secara automatik.</span>
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
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
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
                    (activeImageTab === 'room' && !selectedLocation?.image_url)) && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      {activeImageTab === 'floorplan' ? <MapIcon className="w-10 h-10 mb-2 opacity-50" /> : <ImageIcon className="w-10 h-10 mb-2 opacity-50" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">Tiada Imej {activeImageTab === 'entrance' ? 'Pintu Masuk' : activeImageTab === 'floorplan' ? 'Pelan Lantai' : 'Bilik'}</span>
                    </div>
                  )}
                  
                  {selectedLocation && (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                      LOKASI JUMPA
                    </div>
                  )}

                  {/* Media Tabs */}
                  {((activeBuilding.entrance_image_url ? 1 : 0) + (activeBuilding.floorplan_image_url ? 1 : 0) + ((selectedLocation && selectedLocation.image_url) ? 1 : 0)) > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
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
                      className="tour-polymaps-navigate w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-blue-500/30"
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

      {/* ── MISSING LOCATION REPORT MODAL ── */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Lapor Tempat Hilang</h3>
                  <p className="text-xs font-bold text-slate-500 font-sans">Bantu JPP kemaskini peta kampus</p>
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
                    Nama Tempat / Kelas / Ruang
                  </label>
                  <input
                    type="text"
                    required
                    value={reportForm.room_code}
                    onChange={(e) => setReportForm(prev => ({ ...prev, room_code: e.target.value }))}
                    placeholder="Contoh: A302, Makmal CAD 2"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Cadangan Bangunan / Blok
                  </label>
                  <select
                    value={reportForm.building_id}
                    onChange={(e) => setReportForm(prev => ({ ...prev, building_id: e.target.value, building_name_suggestion: e.target.value === 'new' ? '' : prev.building_name_suggestion }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-rose-500 transition-all"
                  >
                    <option value="">-- Pilih Bangunan (Jika Tahu) --</option>
                    {allBuildings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                    <option value="new">Lain-lain / Bangunan Baru</option>
                  </select>
                </div>

                {reportForm.building_id === 'new' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Nama Bangunan Baru / Cadangan
                    </label>
                    <input
                      type="text"
                      required
                      value={reportForm.building_name_suggestion}
                      onChange={(e) => setReportForm(prev => ({ ...prev, building_name_suggestion: e.target.value }))}
                      placeholder="Masukkan nama bangunan/blok"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 transition-all"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Aras (Tingkat)
                  </label>
                  <select
                    value={reportForm.floor_level}
                    onChange={(e) => setReportForm(prev => ({ ...prev, floor_level: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-rose-500 transition-all"
                  >
                    <option value="0">Aras Bawah (Ground Floor)</option>
                    <option value="1">Aras 1</option>
                    <option value="2">Aras 2</option>
                    <option value="3">Aras 3</option>
                    <option value="4">Aras 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Catatan Tambahan (Landmark / Kedudukan)
                  </label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contoh: Sebelah lif utama, berdekatan bilik pensyarah JTM"
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
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Hantar...
                      </>
                    ) : (
                      'Hantar Aduan'
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

