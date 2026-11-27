// ============================================================
// KlkResidencyFormPage — Halaman Form Kediaman (/klk/form)
// Standalone page — boleh dicapai dari notifikasi / direct link
// ============================================================
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Home, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { getSemesterInfo, JABATAN_LIST } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useKlkDynamicFields } from '@/hooks/useKlkDynamicFields';
import { KlkDynamicFieldRenderer } from '@/components/klk/KlkDynamicFieldRenderer';
import { KawasanSearchSelect } from '@/components/klk/KawasanSearchSelect';
import { getKlkAcademicYear } from '@/utils/klkUtils';

export function KlkResidencyFormPage() {
  const { t } = useTranslation(['housing', 'klk', 'common']);
  const { profile, user } = useAuth();
  const { intake1Month, intake2Month } = useAcademicSession();
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
    ? getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV', intake1Month, intake2Month, profile.semester_override)
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
    } catch { toast.error(t('housing:save_failed_retry', 'Gagal simpan. Cuba lagi.')); }
    finally { setLoading(false); }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alamat.trim()) { toast.error(t('housing:fill_address_required', 'Sila isi alamat kediaman.')); return; }
    if (!kawasan) { toast.error(t('housing:choose_area_required', 'Sila pilih kawasan kediaman.')); return; }
    if (kawasan === 'LAIN_LAIN' && !kawasanCustom.trim()) { toast.error(t('housing:specify_area_required', 'Sila nyatakan kawasan.')); return; }
    // Validate required dynamic fields
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(t('housing:fill_dynamic_field_required', 'Sila isi: {{field}}', { field: f.label })); return;
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
      toast.success(t('housing:residence_saved_success', 'Maklumat kediaman berjaya disimpan!'));
      setStep('done');
    } catch { toast.error(t('housing:save_failed_retry', 'Gagal simpan. Cuba lagi.')); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] flex items-center justify-center px-4 pb-4 pt-[calc(1rem+var(--sat,env(safe-area-inset-top,0px)))] transition-colors">
      {/* BG Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-15 dark:opacity-10"
          style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #14B8A6, transparent 70%)' }} />
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
            aria-label={t('common:back', 'Kembali')}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">{t('klk:exco_klk_title', 'Exco Kediaman Luar Kampus')}</p>
            <h1 className="text-lg font-black text-[#0B2420] dark:text-[#F1F5F9] leading-tight">
              {t('housing:declare_residence', 'Hantar Deklarasi Kediaman Luar Kampus')}
            </h1>
          </div>
        </motion.div>

        {/* Pelajar Info Strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 rounded-2xl p-4 border border-[#B8E4DC]/80 dark:border-[#252B35] bg-white dark:bg-[#13171D] flex items-center gap-4 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-black flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{profile?.full_name?.[0] ?? '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-[#0B2420] dark:text-[#F1F5F9] truncate">{profile?.full_name}</p>
            <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2] font-medium">
              {profile?.matric_no?.toUpperCase()} · {jabatanLabel} · {t('common:semester', 'Semester')} {semInfo.semester}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">{t('housing:academic_year', 'Tahun Akademik')}</p>
            <p className="text-xs font-black text-[#0B2420] dark:text-[#F1F5F9]">{academicYear}</p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2rem] bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xl overflow-hidden"
        >
          {/* Top Accent Bar */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6)' }} />

          <div className="p-6 sm:p-8">
            {/* Step: Choice */}
            {step === 'choice' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#0B2420] dark:text-[#F1F5F9]">{t('housing:where_do_you_live', 'Di mana anda tinggal?')}</h2>
                    <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">Semester {semInfo.semester} - {academicYear}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleKamsis} disabled={loading}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 dark:bg-emerald-500/10 hover:bg-emerald-500/15 transition-all cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-emerald-700 dark:text-emerald-300 text-sm">{t('housing:in_kamsis', 'Dalam KAMSIS')}</p>
                      <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2] mt-0.5">{t('housing:stay_hostel', 'Tinggal di asrama')}</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setStep('form')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-[#0F766E]/25 bg-[#EBF7F4]/70 dark:bg-[#1B2028]/70 hover:bg-[#D5EFEA] dark:hover:bg-[#232933] transition-all cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/15 dark:bg-[#2DD4BF]/15 flex items-center justify-center">
                      <Home className="w-7 h-7 text-[#0F766E] dark:text-[#2DD4BF]" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-[#0F766E] dark:text-[#2DD4BF] text-sm">{t('housing:off_campus', 'Luar Kampus')}</p>
                      <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2] mt-0.5">{t('housing:stay_rental_home', 'Sewa / Rumah sendiri')}</p>
                    </div>
                  </motion.button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#3B635C] dark:text-[#94A0B2]">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('common:saving', 'Menyimpan...')}
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
                    className="w-9 h-9 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] flex items-center justify-center hover:bg-[#D5EFEA] dark:hover:bg-[#232933] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-[#0B2420] dark:text-[#F1F5F9]">{t('housing:residence_info', 'Maklumat Kediaman')}</h2>
                    <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                      {existingRecord ? t('housing:update_residence_info', 'Kemaskini maklumat kediaman anda') : t('housing:fill_residence_info', 'Isi maklumat tempat tinggal anda')}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitForm} className="space-y-5">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldReadOnly label={t('housing:student_name', 'Nama Pelajar')} value={profile?.full_name ?? ''} />
                    <FieldReadOnly label={t('housing:matric_no', 'No. Matrik')} value={profile?.matric_no?.toUpperCase() ?? ''} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldReadOnly label={t('housing:phone_number', 'No. Telefon')} value={profile?.phone ?? '-'} />
                    <FieldReadOnly label={t('housing:department', 'Jabatan')} value={jabatanLabel} />
                  </div>

                  {/* Editable fields */}
                  <FieldTextarea
                    label={t('housing:emergency_contact_address', 'Alamat Kecemasan Tempatan')} required
                    value={alamat} onChange={setAlamat}
                    placeholder={t('housing:address_placeholder', 'Contoh: No. 12, Jalan Semambu 1...')}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
                      {t('housing:residential_area', 'Kawasan Kediaman')} <span className="text-rose-500">*</span>
                    </label>
                    <KawasanSearchSelect
                      value={kawasan}
                      onChange={setKawasan}
                      kawasanList={kawasanList}
                      inputClass="bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9]"
                      required
                    />
                  </div>

                  {kawasan === 'LAIN_LAIN' && (
                    <FieldText
                      label={t('housing:specify_area', 'Nyatakan Kawasan')} required
                      value={kawasanCustom} onChange={setKawasanCustom}
                      placeholder={t('housing:area_name_placeholder', 'Nama kawasan...')}
                    />
                  )}

                  <div className="p-3.5 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-xs text-[#0B2420] dark:text-[#B8E4DC]">
                    <span className="font-bold text-[#0F766E] dark:text-[#2DD4BF]">{t('housing:landlord_contact', 'Maklumat Tuan Rumah Sah')}:</span> {t('housing:landlord_agreement_note', 'Sila simpan salinan perjanjian dan nombor telefon pemilik kediaman untuk rujukan kecemasan Exco.')}
                  </div>

                  <FieldTextarea
                    label={t('housing:suggestions_feedback', 'Cadangan / Penambahbaikan')}
                    value={cadangan} onChange={setCadangan}
                    placeholder={t('housing:suggestions_placeholder', 'Cadangan kepada Exco KLK... (pilihan)')}
                    optional
                  />

                  {/* Soalan Dinamik dari Form Builder */}
                  {dynamicFields.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">{t('housing:additional_questions', 'Soalan Tambahan')}</p>
                      <KlkDynamicFieldRenderer
                        fields={dynamicFields}
                        values={extraData}
                        onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                      />
                    </div>
                  )}

                  <Button
                    type="submit" disabled={loading}
                    className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-teal-600/20 bg-[#0F766E] hover:bg-[#0D9488]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {existingRecord ? t('housing:update_info', 'Kemaskini Maklumat') : t('housing:submit_info', 'Hantar Maklumat')}
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
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <h2 className="text-2xl font-black text-[#0B2420] dark:text-[#F1F5F9] mb-2">{t('common:thank_you', 'Terima Kasih!')}</h2>
                <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mb-6">{t('housing:residence_saved_desc', 'Maklumat kediaman anda telah disimpan untuk semester ini.')}</p>
                <Button
                  onClick={() => navigate('/portal')}
                  className="rounded-xl font-black text-sm uppercase tracking-widest border-[#B8E4DC] dark:border-[#252B35]"
                  variant="outline"
                >
                  {t('housing:back_to_portal', 'Kembali ke Portal')}
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
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">{label}</label>
      <div className="h-11 px-4 rounded-xl bg-[#EBF7F4]/60 dark:bg-[#0E1116] border border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center text-[#0B2420] dark:text-[#94A0B2] text-sm font-medium">
        {value || '-'}
      </div>
    </div>
  );
}

function FieldText({ label, value, onChange, placeholder, required, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; optional?: boolean;
}) {
  const { t } = useTranslation(['housing', 'common']);
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
        {optional && <span className="ml-1 font-medium normal-case text-[#3B635C]/70 dark:text-[#94A0B2]/70">{t('housing:optional_parenthesized', '(Pilihan)')}</span>}
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full h-11 px-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-sm font-medium focus:outline-none focus:border-[#0F766E] transition-all placeholder:text-[#3B635C]/50 dark:placeholder:text-[#94A0B2]/40"
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, required, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; optional?: boolean;
}) {
  const { t } = useTranslation(['housing', 'common']);
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
        {optional && <span className="ml-1 font-medium normal-case text-[#3B635C]/70 dark:text-[#94A0B2]/70">{t('housing:optional_parenthesized', '(Pilihan)')}</span>}
      </label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} rows={2}
        className="w-full px-4 py-3 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-sm font-medium resize-none focus:outline-none focus:border-[#0F766E] transition-all placeholder:text-[#3B635C]/50 dark:placeholder:text-[#94A0B2]/40"
      />
    </div>
  );
}
