import React, { useEffect, useState } from 'react';
import { Key, X, Copy, Check, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createJuryCode, toggleJuryCodeActive, deleteJuryCode } from '@/lib/ems';
import type { EmsEvent, EmsJuryCode } from '@/types';

export interface EmsJuryCodeModalProps {
  event: EmsEvent | null;
  onClose: () => void;
}

export function EmsJuryCodeModal({ event, onClose }: EmsJuryCodeModalProps) {
  const { t } = useTranslation(['ems', 'common']);
  const [juryCodes, setJuryCodes] = useState<EmsJuryCode[]>([]);
  const [loadingJuryCodes, setLoadingJuryCodes] = useState(false);
  const [juryForm, setJuryForm] = useState({
    code: '',
    jury_name: '',
    organization: '',
    assigned_categories: '',
    assigned_booths: '',
  });
  const [isSubmittingJury, setIsSubmittingJury] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [juryCategories, setJuryCategories] = useState<string[]>([]);
  const [juryBooths, setJuryBooths] = useState<string[]>([]);
  const [loadingJuryOptions, setLoadingJuryOptions] = useState(false);

  useEffect(() => {
    if (!event) return;

    const randomCode = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setJuryForm({
      code: randomCode,
      jury_name: '',
      organization: '',
      assigned_categories: '',
      assigned_booths: '',
    });

    const loadCodes = async () => {
      try {
        setLoadingJuryCodes(true);
        const { data, error } = await supabase
          .from('ems_jury_codes')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setJuryCodes(data || []);
      } catch (err: any) {
        toast.error(t('ems:jury_code_toast_load_error', 'Gagal memuatkan senarai kod juri'));
      } finally {
        setLoadingJuryCodes(false);
      }
    };

    const loadOptions = async () => {
      try {
        setLoadingJuryOptions(true);
        const { data: rubrics } = await supabase
          .from('ems_rubrics')
          .select('category_name')
          .eq('event_id', event.id)
          .not('category_name', 'is', null)
          .neq('category_name', '');
        const rubricCats = Array.from(
          new Set((rubrics || []).map((r: any) => r.category_name).filter(Boolean))
        ) as string[];

        let cats = rubricCats;
        if (cats.length === 0) {
          const { data: participants } = await supabase
            .from('ems_participants')
            .select('category_name')
            .eq('event_id', event.id)
            .not('category_name', 'is', null)
            .neq('category_name', '')
            .order('category_name');
          cats = Array.from(
            new Set((participants || []).map((p: any) => p.category_name).filter(Boolean))
          ) as string[];
        }
        setJuryCategories(cats);

        const { data: boothRows } = await supabase
          .from('ems_participants')
          .select('team_name')
          .eq('event_id', event.id)
          .not('team_name', 'is', null)
          .neq('team_name', '')
          .order('team_name');
        const booths = Array.from(
          new Set((boothRows || []).map((p: any) => p.team_name).filter(Boolean))
        ) as string[];
        setJuryBooths(booths);
      } catch {
        setJuryCategories([]);
        setJuryBooths([]);
      } finally {
        setLoadingJuryOptions(false);
      }
    };

    loadCodes();
    loadOptions();
  }, [event, t]);

  if (!event) return null;

  const handleCreateJuryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juryForm.code.trim()) {
      toast.error(t('ems:jury_code_toast_required', 'Sila masukkan kod juri.'));
      return;
    }

    try {
      setIsSubmittingJury(true);
      const categoriesArray = juryForm.assigned_categories
        ? juryForm.assigned_categories.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const boothsArray = juryForm.assigned_booths
        ? juryForm.assigned_booths.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const created = await createJuryCode(event.id, {
        code: juryForm.code,
        jury_name: juryForm.jury_name,
        organization: juryForm.organization,
        assigned_categories: categoriesArray,
        assigned_booths: boothsArray,
      });

      toast.success(t('ems:jury_code_toast_success', 'Kod Juri {{code}} berjaya dicipta!', { code: created.code }));
      setJuryCodes((prev) => [created, ...prev]);

      const newRandomCode = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setJuryForm({
        code: newRandomCode,
        jury_name: '',
        organization: '',
        assigned_categories: '',
        assigned_booths: '',
      });
    } catch (err: any) {
      toast.error(err?.message || t('ems:jury_code_toast_error', 'Gagal mencipta kod juri: {{error}}', { error: err?.message || '' }));
    } finally {
      setIsSubmittingJury(false);
    }
  };

  const getWhatsAppMessage = (j: EmsJuryCode) => {
    const portalUrl = `${window.location.origin}/ems/juri?code=${encodeURIComponent(j.code)}`;
    const juryName = j.jury_name || "Dato'/Dr./Tuan/Puan";
    const org = j.organization ? ` (${j.organization})` : '';

    return t('ems:jury_code_wa_intro', {
      name: juryName,
      org,
      title: event.title,
      code: j.code,
      url: portalUrl,
      defaultValue: `*JEMPUTAN PENJURIAN EMS POLISAS*\n\nSalam Sejahtera *${juryName}*${org},\n\nAnda dijemput sebagai *Juri Penilai Rasmi* bagi acara:\n*${event.title}*\n\nMaklumat Akses Penjurian Anda:\n- *Nama Juri:* ${j.jury_name || '-'}\n- *Organisasi:* ${j.organization || '-'}\n- *Kod Jemputan Juri:* \`${j.code}\` \n\nSila layari Portal Juri Penilai melalui pautan rasmi di bawah untuk memulakan pemarkahan:\n${portalUrl}\n\nTerima kasih atas sumbangan & sokongan anda!\n- *Jawatankuasa Perwakilan Pelajar (JPP) POLISAS*`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/80 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl my-8 relative text-slate-900 dark:text-white animate-in fade-in-50 zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          aria-label={t('ems:cancel', 'Tutup Modal')}
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-1">
            <Key className="w-5 h-5" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('ems:jury_code_title', 'Jana Kod Akses Juri')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {t('ems:jury_code_event', 'Acara:')} {event.title}
          </p>
        </div>

        {/* Form Cipta Kod Juri */}
        <form onSubmit={handleCreateJuryCode} className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('ems:jury_code_label', 'Kod Akses Juri')} <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={juryForm.code}
                onChange={(e) => setJuryForm({ ...juryForm, code: e.target.value.toUpperCase() })}
                placeholder={t('ems:jury_code_placeholder', 'Contoh: JURI-101')}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm uppercase focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  const rnd = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                  setJuryForm({ ...juryForm, code: rnd });
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
              >
                {t('ems:jury_code_auto_btn', 'Auto')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('ems:jury_code_jury_name', 'Nama Juri')}
              </label>
              <input
                type="text"
                value={juryForm.jury_name}
                onChange={(e) => setJuryForm({ ...juryForm, jury_name: e.target.value })}
                placeholder={t('ems:jury_code_jury_name_placeholder', 'e.g. Dr. Ahmad Hassan')}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('ems:jury_code_org', 'Organisasi / Jabatan')}
              </label>
              <input
                type="text"
                value={juryForm.organization}
                onChange={(e) => setJuryForm({ ...juryForm, organization: e.target.value })}
                placeholder={t('ems:jury_code_org_placeholder', 'e.g. JTM POLISAS')}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('ems:jury_code_rubric_cats', 'Kategori Rubrik (Penilaian)')}
            </label>
            {loadingJuryOptions ? (
              <p className="text-xs text-slate-500 animate-pulse">{t('ems:jury_code_loading_cats', 'Memuatkan kategori rubrik...')}</p>
            ) : juryCategories.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {t('ems:jury_code_no_rubrics', 'Tiada rubrik berdaftar dalam acara ini. Anda boleh taip manual di bawah.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {juryCategories.map((cat) => {
                  const selected = juryForm.assigned_categories
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const current = juryForm.assigned_categories
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        const next = selected ? current.filter((x) => x !== cat) : [...current, cat];
                        setJuryForm({ ...juryForm, assigned_categories: next.join(', ') });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              value={juryForm.assigned_categories}
              onChange={(e) => setJuryForm({ ...juryForm, assigned_categories: e.target.value })}
              placeholder={t('ems:jury_code_cats_placeholder', 'e.g. Best Pitching, Best Showcase')}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('ems:jury_code_assigned_booths', 'Booth Ditugaskan')}
            </label>
            {loadingJuryOptions ? (
              <p className="text-xs text-slate-500 animate-pulse">{t('ems:jury_code_loading_booths', 'Memuatkan booth...')}</p>
            ) : juryBooths.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {t('ems:jury_code_no_booths', 'Tiada booth berdaftar dalam acara ini. Anda boleh taip manual di bawah.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 mb-2">
                {juryBooths.map((booth) => {
                  const selected = juryForm.assigned_booths
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .includes(booth);
                  return (
                    <button
                      key={booth}
                      type="button"
                      onClick={() => {
                        const current = juryForm.assigned_booths
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        const next = selected ? current.filter((x) => x !== booth) : [...current, booth];
                        setJuryForm({ ...juryForm, assigned_booths: next.join(', ') });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300'
                      }`}
                    >
                      {booth}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              value={juryForm.assigned_booths}
              onChange={(e) => setJuryForm({ ...juryForm, assigned_booths: e.target.value })}
              placeholder={t('ems:jury_code_booths_placeholder', 'e.g. Booth 1, Booth 2')}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingJury}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 active:scale-98"
          >
            {isSubmittingJury ? t('ems:jury_code_submitting', 'Menjana Kod...') : t('ems:jury_code_submit_btn', '+ Cipta Kod Juri')}
          </button>
        </form>

        {/* Senarai Kod Juri Sedia Ada */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {t('ems:jury_code_list_title', 'Senarai Kod Juri Rasmi')} ({juryCodes.length})
          </h4>
          {loadingJuryCodes ? (
            <p className="text-xs text-slate-500 animate-pulse">{t('ems:jury_code_loading_cats', 'Memuatkan kod juri...')}</p>
          ) : juryCodes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{t('ems:jury_code_no_codes', 'Belum ada kod juri dicipta.')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {juryCodes.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {j.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          (j.is_active ?? true)
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {(j.is_active ?? true) ? t('ems:jury_code_active', 'Aktif') : t('ems:jury_code_inactive', 'Nyahaktif')}
                      </span>
                    </div>
                    {j.jury_name && (
                      <span className="text-slate-700 dark:text-slate-300 block mt-0.5 font-medium">{j.jury_name}</span>
                    )}
                    {j.organization && (
                      <span className="text-[10px] text-slate-500 block">{j.organization}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const newActive = !(j.is_active ?? true);
                          await toggleJuryCodeActive(j.id, newActive);
                          setJuryCodes((prev) =>
                            prev.map((item) =>
                              item.id === j.id ? { ...item, is_active: newActive } : item
                            )
                          );
                          toast.success(t('ems:jury_code_toast_toggle', 'Status kod juri dikemaskini!'));
                        } catch (err: any) {
                          toast.error(err.message || t('ems:error_occurred', 'Gagal mengubah status kod juri'));
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        (j.is_active ?? true)
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                      }`}
                    >
                      {(j.is_active ?? true) ? t('ems:jury_code_inactive', 'Nyahaktif') : t('ems:jury_code_active', 'Aktifkan')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const waMsg = getWhatsAppMessage(j);
                        navigator.clipboard.writeText(waMsg);
                        setCopiedCodeId(j.id);
                        toast.success(t('ems:jury_code_toast_copied', 'Kod juri disalin ke papan keratan!'));
                        setTimeout(() => setCopiedCodeId(null), 2000);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30 transition-all"
                      title={t('ems:jury_code_copy', 'Salin Teks Mesej WhatsApp Rasmi')}
                    >
                      {copiedCodeId === j.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCodeId === j.id ? t('ems:jury_code_copied', 'Disalin!') : t('ems:jury_code_copy', 'Salin')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const waMsg = getWhatsAppMessage(j);
                        window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, '_blank');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm"
                      title={t('ems:jury_code_share_wa', 'Buka terus di WhatsApp')}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Adakah anda pasti untuk memadam kod juri ${j.code}?`))
                          return;
                        try {
                          await deleteJuryCode(j.id);
                          setJuryCodes((prev) => prev.filter((item) => item.id !== j.id));
                          toast.success(t('ems:jury_code_toast_deleted', 'Kod juri dipadam.'));
                        } catch (err: any) {
                          toast.error(err.message || t('ems:error_occurred', 'Gagal memadam kod juri'));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all"
                      title={t('ems:jury_code_delete', 'Padam Kod Juri')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
