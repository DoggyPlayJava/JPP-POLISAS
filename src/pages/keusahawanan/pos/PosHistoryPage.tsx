import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData } from '@/hooks/usePosData';
import { hexToRgba } from '@/lib/utils';
import {
  History, Search, FileText, Ban, ChevronRight, X,
  CreditCard, Banknote, QrCode, CheckCircle2, XCircle,
} from 'lucide-react';
import { type BusinessTransaction } from '@/types';
import { EInvoiceModal } from '@/components/keusahawanan/EInvoiceModal';

const fmtRM = (v: number | null | undefined) => v != null ? `RM ${v.toFixed(2)}` : '—';
const fmtDT = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PAYMENT_ICONS: Record<string, React.ElementType> = { CASH: Banknote, QR: QrCode, TRANSFER: CreditCard };
const PAYMENT_LABELS: Record<string, string> = { CASH: 'Tunai', QR: 'QR', TRANSFER: 'Transfer' };

export function PosHistoryPage() {
  const { color } = useExcoTheme();
  const { profile } = useAuth();
  const { selectedBusiness, isKeusahawananAdmin } = useBusinessSwitcher();
  const businessId = selectedBusiness?.id;
  const businessName = selectedBusiness?.name;
  const businessLogo = (selectedBusiness as any)?.logo_url;
  const isOwner = isKeusahawananAdmin;

  const pos = usePosData(businessId);

  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'VOIDED'>('ALL');
  const [selected, setSelected]   = useState<BusinessTransaction | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [voiding, setVoiding]     = useState(false);

  useEffect(() => {
    if (businessId) pos.fetchTransactions(businessId);
  }, [businessId]);

  const filtered = pos.transactions.filter(t => {
    const matchSearch = t.invoice_number.toLowerCase().includes(search.toLowerCase())
      || (t.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleVoid = async () => {
    if (!selected || !businessId || !window.confirm(`Batalkan transaksi ${selected.invoice_number}? Stok akan dikembalikan.`)) return;
    setVoiding(true);
    await pos.voidTransaction(selected.id, businessId);
    setVoiding(false);
    setSelected(null);
  };

  const invoiceData = selected ? {
    ...selected,
    businessName,
    businessLogo,
    serverName: (selected as any).server?.full_name || profile?.full_name,
    discountRM: selected.discount_amount,
    totalAmount: selected.total_amount,
    changeAmount: selected.change_amount,
  } : null;

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">POS</p>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Sejarah Transaksi</h1>
      </motion.div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari no. invois atau pelanggan..."
            className="w-full h-11 pl-11 pr-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
        </div>
        <div className="flex gap-2 bg-muted/30 p-1 rounded-2xl">
          {(['ALL', 'COMPLETED', 'VOIDED'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={filterStatus === s ? { background: color, color: '#fff' } : { color: 'hsl(var(--muted-foreground)/0.6)' }}>
              {s === 'ALL' ? 'Semua' : s === 'COMPLETED' ? 'Selesai' : 'Dibatal'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      {pos.isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-black text-muted-foreground/40">Tiada rekod transaksi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => {
            const PayIcon = PAYMENT_ICONS[t.payment_method] || Banknote;
            return (
              <motion.button key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i }}
                onClick={() => setSelected(t)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:shadow-md hover:border-border/80 transition-all text-left group">
                {/* Status icon */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${t.status === 'COMPLETED' ? '' : 'bg-rose-500/10'}`}
                  style={t.status === 'COMPLETED' ? { background: hexToRgba(color, 0.1) } : {}}>
                  {t.status === 'COMPLETED'
                    ? <CheckCircle2 className="w-5 h-5" style={{ color }} />
                    : <XCircle className="w-5 h-5 text-rose-500" />
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-foreground">{t.invoice_number}</p>
                    {t.status === 'VOIDED' && <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase">Dibatal</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDT(t.created_at)} · {t.customer_name || 'Tanpa nama'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PayIcon className="w-3 h-3 text-muted-foreground/50" />
                    <p className="text-[10px] text-muted-foreground/50">{PAYMENT_LABELS[t.payment_method]}</p>
                    <span className="text-muted-foreground/30">·</span>
                    <p className="text-[10px] text-muted-foreground/50">{(t.items as any[]).length} item</p>
                  </div>
                </div>
                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black" style={{ color: t.status === 'VOIDED' ? 'hsl(var(--muted-foreground)/0.4)' : color }}>
                    {fmtRM(t.total_amount)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selected && (
            <div className="fixed inset-0 z-[9999]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
              <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                className="absolute inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Detail Transaksi</p>
                    <p className="text-lg font-black text-foreground">{selected.invoice_number}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: 'Tarikh', value: fmtDT(selected.created_at) },
                      { label: 'Status', value: selected.status === 'COMPLETED' ? 'Selesai' : 'Dibatal' },
                      { label: 'Pelanggan', value: selected.customer_name || 'Tanpa nama' },
                      { label: 'Kaedah Bayar', value: PAYMENT_LABELS[selected.payment_method] || selected.payment_method },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 mb-0.5">{label}</p>
                        <p className="text-xs font-black text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Item Pesanan</p>
                    <div className="space-y-2">
                      {(selected.items as any[]).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                          <div>
                            <p className="text-xs font-black text-foreground">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.qty} × {fmtRM(item.unit_price)}</p>
                          </div>
                          <p className="text-xs font-black" style={{ color }}>{fmtRM(item.total_price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 p-4 rounded-2xl border border-border/50">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span className="font-black">{fmtRM(selected.subtotal)}</span>
                    </div>
                    {selected.discount_amount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Diskaun</span><span className="font-black">-{fmtRM(selected.discount_amount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between">
                      <span className="text-sm font-black text-foreground">Jumlah</span>
                      <span className="text-lg font-black" style={{ color }}>{fmtRM(selected.total_amount)}</span>
                    </div>
                    {selected.payment_method === 'CASH' && (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Diterima</span><span className="font-black">{fmtRM(selected.received_amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Baki</span><span className="font-black">{fmtRM(selected.change_amount)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {selected.customer_note && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 mb-1">Catatan</p>
                      <p className="text-xs text-foreground">{selected.customer_note}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-5 border-t border-border">
                  <button onClick={() => setShowInvoice(true)}
                    className="flex-1 h-12 rounded-2xl border border-border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                    <FileText className="w-4 h-4" /> Jana Invois
                  </button>
                  {isOwner && selected.status === 'COMPLETED' && (
                    <button onClick={handleVoid} disabled={voiding}
                      className="flex-1 h-12 rounded-2xl bg-rose-500/10 text-rose-600 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                      <Ban className="w-4 h-4" /> {voiding ? 'Membatal...' : 'Void'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}

      {/* Invoice modal */}
      {showInvoice && invoiceData && (
        <EInvoiceModal transaction={invoiceData} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  );
}
