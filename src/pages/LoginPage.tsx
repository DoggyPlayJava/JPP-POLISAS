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
  X,
  ArrowLeft
} from 'lucide-react';
import { UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS, getAkademikClubId } from '@/types';
import { cn } from '@/lib/utils';
import { sanitizeRedirect } from '@/utils/sanitizeRedirect';

// Roles yang boleh self-register (Presiden dan MT perlu pilih kelab)
const LEADER_ROLES: UserRole[] = ['CLUB_PRESIDENT', 'CLUB_MT'];
const STAFF_ROLES: UserRole[] = ['STAFF', 'CLUB_ADVISOR'];

type RegisterMode = 'student' | 'leader' | 'staff';
type Step = 1 | 2;

export function LoginPage() {
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
              toast.error(
                'Akaun ini didaftarkan melalui Google dan belum mempunyai kata laluan manual. Sila log masuk dengan Google atau klik "Lupa?" untuk menetapkan kata laluan.',
                { duration: 8000 }
              );
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
    <div className="min-h-screen flex flex-col items-center justify-between p-6 sm:p-10 bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] font-sans antialiased selection:bg-[#6B7F5B]/20 relative overflow-x-hidden">
      {/* Ambient background glows (radial-gradient = cheap CSS paint, no backdrop filter) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[280px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(107,127,91,0.08)_0%,transparent_70%)]" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[220px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(201,111,79,0.06)_0%,transparent_70%)]" />

      {/* Top spacer for balanced optical centering */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2 opacity-80 relative z-10">
        <span className="text-[11px] font-bold tracking-widest uppercase text-[#556453] dark:text-[#A3B39F]">
          JPP POLISAS
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
        className="w-full max-w-sm my-auto py-8 flex flex-col"
      >
        {/* Free-Floating Emblem (No box, no borders, natural breathing air) */}
        <div className="mb-6 flex justify-center">
          <img
            src="/jpp-logo.png"
            alt="JPP Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-sm select-none"
          />
        </div>

        {/* Dynamic Headings */}
        <div className="text-left mb-8">
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight leading-[1.15] text-[#2E3A2F] dark:text-[#F8F6EE]">
            {isForgotPassword
              ? 'Tetapkan Semula Kata Laluan'
              : isSignUp
              ? (step === 1 ? 'Daftar Akaun Baharu' : 'Maklumat Keahlian')
              : 'Selamat Datang ke JPP POLISAS'}
          </h1>
          <p className="text-sm sm:text-[15px] text-[#556453] dark:text-[#A3B39F] font-normal leading-relaxed mt-2.5">
            {isForgotPassword
              ? 'Masukkan emel anda untuk menerima pautan tetapan semula kata laluan.'
              : isSignUp && step === 1
              ? 'Gunakan Google untuk pendaftaran segera atau daftar manual.'
              : isSignUp && step === 2
              ? 'Pilih jabatan atau kelab untuk pendaftaran peranan.'
              : 'Satu portal pintar bersepadu untuk aktiviti persatuan, kebajikan, dan mahasiswa POLISAS.'}
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
                  Log masuk untuk meneruskan ke destinasi QR anda.
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
                className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider text-[#556453] dark:text-[#A3B39F]"
                onClick={() => { setVerificationSent(false); setIsSignUp(false); resetForm(); }}
              >
                Kembali ke Log Masuk
              </Button>
            </div>
          </div>
        ) : resetSent ? (
          <div className="py-4 text-center space-y-4">
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
              className="rounded-2xl h-14 font-bold text-xs uppercase tracking-wider border-[#D9C9B2] text-[#2E3A2F] dark:text-[#F8F6EE] hover:bg-[#F8F6EE]"
              onClick={() => { setResetSent(false); setIsForgotPassword(false); }}
            >
              Kembali ke Log Masuk
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
                    toast.error('Sila lengkapkan semua maklumat.');
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
                      onClick={() => { setRegisterMode(registerMode === 'leader' ? 'leader' : 'student'); setShowManualRegister(false); }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        (registerMode === 'student' || registerMode === 'leader')
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
                      <span>Daftar bersama Google</span>
                    </button>

                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                      <span className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F] uppercase tracking-widest">atau</span>
                      <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                    </div>

                    {traditionalRegistrationEnabled && (
                      <button
                        type="button"
                        onClick={() => setShowManualRegister(!showManualRegister)}
                        className="w-full py-2.5 text-xs font-bold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{showManualRegister ? 'Tutup Pendaftaran Manual' : 'Isi Borang Manual'}</span>
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
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Nama Penuh</Label>
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
                          {registerMode === 'staff' ? 'No. Pekerja (Staf ID)' : 'No. Matrik'}
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
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Emel Peribadi</Label>
                        <Input
                          type="email"
                          placeholder="emel@gmail.com"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">No Telefon Bimbit</Label>
                        <Input
                          placeholder="CTH: 0123456789"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] font-medium text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Kata Laluan</Label>
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
                  <span>Kembali ke Langkah 1</span>
                </button>

                {registerMode !== 'staff' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F2EDE4]/80 dark:bg-[#1E271F] rounded-xl border border-[#D9C9B2]/60 dark:border-[#3A4A3B]">
                      <button
                        type="button"
                        onClick={() => setRegisterMode('student')}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          registerMode === 'student' ? "bg-white dark:bg-[#2E3A2F] shadow-xs text-[#2E3A2F] dark:text-white" : "text-[#556453] dark:text-[#A3B39F]"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" /> Pelajar Biasa
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterMode('leader')}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          registerMode === 'leader' ? "bg-white dark:bg-[#2E3A2F] shadow-xs text-[#2E3A2F] dark:text-white" : "text-[#556453] dark:text-[#A3B39F]"
                        )}
                      >
                        <Crown className="w-3.5 h-3.5 text-[#C96F4F]" /> AJK / Presiden
                      </button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">
                        Jabatan Akademik Anda
                      </Label>
                      <Select value={jabatan} onValueChange={v => setJabatan(v as JabatanValue)} required>
                        <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] dark:border-[#3A4A3B] text-xs">
                          <SelectValue placeholder="Pilih jabatan akademik..." />
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
                    <div className="p-3.5 rounded-2xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-xs text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                      <span className="font-bold">Info:</span> Anda akan didaftarkan ke Kelab Akademik secara rasmi. Selepas log masuk, layari modul kelab untuk menyertai persatuan sukan atau beruniform yang lain.
                    </div>
                  )}

                  {registerMode === 'leader' && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[#C96F4F]/10 border border-[#C96F4F]/25 text-xs text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                        <span className="font-bold">Perhatian:</span> Permohonan jawatan kepimpinan kelab tertakluk kepada kelulusan Penasihat kelab masing-masing.
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Jawatan</Label>
                        <Select value={leaderRole} onValueChange={v => setLeaderRole(v as UserRole)}>
                          <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] text-xs">
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
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Kelab (Diterajui)</Label>
                        <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                          <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] text-xs">
                            <SelectValue placeholder="Pilih kelab untuk diterajui..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[#D9C9B2] max-h-60">
                            {ALL_CLUBS.filter(c => !['Badan Beruniform', 'badan_beruniform'].includes(c.category)).map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-xs py-2.5">
                                <span className="font-bold">{c.name}</span>
                                <span className="ml-2 text-[10px] text-[#556453] dark:text-[#A3B39F]">&middot; {c.category}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {registerMode === 'staff' && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 text-xs text-[#2E3A2F] dark:text-[#F8F6EE] leading-relaxed">
                        Mod Pendaftaran Staf membolehkan anda untuk menggunakan perkhidmatan institusi POLISAS.
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Tujuan Pendaftaran</Label>
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
                          <Label className="text-[11px] font-bold text-[#556453] dark:text-[#A3B39F]">Kelab Yang Dinasihati</Label>
                          <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                            <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-[#242E25] border-[#D9C9B2] text-xs">
                              <SelectValue placeholder="Sila pilih kelab anda..." />
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
                        <Label className="text-[11px] font-bold text-rose-600">KOD PENGESAHAN STAF</Label>
                        <Input
                          type="password"
                          placeholder="Dapatkan dari Admin"
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
                  <span>{isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}</span>
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
                  <span>Teruskan dengan Google</span>
                </button>

                {/* 2. Microscopic Clean Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                  <span className="text-xs font-medium text-[#556453]/70 dark:text-[#A3B39F]/70">atau</span>
                  <div className="flex-1 h-[1px] bg-[#D9C9B2]/60 dark:bg-[#3A4A3B]"></div>
                </div>

                {/* 3. Secondary Hero: Solid Button for Manual Login */}
                <button
                  type="button"
                  onClick={() => setShowManualLogin(true)}
                  className="w-full h-14 rounded-2xl bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#58694B] text-[#F8F6EE] font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Mail className="w-4 h-4 opacity-90" />
                  <span>Log masuk menggunakan Emel / No Matrik</span>
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
                    <span>Kembali ke Pilihan Log Masuk</span>
                  </button>

                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
                        {isForgotPassword ? 'Emel Pendaftaran' : 'Emel / No Matrik / Nama'}
                      </Label>
                      <Input
                        type="text"
                        placeholder="02DKM1234 / emel@gmail.com"
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
                            Kata Laluan
                          </Label>
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-xs font-semibold text-[#C96F4F] hover:underline cursor-pointer"
                          >
                            Lupa?
                          </button>
                        </div>
                        <Input
                          type="password"
                          placeholder="Masukkan kata laluan anda"
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
                      {isLoading ? 'Memproses...' : isForgotPassword ? 'Hantar Pautan Tetapan Semula' : 'Log Masuk'}
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
                      toast.success('Pintasan Developer diaktifkan!');
                      setTimeout(() => window.location.href = '/portal', 500);
                    }}
                    className="w-full h-11 rounded-xl border border-dashed border-[#6B7F5B] bg-[#6B7F5B]/10 hover:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#6B7F5B]" />
                    <span>Pintas Log Masuk (Dev Mode)</span>
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Bottom Switcher: Clean Unboxed Links */}
        {!resetSent && !verificationSent && (
          <div className="mt-8 text-center text-sm font-medium text-[#556453] dark:text-[#A3B39F]">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-[#C96F4F] hover:underline cursor-pointer"
              >
                Kembali ke Log Masuk
              </button>
            ) : (
              <div>
                <span>{isSignUp ? 'Sudah mempunyai akaun? ' : 'Belum mempunyai akaun? '}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setIsForgotPassword(false);
                    resetForm();
                  }}
                  className="font-bold text-[#2E3A2F] dark:text-[#F8F6EE] underline underline-offset-4 hover:text-[#6B7F5B] cursor-pointer"
                >
                  {isSignUp ? 'Log masuk' : 'Daftar sekarang'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Support Help Link */}
        <div className="mt-5 text-center">
          <a
            href="https://wa.me/601139413699"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-white transition-colors"
          >
            <PhoneCall className="w-3 h-3 text-[#6B7F5B]" />
            <span>Hubungi JPP jika ada masalah</span>
          </a>
        </div>
      </motion.div>

      {/* Institutional Micro-Footer (Airy, dignified, calm) */}
      <footer className="w-full max-w-sm pb-2 pt-6 text-center border-t border-[#D9C9B2]/40 dark:border-[#3A4A3B]/40 space-y-1">
        <p className="text-[10px] font-bold text-[#2E3A2F]/80 dark:text-[#F8F6EE]/80 uppercase tracking-widest">
          Perpaduan Progresif Demi Mahasiswa
        </p>
        <p className="text-[10px] text-[#556453]/70 dark:text-[#A3B39F]/60">
          Jawatankuasa Perwakilan Pelajar &middot; Politeknik Sultan Haji Ahmad Shah
        </p>
        <p className="text-[9px] text-[#556453]/50 dark:text-[#A3B39F]/40 font-mono">
          {realStats.clubCount} Kelab &middot; {realStats.unitCount} Unit Exco JPP &middot; {realStats.deptCount} Jabatan Akademik
        </p>
      </footer>
    </div>
  );
}

export default LoginPage;
