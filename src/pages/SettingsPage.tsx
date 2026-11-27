import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Bell, Shield, Mail, Lock, Camera, Check, Award, Loader2, FileText,
  HelpCircle, MessageSquare, ExternalLink, Sparkles, Phone, ArrowLeft, Moon,
  MapPin, Home, Building2, GraduationCap, ClipboardEdit, Clock, XCircle,
  CheckCircle2, AlertCircle, LogOut, Store, ShieldAlert, CalendarRange,
  Sun, Laptop, Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { changeLanguage, SupportedLanguage } from '@/lib/i18n';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import i18n from '@/lib/i18n';

// ── Palette Tokens (Semambu Mineral Teal & Crisp Alabaster) ───
// #0F766E: Primary (Semambu Mineral Teal)
// #14B8A6: Secondary (Luminous Jade Accent)
// #B8E4DC: Hairline Mist Border
// #1E4D45: Dark Pine-Teal Border
// #F59E0B: Highlight / Gold Accent
// #F6FBF9: Background (Crisp Mineral Alabaster)
// #061714: Deep Abyssal Teal Dark Canvas
// #0B2420: Deep Pine-Teal Dark Surface


// ─────────────────────────────────────────────────────────────────────────────
// Super App Tab Configurations & Legacy Param Mapping
// ─────────────────────────────────────────────────────────────────────────────
const t = (k: string, fb: string, opt?: any): string => (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...(opt || {}) }) as string) : fb);

export const getSettingsTabConfig = (t: (k: string, fb: string, opt?: any) => string = (k, fb, opt) => (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...(opt || {}) }) as string) : fb)) => [
  { id: 'profil' as const, label: t('settings:tab_profile', 'Profil & Akademik'), labelKey: 'tab_profile', iconComponent: User, desc: t('settings:profile_tab_desc', 'Maklumat peribadi & pinda data'), descKey: 'profile_tab_desc' },
  { id: 'kediaman' as const, label: t('settings:tab_residence', 'Status Kediaman'), labelKey: 'tab_residence', iconComponent: MapPin, desc: t('settings:residence_tab_desc', 'Deklarasi KAMSIS / Luar Kampus'), descKey: 'residence_tab_desc' },
  { id: 'tema' as const, label: t('settings:tab_theme', 'Paparan & Bahasa'), labelKey: 'tab_theme', iconComponent: Moon, desc: t('settings:theme_tab_desc', 'Pilihan mod cerah, gelap dan pilihan bahasa'), descKey: 'theme_tab_desc' },
  { id: 'notifikasi' as const, label: t('settings:tab_notifications', 'Pemberitahuan'), labelKey: 'tab_notifications', iconComponent: Bell, desc: t('settings:notifications_tab_desc', 'Urus amaran & notifikasi pesanan'), descKey: 'notifications_tab_desc' },
  { id: 'keselamatan' as const, label: t('settings:tab_security', 'Keselamatan'), labelKey: 'tab_security', iconComponent: Shield, desc: t('settings:security_tab_desc', 'Kata laluan & log masuk akaun'), descKey: 'security_tab_desc' },
  { id: 'bantuan' as const, label: t('settings:tab_help', 'Bantuan & Tutorial'), labelKey: 'tab_help', iconComponent: HelpCircle, desc: t('settings:help_tab_desc', 'Panduan sistem & talian aduan'), descKey: 'help_tab_desc' },
];

