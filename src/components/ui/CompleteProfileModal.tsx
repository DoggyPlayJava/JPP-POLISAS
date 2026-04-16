import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, Loader2, Sparkles, Building2, Crown, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, JABATAN_LIST, JabatanValue, ALL_CLUBS, ROLE_LABELS, getAkademikClubId } from '@/types';
import { cn } from '@/lib/utils';

// Roles
const LEADER_ROLES: UserRole[] = ['CLUB_PRESIDENT', 'CLUB_MT'];
const STAFF_ROLES: UserRole[] = ['STAFF', 'CLUB_ADVISOR'];

type RegisterMode = 'student' | 'leader' | 'staff';

export function CompleteProfileModal() {
  const { profile, user, refetchProfile } = useAuth();
  
  const [phone, setPhone] = useState(profile?.phone || '');
  const [matricNo, setMatricNo] = useState(profile?.matric_no || '');
  const [registerMode, setRegisterMode] = useState<RegisterMode>('student');
  const [jabatan, setJabatan] = useState<JabatanValue | ''>('');
  const [leaderRole, setLeaderRole] = useState<UserRole>('CLUB_PRESIDENT');
  const [staffRole, setStaffRole] = useState<UserRole>('STAFF');
  const [leaderClubId, setLeaderClubId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Semak sama ada profil 100% lengkap
  const hasMatric = profile && profile.matric_no !== null && profile.matric_no !== '';
  const hasDeptOrStaff = profile && (profile.department !== null || profile.role === 'STAFF' || profile.role === 'SUPER_ADMIN_JPP' || profile.role === 'ADMIN');
  const hasPhone = profile && profile.phone !== null && profile.phone !== '';

  const isProfileComplete = hasMatric && hasDeptOrStaff && hasPhone;
  if (isProfileComplete) return null;

  // 2. Semak adakah pengguna ini cuma ketinggalan nombor telefon sahaja? 
  // (Senario: Pelajar Senior / Pengguna sedia ada)
  const isOnlyMissingPhone = hasMatric && hasDeptOrStaff && !hasPhone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOnlyMissingPhone) {
      if (!phone.trim()) { toast.error('Sila lengkapkan No Telefon.'); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success('Nombor telefon berjaya disimpan!');
      } catch (error: any) {
        toast.error(error.message || 'Ralat menyimpan nombor telefon.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!matricNo.trim() || !phone.trim()) {
      toast.error('Sila lengkapkan No Matrik dan No Telefon.');
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
        toast.error('Sila pilih jabatan akademik anda.');
        return;
      }
      if (registerMode === 'leader' && !leaderClubId) {
        toast.error('Sila pilih kelab anda.');
        return;
      }
    }

    setLoading(true);
    try {
      const isLeader = registerMode === 'leader';
      const isStaff = registerMode === 'staff';
      const isAdvisor = isStaff && staffRole === 'CLUB_ADVISOR';

      const academikClubId = isStaff ? null : getAkademikClubId(jabatan as JabatanValue);
      const roleToAssign = isStaff ? staffRole : (isLeader ? leaderRole : 'CLUB_MEMBER');

      let initialStatus = 'APPROVED';
      if (isLeader || isAdvisor) initialStatus = 'PENDING';

      // 1. Update primary profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          matric_no: matricNo.trim(),
          phone: phone.trim(),
          club_id: academikClubId,
          role: roleToAssign,
          department: isStaff ? null : jabatan,
          account_status: initialStatus,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // 2. Insert Academic Club Membership (if applicable)
      if (!isStaff && academikClubId) {
        const isLeadingAcademicClub = isLeader && leaderClubId === academikClubId;
        await supabase.from('student_club_memberships').insert({
          user_id: user!.id,
          club_id: academikClubId,
          role: isLeadingAcademicClub ? leaderRole : 'CLUB_MEMBER',
          account_status: isLeadingAcademicClub ? 'PENDING' : initialStatus,
          is_primary: true,
        }).select();
      }

      // 3. Insert Target Leadership/Advisor Club Membership
      const targetClubMembership = (isLeader && leaderClubId !== academikClubId) || isAdvisor;
      if (targetClubMembership) {
        await supabase.from('student_club_memberships').insert({
          user_id: user!.id,
          club_id: leaderClubId,
          role: roleToAssign,
          account_status: 'PENDING',
          is_primary: !academikClubId,
        }).select();
      }

      // 4. Notify Admins if new leader
      if ((isLeader && leaderRole === 'CLUB_PRESIDENT') || isAdvisor) {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['SUPER_ADMIN_JPP', 'ADMIN', 'JPP']);
        if (admins && admins.length > 0) {
          const notifs = admins.map(a => ({
            user_id: a.id,
            title: 'Pendaftaran Pimpinan Baharu (Google OAuth)',
            message: `Terdapat satu permohonan pendaftaran baru (melalui akaun Google). Sila semak tab "Permohonan Baru".`,
            type: 'SYSTEM',
            is_read: false
          }));
          await supabase.from('notifications').insert(notifs);
        }
      }

      await refetchProfile();
      toast.success(isStaff ? 'Profil Staf Berjaya Disimpan!' : 'Profil Pelajar Berjaya Disimpan!');
      
      // Auto reload after short pause to ensure auth state pulls memberships reliably
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Ralat menyimpan profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop (Solid and Blurred to completely block) */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           transition={{ type: 'spring', damping: 25, stiffness: 300 }}
           className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header Graphic */}
          <div className="h-32 bg-gradient-to-br from-primary to-accent relative overflow-hidden flex items-center justify-center shrink-0">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute -right-10 -top-10 opacity-30"
             >
               <Sparkles className="w-40 h-40 text-white" />
             </motion.div>
             <div className="w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center relative z-10">
               <img src="/jpp-logo.png" alt="Logo" className="w-10 h-10 object-contain" />
             </div>
          </div>

          <div className="p-8 space-y-6">
             <div className="text-center space-y-2">
               <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                 Lengkapkan Profil
               </h2>
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                 {isOnlyMissingPhone 
                    ? "Kami mendapati anda masih belum memasukkan nombor telefon. Sila lengkapkan untuk tujuan notifikasi."
                    : "Akaun Google anda telah berjaya disambungkan. Sila lengkapkan maklumat tambahan ini."}
               </p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Tabs, ditunjukkan HANYA jika bukan sekadar isOnlyMissingPhone */}
                {!isOnlyMissingPhone && (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl mb-2">
                      <button type="button" onClick={() => setRegisterMode(registerMode === 'leader' ? 'leader' : 'student')}
                        className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          (registerMode === 'student' || registerMode === 'leader') ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <Sparkles className="w-3.5 h-3.5" /> Pelajar
                      </button>
                      <button type="button" onClick={() => setRegisterMode('staff')}
                        className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          registerMode === 'staff' ? "bg-card shadow-md text-emerald-600" : "text-muted-foreground hover:text-emerald-600")}>
                        <Building2 className="w-3.5 h-3.5" /> Staf
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {registerMode === 'staff' ? 'No Pekerja / Staf ID' : 'No Matrik'}
                        </Label>
                        <div className="relative group">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <Input placeholder={registerMode === 'staff' ? "S123456" : "23DXX1234"} required={!isOnlyMissingPhone} value={matricNo} onChange={e => setMatricNo(e.target.value.toUpperCase())}
                            className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 uppercase font-bold tracking-wide border-slate-200 dark:border-white/10" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  {/* Phone input is always shown */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      No Telefon Bimbit
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input type="tel" placeholder="0123456789" required value={phone} onChange={e => setPhone(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-bold tracking-wide border-slate-200 dark:border-white/10" />
                    </div>
                  </div>

                  {!isOnlyMissingPhone && registerMode !== 'staff' && (
                    <>
                      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl mb-2">
                        <button type="button" onClick={() => setRegisterMode('student')}
                          className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            registerMode === 'student' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                          <Sparkles className="w-3.5 h-3.5" /> Pelajar Biasa
                        </button>
                        <button type="button" onClick={() => setRegisterMode('leader')}
                          className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            registerMode === 'leader' ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground")}>
                          <Crown className="w-3.5 h-3.5" /> Pimpinan Kelab
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Jabatan Akademik
                        </Label>
                        <Select value={jabatan} onValueChange={v => setJabatan(v as JabatanValue)} required={!isOnlyMissingPhone}>
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

                      {registerMode === 'leader' && (
                        <>
                          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-700 font-medium leading-relaxed">
                            👑 Permohonan jawatan kepimpinan bagi kelab yang dipilih di bawah tertakluk pada kelulusan Penasihat kelab.
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Peranan</Label>
                            <Select value={leaderRole} onValueChange={v => setLeaderRole(v as UserRole)}>
                              <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium"><SelectValue /></SelectTrigger>
                              <SelectContent className="z-[10000] rounded-2xl">{LEADER_ROLES.map(r => (<SelectItem key={r} value={r} className="py-3 font-medium">{ROLE_LABELS[r]}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Kelab (Mohon Kepimpinan)</Label>
                            <Select value={leaderClubId} onValueChange={setLeaderClubId} required={!isOnlyMissingPhone}>
                               <SelectTrigger className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 font-medium"><SelectValue placeholder="Pilih kelab..."/></SelectTrigger>
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

                  {!isOnlyMissingPhone && registerMode === 'staff' && (
                     <>
                        <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-[11px] text-emerald-700 font-medium leading-relaxed">
                          🏢 Mod Pendaftaran Staf membolehkan anda untuk menggunakan perkhidmatan warga institusi.
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-black uppercase tracking-widest">Tujuan</Label>
                          <Select value={staffRole} onValueChange={v => setStaffRole(v as UserRole)}>
                            <SelectTrigger className="h-12 rounded-xl border-emerald-500/30 text-emerald-700"><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[10000] rounded-2xl">{STAFF_ROLES.map(r => (<SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        {staffRole === 'CLUB_ADVISOR' && (
                          <div className="space-y-1.5">
                             <Label className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Kelab Dinasihati</Label>
                             <Select value={leaderClubId} onValueChange={setLeaderClubId} required={!isOnlyMissingPhone}>
                               <SelectTrigger className="h-12 rounded-xl border-indigo-500/30"><SelectValue placeholder="Pilih kelab..."/></SelectTrigger>
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
                          <Input type="password" placeholder="Dapatkan dari Admin" required={!isOnlyMissingPhone} value={passcode} onChange={e => setPasscode(e.target.value)}
                              className="h-12 rounded-xl bg-rose-500/5 border-rose-500/20 focus-visible:ring-rose-500/40 font-bold tracking-[0.2em] text-rose-700 text-center" />
                        </div>
                     </>
                  )}
                </div>

                <Button 
                   type="submit"
                   disabled={loading || !matricNo || !phone}
                   className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all"
                >
                   {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Profil'}
                </Button>
             </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
