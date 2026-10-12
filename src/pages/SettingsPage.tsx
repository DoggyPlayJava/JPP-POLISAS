import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User, Bell, Shield, Mail, Lock, Camera, Check, Award, Loader2, FileText,
  HelpCircle, MessageSquare, ExternalLink, Sparkles, Phone, ArrowLeft, Moon,
  MapPin, Home, Building2, GraduationCap, ClipboardEdit, Clock, XCircle,
  CheckCircle2, AlertCircle, LogOut, Store, ShieldAlert, CalendarRange,
  Sun, Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Card
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { getSemesterInfo } from '@/types';
import { toast } from 'react-hot-toast';
import { useKlkDynamicFields } from '@/hooks/useKlkDynamicFields';
import { KlkDynamicFieldRenderer } from '@/components/klk/KlkDynamicFieldRenderer';
import { KawasanSearchSelect } from '@/components/klk/KawasanSearchSelect';
import { getKlkAcademicYear } from '@/utils/klkUtils';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { getRoleBadgeTitle } from '@/lib/superAppHelpers';

// ── Palette Tokens (05 Earthy Minimal) ────────────────────────
// #2E3A2F: Primary (Deep Forest Moss Green)
// #6B7F5B: Secondary (Sage Olive Green)
// #D9C9B2: Tertiary (Warm Sand / Oatmeal Beige)
// #3A4A3B: Dark Hairline Border
// #C96F4F: Accent (Terracotta Clay Orange)
// #F8F6EE: Background (Warm Milk Porcelain)
// #151D16: Dark Canvas Background
// #1E271F: Dark Surface


// ─────────────────────────────────────────────────────────────────────────────
// Super App Tab Configurations & Legacy Param Mapping
// ─────────────────────────────────────────────────────────────────────────────
export const SETTINGS_TAB_CONFIG = [
  { id: 'profil', label: 'Profil & Akademik', iconComponent: User, desc: 'Maklumat peribadi & pinda data' },
  { id: 'kediaman', label: 'Status Kediaman', iconComponent: MapPin, desc: 'Deklarasi KAMSIS / Luar Kampus' },
  { id: 'tema', label: 'Paparan & Tema', iconComponent: Moon, desc: 'Pilihan mod cerah, gelap atau sistem' },
  { id: 'notifikasi', label: 'Pemberitahuan', iconComponent: Bell, desc: 'Urus amaran & notifikasi pesanan' },
  { id: 'keselamatan', label: 'Keselamatan', iconComponent: Shield, desc: 'Kata laluan & log masuk akaun' },
  { id: 'bantuan', label: 'Bantuan & Tutorial', iconComponent: HelpCircle, desc: 'Panduan sistem & talian aduan' },
] as const;

export type SettingsTabId = 'profil' | 'kediaman' | 'tema' | 'notifikasi' | 'keselamatan' | 'bantuan';

