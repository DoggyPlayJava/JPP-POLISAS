import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Search, Trophy, BookOpen, Heart, Shield, ArrowRight,
  X, Star, Users, CheckCircle2, Clock, Building2, AlertCircle, LogOut, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { insertNotifications } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { AUTO_ASSIGN_CATEGORIES, RESTRICTED_CATEGORIES, UserRole, ROLE_LABELS } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Category metadata helper dengan normalisasi case-insensitive
function getCategoryMeta(rawCategory?: string | null) {
  const cat = (rawCategory || '').toLowerCase().trim();
  if (cat.includes('akademik') || cat.includes('awam') || cat.includes('elektrik') || cat.includes('mekanikal') || cat.includes('perdagangan')) {
    return {
      label: rawCategory || 'Akademik',
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
    };
  }
  if (cat.includes('sukan')) {
    return {
      label: rawCategory || 'Sukan',
      icon: Trophy,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    };
  }
  if (cat.includes('uniform') || cat.includes('badan')) {
    return {
      label: rawCategory || 'Badan Beruniform',
      icon: Shield,
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    };
  }
  return {
    label: rawCategory || 'Kelab Umum',
    icon: Heart,
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
  };
}

export function KelabPage() {
  const { t } = useTranslation(['kpp', 'common']);
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [clubs, setClubs] = useState<any[]>([]);
  const [myMemberships, setMyMemberships] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Semua');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [confirmClub, setConfirmClub] = useState<any | null>(null);
  const [applyRole, setApplyRole] = useState<UserRole>('CLUB_MEMBER');
  const [maxClubs, setMaxClubs] = useState(2);

  // Dialog pengesahan keluar kelab (menggantikan window.confirm)
  const [resignModal, setResignModal] = useState<{
    clubId: string;
    clubName: string;
    isPrimary: boolean;
  } | null>(null);
  const [resigning, setResigning] = useState(false);

  const categories = ['Semua', 'Akademik', 'Sukan', 'Umum', 'Badan Beruniform'];

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: clubData }, { data: memberData }, { data: setting }] = await Promise.all([
        supabase.from('clubs').select('id, name, short_name, category, theme_color, logo_url, description').order('name', { ascending: true }),
        supabase.from('student_club_memberships').select('club_id, role, account_status, is_primary').eq('user_id', user.id),
        supabase.from('system_settings').select('value').eq('key', 'max_clubs_per_student').maybeSingle(),
      ]);
      if (clubData) setClubs(clubData);
      if (memberData) setMyMemberships(memberData);
      if (setting?.value != null) setMaxClubs(Number(setting.value));
    } catch (err) {
      console.error('Ralat memuatkan data kelab:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    if (localStorage.getItem('is_new_register') === 'true') {
      localStorage.removeItem('is_new_register');
    }
  }, [load]);

  const getMembershipStatus = (clubId: string) => {
    const m = myMemberships.find(item => item.club_id === clubId);
    if (!m) return 'none';
    return m.account_status as 'PENDING' | 'APPROVED' | 'REJECTED';
  };

  const approvedCount = myMemberships.filter(m => m.account_status === 'APPROVED').length;
  const hasGeosas = myMemberships.some(
    m => m.account_status === 'APPROVED' && clubs.find(c => c.id === m.club_id)?.short_name?.toUpperCase() === 'GEOSAS'
  );
  const effectiveMaxClubs = (profile?.department === 'awam' && hasGeosas) ? maxClubs + 1 : maxClubs;

  const handleApply = (club: any) => {
    if (!user) return;
    const status = getMembershipStatus(club.id);
    if (status === 'APPROVED' || status === 'PENDING') return;

    const targetIsGeosas = club.short_name?.toUpperCase() === 'GEOSAS';
    if (targetIsGeosas && profile?.department !== 'awam') {
      toast.error('Kelab GEOSAS hanya terbuka kepada pelajar Jabatan Kejuruteraan Awam (JKA).');
      return;
    }

    const checkLimit = (profile?.department === 'awam' && (hasGeosas || targetIsGeosas)) ? maxClubs + 1 : maxClubs;
    if (approvedCount >= checkLimit) {
      toast.error(`Had keahlian dicapai (${checkLimit} kelab). Hubungi JPP untuk menaikkan had.`);
      return;
    }
    setConfirmClub(club);
  };

  const confirmApply = async () => {
    if (!confirmClub || !user) return;
    setApplying(confirmClub.id);
    try {
      const { error } = await supabase.from('student_club_memberships').insert({
        user_id: user.id,
        club_id: confirmClub.id,
        role: applyRole,
        account_status: 'PENDING',
        is_primary: false,
      });
      if (error) throw error;

      if (applyRole === 'CLUB_PRESIDENT') {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['SUPER_ADMIN_JPP', 'ADMIN', 'JPP']);
        if (admins && admins.length > 0) {
          const notifs = admins.map(a => ({
            user_id: a.id,
            title: 'Permohonan Kepimpinan Baharu',
            message: `Terdapat permohonan kepimpinan sebagai Presiden untuk kelab ${confirmClub.name}. Sila semak tab Permohonan Baru di Pengurusan Ahli.`,
            type: 'SYSTEM',
            is_read: false
          }));
          await insertNotifications(notifs);
        }
      } else {
        try {
          const { sendNotificationToKppExco } = await import('@/lib/notifications');
          await sendNotificationToKppExco({
            title: 'Permohonan Kelab Baru',
            message: `Terdapat permohonan keahlian baharu untuk kelab ${confirmClub.name}. Sila semak di panel Exco KPP.`,
            type: 'KPP_MEMBERSHIP_REQUEST',
            module: 'EKPP',
            link: '/jpp'
          });
        } catch (e) {
          console.error("Gagal hantar push notification:", e);
        }
      }

      toast.success(`Permohonan sebagai ${ROLE_LABELS[applyRole] || 'Ahli'} untuk ${confirmClub.name} dihantar! Sila tunggu kelulusan.`);
      setConfirmClub(null);
      setApplyRole('CLUB_MEMBER');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghantar permohonan.');
    } finally {
      setApplying(null);
    }
  };

  const handleResign = async () => {
    if (!user || !resignModal) return;
    setResigning(true);
    try {
      if (resignModal.isPrimary) {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: resignModal.clubId, p_is_primary: true });
        if (error) throw error;
        toast.success('Permohonan keluar kelab Akademik dihantar untuk kelulusan Penasihat.');
      } else {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: resignModal.clubId, p_is_primary: false });
        if (error) throw error;
        toast.success('Berjaya menarik diri daripada kelab.');
      }
      setResignModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses penarikan diri.');
    } finally {
      setResigning(false);
    }
  };

  const isJoinable = (club: any) => {
    if (club.short_name?.toUpperCase() === 'GEOSAS') {
      return profile?.department === 'awam';
    }
    const cat = club.category || '';
    if (AUTO_ASSIGN_CATEGORIES.some(c => cat.toLowerCase() === c.toLowerCase())) return false;
    if (RESTRICTED_CATEGORIES.some(c => cat.toLowerCase() === c.toLowerCase())) return false;
    return true;
  };

  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        club.name.toLowerCase().includes(q) ||
        (club.short_name && club.short_name.toLowerCase().includes(q));

      if (activeTab === 'Semua') return matchesSearch;

      const catLower = (club.category || '').toLowerCase();
      const tabLower = activeTab.toLowerCase();

      // Normalisasi padanan kategori
      if (tabLower === 'akademik') {
        const isAcademic = catLower.includes('akademik') || catLower === 'awam' || catLower.includes('jabatan');
        return matchesSearch && isAcademic;
      }
      if (tabLower === 'sukan') {
        return matchesSearch && catLower.includes('sukan');
      }
      if (tabLower === 'badan beruniform') {
        return matchesSearch && (catLower.includes('uniform') || catLower.includes('badan'));
      }
      if (tabLower === 'umum') {
        const isOther = !catLower.includes('akademik') && !catLower.includes('sukan') && !catLower.includes('uniform');
        return matchesSearch && isOther;
      }

      return matchesSearch && catLower.includes(tabLower);
    });
  }, [clubs, searchQuery, activeTab]);

  const myApprovedClubs = clubs.filter(c =>
    myMemberships.some(m => m.club_id === c.id && m.account_status === 'APPROVED')
  );
  const myPendingClubs = clubs.filter(c =>
    myMemberships.some(m => m.club_id === c.id && m.account_status === 'PENDING')
  );

  return (
    <div className="page-container space-y-10 pb-28 pt-6">

      {/* ── 1. HERO & SEARCH SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center space-y-5"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-tight">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t('kpp:official_student_directory', 'Direktori Rasmi Pelajar POLISAS')}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-foreground text-balance">
          {t('kpp:club_directory')}
        </h1>
        <p className="text-muted-foreground font-medium max-w-xl text-sm sm:text-base leading-relaxed text-balance">
          {t('kpp:club_directory_desc', 'Pilih dan sertai persatuan minat anda di POLISAS untuk membina kemahiran kepimpinan, jaringan sosial, dan memupuk merit kokurikulum.')}
        </p>

        {/* Had Keahlian Indicator */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card border border-border/80 shadow-sm">
          <div className="flex gap-1.5">
            {Array.from({ length: effectiveMaxClubs }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-7 h-2 rounded-full transition-colors",
                  i < approvedCount ? "bg-primary" : "bg-muted-foreground/20 dark:bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            <strong className="font-mono tabular-nums text-foreground">{approvedCount}</strong> daripada{' '}
            <strong className="font-mono tabular-nums text-foreground">{effectiveMaxClubs}</strong> {t('kpp:clubs_joined_count', 'kelab disertai')}
          </span>
        </div>

        {/* In-Page Search Bar */}
        <div className="relative w-full max-w-xl mt-2 group z-10">
          <div className="relative flex items-center bg-card border border-border/80 shadow-sm rounded-2xl overflow-hidden p-1.5 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
            <Input
              placeholder={t('kpp:search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none shadow-none text-sm sm:text-base h-11 focus-visible:ring-0 placeholder:text-muted-foreground/60 font-medium px-3"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="rounded-xl text-muted-foreground hover:text-rose-500 mr-1 shrink-0 h-9 w-9"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 2. KELAB SAYA PINNED SECTION ── */}
      {!searchQuery && activeTab === 'Semua' && myApprovedClubs.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Star className="w-4 h-4 fill-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {t('kpp:my_clubs')} ({myApprovedClubs.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myApprovedClubs.map(club => (
              <div
                key={club.id}
                onClick={() => navigate(`/kelab/${club.id}`)}
                className="group relative bg-card rounded-2xl p-4 border border-amber-500/30 hover:border-amber-500/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 overflow-hidden"
              >
                <div
                  className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm shadow overflow-hidden"
                  style={{ backgroundColor: club.theme_color || '#1e293b' }}
                >
                  {club.logo_url ? (
                    <img src={club.logo_url} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={club.short_name} />
                  ) : (
                    club.short_name?.slice(0, 2).toUpperCase() || 'K'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                    {club.name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {club.category}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 3. PERMOHONAN MENUNGGU ── */}
      {myPendingClubs.length > 0 && !searchQuery && activeTab === 'Semua' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Menunggu Kelulusan</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {myPendingClubs.map(club => (
              <Badge
                key={club.id}
                variant="outline"
                className="px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-xs flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{club.name}</span>
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 4. FILTER KATEGORI (HORIZONTAL SCROLL ON MOBILE) ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-2xl border border-border/60 max-w-full overflow-x-auto no-scrollbar mx-auto">
        {categories.map((cat) => {
          const isSelected = activeTab === cat;
          const getCategoryLabel = (c: string) => {
            switch (c) {
              case 'Semua': return t('common:all');
              case 'Akademik': return t('kpp:club_category_academic');
              case 'Sukan': return t('kpp:club_category_sports');
              case 'Umum': return t('kpp:club_category_spiritual');
              case 'Badan Beruniform': return t('kpp:club_category_uniformed');
              default: return c;
            }
          };

          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-tight whitespace-nowrap transition-all duration-200",
                isSelected
                  ? "bg-card border border-border/80 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              {cat === 'Semua' ? <LayoutGrid className="w-3.5 h-3.5" /> : null}
              {cat === 'Akademik' ? <BookOpen className="w-3.5 h-3.5" /> : null}
              {cat === 'Sukan' ? <Trophy className="w-3.5 h-3.5" /> : null}
              {cat === 'Umum' ? <Heart className="w-3.5 h-3.5" /> : null}
              {cat === 'Badan Beruniform' ? <Shield className="w-3.5 h-3.5" /> : null}
              <span>{getCategoryLabel(cat)}</span>
            </button>
          );
        })}
      </div>

      {/* ── 5. GRID KELAB (WITH REAL SKELETON LOADERS) ── */}
      {loading ? (
        <KelabSkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredClubs.map((club, index) => {
              const status = getMembershipStatus(club.id);
              const joinable = isJoinable(club);
              const meta = getCategoryMeta(club.category);
              const CategoryIcon = meta.icon;
              const isAutoAssign = AUTO_ASSIGN_CATEGORIES.some(c => club.category?.toLowerCase() === c.toLowerCase()) && club.short_name?.toUpperCase() !== 'GEOSAS';
              const isRestricted = RESTRICTED_CATEGORIES.some(c => club.category?.toLowerCase() === c.toLowerCase());

              return (
                <motion.div
                  key={club.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: index * 0.02 }}
                  className="group flex"
                >
                  <Card
                    onClick={() => navigate(`/kelab/${club.id}`)}
                    className={cn(
                      "w-full overflow-hidden cursor-pointer bg-card hover:bg-card/95 transition-all duration-300 rounded-3xl border flex flex-col relative",
                      status === 'APPROVED' ? "border-emerald-500/40 shadow-sm hover:border-emerald-500/70" :
                        status === 'PENDING' ? "border-amber-500/40 shadow-sm hover:border-amber-500/70" :
                          "border-border/70 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <CardContent className="p-6 flex flex-col flex-1 relative">
                      
                      {/* Status badge top right */}
                      <div className="absolute top-5 right-5 flex flex-col gap-1.5 items-end z-10">
                        {status === 'APPROVED' && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('kpp:club_status_active')}
                          </div>
                        )}
                        {status === 'PENDING' && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> {t('kpp:report_status_submitted')}
                          </div>
                        )}
                      </div>

                      {/* Logo Area */}
                      <div className="mb-4 relative z-10">
                        <div className="relative w-14 h-14">
                          <div
                            className="absolute inset-0 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundColor: club.theme_color || '#1e293b' }}
                          />
                          <div
                            className="relative w-full h-full rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden border border-white/10"
                            style={{ backgroundColor: club.theme_color || '#1e293b' }}
                          >
                            {club.logo_url ? (
                              <img src={club.logo_url} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={club.short_name} />
                            ) : (
                              club.short_name?.slice(0, 2).toUpperCase() || 'K'
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="space-y-2 flex-1 relative z-10">
                        <div className="flex items-center gap-1.5">
                          <CategoryIcon className={cn("w-3.5 h-3.5", meta.color)} />
                          <span className={cn("font-bold text-xs uppercase tracking-wide", meta.color)}>
                            {club.category || 'Kelab'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                          {club.name}
                        </h3>
                        {club.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed text-pretty">
                            {club.description}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 italic">
                            Tiada penerangan rasmi kelab.
                          </p>
                        )}
                      </div>

                      {/* Bottom-Pinned Actions Area */}
                      <div className="mt-6 pt-4 border-t border-border/40 flex gap-2 relative z-20" onClick={e => e.stopPropagation()}>
                        {status === 'APPROVED' && (() => {
                          const membership = myMemberships.find(m => m.club_id === club.id);
                          if (membership?.role && membership.role !== 'CLUB_MEMBER') {
                            return (
                              <Badge className="flex-1 justify-center h-9 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 shadow-none">
                                {membership.role.replace('CLUB_', '')}
                              </Badge>
                            );
                          }
                          if (membership?.is_primary) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResignModal({ clubId: club.id, clubName: club.name, isPrimary: true });
                                }}
                                className="flex-1 h-9 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/20"
                              >
                                {t('kpp:request_transfer', 'Mohon Pindah')}
                              </Button>
                            );
                          }
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setResignModal({ clubId: club.id, clubName: club.name, isPrimary: false });
                              }}
                              className="flex-1 h-9 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/20"
                            >
                              {t('kpp:leave_club', 'Tarik Diri daripada Kelab')}
                            </Button>
                          );
                        })()}

                        {joinable && status === 'none' && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleApply(club); }}
                            disabled={applying === club.id}
                            className="flex-1 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            {applying === club.id ? t('common:loading') : t('kpp:join_club')}
                          </Button>
                        )}

                        {isAutoAssign && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Auto-Assign
                          </div>
                        )}

                        {isRestricted && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-bold bg-muted text-muted-foreground border border-border">
                            <Shield className="w-3.5 h-3.5 mr-1.5" /> Keahlian Terhad
                          </div>
                        )}

                        {!joinable && club.short_name?.toUpperCase() === 'GEOSAS' && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                            <X className="w-3.5 h-3.5 mr-1.5" /> Khas JKA
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── 6. EMPTY SEARCH RESULT ── */}
      {filteredClubs.length === 0 && !loading && (
        <div className="py-16 text-center space-y-3 bg-card rounded-3xl border border-dashed border-border/80 p-8 max-w-md mx-auto">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <h3 className="font-bold text-lg tracking-tight text-foreground">{t('kpp:no_clubs_found', 'Tiada Kelab Ditemui')}</h3>
          <p className="font-normal text-xs text-muted-foreground leading-relaxed">
            Tiada kelab yang sepadan dengan carian "{searchQuery}". Sila semak ejaan nama atau pilih tab kategori lain.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveTab('Semua'); }} className="rounded-xl mt-2 text-xs font-semibold">
            {t('kpp:clear_search', 'Kosongkan Carian')}
          </Button>
        </div>
      )}

      {/* ── 7. DIALOG PENGESAHAN PERMOHONAN SERTAI KELAB ── */}
      <Dialog open={!!confirmClub} onOpenChange={(open) => { if (!open) { setConfirmClub(null); setApplyRole('CLUB_MEMBER'); } }}>
        <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl tracking-tight">{t('kpp:apply_join_club', 'Mohon Sertai Kelab')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('kpp:apply_join_desc', 'Hantar permohonan pendaftaran keahlian kepada pihak pengurusan kelab.')}
            </DialogDescription>
          </DialogHeader>

          {confirmClub && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3.5 p-3.5 bg-muted/40 rounded-2xl border border-border/60">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow overflow-hidden shrink-0"
                  style={{ backgroundColor: confirmClub.theme_color || '#1e293b' }}
                >
                  {confirmClub.logo_url ? (
                    <img src={confirmClub.logo_url} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={confirmClub.short_name} />
                  ) : (
                    confirmClub.short_name?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{confirmClub.name}</p>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">{confirmClub.category}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">{t('kpp:application_role_type', 'Jenis Permohonan Peranan')}</Label>
                <Select value={applyRole} onValueChange={(r: UserRole) => setApplyRole(r)}>
                  <SelectTrigger className="h-11 rounded-xl bg-card border-border/80 font-medium w-full text-xs">
                    <SelectValue placeholder="Pilih peranan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/80 shadow-xl">
                    <SelectItem value="CLUB_MEMBER" className="font-semibold text-xs py-2">
                      {t('kpp:role_member_standard', 'Ahli Biasa (Keahlian Standard)')}
                    </SelectItem>
                    <SelectItem value="CLUB_PRESIDENT" className="font-semibold text-xs py-2">
                      {t('kpp:role_president_leadership', 'Presiden / Kepimpinan (Tertakluk Temuduga & Kelulusan JPP)')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('kpp:membership_review_note', 'Permohonan keahlian biasa akan disemak oleh Majlis Tertinggi kelab. Permohonan kepimpinan akan disaring oleh pihak Exco KPP JPP POLISAS.')}
                </p>
              </div>

              <p className="text-xs text-muted-foreground font-medium">
                Status kuota: <span className="font-mono tabular-nums text-foreground">{approvedCount}</span> / <span className="font-mono tabular-nums text-foreground">{effectiveMaxClubs}</span> kelab aktif digunakan.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setConfirmClub(null); setApplyRole('CLUB_MEMBER'); }}
              className="rounded-xl font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={confirmApply}
              disabled={!!applying}
              className="rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {applying ? (t('common:loading') || 'Menghantar...') : t('kpp:submit_application', 'Hantar Permohonan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. DIALOG PENGESAHAN TARIK DIRI / MOHON PINDAH ── */}
      <Dialog open={!!resignModal} onOpenChange={(open) => { if (!open) setResignModal(null); }}>
        <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              {resignModal?.isPrimary ? t('kpp:request_transfer', 'Mohon Pindah Kelab Akademik') : t('kpp:leave_club', 'Tarik Diri daripada Kelab')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {resignModal?.isPrimary
                ? 'Kelab akademik adalah wajib mengikut jabatan pengajian anda. Permohonan pindah memerlukan kelulusan rasmi daripada Penasihat Kelab.'
                : `Adakah anda pasti ingin menarik diri serta-merta daripada "${resignModal?.clubName}"? Rekod merit aktiviti berkaitan kelab ini akan terkesan.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setResignModal(null)}
              className="rounded-xl font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleResign}
              disabled={resigning}
              className="rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {resigning ? 'Memproses...' : (resignModal?.isPrimary ? 'Hantar Permohonan Pindah' : 'Sahkan Tarik Diri')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── SKELETON COMPONENT UNTUK LOAD STATE YANG KEMAS ──
function KelabSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-border/60 bg-card p-6 flex flex-col justify-between h-[270px] animate-pulse"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted/60" />
              <div className="h-3 w-2/3 rounded bg-muted/60" />
            </div>
          </div>
          <div className="h-9 w-full rounded-xl bg-muted/80 mt-6" />
        </div>
      ))}
    </div>
  );
}