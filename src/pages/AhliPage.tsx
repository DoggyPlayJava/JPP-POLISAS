import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Mail, MoreVertical, Trash2, Check, X, Clock, Users, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MeritAssigner } from '@/components/ui/MeritAssigner';
import { ClubMember, ROLE_LABELS, ROLE_COLORS, ALL_CLUBS, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1 } };

// ─── HELPER: Tentukan peranan yang boleh ditetapkan oleh actor ───────────────
function getAllowedRoles(actorRole: string, targetCurrentRole: string): string[] {
  // JPP boleh ubah semua
  if (actorRole === 'SUPER_ADMIN_JPP' || actorRole === 'ADMIN' || actorRole === 'JPP') {
    return ['CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER', 'CLUB_ADVISOR'];
  }
  // Penasihat boleh ubah: PRESIDEN, MT, AHLI (tidak boleh ubah penasihat lain / JPP)
  if (actorRole === 'CLUB_ADVISOR' || actorRole === 'PENASIHAT') {
    const manageable = ['CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER'];
    if (!manageable.includes(targetCurrentRole)) return []; // Tidak boleh ubah
    return manageable;
  }
  // Presiden boleh ubah: MT dan AHLI sahaja
  if (actorRole === 'CLUB_PRESIDENT' || actorRole === 'PRESIDEN') {
    const manageable = ['CLUB_MT', 'CLUB_MEMBER'];
    if (!manageable.includes(targetCurrentRole)) return []; // Tidak boleh ubah presiden/penasihat
    return manageable;
  }
  // MT, Ahli: tiada kebenaran
  return [];
}

