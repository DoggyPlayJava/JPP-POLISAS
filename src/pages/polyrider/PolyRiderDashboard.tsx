import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bike, CheckCircle, ShieldAlert, Navigation, Upload, Clock, MapPin, X, MessageCircle, Send, Banknote, Users, Star, TrendingUp, Phone, UserCircle, History, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uploadFileToDrive } from '@/lib/driveUpload';
import { RouteViewer } from '@/components/RouteViewer';
import { SOSContactsManager } from './SOSContactsManager';
import { notifyUsers } from '@/lib/polyRiderNotify';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// -------------------------------------------------------
// SOS CONFIRM MODAL for Rider — module scope to prevent re-mounts
// -------------------------------------------------------
interface RiderSOSModalProps { show: boolean; klkPhone: string; onConfirm: () => void; onCancel: () => void; }
function RiderSOSModal({ show, klkPhone, onConfirm, onCancel }: RiderSOSModalProps) {
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center p-6">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-pulse">🚨</div>
            <h1 className="text-4xl font-black text-white mb-2">SOS KECEMASAN</h1>
            <p className="text-red-100 text-lg mb-8">Isyarat akan dihantar dalam...</p>
            <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white flex items-center justify-center mx-auto mb-8">
              <span className="text-6xl font-black text-white">{countdown}</span>
            </div>
            <button onClick={onCancel} className="w-full py-5 bg-white text-red-600 font-black text-xl rounded-2xl shadow-xl">
              BATAL — Tekan Untuk Batalkan
            </button>
            {klkPhone && (
              <a href={`tel:${klkPhone}`} className="mt-4 flex items-center justify-center gap-2 text-white/80 text-sm py-3">
                <Phone className="w-4 h-4" /> Hubungi KLK: {klkPhone}
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


const VALID_TRANSITIONS: Record<string, string> = {
  'ACCEPTED': 'ARRIVED',
  'ARRIVED': 'IN_TRANSIT',
  'IN_TRANSIT': 'COMPLETED',
};

export function PolyRiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // SOS State
  const [sosJobId, setSosJobId] = useState<string | null>(null);
  const [klkPhone, setKlkPhone] = useState('');
  const [showRiderContactsSheet, setShowRiderContactsSheet] = useState(false);
  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'klk_emergency_phone').single()
      .then(({ data }) => {
        if (data?.value) {
          try { setKlkPhone(JSON.parse(data.value)); } catch { setKlkPhone(data.value); }
        }
      });
  }, []);

  // Registration State
  const [vehicleType, setVehicleType] = useState('MOTOR');
  const [plateNumber, setPlateNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard State
  const [jobs, setJobs] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [showEarningsSheet, setShowEarningsSheet] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'SEMUA' | 'LELAKI' | 'PEREMPUAN'>('SEMUA');

  // Bidding State
  const [biddingJobId, setBiddingJobId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [processingBidId, setProcessingBidId] = useState<string | null>(null);
  const [submittedBids, setSubmittedBids] = useState<Record<string, number>>({});
  const [expandedCarpool, setExpandedCarpool] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({}); // Indexed by job_id
  const [newMessages, setNewMessages] = useState<Record<string, string>>({}); // Indexed by job_id

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  // Refs for realtime listener
  const submittedBidsRef = useRef<Record<string, number>>({});
  const activeJobsRef = useRef<any[]>([]);

  useEffect(() => { submittedBidsRef.current = submittedBids; }, [submittedBids]);
  useEffect(() => { activeJobsRef.current = activeJobs; }, [activeJobs]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('polyrider_cancellations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polyrider_jobs', filter: "status=eq.CANCELLED" },
        (payload) => {
           if (submittedBidsRef.current[payload.new.id] !== undefined || activeJobsRef.current.some(j => j.id === payload.new.id)) {
              toast.error('⚠️ Peringatan: Seorang penumpang telah menarik diri atau membatalkan perjalanannya.');
           }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    
    const { data: bidsData } = await supabase
      .from('polyrider_bids')
      .select('job_id, bid_amount')
      .eq('rider_id', user.id)
      .eq('status', 'PENDING');
      
    const biddedJobMap: Record<string, number> = {};
    if (bidsData) {
      bidsData.forEach(b => { biddedJobMap[b.job_id] = Number(b.bid_amount); });
    }
    setSubmittedBids(biddedJobMap);

    const { data, error } = await supabase
      .from('polyrider_jobs')
      .select('id, student_id, passenger_gender, pickup_name, dropoff_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, proposed_price, job_type, distance_km, carpool_group_id, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setJobs(data);
    }
  }, [user?.id]);

  const checkActiveJobs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('polyrider_jobs')
      .select('*, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
      .eq('rider_id', user.id)
      .in('status', ['ACCEPTED', 'IN_TRANSIT', 'ARRIVED'])
      .order('created_at', { ascending: true });
    if (data) setActiveJobs(data);
  }, [user?.id]);

  const fetchTodayEarnings = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const { data } = await supabase.from('polyrider_jobs')
      .select('proposed_price').eq('rider_id', user.id)
      .eq('status', 'COMPLETED').gte('updated_at', today.toISOString());
    if (data) setTodayEarnings(data.reduce((s, j) => s + Number(j.proposed_price), 0));
  }, [user?.id]);

  // Consolidated poll — single interval for jobs, active trips, chat, earnings
  useEffect(() => {
    if (!profile?.is_active || profile?.status !== 'APPROVED') { setIsPolling(false); return; }
    const poll = async () => {
      // Run all fetches in parallel
      const [,activeJobsResult] = await Promise.all([
        fetchJobs(),
        supabase.from('polyrider_jobs')
          .select('*, student:profiles!polyrider_jobs_student_id_profiles_fkey(full_name)')
          .eq('rider_id', user!.id)
          .in('status', ['ACCEPTED', 'IN_TRANSIT', 'ARRIVED'])
          .order('created_at', { ascending: true }),
        fetchTodayEarnings(),
      ]);

      const latestActiveJobs = activeJobsResult?.data || [];
      setActiveJobs(latestActiveJobs);

      // Fetch chats using fresh active jobs list
      if (latestActiveJobs.length > 0) {
        const jobIds = latestActiveJobs.map((j: any) => j.id);
        const { data } = await supabase.from('polyrider_chats').select('*')
          .in('job_id', jobIds).order('created_at', { ascending: true });
        if (data) {
          const grouped = data.reduce((acc: any, msg: any) => {
            if (!acc[msg.job_id]) acc[msg.job_id] = [];
            acc[msg.job_id].push(msg);
            return acc;
          }, {} as Record<string, any[]>);
          setChatMessages(grouped);
        }
      }
    };
    poll();
    setIsPolling(true);
    
    // Switch to Realtime channels to eliminate aggressive polling
    const channel = supabase.channel(`rider_dashboard_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_jobs' }, poll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_bids' }, poll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polyrider_chats' }, poll)
      .subscribe();
      
    // Slower fallback interval (30s) in case of missed WebSocket messages
    const interval = setInterval(poll, 30000);
    
    return () => { 
      supabase.removeChannel(channel);
      clearInterval(interval); 
      setIsPolling(false); 
    };
  }, [profile?.is_active, profile?.status, fetchJobs, fetchTodayEarnings, user?.id, activeJobs.length]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('polyrider_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !receiptFile) {
      toast.error('Sila isi semua maklumat pendaftaran');
      return;
    }
    setIsSubmitting(true);
    try {
      const receipt_url = await uploadFileToDrive(receiptFile, 'polyrider-receipts');
      if (!receipt_url) throw new Error('Gagal muat naik resit');

      const { error } = await supabase.from('polyrider_profiles').insert({
        user_id: user!.id,
        vehicle_type: vehicleType,
        plate_number: plateNumber.toUpperCase(),
        receipt_url,
        status: 'PENDING'
      });
      if (error) throw error;
      toast.success('Pendaftaran berjaya dihantar untuk kelulusan!');
      fetchProfile();
    } catch (e: any) {
      toast.error(e.message || 'Ralat sistem. Cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async () => {
    if (!profile || !user) return;
    if (activeJobs.length > 0 && profile.is_active) {
      toast.error('Selesaikan semua trip aktif sebelum OFF-DUTY');
      return;
    }
    const newStatus = !profile.is_active;
    // Optimistic update
    setProfile({ ...profile, is_active: newStatus });
    if (!newStatus) setJobs([]);

    const { error } = await supabase
      .from('polyrider_profiles')
      .update({ is_active: newStatus })
      .eq('user_id', user.id); // ✅ gunakan user_id, bukan profile.id

    if (error) {
      // Revert on failure
      setProfile({ ...profile, is_active: !newStatus });
      toast.error('Gagal tukar status. Cuba lagi.');
    } else {
      toast.success(newStatus ? 'Anda kini ON-DUTY 🟢' : 'Anda kini OFF-DUTY 🔴');
    }
  };

  const submitBid = async (job: any, amount: number) => {
    if (!job || !job.id || amount < 1 || !user || processingBidId) return;
    setProcessingBidId(job.id);
    
    if (job.isGroupedCarpool) {
      const memberCount = job.carpoolMembers.length;
      
      // Calculate total original proposed price by all members
      const totalOriginalPrice = job.carpoolMembers.reduce((sum: number, m: any) => sum + Number(m.proposed_price || 0), 0);

      const insertPromises = job.carpoolMembers.map((m: any) => {
        // Fallback to equal split if something went wrong with proposed prices
        let splitAmount = amount / memberCount;
        
        if (totalOriginalPrice > 0) {
          const weight = Number(m.proposed_price || 0) / totalOriginalPrice;
          splitAmount = amount * weight;
        }

        // Round to 2 decimal places to avoid floating point issues
        splitAmount = Math.round(splitAmount * 100) / 100;

        return supabase.from('polyrider_bids').insert({
          job_id: m.id, rider_id: user.id, bid_amount: splitAmount, status: 'PENDING'
        });
      });

      const results = await Promise.all(insertPromises);
      const hasError = results.some(r => r.error);
      if (hasError) { toast.error('Gagal menghantar pecahan tawaran.'); setProcessingBidId(null); return; }
      
      toast.success('Bidaan pecahan berjaya dihantar kepada semua penumpang!');
      setBiddingJobId(null);
      setProcessingBidId(null);
      setSubmittedBids(prev => {
        const newBids = { ...prev };
        job.carpoolMembers.forEach((m: any) => {
          let splitAmt = amount / memberCount;
          if (totalOriginalPrice > 0) splitAmt = amount * (Number(m.proposed_price || 0) / totalOriginalPrice);
          newBids[m.id] = Math.round(splitAmt * 100) / 100;
        });
        return newBids;
      });
      
      const studentIds = job.carpoolMembers.map((m:any) => m.student_id).filter(Boolean);
      const { data: { session } } = await supabase.auth.getSession();
      
      // Instead of a single generic notification, we might want to notify them individually, 
      // but for simplicity, we'll send the generic notification for now since we don't have individual amounts in this loop scope easily for notifications unless we map again.
      // Wait, we can map again to trigger individual notifications.
      job.carpoolMembers.forEach((m: any) => {
        let splitAmount = amount / memberCount;
        if (totalOriginalPrice > 0) {
          const weight = Number(m.proposed_price || 0) / totalOriginalPrice;
          splitAmount = amount * weight;
        }
        if (m.student_id) {
          notifyUsers(
            session?.access_token ?? '',
            [m.student_id],
            '🤝 Bidaan Rider (Auto-Split)',
            `Rider meminta RM${amount.toFixed(2)} keseluruhan. Bahagian anda: RM${splitAmount.toFixed(2)}. Semak bidaan sekarang!`,
            { tag: 'polyrider-bid-received', url: '/polyrider' }
          );
        }
      });
    } else {
      const { error } = await supabase.from('polyrider_bids').insert({
        job_id: job.id, rider_id: user.id, bid_amount: amount, status: 'PENDING'
      });
      if (error) { toast.error('Gagal menghantar tawaran.'); setProcessingBidId(null); return; }
      toast.success('Tawaran berjaya dihantar!');
      setBiddingJobId(null);
      setProcessingBidId(null);
      setSubmittedBids(prev => ({ ...prev, [job.id]: amount }));
      if (job.student_id) {
        const { data: { session } } = await supabase.auth.getSession();
        notifyUsers(
          session?.access_token ?? '',
          [job.student_id],
          '🤝 Tawaran Bidaan Rider!',
          `Rider sedia mengambil anda dengan bayaran RM${amount.toFixed(2)}. Semak bidaan sekarang!`,
          { tag: 'polyrider-bid-received', url: '/polyrider' }
        );
      }
    }
  };

  const acceptAtProposedPrice = async (job: any) => {
    if (!user || processingBidId) return;
    setProcessingBidId(job.id);
    
    if (job.isGroupedCarpool) {
      const insertPromises = job.carpoolMembers.map((m: any) => 
        supabase.from('polyrider_bids').insert({
          job_id: m.id, rider_id: user.id, bid_amount: Number(m.proposed_price), status: 'PENDING'
        })
      );
      const results = await Promise.all(insertPromises);
      const hasError = results.some(r => r.error);
      setProcessingBidId(null);
      if (hasError) { toast.error('Gagal menghantar tawaran.'); return; }
      
      toast.success('Tawaran diterima untuk keseluruhan kumpulan!');
      setSubmittedBids(prev => {
        const newBids = { ...prev };
        job.carpoolMembers.forEach((m: any) => { newBids[m.id] = Number(m.proposed_price || 0); });
        return newBids;
      });
      
      const studentIds = job.carpoolMembers.map((m:any) => m.student_id).filter(Boolean);
      const { data: { session } } = await supabase.auth.getSession();
      notifyUsers(
        session?.access_token ?? '',
        studentIds,
        '🤝 Rider Terima Carpool!',
        `Rider sedia mengambil anda pada harga cadangan anda. Sahkan sekarang!`,
        { tag: 'polyrider-bid-received', url: '/polyrider' }
      );
    } else {
      const { error } = await supabase.from('polyrider_bids').insert({
        job_id: job.id, rider_id: user.id, bid_amount: Number(job.proposed_price), status: 'PENDING'
      });
      setProcessingBidId(null);
      if (!error) {
        toast.success('Tawaran pada harga yang dicadang dihantar!');
        setSubmittedBids(prev => ({ ...prev, [job.id]: Number(job.proposed_price || 0) }));
        if (job.student_id) {
          const { data: { session } } = await supabase.auth.getSession();
          notifyUsers(
            session?.access_token ?? '',
            [job.student_id],
            '🤝 Rider Terima Tawaran!',
            `Rider sedia mengambil anda pada harga cadangan anda. Sahkan sekarang!`,
            { tag: 'polyrider-bid-received', url: '/polyrider' }
          );
        }
      } else toast.error('Gagal hantar tawaran.');
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const job = activeJobs.find(j => j.id === jobId);
    if (!job || job.rider_id !== user?.id) { toast.error('Akses tidak dibenarkan.'); return; }
    if (VALID_TRANSITIONS[job.status] !== newStatus) { toast.error('Perubahan status tidak sah.'); return; }
    const { error } = await supabase.from('polyrider_jobs')
      .update({ status: newStatus }).eq('id', jobId).eq('rider_id', user!.id);
    if (!error) {
      checkActiveJobs();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const studentId = job.student_id;

      if (newStatus === 'ARRIVED') {
        toast.success('Pelajar dimaklumkan anda telah tiba!');
        if (studentId) notifyUsers(token, [studentId],
          '🛕 Rider Telah Tiba!',
          'Rider anda sudah sampai di lokasi pickup. Sila bergerak keluar sekarang.',
          { tag: 'polyrider-arrived', url: '/polyrider' }
        );
      }
      if (newStatus === 'IN_TRANSIT') {
        if (studentId) notifyUsers(token, [studentId],
          '🚴 Dalam Perjalanan!',
          'Perjalanan anda sedang berlangsung. Selamat sampai!',
          { tag: 'polyrider-transit', url: '/polyrider' }
        );
      }
      if (newStatus === 'COMPLETED') {
        toast.success('Tugasan Selesai! ✅');
        fetchTodayEarnings();
        if (studentId) notifyUsers(token, [studentId],
          '✅ Perjalanan Selesai!',
          'Anda telah selamat tiba di destinasi. Sila beri penilaian kepada rider anda.',
          { tag: 'polyrider-completed', url: '/polyrider' }
        );
      }
    }
  };

  const triggerSOS = async (jobId: string) => {
    // 1. Capture GPS
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch { /* GPS unavailable */ }

    // 2. Insert SOS log with GPS
    const { data: sosLog } = await supabase.from('polyrider_sos_logs').insert({
      job_id: jobId, triggered_by: user!.id, lat, lng,
    }).select('id').single();

    // 3. Update job status
    await supabase.from('polyrider_jobs').update({ status: 'EMERGENCY' }).eq('id', jobId);

    // 4. Blast push + email via server
    const job = activeJobs.find(j => j.id === jobId);
    const { data: riderProfile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/polyrider-sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          sosId: sosLog?.id,
          jobId,
          lat, lng,
          userName: job?.student?.full_name,
          riderName: riderProfile?.full_name,
          plateNumber: profile?.plate_number,
        }),
      });
    } catch (e) { console.error('[SOS-Rider] Backend alert failed:', e); }

    setSosJobId(null);
    toast.error('🚨 Isyarat SOS dihantar! KLK dimaklumkan.', { duration: 8000 });
    checkActiveJobs();
  };

  const sendMessage = async (e: React.FormEvent, jobId: string) => {
    e.preventDefault();
    const msg = newMessages[jobId];
    if (!msg || !msg.trim()) return;
    
    await supabase.from('polyrider_chats').insert({ job_id: jobId, sender_id: user!.id, message: msg.trim() });
    setNewMessages({ ...newMessages, [jobId]: '' });
  };

  if (loading) return null;

  // -------------------------------------------------------------
  // RENDER: Pendaftaran Belum Selesai
  // -------------------------------------------------------------
  if (!profile) {
    return (
      <div className="max-w-xl mx-auto pb-32 pt-8 px-4 flex flex-col min-h-screen">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Jadi PolyRider</h1>
          <p className="text-slate-500 dark:text-white/60 mt-2 font-medium">Jana pendapatan dengan menghantar pelajar, dokumen atau makanan di sekitar kampus.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 flex-1">
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider block mb-2">Jenis Kenderaan</label>
              <div className="grid grid-cols-2 gap-3">
                {['MOTOR', 'KERETA'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${vehicleType === type ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-slate-100 dark:border-white/10 text-slate-400 dark:text-white/40'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider block mb-2">No. Plat Kenderaan</label>
              <input
                type="text"
                required
                placeholder="Cth: CEH1234"
                className="w-full bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider block mb-2">Resit Yuran KLK (RM 3.00)</label>
              <div className="border-2 border-dashed border-slate-200 dark:border-white/20 rounded-xl p-6 text-center hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                <input
                  type="file"
                  required
                  accept="image/*,.pdf"
                  className="hidden"
                  id="receipt-upload"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-slate-400 dark:text-white/40 mb-2" />
                  <span className="text-sm font-bold text-amber-600">{receiptFile ? receiptFile.name : 'Muat Naik Resit'}</span>
                  <span className="text-xs text-slate-400 dark:text-white/40 mt-1">Sokongan JPG, PNG, PDF</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
            >
              {isSubmitting ? 'Menghantar...' : 'Hantar Permohonan'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Pendaftaran Belum Diluluskan
  // -------------------------------------------------------------
  if (profile.status === 'PENDING') {
    return (
      <div className="max-w-xl mx-auto pb-32 pt-16 px-4 min-h-[80vh] flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 border-8 border-white dark:border-zinc-950 shadow-xl dark:shadow-none rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Permohonan Diproses</h2>
        <p className="text-slate-500 dark:text-white/60 max-w-sm font-medium leading-relaxed">
          Pihak KLK sedang menyemak resit bayaran anda. Kelulusan biasanya mengambil masa kurang 24 jam bekerja.
        </p>
      </div>
    );
  }
  
  if (profile.status === 'REJECTED') {
    return (
      <div className="max-w-xl mx-auto pb-32 pt-16 px-4 min-h-[80vh] flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 border-8 border-white dark:border-zinc-950 shadow-xl dark:shadow-none rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Permohonan Ditolak</h2>
        <p className="text-slate-500 dark:text-white/60 max-w-sm font-medium leading-relaxed mb-6">
          Sila muat naik resit yang sah atau hubungi pihak pengurusan JPP / KLK untuk maklumat lanjut.
        </p>
        <button onClick={() => setProfile(null)} className="px-6 py-3 bg-slate-900 dark:bg-amber-500 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-amber-600">
          Buat Permohonan Baru
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Papan Pemuka Rider (APPROVED)
  // -------------------------------------------------------------
  return (
    <div className="max-w-xl mx-auto pb-32 pt-4 px-4 min-h-screen flex flex-col">
      <RiderSOSModal
        show={sosJobId !== null}
        klkPhone={klkPhone}
        onConfirm={() => sosJobId && triggerSOS(sosJobId)}
        onCancel={() => setSosJobId(null)}
      />
      <EarningsAnalyticsSheet 
        show={showEarningsSheet} 
        onClose={() => setShowEarningsSheet(false)} 
        userId={user?.id || ''} 
      />
      {showRiderContactsSheet && (
        <SOSContactsManager
          onClose={() => setShowRiderContactsSheet(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Papan Tugasan <Bike className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mt-1">
            Plat: {profile.plate_number}
          </p>
        </div>
        
        <button 
          onClick={toggleStatus}
          className={`px-4 py-2 rounded-full font-black text-xs tracking-wider transition-all flex items-center gap-2 ${profile.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-white dark:bg-zinc-900/10 text-slate-500 dark:text-white/50'}`}
        >
          <div className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-white dark:bg-zinc-900 animate-pulse' : 'bg-slate-400 dark:bg-white dark:bg-zinc-900/40'}`} />
          {profile.is_active ? 'ON-DUTY' : 'OFF-DUTY'}
        </button>
      </div>
      {/* Earnings Card */}
      {profile.is_active && (
        <button 
          onClick={() => setShowEarningsSheet(true)}
          className="w-full text-left bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-200/50 dark:bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Pendapatan Hari Ini</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300 leading-none">RM {todayEarnings.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600/50 dark:text-emerald-400/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Sejarah Penuh →
          </div>
        </button>
      )}

      {/* ACTIVE JOBS (CARPOOL) */}
      {activeJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Penumpang Semasa ({activeJobs.length}/3)</span>
            <button onClick={checkActiveJobs} className="text-[10px] font-black text-slate-400 dark:text-white/40 hover:text-amber-500 uppercase tracking-widest flex items-center gap-1 transition-colors">
              ↻ Refresh
            </button>
          </h2>
          <div className="space-y-6">
            {activeJobs.map((job, idx) => (
              <div key={job.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-1 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 relative z-10 flex flex-col">
                <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-[1.75rem] p-5 flex flex-col">
                  {/* Seat number badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/10 px-2 py-1 rounded-md">
                      Penumpang {idx + 1} / {activeJobs.length}
                    </span>
                    {job.carpool_group_id && (
                      <span className="text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-widest">Carpool</span>
                    )}
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md mb-2 inline-block">Penumpang {idx + 1}</span>
                      <p className="font-bold text-slate-900 dark:text-white">{job.student?.full_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Bayaran</p>
                      <p className="text-xl font-black text-amber-500">RM {Number(job.proposed_price).toFixed(2)}</p>
                    </div>
                  </div>

                  <RouteViewer
                    pickup={[job.pickup_lat, job.pickup_lng]}
                    dropoff={[job.dropoff_lat, job.dropoff_lng]}
                    pickupName={job.pickup_name}
                    dropoffName={job.dropoff_name}
                  />

                  {/* Chat System per job */}
                  <div className="flex-1 min-h-[150px] flex flex-col mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Chat Penumpang
                    </h3>
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-slate-100 dark:border-white/5 overflow-y-auto space-y-2 mb-2 max-h-[200px]">
                      {(!chatMessages[job.id] || chatMessages[job.id].length === 0) ? (
                        <p className="text-xs text-center text-slate-400 dark:text-white/40 mt-6">Berhubung dengan pelajar.</p>
                      ) : (
                        chatMessages[job.id].map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_id === user!.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs font-semibold ${msg.sender_id === user!.id ? 'bg-amber-500 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 rounded-tl-sm'}`}>
                              {msg.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={(e) => sendMessage(e, job.id)} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newMessages[job.id] || ''} 
                        onChange={e => setNewMessages({...newMessages, [job.id]: e.target.value})}
                        placeholder="Mesej..." 
                        className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                      />
                      <button type="submit" className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center justify-center shrink-0">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {job.status === 'ACCEPTED' && (
                      <button onClick={() => updateJobStatus(job.id, 'ARRIVED')} className="col-span-2 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5" /> Tiba di Pickup
                      </button>
                    )}
                    {job.status === 'ARRIVED' && (
                      <button onClick={() => updateJobStatus(job.id, 'IN_TRANSIT')} className="col-span-2 py-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center justify-center gap-2">
                        <Navigation className="w-5 h-5" /> Mula Perjalanan
                      </button>
                    )}
                    {job.status === 'IN_TRANSIT' && (
                      <button onClick={() => updateJobStatus(job.id, 'COMPLETED')} className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 font-bold rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Selesai & Terima Tunai
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => setSosJobId(job.id)} className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> Kecemasan (SOS)
                    </button>
                    <button onClick={() => setShowRiderContactsSheet(true)} className="w-full py-2 text-xs text-slate-400 dark:text-white/30 font-bold flex items-center justify-center gap-1.5">
                      <UserCircle className="w-3.5 h-3.5" /> Urus Kenalan Kecemasan SOS
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JOB BOARD (Only if max 3 jobs not reached) */}
      {activeJobs.length < 3 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Permintaan Terkini</h2>
            {isPolling && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>

          {!profile.is_active ? (
            <div className="bg-red-50/50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-[2rem] p-8 text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="w-20 h-20 bg-white dark:bg-zinc-900 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                <Bike className="w-10 h-10 text-slate-300 dark:text-white/20" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white dark:border-zinc-900 rounded-full"></div>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 relative z-10">
                Status OFF-DUTY
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/60 font-medium mb-8 max-w-[250px] mx-auto relative z-10 leading-relaxed">
                Anda tidak akan menerima sebarang order baru. Tekan butang di bawah untuk mula.
              </p>
              
              <button 
                onClick={toggleStatus}
                className="relative z-10 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-3 group"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                MULA ON-DUTY
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-[2rem] p-8 text-center flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
                  {/* Radar pulse effect */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 bg-emerald-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="absolute w-48 h-48 bg-emerald-500/10 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.5s' }} />
                  </div>
                  
                  <div className="w-16 h-16 bg-white dark:bg-zinc-900 shadow-xl border border-emerald-100 dark:border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <Navigation className="w-6 h-6 text-emerald-500 animate-pulse" />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2 relative z-10">
                    Sistem Sedang Mencari...
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/60 font-medium mb-8 max-w-[200px] mx-auto relative z-10">
                    Bila ada pesanan baru, ia akan dipaparkan di sini secara automatik.
                  </p>
                  
                  <div className="flex gap-3 relative z-10 w-full">
                    <button onClick={toggleStatus} className="flex-1 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Rehat (OFF)
                    </button>
                    <button onClick={checkActiveJobs} className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">
                      ↻ Segarkan
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Gender filter pills */}
                  <div className="flex gap-2 mb-4">
                    {(['SEMUA', 'LELAKI', 'PEREMPUAN'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setGenderFilter(f)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          genderFilter === f
                            ? f === 'LELAKI'
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                              : f === 'PEREMPUAN'
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {f === 'LELAKI' ? '♂ Lelaki' : f === 'PEREMPUAN' ? '♀ Perempuan' : '⊕ Semua'}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const groupedJobs = [];
                    const processedGroups = new Set();
                    for (const job of jobs) {
                      if (job.carpool_group_id) {
                        if (processedGroups.has(job.carpool_group_id)) continue;
                        processedGroups.add(job.carpool_group_id);
                        
                        const members = jobs.filter(j => j.carpool_group_id === job.carpool_group_id);
                        groupedJobs.push({
                          ...job,
                          isGroupedCarpool: true,
                          carpoolMembers: members,
                          total_proposed_price: members.reduce((sum, j) => sum + Number(j.proposed_price), 0),
                        });
                      } else {
                        groupedJobs.push(job);
                      }
                    }

                    const filteredJobs = groupedJobs.filter(job => {
                      if (genderFilter === 'SEMUA') return true;
                      if (job.isGroupedCarpool) {
                        return job.carpoolMembers.some((m: any) => m.passenger_gender === genderFilter);
                      }
                      return job.passenger_gender === genderFilter || !job.passenger_gender;
                    });

                    return filteredJobs.map(job => (
                  <div key={job.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    
                    {/* Maps Route Viewer */}
                    <div className="h-40 bg-slate-100 relative rounded-t-2xl overflow-hidden">
                      <RouteViewer
                        pickup={[job.pickup_lat, job.pickup_lng]}
                        dropoff={[job.dropoff_lat, job.dropoff_lng]}
                        pickupName={job.pickup_name}
                        dropoffName={job.dropoff_name}
                      />
                      {/* Fade gradient to separate map from content smoothly and hide Leaflet text */}
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent z-[1000] pointer-events-none" />
                    </div>

                    
                    <div className="p-4">
                      {/* Passenger info bar */}
                      {job.isGroupedCarpool ? (
                        <>
                          <div className="flex items-center justify-between mb-3 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-emerald-500" />
                              <div>
                                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Kumpulan Carpool</p>
                                <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70">{job.carpoolMembers.length} Penumpang Berkongsi</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setExpandedCarpool(expandedCarpool === job.id ? null : job.id)}
                              className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-200/50 dark:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors hover:bg-emerald-300/50 dark:hover:bg-emerald-500/30"
                            >
                              {expandedCarpool === job.id ? 'Tutup' : 'Lihat'}
                            </button>
                          </div>
                          
                          <AnimatePresence>
                            {expandedCarpool === job.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-3"
                              >
                                <div className="space-y-3 bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                  {job.carpoolMembers.map((member: any, i: number) => (
                                    <div key={member.id} className="flex flex-col gap-2 pb-3 border-b border-slate-200 dark:border-white/5 last:border-0 last:pb-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-white/30 w-3">{i+1}.</span>
                                        {member.passenger_gender ? (
                                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                            member.passenger_gender === 'LELAKI'
                                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                          }`}>
                                            {member.passenger_gender === 'LELAKI' ? '♂' : '♀'} {member.passenger_gender.charAt(0)}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-white/5 text-slate-400">∅</span>
                                        )}
                                        <span className="text-xs font-bold text-slate-700 dark:text-white/80 truncate flex-1">
                                          {member.student?.full_name ?? 'Pelajar'}
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-500">+RM{Number(member.proposed_price).toFixed(2)}</span>
                                      </div>
                                      
                                      {/* Destination Route (Pickup -> Dropoff) */}
                                      <div className="pl-6 flex flex-col gap-1.5 relative">
                                        <div className="absolute left-[28px] top-1.5 bottom-1.5 w-0.5 bg-slate-200 dark:bg-white/10" />
                                        <div className="flex items-start gap-2 relative z-10">
                                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-50 dark:ring-zinc-950 mt-0.5 shrink-0" />
                                          <p className="text-[10px] font-semibold text-slate-500 dark:text-white/50 leading-tight line-clamp-1">{member.pickup_name}</p>
                                        </div>
                                        <div className="flex items-start gap-2 relative z-10">
                                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-slate-50 dark:ring-zinc-950 mt-0.5 shrink-0" />
                                          <p className="text-[10px] font-semibold text-slate-500 dark:text-white/50 leading-tight line-clamp-1">{member.dropoff_name}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 mb-3">
                          {/* Gender badge */}
                          {job.passenger_gender ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              job.passenger_gender === 'LELAKI'
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {job.passenger_gender === 'LELAKI' ? '♂' : '♀'} {job.passenger_gender}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30">
                              ∅ Jantina Tiada
                            </span>
                          )}
                          {/* Passenger name */}
                          <span className="text-xs font-bold text-slate-600 dark:text-white/60 truncate">
                            {job.student?.full_name ?? 'Pelajar'}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-white dark:bg-zinc-900/5 flex items-center justify-center shrink-0 mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">Pickup</p>
                              <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{job.pickup_name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-rose-50 dark:bg-white dark:bg-zinc-900/5 flex items-center justify-center shrink-0 mt-0.5">
                              <MapPin className="w-3 h-3 text-rose-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">Dropoff</p>
                              <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{job.dropoff_name}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">
                            {job.isGroupedCarpool ? 'Jumlah Tawaran' : 'Tawaran'}
                          </p>
                          <p className="text-xl font-black text-emerald-500 mb-1">
                            RM {
                              (job.isGroupedCarpool && submittedBids[job.id] !== undefined)
                                ? job.carpoolMembers.reduce((sum: number, m: any) => sum + (submittedBids[m.id] || 0), 0).toFixed(2)
                                : (!job.isGroupedCarpool && submittedBids[job.id] !== undefined)
                                ? submittedBids[job.id].toFixed(2)
                                : Number(job.isGroupedCarpool ? job.total_proposed_price : job.proposed_price).toFixed(2)
                            }
                          </p>
                          {job.distance_km && <p className="text-xs font-bold text-slate-400 dark:text-white/40">{job.distance_km.toFixed(1)} km</p>}
                        </div>
                      </div>

                      {/* Bidding Controls */}
                      {submittedBids[job.id] !== undefined ? (
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                          <div className="flex-1 py-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center justify-center gap-2">
                            <Clock className="w-5 h-5" /> Menunggu Respons Pelajar...
                          </div>
                        </div>
                      ) : biddingJobId === job.id ? (
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2 items-center">
                          <input 
                            type="number" 
                            min="1" step="0.5"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Number(e.target.value))}
                            disabled={processingBidId === job.id}
                            className="flex-1 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white disabled:opacity-50"
                          />
                          <button onClick={() => setBiddingJobId(null)} disabled={processingBidId === job.id} className="p-3 bg-slate-100 dark:bg-white dark:bg-zinc-900/5 text-slate-500 dark:text-white/50 rounded-xl disabled:opacity-50">
                            <X className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => submitBid(job, bidAmount)} 
                            disabled={processingBidId === job.id}
                            className={`px-4 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${processingBidId === job.id ? 'bg-emerald-500/50 text-white cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'}`}
                          >
                            {processingBidId === job.id ? (
                              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                            ) : 'Hantar Bidaan'}
                          </button>
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                          <button 
                            onClick={() => { setBiddingJobId(job.id); setBidAmount(Number(job.isGroupedCarpool ? job.total_proposed_price : job.proposed_price)); }} 
                            disabled={processingBidId === job.id}
                            className="flex-1 py-3 bg-slate-100 dark:bg-white dark:bg-zinc-900/5 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-white dark:bg-zinc-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Bida Harga Lain
                          </button>
                          <button 
                            onClick={() => acceptAtProposedPrice(job)} 
                            disabled={processingBidId === job.id}
                            className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${processingBidId === job.id ? 'bg-emerald-500/50 text-white cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'}`}
                          >
                            {processingBidId === job.id ? (
                              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                            ) : `Terima RM${Number(job.isGroupedCarpool ? job.total_proposed_price : job.proposed_price).toFixed(2)}`}
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                ))})()}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// EARNINGS ANALYTICS SHEET
// -------------------------------------------------------
interface EarningsAnalyticsSheetProps { show: boolean; onClose: () => void; userId: string; }
function EarningsAnalyticsSheet({ show, onClose, userId }: EarningsAnalyticsSheetProps) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);

  useEffect(() => {
    if (!show || !userId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('polyrider_jobs')
        .select('id, pickup_name, dropoff_name, proposed_price, created_at')
        .eq('rider_id', userId)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (data) {
        setJobs(data);
        const now = new Date();
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        const weeklyTotal = data.filter(j => new Date(j.created_at) >= weekAgo).reduce((acc, curr) => acc + Number(curr.proposed_price), 0);
        
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthlyTotal = data.filter(j => {
          const d = new Date(j.created_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((acc, curr) => acc + Number(curr.proposed_price), 0);

        setWeeklyEarnings(weeklyTotal);
        setMonthlyEarnings(monthlyTotal);
      }
      setLoading(false);
    };
    fetchData();
  }, [show, userId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end"
          onClick={onClose}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-t-[2rem] w-full max-w-xl mx-auto flex flex-col shadow-2xl h-[85vh]">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Analitik Pendapatan</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-1">Sejarah Penuh</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white dark:bg-zinc-900/10 text-slate-500 dark:text-white/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memuat Turun...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Minggu Ini</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">RM {weeklyEarnings.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Bulan Ini</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">RM {monthlyEarnings.toFixed(2)}</p>
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-500" /> Sejarah Perjalanan
                  </h3>
                  {jobs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                      <p className="text-sm font-bold text-slate-400 dark:text-white/30">Tiada sejarah perjalanan lagi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map(job => (
                        <div key={job.id} className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 mb-1">
                              {new Date(job.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{job.pickup_name} → {job.dropoff_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-emerald-500">+RM {Number(job.proposed_price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
