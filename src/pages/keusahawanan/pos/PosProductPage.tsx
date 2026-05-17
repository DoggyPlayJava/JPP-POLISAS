import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePosData } from '@/hooks/usePosData';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle,
  Eye, EyeOff, X, Camera, ChevronDown, ChevronUp,
  TrendingUp, Layers, Lightbulb, BarChart3, Info,
  DollarSign, ShoppingBag, HelpCircle
} from 'lucide-react';
import { type BusinessProduct, type CostItem } from '@/types';
import toast from 'react-hot-toast';
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Makanan', 'Minuman', 'Aksesori', 'Perkhidmatan', 'Pakaian', 'Elektronik', 'Umum'];

// Unit groups for pill selector
const UNIT_GROUPS = [
  { label: 'Berat',  units: ['g', 'kg'] },
  { label: 'Isipadu', units: ['ml', 'L'] },
  { label: 'Kira',   units: ['unit', 'biji', 'pek', 'helai', 'cawan', 'sudu'] },
];
const ALL_UNITS = UNIT_GROUPS.flatMap(g => g.units);

// Generate simple sequential ID for cost items
let _costItemSeq = 1;
const newCostId = () => `ci_${Date.now()}_${_costItemSeq++}`;

const EMPTY_COST_ITEM = (): CostItem => ({
  id: newCostId(),
  name: '',
  calc_mode: 'measurement',
  // measurement
  purchase_qty: 1000,
  purchase_unit: 'g',
  total_purchase_cost: 0,
  used_qty: 100,
  used_unit: 'g',
  // yield
  yield_per_purchase: 10,
  yield_unit: 'unit',
  used_per_product: 1,
  subtotal: 0,
});

// Unit conversion — convert to base (g for weight, ml for volume)
const UNIT_TO_BASE: Record<string, number> = {
  'g': 1, 'kg': 1000,
  'ml': 1, 'L': 1000,
  'unit': 1, 'biji': 1, 'pek': 1, 'helai': 1, 'cawan': 1, 'sudu': 1,
};

function toBase(qty: number, unit: string): number {
  return qty * (UNIT_TO_BASE[unit] ?? 1);
}

function calcSubtotal(item: CostItem): number {
  const cost = item.total_purchase_cost;
  if (cost <= 0) return 0;

  if (item.calc_mode === 'yield') {
    // Yield mode: (used_per_product / yield_per_purchase) × total_cost
    // Fallback used_per_product kepada 1 jika 0 atau undefined (elak kos RM 0 yang salah)
    if (item.yield_per_purchase <= 0) return 0;
    const usedPerProduct = (item.used_per_product > 0) ? item.used_per_product : 1;
    return parseFloat(
      ((usedPerProduct / item.yield_per_purchase) * cost).toFixed(6)
    );
  }

  // Measurement mode: ratio using base units
  if (item.purchase_qty <= 0) return 0;
  const purchaseBase = toBase(item.purchase_qty, item.purchase_unit);
  const usedBase     = toBase(item.used_qty,     item.used_unit);
  if (purchaseBase === 0) return 0;
  return parseFloat(((usedBase / purchaseBase) * cost).toFixed(6));
}

const EMPTY_FORM = {
  name: '', description: '', price: '', category: 'Umum',
  stock_quantity: '10', stock_alert_threshold: '5', is_available: true, image_url: '',
  // Cost fields
  cost_mode: 'quick' as 'quick' | 'advanced',
  quick_cost: '',           // single total cost input
  cost_items: [] as CostItem[],
  cost_notes: '',
  // PolyMart fields
  publish_to_polymart:  false,
  polymart_location:    '',
  polymart_pickup_info: '',
};

// ── Margin Logic ──────────────────────────────────────────────────────────────

function getMarginInfo(price: number, cost: number) {
  if (cost <= 0 || price <= 0) return null;
  const profit = price - cost;
  const margin = (profit / price) * 100;
  let level: 'great' | 'ok' | 'low' | 'danger';
  let label: string;
  let color: string;
  if (margin >= 40) { level = 'great'; label = 'Sangat Baik'; color = '#22c55e'; }
  else if (margin >= 20) { level = 'ok'; label = 'Wajar'; color = '#f59e0b'; }
  else if (margin >= 1) { level = 'low'; label = 'Rendah'; color = '#ef4444'; }
  else { level = 'danger'; label = 'RUGI!'; color = '#dc2626'; }
  return { profit, margin, level, label, color };
}

