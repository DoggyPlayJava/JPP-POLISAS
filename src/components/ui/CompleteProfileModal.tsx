import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Loader2, Sparkles, Building2, Crown, Hash, User,
  GraduationCap, Calendar, AlertTriangle, ChevronDown, LogOut,
  Lock, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { insertNotifications } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS,
  getAkademikClubId, JABATAN_PROGRAMMES, INTAKE_YEARS,
} from '@/types';
import { cn } from '@/lib/utils';

const LEADER_ROLES: UserRole[] = ['CLUB_PRESIDENT', 'CLUB_MT'];
const STAFF_ROLES: UserRole[] = ['STAFF', 'CLUB_ADVISOR'];
type RegisterMode = 'student' | 'leader' | 'staff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROGRAMME_TO_JABATAN: Record<string, { jabatan: JabatanValue; code: string }> = {};
(Object.keys(JABATAN_PROGRAMMES) as JabatanValue[]).forEach(j => {
  JABATAN_PROGRAMMES[j].forEach(p => {
    PROGRAMME_TO_JABATAN[p.code] = { jabatan: j, code: p.code };
  });
});
PROGRAMME_TO_JABATAN['FTV'] = { jabatan: 'ftv', code: 'FTV' };

interface MatricParseResult {
  isValidFormat: boolean;
  cleanMatric: string;
  progCode?: string;
  year2Digit?: number;
  fullYear?: number;
  isYearValid?: boolean;
  sessionCode?: string;
  serial?: string;
  suggestedPeriod?: 1 | 2;
  knownProgramme?: { jabatan: JabatanValue; code: string };
  errorMessage?: string;
}

function parseAndValidateMatric(rawMatric: string, t?: (key: any, def?: any) => any): MatricParseResult {
  const clean = rawMatric.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 13);

  if (!clean.startsWith('02')) {
    return {
      isValidFormat: false,
      cleanMatric: clean,
      errorMessage: t ? t('auth:matric_starts_with_02', 'No. Matrik pelajar mestilah bermula dengan "02".') : 'No. Matrik pelajar mestilah bermula dengan "02".',
    };
  }

  // Regex: 02 + 2-4 abjad program + 2 digit tahun + 1 abjad sesi + 4 digit siri
  const match = clean.match(/^02([A-Z]{2,4})(\d{2})([A-Z])(\d{4})$/);
  if (!match) {
    return {
      isValidFormat: false,
      cleanMatric: clean,
      errorMessage: t ? t('auth:invalid_matric_format', 'Format No. Matrik tidak sah. Contoh: 02DTK25F1037') : 'Format No. Matrik tidak sah. Contoh: 02DTK25F1037',
    };
  }

  const [, progCode, rawYear, sessionCode, serial] = match;
  const year2Digit = parseInt(rawYear, 10);
  const fullYear = 2000 + year2Digit;

  // Tahun dinamik: (currentYear - 7) hingga (currentYear + 1)
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 7;
  const maxYear = currentYear + 1;
  const isYearValid = fullYear >= minYear && fullYear <= maxYear;

  if (!isYearValid) {
    return {
      isValidFormat: false,
      cleanMatric: clean,
      progCode,
      year2Digit,
      fullYear,
      isYearValid: false,
      errorMessage: t ? t('auth:invalid_matric_year', `Tahun kemasukan pada no. matrik (${fullYear}) tidak sah (julat sah: ${minYear} - ${maxYear}).`) : `Tahun kemasukan pada no. matrik (${fullYear}) tidak sah (julat sah: ${minYear} - ${maxYear}).`,
    };
  }

  // Sesi daripada digit pertama nombor siri: 1xxx -> Intake 1, 2xxx -> Intake 2
  let suggestedPeriod: 1 | 2 | undefined;
  if (serial.startsWith('1')) suggestedPeriod = 1;
  else if (serial.startsWith('2')) suggestedPeriod = 2;

  const knownProgramme = PROGRAMME_TO_JABATAN[progCode];

  return {
    isValidFormat: true,
    cleanMatric: clean,
    progCode,
    year2Digit,
    fullYear,
    isYearValid: true,
    sessionCode,
    serial,
    suggestedPeriod,
    knownProgramme,
  };
}

