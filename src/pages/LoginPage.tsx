import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, User, Hash, Building2, ChevronLeft, Sparkles, Crown } from 'lucide-react';
import { UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS, getAkademikClubId } from '@/types';
import { cn } from '@/lib/utils';

// Roles yang boleh self-register (Presiden dan MT perlu pilih kelab)
const LEADER_ROLES: UserRole[] = ['CLUB_PRESIDENT', 'CLUB_MT'];

type RegisterMode = 'student' | 'leader';
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

  // Register flow state
  const [step, setStep] = useState<Step>(1);
  const [registerMode, setRegisterMode] = useState<RegisterMode>('student');
  const [jabatan, setJabatan] = useState<JabatanValue | ''>('');
  const [leaderRole, setLeaderRole] = useState<UserRole>('CLUB_PRESIDENT');
  const [leaderClubId, setLeaderClubId] = useState('');

  const resetForm = () => {
    setStep(1); setRegisterMode('student'); setJabatan(''); setLeaderRole('CLUB_PRESIDENT');
    setLeaderClubId(''); setFullName(''); setMatricNo(''); setEmail(''); setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success('Pautan tetapan semula telah dihantar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Log masuk berjaya. Selamat kembali.');
      }
    } catch (error: any) {
      const msg: Record<string, string> = {
        'Invalid login credentials': 'Emel atau kata laluan tidak sah.',
        'User already registered': 'Emel ini sudah berdaftar. Cuba log masuk.',
        'Password should be at least 6 characters': 'Kata laluan mesti sekurang-kurangnya 6 aksara.',
        'Email not confirmed': 'Sila sahkan emel anda dahulu.',
      };
      toast.error(msg[error.message] || error.message || 'Operasi gagal. Cuba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password || !matricNo.trim()) {
      toast.error('Sila lengkapkan semua maklumat termasuk Nombor Matrik.');
      return;
    }
    if (!jabatan) {
      toast.error('Sila pilih jabatan anda.');
      return;
    }
    if (registerMode === 'leader' && !leaderClubId) {
      toast.error('Sila pilih kelab anda.');
      return;
    }

    setIsLoading(true);
    try {
      const isLeader = registerMode === 'leader';
      const academikClubId = getAkademikClubId(jabatan as JabatanValue);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            matric_no: matricNo.trim(),
            club_id: academikClubId,
            role: 'CLUB_MEMBER',
            department: jabatan,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        localStorage.setItem('is_new_register', 'true');
        // FIX SECURITY LEAK: Create profile as regular member and assign to academic club by default
        await supabase.from('profiles').update({
          full_name: fullName.trim(),
          matric_no: matricNo.trim(),
          club_id: academikClubId,
          role: 'CLUB_MEMBER',
          department: jabatan,
          account_status: 'APPROVED',
        }).eq('id', data.user.id);

        if (academikClubId) {
          await supabase.from('student_club_memberships').insert({
            user_id: data.user.id,
            club_id: academikClubId,
            role: 'CLUB_MEMBER',
            account_status: 'APPROVED',
            is_primary: true,
          }).select();
        }
        
        if (isLeader) {
          // Send leader request purely as PENDING
          await supabase.from('student_club_memberships').insert({
            user_id: data.user.id,
            club_id: leaderClubId,
            role: leaderRole,
            account_status: 'PENDING',
            is_primary: false,
          }).select();
        }
      }

      toast.success(
        registerMode === 'student'
          ? `Akaun berjaya didaftar! Sila semak peti masuk emel anda untuk pengesahan.`
          : 'Akaun berjaya didaftar! Anda dimasukkan ke Kelab Akademik anda. Permohonan kepimpinan anda akan disemak oleh Penasihat.'
      );

      setIsSignUp(false);
      resetForm();
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/8 rounded-full blur-[120px] -mr-80 -mt-80 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] -ml-60 -mb-60 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, hsl(0 67% 32%) 1px, transparent 0)', backgroundSize: '36px 36px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 space-y-3">
          <div className="w-20 h-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl glow-accent overflow-hidden">
            <img src="/jpp-logo.png" alt="JPP Logo" className="w-14 h-14 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter text-foreground">e-KPP</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent mt-0.5">JPP Polisas</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">Kelab · Persatuan · Perpaduan</p>
          </div>
        </div>

        <Card className="border border-border/60 shadow-2xl bg-card/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardHeader className="px-10 pt-8 pb-4 space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              {isSignUp && step === 2 && (
                <button onClick={() => setStep(1)} className="mr-1 p-1 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {isForgotPassword ? 'Tetapkan Semula Kata Laluan'
                : isSignUp ? (step === 1 ? 'Daftar Akaun Baharu' : 'Maklumat Keahlian')
                : 'Log Masuk'}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isForgotPassword
                ? 'Masukkan emel anda untuk menerima pautan tetapan semula.'
                : isSignUp && step === 1
                ? 'Lengkapkan maklumat asas anda.'
                : isSignUp && step === 2
                ? 'Pilih jabatan atau peranan anda dalam kelab.'
                : 'Masukkan emel dan kata laluan anda untuk teruskan.'}
            </CardDescription>
            {isSignUp && (
              <div className="flex items-center gap-2 pt-2">
                <div className={cn("w-8 h-1.5 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
                <div className={cn("w-8 h-1.5 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
              </div>
            )}
          </CardHeader>

          <CardContent className="px-10 pb-4">
            {resetSent ? (
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
                    onSubmit={(e) => { e.preventDefault(); if (!fullName.trim() || !email || !password) { toast.error('Sila lengkapkan semua maklumat.'); return; } setStep(2); }}>

                    {/* Nama Penuh */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Nama Penuh</Label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                        <Input placeholder="NAMA PENUH SEPERTI DALAM KAD MATRIK" required value={fullName}
                          onChange={e => setFullName(e.target.value.toUpperCase())}
                          className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium uppercase" />
                      </div>
                    </div>

                    {/* No. Matrik */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">No. Matrik</Label>
                      <div className="relative group">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                        <Input placeholder="CTH: 23DKM1234" required value={matricNo} onChange={e => setMatricNo(e.target.value.toUpperCase())}
                          className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium uppercase" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Emel</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                        <Input type="email" placeholder="emel@polisas.edu.my" required value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium" />
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
                  </motion.form>
                ) : (
                  <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} className="space-y-5" onSubmit={handleRegister}>

                    {/* Toggle: Pelajar atau Pemimpin */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl">
                      <button type="button" onClick={() => setRegisterMode('student')}
                        className={cn("flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                          registerMode === 'student' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <Sparkles className="w-3.5 h-3.5" /> Pelajar
                      </button>
                      <button type="button" onClick={() => setRegisterMode('leader')}
                        className={cn("flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                          registerMode === 'leader' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <Crown className="w-3.5 h-3.5" /> Pemimpin
                      </button>
                    </div>

                    <div className="space-y-3">
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
                        {jabatan === 'geomatik' && (
                          <p className="text-[11px] text-amber-600 font-medium pt-1">
                            ⚠️ Anda mungkin perlu mohon Kelab Akademik GEOSAS sendiri selepas log masuk.
                          </p>
                        )}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {registerMode === 'student' ? (
                        <motion.div key="student" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                          <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-[11px] text-blue-600 font-medium leading-relaxed">
                            💡 Anda akan <strong>auto-diasingkan</strong> ke Kelab Akademik secara rasmi. Selepas log masuk, layari <strong>"Sertai Kelab"</strong> untuk menyertai kelab sukan/beruniform yang lain.
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="leader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-700 font-medium leading-relaxed">
                            👑 Anda akan dimasukkan ke Kelab Akademik anda dahulu. Permohonan jawatan kepimpinan bagi kelab yang dipilih di bawah tertakluk pada kelulusan Penasihat kelab.
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
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Emel</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
                    <Input type="email" placeholder="emel@polisas.edu.my" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-medium" />
                  </div>
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
              </form>
            )}
          </CardContent>

          {!resetSent && (
            <CardFooter className="px-10 pb-8 flex justify-center">
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
            </CardFooter>
          )}
        </Card>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sistem e-KPP Beroperasi</span>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground/40 mt-3">© 2026 e-KPP JPP Polisas. Hak cipta terpelihara.</p>
        </div>
      </motion.div>
    </div>
  );
}
