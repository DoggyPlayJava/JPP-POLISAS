import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  BarChart3,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  category: string;
}

export function KeusahawananInventoryPage() {
  const { t } = useTranslation(['keusahawanan', 'common']);
  const [items, setItems] = useState<InventoryItem[]>([
    { id: '1', name: 'Nasi Lemak Ayam Berempah', sku: 'NL-01', stock: 4, threshold: 10, category: 'Makanan' },
    { id: '2', name: 'Air Teh Tarik Ais', sku: 'TT-02', stock: 25, threshold: 15, category: 'Minuman' },
    { id: '3', name: 'Roti Bakar Kaya Butter', sku: 'RB-03', stock: 2, threshold: 5, category: 'Makanan' },
    { id: '4', name: 'Kopi Ais Kaw', sku: 'KP-04', stock: 18, threshold: 10, category: 'Minuman' },
  ]);

  const lowStockCount = items.filter((item) => item.stock <= item.threshold).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Package className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">
              {t('module_title')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {t('inventory_management')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('module_subtitle')}
          </p>
        </div>

        <Button
          onClick={() => {
            setItems((prev) =>
              prev.map((item) => ({ ...item, stock: item.stock + 10 }))
            );
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t('stock_in')}</span>
        </Button>
      </div>

      {/* Low stock warning banner */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">{t('low_stock_warning')}</p>
              <p className="text-xs opacity-80">
                {t('keusahawanan:inv_low_stock_desc', '{{count}} item berada di bawah paras ambang stok minimum.', { count: lowStockCount })}
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 uppercase tracking-wider">
            {lowStockCount} {t('keusahawanan:inv_items_count_label', 'Item')}
          </span>
        </div>
      )}

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>{t('daily_sales')}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground">RM 480.00</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {t('keusahawanan:inv_stat_vs_yesterday', '+12.5% berbanding semalam')}
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>{t('monthly_revenue')}</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground">RM 14,250.00</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {t('keusahawanan:inv_stat_target_reached', 'Sasaran 85% tercapai')}
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>{t('sales_analytics')}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground">94 {t('keusahawanan:inv_stat_transactions', 'Transaksi')}</p>
          <p className="text-[11px] text-muted-foreground font-medium">
            {t('keusahawanan:inv_stat_avg_order', 'Purata RM 5.10 / pesanan')}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            {t('keusahawanan:inv_stock_list_title', 'Senarai Stok Barangan')}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-black uppercase tracking-wider">
                <th className="pb-3">SKU</th>
                <th className="pb-3">{t('keusahawanan:inv_th_item_name', 'Nama Barangan')}</th>
                <th className="pb-3">{t('keusahawanan:inv_th_category', 'Kategori')}</th>
                <th className="pb-3 text-right">{t('keusahawanan:inv_th_stock_balance', 'Baki Stok')}</th>
                <th className="pb-3 text-center">{t('keusahawanan:inv_th_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {items.map((item) => {
                const isLow = item.stock <= item.threshold;
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="py-3 font-mono font-bold text-muted-foreground">
                      {item.sku}
                    </td>
                    <td className="py-3 font-bold text-foreground">{item.name}</td>
                    <td className="py-3 text-muted-foreground">{item.category}</td>
                    <td className="py-3 text-right font-black text-foreground">
                      {item.stock} {t('keusahawanan:inv_unit_label', 'unit')}
                    </td>
                    <td className="py-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> {t('low_stock_warning')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {t('keusahawanan:inv_status_sufficient', 'Mencukupi')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default KeusahawananInventoryPage;
