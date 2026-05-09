import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToUser } from '@/lib/notifications';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  QrCode, CheckCircle, XCircle, Clock, Loader2,
  Users, Trophy, MapPin, Calendar, AlertCircle, LogIn,
  ArrowLeft, Sparkles, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid, isBefore, isAfter } from 'date-fns';
import { ms } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanState =
  | 'loading'       // sedang fetch token
  | 'not_found'     // token tidak wujud
  | 'not_open'      // QR belum dibuka
  | 'closed'        // QR sudah ditutup
  | 'not_authed'    // belum login
  | 'pre_reg_only'  // perlu pre-register dulu
  | 'already'       // sudah scan sebelum ini
  | 'ready'         // sedia untuk claim
  | 'claiming'      // sedang process
  | 'success';      // berjaya

interface ProgramInfo {
  id: string;
  type: 'takwim' | 'aktiviti';
  title: string;
  date?: string;
  venue?: string;
  merit_kelab: number;
  qr_open_at?: string | null;
  qr_close_at?: string | null;
  pre_reg_enabled: boolean;
  club_name?: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ProgramAttendPage() {
  const { token } = useParams<{ token: string }>();
  const navigate   = useNavigate();
  const { user, profile } = useAuth();

  const [state, setState]   = useState<ScanState>('loading');
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [attendeeId, setAttendeeId] = useState<string | null>(null);

  // ─── 1. Cari program berdasarkan token ─────────────────────────────────────
  const loadProgram = useCallback(async () => {
    if (!token) { setState('not_found'); return; }

    // Cuba cari dalam programs (Takwim Rasmi)
    const { data: prog } = await supabase
      .from('programs')
      .select('id, nama_program, tarikh_mula, location, merit_kelab, qr_token, qr_enabled, qr_open_at, qr_close_at, pre_reg_enabled')
      .eq('qr_token', token)
      .eq('qr_enabled', true)
      .single();

    if (prog) {
      // Cari nama kelab
      const { data: creator } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', (await supabase.from('programs').select('user_id').eq('id', prog.id).single()).data?.user_id || '')
        .single();

      setProgram({
        id: prog.id,
        type: 'takwim',
        title: prog.nama_program,
        date: prog.tarikh_mula,
        venue: prog.location,
        merit_kelab: prog.merit_kelab || 0,
        qr_open_at: prog.qr_open_at,
        qr_close_at: prog.qr_close_at,
        pre_reg_enabled: prog.pre_reg_enabled,
      });
      return;
    }

    // Cuba cari dalam club_activities (Aktiviti Kelab)
    const { data: act } = await supabase
      .from('club_activities')
      .select('id, title, start_date, location, merit_kelab, qr_token, qr_enabled, qr_open_at, qr_close_at, pre_reg_enabled')
      .eq('qr_token', token)
      .eq('qr_enabled', true)
      .single();

    if (act) {
      setProgram({
        id: act.id,
        type: 'aktiviti',
        title: act.title,
        date: act.start_date,
        venue: act.location,
        merit_kelab: act.merit_kelab || 0,
        qr_open_at: act.qr_open_at,
        qr_close_at: act.qr_close_at,
        pre_reg_enabled: act.pre_reg_enabled,
      });
      return;
    }

    // Token tidak ditemui atau QR tidak aktif
    setState('not_found');
  }, [token]);

  // ─── 2. Tentukan state selepas load ────────────────────────────────────────
  const determineState = useCallback(async () => {
    if (!program) return;

    // Semak window masa
    const now = new Date();
    if (program.qr_open_at && isAfter(parseISO(program.qr_open_at), now)) {
      setState('not_open');
      return;
    }
    if (program.qr_close_at && isBefore(parseISO(program.qr_close_at), now)) {
      setState('closed');
      return;
    }

    // Semak auth
    if (!user || !profile) {
      setState('not_authed');
      return;
    }

    // Semak pre-registration jika diperlukan
    if (program.pre_reg_enabled) {
      const { data: reg } = await supabase
        .from('program_attendees')
        .select('id, status')
        .eq('program_id', program.id)
        .eq('program_type', program.type)
        .eq('user_id', user.id)
        .single();

      if (!reg) {
        setState('pre_reg_only');
        return;
      }

      // Sudah hadir sebelum ini?
      if (reg.status === 'attended' || reg.status === 'walk_in') {
        setAttendeeId(reg.id);
        setState('already');
        return;
      }

      setAttendeeId(reg.id);
    } else {
      // Walk-in dibenarkan — semak sama ada sudah hadir
      const { data: existing } = await supabase
        .from('program_attendees')
        .select('id, status')
        .eq('program_id', program.id)
        .eq('program_type', program.type)
        .eq('user_id', user.id)
        .single();

      if (existing && (existing.status === 'attended' || existing.status === 'walk_in')) {
        setAttendeeId(existing.id);
        setState('already');
        return;
      }

      if (existing) {
        setAttendeeId(existing.id);
      }
    }

    setState('ready');
  }, [program, user, profile]);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { loadProgram(); }, [loadProgram]);
  useEffect(() => { if (program) determineState(); }, [program, determineState]);

