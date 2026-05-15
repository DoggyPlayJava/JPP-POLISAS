import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  QrCode, CheckCircle, XCircle, Clock, Loader2,
  Star, Zap, AlertCircle, ScanLine, ArrowLeft,
  MapPin, KeyRound, RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';

const THEME = '#818CF8';

// --- Haversine Distance Helper ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ─── QR Scan Landing (route: /akademik/qr/:token) ────────────
export function AkademikQrScan() {
  const { token }   = useParams<{ token: string }>();
  const navigate    = useNavigate();
  const { profile } = useAuth();

  const [tokenData, setTokenData] = useState<any>(null);
  const [status, setStatus]       = useState<'loading' | 'ready' | 'scanning' | 'success' | 'error' | 'cooldown' | 'expired' | 'invalid' | 'outside_window' | 'pin_required'>('loading');
  const [meritAwarded, setMeritAwarded] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState('');
  const [errorMsg, setErrorMsg]         = useState('');
  const [windowMsg, setWindowMsg]       = useState('');
  
  const [pinInput, setPinInput]         = useState('');
  const [pinError, setPinError]         = useState(false);
  const [scanLocation, setScanLocation] = useState<any>(null);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabase
      .from('akademik_qr_tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setStatus('invalid'); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        if (data.max_scans_total && data.current_scans_total >= data.max_scans_total) { setStatus('expired'); return; }
        setTokenData(data);
        setStatus('ready');
      });
  }, [token]);

  const initiateScan = () => {
    if (!tokenData) return;
    
    // If admin set a location and PIN, try GPS first
    if (tokenData.location_lat && tokenData.location_lng && tokenData.verification_pin) {
      if (!navigator.geolocation) {
        toast.error("GPS tidak disokong pada peranti anda. Sila guna PIN.");
        setStatus('pin_required');
        return;
      }
      
      setStatus('scanning');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setScanLocation(coords);
          
          const dist = calculateDistance(tokenData.location_lat, tokenData.location_lng, coords.lat, coords.lng);
          const radius = tokenData.radius_meters || 150;
          
          if (dist > radius) {
            toast.error(`Anda dikesan ${Math.round(dist)}m dari lokasi majlis (Luar radius ${radius}m). Sila masukkan PIN di skrin.`);
            setStatus('pin_required');
          } else {
            processScan('GPS', coords);
          }
        },
        (err) => {
          console.error("GPS Error:", err);
          toast.error("Gagal mendapatkan lokasi GPS. Sila masukkan kod PIN.");
          setStatus('pin_required');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (tokenData.verification_pin) {
      // Only PIN required (no location set)
      setStatus('pin_required');
    } else {
      // No verification required (legacy token or simple QR)
      setStatus('scanning');
      processScan('NO_VERIFICATION', null);
    }
  };

  const submitPin = () => {
    if (!pinInput || pinInput !== tokenData.verification_pin) {
      setPinError(true);
      toast.error('PIN tidak tepat!');
      return;
    }
    setPinError(false);
    setStatus('scanning');
    processScan('PIN', scanLocation);
  };

  const processScan = async (verifyMethod: string, coords?: any) => {
    if (!tokenData || !profile?.id) return;
    
    try {
      // ─── Time Window Check ───────────────────────────────────────
      if (tokenData.available_from && tokenData.available_until) {
        const nowMY = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        const hh = nowMY.getHours();
        const mm = nowMY.getMinutes();
        const nowMins = hh * 60 + mm;
        const parseTimeMins = (t: string) => {
          const [h, mStr] = t.split(':');
          return parseInt(h) * 60 + parseInt(mStr || '0');
        };
        const fromMins  = parseTimeMins(tokenData.available_from);
        const untilMins = parseTimeMins(tokenData.available_until);
        if (nowMins < fromMins || nowMins > untilMins) {
          const fmt = (t: string) => {
            const [h, mStr] = t.split(':');
            const hr = parseInt(h); const m = mStr || '00';
            return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`;
          };
          setWindowMsg(`QR ini hanya aktif dari ${fmt(tokenData.available_from)} hingga ${fmt(tokenData.available_until)}`);
          setStatus('outside_window');
          return;
        }
      }

      const cooldownMs = (tokenData.cooldown_hours || 8) * 60 * 60 * 1000;
      const since = new Date(Date.now() - cooldownMs).toISOString();

      const { data: recentScans } = await supabase
        .from('akademik_qr_scans')
        .select('scanned_at')
        .eq('token_id', tokenData.id)
        .eq('user_id', profile.id)
        .gte('scanned_at', since)
        .limit(1);

      if (recentScans && recentScans.length > 0) {
        const lastScan    = new Date(recentScans[0].scanned_at);
        const nextAllowed = new Date(lastScan.getTime() + cooldownMs);
        const diff        = nextAllowed.getTime() - Date.now();
        const hrs         = Math.floor(diff / 3600000);
        const mins        = Math.floor((diff % 3600000) / 60000);
        setCooldownLeft(hrs > 0 ? `${hrs}j ${mins}m` : `${mins} minit`);
        setStatus('cooldown');
        return;
      }

      // Insert scan
      const { error: scanErr } = await supabase.from('akademik_qr_scans').insert({
        token_id:      tokenData.id,
        user_id:       profile.id,
        merit_awarded: tokenData.merit_value,
        scan_location: coords || null,
        verification_method: verifyMethod
      });
      if (scanErr) throw scanErr;

      // Update scan count atomically via optimistic locking
      await supabase
        .from('akademik_qr_tokens')
        .update({ current_scans_total: (tokenData.current_scans_total || 0) + 1 })
        .eq('id', tokenData.id)
        .eq('current_scans_total', tokenData.current_scans_total || 0);

      // Add merit transaction
      await supabase.from('merit_transactions').insert({
        user_id:    profile.id,
        club_id:    null,
        points:     tokenData.merit_value,
        reason:     `QR Merit: ${tokenData.title}`,
        actor_name: 'Sistem QR',
        source:     'QR_SCAN',
        reference_id: tokenData.id,
        scan_location: coords || null,
      });

      // Update profiles.merit
      await supabase.rpc('increment_merit_by_source', { p_uid: profile.id, p_delta: tokenData.merit_value, p_src: 'QR_SCAN' });

      setMeritAwarded(tokenData.merit_value);
      setStatus('success');
      toast.success(`+${tokenData.merit_value} merit berjaya diterima!`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Ralat semasa memproses data.');
      setStatus('error');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-white/30" />
            <p className="text-xs font-black uppercase tracking-widest text-white/30">Memuatkan...</p>
          </div>
        );

      case 'invalid':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-black text-white">QR Tidak Sah</h2>
            <p className="text-xs text-white/40">Kod QR ini tidak wujud atau sudah ditarik balik.</p>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-black text-white">QR Tamat Tempoh</h2>
            <p className="text-xs text-white/40">Kod QR ini sudah tamat tempoh atau telah mencapai had scan.</p>
          </div>
        );

      case 'outside_window':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Clock className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-black text-white">Di Luar Waktu Aktif</h2>
            <p className="text-sm font-bold text-violet-300">{windowMsg}</p>
            <p className="text-xs text-white/40">Sila scan dalam tempoh yang ditetapkan.</p>
            <button
              onClick={() => setStatus('ready')}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white/[0.06] border border-white/[0.1] text-white/50 hover:text-white transition-all"
            >
              Cuba Semula
            </button>
          </div>
        );

      case 'cooldown':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-black text-white">Cooldown Aktif</h2>
            <p className="text-sm font-bold text-amber-300">Boleh scan semula dalam: <span className="font-black">{cooldownLeft}</span></p>
            <p className="text-xs text-white/40">
              Anda perlu tunggu {tokenData?.cooldown_hours || 8} jam sebelum scan semula QR ini.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: hexToRgba('#10B981', 0.2), border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-black text-white">Merit Diterima!</h2>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-current text-amber-400" />
              <span className="text-3xl font-black text-amber-300">+{meritAwarded}</span>
              <span className="text-sm font-black text-white/40">merit</span>
            </div>
            <p className="text-xs text-white/40">{tokenData?.title}</p>
            <button
              onClick={() => navigate('/akademik')}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/[0.06] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard Akademik
            </button>
          </div>
        );

      case 'pin_required':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Pengesahan PIN</h2>
              <p className="text-xs text-white/40 mt-1">Sila masukkan kod PIN 4 digit yang ditayangkan di skrin dewan.</p>
            </div>
            
            <input 
              type="text"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0 0 0 0"
              className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-2xl outline-none transition-all ${
                pinError ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/[0.04] border-white/10 text-white focus:border-white/30'
              } border`}
            />

            <div className="flex gap-2 w-full">
              <button
                onClick={() => setStatus('ready')}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/[0.06] border border-white/[0.1] text-white/50 hover:text-white transition-all"
              >
                Batal
              </button>
              <button
                onClick={submitPin}
                disabled={pinInput.length !== 4}
                className="flex-[2] py-3 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all"
                style={{ background: THEME, color: '#fff' }}
              >
                Sahkan
              </button>
            </div>
          </motion.div>
        );

      case 'ready':
      case 'scanning':
        return (
          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: hexToRgba(THEME, 0.18), border: `1px solid ${hexToRgba(THEME, 0.3)}`, color: THEME, boxShadow: `0 0 40px ${hexToRgba(THEME, 0.2)}` }}
            >
              <QrCode className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">{tokenData?.title}</h2>
              {tokenData?.description && <p className="text-xs text-white/40">{tokenData.description}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
                style={{ background: '#F59E0B15', borderColor: '#F59E0B30', color: '#F59E0B' }}
              >
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-black">+{tokenData?.merit_value} Merit</span>
              </div>
              {tokenData?.location_lat && (
                 <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                   <MapPin className="w-3.5 h-3.5" />
                   <span className="text-[10px] font-black uppercase">Dilindungi GPS</span>
                 </div>
              )}
            </div>
            <p className="text-[10px] text-white/25 font-medium">
              Cooldown {tokenData?.cooldown_hours || 8} jam • Scan sah untuk {profile?.full_name?.split(' ')[0]}
            </p>
            <button
              onClick={initiateScan}
              disabled={status === 'scanning'}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
              style={{ background: THEME, color: '#fff', boxShadow: `0 12px 30px ${hexToRgba(THEME, 0.35)}` }}
            >
              {status === 'scanning' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              {status === 'scanning' ? 'Memproses Lokasi...' : 'Claim Merit'}
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-black text-white">Ralat</h2>
            <p className="text-xs text-rose-400/80">{errorMsg}</p>
            <button onClick={() => setStatus('ready')} className="text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
              Cuba Semula
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full blur-3xl opacity-[0.07]" style={{ background: THEME }} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 space-y-6"
      >
        {/* Badge */}
        <div className="flex justify-center">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border text-white/30 border-white/[0.08] bg-white/[0.03]">
            JPP POLISAS · Merit QR
          </span>
        </div>
        {renderContent()}
      </motion.div>
    </div>
  );
}

// ─── QR Manager (dalam admin dashboard) ──────────────────────
export function QrMeritManager({ themeColor = THEME }: { themeColor?: string }) {
  const { profile, isSuperAdmin } = useAuth();
  const [tokens, setTokens]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();
  
  const [form, setForm]         = useState({
    title: '', description: '', merit_value: 2, cooldown_hours: 8,
    expires_at: '', max_scans_total: '', category: 'KEHADIRAN',
    available_from: '', available_until: '',
    location_lat: '', location_lng: '', radius_meters: 150,
    verification_pin: generatePin(),
    use_gps: false
  });
  
  const [creating, setCreating] = useState(false);
  const [qrUrls, setQrUrls]     = useState<Record<string, string>>({});

  // Use VITE_APP_URL for production, fallback to current origin
  const BASE_URL = ((import.meta as any).env?.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
    || window.location.origin;
  const isLocalhost = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

  const load = useCallback(async () => {
    setLoading(true);
    
    // Auto-garbage collect tokens expired more than 1 day ago
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('akademik_qr_tokens').delete().lt('expires_at', yesterday);

    const { data, error } = await supabase
      .from('akademik_qr_tokens')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) console.error('[qr] load error:', error.message);
    setTokens(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteToken = async (id: string) => {
    if (!window.confirm('Padam token QR ini secara kekal?')) return;
    const { error } = await supabase.from('akademik_qr_tokens').delete().eq('id', id);
    if (!error) {
      toast.success('Token berjaya dipadam.');
      setTokens(prev => prev.filter(t => t.id !== id));
    } else {
      toast.error('Gagal memadam token.');
    }
  };

  const regeneratePin = async (id: string) => {
    const newPin = generatePin();
    const { error } = await supabase.from('akademik_qr_tokens').update({ verification_pin: newPin }).eq('id', id);
    if (!error) {
      toast.success('PIN baharu dijana!');
      setTokens(prev => prev.map(t => t.id === id ? { ...t, verification_pin: newPin } : t));
    }
  };

  // Generate QR images for each token
  useEffect(() => {
    tokens.forEach(async (t) => {
      if (qrUrls[t.id]) return;
      if (!t.token) return; // skip if no token UUID
      const url = `${BASE_URL}/akademik/qr/${t.token}`;
      try {
        const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#FFFFFF', light: '#0F172A' } });
        setQrUrls(prev => ({ ...prev, [t.id]: dataUrl }));
      } catch {}
    });
  }, [tokens]);

  const handleCreate = async () => {
    if (!form.title) { toast.error('Tajuk diperlukan.'); return; }
    if (form.use_gps && (!form.location_lat || !form.location_lng)) {
      toast.error('Sila isi koordinat iMaps jika guna perlindungan GPS.');
      return;
    }
    
    setCreating(true);
    try {
      const { error } = await supabase.from('akademik_qr_tokens').insert({
        title:           form.title,
        description:     form.description || null,
        merit_value:     form.merit_value,
        cooldown_hours:  form.cooldown_hours,
        expires_at:      form.expires_at || null,
        max_scans_total: form.max_scans_total ? parseInt(form.max_scans_total) : null,
        category:        form.category,
        available_from:  form.available_from || null,
        available_until: form.available_until || null,
        source_unit:     profile?.jpp_unit || 'KK',
        created_by:      profile?.id,
        is_active:       true,
        // New anti-cheat features
        location_lat:     form.use_gps ? parseFloat(form.location_lat) : null,
        location_lng:     form.use_gps ? parseFloat(form.location_lng) : null,
        radius_meters:    form.use_gps ? form.radius_meters : null,
        verification_pin: form.verification_pin
      });
      if (error) throw error;
      toast.success('QR Token berjaya dicipta!');
      setShowCreate(false);
      setForm({ 
        title: '', description: '', merit_value: 2, cooldown_hours: 8, expires_at: '', max_scans_total: '', 
        category: 'KEHADIRAN', available_from: '', available_until: '', 
        location_lat: '', location_lng: '', radius_meters: 150, verification_pin: generatePin(), use_gps: false 
      });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal cipta token.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('akademik_qr_tokens').update({ is_active: !current }).eq('id', id);
    setTokens(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
  };

  const downloadQr = (tokenId: string, title: string) => {
    const url = qrUrls[tokenId];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-Merit-${title.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const field = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white">QR Merit Manager</h3>
          <p className="text-[10px] text-white/30 font-medium mt-0.5">Jana dan urus token QR untuk merit aktiviti</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
          style={{ background: hexToRgba(themeColor, 0.2), color: themeColor, border: `1px solid ${hexToRgba(themeColor, 0.3)}` }}
        >
          <QrCode className="w-3.5 h-3.5" />
          Jana QR
        </button>
      </div>

      {/* Dev environment warning */}
      {isLocalhost && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-amber-300">Mod Pembangunan (localhost)</p>
            <p className="text-[9px] text-amber-400/60 mt-0.5 font-medium">
              QR kod akan menghala ke <code className="font-mono bg-black/20 px-1 rounded">{BASE_URL}</code> — tidak boleh diakses dari telefon lain.
              Untuk pengeluaran, tetapkan <code className="font-mono bg-black/20 px-1 rounded">VITE_APP_URL</code> dalam fail <code className="font-mono bg-black/20 px-1 rounded">.env.local</code>.
            </p>
          </div>
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Token Baru</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={form.title}
                  onChange={e => field('title', e.target.value)}
                  placeholder="Tajuk aktiviti *"
                  className="col-span-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
                <input
                  value={form.description}
                  onChange={e => field('description', e.target.value)}
                  placeholder="Perihal (optional)"
                  className="col-span-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Nilai Merit</label>
                  <input type="number" value={form.merit_value} onChange={e => field('merit_value', parseInt(e.target.value))} min={1} max={20}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Cooldown (jam)</label>
                  <input type="number" value={form.cooldown_hours} onChange={e => field('cooldown_hours', parseInt(e.target.value))} min={0}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Tamat Tempoh</label>
                  <input type="datetime-local" value={form.expires_at} onChange={e => field('expires_at', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Had Scan (kosong = ∞)</label>
                  <input type="number" value={form.max_scans_total} onChange={e => field('max_scans_total', e.target.value)} placeholder="Tiada had"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20" />
                </div>
              </div>
               {/* Time Window Section */}
              <div className="col-span-full">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Waktu Aktif (Opsional)</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { label: 'Subuh',   from: '05:30', until: '07:00' },
                    { label: 'Zohor',   from: '13:00', until: '14:30' },
                    { label: 'Asar',    from: '16:30', until: '18:00' },
                    { label: 'Maghrib', from: '19:30', until: '20:30' },
                    { label: 'Isyak',   from: '21:00', until: '22:30' },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => { field('available_from', p.from); field('available_until', p.until); }}
                      type="button"
                      className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
                      style={
                        form.available_from === p.from && form.available_until === p.until
                          ? { background: `${themeColor}25`, borderColor: themeColor, color: themeColor }
                          : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                  {(form.available_from || form.available_until) && (
                    <button
                      onClick={() => { field('available_from', ''); field('available_until', ''); }}
                      type="button"
                      className="px-3 py-1 rounded-lg text-[9px] font-black text-white/25 hover:text-rose-400 border border-white/[0.06] transition-all"
                    >
                      × Tanpa Had
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-white/25 mb-1 font-bold">Dari (HH:MM)</label>
                    <input type="time" value={form.available_from} onChange={e => field('available_from', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/20 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/25 mb-1 font-bold">Hingga (HH:MM)</label>
                    <input type="time" value={form.available_until} onChange={e => field('available_until', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/20 [color-scheme:dark]" />
                  </div>
                </div>
              </div>

              {/* Anti Cheat Setup */}
              <div className="col-span-full pt-2 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Perlindungan iMaps (Anti-Cheat)</label>
                    <p className="text-[10px] text-white/40">Gunakan semakan jarak lokasi & PIN ganti.</p>
                  </div>
                  <button type="button" onClick={() => field('use_gps', !form.use_gps)} 
                    className={`w-10 h-6 rounded-full p-1 transition-all ${form.use_gps ? 'bg-emerald-500' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-all ${form.use_gps ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
                
                {form.use_gps && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl">
                    <div className="col-span-full flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400">Koordinat Pusat Majlis</span>
                    </div>
                    <div>
                      <input placeholder="Latitude (Cth: 3.8291)" value={form.location_lat} onChange={e => field('location_lat', e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <input placeholder="Longitude (Cth: 103.321)" value={form.location_lng} onChange={e => field('location_lng', e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-[9px] text-white/40 mt-1 mb-1">Radius dibenarkan (meter)</label>
                      <input type="number" value={form.radius_meters} onChange={e => field('radius_meters', parseInt(e.target.value))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50" />
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <KeyRound className="w-6 h-6 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">PIN Pengesahan (Automatik)</p>
                    <p className="text-[10px] text-amber-400/60 mt-0.5">Tayangkan PIN ini di dewan. PIN ini melindungi QR sekiranya pelajar diluar radius / tiada GPS.</p>
                  </div>
                  <div className="text-xl font-black tracking-[0.2em] text-white bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                    {form.verification_pin}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/[0.08]">
                <button onClick={handleCreate} disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                  style={{ background: themeColor, color: '#fff' }}>
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  {creating ? 'Mencipta...' : 'Cipta QR'}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 bg-white/[0.04] transition-all">
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token list */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : tokens.length === 0 ? (
        <div className="py-12 text-center">
          <QrCode className="w-8 h-8 mx-auto text-white/10 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada QR Token lagi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map(t => {
            const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
            const isFull    = t.max_scans_total && t.current_scans_total >= t.max_scans_total;
            const scanUrl   = `${BASE_URL}/akademik/qr/${t.token}`;
            return (
              <div key={t.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-4">
                  {/* QR Preview */}
                  {qrUrls[t.id] ? (
                    <img src={qrUrls[t.id]} alt="QR" className="w-14 h-14 rounded-xl shrink-0 border border-white/[0.08]" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl shrink-0 bg-white/[0.04] flex items-center justify-center border border-white/[0.08]">
                      <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-white">{t.title}</p>
                      {/* Time window badge */}
                      {t.available_from && t.available_until && (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          {t.available_from.substring(0,5)} – {t.available_until.substring(0,5)}
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        !t.is_active || isExpired || isFull
                          ? 'bg-white/5 text-white/25'
                          : 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                      }`}>
                        {!t.is_active ? 'Tidak Aktif' : isExpired || isFull ? 'Tamat' : 'Aktif'}
                      </span>
                      {t.location_lat && (
                         <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                           <MapPin className="w-2 h-2" /> GPS
                         </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[10px] text-white/30 font-bold">+{t.merit_value} merit</span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-white/30 font-bold">Cooldown {t.cooldown_hours}j</span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-white/30 font-bold">
                        {t.current_scans_total}/{t.max_scans_total || '∞'} scan
                      </span>
                    </div>

                    {/* Verification PIN Box */}
                    {t.verification_pin && (
                       <div className="mt-3 flex items-center gap-3 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 inline-flex">
                         <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                         <div>
                           <p className="text-[8px] font-black uppercase tracking-widest text-amber-300">PIN Dewan</p>
                           <p className="text-sm font-black tracking-[0.2em] text-white">{t.verification_pin}</p>
                         </div>
                         <button onClick={() => regeneratePin(t.id)} title="Tukar PIN sekarang"
                           className="ml-2 p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 transition-colors">
                           <RefreshCw className="w-3.5 h-3.5" />
                         </button>
                       </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => toggleActive(t.id, t.is_active)}
                      className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border transition-all ${
                        t.is_active
                          ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                          : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                      }`}>
                      {t.is_active ? 'Nyahaktif' : 'Aktifkan'}
                    </button>
                    <button onClick={() => deleteToken(t.id)}
                      className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-rose-500/10 text-rose-400 hover:bg-rose-500/10 transition-all">
                      Padam
                    </button>
                    {qrUrls[t.id] && (
                      <button onClick={() => downloadQr(t.id, t.title)}
                        className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
