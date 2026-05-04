// ============================================================
// KlkResidencyFormPage — Halaman Form Kediaman (/klk/form)
// Standalone page — boleh dicapai dari notifikasi / direct link
// ============================================================
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Home, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSemesterInfo, JABATAN_LIST } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useKlkDynamicFields } from '@/hooks/useKlkDynamicFields';
import { KlkDynamicFieldRenderer } from '@/components/klk/KlkDynamicFieldRenderer';
import { KawasanSearchSelect } from '@/components/klk/KawasanSearchSelect';
import { getKlkAcademicYear } from '@/utils/klkUtils';

export function KlkResidencyFormPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'choice' | 'form' | 'done'>('choice');
  const [loading, setLoading] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);

  // Form state
  const [alamat, setAlamat] = useState('');
  const [kawasan, setKawasan] = useState('');
  const [kawasanCustom, setKawasanCustom] = useState('');
  const [cadangan, setCadangan] = useState('');
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Dynamic fields from DB
  const isLuarStep = step === 'form';
  const { fields: dynamicFields, kawasanList } = useKlkDynamicFields(isLuarStep);
  const academicYear = getKlkAcademicYear();
  const semInfo = profile?.intake_year
    ? getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV')
    : { semester: 0, level: 'Junior' as const };

  const jabatanLabel = JABATAN_LIST.find(j => j.value === profile?.department)?.label ?? profile?.department ?? '—';

  // Semak rekod sedia ada / lama
  useEffect(() => {
    if (!user || !profile?.intake_year) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from('klk_student_residency')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const isCurrentSemester = data.academic_year === academicYear && data.semester === semInfo.semester;
          
          // Jika ia rekod semasa dan belum expire, kita boleh kemaskini rekod tersebut
          if (isCurrentSemester && !data.is_expired) {
            setExistingRecord(data);
          }
          
          // Pra-isi maklumat jika sebelum ini pernah duduk luar kampus
          setAlamat(data.alamat_kediaman ?? '');
          setKawasan(data.kawasan_kediaman ?? '');
          setKawasanCustom(data.kawasan_custom ?? '');
          setCadangan(data.cadangan ?? '');
          if (data.extra_data) setExtraData(data.extra_data);
          
          // Pilihan step dikekalkan pada 'choice' supaya pelajar buat pilihan manual
        }
      } catch {
        // Fail gracefully if table doesn't exist yet
      }
    })();
  }, [user, profile, academicYear, semInfo.semester]);

  const handleKamsis = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const payload = {
        user_id: user.id, academic_year: academicYear, semester: semInfo.semester,
        tinggal_luar: false, nama_pelajar: profile.full_name,
        no_matrik: profile.matric_no?.toUpperCase() ?? '', no_telefon: profile.phone ?? null,
        jabatan: profile.department ?? null, source: 'WEBAPP',
        extra_data: {},
      };
      if (existingRecord) {
        await supabase.from('klk_student_residency').update(payload).eq('id', existingRecord.id);
      } else {
        await supabase.from('klk_student_residency').insert(payload);
      }
      setStep('done');
    } catch { toast.error('Gagal simpan. Cuba lagi.'); }
    finally { setLoading(false); }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alamat.trim()) { toast.error('Sila isi alamat kediaman.'); return; }
    if (!kawasan) { toast.error('Sila pilih kawasan kediaman.'); return; }
    if (kawasan === 'LAIN_LAIN' && !kawasanCustom.trim()) { toast.error('Sila nyatakan kawasan.'); return; }
    // Validate required dynamic fields
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(`Sila isi: ${f.label}`); return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user!.id, academic_year: academicYear, semester: semInfo.semester,
        tinggal_luar: true, nama_pelajar: profile!.full_name,
        no_matrik: profile!.matric_no?.toUpperCase() ?? '', no_telefon: profile!.phone ?? null,
        jabatan: profile!.department ?? null,
        alamat_kediaman: alamat.trim(), kawasan_kediaman: kawasan,
        kawasan_custom: kawasan === 'LAIN_LAIN' ? kawasanCustom.trim() : null,
        cadangan: cadangan.trim() || null, source: 'WEBAPP',
        extra_data: Object.keys(extraData).length > 0 ? extraData : {},
      };
      if (existingRecord) {
        await supabase.from('klk_student_residency').update(payload).eq('id', existingRecord.id);
      } else {
        await supabase.from('klk_student_residency').insert(payload);
      }
      toast.success('Maklumat kediaman berjaya disimpan!');
      setStep('done');
    } catch { toast.error('Gagal simpan. Cuba lagi.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* BG Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Exco Kediaman Luar Kampus</p>
            <h1 className="text-lg font-black text-white leading-tight">Deklarasi Status Kediaman</h1>
          </div>
        </motion.div>

        {/* Pelajar Info Strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02] flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{profile?.full_name?.[0] ?? '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {profile?.matric_no?.toUpperCase()} · {jabatanLabel} · Semester {semInfo.semester}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Tahun Akademik</p>
            <p className="text-xs font-black text-slate-400">{academicYear}</p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2rem] bg-slate-900 border border-white/[0.07] shadow-2xl overflow-hidden"
        >
          {/* Top Accent Bar */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />

          <div className="p-8">
            {/* Step: Choice */}
            {step === 'choice' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Di mana anda tinggal?</h2>
                    <p className="text-[11px] text-slate-500">Semester {semInfo.semester} — {academicYear}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleKamsis} disabled={loading}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-emerald-300 text-sm">Dalam KAMSIS</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tinggal di asrama</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setStep('form')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                      <Home className="w-7 h-7 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-blue-300 text-sm">Luar Kampus</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Sewa / Rumah sendiri</p>
                    </div>
                  </motion.button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </div>
                )}
              </motion.div>
            )}

            {/* Step: Form */}
            {step === 'form' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep('choice')}
                    className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-white">Maklumat Kediaman</h2>
                    <p className="text-[11px] text-slate-500">
                      {existingRecord ? 'Kemaskini maklumat kediaman anda' : 'Isi maklumat tempat tinggal anda'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitForm} className="space-y-5">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FieldReadOnly label="Nama Pelajar" value={profile?.full_name ?? ''} />
                    <FieldReadOnly label="No. Matrik" value={profile?.matric_no?.toUpperCase() ?? ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldReadOnly label="No. Telefon" value={profile?.phone ?? '—'} />
                    <FieldReadOnly label="Jabatan" value={jabatanLabel} />
                  </div>

                  {/* Editable fields */}
                  <FieldTextarea
                    label="Alamat Kediaman" required
                    value={alamat} onChange={setAlamat}
                    placeholder="Contoh: No. 12, Jalan Semambu 1..."
                  />

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

                  {kawasan === 'LAIN_LAIN' && (
                    <FieldText
                      label="Nyatakan Kawasan" required
                      value={kawasanCustom} onChange={setKawasanCustom}
                      placeholder="Nama kawasan..."
                    />
                  )}

                  <FieldTextarea
                    label="Cadangan / Penambahbaikan"
                    value={cadangan} onChange={setCadangan}
                    placeholder="Cadangan kepada Exco KLK... (pilihan)"
                    optional
                  />

                  {/* Soalan Dinamik dari Form Builder */}
                  {dynamicFields.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-white/[0.05]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Soalan Tambahan</p>
                      <KlkDynamicFieldRenderer
                        fields={dynamicFields}
                        values={extraData}
                        onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                      />
                    </div>
                  )}

                  <Button
                    type="submit" disabled={loading}
                    className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 8px 24px rgba(59,130,246,0.25)' }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {existingRecord ? 'Kemaskini Maklumat' : 'Hantar Maklumat'}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 rounded-3xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-black text-white mb-2">Terima Kasih!</h2>
                <p className="text-sm text-slate-400 mb-6">Maklumat kediaman anda telah disimpan untuk semester ini.</p>
                <Button
                  onClick={() => navigate('/portal')}
                  className="rounded-xl font-black text-sm uppercase tracking-widest"
                  variant="outline"
                >
                  Kembali ke Portal
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Helper Field Components ────────────────────────────────────
function FieldReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <div className="h-11 px-4 rounded-xl bg-slate-800/40 border border-white/[0.04] flex items-center text-slate-400 text-sm font-medium">
        {value || '—'}
      </div>
    </div>
  );
}

function FieldText({ label, value, onChange, placeholder, required, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {optional && <span className="ml-1 font-medium normal-case text-slate-600">(Pilihan)</span>}
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full h-11 px-4 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, required, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {optional && <span className="ml-1 font-medium normal-case text-slate-600">(Pilihan)</span>}
      </label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} rows={2}
        className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium resize-none focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
      />
    </div>
  );
}
