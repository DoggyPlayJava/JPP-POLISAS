import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trophy, ToggleLeft, ToggleRight, ExternalLink, Loader2,
  CalendarDays, Users, Medal, BarChart3, Settings, AlertTriangle,
  CheckCircle2, Clock, ArrowRight, LayoutGrid
} from 'lucide-react';
import { cn, hexToRgba } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const SUPSAS_COLOR = '#F59E0B';

interface SupsasEdition {
  id: string;
  name: string;
  edition_year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  tagline: string | null;
}

interface SupsasStats {
  kontinjenCount: number;
  sportsCount: number;
  fixturesCount: number;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white"
        style={{ background: hexToRgba(SUPSAS_COLOR, 0.2), border: `1px solid ${hexToRgba(SUPSAS_COLOR, 0.35)}` }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.25em] mt-1.5" style={{ color: hexToRgba(SUPSAS_COLOR, 0.6) }}>{label}</span>
    </div>
  );
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setTimeLeft({
        days:  Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000) / 60000),
        secs:  Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

export function SrkUnitDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [supsasEnabled, setSupsasEnabled] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [edition, setEdition] = useState<SupsasEdition | null>(null);
  const [stats, setStats] = useState<SupsasStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);



  const isYDP = profile?.jpp_position === 'YDP' || isSuperAdmin;
  const isSRK = profile?.jpp_unit === 'SRK' || isYDP;

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    const [settingsRes, editionRes] = await Promise.all([
      supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'supsas').maybeSingle(),
      supabase.from('supsas_editions').select('*').order('edition_year', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (settingsRes.data) setSupsasEnabled(settingsRes.data.is_enabled);
    if (editionRes.data) {
      setEdition(editionRes.data as SupsasEdition);
      // Fetch stats for latest edition
      const edId = editionRes.data.id;
      const [k, s, f] = await Promise.all([
        supabase.from('supsas_kontingen').select('id', { count: 'exact', head: true }).eq('edition_id', edId),
        supabase.from('supsas_sports').select('id', { count: 'exact', head: true }).eq('edition_id', edId),
        supabase.from('supsas_fixtures').select('id', { count: 'exact', head: true }).eq('edition_id', edId),
      ]);
      setStats({ kontinjenCount: k.count ?? 0, sportsCount: s.count ?? 0, fixturesCount: f.count ?? 0 });
    }
    setLoadingData(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async () => {
    if (!isSRK) { toast.error('Akses ditolak.'); return; }
    setLoadingToggle(true);
    const newState = !supsasEnabled;
    const { error } = await supabase
      .from('portal_settings')
      .update({ is_enabled: newState, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', 'supsas');

    setLoadingToggle(false);
    if (error) { toast.error('Gagal kemaskini toggle.'); return; }
    setSupsasEnabled(newState);
    toast.success(newState ? '🏆 SUPSAS diumumkan ke Portal!' : 'SUPSAS disembunyikan dari Portal.');
  };

  const countdown = useCountdown(edition?.start_date ?? null);
  const isEventLive = edition?.is_active && edition?.start_date && new Date(edition.start_date) <= new Date();
  const hasUpcoming = edition?.start_date && !isEventLive;

  return (
    <div className="space-y-6">
      <motion.div
        key="supsas"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="space-y-6"
      >
          {/* ── SUPSAS Toggle Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.5rem] border overflow-hidden"
        style={{ borderColor: hexToRgba(SUPSAS_COLOR, 0.2), background: hexToRgba(SUPSAS_COLOR, 0.04) }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${hexToRgba(SUPSAS_COLOR, 0.1)}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: hexToRgba(SUPSAS_COLOR, 0.2), border: `1px solid ${hexToRgba(SUPSAS_COLOR, 0.35)}` }}>
            <Trophy className="w-5 h-5" style={{ color: SUPSAS_COLOR }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white uppercase tracking-widest">SUPSAS Portal</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: hexToRgba(SUPSAS_COLOR, 0.6) }}>Kawalan pengumuman ke Portal Pelajar</p>
          </div>
          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={loadingToggle}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all',
              supsasEnabled
                ? 'text-amber-300 hover:bg-amber-500/20'
                : 'text-white/30 hover:text-white/60 hover:bg-white/10'
            )}
          >
            {loadingToggle
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : supsasEnabled
                ? <ToggleRight className="w-6 h-6" style={{ color: SUPSAS_COLOR }} />
                : <ToggleLeft className="w-6 h-6 text-white/30" />
            }
            {supsasEnabled ? 'Aktif' : 'Tidak Aktif'}
          </button>
        </div>

        {/* Status body */}
        <div className="px-5 py-4">
          <AnimatePresence mode="wait">
            {supsasEnabled ? (
              <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: SUPSAS_COLOR }} />
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Banner SUPSAS <span className="text-amber-400 font-black">sedang dipaparkan</span> dalam Portal Pelajar. Semua pengguna yang log masuk boleh melihat pengumuman dan butang ke SUPSAS.
                </p>
              </motion.div>
            ) : (
              <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/20" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  SUPSAS <span className="font-black text-white/50">tidak dipaparkan</span> dalam Portal Pelajar. Aktifkan toggle untuk mula mengumumkan event. Halaman /supsas masih boleh diakses melalui pautan terus.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {loadingData ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
        </div>
      ) : (
        <>
          {/* ── Countdown Block (bila ada tarikh) ── */}
          {hasUpcoming && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[1.5rem] border p-5 space-y-4"
              style={{ borderColor: hexToRgba(SUPSAS_COLOR, 0.15), background: hexToRgba(SUPSAS_COLOR, 0.03) }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: SUPSAS_COLOR }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Countdown</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: hexToRgba(SUPSAS_COLOR, 0.12), color: SUPSAS_COLOR, border: `1px solid ${hexToRgba(SUPSAS_COLOR, 0.2)}` }}>
                  {edition?.name}
                </span>
              </div>
              <div className="flex items-center gap-3 justify-center py-2">
                <CountdownUnit value={countdown.days}  label="Hari" />
                <span className="text-2xl font-black text-white/20 mb-4">:</span>
                <CountdownUnit value={countdown.hours} label="Jam" />
                <span className="text-2xl font-black text-white/20 mb-4">:</span>
                <CountdownUnit value={countdown.mins}  label="Minit" />
                <span className="text-2xl font-black text-white/20 mb-4">:</span>
                <CountdownUnit value={countdown.secs}  label="Saat" />
              </div>
              <p className="text-center text-xs font-black text-white/30">
                SUPSAS bermula pada{' '}
                <span style={{ color: SUPSAS_COLOR }}>
                  {new Date(edition!.start_date!).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            </motion.div>
          )}

          {/* ── Stats ── */}
          {edition && stats && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { label: 'Kontinjen', value: stats.kontinjenCount, icon: Users },
                { label: 'Sukan',     value: stats.sportsCount,    icon: Medal },
                { label: 'Perlawanan', value: stats.fixturesCount, icon: BarChart3 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl p-4 text-center border border-white/[0.05] bg-white/[0.02]">
                  <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: SUPSAS_COLOR }} />
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── Admin quick links ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Panel Pengurusan SUPSAS</p>
            {[
              { icon: Settings,     label: 'Tetapan Edisi',        href: '/supsas/admin/tetapan',   desc: 'Cipta / aktifkan edisi baru' },
              { icon: Trophy,       label: 'Urus Sukan',           href: '/supsas/admin/sukan',     desc: 'Tambah & uruskan sukan' },
              { icon: Users,        label: 'Urus Kontinjen',       href: '/supsas/admin/kontinjen', desc: 'Jana kod jemputan ketua' },
              { icon: CalendarDays, label: 'Jadual Pertandingan',  href: '/supsas/admin/jadual',    desc: 'Tetapkan perlawanan & keputusan' },
              { icon: Medal,        label: 'Input Keputusan',      href: '/supsas/admin/keputusan', desc: 'Rekod medal emas/perak/gangsa' },
              { icon: BarChart3,    label: 'Lihat Papan Markah',   href: '/supsas/scoreboard',     desc: 'Papan markah awam masa nyata' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <button
                key={href}
                onClick={() => navigate(href)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: hexToRgba(SUPSAS_COLOR, 0.12) }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: SUPSAS_COLOR }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white/70 group-hover:text-white transition-colors">{label}</p>
                  <p className="text-[9px] text-white/25 mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </motion.div>

          {/* ── No edition CTA ── */}
          {!edition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 border border-dashed border-white/10 rounded-2xl space-y-3"
            >
              <Trophy className="w-8 h-8 mx-auto text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Belum ada edisi SUPSAS dicipta</p>
              <button
                onClick={() => navigate('/supsas/admin/tetapan')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                style={{ background: hexToRgba(SUPSAS_COLOR, 0.15), color: SUPSAS_COLOR, border: `1px solid ${hexToRgba(SUPSAS_COLOR, 0.2)}` }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Cipta Edisi Pertama
              </button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
    </div>
  );
}
