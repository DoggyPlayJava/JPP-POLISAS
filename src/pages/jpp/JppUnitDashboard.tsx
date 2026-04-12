import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, ExternalLink, Lock, Construction,
  Flag, Activity, FileText, Users, Loader2,
} from 'lucide-react';
import { cn, hexToRgba } from '@/lib/utils';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID, UNIT_CFG } from './jppConfig';
import { JPP_MT_POSITIONS, JPP_UNIT_LABELS } from '@/types';
import { KppUnitDashboard } from './units/KppUnitDashboard';
import { KeusahawananUnitDashboard } from './units/KeusahawananUnitDashboard';
import { ExcoGenericDashboard } from './units/ExcoGenericDashboard';

// ── Units that have a full dedicated dashboard component ─────────────────────
const FULL_DASHBOARD_UNITS = new Set(['KPP', 'KEUSAHAWANAN']);



// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-w-0 rounded-2xl p-4 border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-all"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: hexToRgba(color, 0.15) }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mt-1">{label}</p>
    </motion.div>
  );
}

// ── Coming Soon placeholder ───────────────────────────────────────────────────
function ComingSoonPlaceholder({ code, themeColor }: { code: string; themeColor: string }) {
  const cfg = UNIT_CFG[code.toUpperCase()];
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-6"
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center"
        style={{
          background: hexToRgba(cfg?.color ?? themeColor, 0.1),
          border: `1px solid ${hexToRgba(cfg?.color ?? themeColor, 0.2)}`,
        }}
      >
        {cfg
          ? <cfg.icon className="w-9 h-9 opacity-60" style={{ color: cfg.color }} />
          : <Construction className="w-9 h-9 text-white/20" />
        }
      </div>

      {/* Lencana */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
        style={{
          background: hexToRgba(themeColor, 0.1),
          borderColor: hexToRgba(themeColor, 0.2),
          color: hexToRgba(themeColor, 0.8),
          border: '1px solid',
        }}
      >
        <Construction className="w-3 h-3" />
        Dalam Pembangunan
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-black text-white leading-tight">
          {cfg?.shortLabel ?? code}
        </h1>
        <p className="text-xs text-white/40 leading-relaxed">
          {cfg?.fullLabel ?? JPP_UNIT_LABELS[code.toUpperCase()] ?? code}
        </p>
        <p className="text-[11px] text-white/25 mt-4 leading-relaxed">
          Modul exco ini sedang dalam pembangunan. Pasukan JPP Digital sedang membangunkan ciri-ciri yang diperlukan untuk unit ini.
        </p>
      </div>

      {/* Milestones */}
      <div className="w-full max-w-xs space-y-2.5 text-left">
        {['Reka bentuk UI/UX', 'Pembangunan Backend', 'Ujian & QA', 'Pelancaran Rasmi'].map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black',
              i < 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/20 border border-white/10'
            )}>
              {i < 1 ? '✓' : i + 1}
            </div>
            <span className={cn('text-[11px] font-black', i < 1 ? 'text-emerald-400' : 'text-white/25')}>
              {step}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/jpp')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke JPP HQ
      </button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function JppUnitDashboard() {
  const { unitCode = '' } = useParams<{ unitCode: string }>();
  const { user, profile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const upperCode   = unitCode.toUpperCase();
  const cfg         = UNIT_CFG[upperCode];

  const jppPosition = profile?.jpp_position as string | undefined;
  const jppUnit     = profile?.jpp_unit as string | undefined;
  const isYDP       = jppPosition === 'YDP' || isSuperAdmin;
  const isMT        = !isYDP && JPP_MT_POSITIONS.includes(jppPosition as any);

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [assignedUnits, setAssignedUnits] = useState<string[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(isMT);

  // Fetch portal color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch MT assignments for access check
  useEffect(() => {
    if (!isMT || !user?.id) { setCheckingAccess(false); return; }
    supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', user.id)
      .then(({ data }) => {
        if (data) setAssignedUnits(data.map((d: any) => d.unit as string));
        setCheckingAccess(false);
      });
  }, [user?.id, isMT]);

  // Access check
  const hasAccess = useMemo(() => {
    if (isYDP) return true;
    if (isMT)  return assignedUnits.includes(upperCode);
    return jppUnit === upperCode;
  }, [isYDP, isMT, assignedUnits, upperCode, jppUnit]);

  // Guard: unknown unit code
  if (!cfg) return <Navigate to="/jpp" replace />;

  // Guard: still checking MT access
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/20" />
      </div>
    );
  }

  // Guard: no access
  if (!hasAccess && !checkingAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center px-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Lock className="w-7 h-7 text-white/20" />
        </div>
        <h1 className="text-xl font-black text-white/40">Akses Terhad</h1>
        <p className="text-xs text-white/20 max-w-xs">Anda tidak mempunyai akses ke unit ini.</p>
        <button
          onClick={() => navigate('/jpp')}
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[45vw] h-[45vw] rounded-full blur-3xl opacity-5"
          style={{ background: cfg.color }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Kembali
        </motion.button>

        {/* Not active → show placeholder */}
        {!cfg.isActive ? (
          <ComingSoonPlaceholder code={upperCode} themeColor={themeColor} />
        ) : (
          <>
            {/* ── Header ─── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: hexToRgba(cfg.color, 0.15),
                    border: `1px solid ${hexToRgba(cfg.color, 0.25)}`,
                  }}
                >
                  <cfg.icon className="w-7 h-7" style={{ color: cfg.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: hexToRgba(cfg.color, 0.15), color: cfg.color }}
                    >
                      Unit Exco
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      Aktif
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-white leading-tight">{cfg.shortLabel}</h1>
                  <p className="text-[11px] text-white/35 mt-0.5">{cfg.fullLabel}</p>
                </div>
              </div>
            </motion.div>

            {/* ── Full Unit Dashboard (KPP / Keusahawanan) ─── */}
            {FULL_DASHBOARD_UNITS.has(upperCode) ? (
              <div className="bg-[#0f0f17]/80 backdrop-blur rounded-[2rem] border border-white/[0.05] p-6">
                {upperCode === 'KPP'         && <KppUnitDashboard />}
                {upperCode === 'KEUSAHAWANAN' && <KeusahawananUnitDashboard />}
              </div>
            ) : (
              /* ── Exco Generic Dashboard untuk semua unit aktif lain ─── */
              <ExcoGenericDashboard
                excoUnit={upperCode}
                themeColor={cfg.color}
                excoLabel={cfg.fullLabel}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
