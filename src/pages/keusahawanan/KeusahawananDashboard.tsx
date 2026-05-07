import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba, getMalaysianNickname } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Activity, Star, Eye, ShieldCheck, 
  TrendingUp, TrendingDown, Target, ShoppingBag, DollarSign,
  PackageSearch, BellRing, Calculator, ExternalLink, CalendarDays, BarChart3
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip, YAxis,
  PieChart, Pie, Cell
} from 'recharts';

// --- Types ---
interface ProductHeatmapRow {
  productName: string;
  days: { date: string; qty: number; revenue: number; intensity: number }[];
}
interface StatData {
  revenue: number;
  orders: number;
  activeSessions: number;
  revenueHistory: any[];
  orderHistory: any[];
  dailySales: any[];
  recentReviews: any[];
  expenses: number;
  lowStock: any[];
  monthlyTarget: number;
  topProducts: any[];
  activityHeatmap: any[];
  productHeatmap: ProductHeatmapRow[];
}

import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';

// --- Dashboard Component ---
export function KeusahawananDashboard() {
  const { color } = useExcoTheme();
  const { profile, isSuperAdmin } = useAuth();
  const { selectedBusiness, isLoading: isSwitcherLoading } = useBusinessSwitcher();
  const navigate = useNavigate();
  const displayName = getMalaysianNickname(profile?.full_name);

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StatData>({
    revenue: 0,
    orders: 0,
    activeSessions: 0,
    revenueHistory: [],
    orderHistory: [],
    dailySales: [],
    recentReviews: [],
    expenses: 0,
    lowStock: [],
    monthlyTarget: 5000,
    topProducts: [],
    activityHeatmap: [],
    productHeatmap: [],
  });
  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      setIsLoading(true);
      try {
        // 1. Get business ID from switcher
        const businessId = selectedBusiness?.id;
        const monthlyTarget = selectedBusiness?.monthly_target || 5000;

        if (!businessId) {
          setData(prev => ({ ...prev, monthlyTarget }));
          setIsLoading(false);
          return;
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 29);

        const txStartDate = new Date(dateRange.from);
        txStartDate.setHours(0, 0, 0, 0);
        const txEndDate = new Date(dateRange.to);
        txEndDate.setHours(23, 59, 59, 999);
        const daysDiff = Math.ceil((txEndDate.getTime() - txStartDate.getTime()) / 86400000);
        const granularity = daysDiff === 0 ? 'hour' : daysDiff > 60 ? 'month' : 'day';
        const fetchStartDate = txStartDate < thirtyDaysAgo ? txStartDate : thirtyDaysAgo;
        
        // Fetch all product IDs for this business first (needed for reviews)
        const { data: bizProducts } = await supabase
          .from('business_products')
          .select('id')
          .eq('business_id', businessId);
        const productIds = (bizProducts || []).map(p => p.id);

        // Fetch in parallel
        const [
          sessionsRes,
          transactionsRes,
          polymartRes,
          expensesRes,
          lowStockRes,
          reviewsRes
        ] = await Promise.all([
          supabase.from('business_sessions')
            .select('id', { count: 'exact' })
            .eq('business_id', businessId)
            .eq('status', 'OPEN'),

          // POS: direct business_id — no session join needed
          supabase.from('business_transactions')
            .select('created_at, total_amount, items')
            .eq('business_id', businessId)
            .eq('status', 'COMPLETED')
            .gte('created_at', fetchStartDate.toISOString()),

          supabase.from('polymart_orders')
            .select('created_at, total_price, unit_price, quantity, business_products(name)')
            .eq('business_id', businessId)
            .in('status', ['COMPLETED', 'READY', 'CONFIRMED'])
            .gte('created_at', fetchStartDate.toISOString()),

          supabase.from('business_expenses')
            .select('amount')
            .eq('business_id', businessId),

          // Low stock — uses DB view that compares two columns correctly
          supabase.from('business_products_low_stock')
            .select('id, name, stock_quantity, stock_alert_threshold, image_url')
            .eq('business_id', businessId),

          // Reviews — fetch via product_id IN list (reliable, avoids broken !inner filter)
          productIds.length > 0
            ? supabase.from('polymart_reviews')
                .select('id, rating, comment, created_at, reviewer_id, product_id')
                .in('product_id', productIds)
                .order('created_at', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] }),
        ]);

        // Merge POS + PolyMart into unified array
        // POS items DB format: { name, qty, product_id, unit_price, total_price }
        const txs = [
          ...(transactionsRes.data || []).map(t => ({
            created_at: t.created_at,
            total_amount: Number(t.total_amount || 0),
            items: (Array.isArray(t.items) ? t.items : []).map((item: any) => ({
              product_name: item.name || item.product_name || 'Produk',
              quantity: item.qty ?? item.quantity ?? 1,
            })),
          })),
          ...(polymartRes.data || []).map(p => ({
            created_at: p.created_at,
            total_amount: Number(p.total_price || (Number(p.unit_price) * Number(p.quantity)) || 0),
            items: [{ product_name: (p.business_products as any)?.name || 'Produk PolyMart', quantity: p.quantity }],
          })),
        ];
        
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let monthRev = 0;
        let monthOrders = 0;
        
        const dailyRevMap: Record<string, number> = {};
        const dailyOrdMap: Record<string, number> = {};
        const productSales: Record<string, { count: number, name: string }> = {};

        // Generate 30 days heatmap structure ALWAYS
        const heatmap = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toLocaleDateString('en-CA');
          dailyRevMap[dateStr] = 0;
          dailyOrdMap[dateStr] = 0;
          heatmap.push({ date: dateStr, sales: 0, intensity: 0 });
        }

        // Chart Data — granularity based on date range
        const chartData: any[] = [];
        const monthNames = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
        const dayNames = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
        if (granularity === 'month') {
          const mRevMap: Record<string, number> = {};
          const mOrdMap: Record<string, number> = {};
          const cur = new Date(txStartDate);
          while (cur <= txEndDate) {
            const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`;
            if (!mRevMap[key]) { mRevMap[key] = 0; mOrdMap[key] = 0; chartData.push({ name: monthNames[cur.getMonth()], key, sales: 0, orders: 0 }); }
            cur.setMonth(cur.getMonth() + 1);
          }
          txs.forEach(tx => {
            const d = new Date(tx.created_at);
            if (d >= txStartDate && d <= txEndDate) {
              const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              if (mRevMap[k] !== undefined) { mRevMap[k] += tx.total_amount; mOrdMap[k] += 1; }
            }
          });
          chartData.forEach(c => { c.sales = mRevMap[c.key]; c.orders = mOrdMap[c.key]; });
        } else if (granularity === 'hour') {
          const hRev: Record<number, number> = {}; const hOrd: Record<number, number> = {};
          for (let i = 0; i < 24; i++) { hRev[i] = 0; hOrd[i] = 0; chartData.push({ name: `${i}:00`, hour: i, sales: 0, orders: 0 }); }
          txs.forEach(tx => {
            const d = new Date(tx.created_at);
            if (d >= txStartDate && d <= txEndDate) { hRev[d.getHours()] += tx.total_amount; hOrd[d.getHours()] += 1; }
          });
          chartData.forEach(c => { c.sales = hRev[c.hour]; c.orders = hOrd[c.hour]; });
        } else {
          const dRev: Record<string, number> = {}; const dOrd: Record<string, number> = {};
          const cur = new Date(txStartDate);
          while (cur <= txEndDate) {
            const key = cur.toLocaleDateString('en-CA');
            dRev[key] = 0; dOrd[key] = 0;
            chartData.push({ name: daysDiff <= 7 ? dayNames[cur.getDay()] : `${cur.getDate()}/${cur.getMonth()+1}`, key, sales: 0, orders: 0 });
            cur.setDate(cur.getDate() + 1);
          }
          txs.forEach(tx => {
            const d = new Date(tx.created_at);
            if (d >= txStartDate && d <= txEndDate) {
              const k = d.toLocaleDateString('en-CA');
              if (dRev[k] !== undefined) { dRev[k] += tx.total_amount; dOrd[k] += 1; }
            }
          });
          chartData.forEach(c => { c.sales = dRev[c.key]; c.orders = dOrd[c.key]; });
        }

        // Common processing
        txs.forEach(tx => {
          const txDate = new Date(tx.created_at);
          const dateStr = txDate.toLocaleDateString('en-CA');
          
          if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            monthRev += Number(tx.total_amount || 0);
            monthOrders += 1;
          }
          
          if (dailyRevMap[dateStr] !== undefined) {
            dailyRevMap[dateStr] += Number(tx.total_amount || 0);
          }

          // Top Products within selected range
          if (txDate >= txStartDate && txDate <= txEndDate) {
            const items = Array.isArray(tx.items) ? tx.items : [];
            items.forEach((item: any) => {
              if (item.product_name || item.name) {
                const name = item.product_name || item.name;
                if (!productSales[name]) productSales[name] = { count: 0, name: name };
                productSales[name].count += (item.quantity || 1);
              }
            });
          }
        });

        // Compute intensity for heatmap (1–4 levels)
        const maxDailySales = Math.max(1, ...Object.values(dailyRevMap));
        heatmap.forEach(h => {
          h.sales = dailyRevMap[h.date] || 0;
          h.intensity = h.sales === 0 ? 0 : Math.max(1, Math.ceil((h.sales / maxDailySales) * 4));
        });

        // Top 5 Products
        const topProducts = Object.values(productSales)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Budget Usage
        const totalExp = (expensesRes.data || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);

        setData({
          revenue: monthRev,
          orders: monthOrders,
          activeSessions: sessionsRes.count ?? sessionsRes.data?.length ?? 0,
          revenueHistory: chartData.map((d, i) => ({ name: i, value: d.sales })),
          orderHistory: chartData.map((d, i) => ({ name: i, value: d.orders })),
          dailySales: chartData,
          recentReviews: reviewsRes.data || [],
          expenses: totalExp,
          lowStock: lowStockRes.data || [],
          monthlyTarget,
          topProducts,
          activityHeatmap: heatmap,
          productHeatmap: (() => {
            // Build product x day matrix — always last 14 days
            const heatDays: string[] = [];
            for (let i = 13; i >= 0; i--) {
              const d = new Date(now); d.setDate(now.getDate() - i);
              heatDays.push(d.toLocaleDateString('en-CA'));
            }
            const heatStart = new Date(now); heatStart.setDate(now.getDate() - 13); heatStart.setHours(0,0,0,0);
            // product -> day -> {qty, revenue}
            const matrix: Record<string, Record<string, { qty: number; revenue: number }>> = {};
            txs.forEach(tx => {
              const txDate = new Date(tx.created_at);
              if (txDate < heatStart) return;
              const dateStr = txDate.toLocaleDateString('en-CA');
              tx.items.forEach((item: any) => {
                const name = item.product_name || item.name;
                if (!name) return;
                if (!matrix[name]) matrix[name] = {};
                if (!matrix[name][dateStr]) matrix[name][dateStr] = { qty: 0, revenue: 0 };
                matrix[name][dateStr].qty += (item.quantity || 1);
                matrix[name][dateStr].revenue += (item.quantity || 1) * (Number(item.unit_price) || 0);
              });
            });
            // Sort products by total qty, take top 8
            const sorted = Object.entries(matrix)
              .map(([name, days]) => ({ name, total: Object.values(days).reduce((s, d) => s + d.qty, 0) }))
              .sort((a, b) => b.total - a.total).slice(0, 8).map(p => p.name);
            return sorted.map(productName => {
              const dayData = matrix[productName];
              const maxQty = Math.max(1, ...Object.values(dayData).map(d => d.qty));
              return {
                productName,
                days: heatDays.map(date => {
                  const d = dayData[date];
                  const qty = d?.qty ?? 0;
                  return { date, qty, revenue: d?.revenue ?? 0, intensity: qty === 0 ? 0 : Math.max(1, Math.ceil((qty / maxQty) * 4)) };
                }),
              };
            });
          })(),
        });

      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    if (!isSwitcherLoading) {
      fetchData();
    }
  }, [profile?.id, dateRange.from, dateRange.to, selectedBusiness?.id, isSwitcherLoading]);

  // -- Render Helpers --
  const progressPercentage = Math.min((data.revenue / data.monthlyTarget) * 100, 100);
  const pieData = [
    { name: 'Achieved', value: data.revenue },
    { name: 'Remaining', value: Math.max(data.monthlyTarget - data.revenue, 0) }
  ];

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
      
      {/* Admin Banner */}
      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5 px-6 py-4 rounded-[1.5rem] bg-amber-500/[0.03] border border-amber-500/20">
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600/80">Admin Preview</p>
            <p className="text-[10px] text-amber-600/50 font-medium truncate">Modul ini dalam kawalan pentadbiran JPP.</p>
          </div>
        </motion.div>
      )}

      {/* Header & Quick Action */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10"
      >
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            Store Overview
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Halo <span style={{ color }}>{displayName}</span>, ini prestasi bisnes anda hari ini.
          </p>
        </div>

        {/* Quick Action Button - POS */}
        <button
          onClick={() => navigate('/keusahawanan/pos')}
          className="group relative flex items-center justify-between sm:justify-start gap-4 px-6 py-4 rounded-3xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl w-full lg:w-auto flex-shrink-0"
          style={{ background: color }}
        >
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-sm text-white">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Akses Pantas</p>
              <p className="text-lg font-black text-white leading-none mt-0.5">Kaunter Jualan (POS)</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-white/50 group-hover:text-white transition-colors relative z-10 sm:hidden" />
        </button>
      </motion.div>

      {/* TOP CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
        
        {/* Total Revenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><DollarSign className="w-4 h-4" /></div>
              <p className="text-sm font-bold text-foreground">Total Revenue</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground/30" />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-3xl font-black text-foreground">RM {data.revenue.toFixed(2)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-500">
                <TrendingUp className="w-3.5 h-3.5" /> <span>+12%</span> <span className="text-muted-foreground font-medium ml-1">Dari bulan lepas</span>
              </div>
            </div>
            {/* Mini Chart */}
            <div className="h-12 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueHistory}>
                  <Bar dataKey="value" fill={color} radius={[2,2,0,0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Total Orders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><ShoppingBag className="w-4 h-4" /></div>
              <p className="text-sm font-bold text-foreground">Total Orders</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground/30" />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-3xl font-black text-foreground">{data.orders}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-500">
                <TrendingUp className="w-3.5 h-3.5" /> <span>+5%</span> <span className="text-muted-foreground font-medium ml-1">Dari bulan lepas</span>
              </div>
            </div>
            {/* Mini Chart */}
            <div className="h-12 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.orderHistory}>
                  <Bar dataKey="value" fill="#a855f7" radius={[2,2,0,0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Monthly Goals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><Target className="w-4 h-4" /></div>
              <p className="text-sm font-bold text-foreground">Monthly Goals</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Target</p>
                <p className="text-lg font-black text-foreground">RM {data.monthlyTarget}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Achieved</p>
                <p className="text-lg font-black text-foreground">RM {data.revenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
          
          <div className="w-24 h-24 relative flex-shrink-0">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={35} outerRadius={45} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                  <Cell fill={color} />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-base font-black text-foreground">{Math.round(progressPercentage)}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MIDDLE SECTION - CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Sales Analytics Line Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-foreground">Sales Analytics</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Trend jualan perniagaan anda</p>
            </div>
            {/* Date Range Picker */}
            <div ref={pickerRef} className="relative">
              <button onClick={() => setIsPickerOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-bold text-muted-foreground hover:bg-muted transition-colors">
                <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{dateRange.from.toLocaleDateString('ms-MY',{day:'numeric',month:'short'})} — {dateRange.to.toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})}</span>
              </button>
              {isPickerOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-popover border border-border/50 rounded-2xl shadow-2xl p-4 space-y-3 w-[260px]">
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider">Tempoh Pantas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[{l:'Hari Ini',d:0},{l:'7 Hari',d:6},{l:'Sebulan',d:29},{l:'Setahun',d:364}].map(p => {
                      const to = new Date(); const from = new Date(); from.setDate(from.getDate()-p.d); from.setHours(0,0,0,0);
                      return <button key={p.l} onClick={()=>{setDateRange({from,to});setIsPickerOpen(false);}} className="px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-bold text-muted-foreground hover:bg-muted transition-colors">{p.l}</button>;
                    })}
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-wider block mb-1">Dari</label>
                      <input type="date" defaultValue={dateRange.from.toLocaleDateString('en-CA')} max={new Date().toLocaleDateString('en-CA')}
                        onChange={e => { const d=new Date(e.target.value); if(!isNaN(d.getTime())) setDateRange(r=>({...r,from:d})); }}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs font-bold text-foreground outline-none focus:border-primary/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-wider block mb-1">Hingga</label>
                      <input type="date" defaultValue={dateRange.to.toLocaleDateString('en-CA')} max={new Date().toLocaleDateString('en-CA')}
                        onChange={e => { const d=new Date(e.target.value); if(!isNaN(d.getTime())) setDateRange(r=>({...r,to:d})); }}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs font-bold text-foreground outline-none focus:border-primary/50" />
                    </div>
                    <button onClick={()=>setIsPickerOpen(false)} className="w-full py-2 rounded-xl text-xs font-black text-white transition-colors" style={{background:color}}>Guna Tarikh</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ fontWeight: '900' }}
                  formatter={(value) => [`RM ${value}`, 'Jualan']}
                />
                <Line type="monotone" dataKey="sales" stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Products Heatmap/List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-foreground">Top Products</h2>
            <div className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-xs font-bold text-muted-foreground">
              {dateRange.from.toLocaleDateString('ms-MY',{day:'numeric',month:'short'})} – {dateRange.to.toLocaleDateString('ms-MY',{day:'numeric',month:'short'})}
            </div>
          </div>
          <div className="flex-1 space-y-4">
             {data.topProducts.length > 0 ? data.topProducts.map((prod, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/30 transition-colors group">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center font-black text-muted-foreground group-hover:bg-background group-hover:text-foreground transition-colors">
                     {i+1}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">{prod.name}</p>
                     <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{prod.count} terjual</p>
                   </div>
                 </div>
               </div>
             )) : (
               <div className="text-center py-8 text-muted-foreground text-xs font-bold">Belum ada jualan direkodkan.</div>
             )}
          </div>
        </motion.div>

      </div>

      {/* PRODUCT ACTIVITY HEATMAP */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="w-full bg-card border border-border/50 rounded-[2rem] p-5 sm:p-6 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex w-full items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: hexToRgba(color, 0.12) }}>
              <Activity className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Product Activity</h2>
              <p className="text-xs text-muted-foreground font-medium">Produk terlaris 14 hari terakhir</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground font-bold">
            <span>Kurang</span>
            <div className="flex gap-1">
              {[0, 0.3, 0.55, 0.78, 1].map((op, i) => (
                <div key={i} className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: i === 0 ? 'hsl(var(--muted))' : color, opacity: i === 0 ? 0.35 : op }} />
              ))}
            </div>
            <span>Lebih</span>
          </div>
        </div>

        {data.productHeatmap.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
            <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-bold">Tiada data jualan produk dalam 14 hari terakhir</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="min-w-max">
              {/* Date header row */}
              <div className="flex mb-1.5 ml-[7.5rem]">
                {data.productHeatmap[0]?.days.map((d, i) => {
                  const dt = new Date(d.date);
                  const show = i === 0 || dt.getDate() === 1 || i % 3 === 0;
                  return (
                    <div key={i} className="w-5 mr-1 text-center text-[8px] font-black text-muted-foreground/40 uppercase">
                      {show ? dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }).replace(' ', '\n') : ''}
                    </div>
                  );
                })}
              </div>
              {/* Product rows */}
              <div className="space-y-1">
                {data.productHeatmap.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-0">
                    {/* Product name */}
                    <div className="w-28 flex-shrink-0 pr-2 text-right">
                      <span className="text-[11px] font-bold text-muted-foreground truncate block" title={row.productName}>
                        {row.productName.length > 14 ? row.productName.slice(0, 13) + '…' : row.productName}
                      </span>
                    </div>
                    {/* Day cells */}
                    <div className="flex gap-1">
                      {row.days.map((day, di) => {
                        const bg = day.intensity === 0 ? 'hsl(var(--muted))' : color;
                        const op = day.intensity === 0 ? 0.18 : [0, 0.3, 0.55, 0.78, 1][day.intensity];
                        const label = new Date(day.date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
                        return (
                          <div key={di}
                            className="group relative w-5 h-5 flex-shrink-0 rounded-[3px] cursor-help transition-transform hover:scale-125 hover:z-10"
                            style={{ backgroundColor: bg, opacity: op }}>
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="px-2.5 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap shadow-xl border border-border/50"
                                style={{ background: 'hsl(var(--popover))', color: 'hsl(var(--foreground))' }}>
                                <span style={{ color }} className="block font-black">{row.productName}</span>
                                <span className="text-muted-foreground">{label}</span>
                                <span className="block">{day.qty} unit</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* BOTTOM SECTION - WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Budget Usage */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-foreground">Budget Usage</h2>
            <button className="p-2 rounded-xl hover:bg-muted transition-colors"><ExternalLink className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-foreground">Jumlah Perbelanjaan</span>
                <span className="font-black text-muted-foreground">RM {data.expenses.toFixed(2)}</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((data.expenses / (data.monthlyTarget || 1)) * 100, 100)}%`, background: color }} />
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium leading-relaxed">
            <span className="font-bold text-indigo-600 dark:text-indigo-300">💡 Tip Bajet:</span> Perbelanjaan operasi anda berada pada tahap yang sihat. Pertimbangkan untuk melabur dalam bahan berkualiti.
          </div>
        </motion.div>

        {/* Customer Review */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-foreground">Customer Review</h2>
            <div className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-xs font-bold text-muted-foreground">Terkini</div>
          </div>
          <div className="space-y-4">
            {data.recentReviews.length > 0 ? data.recentReviews.map((rev, i) => (
              <div key={i} className="p-4 rounded-2xl border border-border/50 bg-background/50 group hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-black text-xs text-muted-foreground uppercase">
                      {rev.reviewer_id ? rev.reviewer_id.substring(0, 2) : 'A'}
                    </div>
                    <p className="text-xs font-bold text-foreground truncate w-24">Pelanggan</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-3 h-3 ${star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground/80 leading-relaxed font-medium line-clamp-3">"{rev.comment || rev.review_text}"</p>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-xs font-bold">Tiada maklum balas setakat ini.</div>
            )}
          </div>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
             <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-foreground">Low Stock Alert</h2>
              <BellRing className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            
            {data.lowStock.length > 0 ? (
              <div className="space-y-3">
                {data.lowStock.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 border border-border/30">
                    <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center text-2xl overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground leading-tight">{item.name}</p>
                      <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-wider">{item.stock_quantity} unit tinggal</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs font-bold">Semua stok mencukupi.</div>
            )}
          </div>
          
          <button className="w-full mt-6 py-3 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 active:scale-[0.98]">
            Restock Now
          </button>
        </motion.div>

      </div>
    </div>
  );
}
