import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
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
  Crown,
  Link2,
  PhoneCall,
  Lightbulb,
  Smartphone,
  CheckCircle2,
  Send,
  ShieldCheck,
  GraduationCap,
  Users,
  X
} from 'lucide-react';
import { UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS, getAkademikClubId } from '@/types';
import { cn } from '@/lib/utils';
import { sanitizeRedirect } from '@/utils/sanitizeRedirect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Roles yang boleh self-register (Presiden dan MT perlu pilih kelab)
const LEADER_ROLES: UserRole[] = ['CLUB_PRESIDENT', 'CLUB_MT'];
const STAFF_ROLES: UserRole[] = ['STAFF', 'CLUB_ADVISOR'];

type RegisterMode = 'student' | 'leader' | 'staff';
type Step = 1 | 2;

export function LoginPage() {
  const { isLowPerf: isLowEnd } = useDevicePerformance();

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
  const [leaderRole, setLeaderRole] = useState<UserRole>('CLUB_PRESIDENT');
  const [staffRole, setStaffRole] = useState<UserRole>('STAFF');
  const [leaderClubId, setLeaderClubId] = useState('');
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('');

  const resetForm = () => {
    setStep(1);
    setRegisterMode('student');
    setJabatan('');
    setLeaderRole('CLUB_PRESIDENT');
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
    if (!data || data.length === 0) return { email: null, error: 'Tiada akaun dijumpai dengan maklumat ini.' };
    const result = data[0];
    if (result.match_type === 'matric_no_duplicate') {
      return { email: null, error: `Terdapat ${result.match_count} akaun dengan no matrik yang sama. Sila log masuk menggunakan emel anda, atau hubungi JPP untuk bantuan.` };
    }
    if (result.match_type === 'full_name_duplicate') {
      return { email: null, error: `Terdapat ${result.match_count} akaun dengan nama yang sama. Sila gunakan emel atau no matrik untuk log masuk.` };
    }
    if (result.match_type === 'not_found') {
      return { email: null, error: 'Tiada akaun dijumpai. Sila semak ejaan atau daftar akaun baru.' };
    }
    return { email: result.email, error: null };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        const resolved = await resolveIdentifier(email);
        if (resolved.error || !resolved.email) {
          toast.error(resolved.error || 'Emel tidak dapat dikenal pasti.');
          setIsLoading(false);
          return;
        }
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resolved.email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghantar emel reset.');
        setResetSent(true);
        toast.success('Pautan tetapan semula telah dihantar ke emel anda.');
      } else {
        const resolved = await resolveIdentifier(email);
        if (resolved.error || !resolved.email) {
          toast.error(resolved.error || 'Identiti tidak dapat dikenal pasti.');
          setIsLoading(false);
          return;
        }
        const resolvedEmail = resolved.email;
        const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            const { data: providers } = await supabase.rpc('get_auth_providers', { p_email: resolvedEmail });
            if (providers && providers.includes('google') && !providers.includes('email')) {
              toast.error('Akaun ini menggunakan Google. Sila tekan butang "Teruskan dengan Google" di atas untuk log masuk.', { duration: 6000 });
              setIsLoading(false);
              return;
            }
          }
          throw error;
        }
        toast.success('Log masuk berjaya. Selamat kembali.');
      }
    } catch (error: any) {
      const msg: Record<string, string> = {
        'Invalid login credentials': 'Emel/Nama/No Matrik atau kata laluan tidak sah.',
        'User already registered': 'Emel ini sudah berdaftar. Cuba log masuk.',
        'Password should be at least 6 characters': 'Kata laluan mesti sekurang-kurangnya 6 aksara.',
        'Email not confirmed': 'Sila sahkan emel anda dahulu.',
      };
      toast.error(msg[error.message] || error.message || 'Operasi gagal. Cuba lagi.');
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
      toast.error(error.message || 'Gagal menyambung ke Google.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password || !matricNo.trim() || !phone.trim()) {
      toast.error('Sila lengkapkan semua maklumat asas.');
      return;
    }

    if (registerMode !== 'staff' && !matricNo.trim().startsWith('02')) {
      toast.error('No. Matrik pelajar mestilah bermula dengan "02".');
      return;
    }

    if (registerMode !== 'staff' && email.trim().toLowerCase().endsWith('@student.polisas.edu.my')) {
      toast.error('Sila guna emel peribadi. Emel pelajar @student.polisas.edu.my tidak dapat menerima kotak pengesahan.');
      return;
    }

    if (registerMode === 'staff') {
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_staff_code', { p_code: passcode });
      if (rpcError || !isValid) {
        toast.error('Kod pengesahan staf tidak sah.');
        return;
      }
      if (staffRole === 'CLUB_ADVISOR' && !leaderClubId) {
        toast.error('Sila pilih kelab yang dinasihati.');
        return;
      }
    } else {
      if (!jabatan) {
        toast.error('Sila pilih jabatan anda.');
        return;
      }
      if (registerMode === 'leader' && !leaderClubId) {
        toast.error('Sila pilih kelab anda.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (registerMode !== 'staff') {
        const { data: matricCheck, error: matricErr } = await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
        if (matricErr) {
          toast.error('Tidak dapat mengesahkan no matrik. Sila cuba lagi.');
          setIsLoading(false);
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
          setIsLoading(false);
          return;
        }
      }

      const { data: emailExists, error: checkError } = await supabase.rpc('check_email_registered', { p_email: email.trim().toLowerCase() });
      if (!checkError && emailExists) {
        toast.error('Emel ini telah didaftarkan. Sila cuba Log Masuk, atau gunakan "Teruskan dengan Google" jika anda pernah menggunakannya sebelum ini.');
        setIsLoading(false);
        return;
      }

      const isLeader = registerMode === 'leader';
      const isStaff = registerMode === 'staff';
      const isAdvisor = isStaff && staffRole === 'CLUB_ADVISOR';
      const academikClubId = isStaff ? null : getAkademikClubId(jabatan as JabatanValue);
      const roleToAssign = isStaff ? staffRole : (isLeader ? leaderRole : 'CLUB_MEMBER');

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
            is_leader: isLeader,
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
        toast.success(isAdvisor ? 'Akaun staf didaftarkan. Permohonan Penasihat kelab sedang disemak.' : 'Akaun Staf berjaya didaftar dan aktif!');
        setIsSignUp(false);
        resetForm();
      } else {
        setRegisteredEmail(email.trim().toLowerCase());
        setVerificationSent(true);
        toast.success('Akaun berjaya didaftar! Sila semak emel anda.');
      }
    } catch (error: any) {
      localStorage.removeItem('is_new_register');
      const msg: Record<string, string> = {
        'User already registered': 'Emel ini sudah berdaftar. Cuba log masuk.',
        'Password should be at least 6 characters': 'Kata laluan mesti sekurang-kurangnya 6 aksara.',
      };
      toast.error(msg[error.message] || error.message || 'Pendaftaran gagal. Cuba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] relative overflow-hidden font-sans">
      {/* ── Left Editorial Brand Panel (Authentic POLISAS Structure) ─── */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between relative bg-[#2E3A2F] text-[#F8F6EE] p-12 overflow-hidden border-r border-[#D9C9B2]/20">
        {/* Ambient Organic Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6B7F5B]/15 rounded-full blur-[120px] -mr-[250px] -mt-[250px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-[#C96F4F]/15 rounded-full blur-[100px] -ml-[200px] -mb-[200px] pointer-events-none" />

        {/* Top Brand Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-[#D9C9B2]/30 p-2 flex items-center justify-center backdrop-blur-md shadow-md">
            <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white leading-none">
                JPP POLISAS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest text-[#D9C9B2] bg-white/10 border border-[#D9C9B2]/20 uppercase">
                PORTAL RASMI
              </span>
            </div>
            <span className="text-[11px] text-[#D9C9B2]/80 font-medium tracking-wide block mt-1">
              Politeknik Sultan Haji Ahmad Shah
            </span>
          </div>
        </div>

        {/* Central Editorial Narrative */}
        <div className="relative z-10 my-auto py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#D9C9B2]/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#D9C9B2]" />
              <span className="text-[10px] font-bold text-[#F8F6EE] uppercase tracking-[0.16em]">
                Sistem Pintar Bersepadu
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] text-white">
              Membentuk Kepimpinan Kampus Digital POLISAS.
            </h2>

            <p className="text-sm sm:text-base text-[#D9C9B2] font-normal leading-relaxed max-w-md">
              Sistem pengurusan bersepadu aktiviti kelab, rekod kebajikan, e-Akademik, dan pasaran usahawan siswa Politeknik Sultan Haji Ahmad Shah.
            </p>

            {/* Authentic POLISAS Institutional Metric List */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t border-[#D9C9B2]/20">
              <div>
                <p className="text-2xl font-black text-white font-mono">{realStats.clubCount}</p>
                <p className="text-[10px] text-[#D9C9B2] font-semibold mt-0.5">Kelab Berdaftar</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white font-mono">{realStats.unitCount}</p>
                <p className="text-[10px] text-[#D9C9B2] font-semibold mt-0.5">Unit Exco JPP</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#D9C9B2] font-mono">{realStats.deptCount}</p>
                <p className="text-[10px] text-[#D9C9B2] font-semibold mt-0.5">Jabatan Akademik</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Operational Status */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#D9C9B2]">
          <div className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6B7F5B] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9C9B2]">
              Sistem Beroperasi Penuh
            </span>
          </div>
          <span className="text-[10px] text-[#D9C9B2]/70 font-mono">Sesi 2026/2027</span>
        </div>
      </div>

      {/* ── Right Panel: Clean Frictionless SSO-First Interface ──────── */}
      <div className="lg:col-span-7 flex items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-y-auto min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[430px] relative z-10 my-auto"
        >
          {/* Mobile Top Brand Header */}
          <div className="flex lg:hidden flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#242E25] border border-[#D9C9B2] dark:border-[#3A4A3B] p-2 flex items-center justify-center shadow-xs mb-2.5">
              <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">
              JPP Digital Portal
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B7F5B]">
              Politeknik Sultan Haji Ahmad Shah
            </p>
          </div>

          {/* Form Header Card */}
          <div className="bg-white dark:bg-[#242E25] rounded-3xl p-6 sm:p-8 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_12px_40px_rgba(46,58,47,0.06)]">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE] flex items-center gap-2">
                {isSignUp && step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="mr-1 p-1 rounded-lg hover:bg-[#F8F6EE] dark:hover:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] transition-colors"
                    aria-label="Kembali ke langkah 1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {isForgotPassword
                  ? 'Tetapkan Semula'
                  : isSignUp
                  ? (step === 1 ? 'Daftar Akaun' : 'Maklumat Keahlian')
                  : 'Selamat Kembali'}
              </h2>
              <p className="text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] mt-1.5 font-medium leading-relaxed">
                {isForgotPassword
                  ? 'Masukkan emel anda untuk menerima pautan tetapan semula kata laluan.'
                  : isSignUp && step === 1
                  ? 'Gunakan Google untuk pendaftaran segera atau daftar manual.'
                  : isSignUp && step === 2
                  ? 'Pilih jabatan atau kelab untuk pendaftaran peranan.'
                  : 'Akses akaun portal kampus anda dengan satu sentuhan pantas.'}
              </p>

              {/* QR Redirect Notification Banner */}
              <AnimatePresence>
                {hasQrRedirect && !isSignUp && !isForgotPassword && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/30"
                  >
                    <Link2 className="w-4 h-4 text-[#6B7F5B] shrink-0" />
                    <p className="text-[11px] font-bold text-[#2E3A2F] dark:text-[#F8F6EE] leading-snug">
                      Log masuk untuk meneruskan ke destinasi dalam QR anda.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Multi-step bar for registration */}
              {isSignUp && (
                <div className="flex items-center gap-2 pt-4">
                  <div className={cn("w-10 h-1.5 rounded-full transition-colors", step >= 1 ? "bg-[#2E3A2F] dark:bg-[#6B7F5B]" : "bg-[#D9C9B2]/40")} />
                  <div className={cn("w-10 h-1.5 rounded-full transition-colors", step >= 2 ? "bg-[#2E3A2F] dark:bg-[#6B7F5B]" : "bg-[#D9C9B2]/40")} />
                </div>
              )}
            </div>

            {/* ── Sub-Screens: Verification Sent / Reset Sent ─────── */}
            {verificationSent ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-[#6B7F5B]/15 border border-[#6B7F5B]/30 rounded-2xl flex items-center justify-center mx-auto text-[#6B7F5B]">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-lg text-[#2E3A2F] dark:text-[#F8F6EE]">Sahkan Emel Anda</p>
                  <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed mt-1">
                    Akaun anda berjaya didaftarkan. Sila klik butang di bawah untuk menerima pautan pengesahan ke{' '}
                    <span className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{registeredEmail}</span>.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    disabled={resendLoading}
                    className="rounded-xl h-12 px-6 font-bold text-xs uppercase tracking-wider border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE]"
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
                          toast.success(data.message || 'Emel pengesahan berjaya dihantar! Sila semak peti masuk anda.');
                        } else {
                          toast.error(data.error || 'Gagal menghantar emel pengesahan.');
                        }
                      } catch {
                        toast.error('Gagal menghubungi pelayan. Sila cuba lagi.');
                      } finally {
                        setResendLoading(false);
                      }
                    }}
                  >
                    {resendLoading ? (
                      'Menghantar...'
                    ) : emailSentOnce ? (
                      <span className="inline-flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Hantar Semula</span>
                    ) : (
                      <span className="inline-flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Hantar Emel Pengesahan</span>
                    )}
                  </Button>
                  {emailSentOnce && (
                    <div className="inline-flex items-center justify-center gap-1.5 text-xs text-[#6B7F5B] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Emel telah dihantar. Semak peti masuk dan folder spam anda.</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    className="rounded-xl h-10 font-bold text-xs uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]"
                    onClick={() => { setVerificationSent(false); setIsSignUp(false); resetForm(); }}
                  >
                    Kembali ke Log Masuk
                  </Button>
                </div>
              </div>
            ) : resetSent ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-[#6B7F5B]/15 border border-[#6B7F5B]/30 rounded-2xl flex items-center justify-center mx-auto text-[#6B7F5B]">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-lg text-[#2E3A2F] dark:text-[#F8F6EE]">Semak Emel Anda</p>
                  <p className="text-xs text-[#556453] dark:text-[#A3B39F] leading-relaxed mt-1">
                    Pautan tetapan semula telah dihantar ke <span className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">{email}</span>.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl h-12 px-6 font-bold text-xs uppercase tracking-wider border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE]"
                  onClick={() => { setResetSent(false); setIsForgotPassword(false); }}
                >
                  Kembali ke Log Masuk
                </Button>
              </div>
            ) : isSignUp ? (
              /* ── Sign Up Flow (Google Priority with Collapsible Manual) ─ */
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!fullName.trim() || !email || !password || !matricNo.trim() || !phone.trim()) {
                        toast.error('Sila lengkapkan semua maklumat.');
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    {/* Toggle: Pelajar vs Staf */}
                    <div className="space-y-2 mb-4">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-[#556453] dark:text-[#A3B39F] flex justify-center">
                        Langkah 1: Pilih Jenis Akaun
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F6EE] dark:bg-[#151D16] rounded-xl border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                        <button
                          type="button"
                          onClick={() => { setRegisterMode(registerMode === 'leader' ? 'leader' : 'student'); setShowManualRegister(false); }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            (registerMode === 'student' || registerMode === 'leader')
                              ? "bg-white dark:bg-[#242E25] shadow-xs text-[#2E3A2F] dark:text-white"
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
                            "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            registerMode === 'staff'
                              ? "bg-white dark:bg-[#242E25] shadow-xs text-[#2E3A2F] dark:text-white"
                              : "text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F]"
                          )}
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#6B7F5B]" />
                          Staf
                        </button>
                      </div>
                    </div>

                    {registerMode !== 'staff' && (
                      <div className="space-y-4 mb-2">
                        {/* Google Register Hero Card */}
                        <div className="p-4 rounded-2xl border border-[#6B7F5B]/30 bg-[#6B7F5B]/8 space-y-3">
                          <div className="text-center space-y-1">
                            <p className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE]">
                              Pendaftaran Automatik Siswa (Disyorkan)
                            </p>
                            <p className="text-[11px] text-[#556453] dark:text-[#A3B39F] leading-relaxed">
                              Gunakan akaun peribadi <span className="font-bold text-[#2E3A2F] dark:text-white">@gmail.com</span> anda untuk pendaftaran 1-sentuhan tanpa menunggu pengesahan kod manual.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full h-12 rounded-xl border border-[#D9C9B2] bg-white hover:bg-slate-50 text-[#2E3A2F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                            </svg>
                            <span>Daftar bersama Google</span>
                          </button>
                        </div>

                        {/* Divider to manual registration */}
                        <div className="relative pt-1">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#D9C9B2]/60 dark:border-[#3A4A3B]"></div>
                          </div>
                          <div className="relative flex justify-center">
                            {traditionalRegistrationEnabled ? (
                              <button
                                type="button"
                                onClick={() => setShowManualRegister(!showManualRegister)}
                                className="bg-white dark:bg-[#242E25] px-3.5 py-1 rounded-full border border-[#D9C9B2]/70 dark:border-[#3A4A3B] text-[10px] uppercase font-bold tracking-wider text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>{showManualRegister ? 'TUTUP PENDAFTARAN MANUAL' : 'ATAU DAFTAR MANUAL'}</span>
                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", showManualRegister && "rotate-180")} />
                              </button>
                            ) : (
                              <span className="bg-white dark:bg-[#242E25] px-3 py-1 rounded-full border border-rose-300 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                                Pendaftaran Manual Ditutup Sementara. Sila Guna Google.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Registration Form Fields */}
                    <AnimatePresence>
                      {showManualRegister && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3.5 overflow-hidden pt-1"
                        >
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Nama Penuh</Label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                placeholder="CTH: MUHAMMAD BIN AHMAD ALI"
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value.toUpperCase())}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium uppercase text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">
                              {registerMode === 'staff' ? 'No. Pekerja (Staf ID)' : 'No. Matrik'}
                            </Label>
                            <div className="relative">
                              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                placeholder={registerMode === 'staff' ? "CTH: S123456" : "CTH: 02DKM1234"}
                                required
                                pattern={registerMode === 'staff' ? undefined : "^02.*"}
                                value={matricNo}
                                onChange={e => setMatricNo(e.target.value.toUpperCase())}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium uppercase text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Emel Peribadi</Label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                type="email"
                                placeholder="emel@gmail.com"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">No Telefon Bimbit</Label>
                            <div className="relative">
                              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                placeholder="CTH: 0123456789"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Kata Laluan</Label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-bold tracking-widest text-xs"
                              />
                            </div>
                          </div>

                          <Button
                            type="submit"
                            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-2"
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                    onSubmit={handleRegister}
                  >
                    {registerMode !== 'staff' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F6EE] dark:bg-[#151D16] rounded-xl border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                          <button
                            type="button"
                            onClick={() => setRegisterMode('student')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                              registerMode === 'student' ? "bg-white dark:bg-[#242E25] shadow-xs text-[#2E3A2F] dark:text-white" : "text-[#556453] dark:text-[#A3B39F]"
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" /> Pelajar Biasa
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterMode('leader')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                              registerMode === 'leader' ? "bg-white dark:bg-[#242E25] shadow-xs text-[#2E3A2F] dark:text-white" : "text-[#556453] dark:text-[#A3B39F]"
                            )}
                          >
                            <Crown className="w-3.5 h-3.5 text-[#C96F4F]" /> AJK / Presiden
                          </button>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">
                            <Building2 className="inline w-3.5 h-3.5 mr-1 text-[#6B7F5B]" />Jabatan Akademik Anda
                          </Label>
                          <Select value={jabatan} onValueChange={v => setJabatan(v as JabatanValue)} required>
                            <SelectTrigger className="h-11 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] text-xs">
                              <SelectValue placeholder="Pilih jabatan akademik anda..." />
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
                      {registerMode === 'student' && (
                        <div className="p-3 rounded-xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-[11px] text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                          <span className="font-bold">Info:</span> Anda akan didaftarkan ke Kelab Akademik secara rasmi. Selepas log masuk, layari modul kelab untuk menyertai persatuan sukan atau beruniform yang lain.
                        </div>
                      )}

                      {registerMode === 'leader' && (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-[#C96F4F]/10 border border-[#C96F4F]/25 text-[11px] text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                            <span className="font-bold">Perhatian:</span> Permohonan jawatan kepimpinan kelab tertakluk kepada kelulusan Penasihat kelab masing-masing.
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Jawatan</Label>
                            <Select value={leaderRole} onValueChange={v => setLeaderRole(v as UserRole)}>
                              <SelectTrigger className="h-11 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-[#D9C9B2]">
                                {LEADER_ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="text-xs py-2.5">
                                    {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Kelab (Diterajui)</Label>
                            <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                              <SelectTrigger className="h-11 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] text-xs">
                                <SelectValue placeholder="Pilih kelab untuk diterajui..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-[#D9C9B2] max-h-60">
                                {ALL_CLUBS.filter(c => !['Badan Beruniform', 'badan_beruniform'].includes(c.category)).map(c => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs py-2.5">
                                    <span className="font-bold">{c.name}</span>
                                    <span className="ml-2 text-[10px] text-[#556453] dark:text-[#A3B39F]">· {c.category}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {registerMode === 'staff' && (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-[11px] text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                            Mod Pendaftaran Staf membolehkan anda untuk menggunakan perkhidmatan institusi POLISAS.
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Tujuan Pendaftaran</Label>
                            <Select value={staffRole} onValueChange={v => setStaffRole(v as UserRole)}>
                              <SelectTrigger className="h-11 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] text-xs font-bold text-[#2E3A2F] dark:text-white">
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
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">Kelab Yang Dinasihati</Label>
                              <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                                <SelectTrigger className="h-11 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] text-xs">
                                  <SelectValue placeholder="Sila pilih kelab anda..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#D9C9B2] max-h-60">
                                  {ALL_CLUBS.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs py-2.5">
                                      <span className="font-bold">{c.name}</span>
                                      <span className="ml-2 text-[10px] text-[#556453] dark:text-[#A3B39F]">· {c.category}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1 pt-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-rose-600">KOD PENGESAHAN STAF</Label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                              <Input
                                type="password"
                                placeholder="Dapatkan dari Admin"
                                required
                                value={passcode}
                                onChange={e => setPasscode(e.target.value)}
                                className="h-11 pl-10 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-xs font-bold tracking-widest text-rose-700 dark:text-rose-300"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-2"
                    >
                      <span>{isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}</span>
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            ) : (
              /* ── Standard Login Form (SSO-First with Collapsible Manual) ── */
              <div className="space-y-4">
                {/* 1. Hero Action: Prominent Google SSO Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full h-14 rounded-2xl border border-[#D9C9B2] dark:border-[#3A4A3B] bg-white dark:bg-[#151D16] hover:bg-[#F8F6EE] dark:hover:bg-[#2E3A2F]/40 text-[#2E3A2F] dark:text-[#F8F6EE] font-black text-sm tracking-wide flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-md active:scale-[0.98] cursor-pointer group"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Teruskan dengan Google</span>
                  </button>
                  <p className="text-[10px] text-center text-[#556453] dark:text-[#A3B39F] font-medium">
                    Pilihan rasmi 1-sentuhan untuk seluruh warga kampus
                  </p>
                </div>

                {/* 2. Secondary Discrete Action: Collapsed Manual Login Toggle */}
                {!showManualLogin ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualLogin(true)}
                      className="w-full py-3 px-4 rounded-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] bg-[#F8F6EE]/60 dark:bg-[#151D16]/60 hover:bg-[#F8F6EE] dark:hover:bg-[#151D16] text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99]"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#6B7F5B]" />
                      <span>Log masuk menggunakan Emel / No Matrik</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                ) : (
                  /* 3. Smooth Expanded Manual Form (Only when clicked) */
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="pt-3 border-t border-[#D9C9B2]/60 dark:border-[#3A4A3B] space-y-3.5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">
                          Borang Log Masuk Manual
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowManualLogin(false)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C96F4F] hover:underline cursor-pointer"
                        >
                          <span>Tutup</span>
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">
                            {isForgotPassword ? 'Emel Pendaftaran' : 'Emel / Nama / No Matrik'}
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                            <Input
                              type="text"
                              placeholder="emel@gmail.com / NAMA PENUH / 02DKM1234"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] text-xs font-medium"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pl-1 pt-0.5 text-[10px] text-[#556453] dark:text-[#A3B39F]">
                            <Lightbulb className="w-3 h-3 text-[#6B7F5B] shrink-0" />
                            <span>Boleh guna emel, nama penuh, atau no matrik</span>
                          </div>
                        </div>

                        {!isForgotPassword && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]">
                                Kata Laluan
                              </Label>
                              <button
                                type="button"
                                onClick={() => setIsForgotPassword(true)}
                                className="text-[10px] font-bold uppercase tracking-wider text-[#C96F4F] hover:underline transition-colors cursor-pointer"
                              >
                                Lupa?
                              </button>
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/50" />
                              <Input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-11 pl-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] font-bold tracking-widest text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] text-[#F8F6EE] transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-1"
                        >
                          <span>{isLoading ? 'Memproses...' : isForgotPassword ? 'Hantar Pautan' : 'Log Masuk'}</span>
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>

                        {/* Dev Mode Bypass Button (Only in development) */}
                        {import.meta.env.DEV && !isForgotPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('use_mock_auth', 'true');
                              toast.success('Pintasan Developer diaktifkan!');
                              setTimeout(() => window.location.href = '/portal', 500);
                            }}
                            className="w-full h-9 rounded-xl border border-dashed border-[#6B7F5B]/50 bg-[#6B7F5B]/10 hover:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" />
                            <span>Pintas Log Masuk (Dev Mode)</span>
                          </button>
                        )}
                      </form>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          {/* Bottom Controls & Mode Switcher */}
          {!resetSent && !verificationSent && (
            <div className="mt-5 flex justify-center">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs font-bold uppercase tracking-wider text-[#C96F4F] hover:text-[#2E3A2F] transition-colors cursor-pointer"
                >
                  &larr; Kembali ke Log Masuk
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#556453] dark:text-[#A3B39F] font-medium">
                    {isSignUp ? 'Sudah ada akaun?' : 'Belum ada akaun?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setIsForgotPassword(false);
                      resetForm();
                    }}
                    className="font-bold text-[#C96F4F] hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    {isSignUp ? 'Log Masuk' : 'Daftar Sekarang'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Official JPP Help Contact */}
          <div className="mt-5 flex justify-center">
            <a
              href="https://wa.me/601139413699"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#242E25] border border-[#D9C9B2] dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE] transition-colors text-[10px] font-bold uppercase tracking-wider shadow-2xs"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#6B7F5B]" />
              <span>Hubungi JPP Sekiranya Ada Masalah</span>
            </a>
          </div>

          {/* Footer copyright */}
          <div className="mt-5 text-center">
            <p className="text-[10px] font-medium text-[#556453]/70 dark:text-[#A3B39F]/50">
              © 2026 JPP Digital Portal. Majlis Perwakilan Pelajar POLISAS.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;
