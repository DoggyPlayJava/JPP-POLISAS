import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, MapPin, Navigation, ShieldAlert, Banknote, UserCircle, MessageCircle, Send, Map as MapIcon, X, CheckCircle, Check, Users, Star, History, Clock, Phone, ChevronRight, Bug, TrendingUp, Award, Receipt, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { CancelJobModal } from '@/components/polyrider/CancelJobModal';
import { notifyKLKOnSuspension } from '@/lib/polyRiderNotify';
import { SwipeToSOS } from '@/components/polyrider/SwipeToSOS';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPicker } from '@/components/MapPicker';
import { LocationSearchInput } from '@/components/polyrider/LocationSearchInput';
import { SOSContactsManager } from './SOSContactsManager';
import { notifyAllActiveRiders, notifyBiddingRiders, notifyUsers } from '@/lib/polyRiderNotify';
import { POLYRIDER_ADDONS, type AddonKey } from '@/lib/polyRiderConstants';

// Haversine distance utility — module scope (avoids re-creation in render loop)
function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const x = Math.sin(dLat/2)**2 + Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

/** Calculate total surcharge for multi-stop route based on actual detour distance.
 *  Route: Pickup → Stop1 → Stop2 → ... → Dropoff
 *  Surcharge = (total multi-stop route distance - direct pickup→dropoff distance) × RM1.50/km
 *  Minimum RM0.50 per stop to cover rider inconvenience even for nearby stops. */
function calcStopsSurcharge(
  pickupPos: [number, number] | null,
  dropoffPos: [number, number] | null,
  stops: { name: string; lat: number | null; lng: number | null }[]
): { surcharge: number; detourKm: number } {
  const validStops = stops.filter(s => s.lat != null && s.lng != null);
  if (!pickupPos || !dropoffPos || validStops.length === 0) return { surcharge: 0, detourKm: 0 };
  
  // Direct distance (no stops)
  const directKm = haversineKm(pickupPos, dropoffPos);
  
  // Multi-stop route: Pickup → Stop1 → Stop2 → ... → Dropoff
  const waypoints: [number, number][] = [
    pickupPos,
    ...validStops.map(s => [s.lat!, s.lng!] as [number, number]),
    dropoffPos,
  ];
  let routeKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    routeKm += haversineKm(waypoints[i], waypoints[i + 1]);
  }
  
  const detourKm = Math.max(0, routeKm - directKm);
  // RM1.50/km for detour, minimum RM0.50 per valid stop
  const minSurcharge = validStops.length * 0.50;
  const surcharge = Math.max(minSurcharge, +(detourKm * 1.5).toFixed(2));
  
  return { surcharge: +surcharge.toFixed(2), detourKm: +detourKm.toFixed(2) };
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Mencari Rider' },
  { key: 'ACCEPTED', label: 'Rider Ditugaskan' },
  { key: 'ARRIVED', label: 'Rider Tiba' },
  { key: 'IN_TRANSIT', label: 'Dalam Perjalanan' },
  { key: 'COMPLETED', label: 'Selesai' },
];

