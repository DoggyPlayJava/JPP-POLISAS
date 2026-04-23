import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePosData, StatsData } from '@/hooks/usePosData';
import { hexToRgba } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PosSalesReportPDF } from '@/components/keusahawanan/PosSalesReportPDF';
import { PosSalesReportModal } from '@/components/keusahawanan/PosSalesReportModal';
import {
  DollarSign, Receipt, Package, TrendingUp, CalendarDays,
  AlertTriangle, Layers, ShoppingBag, BarChart3, ChevronRight,
  Wallet, MinusCircle, Plus, Trash2, TrendingDown, FileText, Loader2, Rocket
} from 'lucide-react';
import { type BusinessExpense, type ExpenseCategory } from '@/types';
import toast from 'react-hot-toast';

type Range = '1d' | '7d' | '1m';
const RANGE_LABELS: Record<Range, string> = { '1d': '1 Hari', '7d': '7 Hari', '1m': 'Bulan Ini' };
const PIE_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Sewa', 'Bekalan', 'Pengangkutan', 'Pemasaran', 'Lain-lain'];
const EXPENSE_CAT_COLORS: Record<ExpenseCategory, string> = {
  Sewa: '#7c3aed', Bekalan: '#2563eb', Pengangkutan: '#f59e0b',
  Pemasaran: '#059669', 'Lain-lain': '#dc2626',
};

const EMPTY_EXPENSE_FORM = { amount: '', category: 'Lain-lain' as ExpenseCategory, description: '', expense_date: '' };

function KPICard({ icon: Icon, label, value, sub, color, delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="relative rounded-[1.5rem] p-5 overflow-hidden bg-card border border-border/50 hover:shadow-xl transition-all">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-25 pointer-events-none" style={{ background: color }} />
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ background: hexToRgba(color, 0.1) }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">{label}</p>
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/50 mt-2">{sub}</p>}
    </motion.div>
  );
}

// ── Ads Marketing Upsell Widget ───────────────────────────────────────────────
function AdsMarketingWidget({ stats }: { stats: StatsData }) {
  const [adsPhone, setAdsPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'polymart_ads_phone').single().then(({ data }) => {
      if (data) setAdsPhone(data.value?.replace(/["']/g, '') || '');
    });
  }, []);

  if (!adsPhone) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl p-5 border border-amber-500/30 bg-amber-500/10 shadow-lg mt-2 mb-4 group cursor-pointer"
      onClick={() => window.open(`https://wa.me/${adsPhone}?text=Hai Exco Keusahawanan, saya dari tab analisis jualan POS dan berminat untuk langgan slot iklan PolyMart!`, '_blank')}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">Peluang Pemasaran Cerdas</p>
            <h3 className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 leading-tight">
              Gandakan Pendedahan Produk ke Ribuan Pelajar
            </h3>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/80 mt-1 max-w-lg font-medium leading-relaxed">
              Letakkan produk kedai anda di **Banner Hadapan** PolyMart untuk melonjakkan jumlah pesanan. Slot adalah terhad!
            </p>
          </div>
        </div>
        
        <button className="whitespace-nowrap h-11 px-6 rounded-2xl text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          Letak Iklan Sekarang
        </button>
      </div>
    </motion.div>
  );
}

type Tab = 'jualan' | 'produk' | 'perbelanjaan';

