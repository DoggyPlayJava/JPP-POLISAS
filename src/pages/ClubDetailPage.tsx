import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Activity, FileText, ExternalLink, Calendar, ShieldCheck, Award, Lock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/StatusChip';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getContrastColor } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function ClubDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user, isSuperAdmin, userClubIds, primaryClubId, refetchProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [committee, setCommittee] = useState<any[]>([]); // Unified members
  const [activities, setActivities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [clubRes, commRes, actsRes, docsRes, profilesRes, membershipRes] = await Promise.all([
          supabase.from('clubs').select('*').eq('id', id).single(),
          supabase.from('club_committee').select('*').eq('club_id', id).order('order_index', { ascending: true }),
          supabase.from('club_activities').select('id, title, status, created_at').eq('club_id', id).order('created_at', { ascending: false }).limit(5),
          supabase.from('club_reports').select('id').eq('club_id', id).limit(10),
          supabase.from('profiles').select('full_name, avatar_url, role').eq('club_id', id),
          // Ambil KESEMUA ahli yang dah APPROVED (bermaksud ahli kelab yang sah)
          supabase.from('student_club_memberships')
            .select('user_id, role, profiles!inner(full_name, avatar_url)')
            .eq('club_id', id)
            .eq('account_status', 'APPROVED')
        ]);

        if (clubRes.error) throw clubRes.error;

        // 🔥 LOGIK GABUNGAN MEMBERSHIP SEBENAR + OVERRIDES (MT/EXCO titles)
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

            // Jika dia MT/Presiden, kita cek club_committee table untuk specific tajuk, kalau takde guna default
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

        // Susun: Presiden -> MT -> EXCO -> AHLI
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
        setDocuments(docsRes.data || []);
      } catch (error) { console.error("Ralat data:", error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, [id]);

  if (loading) return <div className="p-32 text-center font-black animate-pulse opacity-20 uppercase tracking-[0.4em]">Menyusun Profil...</div>;
  if (!club) return <div className="p-20 text-center"><h2 className="text-3xl font-black opacity-30">Kelab Tiada</h2></div>;

  const isOwnClub = userClubIds?.includes(club?.id);
  const isPrimary = primaryClubId === club?.id;
  const canSeePrivateData = isSuperAdmin || isOwnClub;
  
  const mtMembers = committee.filter(m => m.category === 'MT');
  const excoMembers = committee.filter(m => m.category === 'EXCO');
  const ahliBiasa = committee.filter(m => m.category === 'AHLI');

  const handleLeaveClub = async () => {
    if (!user) return;
    if (isPrimary) {
      if (!window.confirm('Kelab Akademik tidak boleh dibuang terus. Teruskan mohon keluar supaya Penasihat meluluskannya?')) return;
      const toastId = toast.loading('Menghantar permohonan keluar...');
      try {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: club.id, p_is_primary: true });
        if (error) throw error;
        toast.success('Permohonan keluar dihantar. Sila tunggu kelulusan.', { id: toastId });
        refetchProfile();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghantar permohonan', { id: toastId });
      }
    } else {
      if (!window.confirm(`Anda pasti mahu tarik diri dari kelab ${club.name}? Tindakan ini serta-merta.`)) return;
      const toastId = toast.loading('Memproses penarikan diri...');
      try {
        const { error } = await supabase.rpc('request_leave_club', { p_club_id: club.id, p_is_primary: false });
        if (error) throw error;
        toast.success('Anda telah berjaya keluar dari kelab ini.', { id: toastId });
        refetchProfile();
        setTimeout(() => navigate('/dashboard'), 1500);
      } catch (err: any) {
        toast.error(err.message || 'Gagal menarik diri', { id: toastId });
      }
    }
  };

  // 🔥 TENTUKAN WARNA TULISAN HEADER
  const headerTextColor = getContrastColor(club.theme_color || '#0f172a');

  return (
    <div className="page-container space-y-12 pb-24">
      {/* ── HEADER (Warna Pintar) ── */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative p-12 md:p-24 rounded-[4rem] shadow-2xl overflow-hidden group"
        style={{ backgroundColor: club.theme_color || '#0f172a' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none rotate-12 transition-transform duration-1000 group-hover:rotate-45 group-hover:scale-110"><ShieldCheck className="w-[30rem] h-[30rem] text-white" /></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-16">
          <motion.div 
            whileHover={{ y: -10, rotate: -2 }}
            className="w-56 h-56 rounded-[3.5rem] bg-white/10 backdrop-blur-2xl border-4 border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl hover:border-white/40 transition-all duration-500">
            {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-cover" alt={club.name} /> : <span className="text-7xl font-black">{club.short_name?.slice(0, 2)}</span>}
          </motion.div>
          <div className="text-center md:text-left space-y-6 pt-4">
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <Badge className="bg-white/20 text-inherit border-none uppercase tracking-[0.2em] text-[10px] font-black px-6 py-2 backdrop-blur-md rounded-full">{club.category}</Badge>
              <Badge className="bg-black/20 text-inherit border-none text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full">Sesi 2025/2026</Badge>
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-4" style={{ color: headerTextColor }}>
              {club.name}
            </h1>
            <p className="font-medium opacity-80 text-base md:text-xl max-w-3xl leading-relaxed italic" style={{ color: headerTextColor }}>
              "{club.description || `Menerajui aktiviti berkualiti di Polisas.`}"
            </p>
            {isOwnClub && !isSuperAdmin && (
              <div className="pt-2">
                <Button variant="destructive" onClick={handleLeaveClub} className="rounded-full font-black text-[11px] uppercase tracking-widest px-8 shadow-xl bg-rose-500 hover:bg-rose-600 text-white border-none">
                  <LogOut className="w-4 h-4 mr-2" /> Keluar Kelab
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
        <StatItem label="Jumlah Ahli Aktif" val={committee.length} icon={Users} color="text-primary" />
        <StatItem label="Aktiviti Berdaftar" val={activities.length} icon={Activity} color="text-emerald-500" />
        <StatItem label="Barisan MT/Exco" val={mtMembers.length + excoMembers.length} icon={ShieldCheck} color="text-blue-500" />
        <StatItem label="Ranking Kelab" val="#4" icon={Award} color="text-amber-500" />
      </div>

      {/* ── GRID ORGANISASI ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-4"><Award className="w-4 h-4" /> Majlis Tertinggi</h3>
            {mtMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mtMembers.map(member => (
                    <Card key={member.user_id} className="bento-card border-none bg-card shadow-sm hover:translate-x-1 transition-all">
                    <CardContent className="p-6 flex items-center gap-5">
                        <Avatar className="w-14 h-14 rounded-2xl border-none shadow-md">
                        <AvatarImage src={member.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-black text-sm">{member.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{member.position_title}</p>
                        <h4 className="font-black text-foreground text-sm truncate">{member.full_name}</h4>
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="p-10 text-center border-2 border-dashed rounded-[2rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Tiada rekod Majlis Tertinggi</p>
                </div>
            )}
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-4"><Users className="w-4 h-4" /> Barisan Exco</h3>
            {excoMembers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {excoMembers.map(member => (
                    <div key={member.user_id} className="p-6 rounded-[2.5rem] bg-card border border-border text-center hover:shadow-xl transition-all flex flex-col items-center gap-4 group">
                    <Avatar className="w-12 h-12 rounded-xl border-none shadow-inner group-hover:scale-110 transition-transform">
                        <AvatarImage src={member.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground/40 font-black text-[10px]">{member.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{member.position_title}</p>
                        <h4 className="font-black text-[11px] leading-tight line-clamp-2">{member.full_name}</h4>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="p-10 text-center border-2 border-dashed rounded-[2rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Tiada rekod Exco dikesan</p>
                </div>
            )}
          </section>

          <section className="space-y-6 pt-10">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-4"><Users className="w-4 h-4" /> Senarai Ahli Biasa</h3>
            {ahliBiasa.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {ahliBiasa.map(member => (
                    <div key={member.user_id} className="p-4 rounded-3xl bg-muted/20 border border-border text-center hover:opacity-100 opacity-70 hover:shadow-md hover:bg-card transition-all flex flex-col items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-[1rem] border-none shadow-sm">
                        <AvatarImage src={member.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground/40 font-black text-[10px]">{member.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                        <h4 className="font-black text-[10px] leading-none line-clamp-2 uppercase tracking-tighter">{member.full_name}</h4>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="p-10 text-center border-2 border-dashed rounded-[2rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Tiada Ahli Biasa</p>
                </div>
            )}
          </section>
        </div>

        {/* ── PRIVASI AKTIVITI/DOKUMEN ── */}
        <div className="space-y-8">
          {canSeePrivateData ? (
              <Card className="bento-card border-none overflow-hidden bg-card shadow-2xl">
                <CardHeader className="bg-primary/5 p-8 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                        <Activity className="text-primary" size={24} /> Jejak Aktiviti
                      </CardTitle>
                      <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest mt-1">Garis Masa Program Terkini</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted-foreground/10">
                    {activities.length === 0 ? (
                      <p className="text-center py-10 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Tiada rekod aktiviti setakat ini.</p>
                    ) : activities.map((act, i) => (
                      <div key={act.id} className="relative pl-10 group">
                        <div className={cn(
                          "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-background shadow-sm z-10 transition-transform group-hover:scale-125",
                          act.status === 'selesai' ? "bg-emerald-500" : act.status === 'aktif' ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                        )} />
                        <div className="p-5 rounded-[1.5rem] bg-muted/20 border border-border/50 hover:bg-card hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <h4 className="font-black text-xs tracking-tight group-hover:text-primary transition-colors">{act.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                <Calendar size={12} />
                                {act.created_at ? format(parseISO(act.created_at), 'dd MMM yyyy') : '-'}
                              </div>
                            </div>
                            <StatusChip status={act.status} size="sm" className="shadow-sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          ) : (
            <div className="py-20 px-8 rounded-[3.5rem] bg-muted/30 border-4 border-dashed border-border flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center shadow-xl shadow-black/10"><Lock className="w-8 h-8 text-muted-foreground/40" /></div>
              <h3 className="text-xl font-black tracking-tight text-foreground uppercase">Akses Terhad</h3>
              <p className="text-xs font-bold text-muted-foreground/60 max-w-[220px] leading-loose uppercase tracking-tighter">Laporan dan dokumen hanya boleh diakses oleh Ahli Kelab & JPP.</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <Button onClick={() => navigate('/kelab')} className="rounded-full h-14 px-10 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl bg-white text-slate-950 border border-slate-200 hover:bg-slate-50 hover:scale-105 transition-all"><ArrowLeft className="w-4 h-4 mr-3" /> Kembali ke Senarai</Button>
      </div>
    </div>
  );
}

function StatItem({ label, val, icon: Icon, color }: any) {
  return (
    <div className="bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm flex flex-col items-center text-center space-y-2 group hover:shadow-lg transition-all">
      <div className={cn("w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform", color)}>
        <Icon size={20} />
      </div>
      <p className="text-3xl font-black tracking-tighter">{val}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
    </div>
  );
}