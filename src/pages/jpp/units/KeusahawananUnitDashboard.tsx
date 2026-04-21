/**
 * KeusahawananUnitDashboard.tsx
 * Dashboard unit Keusahawanan dalam JPP HQ Portal.
 * Menggabungkan KeusahawananAdminPanel dengan enhancements tambahan:
 *  - Pending lama alert (> 7 hari)
 *  - Laporan PolyMart tertunggak alert
 *  - Log audit terkini
 *  - Pengurusan PolyMart
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Logs, Clock, CheckCircle, XCircle, RefreshCw, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { KeusahawananAdminPanel } from '@/pages/keusahawanan/KeusahawananAdminPanel';
import { PolyMartAdminPanel } from '@/pages/polymart/PolyMartAdminPanel';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';

// ── Types ────────────────────────────────────────────────────────────────────
interface PendingOldBusiness {
  id: string;
  name: string;
  created_at: string;
  daysPending: number;
  owner_name?: string;
}

interface AuditLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  business_id?: string;
}

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BUSINESS_APPROVED: { label: 'Diluluskan', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  BUSINESS_REJECTED: { label: 'Ditolak',   color: 'text-rose-600 bg-rose-50',      icon: XCircle   },
};

// ── Main Component ────────────────────────────────────────────────────────────
export function KeusahawananUnitDashboard() {
  const { color } = useExcoTheme();
  const [activeMainTab, setActiveMainTab] = useState<'perniagaan' | 'polymart'>('perniagaan');
  
  const [pendingOld, setPendingOld]       = useState<PendingOldBusiness[]>([]);
  const [auditLogs, setAuditLogs]         = useState<AuditLog[]>([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [loadingExtra, setLoadingExtra]     = useState(true);

  const fetchExtras = async () => {
    setLoadingExtra(true);
    try {
      const threshold7d = subDays(new Date(), 7).toISOString();

      const [oldPendingRes, logsRes, reportsRes] = await Promise.all([
        // Pending lama > 7 hari
        supabase.from('keusahawanan_businesses')
          .select(`
            id, name, created_at,
            profiles:owner_id (full_name)
          `)
          .eq('status', 'PENDING_INTERVIEW')
          .lt('created_at', threshold7d)
          .order('created_at', { ascending: true })
          .limit(10),

        // Log audit terkini
        supabase.from('keusahawanan_logs')
          .select('id, action_type, description, created_at, business_id')
          .order('created_at', { ascending: false })
          .limit(5),
          
        // Laporan PolyMart terbuka
        supabase.from('polymart_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'OPEN')
      ]);

      const now = new Date();
      setPendingOld(
        (oldPendingRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          created_at: b.created_at,
          daysPending: Math.floor((now.getTime() - new Date(b.created_at).getTime()) / 86400000),
          owner_name: b.profiles?.full_name,
        }))
      );
      setAuditLogs((logsRes.data || []) as AuditLog[]);
      setPendingReports(reportsRes.count || 0);
    } catch (e) {
      console.error('Keusahawanan extras fetch error:', e);
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => { fetchExtras(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Tabs Navigation ─── */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl overflow-x-auto relative z-10 w-full scrollbar-hide">
        <button onClick={() => setActiveMainTab('perniagaan')}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
          style={activeMainTab === 'perniagaan' ? { background: color, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
          <Store className="w-4 h-4" /> Senarai Perniagaan
        </button>
        <button onClick={() => setActiveMainTab('polymart')}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all relative"
          style={activeMainTab === 'polymart' ? { background: '#f43f5e', color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
          <ShoppingBag className="w-4 h-4" /> Pengurusan PolyMart
          {pendingReports > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white text-rose-500 rounded-full flex items-center justify-center text-[8px] font-black pointer-events-none">
              {pendingReports}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeMainTab === 'perniagaan' && (
          <motion.div key="perniagaan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* ── Alert: Permohonan lama (> 7 hari) ─── */}
            {!loadingExtra && pendingOld.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                    {pendingOld.length} Permohonan Lama — Menunggu Lebih 7 Hari
                  </p>
                </div>
                <div className="space-y-2">
                  {pendingOld.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{b.name}</p>
                        <p className="text-[10px] text-white/50">{b.owner_name ?? '—'}</p>
                      </div>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                        {b.daysPending} hari
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Main Admin Panel ─── */}
            <KeusahawananAdminPanel />

            {/* ── Log Audit Terkini ─── */}
            {auditLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Logs className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    Log Audit Terkini
                  </p>
                  <button
                    onClick={fetchExtras}
                    className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    title="Muat semula log"
                  >
                    <RefreshCw className="w-3 h-3 text-white/30" />
                  </button>
                </div>
                <div className="space-y-2">
                  {auditLogs.map((log, i) => {
                    const meta = ACTION_META[log.action_type];
                    const Icon = meta?.icon ?? Logs;
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] rounded-2xl px-4 py-3 transition-colors"
                      >
                        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5', meta?.color ?? 'bg-white/5 text-white/40')}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white leading-tight">{log.description}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ms })}
                          </p>
                        </div>
                        {meta && (
                          <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0', meta.color)}>
                            {meta.label}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeMainTab === 'polymart' && (
          <motion.div key="polymart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* ── Alert: Laporan PolyMart ─── */}
            {!loadingExtra && pendingReports > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.03] p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-rose-500">Terdapat {pendingReports} Laporan Produk</p>
                  <p className="text-[10px] text-rose-500/70 mt-0.5 leading-tight">Pengguna telah melaporkan beberapa produk di dalam PolyMart. Sila semak tab 'Laporan' di bawah.</p>
                </div>
              </motion.div>
            )}
            
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-4 sm:p-6 overflow-hidden relative">
              <PolyMartAdminPanel hideHeader />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