export function PosStatsPage() {
  const { color } = useExcoTheme();
  const { selectedBusiness, isLoading: isBusinessLoading } = useBusinessSwitcher();
  const { profile } = useAuth();
  
  const businessId = selectedBusiness?.id;
  const pos = usePosData(businessId, isBusinessLoading);

  const [tab, setTab] = useState<Tab>('jualan');
  const [range, setRange] = useState<Range>('7d');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Ciri 2: Expense state
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [expForm, setExpForm] = useState({ ...EMPTY_EXPENSE_FORM });

  useEffect(() => {
    if (isBusinessLoading) return;
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    pos.fetchStats(businessId, range).then(s => { setStats(s); setLoading(false); });
  }, [businessId, range, isBusinessLoading]);

  // Fetch expenses when tab or range changes
  useEffect(() => {
    if (tab !== 'perbelanjaan' || !businessId || isBusinessLoading) return;
    loadExpenses();
  }, [tab, businessId, range, isBusinessLoading]);

  const loadExpenses = async () => {
    if (!businessId) return;
    setExpLoading(true);
    const now = new Date();
    const from = new Date(now);
    if (range === '7d') from.setDate(now.getDate() - 6);
    if (range === '1m') from.setDate(1); // 1st day of current month
    const fromDate = from.toISOString().split('T')[0];
    const toDate   = now.toISOString().split('T')[0];
    const data = await pos.fetchExpenses(businessId, fromDate, toDate);
    setExpenses(data);
    setExpLoading(false);
  };

  const getExactDateRange = () => {
    const now = new Date();
    const from = new Date(now);
    if (range === '7d') from.setDate(now.getDate() - 6);
    if (range === '1m') from.setDate(1); // 1st day of current month
    
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${from.toLocaleDateString('ms-MY', opt)} - ${now.toLocaleDateString('ms-MY', opt)}`;
  };

  const handleAddExpense = async () => {
    if (!businessId) return;
    if (!expForm.amount || parseFloat(expForm.amount) <= 0) { toast.error('Masukkan jumlah yang sah.'); return; }
    if (!expForm.description.trim()) { toast.error('Keterangan perbelanjaan wajib diisi.'); return; }
    setExpSaving(true);
    const ok = await pos.addExpense(businessId, {
      amount:       parseFloat(expForm.amount),
      category:     expForm.category,
      description:  expForm.description.trim(),
      expense_date: expForm.expense_date || undefined,
    });
    if (ok) {
      setExpForm({ ...EMPTY_EXPENSE_FORM });
      await loadExpenses();
      // Refresh stats to update P&L
      pos.fetchStats(businessId, range).then(s => setStats(s));
    }
    setExpSaving(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!businessId || !window.confirm('Padam rekod perbelanjaan ini?')) return;
    await pos.deleteExpense(id, businessId);
    await loadExpenses();
    pos.fetchStats(businessId, range).then(s => setStats(s));
  };

  const fmtRM = (v: number) => `RM ${v.toFixed(2)}`;

  // ── Product analysis derived data ──────────────────────────────────────────
  const productAnalysis = useMemo(() => {
    return pos.products.map(p => {
      const margin = p.total_cost > 0 ? ((p.price - p.total_cost) / p.price) * 100 : null;
      const inventoryValue = p.total_cost > 0 ? p.total_cost * p.stock_quantity : null;
      return { ...p, margin, inventoryValue };
    }).sort((a, b) => {
      if (a.margin === null && b.margin === null) return 0;
      if (a.margin === null) return 1;
      if (b.margin === null) return -1;
      return a.margin - b.margin; // lowest margin first (most at risk)
    });
  }, [pos.products]);

  const totalInventoryValue = productAnalysis.reduce((s, p) => s + (p.inventoryValue ?? 0), 0);

  // Purata margin berwajaran — produk dengan stok & harga lebih tinggi diberi berat lebih
  // Ini lebih tepat berbanding purata biasa yang boleh menyembunyikan produk berisiko tinggi
  const avgMargin = (() => {
    const withCost = productAnalysis.filter(p => p.margin !== null && p.price > 0);
    if (withCost.length === 0) return null;
    const totalWeight = withCost.reduce((s, p) => s + p.price * Math.max(p.stock_quantity, 1), 0);
    if (totalWeight === 0) return null;
    return withCost.reduce((s, p) => s + p.margin! * (p.price * Math.max(p.stock_quantity, 1)), 0) / totalWeight;
  })();

  const lowMarginCount = productAnalysis.filter(p => p.margin !== null && p.margin < 20).length;

  function getMarginColor(m: number | null) {
    if (m === null) return 'hsl(var(--muted-foreground)/0.4)';
    if (m >= 40) return '#22c55e';
    if (m >= 20) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">POS</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Statistik & Analisis</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl">
            {([['jualan', 'Jualan'], ['produk', 'Produk'], ['perbelanjaan', 'Belanja']] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={tab === key
                  ? { background: color, color: '#fff' }
                  : { color: 'hsl(var(--muted-foreground)/0.6)' }
                }>{label}</button>
            ))}
          </div>
          {/* Range filter (jualan & perbelanjaan tabs) */}
          {(tab === 'jualan' || tab === 'perbelanjaan') && (
            <div className="flex items-center gap-2">
              <div className="flex gap-2 bg-muted/30 p-1 rounded-2xl">
                {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setRange(key)}
                    className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    style={range === key
                      ? { background: color, color: '#fff' }
                      : { color: 'hsl(var(--muted-foreground)/0.6)' }
                    }>{label}</button>
                ))}
              </div>

              {/* Laporan PDF Button */}
              {stats && (
                <button
                  onClick={() => setShowPdfPreview(true)}
                  className="h-10 px-4 rounded-xl text-white flex items-center justify-center gap-2 transition-colors shadow-sm hover:brightness-110"
                  style={{ background: color }}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">
                    Preview PDF
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {tab === 'jualan' ? (
        loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
          </div>
        ) : stats ? (
          <>
            {/* KPI cards — 5 items: tambah Untung Bersih */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard icon={DollarSign} label="Jualan Bersih" value={fmtRM(stats.totalRevenue)}
                sub={stats.grossRevenue > stats.totalRevenue ? `Bruto: ${fmtRM(stats.grossRevenue)}` : undefined}
                color={color} delay={0.05} />
              <KPICard icon={Receipt} label="Transaksi" value={stats.transactionCount} color={color} delay={0.1} />
              <KPICard icon={Package} label="Unit Terjual" value={stats.unitsSold} color={color} delay={0.15} />
              <KPICard icon={TrendingUp} label="Purata Order (AOV)" value={fmtRM(stats.averageOrderValue)} color={color} delay={0.2} />
              {/* Ciri 2: Untung Bersih */}
              <KPICard
                icon={stats.netProfit >= 0 ? TrendingUp : TrendingDown}
                label="Untung Bersih (Anggaran)"
                value={fmtRM(stats.netProfit)}
                sub={stats.totalExpenses > 0 ? `Tolak belanja: ${fmtRM(stats.totalExpenses)}` : 'Tiada belanja direkodkan'}
                color={stats.netProfit >= 0 ? '#22c55e' : '#ef4444'}
                delay={0.25}
              />
            </div>

            {/* Pecahan Saluran Jualan */}
            {(stats.onlineRevenue > 0 || stats.physicalRevenue > 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PolyMart (Online)</p>
                      <p className="text-lg font-black text-foreground">{fmtRM(stats.onlineRevenue)}</p>
                    </div>
                  </div>
                  {stats.totalRevenue > 0 && (
                    <p className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                      {((stats.onlineRevenue / stats.totalRevenue) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">POS (Fizikal)</p>
                      <p className="text-lg font-black text-foreground">{fmtRM(stats.physicalRevenue)}</p>
                    </div>
                  </div>
                  {stats.totalRevenue > 0 && (
                    <p className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                      {((stats.physicalRevenue / stats.totalRevenue) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <AdsMarketingWidget stats={stats} />

            {/* Discount alert — tunjuk jika ada diskaun diberi */}
            {stats.totalDiscounts > 0 && (
              <div className="flex items-center justify-between px-5 py-3 rounded-2xl"
                style={{ background: 'hsl(var(--muted)/0.4)', border: '1px solid hsl(var(--border)/0.4)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">🏷️</span>
                  <p className="text-[10px] font-black text-muted-foreground/70">
                    Jumlah Diskaun Diberi dalam Tempoh Ini
                  </p>
                </div>
                <p className="text-sm font-black text-rose-500">- {fmtRM(stats.totalDiscounts)}</p>
              </div>
            )}

            {/* Charts */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Bar chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="lg:col-span-3 rounded-[2rem] p-6 bg-card border border-border/50 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarDays className="w-4 h-4 opacity-40" style={{ color }} />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">Jualan Harian</p>
                </div>
                {stats.dailySales.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground/40 font-black">Tiada data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.dailySales} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => {
                        const dt = new Date(d);
                        return `${dt.getDate()}/${dt.getMonth()+1}`;
                      }} />
                      <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `RM${v}`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                        formatter={(v: number) => [`RM ${v.toFixed(2)}`, 'Jualan']}
                        labelFormatter={d => new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                      />
                      <Bar dataKey="revenue" fill={color} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Pie chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="lg:col-span-2 rounded-[2rem] p-6 bg-card border border-border/50 min-w-0 overflow-hidden">
                <p className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Prestasi Produk</p>
                {stats.topProducts.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground/40 font-black">Tiada data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.topProducts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} formatter={(v: number) => [`RM ${v.toFixed(2)}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* Top products table */}
            {stats.topProducts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="rounded-[2rem] p-6 bg-card border border-border/50">
                <p className="text-xs font-black uppercase tracking-widest text-foreground mb-4">Ranking Produk Terlaris</p>
                <div className="space-y-2">
                  {stats.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>
                        {i + 1}
                      </div>
                      <p className="flex-1 text-sm font-black text-foreground">{p.name}</p>
                      <div className="text-right">
                        <p className="text-xs font-black" style={{ color }}>{fmtRM(p.revenue)}</p>
                        <p className="text-[10px] text-muted-foreground">{p.units} unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground/40 font-black text-sm">Gagal memuatkan statistik.</div>
        )
      ) : tab === 'produk' ? (
        /* ── Tab: Analisis Produk ──────────────────────────────────────────── */
        <div className="space-y-6">
          {/* KPI: Inventory Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard icon={Layers} label="Nilai Inventori"
              value={fmtRM(totalInventoryValue)}
              sub={totalInventoryValue > 0 ? 'Kos per unit × stok semasa' : 'Tiada kos ditetapkan'}
              color={color} delay={0.05} />
            <KPICard icon={BarChart3} label="Margin Purata (Berwajaran)"
              value={avgMargin !== null ? `${avgMargin.toFixed(1)}%` : 'N/A'}
              sub={avgMargin !== null ? (avgMargin >= 30 ? '✅ Sihat' : avgMargin >= 15 ? '⚠️ Perlu semak' : '🔴 Berisiko') : 'Belum ada kos'}
              color={avgMargin !== null ? (avgMargin >= 30 ? '#22c55e' : avgMargin >= 15 ? '#f59e0b' : '#ef4444') : color} delay={0.1} />
            <KPICard icon={AlertTriangle} label="Produk Berisiko"
              value={lowMarginCount}
              sub={lowMarginCount > 0 ? 'Margin < 20%' : 'Semua margin OK'}
              color={lowMarginCount > 0 ? '#ef4444' : '#22c55e'} delay={0.15} />
          </div>

          {/* Product margin table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-[2rem] p-6 bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 opacity-40" style={{ color }} />
              <p className="text-xs font-black uppercase tracking-widest text-foreground">Senarai Produk — Analisis Margin</p>
            </div>
            {productAnalysis.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 text-center py-8 font-black">Tiada produk dalam katalog.</p>
            ) : (
              <div className="space-y-2">
                {productAnalysis.map(p => {
                  const mi = p.margin;
                  const mc = getMarginColor(mi);
                  const daysLeft = (stats && p.stock_quantity > 0)
                    ? (() => {
                        const sold = stats.topProducts.find(tp => tp.name === p.name)?.units ?? 0;
                        const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
                        const dailyRate = sold / days;
                        return dailyRate > 0 ? Math.floor(p.stock_quantity / dailyRate) : null;
                      })()
                    : null;

                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-foreground truncate">{p.name}</p>
                          {mi !== null && mi < 20 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black text-white bg-rose-500 shrink-0">RISIKO</span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground/50">{p.category} · Stok: {p.stock_quantity}</p>
                        <div className="mt-1 h-1 rounded-full bg-muted/50 overflow-hidden w-32">
                          <div className="h-full rounded-full" style={{ width: `${mi !== null ? Math.min(mi, 100) : 0}%`, background: mc }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-xs font-black" style={{ color }}>{fmtRM(p.price)}</p>
                        {mi !== null ? (
                          <p className="text-[10px] font-black" style={{ color: mc }}>{mi.toFixed(1)}% margin</p>
                        ) : (
                          <p className="text-[9px] text-muted-foreground/30">Kos N/A</p>
                        )}
                        {daysLeft !== null ? (
                          <p className="text-[9px]" style={{ color: daysLeft <= 3 ? '#ef4444' : 'hsl(var(--muted-foreground)/0.5)' }}>
                            ~{daysLeft} hari lagi
                          </p>
                        ) : null}
                      </div>
                      {p.inventoryValue !== null && (
                        <div className="text-right shrink-0 pl-2 border-l border-border/30">
                          <p className="text-[8px] text-muted-foreground/40 uppercase font-black">Modal Stok</p>
                          <p className="text-[10px] font-black text-muted-foreground">{fmtRM(p.inventoryValue)}</p>
                          <p className="text-[8px] text-muted-foreground/30">kos×stok</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        /* ── Tab: Perbelanjaan Operasi (Ciri 2) ──────────────────────────── */
        <div className="space-y-6">
          {/* KPI: P&L Summary */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KPICard icon={DollarSign} label="Jualan Bersih" value={fmtRM(stats.totalRevenue)} color={color} delay={0.05} />
              <KPICard icon={MinusCircle} label="Jumlah Perbelanjaan" value={fmtRM(stats.totalExpenses)} color="#ef4444" delay={0.1} />
              <KPICard
                icon={stats.netProfit >= 0 ? TrendingUp : TrendingDown}
                label="Untung Bersih (Anggaran)"
                value={fmtRM(stats.netProfit)}
                sub={stats.netProfit >= 0 ? '✅ Untung' : '🔴 Rugi'}
                color={stats.netProfit >= 0 ? '#22c55e' : '#ef4444'}
                delay={0.15}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Form tambah perbelanjaan */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="lg:col-span-2 rounded-[2rem] p-6 bg-card border border-border/50 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" style={{ color }} />
                <p className="text-xs font-black uppercase tracking-widest text-foreground">Rekod Perbelanjaan</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Jumlah (RM)</p>
                <input type="number" min="0" step="0.01" value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Kategori</p>
                <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Keterangan</p>
                <input type="text" value={expForm.description}
                  onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="cth: Sewa tapak, Beg plastik..."
                  className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Tarikh (kosong = hari ini)</p>
                <input type="date" value={expForm.expense_date}
                  onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
              </div>

              <button onClick={handleAddExpense} disabled={expSaving}
                className="w-full h-10 rounded-xl text-xs font-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: color, color: '#fff' }}>
                {expSaving ? 'Menyimpan...' : '+ Tambah Perbelanjaan'}
              </button>
            </motion.div>

            {/* Senarai & Pie chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="lg:col-span-3 space-y-6">

              {/* Donut chart pecahan kategori */}
              {stats && stats.expensesByCategory.length > 0 && (
                <div className="rounded-[2rem] p-6 bg-card border border-border/50 min-w-0 overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest text-foreground mb-4">Pecahan Perbelanjaan</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={stats.expensesByCategory} dataKey="amount" nameKey="category"
                        cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                        label={({ category, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.expensesByCategory.map((e, i) => (
                          <Cell key={i} fill={EXPENSE_CAT_COLORS[e.category as ExpenseCategory] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} formatter={(v: number) => [`RM ${v.toFixed(2)}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Senarai perbelanjaan */}
              <div className="rounded-[2rem] p-6 bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 opacity-40" style={{ color }} />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">Rekod Perbelanjaan</p>
                </div>

                {expLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground/40 text-center py-6 font-black">Tiada rekod dalam tempoh ini.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                    {expenses.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors group">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXPENSE_CAT_COLORS[e.category] ?? '#888' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-foreground truncate">{e.description}</p>
                          <p className="text-[9px] text-muted-foreground/50">{e.category} · {new Date(e.expense_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <p className="text-sm font-black text-rose-500 shrink-0">- {fmtRM(e.amount)}</p>
                        <button onClick={() => handleDeleteExpense(e.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/40 hover:text-rose-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Preview PDF Modal */}
      {stats && selectedBusiness && (
        <PosSalesReportModal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          stats={stats}
          selectedBusiness={selectedBusiness}
          rangeLabel={RANGE_LABELS[range]}
          dateRangeString={getExactDateRange()}
          themeColor={color}
          generatedBy={profile?.full_name || 'Pengurus Perniagaan'}
        />
      )}
    </div>
  );
}