// -------------------------------------------------------
// SOS CONFIRM MODAL — defined OUTSIDE parent at module scope
// Full-screen, 3-second countdown with cancel window
// -------------------------------------------------------
interface SOSConfirmModalProps {
  show: boolean;
  klkPhone: string;
  onConfirm: () => void;
  onCancel: () => void;
}
function SOSConfirmModal({ show, klkPhone, onConfirm, onCancel }: SOSConfirmModalProps) {
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasConfirmedRef = useRef(false);

  useEffect(() => {
    if (show) {
      hasConfirmedRef.current = false;
      setCountdown(3);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            if (!hasConfirmedRef.current) {
              hasConfirmedRef.current = true;
              onConfirm();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(3);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current!); };
  }, [show, onConfirm]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className="text-8xl mb-4 animate-pulse">🚨</div>
            <h1 className="text-4xl font-black text-white mb-2">SOS KECEMASAN</h1>
            <p className="text-red-100 text-lg mb-8">Isyarat akan dihantar dalam...</p>
            <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white flex items-center justify-center mx-auto mb-8">
              <span className="text-6xl font-black text-white">{countdown}</span>
            </div>
            <p className="text-red-100 text-sm mb-6">KLK dan Pentadbir JPP akan dimaklumkan serta-merta</p>
            <button
              onClick={onCancel}
              className="w-full py-5 bg-white text-red-600 font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              BATAL — Tekan Untuk Batalkan
            </button>
            {klkPhone && (
              <a
                href={`tel:${klkPhone}`}
                className="mt-4 flex items-center justify-center gap-2 text-white/80 text-sm py-3"
              >
                <Phone className="w-4 h-4" />
                Hubungi KLK Terus: {klkPhone}
              </a>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -------------------------------------------------------
// RATING MODAL — defined OUTSIDE parent to prevent re-mount on state change
// (inline component definitions cause keyboard to dismiss on every keystroke)
// -------------------------------------------------------
interface RatingModalProps {
  show: boolean;
  stars: number;
  note: string;
  tip: number;
  onStars: (s: number) => void;
  onNote: (n: string) => void;
  onTip: (t: number) => void;
  onSubmit: () => void;
  onSkip: () => void;
  disabled: boolean;
}
function RatingModal({ show, stars, note, tip, onStars, onNote, onTip, onSubmit, onSkip, disabled }: RatingModalProps) {
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[300] flex items-end justify-center p-4">
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 w-full max-w-sm max-h-[85dvh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Perjalanan Selesai!</h2>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Bagaimana pengalaman anda dengan rider ini?</p>
            </div>
            {/* Stars */}
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => onStars(s)}
                  className={`text-3xl transition-transform ${s <= stars ? 'scale-110' : 'opacity-30'}`}>
                  ⭐
                </button>
              ))}
            </div>
            {/* Tip Section */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider text-center mb-2">Tambah Tip? (Opsional)</p>
              <div className="flex justify-center gap-2">
                {[0, 0.5, 1, 2].map(t => (
                  <button key={t} onClick={() => onTip(t)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      tip === t
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-slate-100 dark:border-white/10 text-slate-500 dark:text-white/40'
                    }`}>
                    {t === 0 ? 'Tiada' : `RM${t.toFixed(2)}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={note}
              onChange={e => onNote(e.target.value)}
              placeholder="Ulasan ringkas (opsional)..."
              className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm mb-4 resize-none h-20 focus:ring-2 focus:ring-amber-500"
            />
            <div className="space-y-2">
              <button onClick={onSubmit} disabled={disabled || stars === 0}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors">
                {tip > 0 ? `Hantar Penilaian + Tip RM${tip.toFixed(2)} 🎁` : 'Hantar Penilaian'}
              </button>
              <button onClick={onSkip}
                className="w-full py-3 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white text-sm font-bold transition-colors">
                Langkau
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function PolyRiderHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const polymartState = location.state as { polymartOrderId?: string, pickup_name?: string, dropoff_name?: string } | null;
  const polymartOrderId = polymartState?.polymartOrderId;

  const [activeRiders, setActiveRiders] = useState(0);
  const [isRegisteredRider, setIsRegisteredRider] = useState(false);
  const [studentGender, setStudentGender] = useState<'LELAKI' | 'PEREMPUAN' | null>(null);

  // Booking Form State
  const [pickup, setPickup] = useState(polymartState?.pickup_name || '');
  const [dropoff, setDropoff] = useState(polymartState?.dropoff_name || '');
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropoffPos, setDropoffPos] = useState<[number, number] | null>(null);
  const [activeMapPicker, setActiveMapPicker] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState<number>(3.0);
  const [focusedField, setFocusedField] = useState<'pickup' | 'dropoff' | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Location Presets (admin-set)
  const [presets, setPresets] = useState<any[]>([]);
  // Saved Locations (student's own favourites — max 5)
  const [savedLocations, setSavedLocations] = useState<any[]>([]);

  // Expire countdown for active PENDING job
  const [expiresIn, setExpiresIn] = useState<string | null>(null);

  // Carpool System State
  const [isCarpoolOpen, setIsCarpoolOpen] = useState(false);
  const [openCarpools, setOpenCarpools] = useState<any[]>([]);
  const [joiningCarpool, setJoiningCarpool] = useState<any>(null);
  const [carpoolMembers, setCarpoolMembers] = useState<any[]>([]);
  const [carpoolRequests, setCarpoolRequests] = useState<any[]>([]);

  // Job & Bids State
  const [isSearching, setIsSearching] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const searchStartTime = useRef<number | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showContactMenu, setShowContactMenu] = useState(false);

  // SOS State
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [klkPhone, setKlkPhone] = useState('');
  const [showSOSContactsSheet, setShowSOSContactsSheet] = useState(false);
  const [showManageContacts, setShowManageContacts] = useState(false);
  const [showSOSWarningModal, setShowSOSWarningModal] = useState(false);
  const [sosJobLocation, setSosJobLocation] = useState('');

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'klk_emergency_phone').single()
      .then(({ data }) => {
        if (data?.value) {
          try { setKlkPhone(JSON.parse(data.value)); } catch { setKlkPhone(data.value); }
        }
      });
  }, []);

  // Auto-detect customer's current location for pickup
  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('GPS tidak disokong oleh peranti/pelayar ini.');
      return;
    }
    // Geolocation only works on HTTPS or localhost — not plain HTTP via IP
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) {
      toast('📍 Auto-detect GPS memerlukan HTTPS. Sila cari lokasi secara manual atau gunakan peta.', {
        duration: 5000,
        icon: '⚠️',
      });
      return;
    }
    setIsDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 30000
        })
      );
      const { latitude: lat, longitude: lng } = position.coords;
      setPickupPos([lat, lng]);
      // Reverse geocode via Nominatim (free, no API key)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ms`,
          { headers: { 'User-Agent': 'JPP-POLISAS-PolyRider/1.0' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        // Build a short readable name
        const name =
          addr.amenity ||
          addr.building ||
          addr.road ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.village ||
          addr.town ||
          addr.city ||
          data.display_name?.split(',')[0] ||
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPickup(name);
      } catch {
        // If reverse geocode fails, just use coordinates
        setPickup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      // GPS denied or unavailable
      toast('GPS dinafikan. Sila cari lokasi anda secara manual.', { icon: '📍', duration: 4000 });
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  // Auto-detect on mount (only if pickup not pre-filled from PolyMart state)
  useEffect(() => {
    if (!polymartState?.pickup_name) {
      detectCurrentLocation();
    }
  }, []);

  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState('');
  const [ratingTip, setRatingTip] = useState(0);
  const [completedJob, setCompletedJob] = useState<any>(null);

  // Digital Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptJob, setReceiptJob] = useState<any>(null);

  // Trip History
  const [tripHistory, setTripHistory] = useState<any[]>([]);

  // Add-ons State
  const [selectedAddons, setSelectedAddons] = useState<AddonKey[]>([]);
  const toggleAddon = (key: AddonKey) =>
    setSelectedAddons(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // Multi-Stop State — dynamic array of stops [{name, lat, lng}]
  const [stops, setStops] = useState<{ name: string; lat: number | null; lng: number | null }[]>([]);
  const addStop = () => setStops(prev => [...prev, { name: '', lat: null, lng: null }]);
  const removeStop = (i: number) => setStops(prev => prev.filter((_, idx) => idx !== i));
  const updateStop = (i: number, name: string, lat: number | null, lng: number | null) =>
    setStops(prev => prev.map((s, idx) => idx === i ? { name, lat, lng } : s));
  // Partial update helpers to avoid stale closure issues in MapPicker
  const updateStopName = (i: number, name: string) =>
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, name } : s));
  const updateStopPos = (i: number, lat: number, lng: number) =>
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, lat, lng } : s));


  // Auto-set proposed price when pickup or dropoff changes
  useEffect(() => {
    if (pickupPos && dropoffPos) {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(dropoffPos[0] - pickupPos[0]);
      const dLng = toRad(dropoffPos[1] - pickupPos[1]);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(pickupPos[0]))*Math.cos(toRad(dropoffPos[0]))*Math.sin(dLng/2)**2;
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const est = Math.max(5, distKm * 1.5);
      setProposedPrice(parseFloat(est.toFixed(2)));
    }
  }, [pickupPos, dropoffPos]);

  // Fetch presets, active riders, carpools on mount
  useEffect(() => {
    const init = async () => {
      const [ridersRes, presetsRes, savedRes] = await Promise.all([
        supabase.rpc('get_active_polyrider_count'),
        supabase.from('polyrider_location_presets').select('*').eq('is_active', true).order('sort_order'),
        user
          ? supabase.from('polyrider_saved_locations').select('id, label, lat, lng').eq('user_id', user.id).order('created_at')
          : Promise.resolve({ data: [] }),
      ]);
      if (!ridersRes.error && ridersRes.data !== null) setActiveRiders(ridersRes.data);
      if (presetsRes.data) setPresets(presetsRes.data);
      if (savedRes.data) setSavedLocations(savedRes.data);

      if (user) {
        const [riderRes, profileRes, sosContactsRes] = await Promise.all([
          supabase.from('polyrider_profiles').select('status').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('gender').eq('id', user.id).single(),
          supabase.from('polyrider_sos_contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        if (riderRes.data && riderRes.data.status !== 'REJECTED') setIsRegisteredRider(true);
        if (profileRes.data?.gender) setStudentGender(profileRes.data.gender as 'LELAKI' | 'PEREMPUAN');

        // Auto-show SOS manager if no contacts found
        if (sosContactsRes.count === 0) {
          setShowSOSWarningModal(true);
        }
      }
    };
    init();
    const interval = setInterval(() => {
      supabase.rpc('get_active_polyrider_count').then(({ data }) => { if (data !== null) setActiveRiders(data); });
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch open carpools + Realtime subscription for instant updates
  useEffect(() => {
    if (isSearching || activeJob || !user) return;
    const fetchOpenCarpools = async () => {
      const { data } = await supabase.from('polyrider_jobs')
        .select('id, pickup_name, dropoff_name, proposed_price, is_carpool_open, student_id, carpool_group_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_gender, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
        .eq('status', 'GATHERING').eq('is_carpool_open', true).neq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setOpenCarpools(data);
    };
    fetchOpenCarpools();

    // Realtime: listen to ALL polyrider_jobs changes (no row filter)
    // so we catch cancellations, locks, and new carpools immediately.
    // fetchOpenCarpools() applies the correct status=GATHERING filter itself.
    const channel = supabase
      .channel('open-carpools-watch')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polyrider_jobs',
      }, () => { fetchOpenCarpools(); })
      .subscribe();

    // Also poll every 30s as a safety net
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchOpenCarpools(); };
    document.addEventListener('visibilitychange', handleVisibility);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') fetchOpenCarpools(); }, 30000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(iv);
    };
  }, [isSearching, activeJob, user]);

  // Auto-expire countdown for PENDING job
  useEffect(() => {
    if (!activeJob?.expires_at || activeJob.status !== 'PENDING') {
      setExpiresIn(null);
      return;
    }
    const tick = () => {
      const diff = new Date(activeJob.expires_at).getTime() - Date.now();
      if (diff <= 0) { setExpiresIn('Tamat'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setExpiresIn(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeJob?.expires_at, activeJob?.status]);

  // Helper: save current dropoff as favourite
  const saveCurrentDropoff = async () => {
    if (!user || !dropoff || !dropoffPos) return;
    if (savedLocations.length >= 5) { toast.error('Had 5 lokasi kegemaran sudah dicapai.'); return; }
    const { data, error } = await supabase
      .from('polyrider_saved_locations')
      .insert({ user_id: user.id, label: dropoff, lat: dropoffPos[0], lng: dropoffPos[1] })
      .select('id, label, lat, lng').single();
    if (error) { toast.error(error.message); return; }
    setSavedLocations(prev => [...prev, data]);
    toast.success(`"${dropoff}" disimpan!`);
  };

  // Helper: delete saved location
  const deleteSavedLocation = async (id: string) => {
    await supabase.from('polyrider_saved_locations').delete().eq('id', id);
    setSavedLocations(prev => prev.filter(s => s.id !== id));
  };

  // Fetch trip history when idle
  useEffect(() => {
    if (!user || activeJob) return;
    supabase.from('polyrider_jobs').select('id,pickup_name,dropoff_name,proposed_price,status,created_at')
      .eq('student_id', user.id).in('status', ['COMPLETED', 'CANCELLED'])
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setTripHistory(data); });
  }, [user, activeJob]);

  // Consolidated poll — single interval for job, bids & chat
  useEffect(() => {
    if (!activeJob) return;
    const poll = async () => {
      const { data: jobData } = await supabase
        .from('polyrider_jobs')
        .select('*, rider:polyrider_profiles(user_id, plate_number, vehicle_type, avg_rating, total_trips, profiles(full_name))')
        .eq('id', activeJob.id).single();
      if (!jobData) return;
      setActiveJob(jobData);

      if (jobData.status === 'ACCEPTED' && isSearching) {
        setIsSearching(false); setShowNudge(false); searchStartTime.current = null;
        toast.success('Rider Ditemui! 🏍️');
      } else if (jobData.status === 'COMPLETED') {
        setCompletedJob(jobData); setShowRatingModal(true); setActiveJob(null);
      } else if (jobData.status === 'CANCELLED') {
        toast.error('Perjalanan atau permintaan anda dibatalkan.'); setIsSearching(false); setActiveJob(null);
      } else if (jobData.status === 'PENDING' && !isSearching) {
        // Jika status bertukar dari GATHERING ke PENDING, mula papar "Mencari Rider"
        setIsSearching(true); searchStartTime.current = Date.now();
      }

      const tasks: Promise<any>[] = [];

      if (jobData.status === 'PENDING') {
        tasks.push(
          Promise.resolve(
            supabase.from('polyrider_bids')
              .select('*, rider:polyrider_profiles(user_id, plate_number, vehicle_type, avg_rating, total_trips, profiles(full_name))')
              .eq('job_id', activeJob.id).eq('status', 'PENDING').order('created_at', { ascending: false })
              .then(({ data }) => { if (data) setBids(data); })
          )
        );
      } else if (jobData.status === 'GATHERING') {
        tasks.push(
          Promise.resolve(
            supabase.from('polyrider_jobs')
              .select('id, passenger_gender, status, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
              .eq('carpool_group_id', jobData.carpool_group_id)
              .in('status', ['GATHERING', 'CARPOOL_REQUEST'])
              .then(({ data }) => {
                if (data) {
                  setCarpoolMembers(data.filter((j: any) => j.status === 'GATHERING'));
                  setCarpoolRequests(data.filter((j: any) => j.status === 'CARPOOL_REQUEST'));
                }
              })
          )
        );
      } else if (jobData.status !== 'CARPOOL_REQUEST') {
        tasks.push(
          Promise.resolve(
            supabase.from('polyrider_chats').select('*').eq('job_id', activeJob.id).order('created_at', { ascending: true })
              .then(({ data }) => { if (data) setChatMessages(data); })
          )
        );
      }

      await Promise.all(tasks);


      // Nudge if waiting > 2 minutes with no bids
      if (jobData.status === 'PENDING' && searchStartTime.current) {
        const elapsed = Date.now() - searchStartTime.current;
        if (elapsed > 120000 && bids.length === 0) setShowNudge(true);
      }
    };
    poll();
    
    // Switch to Realtime channels to eliminate aggressive polling
    const channel = supabase.channel(`student_job_${activeJob.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_jobs', filter: `id=eq.${activeJob.id}` }, poll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_bids', filter: `job_id=eq.${activeJob.id}` }, poll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_chats', filter: `job_id=eq.${activeJob.id}` }, poll);
      
    if (activeJob.carpool_group_id) {
       channel.on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_jobs', filter: `carpool_group_id=eq.${activeJob.carpool_group_id}` }, poll);
    }
    
    channel.subscribe();
    
    // Slower fallback interval in case of missed WebSocket messages
    const iv = setInterval(poll, 30000); 
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [activeJob?.id, isSearching]);

  // Check existing unfinished job on mount
  useEffect(() => {
    if (!user) return;
    // Include GATHERING and CARPOOL_REQUEST so carpool state is restored on page reload
    supabase.from('polyrider_jobs').select('*').eq('student_id', user.id)
      .in('status', ['PENDING', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'GATHERING', 'CARPOOL_REQUEST'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActiveJob(data);
          if (data.status === 'PENDING') { setIsSearching(true); searchStartTime.current = Date.now(); }
          // GATHERING/CARPOOL_REQUEST are handled by the Carpool Room overlay — no isSearching needed
        }
      });
  }, [user]);


  const handleBook = async () => {
    // Block if already in any active state (including carpool gathering)
    if (!dropoff || proposedPrice < 1 || isSearching || activeJob || !user) return;

    // When joining a carpool, pickup is required — show a clear error if missing
    if (!pickup) {
      toast.error('Sila isi lokasi pickup anda dahulu.');
      return;
    }

    // Check SOS Contacts First (WAJIB)
    const { count, error: sosError } = await supabase
      .from('polyrider_sos_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (sosError) {
      toast.error('Gagal menyemak maklumat kecemasan. Cuba lagi.');
      return;
    }

    if (count === 0) {
      toast.error('WAJIB: Sila tambah sekurang-kurangnya 1 nombor kecemasan SOS sebelum menempah perjalanan!');
      setShowManageContacts(true);
      return;
    }

    const isCarpool = !joiningCarpool && isCarpoolOpen;
    const isJoiningCarpool = !!joiningCarpool;

    // Only show "Mencari Rider" spinner for direct (non-carpool) jobs
    if (!isCarpool && !isJoiningCarpool) {
      setIsSearching(true);
      searchStartTime.current = Date.now();
    }

    // Calculate dynamic surcharge based on actual detour distance
    const { surcharge: stopsSurcharge } = calcStopsSurcharge(pickupPos, dropoffPos, stops);
    const totalPrice = +(proposedPrice + stopsSurcharge).toFixed(2);

    const { data, error } = await supabase.rpc('create_polyrider_job', {
      p_student_id: user.id, p_pickup_name: pickup, p_dropoff_name: dropoff,
      p_pickup_lat: pickupPos?.[0] ?? null, p_pickup_lng: pickupPos?.[1] ?? null,
      p_dropoff_lat: dropoffPos?.[0] ?? null, p_dropoff_lng: dropoffPos?.[1] ?? null,
      p_proposed_price: totalPrice,
      p_is_carpool_open: isJoiningCarpool ? true : isCarpoolOpen,
      p_join_group_id: joiningCarpool?.carpool_group_id ?? null,
      p_job_type: polymartOrderId ? 'POLYMART_CUST' : 'RIDE',
      p_polymart_order_id: polymartOrderId || null,
      p_addons: selectedAddons.length > 0 ? selectedAddons : [],
      p_stops: stops.filter(s => s.name).length > 0
        ? stops.filter(s => s.name).map(s => ({ name: s.name, lat: s.lat, lng: s.lng }))
        : [],
    });
    // Reset addons & stops after successful booking
    setSelectedAddons([]);
    setStops([]);
    const job = Array.isArray(data) ? data[0] : data;
    if (error || !job) {
      console.error('[handleBook] RPC error:', error?.message, error?.details, error?.hint);
      toast.error(error?.message || 'Gagal menempah. Cuba lagi.');
      setIsSearching(false);
      return;
    }
    setActiveJob(job); setJoiningCarpool(null); savedFormState.current = null;
    
    // Clear the location state if we came from PolyMart
    if (polymartOrderId) {
      navigate(location.pathname, { replace: true, state: null });
    }

    // Only notify riders for direct (PENDING) jobs — not for GATHERING/CARPOOL_REQUEST
    if (!isCarpool && !isJoiningCarpool) {
      const { data: { session } } = await supabase.auth.getSession();
      notifyAllActiveRiders(
        session?.access_token ?? '',
        supabase,
        '🏍️ PolyRider Baru!',
        `${pickup} → ${dropoff} · RM${proposedPrice.toFixed(2)}`,
        { tag: 'polyrider-new-job', url: '/polyrider/rider' }
      );
    }

    // Notify the OWNER when someone requests to join their carpool
    if (isJoiningCarpool && joiningCarpool?.student_id) {
      // Fetch the current user's name for the notification message
      const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const { data: { session } } = await supabase.auth.getSession();
      notifyUsers(
        session?.access_token ?? '',
        [joiningCarpool.student_id],
        '🚗 Permintaan Carpool Baru!',
        `${myProfile?.full_name || 'Seorang pelajar'} ingin menyertai carpool anda.`,
        { tag: 'polyrider-carpool-request', url: '/polyrider' }
      );
    }
  };

  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Save & restore main form state when carpool join modal opens/closes
  const savedFormState = useRef<{pickup: string; dropoff: string; pickupPos: [number,number]|null; dropoffPos: [number,number]|null} | null>(null);

  const openJoinCarpoolModal = async (carpool: any) => {
    // Save current form values so we can restore on cancel
    savedFormState.current = { pickup, dropoff, pickupPos, dropoffPos };
    setJoiningCarpool(carpool);
    // Pre-fill destination with owner's dropoff (name only — same destination)
    setDropoff(carpool.dropoff_name);
    setDropoffPos(null); // coordinates not required for joined carpool

    // Detect GPS pickup first
    let resolvedPickupPos = pickupPos;
    if (!pickup && !pickupPos) {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (isSecure && navigator.geolocation) {
        setIsDetectingLocation(true);
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
          );
          const { latitude: lat, longitude: lng } = position.coords;
          resolvedPickupPos = [lat, lng];
          setPickupPos([lat, lng]);
          // Reverse geocode
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ms`,
              { headers: { 'User-Agent': 'JPP-POLISAS-PolyRider/1.0' } });
            const geoData = await res.json();
            const addr = geoData.address || {};
            const name = addr.amenity || addr.building || addr.road || addr.neighbourhood || addr.suburb || geoData.display_name?.split(',')[0] || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup(name);
          } catch { setPickup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
        } catch { /* GPS denied — user will set manually */ }
        finally { setIsDetectingLocation(false); }
      }
    }

    // Auto-set sumbangan price based on distance from user's pickup to carpool's pickup point
    if (resolvedPickupPos && carpool.pickup_lat && carpool.pickup_lng) {
      const dist = haversineKm(resolvedPickupPos, [carpool.pickup_lat, carpool.pickup_lng]);
      const est = Math.max(2, dist * 1.5);
      setProposedPrice(parseFloat(est.toFixed(2)));
    } else {
      // Fallback: estimate from carpool's proposed_price / passengers
      setProposedPrice(parseFloat((Number(carpool.proposed_price) / 2).toFixed(2)));
    }
  };

  const closeJoinCarpoolModal = () => {
    // Restore previous form state
    if (savedFormState.current) {
      setPickup(savedFormState.current.pickup);
      setDropoff(savedFormState.current.dropoff);
      setPickupPos(savedFormState.current.pickupPos);
      setDropoffPos(savedFormState.current.dropoffPos);
      savedFormState.current = null;
    }
    setJoiningCarpool(null);
  };
  const handleAcceptRequest = async (requestId: string) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);

    // Find the passenger request before we accept so we have their student_id
    const req = carpoolRequests.find(r => r.id === requestId);

    const { error } = await supabase.rpc('respond_carpool_request', { p_request_id: requestId, p_accept: true });

    if (error) {
      toast.error(error.message);
      setProcessingRequestId(null);
    } else {
      toast.success('Berjaya menerima penumpang');
      setCarpoolRequests(prev => prev.filter(r => r.id !== requestId));
      setProcessingRequestId(null);

      // Notify the passenger
      if (req?.student_id) {
        const { data: { session } } = await supabase.auth.getSession();
        notifyUsers(
          session?.access_token ?? '',
          [req.student_id],
          '✅ Permintaan Carpool Diterima!',
          `Permintaan anda untuk menyertai carpool telah diterima. Sila semak status anda.`,
          { tag: 'polyrider-carpool-accepted', url: '/polyrider' }
        );
      }
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);

    // Find the passenger request before we reject so we have their student_id
    const req = carpoolRequests.find(r => r.id === requestId);

    const { error } = await supabase.rpc('respond_carpool_request', { p_request_id: requestId, p_accept: false });

    if (error) {
      toast.error(error.message);
      setProcessingRequestId(null);
    } else {
      toast.success('Permintaan ditolak');
      setCarpoolRequests(prev => prev.filter(r => r.id !== requestId));
      setProcessingRequestId(null);

      // Notify the passenger
      if (req?.student_id) {
        const { data: { session } } = await supabase.auth.getSession();
        notifyUsers(
          session?.access_token ?? '',
          [req.student_id],
          '❌ Permintaan Carpool Ditolak',
          `Permintaan anda untuk menyertai carpool telah ditolak oleh ketua kumpulan.`,
          { tag: 'polyrider-carpool-rejected', url: '/polyrider' }
        );
      }
    }
  };

  const handleLockCarpool = async () => {
    if (!activeJob) return;
    const { error } = await supabase.rpc('lock_polyrider_carpool', { p_group_id: activeJob.carpool_group_id });
    if (error) toast.error(error.message);
    else {
      toast.success('Kumpulan dikunci. Mula mencari rider...');
      setIsSearching(true);
      searchStartTime.current = Date.now();
      setActiveJob({ ...activeJob, status: 'PENDING' });
    }
  };

  const handleCancelJob = async (reason: string) => {
    if (!activeJob) return;

    setIsCancelling(true);
    // Check if this is a passenger pulling out of a group carpool
    const isPassengerLeaving = activeJob.carpool_group_id && activeJob.id !== activeJob.carpool_group_id;
    let groupOwnerId: string | null = null;

    if (isPassengerLeaving) {
      const { data: ownerJob } = await supabase
        .from('polyrider_jobs')
        .select('student_id')
        .eq('id', activeJob.carpool_group_id)
        .single();
      if (ownerJob) groupOwnerId = ownerJob.student_id;
    }

    // Call the new RPC to handle cancellation, anti-spam logic, and logging
    const { error } = await supabase.rpc('cancel_polyrider_job', {
      p_job_id: activeJob.id,
      p_reason: reason
    });

    setIsCancelling(false);
    setIsCancelModalOpen(false);

    if (error) {
      console.error('[handleCancelJob]', error);
      toast.error('Gagal membatalkan. Cuba lagi.');
      return;
    }
    
    // Check if student was automatically suspended due to anti-spam
    if (user?.id) {
      const { data: myProfile } = await supabase.from('profiles').select('full_name, matric_no, polyrider_suspended_until').eq('id', user.id).single();
      if (myProfile?.polyrider_suspended_until && new Date(myProfile.polyrider_suspended_until) > new Date()) {
        await notifyKLKOnSuspension(supabase, myProfile.full_name, myProfile.matric_no, `Amaran Sistem: Kekerapan membatalkan pesanan (3 kali / jam). Sebab akhir: ${reason}`);
      }
    }

    // Notify the owner if a passenger left
    if (isPassengerLeaving && groupOwnerId) {
      const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single();
      const { data: { session } } = await supabase.auth.getSession();
      notifyUsers(
        session?.access_token ?? '',
        [groupOwnerId],
        'ℹ️ Penumpang Menarik Diri',
        `${myProfile?.full_name || 'Seorang penumpang'} telah menarik diri dari kumpulan carpool anda.`,
        { tag: 'polyrider-carpool-leave', url: '/polyrider' }
      );
    }

    setIsSearching(false); setActiveJob(null); setBids([]); setShowNudge(false);
    searchStartTime.current = null;
    toast('Dibatalkan.');

    // Only notify bidding riders if this was a PENDING job
    if (activeJob.status === 'PENDING') {
      const { data: { session } } = await supabase.auth.getSession();
      notifyBiddingRiders(
        session?.access_token ?? '',
        supabase,
        activeJob.id,
        '❌ Job Dibatalkan',
        'Pelajar telah membatalkan carian. Job ini tidak lagi tersedia.',
        { tag: 'polyrider-job-cancelled', url: '/polyrider/rider' }
      );
    }
  };

  // Counter-Offer State
  const [counteringBidId, setCounteringBidId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState<number>(0);

  const submitCounterOffer = async (bidId: string, riderId: string) => {
    if (counterAmount < 1) { toast.error('Masukkan amaun tawaran balas yang sah.'); return; }
    const { error } = await supabase
      .from('polyrider_bids')
      .update({ counter_amount: counterAmount, counter_status: 'PENDING_RIDER' })
      .eq('id', bidId)
      .eq('job_id', activeJob?.id);
    if (error) { toast.error('Gagal hantar tawaran balas.'); return; }
    setCounteringBidId(null);
    // Notify rider
    const { data: { session } } = await supabase.auth.getSession();
    notifyUsers(session?.access_token ?? '', [riderId],
      '💬 Tawaran Balas Diterima!',
      `Pelajar menawar balik RM${counterAmount.toFixed(2)}. Semak sekarang!`,
      { tag: 'polyrider-counter-offer', url: '/polyrider/rider' }
    );
    toast.success('Tawaran balas dihantar!');
  };

  const acceptBid = async (bid: any) => {
    if (!activeJob || !user) return;
    const { data, error } = await supabase.rpc('accept_polyrider_bid', { p_bid_id: bid.id, p_student_id: user.id });
    const job = Array.isArray(data) ? data[0] : data;
    if (error || !job) { toast.error(error?.message || 'Gagal terima bidaan. Cuba lagi.'); return; }
    setActiveJob(job); setIsSearching(false); setBids([]); setShowNudge(false);
    toast.success('Rider dipilih! Menunggu ketibaan rider. 🏍️');
    // Notify the specific WINNING rider
    const { data: { session } } = await supabase.auth.getSession();
    notifyUsers(
      session?.access_token ?? '',
      [bid.rider_id],
      '🎉 Bidaan Diterima!',
      `Pelajar bersetuju dengan RM${bid.bid_amount.toFixed(2)}. Pergi ke lokasi pickup sekarang!`,
      { tag: 'polyrider-bid-accepted', url: '/polyrider/rider' }
    );
  };


  const submitRating = async () => {
    if (!completedJob || ratingStars === 0) return;
    await supabase.from('polyrider_jobs')
      .update({ student_rating: ratingStars, student_rating_note: ratingNote, tip_amount: ratingTip })
      .eq('id', completedJob.id);
    // Notify rider if tip was given
    if (ratingTip > 0 && completedJob.rider_id) {
      const { data: { session } } = await supabase.auth.getSession();
      notifyUsers(session?.access_token ?? '', [completedJob.rider_id],
        `🎁 Tip RM${ratingTip.toFixed(2)} Diterima!`,
        'Pelajar menghargai perkhidmatan anda. Terima kasih!',
        { tag: 'polyrider-tip', url: '/polyrider/rider' }
      );
    }
    const job = { ...completedJob, tip_amount: ratingTip };
    setShowRatingModal(false); setRatingStars(0); setRatingNote(''); setRatingTip(0);
    setReceiptJob(job); setShowReceiptModal(true); setCompletedJob(null);
    toast.success('Terima kasih atas penilaian anda! ⭐');
  };

  const applyNudge = async (bump: number) => {
    const newPrice = +(proposedPrice + bump).toFixed(2);
    setProposedPrice(newPrice);
    if (activeJob) {
      await supabase.from('polyrider_jobs').update({ proposed_price: newPrice }).eq('id', activeJob.id);
      // Notify riders who have bid on this job
      const { data: { session } } = await supabase.auth.getSession();
      notifyBiddingRiders(
        session?.access_token ?? '',
        supabase,
        activeJob.id,
        '💰 Harga Dinaikkan!',
        `Pelajar menaikkan tawaran kepada RM${newPrice.toFixed(2)}. Semak sekarang!`,
        { tag: 'polyrider-nudge', url: '/polyrider/rider' }
      );
    }
    setShowNudge(false);
    toast.success(`Tawaran dinaikkan ke RM${newPrice.toFixed(2)}!`);
  };

  const triggerSOS = async () => {
    if (!activeJob) return;

    // 1. Get GPS coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (err: any) {
      console.warn("GPS detection failed:", err.message || err);
      // Fallback to job coordinates if GPS denied
      lat = activeJob.pickup_lat ?? null;
      lng = activeJob.pickup_lng ?? null;
    }

    // 2. Insert into polyrider_sos_logs with GPS
    const { data: sosLog } = await supabase.from('polyrider_sos_logs').insert({
      job_id: activeJob.id,
      triggered_by: user!.id,
      lat,
      lng,
    }).select('id').single();

    // 3. Update job status to EMERGENCY
    await supabase.from('polyrider_jobs').update({ status: 'EMERGENCY' }).eq('id', activeJob.id);

    // 4. Blast push + email to KLK & SUPER_ADMIN_JPP via server
    const { data: profile } = await supabase.from('profiles').select('full_name, matric_number').eq('id', user!.id).single();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/polyrider-sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          sosId: sosLog?.id,
          jobId: activeJob.id,
          lat, lng,
          userName: profile?.full_name,
          userMatric: profile?.matric_number,
          riderName: activeJob.rider?.profiles?.full_name,
          plateNumber: activeJob.rider?.plate_number,
        }),
      });
    } catch (e) {
      console.error('[SOS] Backend alert failed:', e);
    }

    // 5. Store location string and trigger contacts sheet
    const locationStr = activeJob.pickup_name
      ? `${activeJob.pickup_name} → ${activeJob.dropoff_name}`
      : (lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '');
    setSosJobLocation(locationStr);
    setSosActive(true);
    setShowSOSModal(false);
    // Auto-show contacts sheet after a short delay
    setTimeout(() => setShowSOSContactsSheet(true), 800);
    toast.error('🚨 Isyarat SOS dihantar! KLK dan Pentadbir dimaklumkan.', { duration: 8000 });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeJob) return;
    await supabase.from('polyrider_chats').insert({ job_id: activeJob.id, sender_id: user!.id, message: newMessage.trim() });
    setNewMessage('');
  };

  const renderContactJPP = () => {
    if (!klkPhone) return null;
    let cleanPhone = klkPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;
    else if (!cleanPhone.startsWith('6')) cleanPhone = '60' + cleanPhone;

    return (
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end">
        <AnimatePresence>
          {showContactMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-2 mb-3 flex flex-col gap-1 w-48 origin-bottom-right"
            >
              <a
                href={`https://wa.me/601139413699`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowContactMenu(false)}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Bug className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">Lapor Ralat</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-white/50">Tech Support</p>
                </div>
              </a>
              <div className="h-px bg-slate-100 dark:bg-white/5 w-full my-0.5" />
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowContactMenu(false)}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">Admin PolyRider</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-white/50">Exco KLK</p>
                </div>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowContactMenu(!showContactMenu)}
          className="bg-emerald-500 text-white p-3.5 rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Hubungi JPP / Lapor Bug"
        >
          {showContactMenu ? <X className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
        </button>
      </div>
    );
  };

  // RENDER: ACTIVE PERJALANAN — only for in-ride statuses (NOT carpool waiting phases)
  if (activeJob && ['ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'EMERGENCY'].includes(activeJob.status)) {
    const stepIdx = STATUS_STEPS.findIndex(s => s.key === activeJob.status);
    return (
      <div className="max-w-xl mx-auto pb-40 pt-4 px-4 min-h-[100dvh] flex flex-col">
        {/* SOS Contacts Sheet — auto-fires after SOS & manual open */}
        {showSOSContactsSheet && (
          <SOSContactsManager
            postSOSMode
            jobLocation={sosJobLocation}
            onClose={() => setShowSOSContactsSheet(false)}
          />
        )}
        {showManageContacts && (
          <SOSContactsManager
            onClose={() => setShowManageContacts(false)}
          />
        )}
        <RatingModal
          show={showRatingModal}
          stars={ratingStars}
          note={ratingNote}
          tip={ratingTip}
          onStars={setRatingStars}
          onNote={setRatingNote}
          onTip={setRatingTip}
          onSubmit={submitRating}
          onSkip={() => { 
            const job = completedJob;
            setShowRatingModal(false); setRatingTip(0);
            setCompletedJob(null); 
            if (job) {
              setReceiptJob(job);
              setShowReceiptModal(true);
            }
          }}
          disabled={ratingStars === 0}
        />
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          Perjalanan Aktif <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
        </h1>

        {/* Status Timeline */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-white/5 mb-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STATUS_STEPS.slice(0, 4).map((step, i) => (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i < stepIdx ? 'bg-emerald-500 text-white' : i === stepIdx ? 'bg-amber-500 text-white ring-4 ring-amber-500/30' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-white/40'
                    }`}>{i < stepIdx ? '✓' : i + 1}</div>
                  <span className={`text-[9px] font-bold text-center leading-tight ${i === stepIdx ? 'text-amber-500' : i < stepIdx ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'
                    }`}>{step.label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 w-8 rounded-full ${i < stepIdx ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-zinc-800'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 shadow-xl border border-slate-100 dark:border-white/5 flex-1 flex flex-col">
          {/* Rider Info */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                {activeJob.rider?.vehicle_type || 'RIDER'}
              </span>
              <p className="font-black text-slate-900 dark:text-white">{activeJob.rider?.profiles?.full_name || 'Rider'}</p>
              <p className="text-sm font-bold text-slate-400 dark:text-white/40">{activeJob.rider?.plate_number}</p>
              {activeJob.rider?.avg_rating && (
                <p className="text-xs text-amber-500 font-bold mt-1">⭐ {Number(activeJob.rider.avg_rating).toFixed(1)} · {activeJob.rider.total_trips} trip</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Harga</p>
              <p className="text-2xl font-black text-amber-500">RM {Number(activeJob.proposed_price).toFixed(2)}</p>
            </div>
          </div>

          {/* Rider Live Location — shown when rider shares GPS */}
          {activeJob.rider_lat && activeJob.rider_lng && activeJob.rider_location_updated_at && (() => {
            const updatedAt = new Date(activeJob.rider_location_updated_at);
            const agoMs = Date.now() - updatedAt.getTime();
            const agoMin = Math.floor(agoMs / 60000);
            const agoLabel = agoMin < 1 ? 'Baru sahaja' : `${agoMin} minit lepas`;
            // Haversine distance from rider to pickup
            const toRad = (d: number) => d * Math.PI / 180;
            let distLabel = '';
            if (activeJob.pickup_lat && activeJob.pickup_lng) {
              const R = 6371;
              const dLat = toRad(activeJob.pickup_lat - activeJob.rider_lat);
              const dLng = toRad(activeJob.pickup_lng - activeJob.rider_lng);
              const a = Math.sin(dLat/2)**2 + Math.cos(toRad(activeJob.rider_lat))*Math.cos(toRad(activeJob.pickup_lat))*Math.sin(dLng/2)**2;
              const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distLabel = `~${km.toFixed(1)} km dari pickup anda`;
            }
            const wazeUrl = `https://waze.com/ul?ll=${activeJob.rider_lat},${activeJob.rider_lng}&navigate=yes`;
            return (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3.5 mb-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> Lokasi Rider Semasa
                  </p>
                  <span className="text-[9px] font-bold text-blue-400 dark:text-blue-300/60">{agoLabel}</span>
                </div>
                {distLabel && (
                  <p className="text-sm font-black text-slate-900 dark:text-white mb-2">{distLabel}</p>
                )}
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black rounded-lg transition-colors"
                >
                  🔵 Lihat di Waze
                </a>
              </motion.div>
            );
          })()}

          {/* Chat */}
          <div className="flex-1 flex flex-col mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Chat Rider</p>
            <div className="flex-1 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl p-3 border border-slate-100 dark:border-white/5 overflow-y-auto space-y-2 mb-2 max-h-[28vh]">
              {chatMessages.length === 0 ? <p className="text-xs text-center text-slate-400 dark:text-white/40 mt-6">Berhubung dengan rider di sini.</p> : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user!.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs font-semibold ${msg.sender_id === user!.id ? 'bg-amber-500 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 rounded-tl-sm'
                      }`}>{msg.message}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Mesej..."
                className="flex-1 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white h-12" />
              <button type="submit" className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center justify-center shrink-0"><Send className="w-5 h-5" /></button>
            </form>
          </div>

          <div className="mt-6 border-t pt-6">
            <SwipeToSOS onTrigger={triggerSOS} />
          </div>

          <div className="mt-4">
             <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsCancelModalOpen(true)}>
                Batal Pesanan
             </Button>
          </div>

          <CancelJobModal 
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancelJob}
            role="STUDENT"
            isLoading={isCancelling}
          />
        </div>
        {renderContactJPP()}
      </div>
    );
  }

  // -------------------------------------------------------
  // RENDER: BOOKING / BIDDING VIEW
  // -------------------------------------------------------
  return (
    <div className="max-w-xl mx-auto pb-40 pt-4 px-4 min-h-[100dvh] flex flex-col">
      {showManageContacts && (
        <SOSContactsManager
          onClose={() => setShowManageContacts(false)}
        />
      )}

      {/* SOS Warning Modal */}
      {createPortal(
        <AnimatePresence>
          {showSOSWarningModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-white/10 relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Tindakan Diperlukan</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-white/60 mb-8 leading-relaxed">
                  Sistem mewajibkan pendaftaran <strong className="text-slate-900 dark:text-white">sekurang-kurangnya 1 kenalan kecemasan</strong> sebelum menggunakan PolyRider demi keselamatan anda.
                </p>

                <button
                  onClick={() => {
                    setShowSOSWarningModal(false);
                    setShowManageContacts(true);
                  }}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Daftar Kenalan SOS <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <RatingModal
        show={showRatingModal}
        stars={ratingStars}
        note={ratingNote}
        tip={ratingTip}
        onStars={setRatingStars}
        onNote={setRatingNote}
        onTip={setRatingTip}
        onSubmit={submitRating}
        onSkip={() => { 
          const job = completedJob;
          setShowRatingModal(false); setRatingTip(0);
          setCompletedJob(null); 
          if (job) {
            setReceiptJob(job);
            setShowReceiptModal(true);
          }
        }}
        disabled={ratingStars === 0}
      />

      {/* Nudge Toast */}
      <AnimatePresence>
        {showNudge && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl shadow-xl px-5 py-4 w-[90vw] max-w-sm">
            <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Tiada rider berbidaan lagi 🤔</p>
            <p className="text-xs text-slate-500 dark:text-white/50 mb-3">Cuba naikkan harga tawaran anda sedikit.</p>
            <div className="flex gap-2">
              <button onClick={() => applyNudge(0.5)} className="flex-1 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold rounded-xl text-sm">+RM 0.50</button>
              <button onClick={() => applyNudge(1.0)} className="flex-1 py-2 bg-amber-500 text-white font-bold rounded-xl text-sm">+RM 1.00</button>
              <button onClick={() => setShowNudge(false)} className="px-3 py-2 bg-slate-100 dark:bg-white dark:bg-zinc-900/5 text-slate-400 dark:text-white/40 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            PolyRider <Bike className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mt-1">
            Jimat, Cepat & Selamat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageContacts(true)}
            className="bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Urus SOS</span>
          </button>

          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/80">
              {activeRiders} Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Main Booking Section */}
      <div className="flex flex-col flex-1 relative z-10 space-y-4">

        {/* UNIFIED BOOKING CARD */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 relative flex flex-col gap-4">

          {/* 1. Location Form */}
          <div>
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute left-[11px] top-[30px] bottom-[30px] w-0.5 bg-slate-200 dark:bg-white/10 rounded-full" />

              {/* Pickup — with search autocomplete + GPS */}
              <div className="flex items-center gap-4 relative mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center z-10 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <LocationSearchInput
                  label="Dari"
                  color="blue"
                  placeholder={isDetectingLocation ? 'Mengesan lokasi...' : 'Cari lokasi pickup...'}
                  value={pickup}
                  onChange={(text) => { setPickup(text); if (!text) setPickupPos(null); }}
                  onSelect={(r) => { setPickup(r.name); setPickupPos([r.lat, r.lng]); }}
                />
                {/* GPS detect button */}
                <button
                  onClick={detectCurrentLocation}
                  disabled={isDetectingLocation}
                  title="Guna lokasi semasa"
                  className={`p-1.5 rounded-xl shrink-0 transition-all ${
                    isDetectingLocation ? 'text-blue-400 animate-pulse'
                    : pickupPos ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-blue-500'
                  }`}
                >
                  {isDetectingLocation
                    ? <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
                    : <Navigation className="w-4 h-4" />}
                </button>
                <button onClick={() => setActiveMapPicker('pickup')} className={`p-1.5 rounded-xl shrink-0 transition-all ${pickupPos ? 'bg-blue-500/20 text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}>
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-Stop / Hentian Tambahan */}
              {stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center z-10 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <LocationSearchInput
                      label={`Hentian ${i + 1}`}
                      color="blue"
                      placeholder="Cari lokasi hentian..."
                      value={stop.name}
                      onChange={(text) => updateStop(i, text, null, null)}
                      onSelect={(result) => updateStop(i, result.name, result.lat, result.lng)}
                    />
                    <button onClick={() => setActiveMapPicker(`stop-${i}`)} className={`p-1.5 rounded-xl shrink-0 transition-all ${(stop.lat && stop.lng) ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}>
                      <MapIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeStop(i)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {stops.length < 3 && (
                <div className="flex items-center gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center z-10 shrink-0" />
                  <div className="flex-1">
                    <button
                      onClick={addStop}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 dark:text-white/40 hover:border-amber-400 hover:text-amber-500 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Hentian {stops.length > 0 ? '(caj ikut jarak)' : ''}
                    </button>
                  </div>
                </div>
              )}

              {/* Dropoff — with search autocomplete */}
              <div className="flex items-center gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center z-10 shrink-0">
                  <MapPin className="w-3 h-3 text-rose-500" />
                </div>
                <LocationSearchInput
                  label="Ke"
                  color="rose"
                  placeholder="Cari lokasi destinasi..."
                  value={dropoff}
                  onChange={(text) => { setDropoff(text); if (!text) setDropoffPos(null); }}
                  onSelect={(r) => { setDropoff(r.name); setDropoffPos([r.lat, r.lng]); }}
                />
                <button onClick={() => setActiveMapPicker('dropoff')} className={`p-1.5 rounded-xl shrink-0 transition-all ${dropoffPos ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-rose-500'}`}>
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Location Presets Chips */}
            {(presets.length > 0 || savedLocations.length > 0) && (
              <div className="mt-3 pl-10 space-y-2">
                {/* Admin Presets */}
                {presets.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {presets.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          if (focusedField === 'pickup') setPickup(p.label);
                          else setDropoff(p.label);
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-white/5 rounded-full text-[10px] font-bold text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <span className="opacity-70">{p.icon}</span> {p.label}
                      </button>
                    ))}
                  </div>
                )}
                {/* Saved Locations (student's own) */}
                {savedLocations.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {savedLocations.map(s => (
                      <div key={s.id} className="shrink-0 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full pl-3 pr-1.5 py-1.5">
                        <button
                          onClick={() => {
                            if (focusedField === 'pickup') { setPickup(s.label); setPickupPos([s.lat, s.lng]); }
                            else { setDropoff(s.label); setDropoffPos([s.lat, s.lng]); }
                          }}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1"
                        >
                          ⭐ {s.label}
                        </button>
                        <button
                          onClick={() => deleteSavedLocation(s.id)}
                          className="w-4 h-4 flex items-center justify-center text-amber-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Save current dropoff as favourite */}
                {dropoff && dropoffPos && !savedLocations.some(s => s.label === dropoff) && savedLocations.length < 5 && (
                  <button
                    onClick={saveCurrentDropoff}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-white/40 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                  >
                    <Star className="w-3 h-3" /> Simpan "{dropoff}" sebagai kegemaran
                  </button>
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {(pickupPos && dropoffPos) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="h-px bg-slate-100 dark:bg-white/5 w-full mt-1 mb-2" />

                {/* 2. Ride Mode & Settings Row */}
                <div className="flex flex-col gap-3">

            {/* Ride Mode Toggle */}
            <div className="bg-slate-50 dark:bg-zinc-950/50 p-1 rounded-xl flex border border-slate-100 dark:border-white/5">
              <button
                onClick={() => setIsCarpoolOpen(false)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all z-10 uppercase flex items-center justify-center gap-1.5 ${!isCarpoolOpen
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/10'
                    : 'text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60'
                  }`}
              >
                🚗 SOLO
              </button>
              <button
                onClick={() => setIsCarpoolOpen(true)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all z-10 flex items-center justify-center gap-1.5 uppercase ${isCarpoolOpen
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60'
                  }`}
              >
                <Users className="w-3.5 h-3.5" /> CARPOOL
              </button>
            </div>

            {/* Savings Nudge */}
            <div className="mt-[-4px]">
              <AnimatePresence mode="wait">
                {!isCarpoolOpen ? (
                  <motion.div key="solo-nudge" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-2 flex gap-2 items-start">
                    <span className="text-blue-500 text-xs shrink-0 mt-0.5">💡</span>
                    <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-200 leading-snug">
                      <span className="font-black uppercase tracking-wider text-[9px] block mb-0.5">Tips Tambang</span>
                      Tukar ke Carpool untuk tawar harga yang lebih rendah. So anda boleh <strong className="font-black">JIMAT KAW!</strong>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="carpool-nudge" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-2 flex gap-2 items-start">
                    <span className="text-emerald-500 text-xs shrink-0 mt-0.5">🔥</span>
                    <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 leading-snug">
                      <span className="font-black uppercase tracking-wider text-[9px] block mb-0.5">Mod Jimat Aktif</span>
                      Anda boleh <strong className="font-black">Cipta Kumpulan Baru</strong> (masukkan destinasi & tekan Minta Rider) ATAU <strong className="font-black">Sertai Kumpulan</strong> di bawah. Tambang akan digabungkan untuk lebih cepat dapat rider!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* UNIFIED PRICING SECTION */}
            <div className="flex flex-col gap-3">
              {/* Row 1: Price Input and Gender */}
              <div className="flex gap-3">
                {/* Price */}
                <div className="flex-[1.2] bg-slate-50 dark:bg-zinc-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-white/5 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-colors cursor-text flex flex-col justify-between relative" onClick={() => document.getElementById('priceInput')?.focus()}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest line-clamp-1">
                      {stops.length > 0 ? 'Tambang Asas' : 'Tawaran RM'}
                    </p>
                    {/* Inline Estimate Label if coords exist */}
                    {(() => {
                      if (!pickupPos || !dropoffPos) return null;
                      return (
                        <div className="text-[8px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-black">
                          Anggaran Sistem (Boleh Bida)
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center gap-1 border-b-2 border-dotted border-slate-200 dark:border-white/10 group-focus-within:border-amber-500/50">
                    <span className="text-xl font-black text-amber-500">RM</span>
                    <input
                      id="priceInput"
                      type="number"
                      min="1"
                      step="0.5"
                      className="w-full bg-transparent border-none text-xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-0 p-0"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="flex-[0.8] bg-slate-50 dark:bg-zinc-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">
                      Jantina
                    </p>
                    {!studentGender && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </div>
                  <div className="flex gap-1.5">
                    {(['LELAKI', 'PEREMPUAN'] as const).map(g => (
                      <button
                        key={g}
                        onClick={async () => {
                          setStudentGender(g);
                          if (user) await supabase.from('profiles').update({ gender: g }).eq('id', user.id);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border ${studentGender === g
                            ? g === 'LELAKI'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-400'
                              : 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-500/20 dark:border-rose-500/50 dark:text-rose-400'
                            : 'bg-white border-slate-200 text-slate-400 dark:bg-zinc-800 dark:border-white/10 dark:text-white/40'
                          }`}
                      >
                        {g === 'LELAKI' ? '♂ L' : '♀ P'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fare Breakdown (Only show if stops exist, OR just show distance info) */}
              {(() => {
                if (!pickupPos || !dropoffPos) return null;
                const toRad = (d: number) => d * Math.PI / 180;
                const R = 6371;
                const dLat = toRad(dropoffPos[0] - pickupPos[0]);
                const dLng = toRad(dropoffPos[1] - pickupPos[1]);
                const a = Math.sin(dLat/2)**2 + Math.cos(toRad(pickupPos[0]))*Math.cos(toRad(dropoffPos[0]))*Math.sin(dLng/2)**2;
                const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                
                if (stops.length > 0) {
                  const { surcharge, detourKm } = calcStopsSurcharge(pickupPos, dropoffPos, stops);
                  return (
                    <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Tambang Asas (~{distKm.toFixed(1)}km)</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">RM{proposedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-amber-200/60 dark:border-amber-500/20">
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">+ Caj {stops.filter(s => s.lat).length} Hentian (~{detourKm}km)</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">RM{surcharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">Jumlah Keseluruhan</span>
                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">RM{(proposedPrice + surcharge).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }

                // If NO stops, just show a subtle distance/estimate hint
                const est = Math.max(5, distKm * 1.5);
                const low = (est * 0.9).toFixed(2);
                const high = (est * 1.1).toFixed(2);
                return (
                  <p className="text-[10px] text-slate-500 dark:text-white/50 text-center font-medium">
                    Jarak lurus ~{distKm.toFixed(1)} km · Anggaran biasa <strong className="text-amber-600 dark:text-amber-400">RM{low} - RM{high}</strong>
                  </p>
                );
              })()}
            </div>
          </div>

          {/* 3. Carpool UI Context */}
          {/* Carpool Smart Match — upgraded assertive alert */}
          {(() => {
            const matches = openCarpools.filter(c =>
              dropoff && c.dropoff_name.toLowerCase().includes(dropoff.toLowerCase().slice(0, 4))
            );
            if (!matches.length || isCarpoolOpen || !dropoff) return null;
            const saving = matches[0]?.proposed_price
              ? Math.max(0, proposedPrice - matches[0].proposed_price / 2)
              : null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg shadow-emerald-500/20 cursor-pointer"
                onClick={() => setIsCarpoolOpen(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-base">🔥</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Carpool Tersedia!</p>
                    </div>
                    <p className="text-white font-black text-sm">
                      {matches.length} kumpulan ke destinasi sama
                    </p>
                    {saving !== null && saving > 0 && (
                      <p className="text-emerald-100 text-[10px] font-bold mt-0.5">
                        Jimat sehingga RM{saving.toFixed(2)} jika tumpang!
                      </p>
                    )}
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="text-white font-black text-xs">Sertai</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {isCarpoolOpen && (
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-500/10">
              <h3 className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Kumpulan Aktif Berdekatan
              </h3>
              {openCarpools.length > 0 ? (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {openCarpools.map(carpool => (
                    <div key={carpool.id} className="bg-white dark:bg-zinc-900 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center justify-between">
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-500 truncate">Oleh {carpool.student?.full_name?.split(' ')[0]}</p>
                          <span className="text-[8px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            🔥 Jimat
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{carpool.pickup_name} → {carpool.dropoff_name}</p>
                      </div>
                      <button onClick={() => openJoinCarpoolModal(carpool)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[11px] shrink-0 transition-colors shadow-sm shadow-emerald-500/20">
                        Sertai
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-[10px] font-bold text-slate-600 dark:text-white/60">Tiada kumpulan carpool sedia ada.</p>
                  <p className="text-[9px] text-slate-500 dark:text-white/40 mt-0.5">Teruskan untuk cipta kumpulan baru.</p>
                </div>
              )}
            </div>
          )}



          {/* 5. Add-ons */}
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">
              Keperluan Khas (Opsional)
            </p>
            <div className="flex flex-wrap gap-2">
              {POLYRIDER_ADDONS.map(addon => (
                <button
                  key={addon.key}
                  onClick={() => toggleAddon(addon.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    selectedAddons.includes(addon.key)
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-slate-100 dark:border-white/10 text-slate-500 dark:text-white/40 hover:border-slate-200 dark:hover:border-white/20'
                  }`}
                >
                  <span>{addon.emoji}</span>
                  {addon.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Submit Button */}
          <button
            disabled={!pickup || !dropoff || isSearching || proposedPrice < 1 || !studentGender}
            onClick={handleBook}
            className="w-full h-12 mt-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            Minta Rider {isCarpoolOpen && openCarpools.length === 0 ? '(Cipta Carpool)' : ''}
          </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Public Carpool Board (Horizontal Scroll) */}
      {openCarpools.length > 0 && (
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Carpool Awam Terbuka
            </h3>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
              {openCarpools.length} Kumpulan
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 px-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            {openCarpools.map(carpool => (
              <div 
                key={carpool.id} 
                className="min-w-[240px] max-w-[240px] bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none snap-center flex flex-col justify-between gap-4 shrink-0 transition-transform active:scale-[0.98]"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-white/40">
                      Oleh {carpool.student?.full_name?.split(' ')[0] || 'Pelajar'}
                    </p>
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-500/20">
                      ~RM{(carpool.proposed_price / 2).toFixed(2)} / pax
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-600 dark:text-white/60 truncate">{carpool.pickup_name}</p>
                    </div>
                    <div className="w-0.5 h-2.5 bg-slate-200 dark:bg-white/10 ml-[3px]" />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <p className="text-[12px] font-black text-slate-900 dark:text-white truncate">{carpool.dropoff_name}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => openJoinCarpoolModal(carpool)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  Sertai Carpool
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 mb-4">
        <button
          onClick={() => navigate('/polyrider/rider')}
          className="w-full relative overflow-hidden bg-slate-900 dark:bg-zinc-800 rounded-[2rem] p-5 text-left shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between group transition-all hover:scale-[1.02]"
        >
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/30 transition-all" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[1rem] flex items-center justify-center shadow-inner shadow-amber-300/50">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">
                {isRegisteredRider ? 'Dashboard Rider' : 'Jana Pendapatan'}
              </p>
              <h3 className="text-white font-black text-base">
                {isRegisteredRider ? 'Pergi Ke Papan Pemuka' : 'Daftar Rider / Driver'}
              </h3>
            </div>
          </div>

          <div className="relative z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition-colors">
            <span className="text-white font-bold text-sm">→</span>
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OVERLAYS & MODALS                                             */}
      {/* ------------------------------------------------------------- */}

      {/* Join Carpool Modal */}
      <AnimatePresence>
        {joiningCarpool && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl mx-auto p-6 flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white">Tumpang Carpool</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-white/50 mt-1">
                    Bersama {joiningCarpool.student?.full_name?.split(' ')[0]} · {joiningCarpool.pickup_name} → {joiningCarpool.dropoff_name}
                  </p>
                </div>
                <button onClick={closeJoinCarpoolModal} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-white/50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-5">

                {/* ── PICKUP (Smart) ── */}
                <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-xl border border-slate-100 dark:border-white/5 p-3">
                  <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">📍 Pickup Anda</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <LocationSearchInput
                        label="Dari"
                        color="blue"
                        placeholder={isDetectingLocation ? 'Mengesan lokasi GPS...' : 'Cari lokasi pickup anda...'}
                        value={pickup}
                        onChange={(text) => { setPickup(text); if (!text) setPickupPos(null); }}
                        onSelect={(r) => { setPickup(r.name); setPickupPos([r.lat, r.lng]); }}
                      />
                    </div>
                    {/* GPS Button */}
                    <button
                      onClick={detectCurrentLocation}
                      disabled={isDetectingLocation}
                      title="Guna lokasi GPS semasa"
                      className={`p-2 rounded-xl shrink-0 transition-all ${
                        isDetectingLocation ? 'text-blue-400 animate-pulse'
                        : pickupPos ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
                      }`}
                    >
                      {isDetectingLocation
                        ? <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
                        : <Navigation className="w-4 h-4" />}
                    </button>
                    {/* Map Picker Button */}
                    <button
                      onClick={() => setActiveMapPicker('pickup')}
                      title="Pilih dari peta"
                      className={`p-2 rounded-xl shrink-0 transition-all ${
                        pickupPos ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
                      }`}
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {pickupPos && (
                    <p className="text-[9px] text-blue-500 font-bold mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      Koordinat tersimpan
                    </p>
                  )}
                </div>

                {/* ── DROPOFF (name-only, pre-filled from carpool) ── */}
                <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-xl border border-slate-100 dark:border-white/5 p-3">
                  <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">🏁 Destinasi (Sama Dengan Kumpulan)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <LocationSearchInput
                        label="Ke"
                        color="rose"
                        placeholder="Destinasi..."
                        value={dropoff}
                        onChange={(text) => { setDropoff(text); if (!text) setDropoffPos(null); }}
                        onSelect={(r) => { setDropoff(r.name); setDropoffPos([r.lat, r.lng]); }}
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-white/30 font-medium mt-1.5">
                    💡 Telah diisi mengikut destinasi kumpulan. Boleh ubah jika perlu.
                  </p>
                </div>

                {/* ── PRICE ESTIMATOR ── */}
                {pickupPos && (() => {
                  const dist = haversineKm(pickupPos, [joiningCarpool.pickup_lat, joiningCarpool.pickup_lng]);
                  const est = Math.max(2, dist * 1.5);
                  return (
                    <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">Anggaran Sumbangan</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                            ~{dist.toFixed(1)} km dari titik pickup kumpulan
                          </p>
                        </div>
                        <button
                          onClick={() => setProposedPrice(parseFloat(est.toFixed(2)))}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-lg transition-colors"
                        >
                          Guna ~RM{est.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── PRICE INPUT ── */}
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Sumbangan Tambang (RM)</p>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-black text-emerald-500">RM</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      className="flex-1 bg-transparent border-none text-2xl font-black text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-0 p-0"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* ── GENDER ── */}
                <div className="bg-white dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Jantina Penumpang</p>
                    {!studentGender && (
                      <p className="text-[10px] text-amber-500 font-bold animate-pulse">Mesti Pilih!</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(['LELAKI', 'PEREMPUAN'] as const).map(g => (
                      <button
                        key={g}
                        onClick={async () => {
                          setStudentGender(g);
                          if (user) await supabase.from('profiles').update({ gender: g }).eq('id', user.id);
                        }}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                          studentGender === g
                            ? g === 'LELAKI'
                              ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400'
                              : 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/50 dark:text-rose-400'
                            : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-zinc-950/50 dark:border-white/5 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {g === 'LELAKI' ? '♂' : '♀'} {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA Button — pickup GPS required */}
              <button
                onClick={handleBook}
                disabled={!pickup || !pickupPos || !dropoff || proposedPrice < 1 || !studentGender}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
              >
                {!pickupPos ? '📍 Tetapkan lokasi pickup dahulu' : 'Sahkan & Minta Rider'}
              </button>
              {!pickupPos && (
                <p className="text-center text-[10px] text-slate-400 dark:text-white/30 font-medium mt-2">
                  Tekan ikon GPS atau cari lokasi pickup anda untuk meneruskan.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {activeMapPicker && (() => {
          const isStopPicker = activeMapPicker.startsWith('stop-');
          const stopIndex = isStopPicker ? parseInt(activeMapPicker.split('-')[1], 10) : -1;
          const stopData = isStopPicker ? stops[stopIndex] : null;

          const getMapTitle = () => {
            if (isStopPicker) return `Hentian ${stopIndex + 1}`;
            return activeMapPicker === 'pickup' ? 'Pickup' : 'Destinasi';
          };

          const getMapSubtitle = () => {
            if (isStopPicker) return '📍 Ketik peta untuk tetapkan hentian';
            return activeMapPicker === 'pickup' ? '📍 Ketik peta atau pin lokasi anda sekarang' : '🏁 Ketik pada peta untuk tetapkan destinasi';
          };

          const getMapPosition = (): [number, number] | null => {
            if (isStopPicker) return (stopData?.lat && stopData?.lng) ? [stopData.lat, stopData.lng] : null;
            return activeMapPicker === 'pickup' ? pickupPos : dropoffPos;
          };

          const isConfirmDisabled = () => {
            if (isStopPicker) return !stops[stopIndex]?.lat || !stops[stopIndex]?.lng;
            return activeMapPicker === 'pickup' ? !pickupPos : !dropoffPos;
          };

          const getConfirmText = () => {
            if (isStopPicker) return stops[stopIndex]?.name || `Lokasi Hentian ${stopIndex + 1}`;
            return activeMapPicker === 'pickup' ? (pickup || 'Lokasi Pickup') : (dropoff || 'Lokasi Destinasi');
          };

          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex flex-col justify-end"
            >
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl mx-auto overflow-hidden h-[85vh] flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">Pilih Lokasi {getMapTitle()}</h3>
                    <p className="text-[10px] text-slate-400 dark:text-white/40 font-semibold mt-0.5">
                      {getMapSubtitle()}
                    </p>
                  </div>
                  <button onClick={() => setActiveMapPicker(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-900/10 flex items-center justify-center text-slate-500 dark:text-white/50">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 flex flex-col min-h-0">
                  <MapPicker
                    position={getMapPosition()}
                    label={getMapTitle()}
                    onPositionChange={(pos) => {
                      if (isStopPicker) updateStopPos(stopIndex, pos[0], pos[1]);
                      else if (activeMapPicker === 'pickup') setPickupPos(pos);
                      else setDropoffPos(pos);
                    }}
                    onNameChange={(name) => {
                      if (isStopPicker) updateStopName(stopIndex, name);
                      else if (activeMapPicker === 'pickup') setPickup(name);
                      else setDropoff(name);
                    }}
                  />
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0">
                  <button
                    onClick={() => setActiveMapPicker(null)}
                    disabled={isConfirmDisabled()}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    ✓ Sahkan {getConfirmText()}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Bidding / Searching Overlay */}
      {createPortal(
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex flex-col justify-end bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="bg-white dark:bg-zinc-900 rounded-t-[2rem] p-6 max-w-xl mx-auto w-full h-[70vh] flex flex-col shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bike className="w-8 h-8 text-amber-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Mencari Rider...</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-white/60">Tawaran anda dihantar kepada semua rider. Sila semak bidaan balas di bawah.</p>
                  {expiresIn && (
                    <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[11px] font-black ${
                      expiresIn === 'Tamat' || expiresIn < '1:00'
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {expiresIn === 'Tamat' ? 'Tempoh Tamat' : `Tamat dalam ${expiresIn}`}
                    </div>
                  )}
                </div>

                {/* Bids List */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {bids.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-white/40">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Menunggu Rider...</p>
                    </div>
                  ) : (
                    bids.map((bid) => (
                       <motion.div
                        key={bid.id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                              <span className="text-lg">{bid.rider?.vehicle_type === 'KERETA' ? '🚗' : '🏍️'}</span>
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-white text-sm">{bid.rider?.profiles?.full_name || 'Rider'}</p>
                              <p className="text-xs font-bold text-slate-400 dark:text-white/40">{bid.rider?.plate_number}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {bid.rider?.avg_rating && (
                                  <span className="text-[10px] font-black text-amber-500">⭐ {Number(bid.rider.avg_rating).toFixed(1)}</span>
                                )}
                                {bid.rider?.total_trips > 0 && (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/40">{bid.rider.total_trips} trip</span>
                                )}
                                {(() => {
                                  const trips = bid.rider?.total_trips || 0;
                                  const rating = Number(bid.rider?.avg_rating || 0);
                                  if (trips >= 50) return <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">🏆 Pro</span>;
                                  if (rating >= 4.8 && trips >= 5) return <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">⭐ Top</span>;
                                  if (trips < 5) return <span className="text-[9px] font-black bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 px-1.5 py-0.5 rounded-full">🆕 Baru</span>;
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-emerald-500">RM {Number(bid.bid_amount).toFixed(2)}</p>
                            {/* Counter-offer status badge */}
                            {bid.counter_status === 'PENDING_RIDER' && (
                              <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full block mt-1">⏳ Menunggu Rider</span>
                            )}
                            {bid.counter_status === 'ACCEPTED' && (
                              <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full block mt-1">✓ Rider Setuju</span>
                            )}
                            {bid.counter_status === 'REJECTED' && (
                              <span className="text-[9px] font-black bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 px-2 py-0.5 rounded-full block mt-1">✗ Rider Tolak</span>
                            )}
                            {(!bid.counter_status || bid.counter_status === 'REJECTED') && (
                              <div className="flex flex-col gap-1 mt-1">
                                <button onClick={() => acceptBid(bid)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1">
                                  Terima <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setCounteringBidId(bid.id); setCounterAmount(bid.bid_amount); }}
                                  className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors">
                                  Tawar Balik
                                </button>
                              </div>
                            )}
                            {/* If rider accepted counter, allow final accept */}
                            {bid.counter_status === 'ACCEPTED' && (
                              <button onClick={() => acceptBid({ ...bid, bid_amount: bid.counter_amount })}
                                className="mt-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1">
                                Sahkan RM{Number(bid.counter_amount).toFixed(2)} <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Inline counter-offer input */}
                        {counteringBidId === bid.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">RM</span>
                              <input type="number" min="1" step="0.5"
                                value={counterAmount}
                                onChange={e => setCounterAmount(Number(e.target.value))}
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <button onClick={() => submitCounterOffer(bid.id, bid.rider_id)}
                              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors">
                              Hantar
                            </button>
                            <button onClick={() => setCounteringBidId(null)}
                              className="px-3 py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-xl text-xs transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsCancelModalOpen(true)}>
                    Batal Carian
                  </Button>
                </div>
                
                <CancelJobModal 
                  isOpen={isCancelModalOpen}
                  onClose={() => setIsCancelModalOpen(false)}
                  onConfirm={handleCancelJob}
                  role="STUDENT"
                  isLoading={isCancelling}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && receiptJob && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl p-6 pb-10 shadow-2xl max-h-[85dvh] overflow-y-auto"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Perjalanan Selesai!</h3>
                <p className="text-xs text-slate-400 dark:text-white/40 font-medium mt-1">Terima kasih kerana menggunakan PolyRider</p>
              </div>

              {/* Receipt Card */}
              <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-white/10 mb-4">
                <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Rider</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{receiptJob.rider?.profiles?.full_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Plat</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white/80">{receiptJob.rider?.plate_number || '—'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Dari</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white/80 text-right max-w-[60%]">{receiptJob.pickup_name}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Ke</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white/80 text-right max-w-[60%]">{receiptJob.dropoff_name}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Tarikh</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white/80">
                    {new Date(receiptJob.created_at).toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Tambang</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">RM {Number(receiptJob.proposed_price).toFixed(2)}</span>
                </div>
                {receiptJob.tip_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">Tip Rider 🎁</span>
                    <span className="text-sm font-black text-amber-500">+RM {Number(receiptJob.tip_amount).toFixed(2)}</span>
                  </div>
                )}
                {receiptJob.tip_amount > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10">
                    <span className="text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Jumlah</span>
                    <span className="text-2xl font-black text-emerald-500">RM {(Number(receiptJob.proposed_price) + Number(receiptJob.tip_amount)).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3 text-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">✅ STATUS SELESAI — Bayaran Tunai</p>
              </div>

              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Carpool Room Overlay */}
      {createPortal(
        <AnimatePresence>
          {activeJob && ['GATHERING', 'CARPOOL_REQUEST'].includes(activeJob.status) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex flex-col justify-end bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="bg-white dark:bg-zinc-900 rounded-t-[2rem] p-6 max-w-xl mx-auto w-full h-[75vh] flex flex-col shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeJob.status === 'CARPOOL_REQUEST' ? 'Menunggu Persetujuan...' : 'Bilik Carpool'}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-white/60 mt-1">
                    {activeJob.status === 'CARPOOL_REQUEST'
                      ? 'Owner sedang meneliti permintaan anda.'
                      : activeJob.id === activeJob.carpool_group_id
                        ? 'Menunggu penumpang lain menyertai carpool anda.'
                        : 'Menunggu owner memulakan perjalanan.'}
                  </p>
                </div>

                {activeJob.status === 'GATHERING' && (
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">
                        Ahli Kumpulan ({carpoolMembers.length}/3)
                      </h4>
                      <div className="space-y-2">
                        {carpoolMembers.map(m => (
                          <div key={m.id} className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-slate-100 dark:border-white/5">
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{m.student?.full_name || 'Penumpang'}</p>
                              <p className="text-xs text-slate-500 dark:text-white/50">{m.passenger_gender}</p>
                            </div>
                            {m.id === activeJob.carpool_group_id && (
                              <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Owner</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeJob.id === activeJob.carpool_group_id && carpoolRequests.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 mt-4">
                          Permintaan Baru ({carpoolRequests.length})
                        </h4>
                        <div className="space-y-2">
                          {carpoolRequests.map(req => (
                            <div key={req.id} className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl flex items-center justify-between border border-orange-200 dark:border-orange-500/20">
                              <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{req.student?.full_name || 'Penumpang'}</p>
                                <p className="text-xs text-slate-500 dark:text-white/50">{req.passenger_gender}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRejectRequest(req.id)}
                                  disabled={processingRequestId === req.id}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${processingRequestId === req.id ? 'bg-slate-200 dark:bg-white/10 opacity-50 cursor-not-allowed text-slate-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:opacity-80'}`}
                                >
                                  {processingRequestId === req.id ? <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleAcceptRequest(req.id)}
                                  disabled={processingRequestId === req.id}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${processingRequestId === req.id ? 'bg-slate-200 dark:bg-white/10 opacity-50 cursor-not-allowed text-slate-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:opacity-80'}`}
                                >
                                  {processingRequestId === req.id ? <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeJob.status === 'CARPOOL_REQUEST' && (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Harap Bersabar</p>
                  </div>
                )}

                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  {activeJob.status === 'GATHERING' && activeJob.id === activeJob.carpool_group_id && (
                    <button
                      onClick={handleLockCarpool}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-colors"
                    >
                      Tutup Carpool & Cari Rider
                    </button>
                  )}

                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full py-4 rounded-xl font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Batal {activeJob.status === 'CARPOOL_REQUEST' ? 'Permintaan' : 'Carpool'}
                  </button>
                </div>

                {/* CancelJobModal lives inside portal so z-index stack works */}
                <CancelJobModal
                  isOpen={isCancelModalOpen}
                  onClose={() => setIsCancelModalOpen(false)}
                  onConfirm={handleCancelJob}
                  role="STUDENT"
                  isLoading={isCancelling}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Trip History */}
      {tripHistory.length > 0 && !isSearching && !activeJob && (
        <div className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-3 flex items-center gap-2">
            <History className="w-3 h-3" /> Perjalanan Terkini
          </p>
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
            {tripHistory.map(t => (
              <div key={t.id} className="min-w-[240px] w-[240px] shrink-0 snap-center bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 shadow-sm rounded-2xl p-4 flex flex-col relative overflow-hidden">
                {/* Background decorative blob */}
                <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-20 ${t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                    t.status === 'COMPLETED' 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {t.status === 'COMPLETED' ? 'Selesai' : 'Batal'}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-white/40">
                    {new Date(t.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                <div className="flex-1 flex flex-col gap-3 relative z-10">
                  <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-slate-100 dark:bg-white/10" />
                  
                  <div className="flex items-start gap-3 relative z-10">
                     <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-900 mt-0.5 shrink-0" />
                     <p className="text-xs font-bold text-slate-700 dark:text-white/80 line-clamp-2 leading-tight">{t.pickup_name}</p>
                  </div>
                  <div className="flex items-start gap-3 relative z-10">
                     <div className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-white dark:ring-zinc-900 mt-0.5 shrink-0" />
                     <p className="text-xs font-bold text-slate-700 dark:text-white/80 line-clamp-2 leading-tight">{t.dropoff_name}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/5 flex justify-between items-end relative z-10">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Tambang</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white leading-none">RM {Number(t.proposed_price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {renderContactJPP()}
    </div>
  );
}
