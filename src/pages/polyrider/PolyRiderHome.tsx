import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, MapPin, Navigation, ShieldAlert, Banknote, UserCircle, MessageCircle, Send, Map as MapIcon, X, CheckCircle, Check, Users, Star, History, Clock, Phone, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPicker } from '@/components/MapPicker';
import { SOSContactsManager } from './SOSContactsManager';
import { notifyAllActiveRiders, notifyBiddingRiders, notifyUsers } from '@/lib/polyRiderNotify';

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
  onStars: (s: number) => void;
  onNote: (n: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  disabled: boolean;
}
function RatingModal({ show, stars, note, onStars, onNote, onSubmit, onSkip, disabled }: RatingModalProps) {
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[300] flex items-end justify-center p-4">
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Perjalanan Selesai!</h2>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Bagaimana pengalaman anda dengan rider ini?</p>
            </div>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => onStars(s)}
                  className={`text-3xl transition-transform ${s <= stars ? 'scale-110' : 'opacity-30'}`}>
                  ⭐
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => onNote(e.target.value)}
              placeholder="Ulasan ringkas (opsional)..."
              className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm mb-4 resize-none h-24 focus:ring-2 focus:ring-amber-500"
            />
            <div className="space-y-2">
              <button onClick={onSubmit} disabled={disabled || stars === 0}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors">
                Hantar Penilaian
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
  const [activeRiders, setActiveRiders] = useState(0);
  const [isRegisteredRider, setIsRegisteredRider] = useState(false);
  const [studentGender, setStudentGender] = useState<'LELAKI' | 'PEREMPUAN' | null>(null);

  // Booking Form State
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropoffPos, setDropoffPos] = useState<[number, number] | null>(null);
  const [activeMapPicker, setActiveMapPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [proposedPrice, setProposedPrice] = useState<number>(3.0);
  const [focusedField, setFocusedField] = useState<'pickup' | 'dropoff' | null>(null);

  // Location Presets
  const [presets, setPresets] = useState<any[]>([]);

  // Carpool System State
  const [isCarpoolOpen, setIsCarpoolOpen] = useState(false);
  const [openCarpools, setOpenCarpools] = useState<any[]>([]);
  const [joiningCarpool, setJoiningCarpool] = useState<any>(null);
  const [carpoolMembers, setCarpoolMembers] = useState<any[]>([]);
  const [carpoolRequests, setCarpoolRequests] = useState<any[]>([]);

  // Job & Bids State
  const [isSearching, setIsSearching] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const searchStartTime = useRef<number | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

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

  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState('');
  const [completedJob, setCompletedJob] = useState<any>(null);

  // Trip History
  const [tripHistory, setTripHistory] = useState<any[]>([]);

  // Fetch presets, active riders, carpools on mount
  useEffect(() => {
    const init = async () => {
      const [ridersRes, presetsRes] = await Promise.all([
        supabase.rpc('get_active_polyrider_count'),
        supabase.from('polyrider_location_presets').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (!ridersRes.error && ridersRes.data !== null) setActiveRiders(ridersRes.data);
      if (presetsRes.data) setPresets(presetsRes.data);

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

  // Fetch open carpools when idle
  useEffect(() => {
    if (isSearching || activeJob || !user) return;
    const fetch = async () => {
      const { data } = await supabase.from('polyrider_jobs')
        .select('id, pickup_name, dropoff_name, proposed_price, is_carpool_open, student_id, carpool_group_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_gender, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
        .eq('status', 'GATHERING').eq('is_carpool_open', true).neq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setOpenCarpools(data);
    };
    fetch();
    const iv = setInterval(fetch, 12000);
    return () => clearInterval(iv);
  }, [isSearching, activeJob, user]);

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
          supabase.from('polyrider_bids')
            .select('*, rider:polyrider_profiles(user_id, plate_number, vehicle_type, avg_rating, total_trips, profiles(full_name))')
            .eq('job_id', activeJob.id).eq('status', 'PENDING').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setBids(data); })
        );
      } else if (jobData.status === 'GATHERING') {
        tasks.push(
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
        );
      } else if (jobData.status !== 'CARPOOL_REQUEST') {
        tasks.push(
          supabase.from('polyrider_chats').select('*').eq('job_id', activeJob.id).order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setChatMessages(data); })
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

    const { data, error } = await supabase.rpc('create_polyrider_job', {
      p_student_id: user.id, p_pickup_name: pickup, p_dropoff_name: dropoff,
      p_pickup_lat: pickupPos?.[0] ?? null, p_pickup_lng: pickupPos?.[1] ?? null,
      p_dropoff_lat: dropoffPos?.[0] ?? null, p_dropoff_lng: dropoffPos?.[1] ?? null,
      p_proposed_price: proposedPrice,
      p_is_carpool_open: isJoiningCarpool ? true : isCarpoolOpen,
      p_join_group_id: joiningCarpool?.carpool_group_id ?? null,
    });
    const job = Array.isArray(data) ? data[0] : data;
    if (error || !job) {
      console.error('[handleBook] RPC error:', error?.message, error?.details, error?.hint);
      toast.error(error?.message || 'Gagal menempah. Cuba lagi.');
      setIsSearching(false);
      return;
    }
    setActiveJob(job); setJoiningCarpool(null);

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

  const openJoinCarpoolModal = (carpool: any) => {
    setJoiningCarpool(carpool);
    // Pre-fill destination — same as owner's dropoff. DO NOT clear pickup.
    // Passenger sets their own pickup location separately.
    setDropoff(carpool.dropoff_name);
    // Only prefill pickup if currently empty
    if (!pickup) setPickup('');
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

  const handleCancelJob = async () => {
    if (!activeJob) return;
    if (['ACCEPTED', 'ARRIVED', 'IN_TRANSIT'].includes(activeJob.status)) {
      toast.error('Rider sudah dalam perjalanan! Hubungi rider melalui chat.'); return;
    }

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

    // Cancel based on the actual current status — not just PENDING
    const { error } = await supabase
      .from('polyrider_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', activeJob.id)
      .in('status', ['PENDING', 'GATHERING', 'CARPOOL_REQUEST']);

    if (error) {
      console.error('[handleCancelJob]', error);
      toast.error('Gagal membatalkan. Cuba lagi.');
      return;
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
    await supabase.from('polyrider_jobs').update({ student_rating: ratingStars, student_rating_note: ratingNote }).eq('id', completedJob.id);
    setShowRatingModal(false); setRatingStars(0); setRatingNote(''); setCompletedJob(null);
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
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch {
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

  // RENDER: ACTIVE PERJALANAN — only for in-ride statuses (NOT carpool waiting phases)
  if (activeJob && ['ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'EMERGENCY'].includes(activeJob.status)) {
    const stepIdx = STATUS_STEPS.findIndex(s => s.key === activeJob.status);
    return (
      <div className="max-w-xl mx-auto pb-40 pt-4 px-4 min-h-[100dvh] flex flex-col">
        <SOSConfirmModal
          show={showSOSModal}
          klkPhone={klkPhone}
          onConfirm={triggerSOS}
          onCancel={() => setShowSOSModal(false)}
        />
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
          onStars={setRatingStars}
          onNote={setRatingNote}
          onSubmit={submitRating}
          onSkip={() => { setShowRatingModal(false); setCompletedJob(null); }}
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

          {sosActive ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="text-6xl mb-4 animate-pulse">🚨</div>
              <h2 className="text-2xl font-black text-red-600 mb-2">Isyarat SOS Aktif</h2>
              <p className="text-slate-500 dark:text-white/60 text-sm mb-6">
                Pihak KLK dan Pentadbir JPP telah dimaklumkan. Sila tunggu bantuan.
              </p>
              {/* Contacts quick action */}
              <button
                onClick={() => setShowSOSContactsSheet(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold px-6 py-4 rounded-2xl text-base shadow-lg shadow-red-500/30 mb-3"
              >
                <MessageCircle className="w-5 h-5" />
                Maklumkan Kenalan Kecemasan
              </button>
              {klkPhone && (
                <a href={`tel:${klkPhone}`}
                  className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold px-6 py-3 rounded-2xl text-sm mb-3"
                >
                  <Phone className="w-4 h-4" />
                  Hubungi KLK: {klkPhone}
                </a>
              )}
              <a href="tel:999"
                className="flex items-center gap-2 text-red-500 font-bold text-sm py-2"
              >
                <Phone className="w-4 h-4" />
                Kecemasan Polis/Bomba: 999
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setShowSOSModal(true)} className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Kecemasan (SOS)
              </button>
              <button onClick={() => setShowManageContacts(true)} className="w-full py-2 text-xs text-slate-400 dark:text-white/30 font-bold flex items-center justify-center gap-1.5">
                <UserCircle className="w-3.5 h-3.5" /> Urus Kenalan Kecemasan SOS
              </button>
            </div>
          )}
        </div>
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
        onStars={setRatingStars}
        onNote={setRatingNote}
        onSubmit={submitRating}
        onSkip={() => { setShowRatingModal(false); setCompletedJob(null); }}
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

              {/* Pickup */}
              <div className="flex items-center gap-4 relative mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center z-10 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-white/5 rounded-2xl p-2.5 flex items-center gap-2 transition-colors focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
                  <div className="flex-1 px-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">Dari</p>
                    <input
                      type="text"
                      placeholder="Lokasi pickup..."
                      className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none focus:ring-0 p-0"
                      value={pickup}
                      onFocus={() => setFocusedField('pickup')}
                      onChange={(e) => setPickup(e.target.value)}
                    />
                  </div>
                  <button onClick={() => setActiveMapPicker('pickup')} className={`p-1.5 rounded-xl transition-all ${pickupPos ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-blue-500'}`}>
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex items-center gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center z-10 shrink-0">
                  <MapPin className="w-3 h-3 text-rose-500" />
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-white/5 rounded-2xl p-2.5 flex items-center gap-2 transition-colors focus-within:border-rose-500/50 focus-within:ring-1 focus-within:ring-rose-500/20">
                  <div className="flex-1 px-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">Ke</p>
                    <input
                      type="text"
                      placeholder="Lokasi destinasi..."
                      className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none focus:ring-0 p-0"
                      value={dropoff}
                      onFocus={() => setFocusedField('dropoff')}
                      onChange={(e) => setDropoff(e.target.value)}
                    />
                  </div>
                  <button onClick={() => setActiveMapPicker('dropoff')} className={`p-1.5 rounded-xl transition-all ${dropoffPos ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-rose-500'}`}>
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Location Presets Chips */}
            {presets.length > 0 && (
              <div className="mt-3 pl-10">
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
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-white/5 w-full my-1" />

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

            {/* Price and Gender Horizontal Row */}
            <div className="flex gap-3">
              {/* Price */}
              <div className="flex-[0.4] bg-slate-50 dark:bg-zinc-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-white/5 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-colors cursor-text" onClick={() => document.getElementById('priceInput')?.focus()}>
                <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 line-clamp-1">
                  Tawaran RM
                </p>
                <div className="flex items-center gap-1 border-b-2 border-dotted border-slate-200 dark:border-white/10 group-focus-within:border-amber-500/50">
                  <span className="text-sm font-black text-amber-500">RM</span>
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
              <div className="flex-[0.6] bg-slate-50 dark:bg-zinc-950/50 rounded-xl p-2.5 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
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
                      {g === 'LELAKI' ? '♂' : '♀'} {g === 'LELAKI' ? 'L' : 'P'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* 3. Carpool UI Context */}
          {dropoff && openCarpools.some(c => c.dropoff_name.toLowerCase() === dropoff.toLowerCase()) && !isCarpoolOpen && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" onClick={() => setIsCarpoolOpen(true)}>
              <div className="bg-emerald-100 dark:bg-emerald-500/20 p-1.5 rounded-full shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">🔥</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Carpool ke destinasi sama!</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-medium uppercase tracking-wider">Kongsikan tambang. Tekan sini.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
          )}

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
                        <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-500 mb-0.5 truncate">Oleh {carpool.student?.full_name?.split(' ')[0]}</p>
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

          {/* 4. Submit Button */}
          <button
            disabled={!pickup || !dropoff || isSearching || proposedPrice < 1 || !studentGender}
            onClick={handleBook}
            className="w-full h-12 mt-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            Minta Rider {isCarpoolOpen && openCarpools.length === 0 ? '(Cipta Carpool)' : ''}
          </button>

        </div>
      </div>

      {/* Public Carpool Board moved to main flow */}

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
              className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl mx-auto p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white">Tumpang Carpool</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-white/50 mt-1">Bersama {joiningCarpool.student?.full_name?.split(' ')[0]}</p>
                </div>
                <button onClick={() => setJoiningCarpool(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white dark:bg-zinc-900/10 flex items-center justify-center text-slate-500 dark:text-white/50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 ml-1">Dari (Pickup Anda)</p>
                  <input
                    type="text"
                    placeholder="Lokasi anda..."
                    className="w-full bg-transparent border-none text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-0 p-1"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </div>
                <div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 ml-1">Ke (Destinasi Anda)</p>
                  <input
                    type="text"
                    placeholder="Lokasi dituju..."
                    className="w-full bg-transparent border-none text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-0 p-1"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                  />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 flex items-center">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 ml-1">Sumbangan Tambang (RM)</p>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      className="w-full bg-transparent border-none text-xl font-black text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-0 p-1"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Jantina Penumpang (Carpool Join) */}
                <div className="bg-white dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">
                      Jantina Penumpang
                    </p>
                    {!studentGender && (
                      <p className="text-[10px] text-amber-500 font-bold animate-pulse">
                        Mesti Pilih!
                      </p>
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
                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${studentGender === g
                            ? g === 'LELAKI'
                              ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400 shadow-sm shadow-blue-500/10'
                              : 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/50 dark:text-rose-400 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-zinc-950/50 dark:border-white/5 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-zinc-900'
                          }`}
                      >
                        {g === 'LELAKI' ? '♂' : '♀'} {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={!pickup || !dropoff || proposedPrice < 1 || !studentGender}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl disabled:opacity-50"
              >
                Sahkan & Minta Rider
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {activeMapPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl mx-auto overflow-hidden h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-900 dark:text-white">Pilih Lokasi {activeMapPicker === 'pickup' ? 'Pickup' : 'Dropoff'}</h3>
                <button onClick={() => setActiveMapPicker(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white dark:bg-zinc-900/10 flex items-center justify-center text-slate-500 dark:text-white/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 relative">
                <MapPicker
                  position={activeMapPicker === 'pickup' ? pickupPos : dropoffPos}
                  onPositionChange={(pos) => activeMapPicker === 'pickup' ? setPickupPos(pos) : setDropoffPos(pos)}
                />
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                <button onClick={() => setActiveMapPicker(null)} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl">
                  Sahkan Lokasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-emerald-500">RM {Number(bid.bid_amount).toFixed(2)}</p>
                            <button
                              onClick={() => acceptBid(bid)}
                              className="mt-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
                            >
                              Terima <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <button
                  onClick={handleCancelJob}
                  className="w-full py-4 rounded-xl font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white dark:bg-zinc-900/5 hover:bg-slate-200 dark:hover:bg-white dark:bg-zinc-900/10 transition-colors"
                >
                  Batal Carian
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
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
                    onClick={handleCancelJob}
                    className="w-full py-4 rounded-xl font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white dark:bg-zinc-900/5 hover:bg-slate-200 dark:hover:bg-zinc-900/10 transition-colors"
                  >
                    Batal {activeJob.status === 'CARPOOL_REQUEST' ? 'Permintaan' : 'Carpool'}
                  </button>
                </div>
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
          <div className="space-y-2">
            {tripHistory.map(t => (
              <div key={t.id} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.pickup_name} → {t.dropoff_name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{new Date(t.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-black text-emerald-500">RM {Number(t.proposed_price).toFixed(2)}</p>
                  <span className={`text-[10px] font-bold ${t.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                    {t.status === 'COMPLETED' ? 'Selesai' : 'Dibatal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
