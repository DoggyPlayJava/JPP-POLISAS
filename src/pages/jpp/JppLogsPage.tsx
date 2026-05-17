import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Search, ShieldCheck, AlertTriangle, Activity, Trash2, User, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn, API_BASE_URL } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

// ── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  club_name: string | null;
  created_at: string;
  full_name: string | null;
  role: string | null;
  metadata?: any;
  _isAnomaly?: boolean;
  _anomalyReason?: string;
}

interface AnomalyAlert { user: string; reason: string; count: number; }

// ── Anomaly Scanner ───────────────────────────────────────────────────────────
function scanAnomalies(logs: LogEntry[]): { flagged: Set<string>; alerts: AnomalyAlert[] } {
  const flagged = new Set<string>();
  const alerts: AnomalyAlert[] = [];
  const WINDOW_MS = 5 * 60 * 1000; // 5 minit

  // 1. Banyak DELETE dalam masa singkat
  const deleteGroups: Record<string, LogEntry[]> = {};
  logs.forEach(l => {
    if (l.action_type?.includes('DELETE') || l.action_type?.includes('DISSOLVE') || l.action_type?.includes('KICK')) {
      const key = `${l.full_name}`;
      if (!deleteGroups[key]) deleteGroups[key] = [];
      deleteGroups[key].push(l);
    }
  });
  Object.entries(deleteGroups).forEach(([user, entries]) => {
    entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 0; i < entries.length - 2; i++) {
      const t0 = new Date(entries[i].created_at).getTime();
      const t2 = new Date(entries[i + 2].created_at).getTime();
      if (t2 - t0 <= WINDOW_MS) {
        entries.slice(i, i + 3).forEach(e => flagged.add(e.id));
        alerts.push({ user, reason: '3+ tindakan padam dalam 5 minit', count: entries.length });
        break;
      }
    }
  });

  // 2. Tindakan waktu pelik (12am – 5am)
  logs.forEach(l => {
    const hour = new Date(l.created_at).getHours();
    if (hour >= 0 && hour < 5) {
      flagged.add(l.id);
      if (!alerts.find(a => a.user === l.full_name && a.reason.includes('waktu pelik'))) {
        alerts.push({ user: l.full_name || 'Unknown', reason: 'Tindakan pada waktu pelik (12am–5am)', count: 1 });
      }
    }
  });

  return { flagged, alerts };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function JppLogsPage() {
  const { profile } = useAuth();
  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [logSearch, setLogSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_logs')
      .select('id, action_type, entity_type, entity_id, details, club_name, created_at, full_name, role, metadata')
      .order('created_at', { ascending: false })
      .limit(200);

    const rows: LogEntry[] = (data || []).map(l => ({ ...l, profiles: { full_name: l.full_name, role: l.role } }));
    setLogs(rows);

    const { flagged, alerts } = scanAnomalies(rows);
    setFlaggedIds(flagged);
    setAnomalyAlerts(alerts);

    // Hantar emel jika ada anomali dan belum dihantar dalam sesi ini
    if (alerts.length > 0 && !sessionStorage.getItem('anomaly_email_sent')) {
      sendAnomalyEmail(alerts);
    }

    setLoading(false);
  };

  const sendAnomalyEmail = async (alerts: AnomalyAlert[]) => {
    try {
      await fetch(`${API_BASE_URL}/api/notify-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts, sentAt: new Date().toISOString() })
      });
      sessionStorage.setItem('anomaly_email_sent', '1');
      setEmailSent(true);
      toast.error(`⚠️ ${alerts.length} anomali dikesan! Emel amaran dihantar.`, { duration: 6000 });
    } catch (_) {
      // Senyap — jangan ganggu UX jika edge function belum deploy
    }
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiSummary('');
    try {
      const recentLogs = logs.slice(0, 25).map(l =>
        `[${new Date(l.created_at).toLocaleDateString('ms-MY')}] ${l.full_name || 'System'} (${l.role || '-'}) → ${l.action_type} | ${l.entity_type} | ${l.details || '-'}`
      ).join('\n');
      const response = await fetch(`${API_BASE_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proxy',
          payload: {
            task: 'summarize_report',
            data: {
              arahan: 'Sila buat ringkasan naratif aktiviti dalam log sistem ini. Gunakan Bahasa Melayu yang profesional. JANGAN tulis perenggan yang panjang meleret. Gunakan bullet points (•) untuk menyenaraikan aktiviti penting. Gunakan **bold** untuk nama kelab atau modul. Asingkan aktiviti biasa dengan aktiviti yang mencurigakan (jika ada).',
              log_terbaru: recentLogs
            }
          }
        })
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed');
      setAiSummary(resData.result || 'Tiada ringkasan dijana.');
    } catch (e) {
      setAiSummary('Gagal jana ringkasan AI.');
    }
    setAiLoading(false);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount = logs.filter(l => new Date(l.created_at) >= today).length;
  const deleteCount = logs.filter(l => l.action_type?.includes('DELETE') || l.action_type?.includes('DISSOLVE')).length;
  const userCounts: Record<string, number> = {};
  logs.forEach(l => { if (l.full_name) userCounts[l.full_name] = (userCounts[l.full_name] || 0) + 1; });
  const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const lastLog = logs[0] ? new Date(logs[0].created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : '-';

  // ── Unique users & actions for filter dropdowns ─────────────────────────────
  const uniqueUsers = [...new Set(logs.map(l => l.full_name).filter(Boolean))];
  const uniqueActions = [...new Set(logs.map(l => l.action_type).filter(Boolean))];

  // ── Filtered ─────────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(log => {
    const matchesTab = activeTab === 'Semua' || log.entity_type === activeTab;
    const matchesSearch =
      log.details?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.full_name?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action_type?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(logSearch.toLowerCase());
    const matchesAction = !filterAction || log.action_type === filterAction;
    const matchesUser = !filterUser || log.full_name === filterUser;
    return matchesTab && matchesSearch && matchesAction && matchesUser;
  });

  // ── Module badge colour ───────────────────────────────────────────────────────
  const moduleColor = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('polymart') || t.includes('pesanan') || t.includes('vendor')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (t.includes('kebajikan') || t.includes('tiket')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (t.includes('kelab') || t.includes('karnival')) return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
    if (t.includes('pos')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (t.includes('polyrider') || t.includes('rider')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (t.includes('polymaps') || t.includes('bangunan') || t.includes('lokasi')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (t.includes('takwim') || t.includes('akademik')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (t.includes('jpp') || t.includes('admin')) return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    if (t.includes('sistem') || t.includes('keusahawanan')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-white/5 text-white/60 border-white/10';
  };

  // ── Action badge colour ───────────────────────────────────────────────────────
  const actionColor = (action: string) => {
    if (action?.includes('DELETE') || action?.includes('DISSOLVE') || action?.includes('REJECT') || action?.includes('KICK') || action?.includes('SUSPEND') || action?.includes('REMOVE') || action?.includes('DEACTIVATE')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (action?.includes('UPDATE') || action?.includes('APPROVE') || action?.includes('SETTINGS') || action?.includes('RESUME') || action?.includes('RESOLVE') || action?.includes('ACTIVATE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action?.includes('CREATE') || action?.includes('ADD') || action?.includes('ASSIGN') || action?.includes('BULK')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    return 'bg-white/5 text-white/50 border-white/10';
  };

  const renderDetails = (log: LogEntry) => {
    const text = log.details?.trim();
    const clubBadge = log.club_name ? (
      <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20 text-[9px] font-black uppercase tracking-widest">
        {log.club_name}
      </span>
    ) : null;

    if (!text) {
      const fallbacks: Record<string, string> = {
        STATUS_UPDATE: `Status tiket dikemaskini${log.entity_id ? ` (ID: ${log.entity_id.slice(0, 8)}…)` : ''}`,
        UPDATE_CLUB: 'Maklumat kelab dikemaskini',
        RESET_MERIT: 'Merit ahli telah di-reset',
        MANAGE_COMMITTEE: 'Barisan kepimpinan dikemaskini',
        MEMBER_KICKED: 'Ahli telah dikeluarkan dari kelab',
        SETTINGS_UPDATED: 'Tetapan sistem dikemaskini.',
        TRANSACTION_CREATE: 'Transaksi baharu dicipta.',
        PRODUCT_ADD: 'Produk baharu ditambah.',
        PRODUCT_EDIT: 'Produk dikemaskini.',
        STOCK_EDIT: 'Stok produk dikemaskini.',
        COHORT_DISSOLVED: 'Kohort telah dibubarkan',
      };
      const fallbackText = fallbacks[log.action_type] || 'Tiada butiran tambahan';
      return (
        <span className="italic text-white/30 flex items-center flex-wrap gap-1">
          {fallbackText}{clubBadge && !fallbackText.includes('.') ? '.' : ''} {clubBadge}
        </span>
      );
    }
    const regex = /\[(.*?)\]/g;
    if (text.match(regex)) {
      const parts = text.split(regex);
      return (
        <span className="leading-relaxed flex items-center flex-wrap gap-1">
          {parts.map((part, i) => i % 2 === 1
            ? <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase tracking-widest">#{part}</span>
            : <span key={i}>{part}</span>
          )}
          {clubBadge}
        </span>
      );
    }
    return <span className="flex items-center flex-wrap gap-1">{text} {clubBadge}</span>;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">
      Memuat Audit Trail...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5" style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2), color: themeColor }}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">Audit & Pemantauan Sistem</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Jejak aktiviti pentadbiran dan keselamatan</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl border-white/10 text-white/50 hover:text-white bg-transparent text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Muat Semula
              </Button>
              <Button size="sm" onClick={handleAiSummary} disabled={aiLoading}
                className="rounded-xl text-xs font-black uppercase tracking-widest"
                style={{ background: hexToRgba(themeColor, 0.8) }}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {aiLoading ? 'Menjana...' : 'Ringkasan AI'}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── AI Summary ── */}
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white/70 leading-relaxed font-medium">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Ringkasan Analitik AI
            </p>
            <div className="space-y-3 prose-p:my-2 prose-ul:my-2 prose-li:ml-4 prose-li:list-disc marker:text-white/30 prose-strong:text-white prose-strong:font-bold">
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* ── Anomaly Banner ── */}
        {anomalyAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">{anomalyAlerts.length} Anomali Dikesan</span>
              {emailSent && <span className="ml-auto text-[10px] text-rose-400/60">Emel amaran dihantar ✓</span>}
            </div>
            {anomalyAlerts.map((a, i) => (
              <p key={i} className="text-[11px] text-rose-300/70 font-medium pl-6">
                • <span className="font-bold text-rose-300">{a.user}</span> — {a.reason}
              </p>
            ))}
          </motion.div>
        )}

        {/* ── Stats Bar ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: 'Aktiviti Hari Ini', value: todayCount, color: 'text-emerald-400' },
            { icon: Trash2, label: 'Tindakan Padam', value: deleteCount, color: 'text-rose-400' },
            { icon: User, label: 'Pengguna Paling Aktif', value: topUser, color: 'text-amber-400', small: true },
            { icon: Clock, label: 'Log Terbaru', value: lastLog, color: 'text-sky-400', small: true },
          ].map(({ icon: Icon, label, value, color, small }) => (
            <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-2">
              <Icon className={cn('w-4 h-4', color)} />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
              <p className={cn('font-black', small ? 'text-sm truncate' : 'text-2xl', color)}>{value}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Filters ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input placeholder="Cari log..." value={logSearch} onChange={e => setLogSearch(e.target.value)}
              className="pl-11 h-11 bg-black/40 border-white/10 rounded-2xl text-sm font-medium" />
          </div>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="h-11 px-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white/70 font-medium focus:outline-none">
            <option value="">Semua Tindakan</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="h-11 px-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white/70 font-medium focus:outline-none">
            <option value="">Semua Pengguna</option>
            {uniqueUsers.map(u => <option key={u} value={u!}>{u}</option>)}
          </select>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['Semua', 'Karnival/Kelab', 'Keusahawanan', 'Kebajikan', 'POS System', 'JPP Admin', 'PolyRider', 'PolyMaps', 'PolyMart', 'Takwim', 'Akademik'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border',
                activeTab === tab ? 'bg-white/10 text-white border-white/20' : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5')}
              style={activeTab === tab ? { backgroundColor: hexToRgba(themeColor, 0.2), color: themeColor, borderColor: hexToRgba(themeColor, 0.5) } : {}}>
              {tab}
            </button>
          ))}
        </motion.div>

        {/* ── Table ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="border border-white/5 bg-white/[0.01] rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh] rounded-[2rem] custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-black/40 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4 whitespace-nowrap">Timestamp</th>
                  <th className="px-5 py-4">Tindakan</th>
                  <th className="px-5 py-4">Modul</th>
                  <th className="px-5 py-4">Pelaksana</th>
                  <th className="px-5 py-4">Butiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-white/30">
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck className="w-8 h-8 opacity-50" />
                      <p className="text-[10px] uppercase tracking-widest font-black">Tiada rekod dijumpai</p>
                    </div>
                  </td></tr>
                ) : filteredLogs.map(log => {
                  const isAnomaly = flaggedIds.has(log.id);
                  return (
                    <tr key={log.id} className={cn('transition-colors group', isAnomaly ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-white/[0.02]')}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isAnomaly && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                          <span className="text-white/50 text-[11px] font-mono">{new Date(log.created_at).toLocaleString('ms-MY')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border', actionColor(log.action_type))}>
                          {log.action_type || 'LOG'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border', moduleColor(log.entity_type))}>
                          {log.entity_type || 'Umum'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-6 h-6 rounded flex items-center justify-center border shrink-0',
                            log.full_name ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/10'
                          )}>
                            <span className={cn('text-[9px] font-black', log.full_name ? 'text-indigo-400' : 'text-white/30')}>
                              {(log.full_name || log.metadata?.actor_label || 'S')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white/80">
                              {log.full_name || (log.metadata?.actor_label ? String(log.metadata.actor_label) : 'Sistem')}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                              {log.role || (log.metadata?.backfill ? 'REKOD LAMA' : 'SYSTEM')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-white/60 font-medium break-words max-w-xs">
                        {renderDetails(log)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-white/5 text-[10px] text-white/20 font-black uppercase tracking-widest">
            {filteredLogs.length} rekod dipaparkan · {logs.length} jumlah dimuatkan
          </div>
        </motion.div>

      </div>
    </div>
  );
}
