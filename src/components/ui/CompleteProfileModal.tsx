import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Loader2, Sparkles, Building2, Crown, Hash, User,
  GraduationCap, Calendar, AlertTriangle, ChevronDown, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
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
  const { profile, user, refetchProfile } = useAuth();

  // ── Form state ──────────────────────────────────────────────────────────
  const [fullName,         setFullName]         = useState(profile?.full_name || '');
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
  const [loading,          setLoading]          = useState(false);
  const [showWarning,      setShowWarning]      = useState(false);

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
        "Adakah anda pasti mahu membatalkan pendaftaran? Akaun anda akan dipadam dari sistem."
      );
      if (!confirmDelete) return;

      setLoading(true);
      try {
        const { error: rpcError } = await supabase.rpc('delete_own_account');
        if (rpcError) throw rpcError;
        
        await supabase.auth.signOut();
        toast.success("Pendaftaran dibatalkan dan akaun berjaya dipadamkan.");
        window.location.href = '/login';
      } catch (err: any) {
        toast.error("Ralat memadam akaun: " + (err.message || "Sila cuba lagi."));
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
  const isOnlyMissingPhone    = hasMatric && hasDept && hasPhone && !hasCohort === false &&
                                hasMatric && hasDept && !hasPhone && hasCohort;
  const isOnlyMissingCohort   = hasMatric && hasDept && hasPhone && !hasCohort;
  const isMissingPhoneAndCohort = hasMatric && hasDept && !hasPhone && !hasCohort;
  const isFullRegistration    = !hasMatric;

  // Derived UI helpers
  const isFtv           = jabatan === 'ftv';
  const programmes      = jabatan ? JABATAN_PROGRAMMES[jabatan as JabatanValue] ?? [] : [];
  const computedSem     = intakeYear && intakePeriod
    ? computeSemDisplay(intakeYear as number, intakePeriod as 1 | 2, isFtv, sm1, sm2)
    : null;

  // ── Heading text ─────────────────────────────────────────────────────────
  const heading = isOnlyMissingPhone
    ? 'Kemaskini No. Telefon'
    : isOnlyMissingCohort || isMissingPhoneAndCohort
    ? 'Kemaskini Maklumat Pengajian'
    : 'Lengkapkan Profil';

  const subheading = isOnlyMissingPhone
    ? 'Sila masukkan nombor telefon untuk tujuan notifikasi penting.'
    : isOnlyMissingCohort
    ? 'Sistem kohort baharu memerlukan maklumat program pengajian anda. Sila lengkapkan.'
    : isMissingPhoneAndCohort
    ? 'Sila lengkapkan nombor telefon dan maklumat program pengajian anda.'
    : 'Akaun anda telah disambungkan. Sila lengkapkan semua maklumat di bawah.';

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── A: Only missing phone ─────────────────────────────────────────────
    if (isOnlyMissingPhone) {
      if (!phone.trim()) { toast.error('Sila masukkan nombor telefon.'); return; }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user?.id);
        if (error) throw error;
        await refetchProfile();
        toast.success('Nombor telefon berjaya disimpan!');
      } catch (err: any) {
        toast.error(err.message || 'Ralat menyimpan nombor telefon.');
      } finally { setLoading(false); }
      return;
    }

    // ── B: Only missing cohort ────────────────────────────────────────────
    if (isOnlyMissingCohort) {
      if (!jabatan) { toast.error('Sila pilih jabatan.'); return; }
      if (!isFtv && !programmeCode) { toast.error('Sila pilih program pengajian.'); return; }
      if (!intakeYear || !intakePeriod) { toast.error('Sila pilih tahun dan sesi pengambilan.'); return; }
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
        toast.success('Maklumat pengajian berjaya disimpan!');
      } catch (err: any) {
        toast.error(err.message || 'Ralat menyimpan maklumat.');
      } finally { setLoading(false); }
      return;
    }

    // ── C: Missing phone + cohort ─────────────────────────────────────────
    if (isMissingPhoneAndCohort) {
      if (!phone.trim()) { toast.error('Sila masukkan nombor telefon.'); return; }
      if (!jabatan) { toast.error('Sila pilih jabatan.'); return; }
      if (!isFtv && !programmeCode) { toast.error('Sila pilih program pengajian.'); return; }
      if (!intakeYear || !intakePeriod) { toast.error('Sila pilih tahun dan sesi pengambilan.'); return; }
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
        toast.success('Profil berjaya dikemaskini!');
      } catch (err: any) {
        toast.error(err.message || 'Ralat menyimpan profil.');
      } finally { setLoading(false); }
      return;
    }

    // ── D: Full registration ──────────────────────────────────────────────
    if (!matricNo.trim() || !phone.trim()) {
      toast.error('Sila lengkapkan No Matrik dan No Telefon.'); return;
    }
    if (registerMode !== 'staff' && !matricNo.trim().startsWith('02')) {
      toast.error('No. Matrik pelajar mestilah bermula dengan "02".'); return;
    }

    // ── Semakan duplikat matric_no ────────────────────────────────────────
    if (registerMode !== 'staff') {
      const { data: matricCheck, error: matricErr } = await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
      console.log('[CompleteProfile] matric check:', { matricCheck, matricErr });
      
      if (matricErr) {
        toast.error('Tidak dapat mengesahkan no matrik. Sila cuba lagi.');
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
      if (!isValid) { toast.error('Kod pengesahan staf tidak sah.'); return; }
      if (staffRole === 'CLUB_ADVISOR' && !leaderClubId) {
        toast.error('Sila pilih kelab yang dinasihati.'); return;
      }
    } else {
      if (!jabatan) { toast.error('Sila pilih jabatan akademik.'); return; }
      if (!isFtv && !programmeCode) { toast.error('Sila pilih program pengajian.'); return; }
      if (!intakeYear || !intakePeriod) { toast.error('Sila pilih tahun dan sesi pengambilan.'); return; }
      if (registerMode === 'leader' && !leaderClubId) {
        toast.error('Sila pilih kelab.'); return;
      }
    }

    setLoading(true);
    try {
      if (!user?.id) { toast.error('Sesi anda telah tamat. Sila log masuk semula.'); setLoading(false); return; }

      const isLeader  = registerMode === 'leader';
      const isStaff   = registerMode === 'staff';
      const isAdvisor = isStaff && staffRole === 'CLUB_ADVISOR';
      const academikClubId = isStaff ? null : getAkademikClubId(jabatan as JabatanValue, programmeCode);
      const roleToAssign   = isStaff ? staffRole : (isLeader ? leaderRole : 'CLUB_MEMBER');
      const initialStatus  = (isLeader || isAdvisor) ? 'PENDING' : 'APPROVED';
      // PENTING: Sentiasa gunakan nama yang dimasukkan pengguna. Jika kosong, guna
      // nama dari profil Google. Jangan hantar undefined supaya DB tak reject.
      const nameToSave     = isStaff
        ? (fullName.trim().toUpperCase() || profile?.full_name || '')
        : (fullName.trim().toUpperCase() || profile?.full_name?.toUpperCase() || '');

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
          await supabase.from('notifications').insert(
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
      toast.success(isStaff ? 'Profil Staf Berjaya Disimpan!' : 'Profil Pelajar Berjaya Disimpan!');
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
          <div className="grid grid-cols-2 gap-1.5 h-12">
            <button
              type="button"
              onClick={() => setIntakePeriod(1)}
              className={cn(
                'rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border',
                intakePeriod === 1
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 border-transparent hover:border-primary/30'
              )}
            >
              Intake 1<br /><span className="text-[8px] opacity-70">Pertengahan Tahun</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakePeriod(2)}
              className={cn(
                'rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border',
                intakePeriod === 2
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 border-transparent hover:border-primary/30'
              )}
            >
              Intake 2<br /><span className="text-[8px] opacity-70">Awal Tahun</span>
            </button>
          </div>
        </div>
      </div>

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
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden max-h-[90dvh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="h-32 bg-gradient-to-br from-primary to-accent relative overflow-hidden flex items-center justify-center shrink-0">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
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
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{heading}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subheading}</p>
            </div>

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

              {/* ── SCENARIO: Full registration ─────────────────────────────── */}
              {isFullRegistration && (
                <>
                  {/* Role tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl">
                    <button type="button" onClick={() => setRegisterMode(registerMode === 'leader' ? 'leader' : 'student')}
                      className={cn('flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                        (registerMode === 'student' || registerMode === 'leader') ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      <Sparkles className="w-3.5 h-3.5" /> Pelajar
                    </button>
                    <button type="button" onClick={() => setRegisterMode('staff')}
                      className={cn('flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                        registerMode === 'staff' ? 'bg-card shadow-md text-emerald-600' : 'text-muted-foreground hover:text-emerald-600')}>
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
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {registerMode === 'staff' ? 'No Pekerja / Staf ID' : 'No Matrik'}
                    </Label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder={registerMode === 'staff' ? 'S123456' : '02DXX1234'} required
                        value={matricNo} onChange={e => setMatricNo(e.target.value.toUpperCase())}
                        className="h-12 pl-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 uppercase font-bold tracking-wide border-slate-200 dark:border-white/10"
                      />
                    </div>
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

                  {/* Student-specific fields */}
                  {registerMode !== 'staff' && (
                    <>
                      {/* Student / Leader sub-tabs */}
                      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/40 rounded-xl">
                        <button type="button" onClick={() => setRegisterMode('student')}
                          className={cn('flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            registerMode === 'student' ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          <GraduationCap className="w-3.5 h-3.5" /> Pelajar Biasa
                        </button>
                        <button type="button" onClick={() => setRegisterMode('leader')}
                          className={cn('flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            registerMode === 'leader' ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          <Crown className="w-3.5 h-3.5" /> Pimpinan Kelab
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
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
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
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all"
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