  // ─── 3. Claim kehadiran ────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!program || !user || !profile) return;
    setState('claiming');

    try {
      let newAttendeeId = attendeeId;

      if (attendeeId) {
        // Update status dari pre_registered → attended
        const { error } = await supabase
          .from('program_attendees')
          .update({
            status: 'attended',
            checked_in_at: new Date().toISOString(),
            check_in_method: 'qr',
          })
          .eq('id', attendeeId);

        if (error) throw error;
      } else {
        // Walk-in — insert baru
        const { data, error } = await supabase
          .from('program_attendees')
          .insert({
            program_id: program.id,
            program_type: program.type,
            user_id: user.id,
            status: 'walk_in',
            checked_in_at: new Date().toISOString(),
            check_in_method: 'qr',
          })
          .select('id')
          .single();

        if (error) {
          // Duplicate — sudah hadir
          if (error.code === '23505') {
            setState('already');
            return;
          }
          throw error;
        }
        newAttendeeId = data?.id;
      }

      // Trigger DB sudah handle merit credit automatik
      // Hantar notifikasi in-app kepada peserta
      if (program.merit_kelab > 0) {
        await sendNotificationToUser(user.id, {
          title: `+${program.merit_kelab} Merit Program! 🏆`,
          message: `Anda telah berjaya hadir "${program.title}". Merit Kelab telah dikreditkan.`,
          type: 'MERIT_CREDITED',
          module: 'AKADEMIK',
          link: '/akademik/merit',
          reference_id: program.id,
          actor_name: 'Sistem Program',
        });
      } else {
        await sendNotificationToUser(user.id, {
          title: `Kehadiran Disahkan ✅`,
          message: `Anda telah berjaya daftar hadir untuk "${program.title}".`,
          type: 'ATTENDANCE_CONFIRMED',
          module: 'EKPP',
          reference_id: program.id,
          actor_name: 'Sistem Program',
        });
      }

      // Confetti! 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#F59E0B', '#6366F1'],
      });

      setState('success');
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa mendaftar kehadiran.');
      setState('ready');
    }
  };

  // ─── Redirect ke login ─────────────────────────────────────────────────────
  const handleLogin = () => {
    navigate(`/login?redirect=/program/attend/${token}`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {state === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-slate-500 animate-spin mx-auto" />
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Memuatkan...</p>
            </motion.div>
          )}

          {/* Not Found */}
          {state === 'not_found' && (
            <motion.div key="not_found" {...fadeIn} className="text-center space-y-6">
              <StatusIcon icon={XCircle} color="rose" />
              <div>
                <h1 className="text-2xl font-black text-white">QR Tidak Sah</h1>
                <p className="text-sm text-slate-500 mt-2">Kod QR ini tidak wujud atau sudah tidak aktif.</p>
              </div>
              <Button onClick={() => navigate('/')} variant="outline" className="rounded-2xl text-slate-400 border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Portal
              </Button>
            </motion.div>
          )}

          {/* Not Open Yet */}
          {state === 'not_open' && program && (
            <motion.div key="not_open" {...fadeIn} className="space-y-6">
              <StatusIcon icon={Clock} color="amber" />
              <ProgramCard program={program} />
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">QR Belum Dibuka</p>
                <p className="text-sm text-amber-300/80">
                  QR akan dibuka pada{' '}
                  <span className="font-black">
                    {program.qr_open_at ? format(parseISO(program.qr_open_at), "d MMM, h:mm a", { locale: ms }) : '—'}
                  </span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Closed */}
          {state === 'closed' && program && (
            <motion.div key="closed" {...fadeIn} className="space-y-6">
              <StatusIcon icon={XCircle} color="rose" />
              <ProgramCard program={program} />
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-center">
                <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">QR Sudah Ditutup</p>
                <p className="text-sm text-rose-300/80">Masa daftar hadir telah tamat.</p>
              </div>
            </motion.div>
          )}

          {/* Not Authed */}
          {state === 'not_authed' && program && (
            <motion.div key="not_authed" {...fadeIn} className="space-y-6">
              <StatusIcon icon={Shield} color="indigo" />
              <ProgramCard program={program} />
              <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-center">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Log Masuk Diperlukan</p>
                <p className="text-sm text-indigo-300/80">Anda perlu log masuk ke akaun JPP-POLISAS untuk mendaftar kehadiran.</p>
              </div>
              <Button onClick={handleLogin}
                className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/50">
                <LogIn className="w-4 h-4 mr-2" />
                Log Masuk & Claim
              </Button>
            </motion.div>
          )}

          {/* Pre-reg only */}
          {state === 'pre_reg_only' && program && (
            <motion.div key="pre_reg_only" {...fadeIn} className="space-y-6">
              <StatusIcon icon={AlertCircle} color="amber" />
              <ProgramCard program={program} />
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Pendaftaran Diperlukan</p>
                <p className="text-sm text-amber-300/80">Program ini memerlukan pendaftaran awal. Sila daftar terlebih dahulu dalam app.</p>
              </div>
              <Button onClick={() => navigate('/aktiviti')} variant="outline"
                className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-slate-700 text-slate-400">
                Pergi ke Aktiviti
              </Button>
            </motion.div>
          )}

          {/* Already */}
          {state === 'already' && program && (
            <motion.div key="already" {...fadeIn} className="space-y-6">
              <StatusIcon icon={CheckCircle} color="emerald" />
              <ProgramCard program={program} />
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Sudah Hadir ✓</p>
                <p className="text-sm text-emerald-300/80">Anda sudah mendaftar hadir untuk program ini.</p>
              </div>
              <Button onClick={() => navigate('/aktiviti')} variant="outline"
                className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-slate-700 text-slate-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </motion.div>
          )}

          {/* Ready */}
          {state === 'ready' && program && profile && (
            <motion.div key="ready" {...fadeIn} className="space-y-6">
              {/* QR Icon */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-primary" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Daftar Hadir</p>
              </div>

              {/* Program info */}
              <ProgramCard program={program} />

              {/* User info */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] flex items-center justify-center overflow-hidden shrink-0">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    : <span className="text-base">{profile.full_name?.[0] ?? '?'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{profile.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{profile.matric_no ?? profile.email}</p>
                </div>
              </div>

              {/* Merit indicator */}
              {program.merit_kelab > 0 && (
                <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Merit Kelab</p>
                    <p className="text-lg font-black text-amber-300">+{program.merit_kelab} Merit</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={handleClaim}
                className="w-full h-14 rounded-2xl font-black text-[12px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Claim Kehadiran
              </Button>
            </motion.div>
          )}

          {/* Claiming */}
          {state === 'claiming' && (
            <motion.div key="claiming" {...fadeIn} className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Mendaftar kehadiran...</p>
            </motion.div>
          )}

          {/* Success */}
          {state === 'success' && program && (
            <motion.div key="success" {...fadeIn} className="space-y-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">Berjaya! 🎉</h1>
                <p className="text-sm text-slate-500 mt-2">Kehadiran anda telah didaftarkan.</p>
              </motion.div>

              <ProgramCard program={program} />

              {program.merit_kelab > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 p-4 text-center"
                >
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Merit Kelab Dikreditkan</p>
                  <p className="text-3xl font-black text-amber-300">+{program.merit_kelab}</p>
                  <p className="text-[10px] text-amber-400/60 mt-1 font-medium">merit telah ditambah ke akaun anda</p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => navigate('/akademik/merit')} variant="outline"
                  className="h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-700 text-slate-400">
                  <Trophy className="w-3.5 h-3.5 mr-1.5" />
                  Merit Saya
                </Button>
                <Button onClick={() => navigate('/aktiviti')}
                  className="h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary text-white">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Aktiviti
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3 },
};

function StatusIcon({ icon: Icon, color }: { icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/15 border-emerald-500/25', icon: 'text-emerald-400' },
    rose:    { bg: 'bg-rose-500/15 border-rose-500/25',       icon: 'text-rose-400' },
    amber:   { bg: 'bg-amber-500/15 border-amber-500/25',     icon: 'text-amber-400' },
    indigo:  { bg: 'bg-indigo-500/15 border-indigo-500/25',   icon: 'text-indigo-400' },
    slate:   { bg: 'bg-slate-500/15 border-slate-500/25',     icon: 'text-slate-400' },
  };
  const cfg = colorMap[color] ?? colorMap.slate;
  return (
    <div className="text-center">
      <div className={`w-16 h-16 rounded-[1.5rem] border flex items-center justify-center mx-auto ${cfg.bg}`}>
        <Icon className={`w-8 h-8 ${cfg.icon}`} />
      </div>
    </div>
  );
}

function ProgramCard({ program }: { program: ProgramInfo }) {
  const formatDate = (d?: string | null) => {
    if (!d) return null;
    try {
      const parsed = parseISO(d);
      if (!isValid(parsed)) return d;
      return format(parsed, "EEEE, d MMMM yyyy", { locale: ms });
    } catch { return d; }
  };

  const typeLabel = program.type === 'takwim' ? 'Takwim Rasmi' : 'Aktiviti Kelab';
  const typeColor = program.type === 'takwim'
    ? 'bg-primary/15 text-primary border-primary/25'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';

  return (
    <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.07] p-5 space-y-3">
      <span className={`inline-block text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${typeColor}`}>
        {typeLabel}
      </span>
      <h2 className="text-xl font-black text-white leading-tight">{program.title}</h2>
      <div className="space-y-2">
        {program.date && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>{formatDate(program.date)}</span>
          </div>
        )}
        {program.venue && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">{program.venue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
