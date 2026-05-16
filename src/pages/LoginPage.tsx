import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, User, Hash, Building2, ChevronLeft, ChevronDown, Sparkles, Crown, Link2, PhoneCall } from 'lucide-react';
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
  const [traditionalRegistrationEnabled, setTraditionalRegistrationEnabled] = useState(true);
  const [hasQrRedirect, setHasQrRedirect] = useState(false);

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
    setStep(1); setRegisterMode('student'); setJabatan(''); setLeaderRole('CLUB_PRESIDENT');
    setStaffRole('STAFF'); setLeaderClubId(''); setFullName(''); setMatricNo(''); setEmail(''); setPassword('');
    setPhone(''); setPasscode(''); setShowManualRegister(false); setVerificationSent(false); setRegisteredEmail(''); setEmailSentOnce(false);
  };

  // Simpan redirect URL ke sessionStorage serta-merta bila login page dimuatkan.
  // Ini penting untuk elak race condition — kita perlu simpan SEBELUM signInWithPassword
  // dipanggil kerana Supabase notify onAuthStateChange sebelum Promise kita resolve semula.
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
  }, []);

  // Resolve identifier (emel/nama/no matrik) → emel sebenar
  const resolveIdentifier = async (identifier: string): Promise<{ email: string | null; error: string | null }> => {
    const trimmed = identifier.trim();
    // Jika ada '@', ia sudah emel — bypass RPC
    if (trimmed.includes('@')) {
      return { email: trimmed.toLowerCase(), error: null };
    }
    // Guna RPC untuk resolve nama/no matrik → emel
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
        // Resolve identifier dulu sebelum hantar reset
        const resolved = await resolveIdentifier(email);
        if (resolved.error || !resolved.email) {
          toast.error(resolved.error || 'Emel tidak dapat dikenal pasti.');
          setIsLoading(false);
          return;
        }
        // Guna endpoint Express kita sendiri — bypass SMTP sepenuhnya
        // Resend HTTP API digunakan di backend (tiada port SMTP diperlukan)
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
        // Resolve identifier → emel sebenar
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
              toast.error('Akaun ini menggunakan Google. Sila tekan butang "Teruskan dengan Google" di bawah untuk log masuk.', { duration: 6000 });
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
      // Bawa redirect param dari URL semasa (jika ada) ke URL callback
      // supaya selepas OAuth, PublicRoute dapat baca dari sessionStorage
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
      // ── Semakan 1: No matrik sudah didaftarkan? ──────────────────────
      if (registerMode !== 'staff') {
        const { data: matricCheck, error: matricErr } = await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
        if (!matricErr && matricCheck?.exists) {
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

      // ── Semakan 2: Emel sudah wujud? ────────────────────────────────
      // Periksa jika emel sudah wujud untuk mengelakkan isu "fake success" dari Supabase (terutamanya bagi kes login Google)
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

      // Hantar emel pengesahan melalui Resend (bypass GoTrue SMTP yang rosak)
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
        // Tunjuk skrin pengesahan emel dengan butang resend
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left Panel - Visual (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between relative bg-primary/5 p-12 overflow-hidden border-r border-border/50">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -mr-[400px] -mt-[400px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] -ml-[300px] -mb-[300px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center shadow-xl glow-accent overflow-hidden">
            <img src="/jpp-app-icon.png" alt="JPP Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground">JPP POLISAS</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Digital Portal</p>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-black text-primary uppercase tracking-widest">Sistem Pintar Bersepadu</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter leading-[1.1] mb-6">
              Membentuk<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Kepimpinan<br />Masa Hadapan
              </span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-md leading-relaxed">
              Platform rasmi untuk pengurusan pelajar, aktiviti kelab, e-Kebajikan dan pembangunan usahawan muda POLISAS.
            </p>
            <div className="mt-12 flex gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-16 h-2 rounded-full bg-gradient-to-r from-primary/20 to-transparent" />
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sistem Beroperasi Penuh</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Subtle background for mobile where left panel is hidden */}
        <div className="absolute inset-0 bg-background lg:hidden" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -mr-60 -mt-60 pointer-events-none lg:hidden" />
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none lg:hidden"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Logo (Only visible on small screens) */}
          <div className="flex lg:hidden flex-col items-center mb-10 space-y-3">
            <div className="w-20 h-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl glow-accent overflow-hidden">
              <img src="/jpp-app-icon.png" alt="JPP Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tighter text-foreground">JPP Digital Portal</h1>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent mt-0.5">JPP Polisas</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
              {isSignUp && step === 2 && (
                <button onClick={() => setStep(1)} className="mr-1 p-1 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {isForgotPassword ? 'Tetapkan Semula'
                : isSignUp ? (step === 1 ? 'Daftar Akaun' : 'Maklumat Keahlian')
                  : 'Selamat Kembali'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {isForgotPassword
                ? 'Masukkan emel anda untuk menerima pautan tetapan semula.'
                : isSignUp && step === 1
                  ? 'Lengkapkan maklumat asas anda.'
                  : isSignUp && step === 2
                    ? 'Pilih jabatan atau peranan anda dalam kelab.'
                    : 'Log masuk ke akaun anda untuk meneruskan.'}
            </p>
            {/* Banner QR redirect — tunjuk bila user tiba dari QR link */}
            <AnimatePresence>
              {hasQrRedirect && !isSignUp && !isForgotPassword && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20"
                >
                  <Link2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[11px] font-bold text-primary leading-snug">
                    Log masuk untuk meneruskan ke destinasi dalam QR anda.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {isSignUp && (
              <div className="flex items-center gap-2 pt-4">
                <div className={cn("w-10 h-1.5 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
                <div className={cn("w-10 h-1.5 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {verificationSent ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-bold text-foreground text-lg">Sahkan Emel Anda ✅</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Akaun anda berjaya didaftarkan! Sila klik butang di bawah untuk menerima pautan pengesahan ke <span className="font-bold text-primary">{registeredEmail}</span>.
                </p>
                <div className="flex flex-col gap-3 pt-4">
                  <Button variant="outline" disabled={resendLoading}
                    className="rounded-xl h-12 px-8 font-bold text-xs uppercase tracking-widest"
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
                    }}>
                    {resendLoading ? 'Menghantar...' : emailSentOnce ? '📬 Hantar Semula' : '✉️ Hantar Emel Pengesahan'}
                  </Button>
                  {emailSentOnce && (
                    <p className="text-xs text-emerald-500 font-medium">✅ Emel telah dihantar! Semak peti masuk & folder spam anda.</p>
                  )}
                  <Button variant="ghost"
                    className="rounded-xl h-10 font-bold text-xs uppercase tracking-widest text-muted-foreground"
                    onClick={() => { setVerificationSent(false); setIsSignUp(false); resetForm(); }}>
                    Kembali ke Log Masuk
                  </Button>
                </div>
              </div>
            ) : resetSent ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-bold text-foreground">Semak emel anda!</p>
                <p className="text-sm text-muted-foreground">
                  Pautan tetapan semula telah dihantar ke <span className="font-bold text-primary">{email}</span>.
                </p>
                <Button variant="outline" className="mt-4 rounded-xl h-12 px-8 font-bold text-xs uppercase tracking-widest"
                  onClick={() => { setResetSent(false); setIsForgotPassword(false); }}>
                  Kembali ke Log Masuk
                </Button>
              </div>
            ) : isSignUp ? (
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} className="space-y-4"
                    onSubmit={(e) => { e.preventDefault(); if (!fullName.trim() || !email || !password || !matricNo.trim() || !phone.trim()) { toast.error('Sila lengkapkan semua maklumat.'); return; } setStep(2); }}>

                    {/* Toggle: Pelajar atau Staf */}
                    <div className="space-y-2.5 mb-6">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex justify-center">
                        Langkah 1: Pilih Jenis Akaun
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl">
                        <button type="button" onClick={() => { setRegisterMode(registerMode === 'leader' ? 'leader' : 'student'); setShowManualRegister(false); }}
                          className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            (registerMode === 'student' || registerMode === 'leader') ? "bg-card shadow-md text-foreground ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground")}>
                          <Sparkles className={cn("w-3.5 h-3.5 transition-colors", (registerMode === 'student' || registerMode === 'leader') ? "text-primary" : "")} />
                          Pelajar
                        </button>
                        <button type="button" onClick={() => { setRegisterMode('staff'); setShowManualRegister(true); }}
                          className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            registerMode === 'staff' ? "bg-card shadow-md text-emerald-600 ring-1 ring-emerald-500/20" : "text-muted-foreground hover:text-emerald-600")}>
                          <Building2 className="w-3.5 h-3.5" />
                          Staf
                        </button>
                      </div>
                    </div>

                    {registerMode !== 'staff' && (
                      <div className="space-y-5 mb-2">
                        {/* Google Register Button with Explanation */}
                        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3.5 relative overflow-hidden">
                          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="text-center space-y-1 relative z-10">
                            <p className="text-[12px] font-bold text-foreground">Pengesahan Automatik Siswa</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed px-2">
                              Gunakan e-mel peribadi <span className="font-semibold text-foreground">@gmail.com</span> anda untuk pendaftaran pantas. Klik butang Daftar Bersama Google dibawah!
                            </p>
                          </div>
                          <Button type="button" onClick={handleGoogleLogin}
                            className="w-full h-12 rounded-xl border border-border/60 bg-white hover:bg-gray-50 text-black font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-sm relative z-10 active:scale-[0.98]">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                            Daftar bersama Google
                          </Button>
                        </div>

                        <div className="relative pt-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/60"></div>
                          </div>
                          <div className="relative flex justify-center">
                            {traditionalRegistrationEnabled ? (
                              <button type="button" onClick={() => setShowManualRegister(!showManualRegister)}
                                className="bg-card/80 backdrop-blur-2xl px-4 py-1.5 rounded-full border border-border/60 text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                                ATAU DAFTAR MANUAL
                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", showManualRegister && "rotate-180")} />
                              </button>
                            ) : (
                              <span className="bg-card/80 backdrop-blur-2xl px-4 py-1.5 rounded-full border border-rose-500/20 text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                Pendaftaran Manual Ditutup Sementara. Sila Klik "Daftar Bersama Google".
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {showManualRegister && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden pt-2"
                        >

                          {/* Nama Penuh */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Nama Penuh</Label>
                            <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                              <Input placeholder="CTH: MUHAMMAD BIN AHMAD ALI" required value={fullName}
                                onChange={e => setFullName(e.target.value.toUpperCase())}
                                className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium uppercase" />
                            </div>
                          </div>

                          {/* No. Matrik / No Pekerja */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
                              {registerMode === 'staff' ? 'No. Pekerja (Staf ID)' : 'No. Matrik'}
                            </Label>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                              <Input
                                placeholder={registerMode === 'staff' ? "CTH: S123456" : "CTH: 02DKM1234"}
                                required
                                pattern={registerMode === 'staff' ? undefined : "^02.*"}
                                value={matricNo}
                                onChange={e => setMatricNo(e.target.value.toUpperCase())}
                                className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium uppercase"
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Emel</Label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                              <Input type="email" placeholder="emel@gmail.com" required value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium" />
                            </div>
                          </div>

                          {/* No Telefon */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">No Telefon Bimbit</Label>
                            <div className="relative group">
                              <Input placeholder="CTH: 0123456789" required value={phone} onChange={e => setPhone(e.target.value)}
                                className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium" />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-accent transition-colors">📱</span>
                            </div>
                          </div>

                          {/* Password */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Kata Laluan</Label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-bold tracking-[0.3em]" />
                            </div>
                          </div>

                          <Button type="submit" className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/20 mt-2 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/15 to-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <span className="relative z-10">Seterusnya</span>
                            <ArrowRight className="ml-2 h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.form>
                ) : (
                  <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} className="space-y-5" onSubmit={handleRegister}>

                    {registerMode !== 'staff' && (
                      <div className="space-y-3">
                        {/* Toggle: Pelajar Biasa atau Pemimpin Kelab */}
                        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl mb-2">
                          <button type="button" onClick={() => setRegisterMode('student')}
                            className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              registerMode === 'student' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            <Sparkles className="w-3.5 h-3.5" /> Pelajar Biasa
                          </button>
                          <button type="button" onClick={() => setRegisterMode('leader')}
                            className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              registerMode === 'leader' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            <Crown className="w-3.5 h-3.5" /> AJK / Presiden
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
                            <Building2 className="inline w-3.5 h-3.5 mr-1" />Jabatan Akademik Anda
                          </Label>
                          <Select value={jabatan} onValueChange={v => setJabatan(v as JabatanValue)} required>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/40 border-border/60 focus:ring-accent/40 font-medium">
                              <SelectValue placeholder="Pilih jabatan akademik anda..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/60 shadow-2xl">
                              {JABATAN_LIST.map(j => (
                                <SelectItem key={j.value} value={j.value} className="rounded-lg font-medium py-3">
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
                        <motion.div key="student" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                          <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-[11px] text-blue-600 font-medium leading-relaxed">
                            💡 Anda akan <strong>auto-diasingkan</strong> ke Kelab Akademik secara rasmi. Selepas log masuk, layari <strong>"Sertai Kelab"</strong> untuk menyertai kelab sukan/beruniform yang lain.
                          </div>
                        </motion.div>
                      )}

                      {registerMode === 'leader' && (
                        <motion.div key="leader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-700 font-medium leading-relaxed">
                            👑 Anda akan dimasukkan ke Kelab Akademik anda dahulu. Permohonan jawatan AJK/Presiden bagi kelab yang dipilih di bawah tertakluk pada kelulusan Penasihat kelab.
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Peranan</Label>
                            <Select value={leaderRole} onValueChange={v => setLeaderRole(v as UserRole)}>
                              <SelectTrigger className="h-12 rounded-xl bg-muted/40 border-border/60 font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-border/60 shadow-2xl">
                                {LEADER_ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="rounded-lg font-medium py-3">
                                    {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Kelab (Mohon Kepimpinan)</Label>
                            <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                              <SelectTrigger className="h-12 rounded-xl bg-muted/40 border-border/60 font-medium">
                                <SelectValue placeholder="Pilih kelab untuk diterajui..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-border/60 shadow-2xl max-h-60">
                                {ALL_CLUBS.filter(c => !['Badan Beruniform', 'badan_beruniform'].includes(c.category)).map(c => (
                                  <SelectItem key={c.id} value={c.id} className="rounded-lg font-medium py-3">
                                    <span className="font-bold">{c.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">— {c.category}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      )}

                      {registerMode === 'staff' && (
                        <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                          <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-[11px] text-emerald-700 font-medium leading-relaxed">
                            🏢 Mod Pendaftaran Staf membolehkan anda untuk menggunakan perkhidmatan warga institusi.
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Tujuan Pendaftaran</Label>
                            <Select value={staffRole} onValueChange={v => setStaffRole(v as UserRole)}>
                              <SelectTrigger className="h-12 rounded-xl bg-emerald-500/5 border-emerald-500/30 focus:ring-emerald-500/40 font-bold text-emerald-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-border/60 shadow-2xl">
                                {STAFF_ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="rounded-lg font-medium py-3 text-sm">
                                    {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {staffRole === 'CLUB_ADVISOR' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5 mt-2">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Kelab Yang Dinasihati</Label>
                              <Select value={leaderClubId} onValueChange={setLeaderClubId} required>
                                <SelectTrigger className="h-12 rounded-xl bg-indigo-500/5 border-indigo-500/30 font-medium focus:ring-indigo-500/40">
                                  <SelectValue placeholder="Sila pilih kelab anda..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/60 shadow-2xl max-h-60">
                                  {ALL_CLUBS.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="rounded-lg font-medium py-3">
                                      <span className="font-bold">{c.name}</span>
                                      <span className="ml-2 text-xs text-muted-foreground">— {c.category}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </motion.div>
                          )}

                          <div className="space-y-1.5 pt-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-rose-500">KOD PENGESAHAN STAF</Label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500/40 group-focus-within:text-rose-500 transition-colors" />
                              <Input type="password" placeholder="Dapatkan dari Admin" required value={passcode} onChange={e => setPasscode(e.target.value)}
                                className="h-12 pl-11 rounded-xl bg-rose-500/5 border-rose-500/20 focus-visible:ring-rose-500/40 font-bold tracking-[0.2em] text-rose-700" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button type="submit" disabled={isLoading}
                      className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/20 group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/15 to-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative z-10">{isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}</span>
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {isForgotPassword ? 'Emel / Nama / No Matrik' : 'Emel / Nama / No Matrik'}
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                    <Input type="text" placeholder="emel@gmail.com / NAMA PENUH / 02DKM1234" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 pl-1">
                    💡 Boleh guna emel, nama penuh, atau no matrik untuk log masuk
                  </p>
                </div>
                {!isForgotPassword && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Kata Laluan</Label>
                      <button type="button" onClick={() => setIsForgotPassword(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors">
                        Lupa?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                      <Input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-bold tracking-[0.3em]" />
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={isLoading}
                  className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95 glow-accent group relative overflow-hidden mt-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/15 to-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative z-10">{isLoading ? 'Memproses...' : isForgotPassword ? 'Hantar Pautan' : 'Log Masuk'}</span>
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />}
                </Button>

                {!isForgotPassword && (
                  <div className="pt-2 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/60"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                        <span className="bg-card/80 backdrop-blur-2xl px-2 text-muted-foreground/60">ATAU</span>
                      </div>
                    </div>

                    <Button type="button" onClick={handleGoogleLogin}
                      className="w-full h-12 rounded-xl border border-border/60 bg-white hover:bg-gray-50 text-black font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.98]">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                      Teruskan dengan Google
                    </Button>
                  </div>
                )}
              </form>
            )}
          </div>

          {!resetSent && !verificationSent && (
            <div className="mt-8 flex justify-center">
              {isForgotPassword ? (
                <button type="button" onClick={() => setIsForgotPassword(false)}
                  className="text-[11px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors">
                  ← Kembali ke Log Masuk
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground/60 text-[11px] font-medium">
                    {isSignUp ? 'Sudah ada akaun?' : 'Belum ada akaun?'}
                  </span>
                  <button type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); resetForm(); }}
                    className="text-[11px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors">
                    {isSignUp ? 'Log Masuk' : 'Daftar'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <a 
              href="https://wa.me/601139413699" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Hubungi JPP Sekiranya Ada Masalah
            </a>
          </div>

          <div className="mt-8 text-center lg:hidden">
            <p className="text-[10px] font-medium text-muted-foreground/40">© 2026 JPP Digital Portal. Hak cipta terpelihara.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
