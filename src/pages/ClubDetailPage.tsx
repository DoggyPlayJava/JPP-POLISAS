import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Activity, Calendar, ShieldCheck, Award, Lock, LogOut,
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getContrastColor } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface ClubDetailPageProps {
  initialClub?: any;
  initialLoading?: boolean;
}

export function ClubDetailPage({ initialClub, initialLoading }: ClubDetailPageProps = {}) {
  const { t } = useTranslation(['kpp', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, userClubIds, primaryClubId, refetchProfile } = useAuth();

  const [loading, setLoading] = useState(initialLoading ?? (initialClub ? false : true));
  const [club, setClub] = useState<any>(initialClub || null);
  const [committee, setCommittee] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Dialog pengesahan keluar kelab
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Query hanya data yang dipaparkan dalam JSX (tiada query membazir)
        const [clubRes, commRes, actsRes, membershipRes] = await Promise.all([
          supabase.from('clubs').select('id, name, short_name, category, theme_color, logo_url, description').eq('id', id).single(),
          supabase.from('club_committee').select('full_name, category, position_title, order_index').eq('club_id', id).order('order_index', { ascending: true }),
          supabase.from('club_activities').select('id, title, status, created_at').eq('club_id', id).order('created_at', { ascending: false }).limit(6),
          supabase.from('student_club_memberships')
            .select('user_id, role, profiles!inner(full_name, avatar_url)')
            .eq('club_id', id)
            .eq('account_status', 'APPROVED')
        ]);

        if (clubRes.error) throw clubRes.error;

        const allMemberships = membershipRes.data || [];
        const overrides = commRes.data || [];
        
        const unifiedMembers: any[] = [];

        allMemberships.forEach((m: any) => {
          const profileInfo = m.profiles as any;
          const fullName = profileInfo?.full_name;
          const avatarUrl = profileInfo?.avatar_url;
          const override = overrides.find(o => o.full_name === fullName);
          
          let category = 'AHLI';
          let position_title = 'Ahli Biasa';

          if (m.role === 'CLUB_PRESIDENT' || m.role === 'CLUB_MT') {
            category = override?.category || (m.role === 'CLUB_PRESIDENT' ? 'MT' : 'EXCO');
            position_title = override?.position_title || (m.role === 'CLUB_PRESIDENT' ? 'Presiden Kelab' : 'Ahli Jawatankuasa');
          }

          unifiedMembers.push({
            user_id: m.user_id,
            full_name: fullName,
            avatar_url: avatarUrl,
            role: m.role,
            category,
            position_title
          });
        });

        // Susunan: Presiden -> MT -> EXCO -> AHLI
        unifiedMembers.sort((a, b) => {
          if (a.role === 'CLUB_PRESIDENT' && b.role !== 'CLUB_PRESIDENT') return -1;
          if (a.role !== 'CLUB_PRESIDENT' && b.role === 'CLUB_PRESIDENT') return 1;
          if (a.category === 'MT' && b.category !== 'MT') return -1;
          if (a.category !== 'MT' && b.category === 'MT') return 1;
          if (a.category === 'EXCO' && b.category === 'AHLI') return -1;
          if (a.category === 'AHLI' && b.category === 'EXCO') return 1;
          return 0;
        });

        setClub(clubRes.data);
        setCommittee(unifiedMembers);
        setActivities(actsRes.data || []);
      } catch (error) {
        console.error("Ralat memuatkan profil kelab:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id]);

  if (loading) {
    return <ClubDetailSkeleton />;
  }

  if (!club) {
    return (
      <div className="page-container py-24 text-center space-y-4">
        <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('kpp:club_not_found', 'Kelab Tidak Ditemui')}</h2>
        <p className="text-xs text-muted-foreground">{t('kpp:club_not_found_desc', 'Maklumat persatuan ini tidak wujud atau telah dipadamkan.')}</p>
        <Button onClick={() => navigate('/kelab')} variant="outline" className="rounded-xl text-xs font-semibold mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('kpp:back_to_directory', 'Kembali ke Direktori')}
        </Button>
      </div>
    );
  }

  const isOwnClub = userClubIds?.includes(club?.id);
  const isPrimary = primaryClubId === club?.id;
  const canSeePrivateData = isSuperAdmin || isOwnClub;
  
  const mtMembers = committee.filter(m => m.category === 'MT');
  const excoMembers = committee.filter(m => m.category === 'EXCO');
  const ahliBiasa = committee.filter(m => m.category === 'AHLI');

  const handleConfirmLeave = async () => {
    if (!user) return;
    setLeaving(true);
    try {
      if (isPrimary) {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: club.id, p_is_primary: true });
        if (error) throw error;
        toast.success(t('kpp:leave_academic_sent', 'Permohonan keluar kelab Akademik telah dihantar untuk kelulusan Penasihat.'));
        refetchProfile();
      } else {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: club.id, p_is_primary: false });
        if (error) throw error;
        toast.success(t('kpp:left_club_success', 'Anda telah berjaya menarik diri daripada {{name}}.', { name: club.name }));
        refetchProfile();
        setTimeout(() => navigate('/kelab'), 1200);
      }
      setShowLeaveModal(false);
    } catch (err: any) {
      toast.error(err.message || t('kpp:failed_to_process_leave', 'Gagal memproses penarikan diri'));
    } finally {
      setLeaving(false);
    }
  };

  const headerTextColor = getContrastColor(club.theme_color || '#1e293b');

  return (
    <div className="page-container space-y-8 pb-20 pt-4">

      {/* ── 1. TOP BREADCRUMB & BACK NAVIGATION ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/kelab')}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group py-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{t('kpp:back_to_club_directory', 'Kembali ke Direktori Kelab')}</span>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/70 font-medium">
          <span>{t('kpp:portal', 'Portal')}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span>{t('kpp:directory', 'Direktori')}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">{club.name}</span>
        </div>
      </div>

      {/* ── 2. HERO BANNER BERKADAR MODEN ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6 sm:p-10 md:p-14 rounded-3xl shadow-xl overflow-hidden group border border-border/40"
        style={{ backgroundColor: club.theme_color || '#1e293b' }}
      >
        {/* Subtle dark gradient overlay untuk kestabilan kontras dark mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none rotate-12 transition-transform duration-700 group-hover:rotate-45">
          <ShieldCheck className="w-96 h-96 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
          {/* Logo Kelab */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xl group-hover:border-white/40 transition-all duration-300">
            {club.logo_url ? (
              <img src={club.logo_url} className="w-full h-full object-cover" alt={club.name} />
            ) : (
              <span className="text-4xl sm:text-5xl font-black text-white">{club.short_name?.slice(0, 2) || 'K'}</span>
            )}
          </div>

          {/* Maklumat Tajuk & Deskripsi */}
          <div className="text-center md:text-left space-y-4 flex-1 min-w-0">
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge className="bg-white/20 text-inherit border-none uppercase tracking-wider text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                {club.category || t('kpp:club', 'Kelab')}
              </Badge>
              <Badge className="bg-black/25 text-inherit border-none text-[11px] font-semibold px-3 py-1 rounded-full">
                {t('kpp:session_label', 'Sesi')} {(() => { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); return m >= 5 ? `${y}/${y+1}` : `${y-1}/${y}`; })()}
              </Badge>
              {isOwnClub && (
                <Badge className="bg-emerald-500/90 text-white border-none text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t('kpp:you_are_member', 'Anda Ahli')}
                </Badge>
              )}
            </div>

            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-balance"
              style={{ color: headerTextColor }}
            >
              {club.name}
            </h1>

            <p
              className="font-normal opacity-90 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed text-pretty"
              style={{ color: headerTextColor }}
            >
              {club.description || t('kpp:default_club_desc', 'Menerajui aktiviti kokurikulum dan perpaduan mahasiswa berkualiti di POLISAS.')}
            </p>

            {isOwnClub && !isSuperAdmin && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowLeaveModal(true)}
                  className="rounded-xl font-bold text-xs px-4 h-9 shadow-md bg-rose-600 hover:bg-rose-700 text-white border-none"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> {t('kpp:leave_club', 'Keluar Kelab')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 3. METRIK STATISTIK PANTAS (TABULAR NUMS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatItem label={t('kpp:total_active_members', 'Jumlah Ahli Aktif')} val={committee.length} icon={Users} color="text-primary" />
        <StatItem label={t('kpp:registered_activities', 'Aktiviti Terdaftar')} val={activities.length} icon={Activity} color="text-emerald-500" />
        <StatItem label={t('kpp:mt_exco_lineup', 'Barisan MT / Exco')} val={mtMembers.length + excoMembers.length} icon={Award} color="text-blue-500" />
        <StatItem label={t('kpp:club_status', 'Status Kelab')} val={t('kpp:status_active', 'Aktif')} icon={ShieldCheck} color="text-amber-500" isText />
      </div>

      {/* ── 4. KEPIMPINAN & AKTIVITI ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Lajur Kiri: Jawatankuasa & Ahli (2/3) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Majlis Tertinggi */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> {t('kpp:high_council', 'Majlis Tertinggi')}
              </h3>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{t('kpp:positions_count', '{{count}} Jawatan', { count: mtMembers.length })}</span>
            </div>

            {mtMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mtMembers.map(member => (
                  <Card key={member.user_id} className="rounded-2xl border-border/70 bg-card shadow-sm hover:border-primary/40 transition-all">
                    <CardContent className="p-4 flex items-center gap-3.5">
                      <Avatar className="w-12 h-12 rounded-xl border border-border/50 shadow-sm shrink-0">
                        <AvatarImage src={member.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">{member.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-primary mb-0.5 truncate uppercase tracking-wider">{member.position_title}</p>
                        <h4 className="font-bold text-foreground text-xs sm:text-sm truncate">{member.full_name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-card border border-dashed border-border/80 space-y-2">
                <Award className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">{t('kpp:no_mt_records', 'Tiada Rekod Majlis Tertinggi')}</p>
                <p className="text-[11px] text-muted-foreground/60 max-w-xs mx-auto">
                  {t('kpp:no_mt_desc', 'Pelantikan Majlis Tertinggi akan dikemaskini oleh pihak pentadbiran kelab.')}
                </p>
              </div>
            )}
          </section>

          {/* Barisan Exco */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> {t('kpp:exco_ajk_lineup', 'Barisan Exco & AJK')}
              </h3>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{t('kpp:people_count', '{{count}} Orang', { count: excoMembers.length })}</span>
            </div>

            {excoMembers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {excoMembers.map(member => (
                  <div key={member.user_id} className="p-3.5 rounded-2xl bg-card border border-border/70 text-center hover:border-primary/40 transition-all flex flex-col items-center gap-2.5">
                    <Avatar className="w-10 h-10 rounded-xl border border-border/50 shadow-sm">
                      <AvatarImage src={member.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">{member.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide truncate">{member.position_title}</p>
                      <h4 className="font-bold text-xs text-foreground truncate mt-0.5">{member.full_name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-card border border-dashed border-border/80 space-y-2">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">{t('kpp:no_exco_records', 'Tiada Rekod Exco Dikesan')}</p>
                <p className="text-[11px] text-muted-foreground/60 max-w-xs mx-auto">
                  {t('kpp:no_exco_desc', 'Barisan biro dan unit aktiviti sedang disusun.')}
                </p>
              </div>
            )}
          </section>

          {/* Senarai Ahli Biasa */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> {t('kpp:general_members', 'Ahli Biasa')} ({ahliBiasa.length})
              </h3>
            </div>

            {ahliBiasa.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {ahliBiasa.map(member => (
                  <div key={member.user_id} className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center gap-2.5 hover:border-primary/30 transition-colors">
                    <Avatar className="w-7 h-7 rounded-lg border border-border/40 shrink-0">
                      <AvatarImage src={member.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-muted text-muted-foreground font-bold text-[10px]">{member.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-xs text-foreground truncate">{member.full_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-card border border-dashed border-border/80">
                <p className="text-xs font-semibold text-muted-foreground">{t('kpp:no_general_members', 'Tiada ahli biasa berdaftar.')}</p>
              </div>
            )}
          </section>

        </div>

        {/* Lajur Kanan: Aktiviti Terkini (1/3) */}
        <div className="space-y-6">
          {canSeePrivateData ? (
            <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 p-5 border-b border-border/60">
                <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
                  <Activity className="w-4 h-4 text-primary" /> {t('kpp:activity_tracker', 'Jejak Aktiviti & Program')}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t('kpp:approved_club_programs', 'Program kelab yang diluluskan')}</p>
              </CardHeader>
              <CardContent className="p-5">
                {activities.length === 0 ? (
                  <p className="text-center py-8 text-xs font-medium text-muted-foreground">
                    {t('kpp:no_activities_so_far', 'Tiada rekod program atau aktiviti setakat ini.')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((act) => (
                      <div key={act.id} className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 hover:bg-muted/40 transition-colors space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-foreground leading-snug">{act.title}</h4>
                          <StatusChip status={act.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span>{act.created_at ? format(parseISO(act.created_at), 'dd MMM yyyy') : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 rounded-3xl bg-muted/30 border border-dashed border-border/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <h4 className="font-bold text-sm text-foreground">{t('kpp:restricted_activity_access', 'Akses Aktiviti Terhad')}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('kpp:restricted_activity_desc', 'Log program dan minit mesyuarat hanya dipaparkan kepada ahli kelab yang telah disahkan dan pihak JPP POLISAS.')}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── DIALOG PENGESAHAN KELUAR KELAB ── */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              {isPrimary ? t('kpp:apply_leave_academic', 'Mohon Keluar Kelab Akademik') : t('kpp:leave_club_title', 'Tarik Diri daripada Kelab')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {isPrimary
                ? t('kpp:leave_academic_desc', 'Kelab Akademik tertakluk kepada jabatan pengajian anda. Permohonan pelepasan memerlukan sokongan dan kelulusan Penasihat Kelab.')
                : t('kpp:leave_club_confirm_desc', 'Adakah anda pasti ingin menarik diri serta-merta daripada "{{name}}"? Sebarang rekod jawatan dan aktiviti yang sedang berlangsung akan dihentikan.', { name: club.name })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setShowLeaveModal(false)}
              className="rounded-xl font-bold text-xs"
            >
              {t('common:cancel', 'Batal')}
            </Button>
            <Button
              onClick={handleConfirmLeave}
              disabled={leaving}
              className="rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {leaving ? t('common:processing', 'Memproses...') : (isPrimary ? t('kpp:send_leave_application', 'Hantar Permohonan Keluar') : t('kpp:confirm_leave_club', 'Sahkan Tarik Diri'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function StatItem({ label, val, icon: Icon, color, isText = false }: any) {
  return (
    <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border/70 shadow-sm flex flex-col items-center text-center space-y-1.5 hover:border-primary/40 transition-colors">
      <div className={cn("w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center mb-1", color)}>
        <Icon size={18} />
      </div>
      <p className={cn("text-2xl sm:text-3xl font-black tracking-tight text-foreground", !isText && "font-mono tabular-nums")}>
        {val}
      </p>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ClubDetailSkeleton() {
  return (
    <div className="page-container space-y-8 pb-20 pt-4 animate-pulse">
      <div className="h-5 w-48 bg-muted rounded-lg" />
      <div className="h-64 sm:h-72 rounded-3xl bg-muted/70" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 rounded-2xl bg-muted" />
            <div className="h-24 rounded-2xl bg-muted" />
          </div>
        </div>
        <div className="h-64 rounded-3xl bg-muted" />
      </div>
    </div>
  );
}