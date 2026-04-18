import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ms } from 'date-fns/locale';
import {
  BarChart3, ChevronLeft, ChevronRight, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, Users, Star, FileDown, Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { KEBAJIKAN_THEME_COLOR, KEBAJIKAN_CATEGORY_LABELS, KebajikanTicketCategory } from '@/types';
import { cn } from '@/lib/utils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { KebajikanReportPDF } from '@/components/pdf/KebajikanReportPDF';

const TEAL = KEBAJIKAN_THEME_COLOR;
const PIE_COLORS = ['#6366F1','#2DD4BF','#F59E0B','#EF4444','#10B981'];

interface ReportData {
  total_received:    number;
  total_resolved:    number;
  total_cancelled:   number;
  total_pending:     number;
  resolution_rate:   number;
  avg_hours:         number;
  escalated_count:   number;
  sla_breach_count:  number;
  avg_rating:        number | null;
  satisfied_count:   number;
  neutral_count:     number;
  unsatisfied_count: number;
  by_category:       { category: string; total: number; resolved: number }[];
  by_status:         { status: string; count: number }[];
  by_assignee:       { name: string; assigned: number; resolved: number; avg_hours: number }[];
  escalated_tickets: { ticket_no: string; category: string; hours_open: number; status: string }[];
  pending_tickets:   { ticket_no: string; category: string; days_open: number; status: string; assigned_to: string }[];
  top_comments:      { comment: string; rating: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Diterima', IN_PROGRESS: 'Dalam Tindakan', WAITING_INFO: 'Menunggu',
  DELEGATED: 'Didelegasikan', ESCALATED: 'Diescalate', RESOLVED: 'Selesai',
  CLOSED: 'Ditutup', CANCELLED: 'Dibatal', REOPENED: 'Dibuka Semula',
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl p-6', className)}>
      {children}
    </div>
  );
}

function SectionTitle({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: 'rgba(45,212,191,0.1)', color: TEAL, border: `1px solid rgba(45,212,191,0.2)` }}>
        {num}
      </div>
      <div>
        <h2 className="font-black text-lg text-slate-50">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function KebajikanReportPage() {
  const now   = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData]     = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const targetMonth = subMonths(now, monthOffset);
  const monthStart  = startOfMonth(targetMonth).toISOString();
  const monthEnd    = endOfMonth(targetMonth).toISOString();
  const monthLabel  = format(targetMonth, 'MMMM yyyy', { locale: ms });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tickets in the month
      const { data: tickets } = await supabase
        .from('kebajikan_tickets')
        .select(`
          id, ticket_no, category, status, assigned_to, priority,
          created_at, resolved_at, escalated_at, rating, rating_comment, cancelled_at
        `)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      if (!tickets) { setLoading(false); return; }

      const total_received  = tickets.length;
      const resolved        = tickets.filter(t => ['RESOLVED','CLOSED'].includes(t.status));
      const total_resolved  = resolved.length;
      const total_cancelled = tickets.filter(t => t.status === 'CANCELLED').length;
      const total_pending   = tickets.filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status)).length;
      const resolution_rate = total_received > 0 ? Math.round((total_resolved / (total_received - total_cancelled)) * 100) : 0;

      const resolvedWithTime = resolved.filter(t => t.resolved_at);
      const avg_hours = resolvedWithTime.length > 0
        ? Math.round(resolvedWithTime.reduce((acc, t) => acc + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3600000, 0) / resolvedWithTime.length * 10) / 10
        : 0;

      const escalated_count  = tickets.filter(t => t.status === 'ESCALATED' || t.escalated_at).length;
      const sla_breach_count = tickets.filter(t => t.escalated_at).length;

      const rated = tickets.filter(t => t.rating);
      const avg_rating        = rated.length > 0 ? Math.round(rated.reduce((a, t) => a + t.rating!, 0) / rated.length * 10) / 10 : null;
      const satisfied_count   = rated.filter(t => (t.rating ?? 0) >= 4).length;
      const neutral_count     = rated.filter(t => t.rating === 3).length;
      const unsatisfied_count = rated.filter(t => (t.rating ?? 0) <= 2).length;

      // By category
      const catMap: Record<string, { total: number; resolved: number }> = {};
      tickets.forEach(t => {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, resolved: 0 };
        catMap[t.category].total++;
        if (['RESOLVED','CLOSED'].includes(t.status)) catMap[t.category].resolved++;
      });
      const by_category = Object.entries(catMap).map(([category, v]) => ({ category, ...v }));

      // By status
      const statMap: Record<string, number> = {};
      tickets.forEach(t => { statMap[t.status] = (statMap[t.status] || 0) + 1; });
      const by_status = Object.entries(statMap).map(([status, count]) => ({ status, count }));

      // Assignee performance — fetch assignee names
      const assigneeIds = [...new Set(tickets.filter(t => t.assigned_to).map(t => t.assigned_to!))];
      let assigneeNames: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', assigneeIds);
        profiles?.forEach(p => { assigneeNames[p.id] = p.full_name; });
      }
      const assigneeMap: Record<string, { assigned: number; resolved: number; totalHours: number }> = {};
      tickets.filter(t => t.assigned_to).forEach(t => {
        const name = assigneeNames[t.assigned_to!] || t.assigned_to!;
        if (!assigneeMap[name]) assigneeMap[name] = { assigned: 0, resolved: 0, totalHours: 0 };
        assigneeMap[name].assigned++;
        if (['RESOLVED','CLOSED'].includes(t.status) && t.resolved_at) {
          assigneeMap[name].resolved++;
          assigneeMap[name].totalHours += (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        }
      });
      const by_assignee = Object.entries(assigneeMap).map(([name, v]) => ({
        name, assigned: v.assigned, resolved: v.resolved,
        avg_hours: v.resolved > 0 ? Math.round(v.totalHours / v.resolved * 10) / 10 : 0,
      }));

      // Escalated tickets
      const escalated_tickets = tickets
        .filter(t => t.escalated_at)
        .map(t => ({
          ticket_no: t.ticket_no,
          category:  t.category,
          hours_open: Math.round((new Date().getTime() - new Date(t.created_at).getTime()) / 3600000),
          status: t.status,
        }));

      // Pending (still open)
      const pending_tickets = tickets
        .filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status))
        .map(t => ({
          ticket_no:   t.ticket_no,
          category:    t.category,
          days_open:   Math.round((new Date().getTime() - new Date(t.created_at).getTime()) / 86400000),
          status:      t.status,
          assigned_to: t.assigned_to ? (assigneeNames[t.assigned_to] || 'Tidak ditetapkan') : 'Tidak ditetapkan',
        }));

      const top_comments = tickets
        .filter(t => t.rating_comment && (t.rating ?? 0) >= 4)
        .slice(0, 5)
        .map(t => ({ comment: t.rating_comment!, rating: t.rating! }));

      setData({
        total_received, total_resolved, total_cancelled, total_pending,
        resolution_rate, avg_hours, escalated_count, sla_breach_count,
        avg_rating, satisfied_count, neutral_count, unsatisfied_count,
        by_category, by_status, by_assignee, escalated_tickets, pending_tickets, top_comments,
      });
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const generatedAt = format(new Date(), "dd/MM/yyyy 'pukul' HH:mm");

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}>
                <BarChart3 className="w-5 h-5" style={{ color: TEAL }} />
              </div>
              <div>
                <motion.h1 className="text-2xl font-black text-slate-50 tracking-tight">
                  Laporan Prestasi E-Kebajikan
                </motion.h1>
                <p className="text-xs text-slate-500">Edisi: <span className="font-bold text-slate-300 capitalize">{monthLabel}</span> · Dijana: {generatedAt}</p>
              </div>
            </div>
          </div>

          {/* Month Nav */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMonthOffset(o => o + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-slate-200 min-w-[130px] text-center capitalize">{monthLabel}</span>
            <button
              onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {data ? (
              <PDFDownloadLink
                document={<KebajikanReportPDF data={data} monthLabel={monthLabel} generatedAt={generatedAt} />}
                fileName={`Laporan_Kebajikan_${monthLabel.replace(' ','_')}.pdf`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors hover:opacity-80"
                style={{ background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.2)', color: TEAL }}
              >
                {({ loading }) => (
                  <>
                    <FileDown className={cn("w-3.5 h-3.5", loading && "animate-bounce")} /> 
                    {loading ? 'Menjana PDF...' : 'Muat Turun PDF'}
                  </>
                )}
              </PDFDownloadLink>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border opacity-50 cursor-not-allowed"
                style={{ background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.2)', color: TEAL }}
              >
                <FileDown className="w-3.5 h-3.5" /> Muat Turun PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
        </div>
      ) : !data ? (
        <GlassCard className="text-center py-20 text-slate-500">Tiada data untuk bulan ini.</GlassCard>
      ) : (
        <div className="space-y-8">

          {/* 1. Ringkasan Eksekutif */}
          <GlassCard>
            <SectionTitle num="1" title="Ringkasan Eksekutif" subtitle={`Keseluruhan aduan bagi bulan ${monthLabel}`} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Diterima',    value: data.total_received,  icon: BarChart3,    color: '#6366F1' },
                { label: 'Total Diselesaikan',value: data.total_resolved,  icon: CheckCircle2, color: '#10B981' },
                { label: 'Masih Tertunggak',  value: data.total_pending,   icon: Clock,        color: '#F59E0B' },
                { label: 'Kadar Penyelesaian',value: `${data.resolution_rate}%`, icon: TrendingUp, color: TEAL },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="rounded-2xl p-5 border" style={{ background: `rgba(${hexStr(s.color)}, 0.04)`, borderColor: `rgba(${hexStr(s.color)}, 0.15)` }}>
                    <s.icon className="w-5 h-5 mb-3" style={{ color: s.color }} />
                    <p className="text-2xl font-black text-slate-50 mb-1">{s.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="rounded-2xl p-4 border border-white/5 bg-white/[0.01] text-center">
                <p className="text-xl font-black text-slate-200">{data.avg_hours}j</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Purata Masa Selesai</p>
              </div>
              <div className="rounded-2xl p-4 border border-white/5 bg-white/[0.01] text-center">
                <p className="text-xl font-black text-red-400">{data.escalated_count}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Kes Diescalate</p>
              </div>
              <div className="rounded-2xl p-4 border border-white/5 bg-white/[0.01] text-center">
                <p className="text-xl font-black text-slate-400">{data.total_cancelled}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Kes Dibatal</p>
              </div>
            </div>
          </GlassCard>

          {/* 2. Analisis Mengikut Kategori */}
          <GlassCard>
            <SectionTitle num="2" title="Analisis Mengikut Kategori" />
            {data.by_category.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Tiada data</p>
            ) : (
              <div className="space-y-3">
                {data.by_category.sort((a, b) => b.total - a.total).map((c, i) => {
                  const pct = Math.round((c.total / data.total_received) * 100);
                  return (
                    <div key={c.category} className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <p className="text-sm font-bold text-slate-300 w-48 flex-shrink-0">{KEBAJIKAN_CATEGORY_LABELS[c.category as KebajikanTicketCategory] || c.category}</p>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-black text-slate-400 w-8 text-right">{c.total}</span>
                      <span className="text-[10px] font-black text-slate-600 w-10 text-right">{pct}%</span>
                      <span className="text-[10px] text-emerald-400 w-20 text-right">{c.resolved} selesai</span>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* 3. Analisis Mengikut Status */}
          <GlassCard>
            <SectionTitle num="3" title="Analisis Mengikut Status" subtitle="Keadaan tiket pada akhir bulan" />
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.by_status.map(s => ({ ...s, name: STATUS_LABEL[s.status] || s.status }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.by_status.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* 4. Prestasi SLA */}
          <GlassCard>
            <SectionTitle num="4" title="Prestasi SLA" subtitle="48j = Warning · 72j = Escalation" />
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 text-center">
                <p className="text-2xl font-black text-emerald-400">
                  {data.total_resolved > 0 ? Math.round(((data.total_resolved - data.sla_breach_count) / data.total_resolved) * 100) : 0}%
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Dalam SLA</p>
              </div>
              <div className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 text-center">
                <p className="text-2xl font-black text-amber-400">{data.sla_breach_count}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Melebihi SLA</p>
              </div>
              <div className="rounded-2xl p-4 border border-red-500/20 bg-red-500/5 text-center">
                <p className="text-2xl font-black text-red-400">{data.escalated_count}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Diescalate</p>
              </div>
            </div>
          </GlassCard>

          {/* 5. Tiket Diescalate */}
          <GlassCard>
            <SectionTitle num="5" title="Tiket Diescalate" subtitle="Tiket yang melebihi had masa 72 jam" />
            {data.escalated_tickets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">✅ Tiada tiket diescalate bulan ini</p>
            ) : (
              <div className="space-y-2">
                {data.escalated_tickets.map(t => (
                  <div key={t.ticket_no} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-red-500/10 bg-red-500/5">
                    <span className="text-xs font-black text-red-400">{t.ticket_no}</span>
                    <span className="text-xs text-slate-400 flex-1">{KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category}</span>
                    <span className="text-xs text-slate-500">{t.hours_open}j dibuka</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{STATUS_LABEL[t.status] || t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 6. Prestasi Exco & Pegawai */}
          <GlassCard>
            <SectionTitle num="6" title="Prestasi Exco & Pegawai" subtitle="Jumlah tiket di-assign, diselesaikan, purata masa" />
            {data.by_assignee.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Tiada data penugasan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Nama</th>
                      <th className="text-right py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Di-assign</th>
                      <th className="text-right py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Selesai</th>
                      <th className="text-right py-2 pl-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Purata Masa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_assignee.map(a => (
                      <tr key={a.name} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-300">{a.name}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{a.assigned}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">{a.resolved}</td>
                        <td className="py-3 pl-4 text-right text-slate-400">{a.avg_hours > 0 ? `${a.avg_hours}j` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* 7. Penilaian Pelajar */}
          <GlassCard>
            <SectionTitle num="7" title="Penilaian Pelajar" subtitle="Rating kepuasan setelah kes diselesaikan" />
            {data.avg_rating === null ? (
              <p className="text-sm text-slate-500 text-center py-8">Belum ada penilaian</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-black text-slate-50">{data.avg_rating}</p>
                    <div className="flex gap-0.5 justify-center mt-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-4 h-4', (data.avg_rating ?? 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-white/10')} />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Purata Rating</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400 w-20">😊 Puas Hati</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${data.avg_rating ? Math.round((data.satisfied_count / (data.satisfied_count + data.neutral_count + data.unsatisfied_count)) * 100) : 0}%` }} /></div>
                      <span className="text-xs text-slate-400">{data.satisfied_count}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-400 w-20">😐 Neutral</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-400" style={{ width: `${data.avg_rating ? Math.round((data.neutral_count / (data.satisfied_count + data.neutral_count + data.unsatisfied_count)) * 100) : 0}%` }} /></div>
                      <span className="text-xs text-slate-400">{data.neutral_count}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-400 w-20">😞 Tidak Puas</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-red-500" style={{ width: `${data.avg_rating ? Math.round((data.unsatisfied_count / (data.satisfied_count + data.neutral_count + data.unsatisfied_count)) * 100) : 0}%` }} /></div>
                      <span className="text-xs text-slate-400">{data.unsatisfied_count}</span>
                    </div>
                  </div>
                </div>
                {data.top_comments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Ulasan Terpilih</p>
                    {data.top_comments.map((c, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', c.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-white/10')} />)}
                        </div>
                        <p className="text-xs text-slate-400 italic">"{c.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* 8. Tiket Masih Tertunggak */}
          <GlassCard>
            <SectionTitle num="8" title="Tiket Masih Tertunggak" subtitle="Perlu tindakan bulan hadapan" />
            {data.pending_tickets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">✅ Semua tiket telah selesai</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['No. Tiket','Kategori','Hari Dibuka','Status','Ditetapkan Kepada'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pending_tickets.map(t => (
                      <tr key={t.ticket_no} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 pr-4 font-black text-xs text-teal-400">{t.ticket_no}</td>
                        <td className="py-3 pr-4 text-xs text-slate-400">{KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category}</td>
                        <td className="py-3 pr-4 text-xs text-slate-400">{t.days_open}h</td>
                        <td className="py-3 pr-4 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black">{STATUS_LABEL[t.status] || t.status}</span>
                        </td>
                        <td className="py-3 text-xs text-slate-400">{t.assigned_to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

        </div>
      )}
    </div>
  );
}

function hexStr(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
