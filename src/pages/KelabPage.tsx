import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Search, Trophy, BookOpen, Heart, Shield, ArrowRight,
  X, Star, Users, CheckCircle2, Clock, Plus, Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { JOINABLE_CATEGORIES, AUTO_ASSIGN_CATEGORIES, RESTRICTED_CATEGORIES, UserRole, ROLE_LABELS } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  'AKADEMIK': { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  'Akademik': { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  'akademik': { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  'SUKAN': { icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  'Sukan': { icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  'UMUM': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  'Umum': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  'kelab_umum': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  'Badan Beruniform': { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  'BADAN BERUNIFORM': { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  'badan_beruniform': { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

export function KelabPage() {
  const navigate = useNavigate();
  const { profile, user, userClubIds, selectedClubId } = useAuth();

  const [clubs, setClubs] = useState<any[]>([]);
  const [myMemberships, setMyMemberships] = useState<any[]>([]); // dari student_club_memberships
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Semua');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [confirmClub, setConfirmClub] = useState<any | null>(null);
  const [applyRole, setApplyRole] = useState<UserRole>('CLUB_MEMBER');
  const [maxClubs, setMaxClubs] = useState(2);

  const categories = ['Semua', 'Akademik', 'Sukan', 'Umum', 'Badan Beruniform'];

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: clubData }, { data: memberData }, { data: setting }] = await Promise.all([
      supabase.from('clubs').select('*').order('name', { ascending: true }),
      supabase.from('student_club_memberships').select('*').eq('user_id', user.id),
      supabase.from('system_settings').select('value').eq('key', 'max_clubs_per_student').single(),
    ]);
    if (clubData) setClubs(clubData);
    if (memberData) setMyMemberships(memberData);
    if (setting?.value != null) setMaxClubs(Number(setting.value));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();

    // Lupuskan token pendaftaran baharu agar lawatan seterusnya kembali normal
    if (localStorage.getItem('is_new_register') === 'true') {
      localStorage.removeItem('is_new_register');
    }
  }, [load]);

  const getMembershipStatus = (clubId: string) => {
    const m = myMemberships.find(m => m.club_id === clubId || m.club_id === clubId);
    if (!m) return 'none';
    return m.account_status as 'PENDING' | 'APPROVED' | 'REJECTED';
  };

  const approvedCount = myMemberships.filter(m => m.account_status === 'APPROVED').length;
  
  const hasGeosas = myMemberships.some(m => m.account_status === 'APPROVED' && clubs.find(c => c.id === m.club_id)?.short_name?.toUpperCase() === 'GEOSAS');
  const effectiveMaxClubs = (profile?.department === 'awam' && hasGeosas) ? maxClubs + 1 : maxClubs;
  
  const isAtLimit = approvedCount >= effectiveMaxClubs;

  const handleApply = async (club: any) => {
    if (!user) return;
    const status = getMembershipStatus(club.id);
    if (status === 'APPROVED' || status === 'PENDING') return;

    const targetIsGeosas = club.short_name?.toUpperCase() === 'GEOSAS';
    
    // Semak kelayakan khusus JKA untuk GEOSAS
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

      // NOTIFY JPP ADMIN FOR LEADER APPLICATIONS
      if (applyRole === 'CLUB_PRESIDENT' || applyRole === 'CLUB_ADVISOR') {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['SUPER_ADMIN_JPP', 'ADMIN', 'JPP']);
        if (admins && admins.length > 0) {
          const notifs = admins.map(a => ({
             user_id: a.id,
             title: 'Permohonan Pimpinan Baharu (Sedia Ada)',
             message: `Terdapat satu permohonan kepimpinan baru sebagai ${applyRole === 'CLUB_PRESIDENT' ? 'Presiden' : 'Penasihat'} untuk kelab ${confirmClub.name}. Sila semak dalam tab "Permohonan Baru" di Pengurusan Ahli.`,
             type: 'SYSTEM',
             is_read: false
          }));
          const { error: notifErr } = await supabase.from('notifications').insert(notifs);
          if (notifErr) console.error("Gagal hantar notifikasi:", notifErr);
        }
      } else {
        // NOTIFY KPP EXCO FOR MEMBER PENDING APPROVAL
        try {
          const { sendNotificationToKppExco } = await import('@/lib/notifications');
          await sendNotificationToKppExco({
            title: 'Permohonan Kelab Baru',
            message: `Terdapat permohonan keahlian baru untuk kelab ${confirmClub.name}. Sila semak di panel Exco KPP.`,
            type: 'KPP_MEMBERSHIP_REQUEST',
            module: 'KPP',
            link: '/jpp/dashboard'
          });
        } catch (e) {
          console.error("Gagal hantar push notification:", e);
        }
      }

      toast.success(`Permohonan sebagai ${ROLE_LABELS[applyRole]} untuk ${confirmClub.name} telah dihantar! Tunggu kelulusan.`);
      setConfirmClub(null);
      setApplyRole('CLUB_MEMBER');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal hantar permohonan');
    } finally {
      setApplying(null);
    }
  };

  const handleResign = async (clubId: string, isPrimary: boolean) => {
    if (!user) return;
    try {
      if (isPrimary) {
        // Kelab Akademik: Mohon kelulusan Penasihat
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: clubId, p_is_primary: true });
        if (error) throw error;
        toast.success('Permohonan keluar kelab Akademik dihantar. Sila tunggu kelulusan penasihat.');
      } else {
        // Kelab Umum/Sukan: Tarik diri terus
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: clubId, p_is_primary: false });
        if (error) throw error;
        toast.success('Berjaya menarik diri dari kelab.');
      }
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menarik diri');
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

  const filteredClubs = clubs.filter(club => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.short_name && club.short_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = activeTab === 'Semua'
      ? true
      : club.category?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  const myPrimaryClub = clubs.find(c => c.id === profile?.club_id);
  const myApprovedClubs = clubs.filter(c =>
    myMemberships.some(m => m.club_id === c.id && m.account_status === 'APPROVED')
  );
  const myPendingClubs = clubs.filter(c =>
    myMemberships.some(m => m.club_id === c.id && m.account_status === 'PENDING')
  );

  return (
    <div className="page-container space-y-12 pb-20 pt-8">

      {/* ── HERO & SEARCH ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
          Cari <span className="gradient-text">Keluarga Baru</span>.
        </h1>
        <p className="text-muted-foreground font-medium max-w-lg text-sm sm:text-base">
          Terokai kelab dan persatuan Polisas. Apply kelab yang anda minati — Presiden/Penasihat akan meluluskan.
        </p>

        {/* Had Keahlian Indicator */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-muted/40 border border-border/60">
          <div className="flex gap-1.5">
            {Array.from({ length: effectiveMaxClubs }).map((_, i) => (
              <div key={i} className={cn("w-8 h-2 rounded-full transition-colors",
                i < approvedCount ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            {approvedCount}/{effectiveMaxClubs} Kelab Disertai
          </span>
        </div>

        <div className="relative w-full max-w-2xl group mt-4 z-10">
          <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-card border border-border shadow-xl rounded-full overflow-hidden p-2">
            <Search className="w-6 h-6 text-muted-foreground/40 ml-4 shrink-0" />
            <Input placeholder="Taip nama kelab (cth: Elektron, Ketema)..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none shadow-none text-base sm:text-lg h-10 sm:h-12 focus-visible:ring-0 placeholder:text-muted-foreground/30 font-medium px-4" />
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}
                className="rounded-full text-muted-foreground hover:text-rose-500 mr-2 shrink-0">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── KELAB SAYA ── */}
      {!searchQuery && activeTab === 'Semua' && myApprovedClubs.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Star className="w-4 h-4 fill-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Kelab Saya ({myApprovedClubs.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myApprovedClubs.map(club => (
              <div key={club.id} onClick={() => navigate(`/kelab/${club.id}`)}
                className="group relative bg-card rounded-[2rem] p-5 border-2 border-amber-500/20 shadow-lg hover:border-amber-500/40 transition-all cursor-pointer flex items-center gap-4 overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow overflow-hidden"
                  style={{ backgroundColor: club.theme_color || '#0f172a' }}>
                  {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-cover" alt={club.short_name} /> : club.short_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground group-hover:text-primary transition-colors">{club.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{club.category}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── PERMOHONAN MENUNGGU ── */}
      {myPendingClubs.length > 0 && !searchQuery && activeTab === 'Semua' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Menunggu Kelulusan</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {myPendingClubs.map(club => (
              <Badge key={club.id} className="px-3 py-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20 font-black text-[10px] uppercase tracking-widest">
                <Clock className="w-3 h-3 mr-1.5" />{club.name}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── FILTER KATEGORI ── */}
      <div className="flex flex-wrap justify-center gap-1.5 p-1.5 bg-muted/30 backdrop-blur-md rounded-[2rem] border border-border/40 max-w-fit mx-auto">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta?.icon || LayoutGrid;
          return (
            <button key={cat} onClick={() => setActiveTab(cat)}
              className={cn("relative flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                activeTab === cat ? "bg-card border border-border shadow-md text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent")}>
              <Icon className="w-3.5 h-3.5" />
              {cat === 'Semua' ? 'Semua' : cat}
            </button>
          );
        })}
      </div>

      {/* ── GRID KELAB ── */}
      {loading ? (
        <div className="text-center py-20 animate-pulse font-black text-xs tracking-widest uppercase opacity-30">Memuatkan...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredClubs.map((club, index) => {
              const status = getMembershipStatus(club.id);
              const joinable = isJoinable(club);
              const meta = CATEGORY_META[club.category] || { icon: LayoutGrid, color: 'text-muted-foreground', bg: 'bg-muted/30' };
              const CategoryIcon = meta.icon;
              const isAutoAssign = AUTO_ASSIGN_CATEGORIES.some(c => club.category?.toLowerCase() === c.toLowerCase()) && club.short_name?.toUpperCase() !== 'GEOSAS';
              const isRestricted = RESTRICTED_CATEGORIES.some(c => club.category?.toLowerCase() === c.toLowerCase());

              return (
                <motion.div key={club.id} layout initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }} className="group">
                  <Card 
                    onClick={() => navigate(`/kelab/${club.id}`)}
                    className={cn("h-full overflow-hidden cursor-pointer bg-card/80 backdrop-blur-sm hover:bg-card transition-all duration-500 rounded-[2rem] border",
                      status === 'APPROVED' ? "border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/5" :
                        status === 'PENDING' ? "border-amber-500/30 hover:border-amber-500/60 shadow-amber-500/5" :
                          "border-border/60 hover:border-primary/40 shadow-xl hover:shadow-2xl hover:-translate-y-1")}>
                    
                    <CardContent className="p-6 flex flex-col h-full relative">
                      {/* Subtle Background Glow based on Theme Color */}
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-[40px] pointer-events-none transition-opacity duration-500 group-hover:opacity-20"
                           style={{ backgroundColor: club.theme_color || '#0f172a' }} />

                      {/* Status badges top right */}
                      <div className="absolute top-5 right-5 flex flex-col gap-1.5 items-end z-10">
                        {status === 'APPROVED' && (
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Ahli
                          </div>
                        )}
                        {status === 'PENDING' && (
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full shadow-sm">
                            <Clock className="w-3 h-3" /> Menunggu
                          </div>
                        )}
                      </div>

                      {/* Logo Area */}
                      <div className="mb-5 relative z-10">
                        <div className="relative w-16 h-16">
                          {/* Inner glowing shadow */}
                          <div className="absolute inset-0 rounded-[1.25rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                               style={{ backgroundColor: club.theme_color || '#0f172a' }} />
                          <div className="relative w-full h-full rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-sm transition-transform duration-500 group-hover:scale-105 overflow-hidden border border-white/10"
                            style={{ backgroundColor: club.theme_color || '#0f172a' }}>
                            {club.logo_url
                              ? <img src={club.logo_url} className="w-full h-full object-cover" alt={club.short_name} />
                              : club.short_name?.slice(0, 2).toUpperCase() || 'K'}
                          </div>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="space-y-2 flex-1 relative z-10">
                        <div className="flex items-center gap-1.5">
                          <CategoryIcon className={cn("w-3.5 h-3.5", meta.color)} />
                          <span className={cn("font-bold text-[9px] uppercase tracking-[0.2em]", meta.color)}>
                            {club.category || 'Kelab'}
                          </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">
                          {club.name}
                        </h3>
                        {club.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{club.description}</p>
                        )}
                      </div>

                      {/* Explicit Actions Area (Prevent propagation to not trigger card click) */}
                      <div className="pt-6 flex gap-2 relative z-20" onClick={e => e.stopPropagation()}>
                        {status === 'APPROVED' && (() => {
                          const membership = myMemberships.find(m => m.club_id === club.id);
                          if (membership?.role !== 'CLUB_MEMBER') {
                            return (
                              <Badge className="flex-1 justify-center h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border border-emerald-500/20 shadow-sm">
                                {membership?.role?.replace('CLUB_', '')}
                              </Badge>
                            );
                          }
                          if (membership?.is_primary) {
                            return (
                              <Button size="sm" onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Anda pasti mahu memohon keluar kelab Akademik? Ini memerlukan kelulusan Penasihat.')) {
                                  handleResign(club.id, true);
                                }
                              }}
                                className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 transition-colors border border-rose-500/20 shadow-sm">
                                Mohon Pindah
                              </Button>
                            );
                          }
                          return (
                            <Button size="sm" onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tarik diri serta merta dari kelab ini? Rekod aktiviti mungkin terjejas.')) {
                                handleResign(club.id, false);
                              }
                            }}
                              className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 transition-colors border border-rose-500/20 shadow-sm">
                              Tarik Diri
                            </Button>
                          );
                        })()}

                        {joinable && status === 'none' && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApply(club); }} disabled={applying === club.id}
                            className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                            {applying === club.id ? 'Menghantar...' : 'Mohon Sertai'}
                          </Button>
                        )}

                        {isAutoAssign && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-600 border border-blue-500/20 shadow-sm">
                            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Auto-Assign
                          </div>
                        )}

                        {isRestricted && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground border border-border shadow-sm">
                            <Shield className="w-3.5 h-3.5 mr-1.5" /> Keahlian Terhad
                          </div>
                        )}

                        {!joinable && club.short_name?.toUpperCase() === 'GEOSAS' && status === 'none' && (
                          <div className="flex-1 flex items-center justify-center h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/5 text-rose-600 border border-rose-500/20 shadow-sm">
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

      {filteredClubs.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-4 opacity-40">
          <Search className="w-16 h-16 mx-auto mb-4" />
          <h3 className="font-black text-2xl tracking-tight">Tiada Kelab Ditemui</h3>
          <p className="font-medium text-sm">Cuba gunakan ejaan nama yang berbeza atau pilih kategori lain.</p>
        </motion.div>
      )}

      {/* ── DIALOG PENGESAHAN APPLY ── */}
      <Dialog open={!!confirmClub} onOpenChange={(open) => { if (!open) { setConfirmClub(null); setApplyRole('CLUB_MEMBER'); } }}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-xl tracking-tight">Mohon Sertai Kelab</DialogTitle>
          </DialogHeader>
          {confirmClub && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow overflow-hidden"
                  style={{ backgroundColor: confirmClub.theme_color || '#0f172a' }}>
                  {confirmClub.logo_url
                    ? <img src={confirmClub.logo_url} className="w-full h-full object-cover" alt={confirmClub.short_name} />
                    : confirmClub.short_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-foreground">{confirmClub.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{confirmClub.category}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Permohonan anda akan dihantar kepada <strong>MT, Presiden, atau Penasihat</strong> kelab ini untuk kelulusan. Anda akan menerima notifikasi setelah status dikemaskini.
              </p>
              
              <div className="space-y-1.5 mt-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Peranan Dipilih</Label>
                <Select value={applyRole} onValueChange={(r: UserRole) => setApplyRole(r)}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/40 border-border/60 font-medium w-full">
                    <SelectValue placeholder="Pilih peranan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60 shadow-2xl">
                     <SelectItem value="CLUB_MEMBER" className="font-bold py-2">Ahli Biasa</SelectItem>
                     <SelectItem value="CLUB_PRESIDENT" className="font-bold py-2">Presiden Kelab</SelectItem>
                     <SelectItem value="CLUB_ADVISOR" className="font-bold py-2">Penasihat Kelab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                Had keahlian: {approvedCount}/{(confirmClub.short_name?.toUpperCase() === 'GEOSAS' && profile?.department === 'awam') ? maxClubs + 1 : effectiveMaxClubs} kelab digunakan
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmClub(null); setApplyRole('CLUB_MEMBER'); }} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
              Batal
            </Button>
            <Button onClick={confirmApply} disabled={!!applying} className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary">
              {applying ? 'Menghantar...' : 'Hantar Permohonan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}