/** Compute estimated semester string from intake values + system_settings */
function computeSemDisplay(
  intakeYear: number, intakePeriod: 1 | 2, isFtv: boolean,
  sm1: number, sm2: number
): { sem: number; label: string } {
  const now       = new Date();
  const startMon  = intakePeriod === 1 ? sm1 : sm2;
  const months    = (now.getFullYear() - intakeYear) * 12 + (now.getMonth() + 1 - startMon);
  const maxSem    = isFtv ? 2 : 6;
  const sem       = Math.min(Math.max(1, Math.floor(months / 6) + 1), maxSem);
  const level     = isFtv ? 'Asasi' : sem <= 3 ? 'Junior' : 'Senior';
  return { sem, label: `${level} • Semester ${sem}` };
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function CompleteProfileModal() {
  const { t } = useTranslation(['auth', 'common']);
  const { profile, user, refetchProfile } = useAuth();

  // ── Form state ──────────────────────────────────────────────────────────
  // PENTING: Untuk pendaftaran baharu, fullName dimulakan kosong (tidak ambil nama Google)
  const [fullName,         setFullName]         = useState('');
  const [phone,            setPhone]            = useState(profile?.phone || '');
  const [matricNo,         setMatricNo]         = useState(profile?.matric_no || '');
  const [registerMode,     setRegisterMode]     = useState<RegisterMode>('student');
  const [jabatan,          setJabatan]          = useState<JabatanValue | ''>((profile?.department as JabatanValue) || '');
  const [programmeCode,    setProgrammeCode]    = useState('');
  const [intakeYear,       setIntakeYear]       = useState<number | ''>(profile?.intake_year || '');
  const [intakePeriod,     setIntakePeriod]     = useState<1 | 2 | ''>(profile?.intake_period || '');
  const [showSemOverride,  setShowSemOverride]  = useState(false);
  const [semOverride,      setSemOverride]      = useState<number | ''>(profile?.semester_override || '');
  const [leaderRole,       setLeaderRole]       = useState<UserRole>('CLUB_PRESIDENT');
  const [staffRole,        setStaffRole]        = useState<UserRole>('STAFF');
  const [leaderClubId,     setLeaderClubId]     = useState('');
  const [passcode,         setPasscode]         = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [showWarning,      setShowWarning]      = useState(false);

  // Semakan matric parsing & live mismatch
  const matricParsed = registerMode !== 'staff' && matricNo.trim() ? parseAndValidateMatric(matricNo.trim(), t) : null;
  const yearMismatch = !!(
    matricParsed?.isValidFormat &&
    matricParsed.fullYear &&
    intakeYear &&
    matricParsed.fullYear !== Number(intakeYear)
  );

  const handleMatricChange = (raw: string) => {
    if (registerMode === 'staff') {
      setMatricNo(raw.toUpperCase());
      return;
    }

    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 13);
    setMatricNo(clean);

    // Smart Auto-fill: auto-fill NOT auto-lock
    const res = parseAndValidateMatric(clean, t);
    if (res.isValidFormat) {
      if (res.knownProgramme) {
        setJabatan(res.knownProgramme.jabatan);
        setProgrammeCode(res.knownProgramme.code);
      }
      if (res.fullYear) {
        setIntakeYear(res.fullYear);
      }
      if (res.suggestedPeriod) {
        setIntakePeriod(res.suggestedPeriod);
      }
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => setShowWarning(true), 3000);
    } else {
      setShowWarning(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleLogout = async () => {
    if (!profile?.matric_no?.trim()) {
      const confirmDelete = window.confirm(
        t('auth:confirm_cancel_registration', "Adakah anda pasti mahu membatalkan pendaftaran? Akaun anda akan dipadam dari sistem.")
      );
      if (!confirmDelete) return;

      setLoading(true);
      try {
        const { error: rpcError } = await supabase.rpc('delete_own_account');
        if (rpcError) throw rpcError;
        
        await supabase.auth.signOut();
        toast.success(t('auth:registration_cancelled_success', "Pendaftaran dibatalkan dan akaun berjaya dipadamkan."));
        window.location.href = '/login';
      } catch (err: any) {
        toast.error((t ? t('common:delete_failed', "Gagal memadam akaun.") : "Gagal memadam akaun.") + " " + (err.message || ""));
        setLoading(false);
      }
    } else {
      setLoading(true);
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  // Intake config from system_settings
  const [sm1, setSm1] = useState(7);
  const [sm2, setSm2] = useState(1);
  useEffect(() => {
    supabase.from('system_settings').select('key,value').in('key', ['intake_1_month', 'intake_2_month'])
      .then(({ data }) => {
        data?.forEach(r => {
          if (r.key === 'intake_1_month') setSm1(Number(r.value));
          if (r.key === 'intake_2_month') setSm2(Number(r.value));
        });
      });
  }, []);



  // ── Profile completeness ─────────────────────────────────────────────────
  const isStaffRole = ['STAFF', 'SUPER_ADMIN_JPP', 'ADMIN'].includes(profile?.role ?? '');
  const hasMatric   = !!profile?.matric_no?.trim();
  const hasDept     = isStaffRole || !!profile?.department?.trim();
  const hasPhone    = !!profile?.phone?.trim();
  const hasCohort   = isStaffRole || (
    !!profile?.programme_code?.trim() &&
    !!profile?.intake_year &&
    !!profile?.intake_period
  );

  const isProfileComplete = hasMatric && hasDept && hasPhone && hasCohort;

  // PENTING: Jangan tunjuk modal jika pengguna belum log masuk atau profil belum dimuatkan.
  // Ini mengelak modal "Lengkapkan Profil" daripada berkelip apabila token refresh gagal
  // (HTTP 400) dan Supabase fire SIGNED_OUT — dalam kes itu profile=null dan semua
  // semakan hasX di atas akan false, menyebabkan modal terpapar seketika sebelum
  // ProtectedRoute redirect ke /login.
  if (!user || !profile) return null;

  if (isProfileComplete) return null;

  // ── Scenario flags ───────────────────────────────────────────────────────
  // Note: hasDept=true implies department is set, hasCohort=true implies
  // programme_code + intake_year + intake_period are all set.
  // Any user who has matric_no but no department/cohort falls through to
  // isMissingCoreFields so they never see an empty form.
  const isOnlyMissingPhone    = hasMatric && hasDept && !hasPhone && hasCohort;
  const isOnlyMissingCohort   = hasMatric && hasDept && hasPhone && !hasCohort;
  const isMissingPhoneAndCohort = hasMatric && hasDept && !hasPhone && !hasCohort;
  const isMissingCoreFields   = hasMatric && !hasDept;  // need dept + phone + everything
  const isFullRegistration    = !hasMatric;

  // Derived UI helpers
  const isFtv           = jabatan === 'ftv';
  const programmes      = jabatan ? JABATAN_PROGRAMMES[jabatan as JabatanValue] ?? [] : [];
  const computedSem     = intakeYear && intakePeriod
    ? computeSemDisplay(intakeYear as number, intakePeriod as 1 | 2, isFtv, sm1, sm2)
    : null;

  // ── Heading text ─────────────────────────────────────────────────────────
  const heading = isOnlyMissingPhone
    ? t('auth:update_phone_title', 'Kemaskini No. Telefon')
    : isOnlyMissingCohort || isMissingPhoneAndCohort
    ? t('auth:update_academic_title', 'Kemaskini Maklumat Pengajian')
    : isMissingCoreFields
    ? t('auth:complete_profile_title', 'Lengkapkan Profil')
    : t('auth:complete_profile_title', 'Lengkapkan Profil');

  const subheading = isOnlyMissingPhone
    ? t('auth:update_phone_subtitle', 'Sila masukkan nombor telefon untuk tujuan notifikasi penting.')
    : isOnlyMissingCohort
    ? t('auth:update_cohort_subtitle', 'Sistem kohort baharu memerlukan maklumat program pengajian anda. Sila lengkapkan.')
    : isMissingPhoneAndCohort
    ? t('auth:update_phone_cohort_subtitle', 'Sila lengkapkan nombor telefon dan maklumat program pengajian anda.')
    : isMissingCoreFields
    ? t('auth:complete_basic_info_subtitle', 'Sila lengkapkan maklumat asas untuk pendaftaran anda.')
    : t('auth:complete_connected_account_subtitle', 'Akaun anda telah disambungkan. Sila lengkapkan semua maklumat di bawah.');

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── A: Only missing phone ─────────────────────────────────────────────
    if (isOnlyMissingPhone) {
      if (!phone.trim()) { toast.error(t('auth:error_phone_required', 'Sila masukkan nombor telefon.')); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success(t('auth:phone_saved_success', 'Nombor telefon berjaya disimpan!'));
      } catch (err: any) {
        toast.error(err.message || t('auth:error_saving_phone', 'Ralat menyimpan nombor telefon.'));
      } finally { setLoading(false); }
      return;
    }

    // ── B: Only missing cohort ────────────────────────────────────────────
    if (isOnlyMissingCohort) {
      if (!jabatan) { toast.error(t('auth:error_department_required', 'Sila pilih jabatan.')); return; }
      if (!isFtv && !programmeCode) { toast.error(t('auth:error_program_required', 'Sila pilih program pengajian.')); return; }
      if (!intakeYear || !intakePeriod) { toast.error(t('auth:error_session_required', 'Sila pilih tahun dan sesi pengambilan.')); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({
          department:       jabatan,
          programme_code:   isFtv ? 'FTV' : programmeCode,
          intake_year:      intakeYear,
          intake_period:    intakePeriod,
          semester_override: showSemOverride && semOverride ? Number(semOverride) : null,
        }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success(t('auth:academic_info_saved_success', 'Maklumat pengajian berjaya disimpan!'));
      } catch (err: any) {
        toast.error(err.message || t('auth:error_saving_academic_info', 'Ralat menyimpan maklumat.'));
      } finally { setLoading(false); }
      return;
    }

    // ── C: Missing phone + cohort ─────────────────────────────────────────
    if (isMissingPhoneAndCohort) {
      if (!phone.trim()) { toast.error(t('auth:error_phone_required', 'Sila masukkan nombor telefon.')); return; }
      if (!jabatan) { toast.error(t('auth:error_department_required', 'Sila pilih jabatan.')); return; }
      if (!isFtv && !programmeCode) { toast.error(t('auth:error_program_required', 'Sila pilih program pengajian.')); return; }
      if (!intakeYear || !intakePeriod) { toast.error(t('auth:error_session_required', 'Sila pilih tahun dan sesi pengambilan.')); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({
          phone:            phone.trim(),
          department:       jabatan,
          programme_code:   isFtv ? 'FTV' : programmeCode,
          intake_year:      intakeYear,
          intake_period:    intakePeriod,
          semester_override: showSemOverride && semOverride ? Number(semOverride) : null,
        }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success(t('auth:profile_updated_success', 'Profil berjaya dikemaskini!'));
      } catch (err: any) {
        toast.error(err.message || t('auth:error_saving_profile', 'Ralat menyimpan profil.'));
      } finally { setLoading(false); }
      return;
    }

    // ── C2: Missing core fields (matric exists but no dept/phone/cohort) ──
    if (isMissingCoreFields) {
      if (!phone.trim()) { toast.error(t('auth:error_phone_required', 'Sila masukkan nombor telefon.')); return; }
      if (!jabatan) { toast.error(t('auth:error_department_required', 'Sila pilih jabatan.')); return; }
      if (!isFtv && !programmeCode) { toast.error(t('auth:error_program_required', 'Sila pilih program pengajian.')); return; }
      if (!intakeYear || !intakePeriod) { toast.error(t('auth:error_session_required', 'Sila pilih tahun dan sesi pengambilan.')); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({
          phone:            phone.trim(),
          department:       jabatan,
          programme_code:   isFtv ? 'FTV' : programmeCode,
          intake_year:      intakeYear,
          intake_period:    intakePeriod,
          semester_override: showSemOverride && semOverride ? Number(semOverride) : null,
        }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success(t('auth:profile_updated_success', 'Profil berjaya disimpan!'));
      } catch (err: any) {
        toast.error(err.message || t('auth:error_saving_profile', 'Ralat menyimpan profil.'));
      } finally { setLoading(false); }
      return;
    }

    // ── D: Full registration ──────────────────────────────────────────────
    if (registerMode !== 'staff') {
      if (!fullName.trim()) {
        toast.error(t('auth:error_fullname_ic_required', 'Sila masukkan nama penuh seperti dalam IC.'));
        return;
      }
      if (fullName.trim().length < 3) {
        toast.error(t('auth:error_fullname_too_short', 'Nama penuh terlalu pendek. Sila masukkan nama penuh seperti dalam IC.'));
        return;
      }
    }

    if (!matricNo.trim() || !phone.trim()) {
      toast.error(t('auth:fill_required_fields', 'Sila lengkapkan No Matrik dan No Telefon.')); return;
    }

    if (registerMode !== 'staff') {
      const matricValidation = parseAndValidateMatric(matricNo.trim(), t);
      if (!matricValidation.isValidFormat) {
        toast.error(matricValidation.errorMessage || t('auth:invalid_matric_format'));
        return;
      }
    }

    // ── Semakan duplikat matric_no ────────────────────────────────────────
    if (registerMode !== 'staff') {
      const { data: matricCheck, error: matricErr } = await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
      console.log('[CompleteProfile] matric check:', { matricCheck, matricErr });
      
      if (matricErr) {
        toast.error(t('auth:error_matric_verify', 'Tidak dapat mengesahkan no matrik. Sila cuba lagi.'));
        return;
      }
      
      if (matricCheck?.exists) {
        const hint = matricCheck.email_hint || '***';
        const count = matricCheck.account_count || 1;
        toast.error(
          `No matrik ${matricNo.trim()} sudah didaftarkan${count > 1 ? ` (${count} akaun!)` : ''}. ` +
          `Sila log masuk dengan emel asal anda (${hint}), atau tekan "Teruskan dengan Google". ` +
          `Jika anda terlupa kata laluan, gunakan "Lupa?" untuk tetapkan semula.`,
          { duration: 10000 }
        );
        return;
      }
    }

    if (registerMode === 'staff') {
      const { data: isValid } = await supabase.rpc('verify_staff_code', { p_code: passcode });
      if (!isValid) { toast.error(t('auth:invalid_staff_code')); return; }
      if (staffRole === 'CLUB_ADVISOR' && !leaderClubId) {
        toast.error(t('auth:select_club')); return;
      }
    } else {
      if (!jabatan) { toast.error(t('auth:select_department')); return; }
      if (!isFtv && !programmeCode) { toast.error(t('auth:error_program_required', 'Sila pilih program pengajian.')); return; }
      if (!intakeYear || !intakePeriod) { toast.error(t('auth:error_session_required', 'Sila pilih tahun dan sesi pengambilan.')); return; }
      if (registerMode === 'leader' && !leaderClubId) {
        toast.error(t('auth:select_club')); return;
      }
    }

    // Semakan kata laluan untuk pendaftaran baharu (Google SSO dual-auth)
    if (!password) {
      toast.error(t('auth:create_account_password', 'Sila cipta kata laluan akaun anda.'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('auth:password_min_length'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('auth:passwords_do_not_match'));
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) { toast.error(t('common:session_expired')); setLoading(false); return; }

      // 0. Tetapkan kata laluan dalam Supabase Auth supaya pelajar boleh log masuk manual guna No. Matrik
      const { error: pwdErr } = await supabase.auth.updateUser({ password: password.trim() });
      if (pwdErr) {
        console.error('[CompleteProfile] Gagal kemaskini kata laluan:', pwdErr);
        throw new Error('Gagal menetapkan kata laluan akaun: ' + pwdErr.message);
      }

      const isLeader  = registerMode === 'leader';
      const isStaff   = registerMode === 'staff';
      const isAdvisor = isStaff && staffRole === 'CLUB_ADVISOR';
      const academikClubId = isStaff ? null : getAkademikClubId(jabatan as JabatanValue, programmeCode);
      const roleToAssign   = isStaff ? staffRole : (isLeader ? leaderRole : 'CLUB_MEMBER');
      const initialStatus  = (isLeader || isAdvisor) ? 'PENDING' : 'APPROVED';
      // PENTING: Sentiasa gunakan nama yang dimasukkan pengguna. Tiada fallback ke Google untuk pelajar.
      const nameToSave     = isStaff
        ? (fullName.trim().toUpperCase() || profile?.full_name || '')
        : fullName.trim().toUpperCase();

      // 1. Update profile
      const { error: profileError } = await supabase.from('profiles').update({
        full_name:        nameToSave,
        matric_no:        matricNo.trim(),
        phone:            phone.trim(),
        club_id:          academikClubId,
        role:             roleToAssign,
        department:       isStaff ? null : jabatan,
        account_status:   initialStatus,
        ...(isStaff ? {} : {
          programme_code:   isFtv ? 'FTV' : programmeCode,
          intake_year:      intakeYear || null,
          intake_period:    intakePeriod || null,
          semester_override: showSemOverride && semOverride ? Number(semOverride) : null,
        }),
      }).eq('id', user.id);
      if (profileError) throw profileError;

      // 2. Academic club membership
      if (!isStaff && academikClubId) {
        const isLeadingAcademic = isLeader && leaderClubId === academikClubId;
        const { error: memberErr } = await supabase.from('student_club_memberships').insert({
          user_id: user.id,
          club_id: academikClubId,
          role: isLeadingAcademic ? leaderRole : 'CLUB_MEMBER',
          account_status: isLeadingAcademic ? 'PENDING' : initialStatus,
          is_primary: true,
        });
        // Abaikan duplicate key error (pengguna sudah ada keahlian)
        if (memberErr && !memberErr.message?.includes('duplicate')) {
          console.warn('[CompleteProfile] Club membership insert error:', memberErr.message);
        }
      }

      // 3. Target leadership/advisor club
      if ((isLeader && leaderClubId !== academikClubId) || isAdvisor) {
        const { error: leaderErr } = await supabase.from('student_club_memberships').insert({
          user_id: user.id,
          club_id: leaderClubId,
          role: roleToAssign,
          account_status: 'PENDING',
          is_primary: !academikClubId,
        });
        if (leaderErr && !leaderErr.message?.includes('duplicate')) {
          console.warn('[CompleteProfile] Leader membership insert error:', leaderErr.message);
        }
      }

      // 4. Notify admins for new leader/advisor
      if ((isLeader && leaderRole === 'CLUB_PRESIDENT') || isAdvisor) {
        const { data: admins } = await supabase.from('profiles').select('id')
          .in('role', ['SUPER_ADMIN_JPP', 'ADMIN', 'JPP']);
        if (admins?.length) {
          await insertNotifications(
            admins.map(a => ({
              user_id: a.id,
              title:   'Pendaftaran Pimpinan Baharu (Google OAuth)',
              message: 'Terdapat satu permohonan pendaftaran baru melalui akaun Google. Sila semak tab "Permohonan Baru".',
              type:    'SYSTEM',
              is_read: false,
            }))
          );
        }
      }

      // 5. Refetch profile — wrap dalam try-catch sendiri supaya kegagalan refetch
      //    tidak menyebabkan crash (Error Boundary). Reload tetap akan berlaku.
      try {
        await refetchProfile();
      } catch (refetchErr) {
        console.warn('[CompleteProfile] refetchProfile failed (akan reload):', refetchErr);
      }
      toast.success(isStaff ? t('auth:staff_profile_saved_success', 'Profil Staf Berjaya Disimpan!') : t('auth:student_profile_saved_success', 'Profil Pelajar Berjaya Disimpan!'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      console.error('[CompleteProfile] Submit error:', err);
      toast.error(
        (err.message || 'Ralat menyimpan profil.') +
        '\n\nJika masalah berterusan, sila hubungi Helpline JPP melalui WhatsApp.',
        { duration: 8000 }
      );
    } finally {
      setLoading(false);
    }
  };

  // ── JSX shared section: cohort fields ────────────────────────────────────
  const CohortFields = ({ required = true }: { required?: boolean }) => (
    <div className="space-y-4">
      {!isFullRegistration && matricParsed?.isValidFormat && matricParsed.knownProgramme && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1 shadow-sm"
        >
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>{t('auth:auto_program_verification', 'Pengesahan Program Automatik')}</span>
          </div>
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            {matricParsed.knownProgramme.jabatan.toUpperCase()} · Program {matricParsed.progCode} · Sesi Kemasukan {matricParsed.fullYear}
          </p>
        </motion.div>
      )}

      {/* Jabatan */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Jabatan
        </Label>
        <Select
          value={jabatan}
          onValueChange={v => {
            setJabatan(v as JabatanValue);
            setProgrammeCode('');
          }}
          required={required}
        >
          <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium">
            <SelectValue placeholder="Pilih jabatan..." />
          </SelectTrigger>
          <SelectContent className="z-[10000] rounded-2xl">
            {JABATAN_LIST.map(j => (
              <SelectItem key={j.value} value={j.value} className="py-3 font-medium">{j.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Program — hidden for FTV */}
      {jabatan && !isFtv && programmes.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Program Pengajian
          </Label>
          <Select value={programmeCode} onValueChange={setProgrammeCode} required={required}>
            <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium">
              <SelectValue placeholder="Pilih program..." />
            </SelectTrigger>
            <SelectContent className="z-[10000] rounded-2xl">
              {programmes.map(p => (
                <SelectItem key={p.code} value={p.code} className="py-3 font-medium">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {jabatan && isFtv && (
        <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 text-[11px] text-violet-700 dark:text-violet-400 font-medium">
          🎓 Asasi Teknologi Kejuruteraan — program pengajian akan ditetapkan secara automatik.
        </div>
      )}

      {/* Tahun + Sesi Pengambilan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Tahun Pengambilan
          </Label>
          <Select
            value={intakeYear ? String(intakeYear) : ''}
            onValueChange={v => setIntakeYear(Number(v) as number)}
            required={required}
          >
            <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium">
              <SelectValue placeholder="Tahun..." />
            </SelectTrigger>
            <SelectContent className="z-[10000] rounded-2xl">
              {INTAKE_YEARS().map(y => (
                <SelectItem key={y} value={String(y)} className="py-3 font-medium">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Sesi Pengambilan
          </Label>
          <div className="p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-1 h-12 border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIntakePeriod(1)}
              className={cn(
                'relative rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center leading-tight',
                intakePeriod === 1
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>Intake 1</span>
              <span className="text-[8px] font-medium opacity-70">{t('auth:mid_year', 'Pertengahan Tahun')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakePeriod(2)}
              className={cn(
                'relative rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center leading-tight',
                intakePeriod === 2
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>Intake 2</span>
              <span className="text-[8px] font-medium opacity-70">{t('auth:early_year', 'Awal Tahun')}</span>
            </button>
          </div>
        </div>
      </div>

      {yearMismatch && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>Tahun intake ({intakeYear}) berbeza daripada tahun pada No. Matrik ({matricParsed?.fullYear}).</span>
        </div>
      )}

      {/* Semester estimate + override */}
      {computedSem && (
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 space-y-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            📅 Anggaran: <span className="text-primary font-black">{computedSem.label}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowSemOverride(v => !v)}
            className="text-[10px] text-slate-400 hover:text-primary underline underline-offset-2 transition-colors font-bold flex items-center gap-1"
          >
            <ChevronDown className={cn('w-3 h-3 transition-transform', showSemOverride && 'rotate-180')} />
            Tidak tepat? Betulkan semester sebenar
          </button>
          {showSemOverride && (
            <Select
              value={semOverride ? String(semOverride) : ''}
              onValueChange={v => setSemOverride(Number(v))}
            >
              <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-slate-900 text-sm font-bold border-primary/30">
                <SelectValue placeholder="Pilih semester sebenar..." />
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl">
                {(isFtv ? [1, 2] : [1, 2, 3, 4, 5, 6]).map(s => (
                  <SelectItem key={s} value={String(s)} className="font-medium">Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-950/90"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden max-h-[90dvh] overflow-y-auto custom-scrollbar"
        >
          {/* Refined Institutional Header */}
          <div className="h-28 bg-slate-900 dark:bg-zinc-950 border-b border-white/10 relative overflow-hidden flex items-center px-6 gap-3.5 shrink-0">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)] pointer-events-none" />
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-2 shadow-sm backdrop-blur-md shrink-0">
                <img src="/jpp-logo.png" alt="POLISAS Emblem" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('auth:official_portal_polisas', 'Portal Rasmi POLISAS')}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{heading}</h2>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{subheading}</p>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── SCENARIO: Only missing phone ─────────────────────────── */}
              {isOnlyMissingPhone && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    No Telefon Bimbit
                  </Label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="tel" placeholder="0123456789" required
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-bold tracking-wide border-slate-200 dark:border-white/10"
                    />
                  </div>
                </div>
              )}

              {/* ── SCENARIO: Only missing cohort ──────────────────────────── */}
              {isOnlyMissingCohort && <CohortFields />}

              {/* ── SCENARIO: Missing phone + cohort ───────────────────────── */}
              {isMissingPhoneAndCohort && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      No Telefon Bimbit
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="tel" placeholder="0123456789" required
                        value={phone} onChange={e => setPhone(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-bold tracking-wide border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>
                  <CohortFields />
                </>
              )}

              {/* ── SCENARIO: Missing core fields ──────────────────────────── */}
              {isMissingCoreFields && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      No Telefon Bimbit
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="tel" placeholder="0123456789" required
                        value={phone} onChange={e => setPhone(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-bold tracking-wide border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>
                  <CohortFields />
                </>
              )}

              {/* ── SCENARIO: Full registration ─────────────────────────────── */}
              {isFullRegistration && (
                <>
                  {/* Role tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-white/5">
                    <button type="button" onClick={() => setRegisterMode(registerMode === 'leader' ? 'leader' : 'student')}
                      className={cn('flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                        (registerMode === 'student' || registerMode === 'leader') ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white border border-slate-200/50 dark:border-white/10' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white')}>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Pelajar
                    </button>
                    <button type="button" onClick={() => setRegisterMode('staff')}
                      className={cn('flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                        registerMode === 'staff' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400 border border-slate-200/50 dark:border-white/10' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400')}>
                      <Building2 className="w-3.5 h-3.5" /> Staf
                    </button>
                  </div>

                  {/* Full name (IC) */}
                  {registerMode !== 'staff' && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Nama Penuh (Seperti dalam IC)
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          placeholder="CONTOH: AHMAD FAIZ BIN ABDULLAH"
                          required value={fullName}
                          onChange={e => setFullName(e.target.value.toUpperCase())}
                          className="h-12 pl-11 rounded-xl bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/30 uppercase font-bold tracking-wide focus-visible:ring-amber-400/40"
                        />
                      </div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium px-1">
                        Sila pastikan nama anda tepat seperti dalam Kad Pengenalan untuk rekod rasmi.
                      </p>
                    </div>
                  )}

                  {/* Matric / Staff ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {registerMode === 'staff' ? 'No Pekerja / Staf ID' : 'No Matrik'}
                      </Label>
                      {registerMode !== 'staff' && matricParsed?.isValidFormat && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Format Sah
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder={registerMode === 'staff' ? 'S123456' : '02DTK25F1037'} required
                        value={matricNo} onChange={e => handleMatricChange(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 uppercase font-bold tracking-wide border-slate-200 dark:border-white/10"
                      />
                    </div>
                    {registerMode !== 'staff' && (
                      <div className="space-y-1 px-1">
                        <p className="text-[10px] text-slate-400 font-medium">
                          Tidak tahu no matrik anda? Rujuk SPMP anda!
                        </p>
                        {matricParsed && !matricParsed.isValidFormat && matricNo.length >= 4 && (
                          <p className="text-[10px] text-rose-500 font-medium">
                            {matricParsed.errorMessage}
                          </p>
                        )}
                        {matricParsed?.isValidFormat && !matricParsed.knownProgramme && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            ℹ️ Kod program &quot;{matricParsed.progCode}&quot; tidak dalam senarai semasa. Sila pilih Jabatan dan Program secara manual di bawah.
                          </p>
                        )}
                        {matricParsed?.isValidFormat && matricParsed.knownProgramme && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1 shadow-sm mt-2"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                              <span>{t('auth:auto_program_verification', 'Pengesahan Program Automatik')}</span>
                            </div>
                            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                              {matricParsed.knownProgramme.jabatan.toUpperCase()} · Program {matricParsed.progCode} · Sesi Kemasukan {matricParsed.fullYear}
                            </p>
                          </motion.div>
                        )}
                        {yearMismatch && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Tahun pengambilan yang dipilih ({intakeYear}) berbeza daripada tahun pada No. Matrik ({matricParsed?.fullYear}).
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      No Telefon Bimbit
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="tel" placeholder="0123456789" required
                        value={phone} onChange={e => setPhone(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-bold tracking-wide border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>

                  {/* Cipta Kata Laluan Akaun (Untuk Google SSO Dual-Auth) */}
                  <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t('auth:create_account_password_title', 'Cipta Kata Laluan Akaun')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Cipta kata laluan untuk membolehkan anda log masuk secara manual menggunakan No. Matrik pada masa hadapan (walaupun mendaftar dengan Google).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Kata Laluan Baharu (Min. 6 Aksara)
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Masukkan kata laluan"
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="h-12 pl-11 pr-11 rounded-xl bg-white dark:bg-slate-900 font-bold tracking-wide border-slate-200 dark:border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          aria-label={showPassword ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sahkan Kata Laluan
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Ulang kata laluan"
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="h-12 pl-11 pr-11 rounded-xl bg-white dark:bg-slate-900 font-bold tracking-wide border-slate-200 dark:border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          aria-label={showConfirmPassword ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[10px] text-rose-500 font-medium">Kata laluan tidak sepadan.</p>
                      )}
                    </div>
                  </div>

                  {/* Student-specific fields */}
                  {registerMode !== 'staff' && (
                    <>
                      {/* Student / Leader sub-tabs */}
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <button type="button" onClick={() => setRegisterMode('student')}
                          className={cn('flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                            registerMode === 'student' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white border border-slate-200/50 dark:border-white/10' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white')}>
                          <GraduationCap className="w-3.5 h-3.5" /> Pelajar Biasa
                        </button>
                        <button type="button" onClick={() => setRegisterMode('leader')}
                          className={cn('flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                            registerMode === 'leader' ? 'bg-white dark:bg-slate-900 shadow-sm text-amber-600 dark:text-amber-400 border border-slate-200/50 dark:border-white/10' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400')}>
                          <Crown className="w-3.5 h-3.5 text-amber-500" /> Pimpinan Kelab
                        </button>
                      </div>

                      {/* Cohort fields for students */}
                      <CohortFields />

                      {/* Leader-specific */}
                      {registerMode === 'leader' && (
                        <>
                          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-700 font-medium leading-relaxed">
                            👑 Permohonan jawatan kepimpinan tertakluk pada kelulusan Penasihat kelab.
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Peranan</Label>
                            <Select value={leaderRole} onValueChange={v => setLeaderRole(v as UserRole)}>
                              <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium"><SelectValue /></SelectTrigger>
                              <SelectContent className="z-[10000] rounded-2xl">
                                {LEADER_ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="py-3 font-medium">{ROLE_LABELS[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Kelab (Mohon Kepimpinan)</Label>
                            <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                              <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium"><SelectValue placeholder="Pilih kelab..." /></SelectTrigger>
                              <SelectContent className="z-[10000] rounded-2xl max-h-60">
                                {ALL_CLUBS.filter(c => c.category !== 'Badan Beruniform').map(c => (
                                  <SelectItem key={c.id} value={c.id} className="py-3 font-medium">{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Staff-specific */}
                  {registerMode === 'staff' && (
                    <>
                      <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-[11px] text-emerald-700 font-medium leading-relaxed">
                        🏢 Mod Pendaftaran Staf membolehkan anda menggunakan perkhidmatan warga institusi.
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase tracking-widest">Tujuan</Label>
                        <Select value={staffRole} onValueChange={v => setStaffRole(v as UserRole)}>
                          <SelectTrigger className="h-12 rounded-xl border-emerald-500/30 text-emerald-700"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[10000] rounded-2xl">
                            {STAFF_ROLES.map(r => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {staffRole === 'CLUB_ADVISOR' && (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Kelab Dinasihati</Label>
                          <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                            <SelectTrigger className="h-12 rounded-xl border-indigo-500/30"><SelectValue placeholder="Pilih kelab..." /></SelectTrigger>
                            <SelectContent className="z-[10000] rounded-2xl max-h-60">
                              {ALL_CLUBS.map(c => (
                                <SelectItem key={c.id} value={c.id} className="py-3 font-medium">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-rose-500">KOD PENGESAHAN STAF</Label>
                        <Input type="password" placeholder="Dapatkan dari Admin" required
                          value={passcode} onChange={e => setPasscode(e.target.value)}
                          className="h-12 rounded-xl bg-rose-500/5 border-rose-500/20 focus-visible:ring-rose-500/40 font-bold tracking-[0.2em] text-rose-700 text-center"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="space-y-3 pt-2">
                {showWarning && (
                  <motion.div 
                    initial={{ opacity: 0, }}
                    animate={{ opacity: 1, }}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed text-center flex flex-col items-center justify-center gap-1 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Pernah Isi?</span>
                    </div>
                    <span>Internet anda mungkin mengalami gangguan. Sila <strong>refresh/reopen</strong> website.</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-950/20 active:scale-[0.99] transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {!profile?.matric_no?.trim() ? 'Batal & Log Keluar' : 'Log Keluar'}
                </Button>
              </div>

              {/* Helpline */}
              <div className="text-center pt-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Ada masalah atau soalan?{' '}
                  <a
                    href="https://wa.me/601139413699"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-black hover:underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    Hubungi Helpline JPP
                  </a>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