export function resolveSettingsTab(tabParam?: string | null): SettingsTabId {
  if (!tabParam) return 'profil';
  const clean = tabParam.toLowerCase().trim();
  if (clean === 'general') return 'profil';
  if (clean === 'notifications') return 'notifikasi';
  if (clean === 'security') return 'keselamatan';
  if (clean === 'help') return 'bantuan';
  if (['profil', 'kediaman', 'tema', 'notifikasi', 'keselamatan', 'bantuan'].includes(clean)) {
    return clean as SettingsTabId;
  }
  return 'profil';
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileEditRequestSection - Permintaan pindaan matrik/semester (dalam Tab Profil)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileEditRequestSection() {
  const { user, profile } = useAuth();
  const { intake1Month, intake2Month } = useAcademicSession();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldType, setFieldType] = React.useState<'matric_no' | 'semester'>('matric_no');
  const [requestedValue, setRequestedValue] = React.useState('');
  const [reason, setReason] = React.useState('');

  const semInfo = profile?.intake_year
    ? getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV', intake1Month, intake2Month, profile.semester_override)
    : { semester: 0 };

  const fetchRequests = React.useCallback(async () => {
    if (!user) return;
    setLoadingReqs(true);
    try {
      const { data } = await supabase
        .from('profile_edit_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5);
      setRequests(data || []);
    } catch { /* silent */ }
    finally { setLoadingReqs(false); }
  }, [user]);

  React.useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const hasPendingMatric = requests.some(r => r.field_type === 'matric_no' && r.status === 'PENDING');
  const hasPendingSemester = requests.some(r => r.field_type === 'semester' && r.status === 'PENDING');
  const hasPendingForSelected = fieldType === 'matric_no' ? hasPendingMatric : hasPendingSemester;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!requestedValue.trim()) { toast.error('Sila isi nilai baharu.'); return; }
    if (fieldType === 'semester') {
      const sem = Number(requestedValue);
      if (!Number.isInteger(sem) || sem < 1 || sem > 6) { toast.error('Semester mesti antara 1 hingga 6.'); return; }
    }
    if (hasPendingForSelected) { toast.error('Terdapat permintaan PENDING yang masih belum disemak.'); return; }

    setSubmitting(true);
    try {
      const currentVal = fieldType === 'matric_no'
        ? (profile.matric_no || '-')
        : String(semInfo.semester || '-');

      const { error } = await supabase.from('profile_edit_requests').insert({
        user_id: user.id,
        field_type: fieldType,
        current_value: currentVal,
        requested_value: requestedValue.trim().toUpperCase(),
        reason: reason.trim() || null,
      });
      if (error) throw error;

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: null,
        title: 'Permintaan Pindaan Profil Pelajar',
        message: `${profile.full_name} memohon pindaan ${fieldType === 'matric_no' ? 'No. Matrik' : 'Semester'}: ${currentVal} -> ${requestedValue.trim().toUpperCase()}${reason.trim() ? `. Sebab: ${reason.trim()}` : ''}`,
        type: 'SYSTEM',
        module: 'JPP',
        target_role: 'JPP',
        link: '/jpp/overview',
        actor_name: profile.full_name,
        is_read: false,
      });
      if (notifErr) console.warn('Notifikasi JPP gagal:', notifErr.message);

      toast.success('Permintaan pindaan berjaya dihantar! Sila tunggu semakan MT JPP.');
      setRequestedValue('');
      setReason('');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Gagal hantar permintaan.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" />MENUNGGU</span>;
    if (status === 'APPROVED') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#6B7F5B]/30"><CheckCircle2 className="w-3 h-3 text-[#6B7F5B]" />DILULUSKAN</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" />DITOLAK</span>;
  };

  return (
    <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] bg-[#F8F6EE]/50 dark:bg-[#151D16]/50 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] flex items-center justify-center shrink-0 border border-[#6B7F5B]/30">
          <ClipboardEdit className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Pindaan Maklumat Akademik</h3>
          <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5">Mohon pindaan No. Matrik atau Semester rasmi kepada Majlis JPP.</p>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F] mb-1">No. Matrik Semasa</p>
            <p className="font-black text-sm text-[#2E3A2F] dark:text-[#F8F6EE] font-mono">{profile?.matric_no || <span className="text-[#556453] dark:text-[#A3B39F] italic text-xs">Belum ditetapkan</span>}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F] mb-1">Semester Semasa</p>
            <p className="font-black text-sm text-[#2E3A2F] dark:text-[#F8F6EE]">{semInfo.semester > 0 ? `Semester ${semInfo.semester}` : <span className="text-[#556453] dark:text-[#A3B39F] italic text-xs">-</span>}</p>
          </div>
        </div>

        {loadingReqs ? (
          <div className="flex items-center gap-2 text-xs text-[#556453] dark:text-[#A3B39F]"><Loader2 className="w-3.5 h-3.5 animate-spin" />Memuatkan rekod...</div>
        ) : requests.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F]">Rekod Permintaan</p>
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F6EE]/40 dark:bg-[#151D16]/40 border border-[#D9C9B2]/50 dark:border-[#3A4A3B] gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                      {r.field_type === 'matric_no' ? 'No. Matrik' : 'Semester'}: <span className="font-mono text-[#556453] dark:text-[#A3B39F] line-through">{r.current_value}</span> {'->'} <span className="font-mono text-[#6B7F5B] font-black">{r.requested_value}</span>
                    </p>
                    {r.review_note && <p className="text-[10px] text-[#556453] dark:text-[#A3B39F] mt-0.5">Nota JPP: {r.review_note}</p>}
                    <p className="text-[10px] text-[#556453]/60 dark:text-[#A3B39F]/60 mt-0.5">{new Date(r.submitted_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B] pt-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F] mb-4">Hantar Permintaan Baharu</p>
          {(hasPendingMatric && hasPendingSemester) ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Anda mempunyai permintaan PENDING untuk kedua-dua No. Matrik dan Semester. Sila tunggu kelulusan MT JPP.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Jenis Pindaan</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['matric_no', 'semester'] as const).map(ft => {
                    const isPending = ft === 'matric_no' ? hasPendingMatric : hasPendingSemester;
                    return (
                      <button
                        key={ft}
                        type="button"
                        disabled={isPending}
                        onClick={() => { setFieldType(ft); setRequestedValue(''); }}
                        className={cn(
                          "p-3 rounded-2xl border text-xs font-bold transition-all min-h-[44px]",
                          fieldType === ft && !isPending
                            ? "border-[#6B7F5B] bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE]"
                            : isPending
                            ? "border-[#D9C9B2]/30 dark:border-[#3A4A3B]/40 bg-[#F8F6EE]/30 dark:bg-[#151D16]/30 text-[#556453]/40 dark:text-[#A3B39F]/40 cursor-not-allowed"
                            : "border-[#D9C9B2]/60 dark:border-[#3A4A3B] bg-white dark:bg-[#151D16]/50 hover:border-[#6B7F5B]/40 text-[#2E3A2F] dark:text-[#F8F6EE]"
                        )}
                      >
                        {ft === 'matric_no' ? 'No. Matrik' : 'Semester'}
                        {isPending && <span className="block text-[9px] mt-0.5 text-amber-500 font-normal">Ada PENDING</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                  {fieldType === 'matric_no' ? 'No. Matrik Baharu' : 'Semester Baharu (1-6)'}
                  <span className="text-[#C96F4F] ml-0.5">*</span>
                </Label>
                {fieldType === 'semester' ? (
                  <select
                    value={requestedValue}
                    onChange={e => setRequestedValue(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#151D16] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#6B7F5B]/50"
                  >
                    <option value="">-- Pilih Semester --</option>
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={String(s)}>{`Semester ${s}`}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={requestedValue}
                    onChange={e => setRequestedValue(e.target.value.toUpperCase())}
                    placeholder="cth: 23DIP234567"
                    required
                    className="h-11 rounded-xl bg-white dark:bg-[#151D16] border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] font-mono text-sm uppercase focus-visible:ring-[#6B7F5B]/50"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Sebab Pindaan <span className="text-[#556453] dark:text-[#A3B39F] font-medium">(Pilihan)</span></Label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder="Terangkan sebab pindaan diperlukan..."
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#151D16] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#6B7F5B]/50 outline-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !requestedValue}
                className="w-full h-11 rounded-2xl font-bold text-xs bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghantar...</> : 'Hantar Permintaan Pindaan'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KediamanSettingsSection - Tab kediaman dalam SettingsPage
// ─────────────────────────────────────────────────────────────────────────────
function KediamanSettingsSection() {
  const { user, profile, refetchProfile } = useAuth();
  const { intake1Month, intake2Month } = useAcademicSession();
  const [step, setStep] = React.useState<'loading'|'choice'|'form'|'done'>('loading');
  const [existing, setExisting] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [alamat, setAlamat] = React.useState('');
  const [kawasan, setKawasan] = React.useState('');
  const [kawasanCustom, setKawasanCustom] = React.useState('');
  const [cadangan, setCadangan] = React.useState('');
  const [extraData, setExtraData] = React.useState<Record<string, string>>({});
  const [profileReady, setProfileReady] = React.useState(false);

  const isLuarForm = step === 'form';
  const { fields: dynamicFields, kawasanList } = useKlkDynamicFields(isLuarForm);

  React.useEffect(() => {
    refetchProfile().finally(() => setProfileReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const academicYear = getKlkAcademicYear();
  const semInfo = (() => {
    if (profile?.semester_override) {
      const isFtv = profile.programme_code === 'FTV';
      const level = isFtv ? 'Asasi' as const : profile.semester_override <= 3 ? 'Junior' as const : 'Senior' as const;
      return { semester: profile.semester_override, level };
    }
    if (profile?.intake_year) {
      return getSemesterInfo(
        profile.intake_year,
        profile.intake_period as 1 | 2,
        profile.programme_code === 'FTV',
        intake1Month, intake2Month
      );
    }
    return { semester: 0, level: 'Junior' as const };
  })();

  const isEligible = semInfo.semester >= 2;

  React.useEffect(() => {
    if (!profileReady) return;
    if (!user || !isEligible) { setStep('choice'); return; }
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('klk_student_residency').select('*')
          .eq('user_id', user.id).eq('academic_year', academicYear).eq('semester', semInfo.semester)
          .eq('is_expired', false)
          .maybeSingle();
        if (error?.code === '42P01') { setStep('choice'); return; }
        if (data) {
          setExisting(data);
          setAlamat(data.alamat_kediaman ?? '');
          setKawasan(data.kawasan_kediaman ?? '');
          setKawasanCustom(data.kawasan_custom ?? '');
          setCadangan(data.cadangan ?? '');
          setStep(data.tinggal_luar ? 'form' : 'done');
        } else { setStep('choice'); }
      } catch { setStep('choice'); }
    })();
  }, [user, profileReady, isEligible, academicYear, semInfo.semester]);

  const save = async (tinggalLuar: boolean, extra: Record<string, any> = {}) => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id, academic_year: academicYear, semester: semInfo.semester,
        tinggal_luar: tinggalLuar, nama_pelajar: profile.full_name,
        no_matrik: profile.matric_no?.toUpperCase() ?? '', no_telefon: profile.phone ?? null,
        jabatan: profile.department ?? null, source: 'WEBAPP', ...extra,
      };
      if (existing) {
        await supabase.from('klk_student_residency').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('klk_student_residency').insert(payload);
      }
      toast.success('Status kediaman berjaya disimpan!');
      setStep('done');
    } catch { toast.error('Gagal simpan. Cuba lagi.'); }
    finally { setSaving(false); }
  };

  const handleSubmitLuar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alamat.trim()) { toast.error('Sila isi alamat.'); return; }
    if (!kawasan) { toast.error('Sila pilih kawasan.'); return; }
    if (kawasan === 'LAIN_LAIN' && !kawasanCustom.trim()) { toast.error('Sila nyatakan kawasan.'); return; }
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(`Sila isi: ${f.label}`); return;
      }
    }
    await save(true, {
      alamat_kediaman: alamat.trim(), kawasan_kediaman: kawasan,
      kawasan_custom: kawasan === 'LAIN_LAIN' ? kawasanCustom.trim() : null,
      cadangan: cadangan.trim() || null,
      extra_data: Object.keys(extraData).length > 0 ? extraData : {},
    });
  };

  if (!isEligible) {
    return (
      <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-3xl bg-[#6B7F5B]/15 flex items-center justify-center mx-auto text-[#6B7F5B] border border-[#6B7F5B]/30">
          <MapPin className="w-7 h-7" />
        </div>
        <p className="font-black text-[#2E3A2F] dark:text-[#F8F6EE]">Belum Perlu Deklarasi</p>
        <p className="text-xs text-[#556453] dark:text-[#A3B39F] max-w-sm mx-auto">Status kediaman hanya diperlukan mulai Semester 2 dan ke atas mengikut takwim kolej.</p>
      </Card>
    );
  }

  return (
    <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] bg-[#F8F6EE]/50 dark:bg-[#151D16]/50 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] flex items-center justify-center shrink-0 border border-[#6B7F5B]/30">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Status Kediaman Pelajar</h3>
          <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5 flex items-center flex-wrap gap-1">
            <span>Semester {semInfo.semester} - Tahun Akademik {academicYear}</span>
            {existing && <span className="ml-2 text-[#6B7F5B] font-bold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Sudah Direkodkan</span>}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {step === 'loading' && (
          <div className="py-8 flex items-center justify-center gap-2 text-[#556453] dark:text-[#A3B39F] text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#6B7F5B]" /> Memuatkan maklumat...
          </div>
        )}

        {step === 'choice' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] font-medium mb-4">Di mana lokasi penempatan anda bagi sesi semester ini?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center gap-4 p-5 rounded-3xl border border-[#6B7F5B]/40 bg-[#6B7F5B]/5 hover:bg-[#6B7F5B]/10 dark:bg-[#151D16]/60 text-left transition-all min-h-[72px]"
              >
                <div className="p-3 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] shrink-0 border border-[#6B7F5B]/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-[#2E3A2F] dark:text-[#F8F6EE] text-sm">Dalam KAMSIS</p>
                  <p className="text-xs text-[#556453] dark:text-[#A3B39F] mt-0.5">Tinggal di asrama kolej POLISAS</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex items-center gap-4 p-5 rounded-3xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] bg-[#F8F6EE]/60 hover:bg-[#F8F6EE] dark:bg-[#151D16]/60 text-left transition-all min-h-[72px]"
              >
                <div className="p-3 rounded-2xl bg-[#2E3A2F]/10 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#6B7F5B] shrink-0 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-[#2E3A2F] dark:text-[#F8F6EE] text-sm">Luar Kampus</p>
                  <p className="text-xs text-[#556453] dark:text-[#A3B39F] mt-0.5">Rumah sewa atau kediaman keluarga</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmitLuar} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Alamat Kediaman <span className="text-[#C96F4F]">*</span></Label>
              <textarea
                value={alamat} onChange={e => setAlamat(e.target.value)} required rows={2}
                placeholder="No. 12, Jalan Semambu 1..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#151D16] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#6B7F5B]/50 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Kawasan Kediaman <span className="text-[#C96F4F]">*</span></Label>
              <KawasanSearchSelect
                value={kawasan}
                onChange={setKawasan}
                kawasanList={kawasanList}
                required
              />
            </div>
            {kawasan === 'LAIN_LAIN' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Nyatakan Kawasan <span className="text-[#C96F4F]">*</span></Label>
                <input
                  type="text" value={kawasanCustom} onChange={e => setKawasanCustom(e.target.value)} required
                  placeholder="Nama kawasan..."
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#151D16] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7F5B]/50"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Cadangan <span className="text-[#556453] dark:text-[#A3B39F] font-medium">(Pilihan)</span></Label>
              <textarea
                value={cadangan} onChange={e => setCadangan(e.target.value)} rows={2}
                placeholder="Cadangan kepada Exco Kediaman Luar Kampus..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#151D16] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#6B7F5B]/50 outline-none"
              />
            </div>

            {dynamicFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F]">Maklumat Tambahan</p>
                <KlkDynamicFieldRenderer
                  fields={dynamicFields}
                  values={extraData}
                  onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                  inputClass="bg-white dark:bg-[#151D16] border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE]"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep('choice')} className="flex-1 h-11 rounded-2xl font-bold text-xs border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] min-h-[44px]">
                Kembali
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 h-11 rounded-2xl font-bold text-xs bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs min-h-[44px]">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : existing ? 'Kemaskini' : 'Hantar'}
              </Button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-[#6B7F5B]/15 text-[#6B7F5B] flex items-center justify-center mx-auto border border-[#6B7F5B]/30">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-[#2E3A2F] dark:text-[#F8F6EE]">Status Kediaman Telah Disimpan</p>
              <p className="text-xs text-[#556453] dark:text-[#A3B39F] mt-1">
                {existing?.tinggal_luar
                  ? `Luar Kampus - ${existing.kawasan_kediaman === 'LAIN_LAIN' ? existing.kawasan_custom : existing.kawasan_kediaman}`
                  : 'Dalam KAMSIS (Asrama Kolej)'}
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep(existing?.tinggal_luar ? 'form' : 'choice')} className="h-11 px-6 rounded-2xl font-bold text-xs border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] min-h-[44px]">
              Kemaskini Semula
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage - Native Mobile-First Super App Profile Hub
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, profile, refetchProfile, effectiveRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { intake1Month, intake2Month } = useAcademicSession();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const currentTab = resolveSettingsTab(rawTab);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States untuk OTP
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  // Local theme selector preference
  const [activeThemePreference, setActiveThemePreference] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_preference');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    }
    return theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  const semInfo = (() => {
    if (profile?.semester_override) {
      const isFtv = profile.programme_code === 'FTV';
      const level = isFtv ? 'Asasi' as const : profile.semester_override <= 3 ? 'Junior' as const : 'Senior' as const;
      return { semester: profile.semester_override, level };
    }
    if (profile?.intake_year) {
      return getSemesterInfo(
        profile.intake_year,
        profile.intake_period as 1 | 2,
        profile.programme_code === 'FTV',
        intake1Month, intake2Month
      );
    }
    return { semester: 0, level: 'Junior' as const };
  })();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Pelajar POLISAS';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleTitle = getRoleBadgeTitle(effectiveRole);

  const handleTabChange = (newTab: SettingsTabId) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0 || !user) return;

      const file = event.target.files[0];
      if (file.size > 5242880) {
        toast.error("Gagal: Saiz fail terlalu besar! Maksimum 5MB sahaja.");
        return;
      }

      const { compressImage } = await import('@/lib/imageCompression');
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refetchProfile();
      toast.success("Gambar profil berjaya dikemaskini!");
    } catch (error: any) {
      toast.error(error.message || "Ralat memuat naik gambar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const commitUpdates = async () => {
    if (!user || !fullName.trim()) return;
    setLoading(true);
    try {
      const isProfileChanged = fullName !== profile?.full_name || phone !== profile?.phone;
      const isEmailChanged = email !== user?.email;

      if (isProfileChanged) {
        const oldName = profile?.full_name;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: fullName.trim(),
            phone: phone.trim()
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        if (oldName && oldName !== fullName.trim()) {
          await supabase
            .from('club_committee')
            .update({ full_name: fullName.trim() })
            .eq('full_name', oldName);
        }
        await refetchProfile();
      }

      if (isEmailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        toast.success('Sila semak emel baru anda untuk pautan pengesahan.');
      } else if (isProfileChanged) {
        toast.success('Profil berjaya disegerakkan!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengemaskini profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isPhoneChanged = phone !== profile?.phone;
    if (isPhoneChanged && phone.trim() !== '') {
      handleInitiateOTP();
      return;
    }
    await commitUpdates();
  };

  const handleInitiateOTP = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const newOTP = (100000 + (array[0] % 900000)).toString();
      setGeneratedOTP(newOTP);
      
      await sendEmail({
        to: user.email,
        subject: "Kod Pengesahan Portal JPP",
        html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Pengesahan Penukaran Nombor Telefon</h2>
          <p>Sistem merekodkan percubaan untuk menukar nombor telefon di akaun anda.</p>
          <p>Gunakan kod 6-digit di bawah:</p>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; margin: 0; color: #10b981; font-size: 32px;">${newOTP}</h1>
          </div>
          <p style="font-size: 12px; color: #64748b;">Abaikan emel ini sekiranya anda tidak memohon pertukaran ini.</p>
        </div>`
      });
      
      setShowOTPModal(true);
      setOtpInput('');
      toast.success('Kod pengesahan 6-digit telah dihantar ke emel anda.');
    } catch (err: any) {
      toast.error(err.message || "Gagal menghantar kod pengesahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === generatedOTP) {
      setShowOTPModal(false);
      setOtpInput('');
      setGeneratedOTP('');
      await commitUpdates();
    } else {
      toast.error('Kod pengesahan (OTP) tidak sah.');
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Kata laluan tidak sepadan atau kosong.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Kata laluan berjaya ditukar!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menukar kata laluan.');
    } finally {
      setLoading(false);
    }
  };

  const handleThemePreferenceSelect = (mode: 'light' | 'dark' | 'system') => {
    setActiveThemePreference(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_preference', mode);
      if (mode === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isDark ? 'dark' : 'light');
        toast.success('Tema diselaraskan dengan tetapan sistem peranti.');
      } else {
        setTheme(mode);
        toast.success(`Tema ditukar ke mod ${mode === 'dark' ? 'Gelap' : 'Cerah'}`);
      }
    }
  };

  return (
    <>
      <div className="page-container bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] min-h-screen relative space-y-6 pb-36 after:content-[''] after:block after:h-28 after:shrink-0 overflow-x-hidden pt-4 sm:pt-6">
        
        {/* Subtle Ambient Mesh Glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-[#1E271F]/80 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-all shadow-xs active:scale-95 min-h-[44px] min-w-[44px]"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Hab Tetapan</h1>
              <p className="text-[11px] text-[#556453] dark:text-[#A3B39F] font-medium">Urus profil, keselamatan & paparan super app.</p>
            </div>
          </div>

          <span className="bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#6B7F5B]/30 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            PORTAL POLISAS
          </span>
        </div>

        {/* ── A. HERO PROFILE CARD ── */}
        <Card className="bg-white dark:bg-[#1E271F]/80  border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Large Avatar with Camera Upload */}
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl border-4 border-white dark:border-[#1E271F] shadow-md ring-1 ring-[#D9C9B2]/60 dark:ring-[#3A4A3B] bg-white dark:bg-[#151D16]">
                <AvatarImage
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=2E3A2F&textColor=F8F6EE`}
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#2E3A2F] dark:bg-[#6B7F5B] text-white font-black text-xl sm:text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="avatar-hero-upload"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <label
                htmlFor="avatar-hero-upload"
                aria-label="Tukar gambar profil"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-xl absolute -bottom-1 -right-1 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-[#1E271F] transition-all cursor-pointer min-w-[32px] min-h-[32px]",
                  uploadingAvatar ? "bg-slate-400 pointer-events-none" : "bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] active:scale-95"
                )}
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left min-w-0 w-full max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full min-w-0">
                <div className="min-w-0 w-full">
                  <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE] break-words leading-tight sm:leading-snug max-w-full">
                    {displayName}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono font-bold text-[#556453] dark:text-[#A3B39F] mt-0.5 truncate">
                    {profile?.matric_no ? `Matrik: ${profile.matric_no}` : 'No. Matrik Belum Ditetapkan'}
                  </p>
                </div>

                <span
                  className={cn(
                    "font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full border self-center sm:self-start mt-1 sm:mt-0 shrink-0",
                    roleTitle === 'PENTADBIR UTAMA'
                      ? "bg-[#C96F4F]/15 text-[#C96F4F] border-[#C96F4F]/30"
                      : "bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE] border-[#6B7F5B]/30"
                  )}
                >
                  {roleTitle}
                </span>
              </div>

              {/* Quick Status Strip (3 micro-badges) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-4 border-t border-[#D9C9B2]/60 dark:border-[#3A4A3B] mt-4 w-full max-w-full">
                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#556453] dark:text-[#A3B39F] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <GraduationCap className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
                    <span className="truncate">Semester</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate max-w-full">
                    {semInfo.semester > 0 ? `Semester ${semInfo.semester}` : 'Semester 1'}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#556453] dark:text-[#A3B39F] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <Sparkles className="w-3.5 h-3.5 text-[#C96F4F] shrink-0" />
                    <span className="truncate">Merit</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate max-w-full">
                    {profile?.merit_points ?? 0} Merit
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#556453] dark:text-[#A3B39F] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <Home className="w-3.5 h-3.5 text-[#2E3A2F] dark:text-[#6B7F5B] shrink-0" />
                    <span className="truncate">Kediaman</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate max-w-full">
                    {profile?.residence_type === 'KAMSIS' ? 'Asrama Kamsis' : 'Rumah Sewa'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── B. SEGMENTED TAB NAVIGATION ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
          {SETTINGS_TAB_CONFIG.map((t) => {
            const isActive = currentTab === t.id;
            const Icon = t.iconComponent;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 snap-start select-none min-h-[44px]",
                  isActive
                    ? "bg-[#2E3A2F]/10 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#6B7F5B]/40 shadow-xs font-black"
                    : "bg-white dark:bg-[#1E271F]/70 text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] border border-[#D9C9B2]/60 dark:border-[#3A4A3B] hover:border-[#6B7F5B]/40"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#2E3A2F] dark:text-[#6B7F5B]" : "text-[#556453] dark:text-[#A3B39F]")} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── C. TAB CONTENT SECTIONS ── */}
        <Tabs value={currentTab} onValueChange={(val) => handleTabChange(val as SettingsTabId)} className="w-full">
          <AnimatePresence mode="wait">
            
            {/* 1. TAB: PROFIL & AKADEMIK */}
            <TabsContent value="profil" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Maklumat Peribadi */}
                <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] bg-[#F8F6EE]/50 dark:bg-[#151D16]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Maklumat Asas & Perhubungan</h3>
                      <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5">Nama rasmi dan talian perhubungan aktif anda di POLISAS.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setFullName(profile?.full_name || '');
                          setPhone(profile?.phone || '');
                          setEmail(user?.email || '');
                        }}
                        className="h-11 px-4 rounded-2xl font-bold text-xs text-[#556453] dark:text-[#A3B39F] hover:bg-[#F8F6EE] dark:hover:bg-[#151D16] min-h-[44px]"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUpdateProfile}
                        disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)}
                        className="h-11 px-6 rounded-2xl font-black text-xs bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
                      >
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan Profil'}
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="input-full-name" className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Nama Penuh</Label>
                        <Input
                          id="input-full-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.toUpperCase())}
                          placeholder="NAMA PENUH"
                          className="h-11 rounded-xl bg-white dark:bg-[#151D16] uppercase font-bold text-sm border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:ring-[#6B7F5B]/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="input-phone" className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">No. Telefon Bimbit</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />
                          <Input
                            id="input-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0123456789"
                            type="tel"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#151D16] font-bold text-sm border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:ring-[#6B7F5B]/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="input-email" className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Alamat Emel</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />
                          <Input
                            id="input-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="pelajar@polisas.edu.my"
                            type="email"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#151D16] font-medium text-sm border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:ring-[#6B7F5B]/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#556453] dark:text-[#A3B39F]">No. Kad Pengenalan (IC)</Label>
                        <Input
                          value={profile?.ic_no || profile?.nric || '-'}
                          readOnly
                          className="h-11 rounded-xl bg-[#F8F6EE]/50 dark:bg-[#151D16]/50 font-mono text-sm opacity-70 cursor-not-allowed border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE]"
                        />
                      </div>
                    </div>

                    {/* Academic info summary cards */}
                    <div className="pt-4 border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F] mb-3">Maklumat Program & Jabatan</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                          <span className="text-[10px] font-bold uppercase text-[#556453] dark:text-[#A3B39F] block">Jabatan</span>
                          <span className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate block mt-0.5">{profile?.department || '-'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                          <span className="text-[10px] font-bold uppercase text-[#556453] dark:text-[#A3B39F] block">Program</span>
                          <span className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate block mt-0.5">{profile?.programme_name || profile?.programme_code || '-'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                          <span className="text-[10px] font-bold uppercase text-[#556453] dark:text-[#A3B39F] block">Sesi Kemasukan</span>
                          <span className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate block mt-0.5">
                            {profile?.intake_year ? `${profile.intake_year} / Sesi ${profile.intake_period || 1}` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Seksyen Permintaan Pindaan Matrik & Semester */}
                <ProfileEditRequestSection />

              </motion.div>
            </TabsContent>

            {/* 2. TAB: STATUS KEDIAMAN */}
            <TabsContent value="kediaman" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <KediamanSettingsSection />
              </motion.div>
            </TabsContent>

            {/* 3. TAB: PAPARAN & TEMA */}
            <TabsContent value="tema" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden p-5 sm:p-7">
                  <div className="mb-6">
                    <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Pemilih Tema & Paparan</h3>
                    <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5">Sesuaikan mod warna antara mod cerah, gelap OLED, atau ikut peranti sistem.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'light' as const,
                        title: 'Cerah',
                        desc: 'Latar belakang cerah dengan kontras tinggi untuk siang hari.',
                        icon: Sun,
                        previewClass: 'bg-[#F8F6EE] border-[#D9C9B2] text-[#2E3A2F]',
                      },
                      {
                        id: 'dark' as const,
                        title: 'Gelap',
                        desc: 'Latar gelap OLED untuk keselesaan mata & penjimatan bateri.',
                        icon: Moon,
                        previewClass: 'bg-[#151D16] border-[#3A4A3B] text-[#F8F6EE]',
                      },
                      {
                        id: 'system' as const,
                        title: 'Ikut Sistem',
                        desc: 'Menyesuaikan tema secara dinamik mengikut tetapan OS peranti.',
                        icon: Laptop,
                        previewClass: 'bg-gradient-to-r from-[#F8F6EE] via-[#D9C9B2] to-[#151D16] border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE]',
                      },
                    ].map((t) => {
                      const isSelected = activeThemePreference === t.id;
                      const OptionIcon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleThemePreferenceSelect(t.id)}
                          className={cn(
                            "flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden group min-h-[140px]",
                            isSelected
                              ? "border-[#6B7F5B] bg-[#2E3A2F]/5 dark:bg-[#6B7F5B]/15 ring-2 ring-[#6B7F5B]/30 shadow-xs"
                              : "border-[#D9C9B2]/70 dark:border-[#3A4A3B] bg-white dark:bg-[#151D16]/50 hover:border-[#6B7F5B]/40"
                          )}
                        >
                          <div className={cn("w-full h-12 rounded-xl border p-2 mb-3 flex items-center gap-2", t.previewClass)}>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#C96F4F]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#6B7F5B]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2E3A2F] dark:bg-[#F8F6EE]" />
                            <div className="flex-1 h-2 rounded bg-current opacity-20 ml-2" />
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-black text-sm text-[#2E3A2F] dark:text-[#F8F6EE] flex items-center gap-2">
                              <OptionIcon className="w-4 h-4 text-[#6B7F5B]" />
                              {t.title}
                            </span>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-[#6B7F5B] text-white shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#556453] dark:text-[#A3B39F] mt-1 leading-snug">{t.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 rounded-2xl bg-[#F8F6EE]/80 dark:bg-[#151D16]/80 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-[#6B7F5B] shrink-0" />
                    <p className="text-xs text-[#556453] dark:text-[#A3B39F]">
                      Mod gelap dilengkapi seni reka <strong>OLED Deep Glass</strong> dengan pencahayaan rim neon untuk keselesaan visual maksimum.
                    </p>
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

            {/* 4. TAB: PEMBERITAHUAN */}
            <TabsContent value="notifikasi" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] bg-[#F8F6EE]/50 dark:bg-[#151D16]/50">
                    <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Tetapan Pemberitahuan & Makluman</h3>
                    <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5">Urus notifikasi amaran, status pesanan bazar, dan aktiviti kampus.</p>
                  </div>

                  <div className="divide-y divide-[#D9C9B2]/40 dark:divide-[#3A4A3B]">
                    {[
                      {
                        title: 'Pesanan PolyMart & Bazar',
                        desc: 'Terima notifikasi status pesanan, pembayaran QR, dan barang sedia untuk diambil.',
                        icon: Store,
                        defaultChecked: true,
                      },
                      {
                        title: 'Bantuan & Aduan Kebajikan',
                        desc: 'Makluman kemaskini status permohonan dana dan tiket kebajikan mahasiswa.',
                        icon: ShieldAlert,
                        defaultChecked: true,
                      },
                      {
                        title: 'Program & Acara Pelajar (EMS)',
                        desc: 'Peringatan pendaftaran aktiviti, kehadiran kod QR, dan tuntutan merit.',
                        icon: CalendarRange,
                        defaultChecked: true,
                      },
                      {
                        title: 'Hebahan & Pengumuman Rasmi JPP',
                        desc: 'Siaran langsung mesej penting, takwim, dan hebahan amnesti Majlis Tertinggi.',
                        icon: Bell,
                        defaultChecked: true,
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 hover:bg-[#F8F6EE]/40 dark:hover:bg-[#151D16]/40 transition-colors">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 rounded-2xl bg-[#F8F6EE]/80 dark:bg-[#151D16]/80 text-[#6B7F5B] shrink-0 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] mt-0.5">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE] block">{item.title}</span>
                            <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed max-w-xl">{item.desc}</p>
                          </div>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} className="data-[state=checked]:bg-[#6B7F5B] shrink-0 min-h-[24px]" />
                      </div>
                    ))}
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

            {/* 5. TAB: KESELAMATAN */}
            <TabsContent value="keselamatan" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Tukar Kata Laluan */}
                <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#D9C9B2]/40 dark:border-[#3A4A3B] bg-[#F8F6EE]/50 dark:bg-[#151D16]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">Kunci Keselamatan Akaun</h3>
                      <p className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium mt-0.5">Kemaskini kata laluan untuk melindungi data peribadi dan rekod kelab.</p>
                    </div>
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={loading || !newPassword}
                      className="h-11 px-6 rounded-2xl font-bold text-xs bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
                    >
                      {loading ? 'Memproses...' : 'Tukar Kata Laluan'}
                    </Button>
                  </div>

                  <div className="p-5 sm:p-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Kata Laluan Baharu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#151D16] font-mono text-sm border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:ring-[#6B7F5B]/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">Sahkan Kata Laluan Baharu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556453] dark:text-[#A3B39F]" />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#151D16] font-mono text-sm border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:ring-[#6B7F5B]/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Sesi & Peranti */}
                <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-[#1E271F]/80 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] shrink-0 border border-[#6B7F5B]/30">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#2E3A2F] dark:text-[#F8F6EE]">Sesi Semasa: Pelayar Web Aktif</p>
                      <p className="text-[11px] text-[#556453] dark:text-[#A3B39F] mt-0.5">Disulitkan dengan protokol TLS 1.3 & Supavisor Pooler</p>
                    </div>
                  </div>
                  <span className="bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#6B7F5B]/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Aktif
                  </span>
                </div>

                {/* Log Out & Danger Zone */}
                <div className="p-5 sm:p-7 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">Log Keluar Akaun</h4>
                    <p className="text-xs text-[#556453] dark:text-[#A3B39F] mt-0.5">Tamatkan sesi aktif pada peranti ini untuk keselamatan akaun anda.</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={signOut}
                    className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 shadow-xs flex items-center gap-2 min-h-[44px] shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Keluar Sesi
                  </Button>
                </div>

              </motion.div>
            </TabsContent>

            {/* 6. TAB: BANTUAN & TUTORIAL */}
            <TabsContent value="bantuan" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Pemicu Tutorial Sistem */}
                <div className="p-5 sm:p-7 rounded-[2rem] bg-[#F8F6EE]/80 dark:bg-[#151D16]/80 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-[#6B7F5B]/15 text-[#6B7F5B] shrink-0 border border-[#6B7F5B]/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE]">Panduan Interaktif Sistem</h4>
                      <p className="text-xs text-[#556453] dark:text-[#A3B39F] mt-0.5">Mulakan semula lawatan panduan portal JPP POLISAS untuk membiasakan diri dengan fungsi utama.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('portal_walkthrough_seen');
                        localStorage.removeItem('hide_bottomnav_tooltip');
                      }
                      toast.success('Panduan sistem ditetapkan semula. Kembali ke Portal untuk bermula!');
                      navigate('/portal');
                    }}
                    className="h-11 px-5 rounded-2xl font-bold text-xs bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs min-h-[44px] shrink-0"
                  >
                    Mulakan Semula Panduan
                  </Button>
                </div>

                {/* Saluran Bantuan Rasmi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1E271F]/80 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="bg-[#6B7F5B]/15 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#6B7F5B]/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                        Talian Pantas
                      </span>
                      <h4 className="text-base font-black text-[#2E3A2F] dark:text-[#F8F6EE]">WhatsApp Responder MT</h4>
                      <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed">Berhubung terus dengan sekretariat JPP untuk kecemasan teknikal sistem.</p>
                    </div>
                    <Button
                      onClick={() => window.open('https://wa.me/601139413699', '_blank')}
                      className="w-full h-11 rounded-2xl font-bold text-xs bg-[#6B7F5B] hover:bg-[#5C6E4E] text-white shadow-xs min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Buka WhatsApp JPP
                    </Button>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1E271F]/80 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="bg-[#2E3A2F]/10 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] border border-[#2E3A2F]/20 dark:border-[#6B7F5B]/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                        Maklum Balas Rasmi
                      </span>
                      <h4 className="text-base font-black text-[#2E3A2F] dark:text-[#F8F6EE]">Emel Rasmi Cadangan</h4>
                      <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed">Kemukakan usul penambahbaikan sistem atau laporan isu rasmi.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = 'mailto:jpp@cipher-node.org?subject=Maklum%20Balas%20Portal%20JPP'}
                      className="w-full h-11 rounded-2xl font-bold text-xs border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE] dark:hover:bg-[#151D16] min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> Hantar Emel Rasmi
                    </Button>
                  </div>
                </div>

                {/* Bahan Rujukan & Garis Panduan */}
                <Card className="border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-xs rounded-[2rem] bg-white dark:bg-[#1E271F]/80  p-5 sm:p-7">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#556453] dark:text-[#A3B39F] mb-4">Katalog Bahan Rujukan Operasi</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Garis Panduan Sistem Utama JPP', icon: FileText },
                      { title: 'SOP Kelulusan Aktiviti Takwim', icon: Check },
                      { title: 'Cara Menyusun Kertas Kerja', icon: Award },
                      { title: 'Arkib Soalan Lazim Berulang (FAQ)', icon: HelpCircle }
                    ].map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/60 dark:border-[#3A4A3B] hover:bg-[#F8F6EE] dark:hover:bg-[#151D16] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white dark:bg-[#1E271F] text-[#6B7F5B] border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                            <doc.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{doc.title}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#556453] dark:text-[#A3B39F]" />
                      </div>
                    ))}
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

          </AnimatePresence>
        </Tabs>

        {/* Modal OTP */}
        <AnimatePresence>
          {showOTPModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 "
                onClick={() => !loading && setShowOTPModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-sm bg-white dark:bg-[#1E271F] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-2xl rounded-[2rem] p-6 sm:p-8"
              >
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-[#6B7F5B]/15 flex items-center justify-center text-[#6B7F5B] ring-4 ring-[#6B7F5B]/10">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE] mb-1">Pengesahan OTP</h3>
                    <p className="text-[#556453] dark:text-[#A3B39F] font-medium text-xs">
                      Kod 6-digit dihantar ke <span className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{user?.email}</span>.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOTP} className="space-y-5 mt-4">
                    <Input 
                      type="text" 
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 text-center text-2xl font-mono tracking-[0.4em] bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] focus-visible:border-[#6B7F5B] rounded-xl" 
                      placeholder="••••••" 
                      maxLength={6}
                      autoFocus
                    />

                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowOTPModal(false)} 
                        disabled={loading}
                        className="flex-1 h-11 rounded-2xl font-bold uppercase text-[10px] tracking-wider border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#556453] dark:text-[#A3B39F] min-h-[44px]"
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={otpInput.length !== 6 || loading}
                        className="flex-1 h-11 rounded-2xl font-bold uppercase text-[10px] tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#5C6E4E] text-white shadow-xs min-h-[44px]"
                      >
                        {loading ? 'Disahkan...' : 'Sahkan'}
                      </Button>
                    </div>
                  </form>

                  <p className="text-[10px] text-[#556453] dark:text-[#A3B39F] font-medium pt-3 mt-3 border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B]">
                    Tidak terima emel? <button type="button" onClick={handleInitiateOTP} className="text-[#6B7F5B] hover:underline font-bold" disabled={loading}>Hantar Semula</button>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
      <BottomNav />
      <FloatingAiChat />
    </>
  );
}

export default SettingsPage;