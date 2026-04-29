/**
 * ProgramStatistikTab.tsx
 * Tab Statistik Program — infografik kehadiran, jabatan, merit
 * Digunakan dalam AktivitiFull.tsx (Tab 3)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Trophy, QrCode, CalendarDays, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  selectedClubId: string | null;
  isSuperAdmin?: boolean;
}

interface AttendSummary {
  program_id: string;
  program_title: string;
  program_type: string;
  pre_registered: number;
  attended: number;
  walk_in: number;
  absent: number;
  total: number;
  merit_kelab: number;
}

interface JabatanStat {
  jabatan: string;
  count: number;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899'];

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ProgramStatistikTab({ selectedClubId, isSuperAdmin }: Props) {
  const [loading, setLoading]         = useState(true);
  const [summaries, setSummaries]     = useState<AttendSummary[]>([]);
  const [jabatan, setJabatan]         = useState<JabatanStat[]>([]);
  const [totalMerit, setTotalMerit]   = useState(0);
  const [totalPrograms, setTotalPrograms] = useState(0);

  const load = useCallback(async () => {
    if (!selectedClubId && !isSuperAdmin) return;
    setLoading(true);

    try {
      // ── 1. Ambil program_attendees dengan join profiles.jabatan ──
      let attendQuery = supabase
        .from('program_attendees')
        .select('program_id, program_type, status, user_id, profiles!inner(jabatan)');

      // ── 2. Ambil senarai program_id milik kelab ini ──
      let progIds: string[] = [];

      if (selectedClubId) {
        const { data: progs } = await supabase
          .from('programs')
          .select('id, nama_program, merit_kelab')
          .eq('club_id', selectedClubId);

        const { data: acts } = await supabase
          .from('club_activities')
          .select('id, title, merit_kelab')
          .eq('club_id', selectedClubId);

        const progMap: Record<string, AttendSummary> = {};

        (progs || []).forEach(p => {
          progIds.push(p.id);
          progMap[p.id] = {
            program_id: p.id, program_title: p.nama_program,
            program_type: 'takwim',
            pre_registered: 0, attended: 0, walk_in: 0, absent: 0, total: 0,
            merit_kelab: p.merit_kelab || 0
          };
        });
        (acts || []).forEach(a => {
          progIds.push(a.id);
          progMap[a.id] = {
            program_id: a.id, program_title: a.title,
            program_type: 'aktiviti',
            pre_registered: 0, attended: 0, walk_in: 0, absent: 0, total: 0,
            merit_kelab: a.merit_kelab || 0
          };
        });

        setTotalPrograms(progIds.length);

        if (progIds.length > 0) {
          const { data: attendees } = await supabase
            .from('program_attendees')
            .select('program_id, program_type, status, user_id, profiles!inner(jabatan)')
            .in('program_id', progIds);

          // Tally kehadiran
          (attendees || []).forEach((row: any) => {
            const s = progMap[row.program_id];
            if (!s) return;
            s.total++;
            if (row.status === 'pre_registered') s.pre_registered++;
            else if (row.status === 'attended') s.attended++;
            else if (row.status === 'walk_in') s.walk_in++;
            else if (row.status === 'absent') s.absent++;
          });

          // Jabatan breakdown (semua attendees)
          const jabMap: Record<string, number> = {};
          (attendees || []).forEach((row: any) => {
            const jab = row.profiles?.jabatan || 'Lain-lain';
            jabMap[jab] = (jabMap[jab] || 0) + 1;
          });
          setJabatan(
            Object.entries(jabMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 7)
              .map(([jabatan, count]) => ({ jabatan, count }))
          );

          // Merit terkumpul (attended × merit_kelab)
          let merit = 0;
          Object.values(progMap).forEach(p => {
            merit += (p.attended + p.walk_in) * p.merit_kelab;
          });
          setTotalMerit(merit);
        }

        setSummaries(
          Object.values(progMap)
            .filter(p => p.total > 0)
            .sort((a, b) => b.total - a.total)
        );
      }
    } catch (e) {
      console.error('Statistik load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedClubId, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  // ─── Summary numbers ──────────────────────────────────────────────────────
  const totalAttended     = summaries.reduce((s, p) => s + p.attended + p.walk_in, 0);
  const totalPreReg       = summaries.reduce((s, p) => s + p.pre_registered, 0);
  const totalParticipants = summaries.reduce((s, p) => s + p.total, 0);
  const avgAttendRate     = totalParticipants > 0
    ? Math.round((totalAttended / totalParticipants) * 100) : 0;

  // Bar chart data — top 6 program by attendance
  const barData = summaries.slice(0, 6).map(p => ({
    name: p.program_title.length > 16 ? p.program_title.slice(0, 14) + '…' : p.program_title,
    'Hadir': p.attended + p.walk_in,
    'Daftar': p.pre_registered,
    'Absent': p.absent,
  }));

  if (loading) return <StatsSkeleton />;

  if (summaries.length === 0 && jabatan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Tiada Data Statistik</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Aktifkan QR pada program dan biarkan peserta scan untuk mula kumpul data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CalendarDays} label="Jumlah Program" value={totalPrograms} color="text-primary" bg="bg-primary/10" />
        <KpiCard icon={Users} label="Jumlah Peserta" value={totalParticipants} color="text-emerald-600" bg="bg-emerald-500/10" />
        <KpiCard icon={TrendingUp} label="Kadar Hadir" value={`${avgAttendRate}%`} color="text-amber-600" bg="bg-amber-500/10" />
        <KpiCard icon={Trophy} label="Merit Dikreditkan" value={totalMerit} color="text-violet-600" bg="bg-violet-500/10" />
      </div>

      {/* ── BAR CHART: Kehadiran per Program ── */}
      {barData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 rounded-[2rem] bg-card border border-border shadow-sm"
        >
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kehadiran Per Program</p>
            <h3 className="text-xl font-black tracking-tight">Status Peserta</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barGap={4} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '1rem', fontSize: 11, fontWeight: 700 }}
                cursor={{ fill: 'hsl(var(--muted))', radius: 8 }}
              />
              <Bar dataKey="Hadir" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Daftar" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Absent" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Legend manual */}
          <div className="flex gap-4 mt-3 justify-center">
            {[['Hadir','#10b981'],['Daftar','#6366f1'],['Absent','#f43f5e']].map(([l,c]) => (
              <span key={l} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── GRID: Pie Chart + Program Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie chart jabatan */}
        {jabatan.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="p-6 rounded-[2rem] bg-card border border-border shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Komposisi Peserta</p>
            <h3 className="text-xl font-black tracking-tight mb-4">Jabatan / Kursus</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={jabatan} dataKey="count" nameKey="jabatan" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                  {jabatan.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '1rem', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {jabatan.map((j, i) => (
                <span key={j.jabatan} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {j.jabatan} ({j.count})
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Program attendance table */}
        {summaries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="p-6 rounded-[2rem] bg-card border border-border shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Butiran Program</p>
            <h3 className="text-xl font-black tracking-tight mb-4">Senarai Kehadiran</h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {summaries.map((p) => {
                const hadir = p.attended + p.walk_in;
                const rate  = p.total > 0 ? Math.round((hadir / p.total) * 100) : 0;
                return (
                  <div key={p.program_id} className="flex items-center gap-3">
                    <div className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[9px] font-black',
                      p.program_type === 'takwim' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'
                    )}>
                      {p.program_type === 'takwim' ? <CalendarDays size={13} /> : <QrCode size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{p.program_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground shrink-0">{hadir}/{p.total}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-black px-2 py-0.5 rounded-full',
                      rate >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                      rate >= 50 ? 'bg-amber-500/10 text-amber-600' :
                      'bg-rose-500/10 text-rose-500'
                    )}>
                      {rate}%
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Pre-reg vs Attended summary strip */}
      {totalParticipants > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Pre-Register', value: totalPreReg, color: 'text-indigo-600', bg: 'bg-indigo-500/10', bar: 'bg-indigo-500' },
            { label: 'Hadir', value: totalAttended, color: 'text-emerald-600', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
            { label: 'Tidak Hadir', value: summaries.reduce((s,p) => s + p.absent, 0), color: 'text-rose-500', bg: 'bg-rose-500/10', bar: 'bg-rose-500' },
          ].map(item => (
            <div key={item.label} className={cn('p-5 rounded-[2rem] border border-border', item.bg)}>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
              <p className={cn('text-3xl font-black tracking-tighter', item.color)}>{item.value}</p>
              <div className="mt-2 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div className={cn('h-full rounded-full', item.bar)} style={{ width: `${totalParticipants > 0 ? Math.round((item.value/totalParticipants)*100) : 0}%` }} />
              </div>
              <p className="text-[9px] font-bold text-muted-foreground mt-1">
                {totalParticipants > 0 ? Math.round((item.value/totalParticipants)*100) : 0}% daripada jumlah
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="p-5 rounded-[2rem] bg-card border border-border shadow-sm flex items-start gap-4"
    >
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', bg)}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-black tracking-tighter mt-0.5', color)}>{value}</p>
      </div>
    </motion.div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-[2rem]" />)}
      </div>
      <Skeleton className="h-64 rounded-[2rem]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    </div>
  );
}
