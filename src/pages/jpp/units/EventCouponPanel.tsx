import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Ticket, Plus, Pencil, Trash2, Power, RefreshCw, Store, Calendar,
  X, Percent, Banknote, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EventCoupon {
  id: string;
  event_id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: 'FIXED' | 'PERCENT';
  discount_value: number;
  min_purchase: number;
  max_uses?: number | null;
  uses_count: number;
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  created_at: string;
}

interface EventInfo { id: string; title: string; event_date?: string | null; }

interface BusinessClaim {
  business_id: string;
  business_name: string;
  count: number;
  total_discount: number;
}

export function EventCouponPanel() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [coupons, setCoupons] = useState<EventCoupon[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [byBusiness, setByBusiness] = useState<BusinessClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventCoupon | null>(null);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '', name: '', description: '', discount_type: 'FIXED' as 'FIXED' | 'PERCENT',
    discount_value: '', min_purchase: '0', max_uses: '', valid_from: '', valid_until: '', is_active: true,
  });

  const fmtRM = (v: number) => `RM${Number(v || 0).toFixed(2)}`;

  // Load events (utama: acara dengan is_siswapreneur / semua event)
  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from('ems_events')
      .select('id, title, event_date')
      .order('event_date', { ascending: false });
    const list = (data ?? []) as EventInfo[];
    setEvents(list);
    // Pilih acara pertama (Siswapreneur paling baru) atau simpan pilihan
    setEventId(prev => prev || list[0]?.id || '');
  }, []);

  const loadCoupons = useCallback(async (eid: string) => {
    if (!eid) { setCoupons([]); setClaims([]); setByBusiness([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('event_coupons')
      .select('*')
      .eq('event_id', eid)
      .order('created_at', { ascending: false });
    if (!error) setCoupons((data ?? []) as EventCoupon[]);
    setLoading(false);
  }, []);

  const loadClaims = useCallback(async (eid: string) => {
    if (!eid) { setClaims([]); setByBusiness([]); return; }
    const { data, error } = await supabase
      .from('event_coupon_claims')
      .select('id, coupon_id, business_id, discount_amount, claimed_at, business:keusahawanan_businesses(name)')
      .eq('event_id', eid)
      .order('claimed_at', { ascending: false })
      .limit(200);
    if (error) return;
    const rows = (data ?? []) as any[];
    setClaims(rows);
    // Breakdown per perniagaan
    const map = new Map<string, BusinessClaim>();
    for (const r of rows) {
      const key = r.business_id;
      const cur = map.get(key) ?? { business_id: key, business_name: (r as any).business?.name ?? '—', count: 0, total_discount: 0 };
      cur.count += 1;
      cur.total_discount += Number(r.discount_amount) || 0;
      map.set(key, cur);
    }
    setByBusiness(Array.from(map.values()).sort((a, b) => b.count - a.count));
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadCoupons(eventId); loadClaims(eventId); }, [eventId, loadCoupons, loadClaims]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', description: '', discount_type: 'FIXED', discount_value: '', min_purchase: '0', max_uses: '', valid_from: '', valid_until: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (c: EventCoupon) => {
    setEditing(c);
    setForm({
      code: c.code, name: c.name, description: c.description ?? '',
      discount_type: c.discount_type, discount_value: String(c.discount_value),
      min_purchase: String(c.min_purchase ?? 0), max_uses: c.max_uses != null ? String(c.max_uses) : '',
      valid_from: c.valid_from ?? '', valid_until: c.valid_until ?? '', is_active: c.is_active,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!eventId) return;
    if (!form.code.trim() || !form.name.trim() || !form.discount_value) {
      toast.error('Kod, nama dan nilai diskaun diperlukan.');
      return;
    }
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      min_purchase: parseFloat(form.min_purchase) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
    };
    let err: any = null;
    if (editing) {
      const { error } = await supabase.from('event_coupons').update(payload).eq('id', editing.id);
      err = error;
      if (!err) toast.success(`Kupon ${payload.code} dikemaskini!`);
    } else {
      const { error } = await supabase.from('event_coupons').insert({ ...payload, event_id: eventId });
      err = error;
      if (!err) toast.success(`Kupon ${payload.code} dicipta!`);
    }
    if (err) {
      if (err.code === '23505') toast.error('Kod kupon sudah wujud untuk acara ini.');
      else toast.error('Gagal simpan: ' + err.message);
      return;
    }
    setShowModal(false);
    loadCoupons(eventId);
  };

  const toggleActive = async (c: EventCoupon) => {
    const { error } = await supabase.from('event_coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Kupon ${c.code} ${c.is_active ? 'dinyahaktifkan' : 'diaktifkan'}.`);
    loadCoupons(eventId);
  };

  const remove = async (c: EventCoupon) => {
    const ok = window.confirm(`Padam kupon ${c.code}? Rekod claim juga akan dipadam.`);
    if (!ok) return;
    const { error } = await supabase.from('event_coupons').delete().eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Kupon ${c.code} dipadam.`);
    loadCoupons(eventId); loadClaims(eventId);
  };

  const selectedEvent = events.find(e => e.id === eventId);
  const totalUses = coupons.reduce((s, c) => s + (c.uses_count ?? 0), 0);
  const totalCap = coupons.reduce((s, c) => s + (c.max_uses ?? 0), 0);
  const claimedRM = claims.reduce((s, r) => s + (Number(r.discount_amount) || 0), 0);
  const inputCls = 'w-full h-10 px-3 rounded-xl text-xs font-medium outline-none bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/50 transition-all';

  return (
    <div className="space-y-6">
      {/* Header + event selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Kupon / Voucher Acara</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 h-10">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            <select value={eventId} onChange={e => setEventId(e.target.value)}
              className="bg-transparent text-xs font-black text-white outline-none max-w-[220px]">
              {events.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-slate-900">{ev.title}</option>
              ))}
            </select>
          </div>
          <button onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all">
            <Plus className="w-3.5 h-3.5" /> Cipta Kupon
          </button>
          <button onClick={() => { loadCoupons(eventId); loadClaims(eventId); }}
            className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center transition-all">
            <RefreshCw className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {/* Statistik keseluruhan acara */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Jumlah Claim</p>
          <p className="text-3xl font-black text-white mt-1">{totalUses}</p>
          <p className="text-[10px] text-white/40 mt-1">daripada {totalCap || '∞'} had</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Nilai Diskaun Diberi</p>
          <p className="text-3xl font-black text-white mt-1">{fmtRM(claimedRM)}</p>
          <p className="text-[10px] text-white/40 mt-1">jumlah RM5.00 per claim</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Perniagaan Terlibat</p>
          <p className="text-3xl font-black text-white mt-1">{byBusiness.length}</p>
          <p className="text-[10px] text-white/40 mt-1">gerai dah guna kupon</p>
        </div>
      </div>

      {/* Senarai kupon */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
          <Ticket className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm font-black text-white/60">Tiada kupon untuk {selectedEvent?.title ?? 'acara ini'}</p>
          <p className="text-[11px] text-white/30 mt-1">Klik "Cipta Kupon" untuk buat voucher baharu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const expanded = expandedCoupon === c.id;
            const remaining = c.max_uses != null ? Math.max(0, c.max_uses - c.uses_count) : null;
            const pct = c.max_uses ? Math.min(100, Math.round((c.uses_count / c.max_uses) * 100)) : 0;
            return (
              <motion.div key={c.id} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Ticket className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white tracking-wider">{c.code}</p>
                      {!c.is_active && (
                        <span className="text-[8px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">Tidak Aktif</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/50 truncate">{c.name}{c.description ? ` — ${c.description}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-amber-400">
                      {c.discount_type === 'FIXED' ? `RM${Number(c.discount_value)}` : `${c.discount_value}%`}
                    </p>
                    <p className="text-[9px] text-white/40">
                      {c.uses_count}/{c.max_uses ?? '∞'} claim
                    </p>
                  </div>
                  <div className="w-32 shrink-0 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${c.max_uses ? pct : 8}%` }} />
                    </div>
                    <p className="text-[8px] text-white/30 mt-1 text-right">{remaining != null ? `${remaining} baki` : 'Tanpa had'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(c)} title={c.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${c.is_active ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-white/30 bg-white/[0.04] hover:bg-white/[0.08]'}`}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(c)} title="Edit"
                      className="w-8 h-8 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c)} title="Padam"
                      className="w-8 h-8 rounded-lg text-rose-400/70 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setExpandedCoupon(expanded ? null : c.id)} title="Lihat claim"
                      className="w-8 h-8 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all">
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Breakdown Claim per Gerai</p>
                    </div>
                    {byBusiness.length === 0 ? (
                      <p className="text-[11px] text-white/30">Belum ada claim.</p>
                    ) : (
                      <div className="grid gap-2">
                        {byBusiness.map(b => (
                          <div key={b.business_id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2">
                            <Store className="w-3.5 h-3.5 text-white/40 shrink-0" />
                            <p className="flex-1 min-w-0 text-xs font-black text-white truncate">{b.business_name}</p>
                            <span className="text-[10px] font-black text-amber-400">{b.count} claim</span>
                            <span className="text-[10px] font-black text-emerald-400">{fmtRM(b.total_discount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {claims.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Claim Terkini</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {claims.slice(0, 30).map(cl => (
                            <div key={cl.id} className="flex items-center gap-2 text-[10px]">
                              <span className="text-white/60 truncate flex-1">{(cl as any).business?.name ?? '—'}</span>
                              <span className="text-white/30 shrink-0">
                                {new Date(cl.claimed_at).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-amber-400 font-black shrink-0">-{fmtRM(Number(cl.discount_amount) || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal Cipta / Edit ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-black text-white uppercase tracking-widest">
                  {editing ? 'Edit Kupon' : 'Cipta Kupon Baharu'}
                </p>
                <button onClick={() => setShowModal(false)} className="ml-auto p-1.5 rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Kod</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="MAHRAJAN" className={inputCls + ' mt-1'} />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nama</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Voucher MAHRAJAN" className={inputCls + ' mt-1'} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Penerangan</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Diskaun RM5 untuk pembelian di gerai..." className={inputCls + ' mt-1'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Jenis</label>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => setForm({ ...form, discount_type: 'FIXED' })}
                      className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1 ${form.discount_type === 'FIXED' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/[0.03] border-white/10 text-white/40'}`}>
                      <Banknote className="w-3 h-3" /> RM Tetap
                    </button>
                    <button onClick={() => setForm({ ...form, discount_type: 'PERCENT' })}
                      className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1 ${form.discount_type === 'PERCENT' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/[0.03] border-white/10 text-white/40'}`}>
                      <Percent className="w-3 h-3" /> Peratus
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nilai</label>
                  <input value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === 'FIXED' ? '5.00' : '10'} type="number" min="0" step="0.01"
                    className={inputCls + ' mt-1'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Minimum Belian (RM)</label>
                  <input value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })}
                    type="number" min="0" step="0.01" className={inputCls + ' mt-1'} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Had Claim</label>
                  <input value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="100 (kosong = tanpa had)" type="number" min="1" className={inputCls + ' mt-1'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Mula (tarikh)</label>
                  <input value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })}
                    type="date" className={inputCls + ' mt-1'} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Tamat (tarikh)</label>
                  <input value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                    type="date" className={inputCls + ' mt-1'} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Aktif sekarang</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/[0.04] border border-white/10 text-white/50 hover:bg-white/[0.08] transition-all">
                  Batal
                </button>
                <button onClick={save}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider transition-all">
                  {editing ? 'Simpan' : 'Cipta Kupon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
