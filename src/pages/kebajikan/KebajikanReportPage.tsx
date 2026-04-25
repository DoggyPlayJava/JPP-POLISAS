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
  ClipboardList, Filter, UserCheck, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { KEBAJIKAN_THEME_COLOR, KEBAJIKAN_CATEGORY_LABELS, KebajikanTicketCategory, KebajikanPic, KebajikanTicket } from '@/types';
import { cn } from '@/lib/utils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { KebajikanReportPDF } from '@/components/pdf/KebajikanReportPDF';
import { KebajikanPicReportPDF, type PicReportTicket } from '@/components/pdf/KebajikanPicReportPDF';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


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
  PENDING_EXTERNAL: 'Menunggu Pihak Lain',
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
  const { isKediamanExco, isSuperAdmin, isYdp, isKebajikanExco, user, profile } = useAuth();
  const generatedByName = profile?.full_name || user?.email || 'Exco Kebajikan';
  const now   = new Date();
  const [activeTab, setActiveTab] = useState<'bulanan' | 'pic'>('bulanan');
  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData]         = useState<ReportData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [rawTickets, setRawTickets] = useState<any[]>([]);

  // ── PIC Report state ─────────────────────────────────────────────────
  const [picTickets, setPicTickets]         = useState<KebajikanTicket[]>([]);
  const [picPresets, setPicPresets]         = useState<KebajikanPic[]>([]);
  const [picLoading, setPicLoading]         = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  // Filters for PIC tab
  const [picMonthOffset, setPicMonthOffset] = useState(0);
  const [picCatFilter, setPicCatFilter]     = useState('ALL');
  const [picJabatanFilter, setPicJabatanFilter] = useState('ALL');
  const [picStatusFilter, setPicStatusFilter] = useState('ALL');
  // PIC report form
  const [reportPicName, setReportPicName]   = useState('');
  const [reportPicId, setReportPicId]       = useState('');
  const [reportPicTitle, setReportPicTitle] = useState('');

  const targetMonth = subMonths(now, monthOffset);
  const monthStart  = startOfMonth(targetMonth).toISOString();
  const monthEnd    = endOfMonth(targetMonth).toISOString();
  const monthLabel  = format(targetMonth, 'MMMM yyyy', { locale: ms });

  // ─── Helper: apply header row style ───────────────────────────────────────
  const styleHeader = (ws: ExcelJS.Worksheet, row: ExcelJS.Row, bgHex: string) => {
    row.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    row.height = 22;
  };

  const styleDataRow = (row: ExcelJS.Row, shade: boolean) => {
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: shade ? 'FFF1F5F9' : 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'hair' }, bottom: { style: 'hair' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 9 };
    });
    row.height = 18;
  };

  const addCoverSheet = (wb: ExcelJS.Workbook, title: string, subtitle: string, genBy: string) => {
    const ws = wb.addWorksheet('Muka Hadapan');
    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = 'JABATAN PERWAKILAN PELAJAR (JPP) POLISAS';
    ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = 'UNIT E-KEBAJIKAN';
    ws.getCell('A2').font = { bold: true, size: 12, color: { argb: 'FF2DD4BF' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.mergeCells('A3:F3');
    ws.getCell('A3').value = title.toUpperCase();
    ws.getCell('A3').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F8F5' } };
    ws.getRow(3).height = 32;

    ws.mergeCells('A4:F4');
    ws.getCell('A4').value = subtitle;
    ws.getCell('A4').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['Tarikh Jana:', format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: ms })]);
    ws.addRow(['Dijana Oleh:', genBy]);
    ws.addRow(['Sistem:', 'Portal E-Kebajikan JPP POLISAS']);

    ws.getColumn('A').width = 22;
    [2,3,4,5,6].forEach(i => { ws.getColumn(i).width = 18; });
  };

  // ── Excel Export: Laporan Bulanan ─────────────────────────────────────────
  const exportMonthlyExcel = async () => {
    if (!data) return;
    const wb = new ExcelJS.Workbook();
    wb.creator = generatedByName;
    wb.created = new Date();
    const TEAL_ARGB = 'FF0D9488';
    const DARK_ARGB = 'FF1E293B';
    const RED_ARGB  = 'FFDC2626';

    // Sheet 1: Muka Hadapan
    addCoverSheet(wb, `Laporan Bulanan E-Kebajikan`, monthLabel, generatedByName);

    // Sheet 2: Ringkasan Eksekutif
    const ws2 = wb.addWorksheet('Ringkasan Eksekutif');
    ws2.mergeCells('A1:C1');
    ws2.getCell('A1').value = `RINGKASAN EKSEKUTIF — ${monthLabel.toUpperCase()}`;
    ws2.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_ARGB } };
    ws2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;
    ws2.addRow([]);

    const summaryItems = [
      ['Jumlah Aduan Diterima',   data.total_received],
      ['Jumlah Aduan Diselesaikan', data.total_resolved],
      ['Masih Tertunggak',         data.total_pending],
      ['Kes Dibatalkan',           data.total_cancelled],
      ['Kes Diescalate',           data.escalated_count],
      ['Kadar Penyelesaian (%)',   data.resolution_rate],
      ['Purata Masa Selesai (jam)', data.avg_hours],
      ['Rating Purata Pelajar',    data.avg_rating ?? 'Tiada Data'],
      ['Pelajar Berpuas Hati (≥4★)', data.satisfied_count],
      ['Neutral (3★)',             data.neutral_count],
      ['Tidak Berpuas Hati (≤2★)', data.unsatisfied_count],
    ];
    const hRow2 = ws2.addRow(['Petunjuk Prestasi', 'Nilai']);
    styleHeader(ws2, hRow2, TEAL_ARGB);
    summaryItems.forEach((item, i) => {
      const r = ws2.addRow(item);
      styleDataRow(r, i % 2 === 0);
    });
    ws2.getColumn(1).width = 35;
    ws2.getColumn(2).width = 20;

    // Sheet 3: Senarai Semua Tiket
    const ws3 = wb.addWorksheet('Senarai Semua Tiket');
    const h3 = ws3.addRow(['No.','No. Tiket','Tarikh Hantar','Kategori','Tajuk Aduan','Nama Pengadu','No. Matrik','Status','Keutamaan','Diselesaikan Pada','Masa Selesai (j)','Rating']);
    styleHeader(ws3, h3, DARK_ARGB);
    ws3.views = [{ state: 'frozen', ySplit: 1 }];
    const assigneeNamesCopy: Record<string,string> = {};
    rawTickets.forEach((t: any, i: number) => {
      const resolvedHours = t.resolved_at
        ? Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 360000) / 10
        : null;
      const r = ws3.addRow([
        i + 1,
        t.ticket_no,
        format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
        KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category,
        t.title || '—',
        t.full_name || '—',
        t.matric_no || '—',
        STATUS_LABEL[t.status] || t.status,
        t.priority,
        t.resolved_at ? format(new Date(t.resolved_at), 'dd/MM/yyyy') : '—',
        resolvedHours ?? '—',
        t.rating ? `${t.rating}★` : '—',
      ]);
      styleDataRow(r, i % 2 === 0);
      if (t.status === 'ESCALATED') {
        r.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' }, size: 9 };
      } else if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        r.getCell(8).font = { bold: true, color: { argb: 'FF059669' }, size: 9 };
      }
    });
    [5,8,8,16,28,18,14,18,10,16,14,8].forEach((w, i) => { ws3.getColumn(i+1).width = w; });
    ws3.autoFilter = { from: 'A1', to: 'L1' };

    // Sheet 4: Analisis Mengikut Kategori
    const ws4 = wb.addWorksheet('Mengikut Kategori');
    const h4 = ws4.addRow(['Kategori','Jumlah Aduan','Diselesaikan','Belum Selesai','% Selesai']);
    styleHeader(ws4, h4, TEAL_ARGB);
    data.by_category.forEach((c, i) => {
      const pct = c.total > 0 ? Math.round(c.resolved / c.total * 100) : 0;
      const r = ws4.addRow([
        KEBAJIKAN_CATEGORY_LABELS[c.category as KebajikanTicketCategory] || c.category,
        c.total, c.resolved, c.total - c.resolved, `${pct}%`,
      ]);
      styleDataRow(r, i % 2 === 0);
    });
    [28,15,15,15,12].forEach((w,i) => { ws4.getColumn(i+1).width = w; });

    // Sheet 5: Prestasi Exco
    if (data.by_assignee.length) {
      const ws5 = wb.addWorksheet('Prestasi Exco');
      const h5 = ws5.addRow(['Nama Exco','Tiket Diagihkan','Tiket Diselesaikan','% Penyelesaian','Purata Masa (j)']);
      styleHeader(ws5, h5, DARK_ARGB);
      data.by_assignee.sort((a,b) => b.resolved - a.resolved).forEach((a, i) => {
        const pct = a.assigned > 0 ? Math.round(a.resolved / a.assigned * 100) : 0;
        const r = ws5.addRow([a.name, a.assigned, a.resolved, `${pct}%`, a.avg_hours]);
        styleDataRow(r, i % 2 === 0);
      });
      [28,18,18,16,18].forEach((w,i) => { ws5.getColumn(i+1).width = w; });
    }

    // Sheet 6: Kes Escalated
    if (data.escalated_tickets.length) {
      const ws6 = wb.addWorksheet('Kes Diescalate');
      const h6 = ws6.addRow(['No. Tiket','Kategori','Status Semasa','Jam Terbuka']);
      styleHeader(ws6, h6, RED_ARGB);
      data.escalated_tickets.forEach((t, i) => {
        const r = ws6.addRow([t.ticket_no, KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category, STATUS_LABEL[t.status] || t.status, t.hours_open]);
        styleDataRow(r, i % 2 === 0);
      });
      [16,24,18,14].forEach((w,i) => { ws6.getColumn(i+1).width = w; });
    }

    // Sheet 7: Kes Tertunggak
    if (data.pending_tickets.length) {
      const ws7 = wb.addWorksheet('Kes Tertunggak');
      const h7 = ws7.addRow(['No. Tiket','Kategori','Status','Hari Terbuka','Diuruskan Oleh']);
      styleHeader(ws7, h7, 'FFF59E0B');
      ws7.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FF0F172A' }, size: 10 }; });
      data.pending_tickets.sort((a,b) => b.days_open - a.days_open).forEach((t, i) => {
        const r = ws7.addRow([t.ticket_no, KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category, STATUS_LABEL[t.status] || t.status, t.days_open, t.assigned_to]);
        styleDataRow(r, i % 2 === 0);
        if (t.days_open >= 7) r.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' }, size: 9 };
      });
      [16,24,18,12,24].forEach((w,i) => { ws7.getColumn(i+1).width = w; });
    }

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Laporan_Kebajikan_${monthLabel.replace(' ','_')}.xlsx`);
  };

  // ── Excel Export: Laporan PIC ─────────────────────────────────────────────
  const exportPicExcel = async (tickets: KebajikanTicket[]) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = generatedByName;
    wb.created = new Date();
    const picMonthLabelLocal = format(subMonths(now, picMonthOffset), 'MMMM yyyy', { locale: ms });
    const TEAL_ARGB = 'FF0D9488';
    const DARK_ARGB = 'FF1E293B';

    // Sheet 1: Muka Hadapan
    addCoverSheet(wb, `Laporan Kepada PIC — ${reportPicName || 'PIC'}`, picMonthLabelLocal, generatedByName);
    const ws0 = wb.getWorksheet('Muka Hadapan')!;
    ws0.addRow([]);
    ws0.addRow(['Nama PIC:',    reportPicName || '—']);
    ws0.addRow(['Jawatan PIC:', reportPicTitle || '—']);
    ws0.addRow(['Jumlah Tiket:', tickets.length]);

    // Sheet 2: Senarai Lengkap Tiket
    const ws2 = wb.addWorksheet('Senarai Tiket');
    const h2 = ws2.addRow(['No.','No. Tiket','Tarikh Hantar','Kategori','Tajuk Aduan','Penerangan Ringkas','Nama Pengadu','No. Matrik','Status','Keutamaan','Tarikh Selesai']);
    styleHeader(ws2, h2, DARK_ARGB);
    ws2.views = [{ state: 'frozen', ySplit: 1 }];
    tickets.forEach((t: any, i: number) => {
      const desc = t.description ? (t.description.length > 120 ? t.description.slice(0,120)+'...' : t.description) : '—';
      const r = ws2.addRow([
        i + 1,
        t.ticket_no,
        format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
        KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category,
        t.title || '—',
        desc,
        t.full_name || '—',
        t.matric_no || '—',
        STATUS_LABEL[t.status] || t.status,
        t.priority,
        t.resolved_at ? format(new Date(t.resolved_at), 'dd/MM/yyyy') : 'Belum Selesai',
      ]);
      styleDataRow(r, i % 2 === 0);
      if (t.status === 'ESCALATED') r.getCell(9).font = { bold: true, color: { argb: 'FFDC2626' }, size: 9 };
      if (['RESOLVED','CLOSED'].includes(t.status)) r.getCell(9).font = { bold: true, color: { argb: 'FF059669' }, size: 9 };
    });
    [5,14,18,22,30,40,20,14,20,12,16].forEach((w,i) => { ws2.getColumn(i+1).width = w; });
    ws2.autoFilter = { from: 'A1', to: 'K1' };

    // Sheet 3: Ringkasan Status
    const ws3 = wb.addWorksheet('Ringkasan Status');
    const h3 = ws3.addRow(['Status','Bilangan','Peratus (%)']);
    styleHeader(ws3, h3, TEAL_ARGB);
    const statMap: Record<string,number> = {};
    tickets.forEach((t:any) => { statMap[t.status] = (statMap[t.status]||0) + 1; });
    Object.entries(statMap).sort((a,b) => b[1]-a[1]).forEach(([s,cnt], i) => {
      const pct = Math.round(cnt / tickets.length * 100);
      const r = ws3.addRow([STATUS_LABEL[s] || s, cnt, `${pct}%`]);
      styleDataRow(r, i % 2 === 0);
    });
    const totalRow = ws3.addRow(['JUMLAH', tickets.length, '100%']);
    totalRow.eachCell(c => { c.font = { bold: true, size: 10 }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F8F5' } }; });
    [28,14,14].forEach((w,i) => { ws3.getColumn(i+1).width = w; });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Laporan_PIC_${(reportPicName||'PIC').replace(/\s+/g,'_')}_${picMonthLabelLocal.replace(' ','_')}.xlsx`);
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tickets in the month — filter berdasarkan unit exco
      let ticketQuery = supabase
        .from('kebajikan_tickets')
        .select(`
          id, ticket_no, category, status, assigned_to, priority, title, description,
          full_name, matric_no, phone, class, gender,
          created_at, resolved_at, escalated_at, rating, rating_comment, cancelled_at
        `)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Auto-filter: KK Exco → kafeteria sahaja; Kebajikan Exco → semua kecuali kafeteria
      if (!isSuperAdmin && !isYdp) {
        if (isKediamanExco) {
          ticketQuery = ticketQuery.eq('handled_by_unit', 'KK');
        } else {
          ticketQuery = ticketQuery.neq('handled_by_unit', 'KK');
        }
      }

      const { data: tickets } = await ticketQuery;

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

      setRawTickets(tickets);
      setData({
        total_received, total_resolved, total_cancelled, total_pending,
        resolution_rate, avg_hours, escalated_count, sla_breach_count,
        avg_rating, satisfied_count, neutral_count, unsatisfied_count,
        by_category, by_status, by_assignee, escalated_tickets, pending_tickets, top_comments,
      });
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, isKediamanExco, isSuperAdmin, isYdp]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── PIC Tab — fetch data ─────────────────────────────────────────────────
  const picTargetMonth  = subMonths(now, picMonthOffset);
  const picMonthStart   = startOfMonth(picTargetMonth).toISOString();
  const picMonthEnd     = endOfMonth(picTargetMonth).toISOString();
  const picMonthLabel   = format(picTargetMonth, 'MMMM yyyy', { locale: ms });

  const fetchPicTabData = useCallback(async () => {
    if (activeTab !== 'pic') return;
    setPicLoading(true);
    try {
      let q = supabase
        .from('kebajikan_tickets')
        .select('id, ticket_no, title, description, category, status, full_name, matric_no, created_at, handled_by_unit, image_urls')
        .gte('created_at', picMonthStart)
        .lte('created_at', picMonthEnd)
        .neq('handled_by_unit', 'KK') // Laporan PIC hanya untuk tiket Kebajikan
        .order('created_at', { ascending: false });
      if (picStatusFilter !== 'ALL') q = q.eq('status', picStatusFilter);
      if (picCatFilter !== 'ALL') q = q.eq('category', picCatFilter);
      const [ticketRes, picRes] = await Promise.all([
        q,
        supabase.from('kebajikan_pics').select('*').eq('is_active', true).order('jabatan_label'),
      ]);
      setPicTickets((ticketRes.data || []) as KebajikanTicket[]);
      setPicPresets((picRes.data || []) as KebajikanPic[]);
    } finally {
      setPicLoading(false);
    }
  }, [activeTab, picMonthStart, picMonthEnd, picStatusFilter, picCatFilter]);

  useEffect(() => { fetchPicTabData(); }, [fetchPicTabData]);

  const toggleTicket = (id: string) => setSelectedTicketIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const selectAll = () => setSelectedTicketIds(new Set(picTickets.map(t => t.id)));
  const selectEscalated = () => setSelectedTicketIds(new Set(picTickets.filter(t => t.status === 'ESCALATED').map(t => t.id)));
  const clearAll = () => setSelectedTicketIds(new Set());
  const selectedTickets = picTickets.filter(t => selectedTicketIds.has(t.id));
  const selectedPic = picPresets.find(p => p.id === reportPicId);

  const KEBAJIKAN_STATUSES = [
    { key: 'ALL', label: 'Semua Status' },
    { key: 'ESCALATED', label: 'Escalated' },
    { key: 'NEW', label: 'Baru' },
    { key: 'IN_PROGRESS', label: 'Dalam Proses' },
    { key: 'WAITING_INFO', label: 'Tunggu Maklumat' },
    { key: 'RESOLVED', label: 'Selesai' },
  ];
  const KEBAJIKAN_CATS = [
    { key: 'ALL', label: 'Semua Kategori' },
    ...Object.entries(KEBAJIKAN_CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
  ];

  const generatedAt = format(new Date(), "dd/MM/yyyy 'pukul' HH:mm");

  // Tab switcher: KK Exco hanya nampak Laporan Bulanan
  const showPicTab = isKebajikanExco || isSuperAdmin || isYdp;

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
                  {isKediamanExco && !isSuperAdmin && !isYdp
                    ? 'Laporan Prestasi Kafeteria'
                    : 'Laporan Prestasi E-Kebajikan'}
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
              <div className="flex flex-wrap items-center gap-2">
                <PDFDownloadLink
                  document={<KebajikanReportPDF data={data} monthLabel={monthLabel} generatedAt={generatedAt} />}
                  fileName={`Laporan_Kebajikan_${monthLabel.replace(' ','_')}.pdf`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors hover:opacity-80"
                  style={{ background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.2)', color: TEAL }}
                >
                  {({ loading }) => (
                    <>
                      <FileDown className={cn("w-3.5 h-3.5", loading && "animate-bounce")} /> 
                      {loading ? 'Menjana PDF...' : 'PDF'}
                    </>
                  )}
                </PDFDownloadLink>
                <button
                  onClick={exportMonthlyExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors hover:opacity-80"
                  style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)', color: '#22C55E' }}
                >
                  <FileDown className="w-3.5 h-3.5" /> Excel
                </button>
              </div>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border opacity-50 cursor-not-allowed"
                style={{ background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.2)', color: TEAL }}
              >
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      {showPicTab && (
        <div className="flex items-center gap-1 mb-8 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] w-fit">
          {[
            { key: 'bulanan', label: 'Laporan Bulanan', icon: BarChart3 },
            { key: 'pic', label: 'Laporan PIC', icon: ClipboardList },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'bulanan' | 'pic')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200',
                activeTab === tab.key
                  ? 'text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              )}
              style={activeTab === tab.key ? { background: TEAL } : {}}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB: Laporan Bulanan ── */}
      {activeTab === 'bulanan' && (
        <>
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
        </>
      )} {/* end activeTab === 'bulanan' */}

      {/* ── TAB: Laporan PIC ── */}
      {activeTab === 'pic' && showPicTab && (
        <div className="space-y-6">

          {/* PIC Tab Header + Month Nav */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-50">Jana Laporan untuk PIC</h2>
              <p className="text-xs text-slate-500 mt-0.5">Pilih tiket, tetapkan PIC, jana PDF untuk edaran</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPicMonthOffset(o => o + 1)} className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-slate-200 min-w-[130px] text-center capitalize">{picMonthLabel}</span>
              <button onClick={() => setPicMonthOffset(o => Math.max(0, o - 1))} disabled={picMonthOffset === 0} className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Penapis Tiket</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Kategori</p>
                <select value={picCatFilter} onChange={e => { setPicCatFilter(e.target.value); setSelectedTicketIds(new Set()); }}
                  className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-teal-500/40">
                  {KEBAJIKAN_CATS.map(c => <option key={c.key} value={c.key} className="bg-slate-800">{c.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Status</p>
                <select value={picStatusFilter} onChange={e => { setPicStatusFilter(e.target.value); setSelectedTicketIds(new Set()); }}
                  className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-teal-500/40">
                  {KEBAJIKAN_STATUSES.map(s => <option key={s.key} value={s.key} className="bg-slate-800">{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Quick Select */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mr-1">Pilih Cepat:</p>
              <button onClick={selectAll} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/10 transition-all">
                ☑ Semua ({picTickets.length})
              </button>
              <button onClick={selectEscalated} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all">
                ⚠ Escalated Sahaja ({picTickets.filter(t => t.status === 'ESCALATED').length})
              </button>
              <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/[0.03] hover:bg-white/5 text-white/30 border border-white/5 transition-all">
                ☐ Bersih Semua
              </button>
              {selectedTicketIds.size > 0 && (
                <span className="ml-auto text-xs font-black" style={{ color: TEAL }}>{selectedTicketIds.size} tiket dipilih</span>
              )}
            </div>
          </GlassCard>

          {/* Ticket Table */}
          <GlassCard>
            {picLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
              </div>
            ) : picTickets.length === 0 ? (
              <p className="text-center text-sm text-white/30 py-12">Tiada tiket untuk bulan dan penapis ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-left w-8"><input type="checkbox" checked={selectedTicketIds.size === picTickets.length && picTickets.length > 0} onChange={e => e.target.checked ? selectAll() : clearAll()} className="accent-teal-400 w-3.5 h-3.5" /></th>
                      <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">No. Tiket</th>
                      <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">Tarikh</th>
                      <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">Kategori</th>
                      <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">Tajuk</th>
                      <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {picTickets.map(t => (
                      <tr key={t.id} onClick={() => toggleTicket(t.id)} className={cn('cursor-pointer transition-colors', selectedTicketIds.has(t.id) ? 'bg-teal-500/5' : 'hover:bg-white/[0.02]')}>
                        <td className="py-3"><input type="checkbox" checked={selectedTicketIds.has(t.id)} onChange={() => toggleTicket(t.id)} onClick={e => e.stopPropagation()} className="accent-teal-400 w-3.5 h-3.5" /></td>
                        <td className="py-3 font-black text-teal-400/80">{t.ticket_no}</td>
                        <td className="py-3 text-white/50">{format(new Date(t.created_at), 'dd/MM/yyyy')}</td>
                        <td className="py-3 text-white/60">{KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category}</td>
                        <td className="py-3 text-white/80 max-w-[200px] truncate">{t.title}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider', t.status === 'ESCALATED' ? 'bg-red-500/15 text-red-400' : t.status === 'RESOLVED' ? 'bg-green-500/15 text-green-400' : t.status === 'NEW' ? 'bg-teal-500/15 text-teal-400' : 'bg-white/5 text-white/40')}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Report Generation Panel */}
          {selectedTicketIds.size > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-5">
                <UserCheck className="w-4 h-4" style={{ color: TEAL }} />
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Jana Laporan</p>
                <span className="ml-auto text-xs font-black" style={{ color: TEAL }}>{selectedTickets.length} tiket dipilih</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Pilih Preset PIC</p>
                  <select value={reportPicId} onChange={e => {
                    setReportPicId(e.target.value);
                    const found = picPresets.find(p => p.id === e.target.value);
                    if (found) { setReportPicName(found.pic_name); setReportPicTitle(found.pic_title || ''); }
                    else { setReportPicName(''); setReportPicTitle(''); }
                  }} className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-teal-500/40">
                    <option value="" className="bg-slate-800">— Pilih atau taip manual —</option>
                    {picPresets.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.jabatan_label} — {p.pic_name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Nama PIC</p>
                  <input value={reportPicName} onChange={e => setReportPicName(e.target.value)} placeholder="Nama PIC..."
                    className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/40 focus:outline-none" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Jawatan PIC</p>
                  <input value={reportPicTitle} onChange={e => setReportPicTitle(e.target.value)} placeholder="cth: Ketua Jabatan JKM..."
                    className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/40 focus:outline-none" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <PDFDownloadLink
                  document={
                    <KebajikanPicReportPDF
                      picName={reportPicName}
                      picTitle={reportPicTitle}
                      jabatanLabel={picPresets.find(p => p.id === reportPicId)?.jabatan_label || reportPicName}
                      picEmail={picPresets.find(p => p.id === reportPicId)?.pic_email || undefined}
                      picPhone={picPresets.find(p => p.id === reportPicId)?.pic_phone || undefined}
                      tickets={selectedTickets as PicReportTicket[]}
                      monthLabel={picMonthLabel}
                      generatedAt={generatedAt}
                      generatedBy={generatedByName}
                    />
                  }
                  fileName={`Laporan_PIC_${reportPicName.replace(/\s+/g,'_') || 'PIC'}_${picMonthLabel.replace(' ','_')}.pdf`}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:brightness-110',
                    !reportPicName.trim() && 'opacity-40 pointer-events-none'
                  )}
                  style={{ background: TEAL, color: '#0f172a' }}
                >
                  {({ loading: pdfLoading }) => (
                    <><FileDown className={cn('w-4 h-4', pdfLoading && 'animate-bounce')} />{pdfLoading ? 'Menjana PDF...' : `PDF (${selectedTickets.length} tiket)`}</>
                  )}
                </PDFDownloadLink>
                <button
                  onClick={() => exportPicExcel(selectedTickets)}
                  disabled={selectedTickets.length === 0}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:brightness-110',
                    selectedTickets.length === 0 && 'opacity-40 cursor-not-allowed'
                  )}
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }}
                >
                  <FileDown className="w-4 h-4" /> Excel ({selectedTickets.length} tiket)
                </button>
              </div>
              {!reportPicName.trim() && <p className="text-[10px] text-center text-white/25 mt-2">Sila masukkan nama PIC dahulu</p>}
            </GlassCard>
          )}

        </div>
      )} {/* end activeTab === 'pic' */}

    </div>
  );
}


function hexStr(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
