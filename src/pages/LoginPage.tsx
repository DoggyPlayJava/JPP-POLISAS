import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import {
  Mail,
  Lock,
  ArrowRight,
  User,
  Hash,
  Building2,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Link2,
  PhoneCall,
  Lightbulb,
  Smartphone,
  CheckCircle2,
  Send,
  ShieldCheck,
  GraduationCap,
  Users,
  X,
  ArrowLeft
} from 'lucide-react';
import { UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS, getAkademikClubId } from '@/types';
import { cn } from '@/lib/utils';
import { sanitizeRedirect } from '@/utils/sanitizeRedirect';

const STAFF_ROLES: UserRole[] = ['STAFF', 'CLUB_ADVISOR'];

type RegisterMode = 'student' | 'staff';
type Step = 1 | 2;

function BrandPanel({ stats }: { stats: { clubCount: number; unitCount: number; deptCount: number } }) {
  const { t } = useTranslation(['auth', 'common']);
  const features = [
    t('auth:brand_panel_ft1', 'Kebajikan, KLK & MAKMP dalam satu aliran kerja'),
    t('auth:brand_panel_ft2', 'Keahlian kelab, unit exco dan merit mahasiswa'),
    t('auth:brand_panel_ft3', 'Statistik institusi masa nyata untuk semua jabatan'),
  ];
  const tiles = [
    { value: stats.clubCount, label: t('auth:brand_panel_stat_clubs', 'Kelab') },
    { value: stats.unitCount, label: t('auth:brand_panel_stat_units', 'Unit Exco') },
    { value: stats.deptCount, label: t('auth:brand_panel_stat_depts', 'Jabatan') },
  ];

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#2E3A2F] dark:bg-[#0F160F] px-14 py-12">
      {/* Ambient glows + hairline grid (cheap CSS paint, no filters) */}
      <div className="absolute -top-32 -left-24 w-[540px] h-[540px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(107,127,91,0.42)_0%,transparent_65%)]" />
      <div className="absolute -bottom-32 -right-20 w-[460px] h-[460px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(201,111,79,0.26)_0%,transparent_65%)]" />
      <div
        className="absolute inset-0 opacity-[0.055] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#F8F6EE 1px, transparent 1px), linear-gradient(90deg, #F8F6EE 1px, transparent 1px)',
          backgroundSize: '58px 58px',
        }}
      />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#6B7F5B]/40 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center gap-3.5"
      >
        <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-14 h-14 object-contain drop-shadow-lg select-none" />
        <div className="leading-tight">
          <p className="text-[15px] font-black tracking-tight text-[#F8F6EE]">JPP POLISAS</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A3B39F]">
            {t('auth:brand_panel_org', 'Politeknik Sultan Haji Ahmad Shah')}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6B7F5B]/40 bg-[#6B7F5B]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#C3D3BE]">
          <ShieldCheck className="w-3 h-3" />
          {t('auth:brand_panel_badge', 'Portal Rasmi Mahasiswa')}
        </span>
        <h2 className="mt-5 text-[38px] xl:text-[42px] font-black leading-[1.08] tracking-tight text-[#F8F6EE]">
          {t('auth:brand_panel_title', 'Satu portal untuk seluruh kehidupan kampus anda.')}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-[#A3B39F]">
          {t('auth:brand_panel_subtitle', 'Kebajikan, keahlian kelab, aktiviti exco dan statistik institusi — semuanya di satu tempat.')}
        </p>

        <ul className="mt-7 space-y-3">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] font-medium leading-relaxed text-[#E4EADF]">
              <CheckCircle2 className="mt-[1px] w-4 h-4 shrink-0 text-[#8FA87C]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 border-t border-[#F8F6EE]/10 pt-6"
      >
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((s, i) => (
            <div key={i} className="rounded-2xl border border-[#F8F6EE]/10 bg-[#F8F6EE]/[0.04] px-3.5 py-3">
              <p className="text-2xl font-black tracking-tight text-[#F8F6EE]">{s.value}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A3B39F]">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A3B39F]/80">
          {t('auth:motto', 'Perpaduan Progresif Demi Mahasiswa')}
        </p>
      </motion.div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [emailSentOnce, setEmailSentOnce] = useState(false);
  const [showManualRegister, setShowManualRegister] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [traditionalRegistrationEnabled, setTraditionalRegistrationEnabled] = useState(true);
  const [hasQrRedirect, setHasQrRedirect] = useState(false);

  // Real institutional stats (live from database + institutional structure)
  const [realStats, setRealStats] = useState({
    clubCount: 21,
    unitCount: 9,
    deptCount: 5,
  });

  // Register flow state
  const [step, setStep] = useState<Step>(1);
  const [registerMode, setRegisterMode] = useState<RegisterMode>('student');
  const [jabatan, setJabatan] = useState<JabatanValue | ''>('');
  const [staffRole, setStaffRole] = useState<UserRole>('STAFF');
  const [leaderClubId, setLeaderClubId] = useState('');
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('');

  const resetForm = () => {
    setStep(1);
    setRegisterMode('student');
    setJabatan('');
    setStaffRole('STAFF');
    setLeaderClubId('');
    setFullName('');
    setMatricNo('');
    setEmail('');
    setPassword('');
    setPhone('');
    setPasscode('');
    setShowManualRegister(false);
    setShowManualLogin(false);
    setVerificationSent(false);
    setRegisteredEmail('');
    setEmailSentOnce(false);
  };

  // Simpan redirect URL ke sessionStorage serta-merta bila login page dimuatkan.
  useEffect(() => {
    const rawRedirect = new URLSearchParams(window.location.search).get('redirect');
    const redirectTo = sanitizeRedirect(rawRedirect);
    if (redirectTo) {
      sessionStorage.setItem('post_login_redirect', redirectTo);
      setHasQrRedirect(true);
    }

    // Dapatkan tetapan pendaftaran tradisional
    supabase.from('system_settings').select('value').eq('key', 'traditional_registration_enabled').maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTraditionalRegistrationEnabled(data.value === 'true' || data.value === true);
        }
      });

    // Dapatkan bilangan kelab berdaftar sebenar secara langsung dari pangkalan data
    supabase.from('clubs').select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count && count > 0) {
          setRealStats(prev => ({ ...prev, clubCount: count }));
        }
      });
  }, []);

  // Resolve identifier (emel/nama/no matrik) -> emel sebenar
  const resolveIdentifier = async (identifier: string): Promise<{ email: string | null; error: string | null }> => {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return { email: trimmed.toLowerCase(), error: null };
    }
    const { data, error } = await supabase.rpc('resolve_login_identifier', { p_identifier: trimmed });
    if (error) return { email: null, error: error.message };
    if (!data || data.length === 0) return { email: null, error: t('auth:no_account_found') };
    const result = data[0];
    if (result.match_type === 'matric_no_duplicate') {
      return { email: null, error: t('auth:multiple_accounts_found') };
    }
    if (result.match_type === 'full_name_duplicate') {
      return { email: null, error: t('auth:multiple_accounts_found') };
    }
    if (result.match_type === 'not_found') {
      return { email: null, error: t('auth:no_account_found') };
    }
    return { email: result.email, error: null };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (!isForgotPassword && !password)) {
      toast.error(t('auth:fill_required_fields'));
      return;
    }
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        const resolved = await resolveIdentifier(email);
        if (resolved.error || !resolved.email) {
          toast.error(resolved.error || t('auth:login_failed'));
          setIsLoading(false);
          return;
        }
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch((API_BASE_URL || '') + '/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resolved.email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t('auth:password_reset_failed'));
        setResetSent(true);
        toast.success(t('auth:password_reset_sent'));
      } else {
        const resolved = await resolveIdentifier(email);
        if (resolved.error || !resolved.email) {
          toast.error(resolved.error || t('auth:login_failed'));
          setIsLoading(false);
          return;
        }
        const resolvedEmail = resolved.email;
        const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            const { data: providers } = await supabase.rpc('get_auth_providers', { p_email: resolvedEmail });
            if (providers && providers.includes('google') && !providers.includes('email')) {
              toast.error(
                t('auth:google_account_no_password'),
                { duration: 8000 }
              );
              setIsLoading(false);
              return;
            }
          }
          throw error;
        }
        toast.success(t('auth:login_success'));
      }
    } catch (error: any) {
      const msg: Record<string, string> = {
        'Invalid login credentials': t('auth:login_failed'),
        'User already registered': t('auth:user_already_registered'),
        'Password should be at least 6 characters': t('auth:password_min_length'),
        'Email not confirmed': t('auth:email_not_confirmed'),
      };
      toast.error(msg[error.message] || error.message || t('auth:login_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const currentRedirect = new URLSearchParams(window.location.search).get('redirect');
      const callbackUrl = currentRedirect
        ? `${window.location.origin}/login?redirect=${encodeURIComponent(currentRedirect)}`
        : `${window.location.origin}/login`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || t('auth:google_login_failed'));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password || !matricNo.trim() || !phone.trim()) {
      toast.error(t('auth:fill_all_basic_info'));
      return;
    }

    if (registerMode !== 'staff' && !matricNo.trim().startsWith('02')) {
      toast.error(t('auth:matric_starts_with_02'));
      return;
    }

    if (registerMode !== 'staff' && email.trim().toLowerCase().endsWith('@student.polisas.edu.my')) {
      toast.error(t('auth:student_personal_email_warning'));
      return;
    }

    if (registerMode === 'staff') {
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_staff_code', { p_code: passcode });
      if (rpcError || !isValid) {
        toast.error(t('auth:invalid_staff_code'));
        return;
      }
      if (staffRole === 'CLUB_ADVISOR' && !leaderClubId) {
        toast.error(t('auth:select_club'));
        return;
      }
    } else {
      if (!jabatan) {
        toast.error(t('auth:select_department'));
        return;
      }
    }

    setIsLoading(true);
    try {
      if (registerMode !== 'staff') {
        const { data: matricCheck, error: matricErr } = await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
        if (matricErr) {
          toast.error(t('auth:matric_verify_error', 'Tidak dapat mengesahkan no matrik. Sila cuba lagi.'));
          setIsLoading(false);
          return;
        }
        if (matricCheck?.exists) {
          const hint = matricCheck.email_hint || '***';
          const count = matricCheck.account_count || 1;
          const accountCount = count > 1 ? t('auth:matric_accounts_count', ' ({{count}} akaun!)', { count }) : '';
          toast.error(
            t(
              'auth:matric_already_registered_detailed',
              'No matrik {{matric}} sudah didaftarkan{{accountCount}}. Sila log masuk dengan emel asal anda ({{hint}}), atau tekan "Teruskan dengan Google". Jika anda terlupa kata laluan, gunakan "Lupa?" untuk tetapkan semula.',
              { matric: matricNo.trim(), accountCount, hint }
            ),
            { duration: 10000 }
          );
          setIsLoading(false);
          return;
        }
      }

      const { data: emailExists, error: checkError } = await supabase.rpc('check_email_registered', { p_email: email.trim().toLowerCase() });
      if (!checkError && emailExists) {
        toast.error(t('auth:email_already_registered_prompt', 'Emel ini telah didaftarkan. Sila cuba Log Masuk, atau gunakan "Teruskan dengan Google" jika anda pernah menggunakannya sebelum ini.'));
        setIsLoading(false);
        return;
      }

      const isStaff = registerMode === 'staff';
      const isAdvisor = isStaff && staffRole === 'CLUB_ADVISOR';
      const academikClubId = isStaff ? null : getAkademikClubId(jabatan as JabatanValue);
      const roleToAssign = isStaff ? staffRole : 'CLUB_MEMBER';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            matric_no: matricNo.trim(),
            club_id: academikClubId,
            role: roleToAssign,
            department: isStaff ? null : jabatan,
            phone: phone.trim(),
            is_advisor: isAdvisor,
            leader_club_id: leaderClubId,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        localStorage.setItem('is_new_register', 'true');
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      try {
        await fetch(`${API_BASE_URL}/api/send-signup-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
      } catch (verifyErr) {
        console.warn('[Register] Gagal hantar emel pengesahan via Resend:', verifyErr);
      }

      if (isStaff) {
        toast.success(isAdvisor ? t('auth:staff_advisor_registered_notice', 'Akaun staf didaftarkan. Permohonan Penasihat kelab sedang disemak.') : t('auth:staff_registered_active', 'Akaun Staf berjaya didaftar dan aktif!'));
        setIsSignUp(false);
        resetForm();
      } else {
        setRegisteredEmail(email.trim().toLowerCase());
        setVerificationSent(true);
        toast.success(t('auth:account_registered_check_email', 'Akaun berjaya didaftar! Sila semak emel anda.'));
      }
    } catch (error: any) {
      localStorage.removeItem('is_new_register');
      const msg: Record<string, string> = {
        'User already registered': t('auth:user_already_registered'),
        'Password should be at least 6 characters': t('auth:password_min_length'),
      };
      toast.error(msg[error.message] || error.message || t('common:action_failed', 'Pendaftaran gagal. Cuba lagi.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] font-sans antialiased selection:bg-[#6B7F5B]/20 relative overflow-x-hidden">
      {/* ── Mobile / tablet header: compact dark banner, form sheet floats over it ── */}
      <header className="lg:hidden relative overflow-hidden bg-[#2E3A2F] dark:bg-[#0F160F] px-6 pt-6 pb-16 sm:px-10">
        <div className="absolute -top-24 -left-16 w-[320px] h-[320px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(107,127,91,0.45)_0%,transparent_65%)]" />
        <div className="absolute -bottom-20 -right-10 w-[260px] h-[260px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(201,111,79,0.28)_0%,transparent_65%)]" />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#F8F6EE 1px, transparent 1px), linear-gradient(90deg, #F8F6EE 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <img src="/jpp-logo.png" alt="JPP Logo" className="w-11 h-11 object-contain drop-shadow-md select-none" />
            <div className="leading-tight">
              <p className="text-[14px] font-black tracking-tight text-[#F8F6EE]">JPP POLISAS</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A3B39F]">
                {t('auth:brand_panel_badge', 'Portal Rasmi Mahasiswa')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-medium text-[#A3B39F]/80">Sesi 2026/2027</span>
            <LanguageToggle />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-6 max-w-md text-[13px] font-medium leading-relaxed text-[#C3D3BE]"
        >
          {t('auth:brand_panel_subtitle', 'Kebajikan, keahlian kelab, aktiviti exco dan statistik institusi — semuanya di satu tempat.')}
        </motion.p>
      </header>

      <BrandPanel stats={realStats} />

      <div className="relative z-10 flex flex-1 lg:flex-none flex-col lg:h-screen lg:overflow-y-auto">
        {/* Form sheet: lifts over the dark header on mobile, plain column on desktop */}
        <div className="flex-1 flex flex-col items-center justify-between -mt-10 sm:-mt-12 lg:mt-0 rounded-t-[26px] bg-[#F8F6EE] dark:bg-[#151D16] shadow-[0_-10px_34px_rgba(21,29,22,0.16)] lg:rounded-none lg:shadow-none px-6 pt-9 pb-7 sm:px-10 sm:pt-10 lg:pt-10 lg:pb-6 lg:px-10">
          {/* Ambient background glows (radial-gradient = cheap CSS paint, no backdrop filter) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[280px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(107,127,91,0.08)_0%,transparent_70%)]" />
          <div className="absolute bottom-0 right-1/4 w-[350px] h-[220px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(201,111,79,0.06)_0%,transparent_70%)]" />

          {/* Desktop top bar (mobile keeps these inside the header) */}
          <div className="hidden lg:flex w-full max-w-[420px] items-center justify-between relative z-10">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#556453] dark:text-[#A3B39F]">
              {t('auth:login_title')}
            </span>
            <span className="text-[10px] font-medium text-[#556453]/80 dark:text-[#A3B39F]/80">
              Sesi 2026/2027
            </span>
          </div>

          {/* Main Content Column (Authentic Amy-Style Cleanliness) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm lg:max-w-[420px] my-auto py-4 lg:py-6 flex flex-col relative z-10"
          >
            {/* Free-Floating Emblem (desktop only — mobile shows it in the header) */}
            <div className="mb-6 hidden lg:block">
              <img
                src="/jpp-logo.png"
                alt="JPP Logo"
                className="w-14 h-14 object-contain filter drop-shadow-sm select-none"
              />
            </div>

        {/* Dynamic Headings */}
        <div className="text-left mb-6 lg:mb-7">
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight leading-[1.15] text-[#2E3A2F] dark:text-[#F8F6EE]">
            {isForgotPassword
              ? t('auth:reset_password', 'Tetapkan Semula Kata Laluan')
              : isSignUp
              ? (step === 1 ? t('auth:register_title', 'Daftar Akaun Baharu') : t('auth:membership_info', 'Maklumat Keahlian'))
              : t('auth:login_title')}
          </h1>
          <p className="text-sm sm:text-[15px] text-[#556453] dark:text-[#A3B39F] font-normal leading-relaxed mt-2.5">
            {isForgotPassword
              ? t('auth:reset_password_desc', 'Masukkan emel anda untuk menerima pautan tetapan semula kata laluan.')
              : isSignUp && step === 1
              ? t('auth:register_step1_desc', 'Gunakan Google untuk pendaftaran segera atau daftar manual.')
              : isSignUp && step === 2
              ? t('auth:register_step2_desc', 'Pilih jabatan atau kelab untuk pendaftaran peranan.')
              : t('auth:login_subtitle')}
          </p>

          {/* QR Redirect Notification Banner */}
          <AnimatePresence>
            {hasQrRedirect && !isSignUp && !isForgotPassword && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3.5 flex items-center gap-2 p-3 rounded-2xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25"
              >
                <Link2 className="w-4 h-4 text-[#6B7F5B] shrink-0" />
                <p className="text-xs font-semibold text-[#2E3A2F] dark:text-[#F8F6EE]">
                  {t('auth:qr_redirect_notice', 'Log masuk untuk meneruskan ke destinasi QR anda.')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sub-Screens: Verification Sent / Reset Sent ── */}
        {verificationSent ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 bg-[#6B7F5B]/15 border border-[#6B7F5B]/30 rounded-2xl flex items-center justify-center mx-auto text-[#6B7F5B]">
              <Mail className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-lg text-[#2E3A2F] dark:text-[#F8F6EE]">{t('auth:verify_your_email', 'Sahkan Emel Anda')}</p>
              <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed mt-1">
                {t('auth:check_email_verification')}{' '}
                <span className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{registeredEmail}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                variant="outline"
                disabled={resendLoading}
                className="rounded-2xl h-14 font-bold text-xs uppercase tracking-wider border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE]"
                onClick={async () => {
                  setResendLoading(true);
                  try {
                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
                    const resp = await fetch(`${API_BASE_URL}/api/resend-verification`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: registeredEmail }),
                    });
                    const data = await resp.json();
                    if (resp.ok) {
                      setEmailSentOnce(true);
                      toast.success(data.message || t('auth:check_email_verification'));
                    } else {
                      toast.error(data.error || t('common:action_failed', 'Gagal menghantar emel pengesahan.'));
                    }
                  } catch {
                    toast.error(t('common:network_error', 'Gagal menghubungi pelayan. Sila cuba lagi.'));
                  } finally {
                    setResendLoading(false);
                  }
                }}
              >
                {resendLoading ? (
                  t('auth:sending', 'Menghantar...')
                ) : emailSentOnce ? (
                  <span className="inline-flex items-center gap-2"><Send className="w-3.5 h-3.5" /> {t('auth:resend', 'Hantar Semula')}</span>
                ) : (
                  <span className="inline-flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {t('auth:send_verification_email', 'Hantar Emel Pengesahan')}</span>
                )}
              </Button>
              {emailSentOnce && (
                <div className="inline-flex items-center justify-center gap-1.5 text-xs text-[#6B7F5B] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('auth:email_sent_check_inbox', 'Emel telah dihantar. Semak peti masuk dan folder spam anda.')}</span>
                </div>
              )}
              <Button
                variant="ghost"
                className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]"
                onClick={() => { setVerificationSent(false); setIsSignUp(false); resetForm(); }}
              >
                {t('auth:back_to_login')}
              </Button>
            </div>
          </div>
        ) : resetSent ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 bg-[#6B7F5B]/15 border border-[#6B7F5B]/30 rounded-2xl flex items-center justify-center mx-auto text-[#6B7F5B]">
              <Mail className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-lg text-[#2E3A2F] dark:text-[#F8F6EE]">{t('auth:check_your_email', 'Semak Emel Anda')}</p>
              <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed mt-1">
                {t('auth:password_reset_sent')} (<span className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{email}</span>).
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl h-14 font-bold text-xs uppercase tracking-wider border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE]"
              onClick={() => { setResetSent(false); setIsForgotPassword(false); }}
            >
              {t('auth:back_to_login')}
            </Button>
          </div>
        ) : isSignUp ? (
          /* Sign Up Flow */
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!fullName.trim() || !email || !password || !matricNo.trim() || !phone.trim()) {
                    toast.error(t('auth:fill_all_basic_info', 'Sila lengkapkan semua maklumat.'));
                    return;
                  }
                  setStep(2);
                }}
              >
                {/* Toggle: Pelajar vs Staf */}
                <div className="space-y-2 mb-2">
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F2EDE4]/80 dark:bg-[#1E271F] rounded-2xl border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                    <button
                      type="button"
                      onClick={() => setRegisterMode('student')}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        registerMode === 'student'
                          ? "bg-white dark:bg-[#2E3A2F] shadow-xs text-[#2E3A2F] dark:text-white"
                          : "text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F]"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" />
                      Pelajar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRegisterMode('staff'); setShowManualRegister(true); }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        registerMode === 'staff'
                          ? "bg-white dark:bg-[#2E3A2F] shadow-xs text-[#2E3A2F] dark:text-white"
                          : "text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F]"
                      )}
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#6B7F5B]" />
                      Staf
                    </button>
                  </div>
                </div>

                {registerMode !== 'staff' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full h-14 rounded-2xl bg-white dark:bg-[#242E25] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                      </svg>
                      <span>{t('auth:register_with_google', 'Daftar bersama Google')}</span>
                    </button>

                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                      <span className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F] uppercase tracking-widest">{t('common:or', 'atau')}</span>
                      <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                    </div>

                    {traditionalRegistrationEnabled && (
                      <button
                        type="button"
                        onClick={() => setShowManualRegister(!showManualRegister)}
                        className="w-full py-2.5 text-xs font-bold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{showManualRegister ? t('auth:close_manual_register', 'Tutup Pendaftaran Manual') : t('auth:fill_manual_form', 'Isi Borang Manual')}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", showManualRegister && "rotate-180")} />
                      </button>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {showManualRegister && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3 pt-1"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('common:name', 'Nama Penuh')}</Label>
                        <Input
                          placeholder="CTH: MUHAMMAD BIN AHMAD ALI"
                          required
                          value={fullName}
                          onChange={e => setFullName(e.target.value.toUpperCase())}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium uppercase text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">
                          {registerMode === 'staff' ? t('auth:staff_id_label', 'No. Pekerja (Staf ID)') : t('auth:matric_no_label', 'No. Matrik')}
                        </Label>
                        <Input
                          placeholder={registerMode === 'staff' ? "CTH: S123456" : "CTH: 02DKM1234"}
                          required
                          pattern={registerMode === 'staff' ? undefined : "^02.*"}
                          value={matricNo}
                          onChange={e => setMatricNo(e.target.value.toUpperCase())}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium uppercase text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('auth:personal_email', 'Emel Peribadi')}</Label>
                        <Input
                          type="email"
                          placeholder={t('auth:email_placeholder_sample', 'emel@gmail.com')}
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('auth:phone', 'No Telefon Bimbit')}</Label>
                        <Input
                          placeholder="CTH: 0123456789"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('auth:password', 'Kata Laluan')}</Label>
                        <Input
                          type="password"
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-bold tracking-widest text-xs"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-2"
                      >
                        <span>Seterusnya</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            ) : (
              /* Step 2: Role and Department Selection */
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
                onSubmit={handleRegister}
              >
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] mb-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('auth:back_to_step_1', 'Kembali ke Langkah 1')}</span>
                </button>

                {registerMode !== 'staff' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">
                        {t('auth:your_academic_dept', 'Jabatan Akademik Anda')}
                      </Label>
                      <Select value={jabatan} onValueChange={v => setJabatan(v as JabatanValue)} required>
                        <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] text-xs">
                          <SelectValue placeholder={t('auth:select_academic_dept_placeholder', 'Pilih jabatan akademik...')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#D9C9B2] dark:border-[#3A4A3B] shadow-xl">
                          {JABATAN_LIST.map(j => (
                            <SelectItem key={j.value} value={j.value} className="text-xs py-2.5">
                              {j.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {registerMode !== 'staff' && (
                    <div className="p-3.5 rounded-2xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-xs text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                      <span className="font-bold">{t('common:info', 'Info')}:</span> {t('auth:academic_club_reg_info', 'Anda akan didaftarkan ke Kelab Akademik secara rasmi. Selepas log masuk, layari modul kelab untuk menyertai persatuan sukan atau beruniform yang lain.')}
                    </div>
                  )}

                  {registerMode === 'staff' && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-xs text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                        {t('auth:staff_reg_service_desc', 'Mod Pendaftaran Staf membolehkan anda untuk menggunakan perkhidmatan institusi POLISAS.')}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('auth:purpose_label', 'Tujuan Pendaftaran')}</Label>
                        <Select value={staffRole} onValueChange={v => setStaffRole(v as UserRole)}>
                          <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] text-xs font-bold text-[#2E3A2F] dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[#D9C9B2]">
                            {STAFF_ROLES.map(r => (
                              <SelectItem key={r} value={r} className="text-xs py-2.5">
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {staffRole === 'CLUB_ADVISOR' && (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">{t('auth:advised_club_label', 'Kelab Yang Dinasihati')}</Label>
                          <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                            <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] text-xs">
                              <SelectValue placeholder={t('auth:select_club_placeholder', 'Sila pilih kelab anda...')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[#D9C9B2] max-h-60">
                              {ALL_CLUBS.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs py-2.5">
                                  <span className="font-bold">{c.name}</span>
                                  <span className="ml-2 text-[10px] text-[#556453] dark:text-[#A3B39F]">&middot; {c.category}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1 pt-1">
                        <Label className="text-[11px] font-bold text-rose-600">{t('auth:staff_passcode_label', 'KOD PENGESAHAN STAF')}</Label>
                        <Input
                          type="password"
                          placeholder={t('auth:passcode_placeholder', 'Dapatkan dari Admin')}
                          required
                          value={passcode}
                          onChange={e => setPasscode(e.target.value)}
                          className="h-12 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-xs font-bold tracking-widest text-rose-700 dark:text-rose-300"
                        />
                      </div>
                    </div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-2"
                >
                  <span>{isLoading ? t('auth:registering', 'Mendaftar...') : t('auth:register_now', 'Daftar Sekarang')}</span>
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        ) : (
          /* Standard Login Flow (100% Amy App Layout Paradigm) */
          <div className="space-y-3">
            {!showManualLogin ? (
              /* Landing State: Google SSO Button + Subtle "or" + Continue with Email Button */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-3.5"
              >
                {/* 1. Primary Hero: Google SSO Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-14 rounded-2xl bg-white dark:bg-[#242E25] border border-[#D9C9B2]/80 dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] font-bold text-[15px] flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>{t('auth:sign_in_with_google', 'Teruskan dengan Google')}</span>
                </button>

                {/* 2. Microscopic Clean Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                  <span className="text-xs font-medium text-[#556453]/70 dark:text-[#A3B39F]/70">{t('common:or', 'atau')}</span>
                  <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                </div>

                {/* 3. Secondary Hero: Solid Button for Manual Login */}
                <button
                  type="button"
                  onClick={() => setShowManualLogin(true)}
                  className="w-full h-14 rounded-2xl bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#58694B] text-[#F8F6EE] font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Mail className="w-4 h-4 opacity-90" />
                  <span>{t('auth:login_with_email_matric', 'Log masuk menggunakan Emel / No Matrik')}</span>
                </button>
              </motion.div>
            ) : (
              /* Expanded Manual Login Form */
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => setShowManualLogin(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors cursor-pointer mb-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('auth:back_to_login_options', 'Kembali ke Pilihan Log Masuk')}</span>
                  </button>

                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
                        {isForgotPassword ? t('auth:email') : t('auth:matrix_no')}
                      </Label>
                      <Input
                        type="text"
                        placeholder={isForgotPassword ? t('auth:email_placeholder_sample', 'emel@gmail.com') : t('auth:matrix_no_placeholder')}
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-13 rounded-2xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] text-sm font-medium px-4 shadow-2xs"
                      />
                    </div>

                    {!isForgotPassword && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
                            {t('auth:password')}
                          </Label>
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-xs font-semibold text-[#C96F4F] hover:underline cursor-pointer"
                          >
                            {t('auth:forgot_password')}
                          </button>
                        </div>
                        <Input
                          type="password"
                          placeholder={t('auth:password_placeholder')}
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="h-13 rounded-2xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] text-sm font-bold tracking-widest px-4 shadow-2xs"
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] font-bold text-[15px] shadow-sm transition-all active:scale-[0.98] cursor-pointer mt-1"
                    >
                      {isLoading ? t('auth:logging_in') : isForgotPassword ? t('auth:reset_password') : t('auth:login_button')}
                    </Button>
                  </form>
                    </motion.div>
                  </AnimatePresence>
                )}

              {/* Dev Mode Bypass Button (Visible in development on localhost) */}
              {import.meta.env.DEV && !isForgotPassword && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('use_mock_auth', 'true');
                      toast.success(t('auth:dev_shortcut_activated', 'Pintasan Developer diaktifkan!'));
                      setTimeout(() => window.location.href = '/portal', 500);
                    }}
                    className="w-full h-11 rounded-xl border border-dashed border-[#6B7F5B] bg-[#6B7F5B]/10 hover:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" />
                    <span>{t('auth:bypass_login_dev', 'Pintas Log Masuk (Dev Mode)')}</span>
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Bottom Switcher: Clean Unboxed Links */}
        {!resetSent && !verificationSent && (
          <div className="mt-6 text-center text-sm font-medium text-[#556453] dark:text-[#A3B39F]">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-[#C96F4F] hover:underline cursor-pointer"
              >
                {t('auth:back_to_login')}
              </button>
            ) : (
              <div>
                <span>{isSignUp ? t('auth:already_have_account') + ' ' : t('auth:dont_have_account') + ' '}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setIsForgotPassword(false);
                    resetForm();
                  }}
                  className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE] underline underline-offset-4 hover:text-[#6B7F5B] cursor-pointer"
                >
                  {isSignUp ? t('auth:login_button') : t('auth:register_now')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Support Help Link */}
        <div className="mt-4 text-center">
          <a
            href="https://wa.me/601139413699"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-white transition-colors"
          >
            <PhoneCall className="w-3 h-3 text-[#6B7F5B]" />
            <span>{t('auth:contact_support', 'Hubungi JPP jika ada masalah')}</span>
          </a>
        </div>
      </motion.div>

          {/* Institutional Micro-Footer (Airy, dignified, calm) */}
          <footer className="w-full max-w-sm lg:max-w-[420px] pb-1 pt-6 text-center border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B]/40 space-y-1 relative z-10">
            <p className="text-[10px] font-bold text-[#2E3A2F]/80 dark:text-[#F8F6EE]/80 uppercase tracking-widest">
              {t('auth:motto', 'Perpaduan Progresif Demi Mahasiswa')}
            </p>
            <p className="text-[10px] text-[#556453]/70 dark:text-[#A3B39F]/60">
              {t('auth:footer_org_name', 'Jawatankuasa Perwakilan Pelajar · Politeknik Sultan Haji Ahmad Shah')}
            </p>
            <p className="text-[9px] text-[#556453]/50 dark:text-[#A3B39F]/40 font-mono">
              {t('auth:footer_stats', '{{clubCount}} Kelab · {{unitCount}} Unit Exco JPP · {{deptCount}} Jabatan Akademik', {
                clubCount: realStats.clubCount,
                unitCount: realStats.unitCount,
                deptCount: realStats.deptCount,
              })}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