function fmtRM(v: number) {
  return `RM ${v.toFixed(2)}`;
}

// ── UnitPillSelector ─────────────────────────────────────────────────────────
// Pill button unit selector with optional custom text input

function UnitPillSelector({
  value, onChange, accent, placeholder,
}: { value: string; onChange: (u: string) => void; accent: string; placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState('');
  const isCustom = value !== '' && !UNIT_GROUPS.flatMap(g => g.units).includes(value);

  const handleCustomSubmit = () => {
    if (custom.trim()) { onChange(custom.trim()); setCustom(''); setOpen(false); }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-7 px-2.5 rounded-lg border border-border/50 bg-muted/30 text-[10px] font-black flex items-center gap-1 whitespace-nowrap hover:border-border transition-colors"
        style={{ color: isCustom ? accent : accent }}
      >
        <span className="max-w-[50px] truncate">{value || (placeholder ?? 'unit')}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setOpen(false)} />
          <div className="fixed z-[10001] bg-card border border-border rounded-2xl shadow-2xl p-2.5 min-w-[180px]"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -40%)' }}>
            {UNIT_GROUPS.map(g => (
              <div key={g.label} className="mb-2.5 last:mb-0">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mb-1.5">{g.label}</p>
                <div className="flex flex-wrap gap-1">
                  {g.units.map(u => (
                    <button key={u} type="button"
                      onClick={() => { onChange(u); setOpen(false); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={value === u
                        ? { background: accent, color: '#fff' }
                        : { background: 'hsl(var(--muted)/0.5)', color: 'hsl(var(--foreground))' }}
                    >{u}</button>
                  ))}
                </div>
              </div>
            ))}
            {/* Custom unit input */}
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mb-1.5">Lain-lain</p>
              <div className="flex gap-1.5">
                <input
                  type="text" value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                  placeholder="balang, tin, botol..."
                  className="flex-1 h-7 px-2 rounded-lg text-[10px] outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-border transition-all"
                />
                <button type="button" onClick={handleCustomSubmit}
                  className="h-7 px-2 rounded-lg text-[10px] font-black transition-colors"
                  style={{ background: hexToRgba(accent, 0.15), color: accent }}
                >OK</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── CostBuilder Component ─────────────────────────────────────────────────────

interface CostBuilderProps {
  mode: 'quick' | 'advanced';
  onModeChange: (m: 'quick' | 'advanced') => void;
  quickCost: string;
  onQuickCostChange: (v: string) => void;
  items: CostItem[];
  onItemsChange: (items: CostItem[]) => void;
  costNotes: string;
  onCostNotesChange: (v: string) => void;
  totalCost: number;
  accent: string;
}

function CostBuilder({
  mode, onModeChange, quickCost, onQuickCostChange,
  items, onItemsChange, costNotes, onCostNotesChange, totalCost, accent,
}: CostBuilderProps) {

  // ── Update helper: auto-recalculate subtotal on any field change ────────────
  const updateItem = (id: string, field: keyof CostItem, value: any) => {
    onItemsChange(items.map(item => {
      if (item.id !== id) return item;
      const TEXT_FIELDS: (keyof CostItem)[] = ['name', 'purchase_unit', 'used_unit', 'yield_unit', 'calc_mode'];
      const updated: CostItem = {
        ...item,
        [field]: TEXT_FIELDS.includes(field) ? value : (parseFloat(value) || 0),
      };
      updated.subtotal = calcSubtotal(updated);
      return updated;
    }));
  };

  // Toggle mod kalkulasi per item
  const toggleCalcMode = (id: string) => {
    onItemsChange(items.map(item => {
      if (item.id !== id) return item;
      const updated: CostItem = {
        ...item,
        calc_mode: item.calc_mode === 'measurement' ? 'yield' : 'measurement',
      };
      updated.subtotal = calcSubtotal(updated);
      return updated;
    }));
  };

  const addItem  = () => onItemsChange([...items, EMPTY_COST_ITEM()]);
  const removeItem = (id: string) => onItemsChange(items.filter(i => i.id !== id));

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border/50">
        {(['quick', 'advanced'] as const).map(m => (
          <button key={m} type="button" onClick={() => onModeChange(m)}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all"
            style={mode === m
              ? { background: hexToRgba(accent, 0.12), color: accent, borderBottom: `2px solid ${accent}` }
              : { color: 'hsl(var(--muted-foreground)/0.6)' }}
          >
            {m === 'quick' ? '⚡ Kos Ringkas' : '🧮 Pecahan Kos'}
          </button>
        ))}
      </div>

      {/* ── QUICK MODE ─────────────────────────────────────────────────────── */}
      {mode === 'quick' && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
            Jumlah Kos Per Unit (RM)
          </p>
          <input
            type="number" min="0" step="0.01"
            value={quickCost} onChange={e => onQuickCostChange(e.target.value)}
            placeholder="0.00 — contoh: 2.50"
            className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all"
          />
          <p className="text-[9px] text-muted-foreground/40 mt-1">
            Jumlah kesemua kos untuk satu unit produk ini: bahan, balutan, overhead, dll.
          </p>
        </div>
      )}

      {/* ── ADVANCED MODE — "Beli & Guna" ──────────────────────────────────── */}
      {mode === 'advanced' && (
        <div className="space-y-3">
          {/* Helper text */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
            <Info className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              Tambah setiap bahan satu persatu. Untuk setiap bahan, pilih cara kira:
              <br />
              <strong className="text-foreground/60">⚖️ Guna Berapa</strong> — tahu berapa gram/ml digunakan (cth: guna 50g gula per produk)
              <br />
              <strong className="text-foreground/60">📦 Buat Berapa</strong> — tahu 1 beg/balang buat berapa (cth: 1 balang air isi 25 cawan)
            </p>
          </div>

          {/* Item list */}
          {items.length === 0 && (
            <p className="text-[10px] text-muted-foreground/40 text-center py-3">
              Tiada bahan lagi. Tekan "＋ Tambah Bahan" untuk mula.
            </p>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => {
              const costOk = item.total_purchase_cost > 0 && (
                item.calc_mode === 'yield' ? item.yield_per_purchase > 0 : item.purchase_qty > 0
              );
              const subtotalDisplay = costOk
                ? `RM ${item.subtotal.toFixed(4).replace(/\.?0+$/, '') || '0'} / produk`
                : '—';
              const isYield = item.calc_mode === 'yield';

              return (
                <div key={item.id} className="rounded-2xl border border-border/40 bg-muted/20 p-3 space-y-2.5">

                  {/* Row 1: Name + Mod Toggle + Delete */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder={`Bahan ${idx + 1} (e.g. ${isYield ? 'Balang Air' : 'Gula'})`}
                      className="flex-1 h-8 px-3 rounded-xl text-[12px] font-bold outline-none bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-border transition-all min-w-0"
                    />
                    {/* Mod toggle — framed as a question, not a concept */}
                    <button type="button" onClick={() => toggleCalcMode(item.id)}
                      title={isYield
                        ? 'Mod: Buat Berapa — klik tukar ke Guna Berapa'
                        : 'Mod: Guna Berapa — klik tukar ke Buat Berapa'}
                      className="shrink-0 h-7 px-2 rounded-lg border text-[9px] font-black transition-all whitespace-nowrap"
                      style={isYield
                        ? { borderColor: hexToRgba(accent, 0.4), background: hexToRgba(accent, 0.1), color: accent }
                        : { borderColor: 'hsl(var(--border)/0.5)', background: 'hsl(var(--muted)/0.3)', color: 'hsl(var(--muted-foreground)/0.6)' }}
                    >
                      {isYield ? '📦 Buat Berapa' : '⚖️ Guna Berapa'}
                    </button>
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0">
                      <X className="w-3 h-3 text-rose-500" />
                    </button>
                  </div>

                  {/* Row 2: Beli — label context-aware */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                        {isYield ? 'Apa yang dibeli' : 'Beli'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min="0.001" step="any"
                          value={item.purchase_qty || ''}
                          onChange={e => updateItem(item.id, 'purchase_qty', e.target.value)}
                          placeholder={isYield ? '1' : '1000'}
                          className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-card border border-border/50 text-foreground text-center focus:border-border transition-all min-w-0"
                        />
                        <UnitPillSelector
                          value={item.purchase_unit}
                          onChange={u => updateItem(item.id, 'purchase_unit', u)}
                          accent={accent}
                          placeholder={isYield ? 'balang' : 'g'}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Harga Beli (RM)</p>
                      <div className="flex items-center gap-1 h-8 px-3 rounded-lg bg-card border border-border/50">
                        <span className="text-[10px] font-black text-muted-foreground/40">RM</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.total_purchase_cost || ''}
                          onChange={e => updateItem(item.id, 'total_purchase_cost', e.target.value)}
                          placeholder="3.50"
                          className="flex-1 h-full text-[11px] font-bold outline-none bg-transparent text-foreground focus:outline-none min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── MOD "Guna Berapa": ukur guna per produk ── */}
                  {!isYield && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                        Guna dalam 1 Produk
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="number" min="0" step="any"
                            value={item.used_qty || ''}
                            onChange={e => updateItem(item.id, 'used_qty', e.target.value)}
                            placeholder="50"
                            className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-card border border-border/50 text-foreground text-center focus:border-border transition-all min-w-0"
                          />
                          <UnitPillSelector
                            value={item.used_unit}
                            onChange={u => updateItem(item.id, 'used_unit', u)}
                            accent={accent}
                          />
                        </div>
                        {/* Subtotal chip */}
                        <div className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black"
                          style={costOk
                            ? { background: hexToRgba(accent, 0.10), color: accent, border: `1px solid ${hexToRgba(accent, 0.25)}` }
                            : { background: 'hsl(var(--muted)/0.4)', color: 'hsl(var(--muted-foreground)/0.4)' }}
                        >{subtotalDisplay}</div>
                      </div>
                    </div>
                  )}

                  {/* ── MOD "Buat Berapa": bahagi dari pukal/balang ── */}
                  {isYield && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          1 {item.purchase_unit || 'unit'} ini boleh buat / isi berapa?
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0.001" step="any"
                            value={item.yield_per_purchase || ''}
                            onChange={e => updateItem(item.id, 'yield_per_purchase', e.target.value)}
                            placeholder="25"
                            className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-card border border-border/50 text-foreground text-center focus:border-border transition-all min-w-0"
                          />
                          <UnitPillSelector
                            value={item.yield_unit}
                            onChange={u => updateItem(item.id, 'yield_unit', u)}
                            accent={accent}
                            placeholder="cawan"
                          />
                        </div>
                      </div>

                      {/* Formula summary: RM X ÷ Y = RM Z / produk */}
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black"
                        style={costOk
                          ? { background: hexToRgba(accent, 0.08), border: `1px solid ${hexToRgba(accent, 0.2)}`, color: 'hsl(var(--muted-foreground))' }
                          : { background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.3)', color: 'hsl(var(--muted-foreground)/0.4)' }}
                      >
                        <span>
                          {costOk
                            ? `RM ${item.total_purchase_cost.toFixed(2)} ÷ ${item.yield_per_purchase} ${item.yield_unit || 'servis'}`
                            : 'Isi harga beli & bilangan hasil dulu'}
                        </span>
                        <span style={costOk ? { color: accent } : {}}>
                          {costOk ? subtotalDisplay : '—'}
                        </span>
                      </div>
                    </div>
                  )}


                </div>
              );
            })}
          </div>

          {/* Add button */}
          <button type="button" onClick={addItem}
            className="w-full h-9 rounded-xl border border-dashed border-border/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-all flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah Bahan
          </button>

          {/* Grand total */}
          {totalCost > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: hexToRgba(accent, 0.08), border: `1px solid ${hexToRgba(accent, 0.2)}` }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Jumlah Kos Per Produk</p>
                <p className="text-[9px] text-muted-foreground/40">{items.filter(i => i.subtotal > 0).length} bahan dikira</p>
              </div>
              <span className="text-lg font-black" style={{ color: accent }}>{fmtRM(totalCost)}</span>
            </div>
          )}
        </div>
      )}

      {/* Cost notes */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
          Nota Kos (Pilihan)
        </p>
        <input type="text" value={costNotes} onChange={e => onCostNotesChange(e.target.value)}
          placeholder="e.g: Termasuk anggaran gas & overhead 10%"
          className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-border transition-all"
        />
      </div>
    </div>
  );
}

// ── Margin Preview Panel ──────────────────────────────────────────────────────

function MarginPreview({ price, cost, accent }: { price: number; cost: number; accent: string }) {
  const info = getMarginInfo(price, cost);

  if (!info) {
    return (
      <div className="p-3 rounded-2xl border border-dashed border-border/40 text-center">
        <p className="text-[10px] text-muted-foreground/40">
          Isi harga jual & kos untuk lihat analisis untung 📊
        </p>
      </div>
    );
  }

  const suggMin = cost * 1.10;
  const suggGood = cost / 0.70;  // 30% margin
  const suggPremium = cost / 0.50; // 50% margin

  return (
    <div className="space-y-2.5">
      {/* Main margin card */}
      <div className="p-3 rounded-2xl border" style={{ borderColor: hexToRgba(info.color, 0.3), background: hexToRgba(info.color, 0.05) }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Analisis Untung</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: info.color }}>
            {info.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Kos', val: fmtRM(cost) },
            { label: 'Untung Bersih', val: fmtRM(info.profit) },
            { label: 'Margin', val: `${info.margin.toFixed(1)}%` },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] font-black uppercase text-muted-foreground/40">{label}</p>
              <p className="text-sm font-black" style={{ color: info.color }}>{val}</p>
            </div>
          ))}
        </div>
        {/* Margin bar */}
        <div className="mt-2.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(info.margin, 100)}%`, background: info.color }} />
        </div>
      </div>

      {/* Smart pricing suggestions */}
      <div className="p-3 rounded-2xl border border-border/40 bg-muted/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="w-3.5 h-3.5" style={{ color: accent }} />
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Cadangan Harga</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Min (+10%)', val: suggMin, sub: '10% margin' },
            { label: 'Cadangan', val: suggGood, sub: '30% margin' },
            { label: 'Premium', val: suggPremium, sub: '50% margin' },
          ].map(({ label, val, sub }) => (
            <div key={label} className="text-center p-1.5 rounded-xl bg-card border border-border/30">
              <p className="text-[8px] font-black uppercase text-muted-foreground/40">{label}</p>
              <p className="text-[11px] font-black text-foreground">{fmtRM(val)}</p>
              <p className="text-[8px] text-muted-foreground/40">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PolyMart Ads Banner ───────────────────────────────────────────────────────
function PolymartAdsPromoBanner({ color }: { color: string }) {
  const [adsPhone, setAdsPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'polymart_ads_phone').single().then(({ data }) => {
      if (data) setAdsPhone(data.value?.replace(/["']/g, '') || '');
    });
  }, []);

  if (!adsPhone) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 mb-4 cursor-pointer hover:bg-amber-500/15 transition-colors"
      onClick={() => window.open(`https://wa.me/${adsPhone}?text=Hai Exco Keusahawanan, saya berminat untuk menempah slot Iklan/Penaja di PolyMart untuk tingkatkan jualan kedai saya!`, '_blank')}
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
          <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 leading-tight">Tingkatkan Jualan Anda di PolyMart! 🚀</h3>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium mt-0.5">Berminat letak produk anda di <b className="text-amber-600 dark:text-amber-400">Banner Hadapan</b>? Mesej Exco Keusahawanan sekarang.</p>
        </div>
      </div>
      <button className="h-9 px-4 rounded-xl text-xs font-bold text-white shrink-0 whitespace-nowrap shadow-md hover:scale-105 active:scale-95 transition-transform truncate"
        style={{ background: `linear-gradient(135deg, ${color}, #f59e0b)` }}>
        Hubungi Exco
      </button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PosProductPage() {
  const { color } = useExcoTheme();
  const { user, profile, isSuperAdmin } = useAuth();
  const { selectedBusiness, isKeusahawananAdmin } = useBusinessSwitcher();
  const businessId = selectedBusiness?.id;
  const isOwner = isKeusahawananAdmin || selectedBusiness?.owner_id === user?.id;

  const pos = usePosData(businessId);
  const { runTour, startTour, closeTour } = useTour('KEUSAHAWANAN_PRODUCT', !!businessId);

  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState<'name' | 'margin' | 'stock'>('name');
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showCost, setShowCost]   = useState(true);

  // Derived cost total
  const derivedTotalCost = (() => {
    if (form.cost_mode === 'quick') return parseFloat(form.quick_cost) || 0;
    return form.cost_items.reduce((s, i) => s + i.subtotal, 0);
  })();

  const priceNum = parseFloat(form.price) || 0;
  const marginInfo = getMarginInfo(priceNum, derivedTotalCost);

  const filtered = pos.products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'margin') {
        const mA = a.total_cost > 0 ? ((a.price - a.total_cost) / a.price) * 100 : -1;
        const mB = b.total_cost > 0 ? ((b.price - b.total_cost) / b.price) * 100 : -1;
        return mB - mA;
      }
      if (sortBy === 'stock') return b.stock_quantity - a.stock_quantity;
      return a.name.localeCompare(b.name);
    });

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowCost(true);
    setShowForm(true);
  };

  const openEdit = (p: BusinessProduct) => {
    setEditId(p.id);
    const rawItems = Array.isArray(p.cost_items) ? p.cost_items : [];
    const isOldFormat = rawItems.length > 0 && 'qty' in rawItems[0] && !('purchase_qty' in rawItems[0]);
    const hasValidItems = rawItems.length > 0 && !isOldFormat;
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category: p.category,
      stock_quantity: String(p.stock_quantity),
      stock_alert_threshold: String(p.stock_alert_threshold),
      is_available: p.is_available,
      image_url: p.image_url || '',
      cost_mode: hasValidItems ? 'advanced' : 'quick',
      quick_cost: hasValidItems ? '' : (p.total_cost > 0 ? String(p.total_cost) : ''),
      cost_items: hasValidItems ? (rawItems as unknown as CostItem[]) : [],
      cost_notes: p.cost_notes || '',
      // PolyMart fields
      publish_to_polymart:  (p as any).publish_to_polymart ?? false,
      polymart_location:    (p as any).polymart_location ?? '',
      polymart_pickup_info: (p as any).polymart_pickup_info ?? '',
    });
    setShowCost(true);
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading(true);
    const file = e.target.files[0];
    
    const { compressImage } = await import('@/lib/imageCompression');
    const compressedFile = await compressImage(file);
    
    const path = `${businessId}/${Date.now()}.${compressedFile.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('keusahawanan-products').upload(path, compressedFile, { contentType: compressedFile.type });
    if (error) { toast.error('Gagal muat naik: ' + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('keusahawanan-products').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast.success('Gambar dimuat naik!');
  };

  const handleSave = async () => {
    if (!businessId) return;
    if (!form.name.trim()) { toast.error('Nama produk wajib diisi.'); return; }
    if (!form.price || parseFloat(form.price) < 0) { toast.error('Harga tidak sah.'); return; }
    setSaving(true);

    const payload = {
      name:                  form.name.trim(),
      description:           form.description.trim() || null,
      price:                 parseFloat(form.price),
      category:              form.category,
      stock_quantity:        parseInt(form.stock_quantity) || 0,
      stock_alert_threshold: parseInt(form.stock_alert_threshold) || 5,
      is_available:          form.is_available,
      image_url:             form.image_url || null,
      // Smart Product cost fields
      cost_items:  form.cost_mode === 'advanced' ? form.cost_items.filter(i => i.name.trim()) : [],
      total_cost:  derivedTotalCost,
      cost_notes:  form.cost_notes.trim() || null,
      // PolyMart fields
      publish_to_polymart:  form.publish_to_polymart,
      polymart_location:    form.polymart_location.trim() || null,
      polymart_pickup_info: form.polymart_pickup_info.trim() || null,
      ...(form.publish_to_polymart && !editId ? { polymart_published_at: new Date().toISOString() } : {}),
    };

    if (editId) {
      await pos.updateProduct(editId, businessId, payload);
    } else {
      await pos.addProduct(businessId, payload as any);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (p: BusinessProduct) => {
    if (!window.confirm(`Padam "${p.name}"? Tindakan ini tidak boleh diundur.`)) return;
    if (businessId) await pos.deleteProduct(p.id, businessId, p.name);
  };

  const handleToggleAvailable = async (p: BusinessProduct) => {
    if (!businessId) return;
    await pos.updateProduct(p.id, businessId, { is_available: !p.is_available });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">POS</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Katalog Produk
            <button onClick={startTour} className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              <HelpCircle className="w-4 h-4" />
            </button>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pos.products.length} produk dalam katalog</p>
        </div>
        {isOwner && (
          <button onClick={openAdd}
            className="tour-pos-product-add flex items-center gap-2.5 h-12 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all hover:brightness-110 active:scale-95"
            style={{ background: color }}>
            <Plus className="w-4 h-4" /> Tambah Produk
          </button>
        )}
      </motion.div>

      {/* Ads Promo Banner */}
      <PolymartAdsPromoBanner color={color} />

      {/* Search + Sort */}
      <div className="tour-pos-product-category flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full h-11 pl-12 pr-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="h-11 px-4 rounded-2xl text-xs font-black outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
          <option value="name">Nama A–Z</option>
          <option value="margin">Margin Tertinggi</option>
          <option value="stock">Stok Tertinggi</option>
        </select>
      </div>

      {/* Product grid */}
      {pos.isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: color, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-black text-muted-foreground/40">Tiada produk ditemui</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => {
            const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.stock_alert_threshold;
            const isOut = p.stock_quantity === 0;
            const mi = p.total_cost > 0 ? getMarginInfo(p.price, p.total_cost) : null;

            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group">
                {/* Image */}
                <div className="aspect-video bg-muted/30 relative overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/20" /></div>
                  }
                  {!p.is_available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-black uppercase text-white tracking-widest">Tidak Aktif</span></div>}
                  {isOut && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">HABIS</div>}
                  {isLow && !isOut && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Stok: {p.stock_quantity}</div>}
                  {/* Margin badge */}
                  {mi && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-white text-[9px] font-black"
                      style={{ background: mi.color }}>
                      {mi.margin.toFixed(0)}%
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 mb-0.5">{p.category}</p>
                  <h3 className="text-sm font-black text-foreground leading-tight line-clamp-2 mb-2">{p.name}</h3>

                  <div className="tour-pos-product-stock flex items-center justify-between mb-1">
                    <span className="text-base font-black" style={{ color }}>{`RM ${p.price.toFixed(2)}`}</span>
                    <span className="text-xs text-muted-foreground">Stok: {p.stock_quantity}</span>
                  </div>

                  {/* Margin bar */}
                  {mi ? (
                    <div>
                      <div className="h-1 rounded-full bg-muted/50 overflow-hidden mb-1">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(mi.margin, 100)}%`, background: mi.color }} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] font-black" style={{ color: mi.color }}>
                          {mi.label} · {mi.margin.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">
                          Untung: {fmtRM(mi.profit)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted-foreground/30 flex items-center gap-1">
                      <Info className="w-2.5 h-2.5" /> Kos belum ditetapkan
                    </p>
                  )}

                  {isOwner && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleToggleAvailable(p)}
                        className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase border border-border flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors"
                        style={{ color: p.is_available ? color : 'hsl(var(--muted-foreground))' }}>
                        {p.is_available ? <><Eye className="w-3 h-3" /> Aktif</> : <><EyeOff className="w-3 h-3" /> Nyahaktif</>}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal — portaled */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl max-h-[92vh] overflow-y-auto scrollbar-hide">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black">{editId ? 'Edit Produk' : 'Produk Baharu'}</h3>
                    <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Image upload */}
                  <div className="relative group">
                    <div className="aspect-video bg-muted/30 rounded-2xl overflow-hidden border border-border flex items-center justify-center">
                      {form.image_url
                        ? <img src={form.image_url} alt="preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        : <Package className="w-12 h-12 text-muted-foreground/20" />
                      }
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl gap-2">
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-[11px] font-black text-white">{uploading ? 'Memuat naik...' : 'Tukar Gambar'}</span>
                        <input type="file" accept="image/*" className="hidden" onClick={e => e.stopPropagation()} onChange={handleUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>

                  {/* Basic Fields */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Nama Produk</p>
                    <input type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nasi Lemak Ayam"
                      className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Stok Semasa</p>
                      <input type="number" min="0" value={form.stock_quantity}
                        onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                        placeholder="20"
                        className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Had Amaran Stok</p>
                      <input type="number" min="0" value={form.stock_alert_threshold}
                        onChange={e => setForm(f => ({ ...f, stock_alert_threshold: e.target.value }))}
                        placeholder="5"
                        className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                      <p className="text-[9px] text-muted-foreground/40 mt-1 leading-tight">⚠️ Amaran muncul apabila stok ≤ nilai ini</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Kategori</p>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Penerangan (Pilihan)</p>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Penerangan ringkas produk..."
                      className="w-full h-16 px-4 py-3 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground resize-none placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border/40" />

                  {/* ── Smart Pricing Section ── */}
                  <div className="space-y-3">
                    <button onClick={() => setShowCost(v => !v)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.12) }}>
                          <BarChart3 className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-foreground">Smart Pricing</p>
                          <p className="text-[9px] text-muted-foreground/50">Kos produk & analisis margin</p>
                        </div>
                      </div>
                      {showCost ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
                    </button>

                    <AnimatePresence>
                      {showCost && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-4 pt-1">
                            {/* Selling price */}
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                                Harga Jual (RM) <span className="text-rose-500">*</span>
                              </p>
                              <input type="number" min="0" step="0.01"
                                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                placeholder="5.50"
                                className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                            </div>

                            {/* Cost Builder */}
                            <CostBuilder
                              mode={form.cost_mode}
                              onModeChange={m => setForm(f => ({ ...f, cost_mode: m }))}
                              quickCost={form.quick_cost}
                              onQuickCostChange={v => setForm(f => ({ ...f, quick_cost: v }))}
                              items={form.cost_items}
                              onItemsChange={items => setForm(f => ({ ...f, cost_items: items }))}
                              costNotes={form.cost_notes}
                              onCostNotesChange={v => setForm(f => ({ ...f, cost_notes: v }))}
                              totalCost={derivedTotalCost}
                              accent={color}
                            />

                            {/* Margin Preview */}
                            <MarginPreview price={priceNum} cost={derivedTotalCost} accent={color} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Available toggle */}
                  <button onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors">
                    <div className={`w-10 h-5.5 rounded-full transition-colors relative`}
                      style={form.is_available ? { background: color } : { background: 'hsl(var(--muted))' }}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs font-black text-foreground">
                      {form.is_available ? 'Produk Aktif — Boleh Dijual' : 'Produk Tidak Aktif'}
                    </span>
                  </button>

                  {/* ── PolyMart Section ── */}
                  <div className="space-y-3 rounded-2xl border p-3.5"
                    style={{ borderColor: form.publish_to_polymart ? 'rgba(245,158,11,0.35)' : 'hsl(var(--border)/0.5)', background: form.publish_to_polymart ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                    <button onClick={() => setForm(f => ({ ...f, publish_to_polymart: !f.publish_to_polymart }))}
                      className="flex items-center gap-3 w-full">
                      <div className="w-10 h-5.5 rounded-full transition-colors relative"
                        style={{ background: form.publish_to_polymart ? '#f59e0b' : 'hsl(var(--muted))' }}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.publish_to_polymart ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-black text-foreground">🛍️ Siarkan ke PolyMart</p>
                        <p className="text-[9px] text-muted-foreground/50 font-medium">Paparan dalam marketplace pelajar</p>
                      </div>
                    </button>
                    {form.publish_to_polymart && (
                      <AnimatePresence>
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="space-y-2.5 overflow-hidden pt-1">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Lokasi / Booth</p>
                            <input value={form.polymart_location}
                              onChange={e => setForm(f => ({ ...f, polymart_location: e.target.value }))}
                              placeholder="cth: Kafeteria A, Kiosk B2..."
                              className="w-full h-9 px-3 rounded-xl text-xs outline-none bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Waktu Operasi / Cara Ambil</p>
                            <input value={form.polymart_pickup_info}
                              onChange={e => setForm(f => ({ ...f, polymart_pickup_info: e.target.value }))}
                              placeholder="cth: Isnin-Jumaat 8am-4pm..."
                              className="w-full h-9 px-3 rounded-xl text-xs outline-none bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all" />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Save */}
                  <button onClick={handleSave} disabled={saving}
                    className="w-full h-12 rounded-2xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-lg transition-all hover:brightness-110"
                    style={{ background: color }}>
                    {saving ? 'Menyimpan...' : editId ? 'Kemaskini Produk' : 'Tambah Produk'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEUSAHAWANAN_PRODUCT" />
    </div>
  );
}
