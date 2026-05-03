// ============================================================
// KlkResidencyModal — Modal Deklarasi Status Kediaman
// Muncul untuk pelajar Sem 2 dan ke atas (KECUALI Sem 1) yang belum declare kediaman
// Pattern ikut ForcePhoneUpdateModal.tsx
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Home, Building2, ArrowRight, Loader2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSemesterInfo } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useKlkDynamicFields } from '@/hooks/useKlkDynamicFields';
import { KlkDynamicFieldRenderer } from '@/components/klk/KlkDynamicFieldRenderer';
import { KawasanSearchSelect } from '@/components/klk/KawasanSearchSelect';

const KLS_COLOR = '#60A5FA';

function getCurrentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function KlkResidencyModal() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'choice' | 'form' | 'done'>('choice');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form state
  const [alamat, setAlamat] = useState('');
  const [kawasan, setKawasan] = useState('');
  const [kawasanCustom, setKawasanCustom] = useState('');
  const [cadangan, setCadangan] = useState('');
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Dynamic fields from DB
  const isLuarStep = step === 'form';
  const { fields: dynamicFields, kawasanList } = useKlkDynamicFields(isLuarStep);

  // ── Semak sama ada perlu tunjuk modal ──────────────────────
  const checkShouldShow = useCallback(async () => {
    if (!profile || !user) { setChecking(false); return; }

    // Dikecualikan: SUPER_ADMIN_JPP dan STAFF sahaja
    // JPP biasa tetap diwajibkan isi seperti pelajar lain
    const role = profile.role;
    if (role === 'SUPER_ADMIN_JPP' || role === 'STAFF') {
      setChecking(false); return;
    }

    // Kira semester semasa
    if (!profile.intake_year || !profile.intake_period) {
      setChecking(false); return;
    }

    const { semester } = getSemesterInfo(
      profile.intake_year,
      profile.intake_period as 1 | 2,
      profile.programme_code === 'FTV',
    );

    // Hanya tanya mulai Sem 2
    if (semester < 2) { setChecking(false); return; }

    // Semak jika dah ada rekod untuk semester/tahun semasa
    try {
      const academicYear = getCurrentAcademicYear();
      const { data, error } = await supabase
        .from('klk_student_residency')
        .select('id')
        .eq('user_id', user.id)
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .maybeSingle();

      // Jika table belum wujud (DB belum migrate), jangan tunjuk modal
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        setChecking(false); return;
      }

      if (!data) setShow(true); // Belum ada rekod — tunjuk modal
    } catch {
      // Fail gracefully — jangan block user
    }
    setChecking(false);
  }, [profile, user]);

  useEffect(() => { checkShouldShow(); }, [checkShouldShow]);

  if (checking || !show) return null;

  // ── Handler: Pilih Dalam KAMSIS ────────────────────────────
  const handleKamsis = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const { semester } = getSemesterInfo(
        profile.intake_year!,
        profile.intake_period as 1 | 2,
        profile.programme_code === 'FTV',
      );
      const academicYear = getCurrentAcademicYear();

      // Soalan SEMUA (applies_to === 'SEMUA') perlu dijawab walaupun KAMSIS
      const kamsisExtra = { ...extraData };

      const { error } = await supabase.from('klk_student_residency').insert({
        user_id: user.id,
        academic_year: academicYear,
        semester,
        tinggal_luar: false,
        nama_pelajar: profile.full_name,
        no_matrik: profile.matric_no?.toUpperCase() ?? '',
        no_telefon: profile.phone ?? null,
        jabatan: profile.department ?? null,
        source: 'WEBAPP',
        extra_data: Object.keys(kamsisExtra).length > 0 ? kamsisExtra : {},
      });

      if (error && error.code !== '42P01') throw error;
      setStep('done');
      setTimeout(() => setShow(false), 2000);
    } catch (e: any) {
      toast.error('Gagal simpan. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handler: Submit Form Luar Kampus ───────────────────────
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!alamat.trim()) { toast.error('Sila isi alamat kediaman.'); return; }
    if (!kawasan) { toast.error('Sila pilih kawasan kediaman.'); return; }
    if (kawasan === 'LAIN_LAIN' && !kawasanCustom.trim()) {
      toast.error('Sila nyatakan kawasan anda.'); return;
    }
    // Validate required dynamic fields
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(`Sila isi: ${f.label}`); return;
      }
    }

    setLoading(true);
    try {
      const { semester } = getSemesterInfo(
        profile.intake_year!,
        profile.intake_period as 1 | 2,
        profile.programme_code === 'FTV',
      );
      const academicYear = getCurrentAcademicYear();

      const { error } = await supabase.from('klk_student_residency').insert({
        user_id: user.id,
        academic_year: academicYear,
        semester,
        tinggal_luar: true,
        nama_pelajar: profile.full_name,
        no_matrik: profile.matric_no?.toUpperCase() ?? '',
        no_telefon: profile.phone ?? null,
        jabatan: profile.department ?? null,
        alamat_kediaman: alamat.trim(),
        kawasan_kediaman: kawasan,
        kawasan_custom: kawasan === 'LAIN_LAIN' ? kawasanCustom.trim() : null,
        cadangan: cadangan.trim() || null,
        source: 'WEBAPP',
        extra_data: Object.keys(extraData).length > 0 ? extraData : {},
      });

      if (error && error.code !== '42P01') throw error;
      setStep('done');
      toast.success('Maklumat kediaman berjaya disimpan!');
      setTimeout(() => setShow(false), 2000);
    } catch (e: any) {
      toast.error('Gagal simpan. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-lg bg-slate-900 rounded-[2rem] shadow-2xl border border-white/[0.07] overflow-hidden"
          >
            {/* Header */}
            <div
              className="h-28 relative overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 60%, #0f1f35 100%)' }}
            >
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #60A5FA33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #818CF833 0%, transparent 50%)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center relative z-10"
                style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }}
              >
                <MapPin className="w-7 h-7 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-7">
              <AnimatePresence mode="wait">

                {/* Step 1 — Pilihan */}
                {step === 'choice' && (
                  <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h2 className="text-xl font-black text-white mb-1 tracking-tight">
                      Di mana anda tinggal semester ini?
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mb-6">
                      Exco Kediaman Luar Kampus perlu mengumpul maklumat kediaman pelajar setiap semester.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dalam KAMSIS */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleKamsis}
                        disabled={loading}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-emerald-300">Dalam KAMSIS</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">(Asrama)</p>
                        </div>
                      </motion.button>

                      {/* Luar Kampus */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep('form')}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                          <Home className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-blue-300">Luar Kampus</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">(Sewa / Rumah)</p>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2 — Form Luar Kampus */}
                {step === 'form' && (
                  <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex items-center gap-3 mb-5">
                      <button
                        onClick={() => setStep('choice')}
                        className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                      <div>
                        <h2 className="text-lg font-black text-white tracking-tight">Maklumat Kediaman</h2>
                        <p className="text-[11px] text-slate-500">Isi maklumat tempat tinggal anda</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitForm} className="space-y-4 max-h-[55dvh] overflow-y-auto pr-1 scrollbar-hide">
                      {/* Nama — pre-filled, read-only */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nama Pelajar</label>
                        <input
                          readOnly
                          value={profile?.full_name ?? ''}
                          className="w-full h-11 px-4 rounded-xl bg-slate-800/60 border border-white/[0.06] text-slate-300 text-sm font-medium cursor-not-allowed"
                        />
                      </div>

                      {/* No Matrik — pre-filled */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">No. Matrik</label>
                        <input
                          readOnly
                          value={profile?.matric_no?.toUpperCase() ?? ''}
                          className="w-full h-11 px-4 rounded-xl bg-slate-800/60 border border-white/[0.06] text-slate-300 text-sm font-medium cursor-not-allowed uppercase"
                        />
                      </div>

                      {/* Alamat */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Alamat Kediaman <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={alamat}
                          onChange={e => setAlamat(e.target.value)}
                          placeholder="Contoh: No. 12, Jalan Semambu 1, Taman Semambu..."
                          rows={2}
                          required
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium resize-none focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all placeholder:text-slate-600"
                        />
                      </div>

                      {/* Kawasan */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Kawasan Kediaman <span className="text-red-400">*</span>
                        </label>
                        <KawasanSearchSelect
                          value={kawasan}
                          onChange={setKawasan}
                          kawasanList={kawasanList}
                          inputClass="bg-slate-800/60 border-white/[0.08] text-white"
                          required
                        />
                      </div>

                      {/* Kawasan Custom */}
                      {kawasan === 'LAIN_LAIN' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Nyatakan Kawasan <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={kawasanCustom}
                            onChange={e => setKawasanCustom(e.target.value)}
                            placeholder="Nama kawasan..."
                            required
                            className="w-full h-11 px-4 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                          />
                        </div>
                      )}

                      {/* Cadangan */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Cadangan / Penambahbaikan
                          <span className="ml-1 font-medium normal-case text-slate-600">(Pilihan)</span>
                        </label>
                        <textarea
                          value={cadangan}
                          onChange={e => setCadangan(e.target.value)}
                          placeholder="Cadangan kepada Exco KLK..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium resize-none focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>

                      {/* Soalan Dinamik dari Form Builder */}
                      <KlkDynamicFieldRenderer
                        fields={dynamicFields}
                        values={extraData}
                        onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                      />

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 8px 24px rgba(59,130,246,0.25)' }}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Hantar Maklumat <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* Step 3 — Done */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-xl font-black text-white mb-2">Terima Kasih!</h2>
                    <p className="text-sm text-slate-400">Maklumat kediaman anda telah disimpan.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
