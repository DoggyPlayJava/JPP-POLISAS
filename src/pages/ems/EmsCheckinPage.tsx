import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  Clock,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Building2,
  Tag,
  Mail,
  User,
  ShieldCheck,
  Check,
  X,
  Filter,
  Flame,
  Award,
  Hash,
  Send,
} from 'lucide-react';
import { fetchEmsEventById, checkinEmsParticipant, EmsEventDetail } from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import type { EmsParticipant } from '@/types';

// Web Audio API beep sound generator for scan feedback
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio Context blocked or unavailable
  }
}

function playWarningChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio Context blocked
  }
}

export function EmsCheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // Data states
  const [eventDetail, setEventDetail] = useState<EmsEventDetail | null>(null);
  const [participants, setParticipants] = useState<EmsParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanner & Mode states
  const [mode, setMode] = useState<'SCANNER' | 'MANUAL'>('SCANNER');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Manual search tab states
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Scan Feedback Card state
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'DUPLICATE' | 'ERROR';
    participant?: EmsParticipant;
    message?: string;
    timestamp?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Load Event & Participants Data
  const loadEventData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const detail = await fetchEmsEventById(eventId);
      if (!detail) {
        toast.error('Acara tidak dijumpai');
        navigate('/ems/dashboard');
        return;
      }
      setEventDetail(detail);
      setParticipants(detail.participants || []);
    } catch (err: any) {
      toast.error(`Gagal memuatkan acara: ${err?.message || 'Ralat'}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Supabase Realtime Subscription for Live Updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`ems-checkin-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ems_participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as EmsParticipant;
            setParticipants((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as EmsParticipant;
            setParticipants((prev) => [inserted, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Statistics calculation
  const totalRegistered = participants.length;
  const checkedInCount = useMemo(
    () => participants.filter((p) => p.is_checked_in).length,
    [participants]
  );
  const pendingCount = totalRegistered - checkedInCount;
  const percentageAttendance = totalRegistered
    ? Math.round((checkedInCount / totalRegistered) * 100)
    : 0;

  // Categories list for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [participants]);

  // Core Check-In Handler
  const processCheckin = async (scannedValue: string) => {
    if (!eventId || isProcessingRef.current) return;
    const cleanInput = scannedValue.trim();
    if (!cleanInput) return;

    isProcessingRef.current = true;

    // Parse JSON payload or raw string
    let searchKey = cleanInput;
    try {
      const parsed = JSON.parse(cleanInput);
      searchKey = parsed.id || parsed.matrix_no || parsed.email || cleanInput;
    } catch {
      // keep cleanInput
    }

    // Look up participant in local memory first for instant duplicate check
    const existing = participants.find(
      (p) =>
        p.id === searchKey ||
        (p.matrix_no && p.matrix_no.toLowerCase() === searchKey.toLowerCase()) ||
        (p.email && p.email.toLowerCase() === searchKey.toLowerCase()) ||
        (p.booth_no && p.booth_no.toLowerCase() === searchKey.toLowerCase())
    );

    const formatTimeStr = (isoStr?: string | null) => {
      if (!isoStr) return 'Masa tidak dinyatakan';
      return new Date(isoStr).toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    // Prevent duplicate check-in if already checked in
    if (existing && existing.is_checked_in) {
      const timeBadge = formatTimeStr(existing.checked_in_at);
      if (soundEnabled) playWarningChime();
      setScanResult({
        status: 'DUPLICATE',
        participant: existing,
        message: `Telah Disahkan Kehadiran pada ${timeBadge}`,
        timestamp: timeBadge,
      });
      toast.error(`Peserta "${existing.leader_name}" telah pun mendaftar masuk pada ${timeBadge}`, {
        icon: '⚠️',
      });

      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
      return;
    }

    // Call backend service
    try {
      const updatedParticipant = await checkinEmsParticipant(eventId, searchKey);
      const timeBadge = formatTimeStr(updatedParticipant.checked_in_at);

      // Update local state
      setParticipants((prev) =>
        prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
      );

      if (soundEnabled) playSuccessChime();

      setScanResult({
        status: 'SUCCESS',
        participant: updatedParticipant,
        message: 'Pengesahan Kehadiran Berjaya!',
        timestamp: timeBadge,
      });

      toast.success(`Berjaya! Kehadiran disahkan: ${updatedParticipant.leader_name}`);
    } catch (err: any) {
      setScanResult({
        status: 'ERROR',
        message: err?.message || 'Peserta tidak dijumpai atau ralat sistem.',
      });
      toast.error(err?.message || 'Ralat pengesahan');
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  // Camera QR Scanner control
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop warning:', err);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    const element = document.getElementById('ems-qr-reader');
    if (!element) return;

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5Qr = new Html5Qrcode('ems-qr-reader');
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          processCheckin(decodedText);
        },
        () => {
          // ignore scan frame misses
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        'Tidak dapat mengaktifkan kamera. Sila pastikan kebenaran kamera diberikan atau gunakan carian manual.'
      );
      setIsCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'SCANNER' && !loading) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode, loading, startCamera, stopCamera]);

  // Manual Check-In Click Handler
  const handleManualCheckin = async (participant: EmsParticipant) => {
    setActionLoadingId(participant.id);
    try {
      await processCheckin(participant.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered List for Table & Search
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Status filter
      if (statusFilter === 'CHECKED_IN' && !p.is_checked_in) return false;
      if (statusFilter === 'PENDING' && p.is_checked_in) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && p.category_name !== categoryFilter) return false;

      // Query filter
      if (!manualSearchQuery.trim()) return true;
      const q = manualSearchQuery.toLowerCase();
      const nameMatch = p.leader_name?.toLowerCase().includes(q);
      const matrixMatch = p.matrix_no?.toLowerCase().includes(q);
      const teamMatch = p.team_name?.toLowerCase().includes(q);
      const boothMatch = p.booth_no?.toLowerCase().includes(q);
      const emailMatch = p.email?.toLowerCase().includes(q);
      const idMatch = p.id?.toLowerCase().includes(q);

      return nameMatch || matrixMatch || teamMatch || boothMatch || emailMatch || idMatch;
    });
  }, [participants, statusFilter, categoryFilter, manualSearchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-300 font-medium animate-pulse">Memuatkan Portal Pengesahan Kehadiran EMS...</p>
      </div>
    );
  }

  if (!eventDetail) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-100">Acara tidak dijumpai</h2>
        <p className="text-slate-400 text-sm mt-1 mb-6">Pautan tidak sah atau acara telah dipadamkan.</p>
        <Link
          to="/ems/dashboard"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
        >
          Kembali ke Dashboard EMS
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-28 md:pb-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Top Header Navigation & Title ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ems/dashboard')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Kembali ke Dashboard EMS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                PORTAL URUS SETIA / CREW
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {eventDetail.entity_mode === 'TEAM' || eventDetail.entity_mode === 'EXHIBITION' ? 'PORTAL PASUKAN' : 'PORTAL INDIVIDU'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
              {eventDetail.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5 flex items-center gap-3">
              <span>📍 {eventDetail.venue || 'Lokasi tidak ditetapkan'}</span>
              <span>📅 {eventDetail.event_date ? new Date(eventDetail.event_date).toLocaleDateString('ms-MY') : 'Tarikh -'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-medium ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Bunyi Imbasan"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}</span>
          </button>

          <button
            onClick={loadEventData}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2 text-xs font-medium"
            title="Muat Semula Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Real-Time Header Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Registered */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 md:p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendaftaran</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-white">{totalRegistered}</span>
            <span className="text-xs text-slate-500 ml-1.5">peserta</span>
          </div>
        </div>

        {/* Checked-In Count */}
        <div className="bg-slate-900/90 border border-emerald-500/20 p-4 md:p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Disahkan Hadir</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">{checkedInCount}</span>
            <span className="text-xs text-emerald-500/70 ml-1.5">peserta</span>
          </div>
        </div>

        {/* Attendance Percentage */}
        <div className="bg-slate-900/90 border border-purple-500/20 p-4 md:p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Peratus Kehadiran</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-2xl md:text-3xl font-extrabold text-purple-300">{percentageAttendance}%</span>
            <div className="ml-3 flex-1 bg-slate-800 h-2 rounded-full overflow-hidden max-w-[80px]">
              <div
                className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentageAttendance}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending Count */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 md:p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Belum Hadir</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-amber-400">{pendingCount}</span>
            <span className="text-xs text-slate-500 ml-1.5">peserta</span>
          </div>
        </div>
      </div>

      {/* ── Mode Switcher & Portal Main Body ── */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-6 rounded-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('SCANNER')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs md:text-sm transition-all ${
                mode === 'SCANNER'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Mode 1: Pengimbas QR Kamera</span>
            </button>

            <button
              onClick={() => setMode('MANUAL')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs md:text-sm transition-all ${
                mode === 'MANUAL'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Mode 2: Carian Manual</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kamera &amp; Pangkalan Data Terhubung</span>
          </div>
        </div>

        {/* ── MODE 1: CAMERA QR SCANNER ── */}
        {mode === 'SCANNER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Camera Video Feed */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Kamera Pengimbas QR Active
                  </span>
                  <span>Sudut Imbasan Optimum</span>
                </div>

                {/* HTML5 QR Code Render Target */}
                <div className="w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800 relative min-h-[280px] flex items-center justify-center">
                  <div id="ems-qr-reader" className="w-full aspect-square max-w-sm mx-auto" />

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
                      <CameraOff className="w-12 h-12 text-rose-500 mb-3" />
                      <p className="text-rose-400 text-sm font-semibold mb-2">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Cuba Aktifkan Semula Kamera
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between w-full mt-3 px-1 text-xs">
                  <button
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-all"
                  >
                    {isCameraActive ? (
                      <>
                        <CameraOff className="w-4 h-4 text-amber-400" />
                        <span>Hentikan Kamera</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>Buka Kamera</span>
                      </>
                    )}
                  </button>

                  <span className="text-slate-500">Acuan Kod QR Peserta EMS</span>
                </div>
              </div>

              {/* Quick Input Fallback below camera */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Kod QR / No. Matrik / ID Peserta (Imbasan Barcode Gun / Manual)
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualCodeInput) {
                      processCheckin(manualCodeInput);
                      setManualCodeInput('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="Imbas barcode atau taip ID / Matrix No..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Sahkan</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Instant Scan Result Toast / Card */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Status Keputusan Imbasan Terbaru
              </h3>

              {!scanResult ? (
                <div className="bg-slate-950/60 border border-slate-800 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <QrCode className="w-16 h-16 text-slate-700 mb-3 animate-pulse" />
                  <p className="text-slate-300 font-semibold text-base">Sedia Untuk Imbasan</p>
                  <p className="text-slate-500 text-xs mt-1 max-w-xs">
                    Halakan kamera ke Kod QR peserta pada pas fizikal atau telefon pintar.
                  </p>
                </div>
              ) : scanResult.status === 'SUCCESS' && scanResult.participant ? (
                /* Instant Success Card */
                <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>DISAHKAN KEHADIRAN</span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-mono font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Nama Ketua / Peserta</span>
                      <p className="text-xl font-extrabold text-white mt-0.5">{scanResult.participant.leader_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {scanResult.participant.team_name && (
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[11px] text-slate-400 block font-medium">Nama Pasukan / Projek</span>
                          <p className="text-sm font-bold text-emerald-300 mt-0.5">{scanResult.participant.team_name}</p>
                        </div>
                      )}

                      {scanResult.participant.booth_no && (
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[11px] text-slate-400 block font-medium">No. Booth / Gerai</span>
                          <p className="text-sm font-bold text-amber-400 mt-0.5">{scanResult.participant.booth_no}</p>
                        </div>
                      )}

                      {scanResult.participant.category_name && (
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[11px] text-slate-400 block font-medium">Kategori Pertandingan</span>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">{scanResult.participant.category_name}</p>
                        </div>
                      )}

                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">No. Matrik / ID</span>
                        <p className="text-sm font-mono text-slate-300 mt-0.5">{scanResult.participant.matrix_no || scanResult.participant.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setScanResult(null)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Imbas Peserta Seterusnya</span>
                  </button>
                </div>
              ) : scanResult.status === 'DUPLICATE' && scanResult.participant ? (
                /* Duplicate Alert Card */
                <div className="bg-gradient-to-br from-amber-950/90 to-slate-900 border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                      <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
                      <span>TELAH DISAHKAN KEHADIRAN</span>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-mono font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-200 text-xs font-medium">
                    ⚠️ Amaran: Peserta ini telah pun mengesahkan kehadiran. Rekod asal kekal selamat.
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Nama Ketua / Peserta</span>
                      <p className="text-lg font-bold text-white mt-0.5">{scanResult.participant.leader_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {scanResult.participant.team_name && (
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Pasukan</span>
                          <p className="text-xs font-bold text-slate-200">{scanResult.participant.team_name}</p>
                        </div>
                      )}
                      {scanResult.participant.booth_no && (
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Booth</span>
                          <p className="text-xs font-bold text-amber-400">{scanResult.participant.booth_no}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setScanResult(null)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Faham &amp; Imbas Semula</span>
                  </button>
                </div>
              ) : (
                /* Error Card */
                <div className="bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                    <X className="w-6 h-6 text-rose-400" />
                    <span>Gagal Mengesahkan Kehadiran</span>
                  </div>
                  <p className="text-xs text-rose-200">{scanResult.message}</p>
                  <button
                    onClick={() => setScanResult(null)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Cuba Lagi
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODE 2: MANUAL SEARCH & CHECK-IN ── */}
        {mode === 'MANUAL' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search input box */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  placeholder="Cari No. Matrik, Pas Serial, Nama, Booth, atau Emel..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {manualSearchQuery && (
                  <button
                    onClick={() => setManualSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Status Kehadiran</option>
                  <option value="PENDING">⏳ Belum Hadir (Pending)</option>
                  <option value="CHECKED_IN">✅ Disahkan Hadir</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="md:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Menunjukkan {filteredParticipants.length} daripada {participants.length} peserta</span>
              {manualSearchQuery && <span>Penapis carian aktif: "{manualSearchQuery}"</span>}
            </div>
          </div>
        )}

        {/* ── LIVE ATTENDANCE LIST TABLE / CARDS ── */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Senarai Kehadiran Peserta Live
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Kemaskini Masa-Nyata (Supabase Realtime)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Peserta / Ketua</th>
                  <th className="p-3.5">Pasukan / Booth</th>
                  <th className="p-3.5">No. Matrik / Email</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Masa Hadir</th>
                  <th className="p-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Tiada peserta dijumpai mengikut penapis semasa.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-900/80 transition-all ${
                        p.is_checked_in ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Status Badge */}
                      <td className="p-3.5">
                        {p.is_checked_in ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Disahkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            Belum Hadir
                          </span>
                        )}
                      </td>

                      {/* Participant / Leader Name */}
                      <td className="p-3.5 font-semibold text-white">
                        {p.leader_name}
                      </td>

                      {/* Team / Booth */}
                      <td className="p-3.5">
                        {p.team_name ? (
                          <div className="font-semibold text-emerald-300">{p.team_name}</div>
                        ) : null}
                        {p.booth_no ? (
                          <span className="inline-block mt-0.5 text-[11px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20">
                            Booth {p.booth_no}
                          </span>
                        ) : !p.team_name ? (
                          <span className="text-slate-500">-</span>
                        ) : null}
                      </td>

                      {/* Matrix / Email */}
                      <td className="p-3.5 font-mono text-slate-400">
                        {p.matrix_no || p.email || p.id.slice(0, 8)}
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-slate-400">
                        {p.category_name || '-'}
                      </td>

                      {/* Time Checked-in badge */}
                      <td className="p-3.5 font-mono">
                        {p.is_checked_in && p.checked_in_at ? (
                          <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                            {new Date(p.checked_in_at).toLocaleTimeString('ms-MY', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="p-3.5 text-right">
                        {p.is_checked_in ? (
                          <span className="text-xs text-slate-500 font-medium">Telah Hadir</span>
                        ) : (
                          <button
                            onClick={() => handleManualCheckin(p)}
                            disabled={actionLoadingId === p.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ml-auto"
                          >
                            {actionLoadingId === p.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Sahkan Kehadiran</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