export const SETTINGS_TAB_CONFIG = getSettingsTabConfig();

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
  const { t } = useTranslation(['settings', 'common']);
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
    if (!requestedValue.trim()) { toast.error(t('settings:error_enter_new_value', 'Sila isi nilai baharu.')); return; }
    if (fieldType === 'semester') {
      const sem = Number(requestedValue);
      if (!Number.isInteger(sem) || sem < 1 || sem > 6) { toast.error(t('settings:error_semester_range', 'Semester mesti antara 1 hingga 6.')); return; }
    }
    if (hasPendingForSelected) { toast.error(t('settings:error_pending_request_exists', 'Terdapat permintaan PENDING yang masih belum disemak.')); return; }

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
        title: t('settings:profile_edit_request_title', 'Permintaan Pindaan Profil Pelajar'),
        message: t('settings:profile_edit_request_msg', '{{name}} memohon pindaan {{field}}: {{curr}} -> {{next}}{{reason}}', {
          name: profile.full_name,
          field: fieldType === 'matric_no' ? t('settings:matric_no', 'No. Matrik') : t('settings:semester', 'Semester'),
          curr: currentVal,
          next: requestedValue.trim().toUpperCase(),
          reason: reason.trim() ? `. Sebab: ${reason.trim()}` : ''
        }),
        type: 'SYSTEM',
        module: 'JPP',
        target_role: 'JPP',
        link: '/jpp/overview',
        actor_name: profile.full_name,
        is_read: false,
      });
      if (notifErr) console.warn('Notifikasi JPP gagal:', notifErr.message);

      toast.success(t('settings:amendment_request_sent', 'Permintaan pindaan berjaya dihantar! Sila tunggu semakan MT JPP.'));
      setRequestedValue('');
      setReason('');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || t('settings:error_send_request_failed', 'Gagal hantar permintaan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" />{t('settings:status_pending', 'MENUNGGU')}</span>;
    if (status === 'APPROVED') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/25"><CheckCircle2 className="w-3 h-3 text-[#0F766E] dark:text-[#2DD4BF]" />{t('settings:status_approved', 'DILULUSKAN')}</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" />{t('settings:status_rejected', 'DITOLAK')}</span>;
  };

  return (
    <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-[#B8E4DC]/50 dark:border-[#252B35] bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 border border-[#0F766E]/25">
          <ClipboardEdit className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:academic_amendment_title', 'Pindaan Maklumat Akademik')}</h3>
          <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">{t('settings:academic_amendment_desc', 'Mohon pindaan No. Matrik atau Semester rasmi kepada Majlis JPP.')}</p>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2] mb-1">{t('settings:current_matric_no', 'No. Matrik Semasa')}</p>
            <p className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9] font-mono">{profile?.matric_no || <span className="text-[#475569] dark:text-[#94A0B2] italic text-xs">{t('settings:not_set', 'Belum ditetapkan')}</span>}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2] mb-1">{t('settings:current_semester', 'Semester Semasa')}</p>
            <p className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9]">{semInfo.semester > 0 ? t('settings:semester_n', 'Semester {{sem}}', { sem: semInfo.semester }) : <span className="text-[#475569] dark:text-[#94A0B2] italic text-xs">-</span>}</p>
          </div>
        </div>

        {loadingReqs ? (
          <div className="flex items-center gap-2 text-xs text-[#475569] dark:text-[#94A0B2]"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('settings:loading_records', 'Memuatkan rekod...')}</div>
        ) : requests.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2]">{t('settings:request_records', 'Rekod Permintaan')}</p>
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6FBF9]/40 dark:bg-[#090B0E]/40 border border-[#B8E4DC]/50 dark:border-[#252B35] gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      {r.field_type === 'matric_no' ? t('settings:matric_no', 'No. Matrik') : t('settings:semester', 'Semester')}: <span className="font-mono text-[#475569] dark:text-[#94A0B2] line-through">{r.current_value}</span> {'->'} <span className="font-mono text-[#0F766E] dark:text-[#2DD4BF] font-black">{r.requested_value}</span>
                    </p>
                    {r.review_note && <p className="text-[10px] text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:jpp_note', 'Nota JPP:')} {r.review_note}</p>}
                    <p className="text-[10px] text-[#475569]/60 dark:text-[#94A0B2]/60 mt-0.5">{new Date(r.submitted_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-[#B8E4DC]/50 dark:border-[#252B35] pt-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2] mb-4">{t('settings:send_new_request', 'Hantar Permintaan Baharu')}</p>
          {(hasPendingMatric && hasPendingSemester) ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('settings:pending_amendment_notice', 'Anda mempunyai permintaan PENDING untuk kedua-dua No. Matrik dan Semester. Sila tunggu kelulusan MT JPP.')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:amendment_type', 'Jenis Pindaan')}</Label>
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
                            ? "border-[#0F766E] bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9]"
                            : isPending
                            ? "border-[#B8E4DC]/30 dark:border-[#252B35]/40 bg-[#F6FBF9]/30 dark:bg-[#090B0E]/30 text-[#475569]/40 dark:text-[#94A0B2]/40 cursor-not-allowed"
                            : "border-[#B8E4DC]/60 dark:border-[#252B35] bg-white dark:bg-[#090B0E]/60 hover:border-[#0F766E]/35 text-[#0F172A] dark:text-[#F1F5F9]"
                        )}
                      >
                        {ft === 'matric_no' ? t('settings:matric_no', 'No. Matrik') : t('settings:semester', 'Semester')}
                        {isPending && <span className="block text-[9px] mt-0.5 text-amber-500 font-normal">{t('settings:has_pending', 'Ada PENDING')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  {fieldType === 'matric_no' ? t('settings:new_matric_no', 'No. Matrik Baharu') : t('settings:new_semester_range', 'Semester Baharu (1-6)')}
                  <span className="text-rose-500 ml-0.5">*</span>
                </Label>
                {fieldType === 'semester' ? (
                  <select
                    value={requestedValue}
                    onChange={e => setRequestedValue(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#090B0E] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                  >
                    <option value="">{t('settings:select_semester_placeholder', '-- Pilih Semester --')}</option>
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={String(s)}>{t('settings:semester_n', 'Semester {{sem}}', { sem: s })}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={requestedValue}
                    onChange={e => setRequestedValue(e.target.value.toUpperCase())}
                    placeholder="cth: 23DIP234567"
                    required
                    className="h-11 rounded-xl bg-white dark:bg-[#090B0E] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] font-mono text-sm uppercase focus-visible:ring-[#0F766E]/40"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:amendment_reason', 'Sebab Pindaan')} <span className="text-[#475569] dark:text-[#94A0B2] font-medium">{t('settings:optional_tag', '(Pilihan)')}</span></Label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder={t('settings:amendment_reason_placeholder', 'Terangkan sebab pindaan diperlukan...')}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#090B0E] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 outline-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !requestedValue}
                className="w-full h-11 rounded-2xl font-bold text-xs bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('settings:submitting_request', 'Menghantar...')}</> : t('settings:submit_amendment_btn', 'Hantar Permintaan Pindaan')}
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
  const { t } = useTranslation(['settings', 'common']);
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
      toast.success(t('settings:residence_saved_success', 'Status kediaman berjaya disimpan!'));
      setStep('done');
    } catch { toast.error(t('settings:error_save_residence', 'Gagal simpan. Cuba lagi.')); }
    finally { setSaving(false); }
  };

  const handleSubmitLuar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alamat.trim()) { toast.error(t('settings:error_enter_address', 'Sila isi alamat.')); return; }
    if (!kawasan) { toast.error(t('settings:error_select_area', 'Sila pilih kawasan.')); return; }
    if (kawasan === 'LAIN_LAIN' && !kawasanCustom.trim()) { toast.error(t('settings:error_specify_area', 'Sila nyatakan kawasan.')); return; }
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(t('settings:error_fill_field', 'Sila isi: {{label}}', { label: f.label })); return;
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
      <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-3xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 flex items-center justify-center mx-auto text-[#0F766E] dark:text-[#2DD4BF] border border-[#0F766E]/25">
          <MapPin className="w-7 h-7" />
        </div>
        <p className="font-black text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:no_declaration_needed_title', 'Belum Perlu Deklarasi')}</p>
        <p className="text-xs text-[#475569] dark:text-[#94A0B2] max-w-sm mx-auto">{t('settings:no_declaration_needed_desc', 'Status kediaman hanya diperlukan mulai Semester 2 dan ke atas mengikut takwim kolej.')}</p>
      </Card>
    );
  }

  return (
    <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-[#B8E4DC]/50 dark:border-[#252B35] bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 border border-[#0F766E]/25">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:residence_status_title', 'Status Kediaman Pelajar')}</h3>
          <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5 flex items-center flex-wrap gap-1">
            <span>{t('settings:semester_n', 'Semester {{sem}}', { sem: semInfo.semester })} - {t('settings:academic_year_label', 'Tahun Akademik')} {academicYear}</span>
            {existing && <span className="ml-2 text-[#0F766E] dark:text-[#2DD4BF] font-bold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t('settings:already_recorded', 'Sudah Direkodkan')}</span>}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {step === 'loading' && (
          <div className="py-8 flex items-center justify-center gap-2 text-[#475569] dark:text-[#94A0B2] text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#2DD4BF]" /> {t('settings:loading_info', 'Memuatkan maklumat...')}
          </div>
        )}

        {step === 'choice' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A0B2] font-medium mb-4">{t('settings:residence_location_question', 'Di mana lokasi penempatan anda bagi sesi semester ini?')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center gap-4 p-5 rounded-3xl border border-[#0F766E]/35 bg-[#0F766E]/5 hover:bg-[#0F766E]/10 dark:bg-[#090B0E]/70 text-left transition-all min-h-[72px]"
              >
                <div className="p-3 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 border border-[#0F766E]/25">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-[#0F172A] dark:text-[#F1F5F9] text-sm">{t('settings:in_kamsis', 'Dalam KAMSIS')}</p>
                  <p className="text-xs text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:in_kamsis_desc', 'Tinggal di asrama kolej POLISAS')}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex items-center gap-4 p-5 rounded-3xl border border-[#B8E4DC]/80 dark:border-[#252B35] bg-[#F6FBF9] hover:bg-[#E6F4F1] dark:bg-[#090B0E]/70 text-left transition-all min-h-[72px]"
              >
                <div className="p-3 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#2DD4BF] shrink-0 border border-[#B8E4DC]/60 dark:border-[#252B35]">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-[#0F172A] dark:text-[#F1F5F9] text-sm">{t('settings:off_campus', 'Luar Kampus')}</p>
                  <p className="text-xs text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:off_campus_desc', 'Rumah sewa atau kediaman keluarga')}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmitLuar} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:residence_address', 'Alamat Kediaman')} <span className="text-rose-500">*</span></Label>
              <textarea
                value={alamat} onChange={e => setAlamat(e.target.value)} required rows={2}
                placeholder="No. 12, Jalan Semambu 1..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#090B0E] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:residence_area', 'Kawasan Kediaman')} <span className="text-rose-500">*</span></Label>
              <KawasanSearchSelect
                value={kawasan}
                onChange={setKawasan}
                kawasanList={kawasanList}
                required
              />
            </div>
            {kawasan === 'LAIN_LAIN' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:specify_area', 'Nyatakan Kawasan')} <span className="text-rose-500">*</span></Label>
                <input
                  type="text" value={kawasanCustom} onChange={e => setKawasanCustom(e.target.value)} required
                  placeholder={t('settings:area_name_placeholder', 'Nama kawasan...')}
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#090B0E] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:feedback_suggestions', 'Cadangan')} <span className="text-[#475569] dark:text-[#94A0B2] font-medium">{t('settings:optional_tag', '(Pilihan)')}</span></Label>
              <textarea
                value={cadangan} onChange={e => setCadangan(e.target.value)} rows={2}
                placeholder={t('settings:suggestions_placeholder', 'Cadangan kepada Exco Kediaman Luar Kampus...')}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#090B0E] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] text-sm font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 outline-none"
              />
            </div>

            {dynamicFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#B8E4DC]/50 dark:border-[#252B35]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2]">{t('settings:additional_info', 'Maklumat Tambahan')}</p>
                <KlkDynamicFieldRenderer
                  fields={dynamicFields}
                  values={extraData}
                  onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                  inputClass="bg-white dark:bg-[#090B0E] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9]"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep('choice')} className="flex-1 h-11 rounded-2xl font-bold text-xs border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] min-h-[44px]">
                {t('settings:btn_back', 'Kembali')}
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 h-11 rounded-2xl font-bold text-xs bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs min-h-[44px]">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('settings:saving_loading', 'Menyimpan...')}</> : existing ? t('settings:btn_update', 'Kemaskini') : t('settings:btn_submit', 'Hantar')}
              </Button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center mx-auto border border-[#0F766E]/25">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:residence_status_saved', 'Status Kediaman Telah Disimpan')}</p>
              <p className="text-xs text-[#475569] dark:text-[#94A0B2] mt-1">
                {existing?.tinggal_luar
                  ? t('settings:off_campus_area', '{{status}} - {{area}}', {
                      status: t('settings:off_campus', 'Luar Kampus'),
                      area: existing.kawasan_kediaman === 'LAIN_LAIN' ? existing.kawasan_custom : existing.kawasan_kediaman,
                    })
                  : t('settings:in_kamsis_full', 'Dalam KAMSIS (Asrama Kolej)')}
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep(existing?.tinggal_luar ? 'form' : 'choice')} className="h-11 px-6 rounded-2xl font-bold text-xs border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] min-h-[44px]">
              {t('settings:update_again', 'Kemaskini Semula')}
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
  const { t, i18n } = useTranslation(['settings', 'common']);
  const tabConfigs = React.useMemo(() => getSettingsTabConfig(t), [t]);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const currentTab = resolveSettingsTab(rawTab);

  const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    try {
      await changeLanguage(lang);
      toast.success(
        lang === 'ms'
          ? t('settings:language_switched_ms', 'Bahasa sistem ditukar ke Bahasa Melayu')
          : t('settings:language_switched_en', 'System language changed to English')
      );
    } catch {
      toast.error(t('settings:language_update_failed', 'Gagal menukar bahasa.'));
    }
  };

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States untuk OTP & Pengesahan Log Keluar
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const displayName = profile?.full_name || user?.email?.split('@')[0] || t('settings:polisas_student', 'Pelajar POLISAS');
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
        toast.error(t('settings:error_avatar_size_exceeded', "Gagal: Saiz fail terlalu besar! Maksimum 5MB sahaja."));
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
      toast.success(t('settings:avatar_updated_success', "Gambar profil berjaya dikemaskini!"));
    } catch (error: any) {
      toast.error(error.message || t('settings:error_uploading_avatar', "Ralat memuat naik gambar."));
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
        toast.success(t('auth:check_email_verification', 'Sila semak emel baru anda untuk pautan pengesahan.'));
      } else if (isProfileChanged) {
        toast.success(t('settings:profile_updated_success', 'Profil berjaya disegerakkan!'));
      }
    } catch (error: any) {
      toast.error(error.message || t('settings:profile_update_failed', 'Gagal mengemaskini profil.'));
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
        subject: t('settings:email_otp_subject', "Kod Pengesahan Portal JPP"),
        html: t('settings:email_otp_html', `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Pengesahan Penukaran Nombor Telefon</h2>
          <p>Sistem merekodkan percubaan untuk menukar nombor telefon di akaun anda.</p>
          <p>Gunakan kod 6-digit di bawah:</p>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; margin: 0; color: #10b981; font-size: 32px;">{{otp}}</h1>
          </div>
          <p style="font-size: 12px; color: #64748b;">Abaikan emel ini sekiranya anda tidak memohon pertukaran ini.</p>
        </div>`, { otp: newOTP })
      });
      
      setShowOTPModal(true);
      setOtpInput('');
      toast.success(t('settings:otp_sent_to_email', 'Kod pengesahan 6-digit telah dihantar ke emel anda.'));
    } catch (err: any) {
      toast.error(err.message || t('settings:error_sending_otp', "Gagal menghantar kod pengesahan."));
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
      toast.error(t('settings:error_invalid_otp', 'Kod pengesahan (OTP) tidak sah.'));
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error(t('settings:error_passwords_mismatch', 'Kata laluan tidak sepadan atau kosong.'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settings:error_password_min_length', 'Kata laluan mestilah sekurang-kurangnya 6 aksara.'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('settings:change_password_success', 'Kata laluan berjaya ditukar!'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || t('settings:change_password_failed', 'Gagal menukar kata laluan.'));
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
        toast.success(t('settings:theme_synced_system', 'Tema diselaraskan dengan tetapan sistem peranti.'));
      } else {
        setTheme(mode);
        toast.success(mode === 'dark' ? t('settings:theme_switched_dark', 'Tema ditukar ke mod Gelap') : t('settings:theme_switched_light', 'Tema ditukar ke mod Cerah'));
      }
    }
  };

  return (
    <>
      <div className="page-container bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0F172A] dark:text-[#F1F5F9] min-h-[100dvh] relative space-y-6 pb-36 after:content-[''] after:block after:h-28 after:shrink-0 overflow-x-hidden pt-[calc(1rem+var(--sat,env(safe-area-inset-top,0px)))] sm:pt-[calc(1.5rem+var(--sat,env(safe-area-inset-top,0px)))]">
        
        {/* Subtle Ambient Mesh Glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#475569] dark:text-[#94A0B2] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-all shadow-xs active:scale-95 min-h-[44px] min-w-[44px]"
              aria-label={t('settings:btn_back', 'Kembali')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:page_title', 'Hab Tetapan')}</h1>
              <p className="text-[11px] text-[#475569] dark:text-[#94A0B2] font-medium">{t('settings:page_subtitle', 'Urus profil, keselamatan & paparan super app.')}</p>
            </div>
          </div>

          <span className="bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/25 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            PORTAL POLISAS
          </span>
        </div>

        {/* ── A. HERO PROFILE CARD ── */}
        <Card className="bg-white dark:bg-[#13171D]  border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Large Avatar with Camera Upload */}
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl border-4 border-white dark:border-[#13171D] shadow-md ring-1 ring-[#B8E4DC]/60 dark:ring-[#252B35] bg-white dark:bg-[#090B0E]">
                <AvatarImage
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=0F766E&textColor=F6FBF9`}
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#0F766E] dark:bg-[#0D9488] text-white font-black text-xl sm:text-2xl">{initials}</AvatarFallback>
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
                aria-label={t('settings:change_profile_photo', 'Tukar gambar profil')}
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-xl absolute -bottom-1 -right-1 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-[#13171D] transition-all cursor-pointer min-w-[32px] min-h-[32px]",
                  uploadingAvatar ? "bg-slate-400 pointer-events-none" : "bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] active:scale-95"
                )}
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left min-w-0 w-full max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full min-w-0">
                <div className="min-w-0 w-full">
                  <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9] break-words leading-tight sm:leading-snug max-w-full">
                    {displayName}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono font-bold text-[#475569] dark:text-[#94A0B2] mt-0.5 truncate">
                    {profile?.matric_no ? t('settings:matric_with_num', 'Matrik: {{num}}', { num: profile.matric_no }) : t('settings:matric_not_set', 'No. Matrik Belum Ditetapkan')}
                  </p>
                </div>

                <span
                  className={cn(
                    "font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full border self-center sm:self-start mt-1 sm:mt-0 shrink-0",
                    roleTitle === 'PENTADBIR UTAMA'
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border-[#0F766E]/25"
                  )}
                >
                  {roleTitle}
                </span>
              </div>

              {/* Quick Status Strip (3 micro-badges) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35] mt-4 w-full max-w-full">
                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#475569] dark:text-[#94A0B2] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                    <span className="truncate">{t('settings:semester_label', 'Semester')}</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate max-w-full">
                    {semInfo.semester > 0 ? t('settings:semester_n', 'Semester {{sem}}', { sem: semInfo.semester }) : t('settings:semester_n', 'Semester {{sem}}', { sem: 1 })}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#475569] dark:text-[#94A0B2] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{t('settings:merit_label', 'Merit')}</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate max-w-full">
                    {profile?.merit_points ?? 0} {t('settings:merit_unit', 'Merit')}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35] text-center min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-[#475569] dark:text-[#94A0B2] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full">
                    <Home className="w-3.5 h-3.5 text-[#0F172A] dark:text-[#2DD4BF] shrink-0" />
                    <span className="truncate">{t('settings:residence', 'Kediaman')}</span>
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate max-w-full">
                    {profile?.residence_type === 'KAMSIS' ? t('settings:asrama_kamsis', 'Asrama Kamsis') : t('settings:rumah_sewa', 'Rumah Sewa')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── B. SEGMENTED TAB NAVIGATION ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
          {tabConfigs.map((tConfig) => {
            const isActive = currentTab === tConfig.id;
            const Icon = tConfig.iconComponent;
            return (
              <button
                key={tConfig.id}
                type="button"
                onClick={() => handleTabChange(tConfig.id)}
                title={t(`settings:${tConfig.descKey}`, tConfig.desc)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 snap-start select-none min-h-[44px]",
                  isActive
                    ? "bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/35 shadow-xs font-black"
                    : "bg-white dark:bg-[#13171D]/70 text-[#475569] dark:text-[#94A0B2] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] border border-[#B8E4DC]/60 dark:border-[#252B35] hover:border-[#0F766E]/35"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#0F172A] dark:text-[#2DD4BF]" : "text-[#475569] dark:text-[#94A0B2]")} />
                <span>{t(`settings:${tConfig.labelKey}`, tConfig.label)}</span>
              </button>
            );
          })}
        </div>

        {/* ── C. TAB CONTENT SECTIONS ── */}
        <Tabs value={currentTab} onValueChange={(val) => handleTabChange(val as SettingsTabId)} className="w-full">
            
            {/* 1. TAB: PROFIL & AKADEMIK */}
            <TabsContent value="profil" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Maklumat Peribadi */}
                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#B8E4DC]/50 dark:border-[#252B35] bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:personal_details', 'Maklumat Asas & Perhubungan')}</h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">{t('settings:profile_tab_desc', 'Nama rasmi dan talian perhubungan aktif anda di POLISAS.')}</p>
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
                        className="h-11 px-4 rounded-2xl font-bold text-xs text-[#475569] dark:text-[#94A0B2] hover:bg-[#E6F4F1] dark:hover:bg-[#090B0E] min-h-[44px]"
                      >
                        {t('common:cancel', 'Batal')}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUpdateProfile}
                        disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)}
                        className="h-11 px-6 rounded-2xl font-black text-xs bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
                      >
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common:saving', 'Menyimpan...')}</> : t('settings:save_changes', 'Simpan Profil')}
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="input-full-name" className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('common:name', 'Nama Penuh')}</Label>
                        <Input
                          id="input-full-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.toUpperCase())}
                          placeholder={t('common:name', 'NAMA PENUH')}
                          className="h-11 rounded-xl bg-white dark:bg-[#090B0E] uppercase font-bold text-sm border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-[#0F766E]/40"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="input-phone" className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('common:phone_number', 'No. Telefon Bimbit')}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-[#94A0B2]" />
                          <Input
                            id="input-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0123456789"
                            type="tel"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#090B0E] font-bold text-sm border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-[#0F766E]/40"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="input-email" className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('common:email', 'Alamat Emel')}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-[#94A0B2]" />
                          <Input
                            id="input-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('settings:student_email_placeholder', 'pelajar@polisas.edu.my')}
                            type="email"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#090B0E] font-medium text-sm border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-[#0F766E]/40"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#475569] dark:text-[#94A0B2]">{t('common:ic_no', 'No. Kad Pengenalan (IC)')}</Label>
                        <Input
                          value={profile?.ic_no || profile?.nric || '-'}
                          readOnly
                          className="h-11 rounded-xl bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60 font-mono text-sm opacity-70 cursor-not-allowed border-[#B8E4DC]/60 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9]"
                        />
                      </div>
                    </div>

                    {/* Academic info summary cards */}
                    <div className="pt-4 border-t border-[#B8E4DC]/50 dark:border-[#252B35]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2] mb-3">{t('settings:academic_details', 'Maklumat Program & Jabatan')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35]">
                          <span className="text-[10px] font-bold uppercase text-[#475569] dark:text-[#94A0B2] block">{t('settings:department', 'Jabatan')}</span>
                          <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] truncate block mt-0.5">{profile?.department || '-'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35]">
                          <span className="text-[10px] font-bold uppercase text-[#475569] dark:text-[#94A0B2] block">{t('settings:programme', 'Program')}</span>
                          <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] truncate block mt-0.5">{profile?.programme_name || profile?.programme_code || '-'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35]">
                          <span className="text-[10px] font-bold uppercase text-[#475569] dark:text-[#94A0B2] block">{t('settings:intake_session', 'Sesi Kemasukan')}</span>
                          <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] truncate block mt-0.5">
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

            {/* 3. TAB: PAPARAN & BAHASA */}
            <TabsContent value="tema" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Seksyen Pilihan Bahasa */}
                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D] overflow-hidden p-5 sm:p-7">
                  <div className="mb-6 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0F766E]/10 dark:bg-[#0F766E]/20 border border-[#0F766E]/20 flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] shrink-0 mt-0.5">
                      <Languages className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
                        {t('settings:language_section_title')}
                      </h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">
                        {t('settings:language_section_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        id: 'ms' as const,
                        flag: '🇲🇾',
                        title: 'Bahasa Melayu',
                        subtitle: t('settings:language_ms_desc', 'Antara muka sistem dalam Bahasa Melayu'),
                      },
                      {
                        id: 'en' as const,
                        flag: '🇬🇧',
                        title: 'English',
                        subtitle: 'System interface in English',
                      },
                    ].map((langOpt) => {
                      const isSelected = currentLang === langOpt.id;
                      return (
                        <button
                          key={langOpt.id}
                          type="button"
                          onClick={() => handleLanguageSelect(langOpt.id)}
                          className={cn(
                            "flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden group min-h-[120px]",
                            isSelected
                              ? "border-[#0F766E] bg-[#0F766E]/5 dark:bg-[#14B8A6]/15 ring-2 ring-[#0F766E]/30 shadow-xs"
                              : "border-[#B8E4DC]/70 dark:border-[#252B35] bg-white dark:bg-[#090B0E]/60 hover:border-[#0F766E]/35"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <span className="text-2xl" role="img" aria-label={langOpt.title}>{langOpt.flag}</span>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-[#0F766E] text-white shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9]">
                            {langOpt.title}
                          </div>
                          <p className="text-[11px] text-[#475569] dark:text-[#94A0B2] mt-1 leading-snug">
                            {langOpt.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden p-5 sm:p-7">
                  <div className="mb-6">
                    <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:theme_section_title', 'Pemilih Tema & Paparan')}</h3>
                    <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">{t('settings:theme_section_desc', 'Sesuaikan mod warna antara mod cerah, gelap OLED, atau ikut peranti sistem.')}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'light' as const,
                        title: t('settings:light_mode', 'Cerah'),
                        desc: t('settings:light_mode_desc', 'Latar belakang cerah dengan kontras tinggi untuk siang hari.'),
                        icon: Sun,
                        previewClass: 'bg-[#F6FBF9] border-[#B8E4DC] text-[#0F172A]',
                      },
                      {
                        id: 'dark' as const,
                        title: t('settings:dark_mode', 'Gelap'),
                        desc: t('settings:dark_mode_desc', 'Latar gelap OLED untuk keselesaan mata & penjimatan bateri.'),
                        icon: Moon,
                        previewClass: 'bg-[#061714] border-[#1E4D45] text-[#F6FBF9]',
                      },
                      {
                        id: 'system' as const,
                        title: t('settings:system_mode', 'Ikut Sistem'),
                        desc: t('settings:system_mode_desc', 'Menyesuaikan tema secara dinamik mengikut tetapan OS peranti.'),
                        icon: Laptop,
                        previewClass: 'bg-gradient-to-r from-[#F6FBF9] via-[#E6F4F1] to-[#061714] border-[#B8E4DC] text-[#0F172A] dark:text-[#F1F5F9]',
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
                              ? "border-[#0F766E] bg-[#0F766E]/5 dark:bg-[#14B8A6]/15 ring-2 ring-[#0F766E]/30 shadow-xs"
                              : "border-[#B8E4DC]/70 dark:border-[#252B35] bg-white dark:bg-[#090B0E]/60 hover:border-[#0F766E]/35"
                          )}
                        >
                          <div className={cn("w-full h-12 rounded-xl border p-2 mb-3 flex items-center gap-2", t.previewClass)}>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#F1F5F9]" />
                            <div className="flex-1 h-2 rounded bg-current opacity-20 ml-2" />
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                              <OptionIcon className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                              {t.title}
                            </span>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-[#0F766E] text-white shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#475569] dark:text-[#94A0B2] mt-1 leading-snug">{t.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 rounded-2xl bg-[#E6F4F1]/80 dark:bg-[#090B0E]/90 border border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                    <p className="text-xs text-[#475569] dark:text-[#94A0B2]">
                      {t('settings:theme_oled_tip', 'Mod gelap dilengkapi seni reka OLED Deep Glass dengan pencahayaan rim neon untuk keselesaan visual maksimum.')}
                    </p>
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

            {/* 4. TAB: PEMBERITAHUAN */}
            <TabsContent value="notifikasi" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#B8E4DC]/50 dark:border-[#252B35] bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60">
                    <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:tab_notifications', 'Tetapan Pemberitahuan & Makluman')}</h3>
                    <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">{t('settings:notifications_tab_desc', 'Urus amaran & notifikasi pesanan')}</p>
                  </div>

                  <div className="divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
                    {[
                      {
                        title: t('settings:notif_polymart_title', 'Pesanan PolyMart & Bazar'),
                        desc: t('settings:notif_polymart_desc', 'Terima notifikasi status pesanan, pembayaran QR, dan barang sedia untuk diambil.'),
                        icon: Store,
                        defaultChecked: true,
                      },
                      {
                        title: t('settings:notif_welfare_title', 'Bantuan & Aduan Kebajikan'),
                        desc: t('settings:notif_welfare_desc', 'Makluman kemaskini status permohonan dana dan tiket kebajikan mahasiswa.'),
                        icon: ShieldAlert,
                        defaultChecked: true,
                      },
                      {
                        title: t('settings:notif_ems_title', 'Program & Acara Pelajar (EMS)'),
                        desc: t('settings:notif_ems_desc', 'Peringatan pendaftaran aktiviti, kehadiran kod QR, dan tuntutan merit.'),
                        icon: CalendarRange,
                        defaultChecked: true,
                      },
                      {
                        title: t('settings:notif_announcement_title', 'Hebahan & Pengumuman Rasmi JPP'),
                        desc: t('settings:notif_announcement_desc', 'Siaran langsung mesej penting, takwim, dan hebahan amnesti Majlis Tertinggi.'),
                        icon: Bell,
                        defaultChecked: true,
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 hover:bg-[#E6F4F1]/40 dark:hover:bg-[#090B0E]/40 transition-colors">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 rounded-2xl bg-[#E6F4F1]/80 dark:bg-[#090B0E]/90 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 border border-[#B8E4DC]/60 dark:border-[#252B35] mt-0.5">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] block">{item.title}</span>
                            <p className="text-xs text-[#475569] dark:text-[#94A0B2] leading-relaxed max-w-xl">{item.desc}</p>
                          </div>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} className="data-[state=checked]:bg-[#0F766E] shrink-0 min-h-[24px]" />
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
                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  overflow-hidden">
                  <div className="p-5 sm:p-7 border-b border-[#B8E4DC]/50 dark:border-[#252B35] bg-[#E6F4F1]/50 dark:bg-[#090B0E]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:tab_security', 'Kunci Keselamatan Akaun')}</h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] font-medium mt-0.5">{t('settings:security_tab_desc', 'Kemaskini kata laluan untuk melindungi data peribadi dan rekod kelab.')}</p>
                    </div>
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={loading || !newPassword}
                      className="h-11 px-6 rounded-2xl font-bold text-xs bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs active:scale-95 transition-all min-h-[44px]"
                    >
                      {loading ? t('common:loading', 'Memproses...') : t('settings:update_password', 'Tukar Kata Laluan')}
                    </Button>
                  </div>

                  <div className="p-5 sm:p-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:new_password', 'Kata Laluan Baharu')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-[#94A0B2]" />
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#090B0E] font-mono text-sm border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-[#0F766E]/40"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:confirm_new_password', 'Sahkan Kata Laluan Baharu')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-[#94A0B2]" />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-11 pl-10 rounded-xl bg-white dark:bg-[#090B0E] font-mono text-sm border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-[#0F766E]/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Sesi & Peranti */}
                <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 border border-[#0F766E]/25">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:active_session_title', 'Sesi Semasa: Pelayar Web Aktif')}</p>
                      <p className="text-[11px] text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:active_session_desc', 'Disulitkan dengan protokol TLS 1.3 & Supavisor Pooler')}</p>
                    </div>
                  </div>
                  <span className="bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/25 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    {t('common:active', 'Aktif')}
                  </span>
                </div>

                {/* Log Out & Danger Zone */}
                <div className="p-5 sm:p-7 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">{t('settings:danger_zone', 'Zon Bahaya')} - {t('common:logout', 'Log Keluar Akaun')}</h4>
                    <p className="text-xs text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:logout_session_warning', 'Tamatkan sesi aktif pada peranti ini untuk keselamatan akaun anda.')}</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 shadow-xs flex items-center gap-2 min-h-[44px] shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common:logout', 'Log Keluar Sesi')}
                  </Button>
                </div>

              </motion.div>
            </TabsContent>

            {/* 6. TAB: BANTUAN & TUTORIAL */}
            <TabsContent value="bantuan" className="space-y-6 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Pemicu Tutorial Sistem */}
                <div className="p-5 sm:p-7 rounded-[2rem] bg-[#E6F4F1]/80 dark:bg-[#090B0E]/90 border border-[#B8E4DC]/80 dark:border-[#252B35] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 border border-[#0F766E]/25">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:interactive_guide_title', 'Panduan Interaktif Sistem')}</h4>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] mt-0.5">{t('settings:interactive_guide_desc', 'Mulakan semula lawatan panduan portal JPP POLISAS untuk membiasakan diri dengan fungsi utama.')}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('portal_walkthrough_seen');
                        localStorage.removeItem('jpp_has_seen_portal_tour');
                        localStorage.removeItem('hide_bottomnav_tooltip');
                        try {
                          sessionStorage.setItem('jpp_force_tour', 'true');
                        } catch {}
                      }
                      toast.success(t('settings:guide_reset_success', 'Panduan sistem ditetapkan semula. Kembali ke Portal untuk bermula!'));
                      navigate('/portal');
                    }}
                    className="h-11 px-5 rounded-2xl font-bold text-xs bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs min-h-[44px] shrink-0"
                  >
                    {t('settings:restart_guide_btn', 'Mulakan Semula Panduan')}
                  </Button>
                </div>

                {/* Saluran Bantuan Rasmi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 rounded-[2rem] bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/25 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                        {t('settings:hotline_tag', 'Talian Pantas')}
                      </span>
                      <h4 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:responder_wa_title', 'WhatsApp Responder MT')}</h4>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] leading-relaxed">{t('settings:responder_wa_desc', 'Berhubung terus dengan sekretariat JPP untuk kecemasan teknikal sistem.')}</p>
                    </div>
                    <Button
                      onClick={() => window.open('https://wa.me/601139413699', '_blank')}
                      className="w-full h-11 rounded-2xl font-bold text-xs bg-[#0F766E] hover:bg-[#115E59] text-white shadow-xs min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> {t('settings:open_wa_jpp', 'Buka WhatsApp JPP')}
                    </Button>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F172A] dark:text-[#F1F5F9] border border-[#0F766E]/20 dark:border-[#14B8A6]/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                        {t('settings:official_feedback_tag', 'Maklum Balas Rasmi')}
                      </span>
                      <h4 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">{t('settings:official_email_title', 'Emel Rasmi Cadangan')}</h4>
                      <p className="text-xs text-[#475569] dark:text-[#94A0B2] leading-relaxed">{t('settings:official_email_desc', 'Kemukakan usul penambahbaikan sistem atau laporan isu rasmi.')}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = 'mailto:jpp@cipher-node.org?subject=Maklum%20Balas%20Portal%20JPP'}
                      className="w-full h-11 rounded-2xl font-bold text-xs border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[#E6F4F1] dark:hover:bg-[#090B0E] min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> {t('settings:send_official_email', 'Hantar Emel Rasmi')}
                    </Button>
                  </div>
                </div>

                {/* Bahan Rujukan & Garis Panduan */}
                <Card className="border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-xs rounded-[2rem] bg-white dark:bg-[#13171D]  p-5 sm:p-7">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#475569] dark:text-[#94A0B2] mb-4">{t('settings:reference_docs_catalog', 'Katalog Bahan Rujukan Operasi')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: t('settings:doc_guidelines_title', 'Garis Panduan Sistem Utama JPP'), icon: FileText },
                      { title: t('settings:doc_sop_title', 'SOP Kelulusan Aktiviti Takwim'), icon: Check },
                      { title: t('settings:doc_paperwork_title', 'Cara Menyusun Kertas Kerja'), icon: Award },
                      { title: t('settings:doc_faq_title', 'Arkib Soalan Lazim Berulang (FAQ)'), icon: HelpCircle }
                    ].map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/60 dark:border-[#252B35] hover:bg-[#E6F4F1] dark:hover:bg-[#090B0E] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white dark:bg-[#13171D] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC]/60 dark:border-[#252B35]">
                            <doc.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">{doc.title}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#475569] dark:text-[#94A0B2]" />
                      </div>
                    ))}
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

        </Tabs>

        <ConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          variant="destructive"
          title={t('common:logout', 'Log Keluar Sesi')}
          description={t('settings:logout_session_warning', 'Tamatkan sesi aktif pada peranti ini untuk keselamatan akaun anda.')}
          confirmLabel={t('common:logout', 'Log Keluar')}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            signOut();
          }}
        />

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
                className="relative w-full max-w-sm bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-2xl rounded-[2rem] p-6 sm:p-8"
              >
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] ring-4 ring-[#0F766E]/15">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9] mb-1">{t('settings:otp_verification_title', 'Pengesahan OTP')}</h3>
                    <p className="text-[#475569] dark:text-[#94A0B2] font-medium text-xs">
                      {t('settings:otp_code_sent_to', 'Kod 6-digit dihantar ke')} <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{user?.email}</span>.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOTP} className="space-y-5 mt-4">
                    <Input 
                      type="text" 
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 text-center text-2xl font-mono tracking-[0.4em] bg-[#F6FBF9] dark:bg-[#090B0E]/70 border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F172A] dark:text-[#F1F5F9] focus-visible:border-[#0F766E] rounded-xl" 
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
                        className="flex-1 h-11 rounded-2xl font-bold uppercase text-[10px] tracking-wider border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#475569] dark:text-[#94A0B2] min-h-[44px]"
                      >
                        {t('common:cancel', 'Batal')}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={otpInput.length !== 6 || loading}
                        className="flex-1 h-11 rounded-2xl font-bold uppercase text-[10px] tracking-wider bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#0D9488] dark:hover:bg-[#14B8A6] text-white shadow-xs min-h-[44px]"
                      >
                        {loading ? t('settings:otp_verifying', 'Disahkan...') : t('settings:btn_verify', 'Sahkan')}
                      </Button>
                    </div>
                  </form>

                  <p className="text-[10px] text-[#475569] dark:text-[#94A0B2] font-medium pt-3 mt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35]">
                    {t('settings:did_not_receive_email', 'Tidak terima emel?')} <button type="button" onClick={handleInitiateOTP} className="text-[#0F766E] dark:text-[#2DD4BF] hover:underline font-bold" disabled={loading}>{t('settings:btn_resend', 'Hantar Semula')}</button>
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