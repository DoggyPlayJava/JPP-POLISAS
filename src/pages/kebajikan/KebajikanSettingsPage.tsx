import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Save, Clock, Mail, MessageSquare, AlertTriangle, Trash2, Database, ShieldAlert, Users, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { KEBAJIKAN_THEME_COLOR, KebajikanPic } from '@/types';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const TEAL = KEBAJIKAN_THEME_COLOR;

interface SlaConfig {
  warning_hours:   number;
  escalate_hours:  number;
}

interface EmailPrefs {
  new_ticket:   boolean;
  warning:      boolean;
  escalation:   boolean;
  reopen:       boolean;
}

interface KebajikanSettings {
  sla:          SlaConfig;
  email_prefs:  EmailPrefs;
  auto_reply:   string;
}

const DEFAULT_SETTINGS: KebajikanSettings = {
  sla: { warning_hours: 48, escalate_hours: 72 },
  email_prefs: { new_ticket: true, warning: true, escalation: true, reopen: true },
  auto_reply: 'Terima kasih atas aduan anda. No. Tiket anda ialah {ticket_no}. Exco Kebajikan akan menghubungi anda dalam masa yang singkat. Terima kasih.',
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl p-6', className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)' }}>
        <Icon className="w-4 h-4" style={{ color: TEAL }} />
      </div>
      <div>
        <p className="font-black text-slate-100">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function KebajikanSettingsPage() {
  const { user, isSuperAdmin, isKebajikanExco } = useAuth();
  const isAllowed = isSuperAdmin || isKebajikanExco;

  const [settings, setSettings]           = useState<KebajikanSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]             = useState(true);
  const [savingSlA, setSavingSla]         = useState(false);
  const [savingReply, setSavingReply]     = useState(false);
  const [slaInput, setSlaInput]           = useState({ warning_hours: 48, escalate_hours: 72 });
  const [autoReply, setAutoReply]         = useState(DEFAULT_SETTINGS.auto_reply);

  // Retention state
  const [retentionMonths, setRetentionMonths] = useState(6);
  const [savingRetention, setSavingRetention] = useState(false);
  const [cleanupPreview, setCleanupPreview]   = useState<{ count: number; images: number } | null>(null);
  const [loadingPreview, setLoadingPreview]   = useState(false);
  const [cleaning, setCleaning]               = useState(false);

  // PIC Presets state
  const [pics, setPics]           = useState<KebajikanPic[]>([]);
  const [picLoading, setPicLoading] = useState(false);
  const [showAddPic, setShowAddPic] = useState(false);
  const [newPic, setNewPic]       = useState({ jabatan_label: '', pic_name: '', pic_title: '', pic_email: '', pic_phone: '' });
  const [savingPic, setSavingPic] = useState(false);

  const fetchPics = useCallback(async () => {
    setPicLoading(true);
    const { data } = await supabase.from('kebajikan_pics').select('*').order('jabatan_label');
    setPics((data || []) as KebajikanPic[]);
    setPicLoading(false);
  }, []);

  useEffect(() => { if (isAllowed) fetchPics(); }, [fetchPics, isAllowed]);


  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kebajikan_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      const parsed: KebajikanSettings = {
        sla: { warning_hours: data.sla_warning_hours, escalate_hours: data.sla_escalate_hours },
        email_prefs: {
          new_ticket: data.email_new_ticket,
          warning:    data.email_warning,
          escalation: data.email_escalation,
          reopen:     data.email_reopen,
        },
        auto_reply: data.auto_reply_message,
      };
      setSettings(parsed);
      setSlaInput({ warning_hours: parsed.sla.warning_hours, escalate_hours: parsed.sla.escalate_hours });
      setAutoReply(parsed.auto_reply);
      if (data.data_retention_months) setRetentionMonths(data.data_retention_months);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const persistSla = async (warning_hours: number, escalate_hours: number) => {
    const { error } = await supabase
      .from('kebajikan_settings')
      .update({ sla_warning_hours: warning_hours, sla_escalate_hours: escalate_hours, updated_by: user?.id, updated_at: new Date().toISOString() })
      .not('id', 'is', null);
    if (error) throw error;
  };

  const persistEmailPref = async (field: string, val: boolean) => {
    const { error } = await supabase
      .from('kebajikan_settings')
      .update({ [field]: val, updated_by: user?.id, updated_at: new Date().toISOString() })
      .not('id', 'is', null);
    if (error) throw error;
  };

  const persistAutoReply = async (msg: string) => {
    const { error } = await supabase
      .from('kebajikan_settings')
      .update({ auto_reply_message: msg, updated_by: user?.id, updated_at: new Date().toISOString() })
      .not('id', 'is', null);
    if (error) throw error;
  };

  const handleSaveSla = async () => {
    if (!isAllowed) return;
    if (slaInput.warning_hours <= 0 || slaInput.escalate_hours <= slaInput.warning_hours) {
      toast.error('Jam Escalation mestilah lebih besar daripada jam Warning.');
      return;
    }
    setSavingSla(true);
    try {
      await persistSla(slaInput.warning_hours, slaInput.escalate_hours);
      setSettings(s => ({ ...s, sla: { warning_hours: slaInput.warning_hours, escalate_hours: slaInput.escalate_hours } }));
      toast.success('Konfigurasi SLA dikemaskini! ⏱');
    } catch { toast.error('Gagal simpan SLA.'); }
    setSavingSla(false);
  };

  const handleToggleEmail = async (prefKey: keyof EmailPrefs, val: boolean) => {
    if (!isAllowed) return;
    const dbFieldMap: Record<keyof EmailPrefs, string> = {
      new_ticket: 'email_new_ticket', warning: 'email_warning',
      escalation: 'email_escalation', reopen: 'email_reopen',
    };
    setSettings(s => ({ ...s, email_prefs: { ...s.email_prefs, [prefKey]: val } }));
    try {
      await persistEmailPref(dbFieldMap[prefKey], val);
    } catch { toast.error('Gagal kemaskini tetapan email.'); }
  };

  const handleSaveAutoReply = async () => {
    if (!isAllowed) return;
    setSavingReply(true);
    try {
      await persistAutoReply(autoReply);
      setSettings(s => ({ ...s, auto_reply: autoReply }));
      toast.success('Mesej auto-reply dikemaskini! 📨');
    } catch { toast.error('Gagal simpan mesej auto-reply.'); }
    setSavingReply(false);
  };

  // ── Retention handlers ──────────────────────────────────────────────────────
  const handleSaveRetention = async () => {
    if (!isAllowed) return;
    setSavingRetention(true);
    try {
      await supabase.from('kebajikan_settings')
        .update({ data_retention_months: retentionMonths, updated_by: user?.id, updated_at: new Date().toISOString() })
        .not('id', 'is', null);
      toast.success(`Tempoh pengekalan dikemaskini: ${retentionMonths} bulan 💾`);
      setCleanupPreview(null); // reset preview
    } catch { toast.error('Gagal simpan tetapan.'); }
    setSavingRetention(false);
  };

  const handlePreviewCleanup = async () => {
    setLoadingPreview(true);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - retentionMonths);
    const { data } = await supabase
      .from('kebajikan_tickets')
      .select('image_urls')
      .in('status', ['CANCELLED', 'RESOLVED', 'CLOSED'])
      .lt('created_at', cutoff.toISOString());
    const totalImages = (data ?? []).reduce((sum, t) => sum + (t.image_urls?.length ?? 0), 0);
    setCleanupPreview({ count: data?.length ?? 0, images: totalImages });
    setLoadingPreview(false);
  };

  const handleRunCleanup = async () => {
    if (!isAllowed) return;
    if (!window.confirm(`Anda pasti? Ini akan MEMADAM GAMBAR daripada ${cleanupPreview?.count ?? 0} tiket lama. Rekod tiket TIDAK dipadam.`)) return;
    setCleaning(true);
    try {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - retentionMonths);
      // Ambil tiket dengan gambar
      const { data: rawTickets } = await supabase
        .from('kebajikan_tickets')
        .select('id, image_urls')
        .in('status', ['CANCELLED', 'RESOLVED', 'CLOSED'])
        .lt('created_at', cutoff.toISOString());

      const tickets = (rawTickets || []).filter(t => t.image_urls && t.image_urls.length > 0);

      if (!tickets || tickets.length === 0) {
        toast.success('Tiada gambar untuk dipadam.');
        setCleaning(false);
        return;
      }

      // Extract all storage paths
      const allPaths: string[] = [];
      const marker = '/kebajikan-images/';
      tickets.forEach(t => {
        (t.image_urls ?? []).forEach((url: string) => {
          const idx = url.indexOf(marker);
          if (idx !== -1) allPaths.push(decodeURIComponent(url.substring(idx + marker.length)));
        });
      });

      // Delete from storage in batches of 100
      let deleted = 0;
      for (let i = 0; i < allPaths.length; i += 100) {
        const batch = allPaths.slice(i, i + 100);
        const { error } = await supabase.storage.from('kebajikan-images').remove(batch);
        if (!error) deleted += batch.length;
      }

      // Clear image_urls in DB
      const ids = tickets.map(t => t.id);
      await supabase.from('kebajikan_tickets')
        .update({ image_urls: [] })
        .in('id', ids);

      toast.success(`✅ Berjaya! ${deleted} gambar dipadam dari ${tickets.length} tiket.`);
      setCleanupPreview(null);
    } catch (e: any) {
      toast.error('Ralat semasa pembersihan: ' + e.message);
    }
    setCleaning(false);
  };

  const EMAIL_TOGGLES: { key: keyof EmailPrefs; label: string; desc: string }[] = [
    { key: 'new_ticket',  label: 'Tiket Baru',       desc: 'Notif bila pelajar hantar aduan baharu' },
    { key: 'warning',     label: 'Warning SLA (48j)', desc: 'Notif bila tiket hampir melebihi SLA Warning' },
    { key: 'escalation',  label: 'Escalation (72j)',  desc: 'Notif bila tiket diescalate secara auto' },
    { key: 'reopen',      label: 'Reopen Request',    desc: 'Notif bila pelajar request buka semula tiket' },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}>
            <Settings className="w-5 h-5" style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-50 tracking-tight">Tetapan E-Kebajikan</h1>
            <p className="text-xs text-slate-500">Konfigurasi SLA, notifikasi email, dan mesej auto-reply</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* SLA Configuration */}
          <GlassCard>
            <SectionHeader icon={Clock} title="Konfigurasi SLA" subtitle="Masa had sebelum sistem menghantar amaran dan escalate tiket" />
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">⚠️ Warning (jam)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={slaInput.warning_hours}
                    onChange={e => setSlaInput(s => ({ ...s, warning_hours: +e.target.value }))}
                    disabled={!isAllowed}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 outline-none focus:border-teal-500/50 transition-colors disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500">jam</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Semasa ini: {settings.sla.warning_hours}j</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">🔴 Escalation (jam)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={slaInput.escalate_hours}
                    onChange={e => setSlaInput(s => ({ ...s, escalate_hours: +e.target.value }))}
                    disabled={!isAllowed}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 outline-none focus:border-teal-500/50 transition-colors disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500">jam</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Semasa ini: {settings.sla.escalate_hours}j</p>
              </div>
            </div>
            {isAllowed && (
              <button
                onClick={handleSaveSla}
                disabled={savingSlA}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                style={{ background: 'rgba(45,212,191,0.1)', color: TEAL, border: '1px solid rgba(45,212,191,0.2)' }}
              >
                <Save className="w-3.5 h-3.5" />
                {savingSlA ? 'Menyimpan...' : 'Simpan Konfigurasi SLA'}
              </button>
            )}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-[11px] text-amber-400/80">⚠️ Edge Function <code className="bg-amber-500/10 px-1 rounded">check-kebajikan-sla</code> akan membaca nilai ini setiap jam untuk memproses warning dan escalation secara automatik.</p>
            </div>
          </GlassCard>

          {/* Email Notifications */}
          <GlassCard>
            <SectionHeader icon={Mail} title="Notifikasi Email" subtitle="Toggle notifikasi email untuk akaun anda (per-user)" />
            <div className="space-y-4">
              {EMAIL_TOGGLES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-slate-200">{label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  <Switch
                    checked={settings.email_prefs[key]}
                    onCheckedChange={val => handleToggleEmail(key, val)}
                    disabled={!isAllowed}
                    className="data-[state=checked]:bg-teal-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-3">
              * Fungsi email memerlukan Resend API keys dikonfigurasi dalam Edge Functions. Fasa 2.
            </p>
          </GlassCard>

          {/* Auto-Reply Message */}
          <GlassCard>
            <SectionHeader icon={MessageSquare} title="Mesej Auto-Reply" subtitle="Mesej yang dihantar kepada pelajar selepas menghantar aduan" />
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Placeholder: <code className="bg-white/5 text-teal-400 px-1.5 py-0.5 rounded">{'{ticket_no}'}</code>
              </p>
              <textarea
                value={autoReply}
                onChange={e => setAutoReply(e.target.value)}
                disabled={!isAllowed}
                rows={5}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500/50 transition-colors resize-none leading-relaxed disabled:opacity-50"
              />
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Preview</p>
              <p className="text-xs text-slate-300 leading-relaxed">{autoReply.replace('{ticket_no}', 'KBJ-2026-0001')}</p>
            </div>
            {isAllowed && (
              <button
                onClick={handleSaveAutoReply}
                disabled={savingReply}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                style={{ background: 'rgba(45,212,191,0.1)', color: TEAL, border: '1px solid rgba(45,212,191,0.2)' }}
              >
                <Save className="w-3.5 h-3.5" />
                {savingReply ? 'Menyimpan...' : 'Simpan Mesej Auto-Reply'}
              </button>
            )}
          </GlassCard>

          {/* Data Retention */}
          <GlassCard>
            <SectionHeader icon={Database} title="Pengekalan Data & Pembersihan" subtitle="Urus gambar dan data tiket lama untuk menjimatkan ruang storan" />

            {/* Retention period config */}
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Tempoh Pengekalan Minimum</label>
              <div className="flex flex-wrap gap-2">
                {[3, 6, 12, 18, 24].map(m => (
                  <button
                    key={m}
                    onClick={() => { setRetentionMonths(m); setCleanupPreview(null); }}
                    disabled={!isAllowed}
                    className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40"
                    style={
                      retentionMonths === m
                        ? { background: 'rgba(45,212,191,0.15)', color: TEAL, border: '1px solid rgba(45,212,191,0.3)' }
                        : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    {m} Bulan
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3">
                Gambar dari tiket SELESAI / DITUTUP / DIBATAL yang lebih lama daripada <span style={{ color: TEAL }} className="font-black">{retentionMonths} bulan</span> akan dipadam semasa pembersihan dijalankan.
              </p>
            </div>

            {isAllowed && (
              <button
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest mb-6 transition-all"
                style={{ background: 'rgba(45,212,191,0.08)', color: TEAL, border: '1px solid rgba(45,212,191,0.15)' }}
              >
                <Save className="w-3.5 h-3.5" />
                {savingRetention ? 'Menyimpan...' : 'Simpan Tempoh'}
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-white/5 my-6" />

            {/* Preview & Cleanup */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-200">Pratonton Pembersihan</p>
                  <p className="text-[11px] text-slate-500">Semak berapa tiket yang layak untuk dibersihkan</p>
                </div>
                <button
                  onClick={handlePreviewCleanup}
                  disabled={loadingPreview || !isAllowed}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 text-slate-400 hover:border-teal-500/30 hover:text-teal-400 transition-colors disabled:opacity-30"
                >
                  {loadingPreview ? 'Menganalisis...' : 'Semak Sekarang'}
                </button>
              </div>

              {cleanupPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border bg-white/[0.01]"
                  style={{ borderColor: cleanupPreview.count > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)' }}
                >
                  {cleanupPreview.count === 0 ? (
                    <p className="text-sm text-emerald-400 font-bold">✅ Tiada data untuk dibersihkan. Storan bersih!</p>
                  ) : (
                    <>
                      <p className="text-sm font-black text-amber-400 mb-1">
                        {cleanupPreview.count} tiket · {cleanupPreview.images} gambar layak dipadam
                      </p>
                      <p className="text-[11px] text-slate-500">Rekod tiket TIDAK akan dipadam — hanya gambar sahaja.</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* Danger Zone */}
              {isAllowed && cleanupPreview && cleanupPreview.count > 0 && (
                <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Zon Bahaya — Tindakan Tidak Boleh Diterbalikkan</p>
                  </div>
                  <button
                    onClick={handleRunCleanup}
                    disabled={cleaning}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    {cleaning ? 'Sedang Membersihkan...' : `Jalankan Pembersihan (${cleanupPreview.images} Gambar)`}
                  </button>
                </div>
              )}

              {/* Export CSV */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                <div>
                  <p className="text-sm font-bold text-slate-300">Eksport Semua Data</p>
                  <p className="text-[11px] text-slate-500">Muat turun semua tiket sebagai CSV</p>
                </div>
                <button
                  onClick={async () => {
                    const { data } = await supabase.from('kebajikan_tickets').select('*').csv();
                    if (data) {
                      const blob = new Blob([data], { type: 'text/csv' });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement('a');
                      a.href     = url;
                      a.download = `kebajikan_tiket_${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('CSV berjaya dimuat turun!');
                    }
                  }}
                  disabled={!isAllowed}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 text-slate-400 hover:border-teal-500/30 hover:text-teal-400 transition-colors disabled:opacity-30"
                >
                  Eksport CSV
                </button>
              </div>
            </div>
          </GlassCard>

          {/* PIC Presets */}
          <GlassCard>
            <SectionHeader icon={Users} title="Pengurusan Preset PIC" subtitle="Senarai PIC (Person-in-Charge) per jabatan untuk laporan escalated" />
            <div className="space-y-3">
              {picLoading ? (
                <p className="text-xs text-white/30 text-center py-4">Memuatkan...</p>
              ) : pics.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">Tiada preset PIC lagi. Tambah di bawah.</p>
              ) : pics.map(p => (
                <div key={p.id} className={cn('flex items-center gap-3 p-3.5 rounded-2xl border transition-colors', p.is_active ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.03] bg-black/20 opacity-50')}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-200 truncate">{p.jabatan_label}</p>
                    <p className="text-[10px] text-white/40">{p.pic_name}{p.pic_title ? ` · ${p.pic_title}` : ''}{p.pic_email ? ` · ${p.pic_email}` : ''}</p>
                  </div>
                  <button onClick={async () => {
                    await supabase.from('kebajikan_pics').update({ is_active: !p.is_active }).eq('id', p.id);
                    fetchPics();
                  }} className="text-white/30 hover:text-teal-400 transition-colors" title={p.is_active ? 'Nyahaktifkan' : 'Aktifkan'}>
                    {p.is_active ? <ToggleRight className="w-4 h-4 text-teal-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Padam preset PIC "${p.pic_name}"?`)) return;
                    await supabase.from('kebajikan_pics').delete().eq('id', p.id);
                    fetchPics();
                    toast.success('Preset PIC dipadam.');
                  }} className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New PIC */}
            <div className="mt-4">
              {!showAddPic ? (
                <button onClick={() => setShowAddPic(true)} className="flex items-center gap-2 text-xs font-black text-teal-400 hover:text-teal-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Tambah Preset PIC
                </button>
              ) : (
                <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.03] p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-400/70 mb-2">Preset PIC Baru</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Nama Jabatan / Kemudahan *</p>
                      <input value={newPic.jabatan_label} onChange={e => setNewPic(p => ({ ...p, jabatan_label: e.target.value }))}
                        placeholder="cth: Jabatan Kejuruteraan Mekanikal"
                        className="w-full h-8 px-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/20 focus:border-teal-500/40 focus:outline-none" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Nama PIC *</p>
                      <input value={newPic.pic_name} onChange={e => setNewPic(p => ({ ...p, pic_name: e.target.value }))}
                        placeholder="cth: Encik Ahmad bin Ali"
                        className="w-full h-8 px-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/20 focus:border-teal-500/40 focus:outline-none" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Jawatan</p>
                      <input value={newPic.pic_title} onChange={e => setNewPic(p => ({ ...p, pic_title: e.target.value }))}
                        placeholder="cth: Ketua Jabatan"
                        className="w-full h-8 px-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/20 focus:border-teal-500/40 focus:outline-none" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Emel</p>
                      <input value={newPic.pic_email} onChange={e => setNewPic(p => ({ ...p, pic_email: e.target.value }))}
                        placeholder="pic@polisas.edu.my"
                        className="w-full h-8 px-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/20 focus:border-teal-500/40 focus:outline-none" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">No. Telefon</p>
                      <input value={newPic.pic_phone} onChange={e => setNewPic(p => ({ ...p, pic_phone: e.target.value }))}
                        placeholder="01x-xxxxxxx"
                        className="w-full h-8 px-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/20 focus:border-teal-500/40 focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={async () => {
                      if (!newPic.jabatan_label.trim() || !newPic.pic_name.trim()) { toast.error('Nama jabatan dan nama PIC wajib diisi.'); return; }
                      setSavingPic(true);
                      const { error } = await supabase.from('kebajikan_pics').insert({
                        category: 'FASILITI_JABATAN',
                        jabatan_label: newPic.jabatan_label.trim(),
                        pic_name: newPic.pic_name.trim(),
                        pic_title: newPic.pic_title.trim() || null,
                        pic_email: newPic.pic_email.trim() || null,
                        pic_phone: newPic.pic_phone.trim() || null,
                        created_by: user?.id,
                      });
                      if (!error) {
                        toast.success('Preset PIC berjaya ditambah!');
                        setNewPic({ jabatan_label: '', pic_name: '', pic_title: '', pic_email: '', pic_phone: '' });
                        setShowAddPic(false);
                        fetchPics();
                      } else {
                        toast.error('Gagal tambah PIC: ' + error.message);
                      }
                      setSavingPic(false);
                    }} disabled={savingPic} className="flex items-center gap-1.5 px-4 h-8 rounded-xl text-xs font-black text-slate-950 transition-all hover:brightness-110" style={{ background: TEAL }}>
                      <Save className="w-3.5 h-3.5" /> {savingPic ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setShowAddPic(false)} className="px-4 h-8 rounded-xl text-xs font-black text-white/40 hover:text-white border border-white/10 transition-colors">Batal</button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

        </div>
      )}
    </div>
  );
}