export function AhliPage() {
  const { user, profile, isSuperAdmin, isPresident, effectiveRole, selectedClubId } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kickReason, setKickReason] = useState('');
  const [kickingMember, setKickingMember] = useState<any | null>(null);

  const load = async () => {
    if (!user || !profile) return;
    try {
      setIsLoading(true);
      const targetClubId = selectedClubId ?? profile.club_id;
      
      let query = supabase.from('student_club_memberships')
        .select(`
          *,
          profiles(
            id, full_name, matric_no, email, avatar_url
          )
        `);

      if (targetClubId) {
        query = query.eq('club_id', targetClubId);
      }

      if (search.trim()) {
        query = query.ilike('profiles.full_name', `%${search.trim()}%`);
      }

      // Ambil SEMUA status (termasuk PENDING) — jangan filter di sini, biar UI yang filter
      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        toast.error(`Ralat Supabase: ${error.message}`);
        throw error;
      }

      // Mapped to look like profiles for the UI
      // PENTING: m.id = membership row id, m.profiles.id = user's profiles.id (= user_id)
      const mapped = (data || []).filter(m => m.profiles).map(m => ({
        ...m.profiles,
        // id di sini adalah profiles.id (digunakan sebagai user_id dalam handleStatusAction)
        id: m.profiles!.id,
        membership_id: m.id,       // ID row student_club_memberships
        club_id: m.club_id,
        role: m.role,
        account_status: m.account_status,
        is_primary: m.is_primary,
      }));
      
      setMemberships(mapped);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch bila search berubah. Guna debouncing logik (useEffect trigger)
  useEffect(() => { 
    const timeout = setTimeout(() => {
      load();
    }, 400); // 400ms debounce
    return () => clearTimeout(timeout);
  }, [user, profile, search, selectedClubId]);

  // Real-time listener untuk kemaskini UI tanpa refresh page
  useEffect(() => {
    const targetClubId = selectedClubId ?? profile?.club_id;
    if (!targetClubId) return;

    const channel = supabase.channel(`ahli_page_changes_${targetClubId}_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_club_memberships',
        filter: `club_id=eq.${targetClubId}`
      }, (payload) => {
        console.log("🔄 Realtime: Members list updated by another user/process", payload);
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClubId, profile?.club_id]);

  // ✅ FUNGSI LULUS / TOLAK / RESIGN
  const handleStatusAction = async (userId: string, clubId: string, status: 'APPROVED' | 'REJECTED' | 'KICKED') => {
    try {
      let updateData: any = { account_status: status };
      
      if (status === 'REJECTED' || status === 'KICKED') {
        const reason = status === 'KICKED' ? kickReason : 'Permohonan ditolak/Keluar dibenarkan';
        if (status === 'KICKED' && !kickReason.trim()) {
          toast.error('Sila nyatakan alasan pembuangan.');
          return;
        }

        // Tulis log keselamatan
        await supabase.from('club_logs').insert({
          club_id: clubId,
          action_type: 'MEMBER_KICKED',
          actor_id: profile?.id,
          actor_name: profile?.full_name,
          description: `Telah membuang ahli. Alasan: ${reason}`,
          metadata: { target_user_id: userId }
        });
        
        // Padam keahlian terus jika dibuang atau direject permohonan baru
        const { error: delErr } = await supabase.from('student_club_memberships')
          .delete()
          .eq('user_id', userId)
          .eq('club_id', clubId);
        if (delErr) throw delErr;

        // Jika mereka ditolak permohonan, pastikan akaun utama mereka dibuka semula sebagai ahli biasa
        if (status === 'REJECTED') {
          const { error: profErr } = await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);
          if (profErr) throw profErr;
        }
          
      } else {
        // Luluskan
        const { error: updErr } = await supabase.from('student_club_memberships')
          .update(updateData)
          .eq('user_id', userId)
          .eq('club_id', clubId);
        if (updErr) throw updErr;
          
        // Buka pintu untuk pengguna ini memandangkan mereka dah diluluskan
        await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);

        // ✅ FIX: Sync profiles.role jika kelab ini adalah primary club user
        // Semak dulu sama ada ini primary club & apa role yang dimohon
        const { data: membershipInfo } = await supabase
          .from('student_club_memberships')
          .select('role, is_primary')
          .eq('user_id', userId)
          .eq('club_id', clubId)
          .single();
        
        if (membershipInfo?.is_primary && membershipInfo?.role) {
          await supabase.from('profiles')
            .update({ role: membershipInfo.role })
            .eq('id', userId);
        }
      }

      // Hantar Notifikasi kepada Pengguna Sendiri
      const clubName = ALL_CLUBS.find(c => c.id === clubId)?.name || 'Kelab tersebut';
      const notifTitle = status === 'APPROVED' ? 'Permohonan Diluluskan' : (status === 'REJECTED' ? 'Permohonan Ditolak' : 'Keahlian Dibatalkan');
      const notifMsg = status === 'APPROVED' 
          ? `Tahniah! Permohonan anda untuk menyertai ${clubName} telah diluluskan.`
          : (status === 'REJECTED' 
              ? `Dukacita dimaklumkan permohonan anda untuk menyertai ${clubName} telah ditolak.` 
              : `Keahlian anda dalam ${clubName} telah disingkirkan/ditarik balik.${kickReason ? ` Sebab: ${kickReason}` : ''}`);

      const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: userId,
          title: notifTitle,
          message: notifMsg,
          type: 'SYSTEM',
          is_read: false
      });
      if (notifErr) console.error("Gagal hantar notifikasi pengguna:", notifErr);

      toast.success(status === 'APPROVED' ? 'Tindakan berjaya!' : 'Ahli/Permohonan telah disingkirkan.');
      setKickingMember(null);
      setKickReason('');
      load();
    } catch {
      toast.error('Operasi gagal.');
    }
  };

  // ✅ FUNGSI TUKAR PERANAN — guna RPC untuk server-side role guard (CRIT-1 fix)
  const handleRoleChange = async (userId: string, clubId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('change_member_role', {
        p_actor_id: user?.id,
        p_target_id: userId,
        p_club_id: clubId,
        p_new_role: newRole,
      });

      if (error) {
        toast.error('Gagal tukar peranan: ' + error.message);
        return;
      }
      toast.success('Peranan berjaya dikemaskini!');
      load();
    } catch (e: any) {
      toast.error('Ralat tidak dijangka: ' + e.message);
    }
  };

  const clubName = profile?.club_id ? ALL_CLUBS.find(c => c.id === profile.club_id)?.name : 'Semua Kelab';

  // Tapis data untuk tab
  const CLUB_ROLES = ['CLUB_MEMBER', 'CLUB_MT', 'CLUB_PRESIDENT', 'CLUB_ADVISOR'];
  const pendingMembers = memberships.filter(m => {
    const isPending = m.account_status === 'PENDING' || m.account_status === 'RESIGN_PENDING';
    if (!isPending || !CLUB_ROLES.includes(m.role)) return false;

    // SUPER_ADMIN_JPP sahaja boleh approve Penasihat & Presiden
    if (m.role === 'CLUB_PRESIDENT' || m.role === 'CLUB_ADVISOR') {
      return effectiveRole === 'SUPER_ADMIN_JPP' || effectiveRole === 'JPP' || effectiveRole === 'ADMIN';
    }
    
    // Jawatan lain, JPP, Presiden dan Penasihat boleh approve
    return effectiveRole === 'SUPER_ADMIN_JPP' || effectiveRole === 'JPP' || effectiveRole === 'ADMIN' || 
           effectiveRole === 'CLUB_PRESIDENT' || effectiveRole === 'PRESIDEN' || 
           effectiveRole === 'CLUB_ADVISOR' || effectiveRole === 'PENASIHAT';
  });
  const approvedMembers = memberships.filter(m =>
    m.account_status === 'APPROVED'
  );

  return (
    <div className="page-container space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/12 text-accent border-none">
          {clubName} · {approvedMembers.length} Ahli Aktif
        </Badge>
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter gradient-text leading-none">Pengurusan Ahli</h1>
            <p className="text-muted-foreground font-medium leading-relaxed text-sm sm:text-base max-w-xl">
              Urus permohonan pendaftaran baru dan senarai jawatankuasa sedia ada untuk kelab anda.
            </p>
          </div>
          {(effectiveRole === 'CLUB_PRESIDENT' || effectiveRole === 'CLUB_ADVISOR' || effectiveRole?.includes('JPP')) && (
             <Button onClick={() => navigate('/urus-kelab')} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-[11px] uppercase tracking-widest px-8 h-12 shadow-xl shadow-primary/20 shrink-0">
               <UserPlus className="w-4 h-4 mr-2" /> Urus Jawatankuasa
             </Button>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="senarai" className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-2xl mb-8 border border-border/50 shadow-inner flex-nowrap overflow-x-auto no-scrollbar justify-start sm:justify-start w-full sm:w-fit h-auto">
          <TabsTrigger value="senarai" className="rounded-xl px-6 sm:px-8 py-3 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap">
            Senarai Jawatankuasa
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl px-6 sm:px-8 py-3 font-black text-[10px] uppercase tracking-widest transition-all relative whitespace-nowrap">
            Permohonan Baru
            {pendingMembers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white flex items-center justify-center rounded-full text-[10px] animate-bounce border-2 border-background">
                {pendingMembers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SENARAI AHLI (GRID ASAL ANDA) ── */}
        <TabsContent value="senarai" className="space-y-8">
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
            <Input
              placeholder="Cari nama atau jawatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 text-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-20 text-center animate-pulse font-black uppercase tracking-widest opacity-20 text-xs">Menyusun Data...</div>
          ) : approvedMembers.length === 0 ? (
            <Empty className="py-20 rounded-[3rem] border-dashed border-2 bg-muted/30">
              <EmptyMedia variant="icon">
                <Users className="w-8 h-8" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle className="text-sm font-black uppercase tracking-widest">Tiada Ahli Ditemui</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Carian anda tidak memadankan mana-mana ahli berdaftar atau tersenarai.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {approvedMembers.map((m: any) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isPresident={isPresident}
                  onRefresh={load}
                  actorRole={effectiveRole}
                  onRoleChange={(userId, newRole) => handleRoleChange(userId, m.club_id, newRole)}
                  onKick={() => setKickingMember(m)}
                />
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ── TAB 2: PERMOHONAN BARU (LIST KELULUSAN) ── */}
        <TabsContent value="pending">
          {pendingMembers.length === 0 ? (
            <Empty className="py-24 rounded-[3rem] border-dashed border-2 bg-card shadow-sm">
              <EmptyMedia variant="icon">
                <Clock className="w-8 h-8" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle className="text-sm font-black uppercase tracking-widest">Tiada Permohonan Baru</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Semua permohonan pendaftaran telah disemak buat masa ini.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMembers.map((m: any) => (
                <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="bento-card border-none overflow-hidden relative">
                    <div className="h-1.5 w-full bg-amber-400 absolute top-0 left-0" />
                    <CardContent className="p-6 pt-8">
                      <div className="flex items-center gap-4 mb-6">
                        <Avatar className="h-14 w-14 rounded-2xl border-4 border-background shadow-lg">
                          <AvatarFallback className="bg-amber-500/10 text-amber-600 font-black text-lg">{m.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-black text-base leading-tight">{m.full_name}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            {m.account_status === 'RESIGN_PENDING' ? 'MOHON BERHENTI' : m.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {m.account_status === 'RESIGN_PENDING' ? (
                          <>
                            {/* m.id = profiles.id = user_id yang betul untuk handleStatusAction */}
                            <Button onClick={() => handleStatusAction(m.id, m.club_id, 'KICKED')} className="flex-1 bg-amber-500 hover:bg-amber-500/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest h-10">
                              Luluskan Berhenti
                            </Button>
                            <Button onClick={() => handleStatusAction(m.id, m.club_id, 'APPROVED')} variant="ghost" className="bg-slate-100/50 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest h-10">
                              Batal
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => handleStatusAction(m.id, m.club_id, 'APPROVED')} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest h-10">
                              <Check className="w-3.5 h-3.5 mr-2" /> Lulus
                            </Button>
                            <Button onClick={() => handleStatusAction(m.id, m.club_id, 'REJECTED')} variant="ghost" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest h-10">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Tendang Ahli */}
      <Dialog open={!!kickingMember} onOpenChange={() => { setKickingMember(null); setKickReason(''); }}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-black text-rose-600 text-xl flex items-center gap-2">
              <Trash2 className="w-6 h-6" /> Buang Ahli
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Anda pasti mahu membuang <strong>{kickingMember?.full_name}</strong> dari kelab ini? Tindakan ini akan direkodkan. Sila nyatakan alasan pembuangan:
            </p>
            <Input 
              value={kickReason} 
              onChange={e => setKickReason(e.target.value)} 
              placeholder="Cth: Bertukar Politeknik / Masalah Disiplin" 
              className="bg-muted/40 font-medium h-12 rounded-xl"
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
             <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setKickingMember(null)}>Batal</Button>
             <Button variant="destructive" className="rounded-xl font-bold" onClick={() => handleStatusAction(kickingMember?.id, kickingMember?.club_id, 'KICKED')}>Ya, Buang Ahli</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberCard({ member: m, isPresident, onRefresh, actorRole, onRoleChange, onKick }: {
  member: any; isPresident: boolean; onRefresh: () => void;
  actorRole: string; onRoleChange: (userId: string, newRole: string) => void;
  onKick: () => void;
}) {
  const displayName = m.full_name ?? m.email ?? '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const [isMeritOpen, setIsMeritOpen] = React.useState(false);
  const allowedRoles = getAllowedRoles(actorRole, m.role || '');
  const canChangeRole = allowedRoles.length > 0;
  // Boleh buang ahli biasa jika kita ialah presiden atau penasihat. (JPP juga boleh asalkan bukan JPP)
  const canKick = (actorRole === 'CLUB_PRESIDENT' || actorRole === 'CLUB_ADVISOR' || actorRole.includes('JPP')) && m.role === 'CLUB_MEMBER';

  return (
    <motion.div variants={item} whileHover={{ y: -4 }} className="group">
      <Card className="bento-card border-none h-full overflow-hidden relative bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-5">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-4 border-background shadow-xl ring-2 ring-border/20 group-hover:scale-105 transition-all">
              <AvatarImage src={(m as any).avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=8B1A1A&textColor=FFF8F0`} />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-background mt-2 shadow-sm" />
          </div>

          <div className="space-y-1 mb-4">
            <h3 className="font-black text-base tracking-tight leading-tight truncate">{displayName}</h3>
            <Badge className={cn('text-[9px] font-black uppercase tracking-wide px-2 py-0.5 border-none', ROLE_COLORS[m.role])}>
              {ROLE_LABELS[m.role]}
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-muted/40 border border-border/30 overflow-hidden mb-4">
            {m.matric_no && (
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{m.matric_no}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <span className="text-[10px] font-medium truncate text-muted-foreground/60">{m.email}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
             <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-black">
               {(m as any).merit || 0} PTS
             </div>
             {isPresident && (
               <Button onClick={() => setIsMeritOpen(true)} variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                 + Tambah Merit
               </Button>
             )}
          </div>

          {/* ── TUKAR PERANAN & KICK (Hanya papar jika ada kebenaran) ── */}
          {(canChangeRole || canKick) && (
            <div className="pt-3 border-t border-border/30 flex flex-col gap-2">
              {canChangeRole && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">
                    Tukar Peranan
                  </p>
                  <Select
                    value={(m as any).role || ''}
                    onValueChange={(newRole) => onRoleChange(m.id, newRole)}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-border/40 bg-muted/30 font-bold text-xs focus:ring-primary/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl">
                      {allowedRoles.map(r => (
                        <SelectItem key={r} value={r} className="rounded-xl font-bold text-xs">
                          {ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canKick && (
                <Button variant="ghost" size="sm" onClick={onKick} className="h-9 w-full text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Buang Ahli
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {isPresident && <MeritAssigner member={m} isOpen={isMeritOpen} onClose={() => setIsMeritOpen(false)} onRefresh={onRefresh} />}
    </motion.div>
  );
}