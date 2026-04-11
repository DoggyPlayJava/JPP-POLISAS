import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData, StatsData } from '@/hooks/usePosData';
import { hexToRgba } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, Receipt, Package, TrendingUp, CalendarDays,
  AlertTriangle, Layers, ShoppingBag, BarChart3, ChevronRight,
} from 'lucide-react';

type Range = '1d' | '7d' | '1m';
const RANGE_LABELS: Record<Range, string> = { '1d': '1 Hari', '7d': '7 Hari', '1m': '1 Bulan' };
const PIE_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

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

type Tab = 'jualan' | 'produk';

export function PosStatsPage() {
  const { color } = useExcoTheme();
  const { selectedBusiness, isLoading: isBusinessLoading } = useBusinessSwitcher();
  const businessId = selectedBusiness?.id;
  const pos = usePosData(businessId, isBusinessLoading);

  const [tab, setTab] = useState<Tab>('jualan');
  const [range, setRange] = useState<Range>('7d');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isBusinessLoading) return;
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    pos.fetchStats(businessId, range).then(s => { setStats(s); setLoading(false); });
  }, [businessId, range, isBusinessLoading]);

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
            {([['jualan', 'Jualan'], ['produk', 'Produk']] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={tab === key
                  ? { background: color, color: '#fff' }
                  : { color: 'hsl(var(--muted-foreground)/0.6)' }
                }>{label}</button>
            ))}
          </div>
          {/* Range filter (only for jualan tab) */}
          {tab === 'jualan' && (
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
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard icon={DollarSign} label="Jualan Bersih" value={fmtRM(stats.totalRevenue)}
                sub={stats.grossRevenue > stats.totalRevenue ? `Bruto: ${fmtRM(stats.grossRevenue)}` : undefined}
                color={color} delay={0.05} />
              <KPICard icon={Receipt} label="Transaksi" value={stats.transactionCount} color={color} delay={0.1} />
              <KPICard icon={Package} label="Unit Terjual" value={stats.unitsSold} color={color} delay={0.15} />
              <KPICard icon={TrendingUp} label="Purata Order (AOV)" value={fmtRM(stats.averageOrderValue)} color={color} delay={0.2} />
            </div>

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
                className="lg:col-span-3 rounded-[2rem] p-6 bg-card border border-border/50">
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
                className="lg:col-span-2 rounded-[2rem] p-6 bg-card border border-border/50">
                <p className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Top Produk</p>
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
      ) : (
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
                  // Smart restock: estimate days remaining based on totalInventory / avgDailySales
                  // We use stock_quantity as proxy — can be enhanced with real sales data
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
                        {/* Margin bar */}
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
      )}
    </div>
  );
}
