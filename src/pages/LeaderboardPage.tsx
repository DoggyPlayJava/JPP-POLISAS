import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Medal, Star, ArrowUpRight, Search, 
  TrendingUp, Activity, Award, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function LeaderboardPage() {
  const { profile, selectedClubId } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Guna selectedClubId (multi-kelab support) atau fallback ke profile.club_id
      const clubId = selectedClubId ?? profile?.club_id;
      if (!clubId) return;
      setIsLoading(true);
      
      try {
        // ARCH-4 fix: Query dari student_club_memberships JOIN profiles
        // (bukan profiles.club_id) — sokong pengguna multi-kelab
        const { data, error } = await supabase
          .from('student_club_memberships')
          .select(`
            role,
            profiles!inner(
              id, full_name, avatar_url, merit, email
            )
          `)
          .eq('club_id', clubId)
          .eq('account_status', 'APPROVED')
          .order('profiles(merit)', { ascending: false });

        if (error) throw error;

        // Normalise data — gabungkan fields membership & profile
        const mapped = (data || []).map((m: any) => ({
          ...m.profiles,
          role: m.role,
        }));
        
        setMembers(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [profile, selectedClubId]);


  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topThree = members.slice(0, 3);
  const others = filteredMembers.slice(3);

  if (isLoading) return <div className="p-20 text-center font-black opacity-20 animate-pulse">MENYUSUN RANKING...</div>;

  return (
    <div className="page-container space-y-12">
      {/* ── HERO SECTION: TOP 3 ── */}
      <section className="text-center space-y-8">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Hall of Fame
          </Badge>
          <h1 className="text-6xl font-black tracking-tighter leading-none gradient-text">
            Ranking <span className="text-primary">Merit</span>
          </h1>
          <p className="text-muted-foreground font-medium">Ahli paling aktif dan cemerlang dalam kelab anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
          {topThree.map((m, i) => {
            // Susun: i=0 (1st) => center, i=1 (2nd) => left, i=2 (3rd) => right
            const orderClass = i === 0 ? 'md:order-2' : i === 1 ? 'md:order-1' : 'md:order-3';
            const heightClass = i === 0 ? 'h-[420px]' : i === 1 ? 'h-[360px]' : 'h-[330px]';
            const medalColors = [
              'bg-amber-500/20',  // Gold - 1st
              'bg-slate-500/20',   // Silver - 2nd
              'bg-orange-500/20',  // Bronze - 3rd
            ];
            const rankLabels = ['#1', '#2', '#3'];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "premium-card p-8 rounded-[3rem] relative overflow-hidden group",
                  orderClass,
                  heightClass,
                  i === 0 ? "border-primary/20 bg-primary/5 shadow-[0_0_50px_-12px_rgba(var(--primary),0.2)]" : "bg-card"
                )}
              >
                {/* Badge Pangkat */}
                <div className="absolute top-6 right-6">
                  {i === 0 && <Trophy className="text-amber-500 w-10 h-10 animate-bounce" />}
                  {i === 1 && <Medal className="text-slate-400 w-8 h-8" />}
                  {i === 2 && <Medal className="text-orange-400 w-8 h-8" />}
                </div>

                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <Avatar className={cn("border-4", i === 0 ? "w-28 h-28 border-primary/20" : "w-20 h-20 border-border")}>
                      <AvatarFallback className={cn("font-black text-primary", i === 0 ? "text-3xl" : "text-xl", medalColors[i])}>
                        {m.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-2 -right-2 text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-background",
                      "w-8 h-8",
                      i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-500"
                    )}>
                      {i + 1}
                    </div>
                  </div>
                  
                  <div className="text-center w-full px-4">
                    <h3 className="font-black text-xl truncate">{m.full_name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{m.role}</p>
                  </div>

                  <div className="mt-4 text-center">
                    <p className={cn("font-black tracking-tighter", i === 0 ? "text-5xl text-primary" : "text-4xl text-primary/80")}>
                      {m.merit || 0}
                    </p>
                    <p className="text-[10px] font-black opacity-40 uppercase">Merit Points</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── MAIN LIST SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-premium p-6 space-y-6 bg-card/50 backdrop-blur-md">
            <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-primary"/> Ringkasan
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-2xl">
                <p className="text-[10px] font-black opacity-50">PURATA MERIT</p>
                <p className="text-2xl font-black text-primary">
                  {members.length ? Math.floor(members.reduce((acc, curr) => acc + (curr.merit || 0), 0) / members.length) : 0}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <p className="text-[10px] font-black text-emerald-500/50">AHLI ELIT (100+ PTS)</p>
                <p className="text-2xl font-black text-emerald-500">
                  {members.filter(m => (m.merit || 0) >= 100).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Full Ranking Table */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Cari nama ahli..." 
              className="pl-12 h-12 rounded-2xl bg-card/80 border-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-card/70 backdrop-blur-md">
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/30 text-[10px] font-black uppercase tracking-widest opacity-50">
                      <th className="px-8 py-6">Rank</th>
                      <th className="px-6 py-6">Ahli</th>
                      <th className="px-6 py-6">Status Aktiviti</th>
                      <th className="px-8 py-6 text-right">Jumlah Merit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {others.map((m, i) => (
                      <tr key={m.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="px-8 py-5 font-black text-muted-foreground/40 italic">#{i + 4}</td>
                        <td className="px-6 py-5 max-w-[200px] sm:max-w-[300px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center font-bold text-[10px]">
                              {m.full_name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{m.full_name}</p>
                              <p className="text-[10px] font-black opacity-40 uppercase truncate">{m.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-full max-w-[120px] space-y-1">
                            <div className="flex justify-between text-[10px] font-black uppercase opacity-40">
                              <span>Progress</span>
                              <span>{Math.min(m.merit || 0, 100)}%</span>
                            </div>
                            <Progress value={Math.min(m.merit || 0, 100)} className="h-1" />
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Badge className="bg-primary text-white border-none font-black px-3">
                            {m.merit || 0} PTS
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/40">
                {others.map((m, i) => (
                  <div key={m.id} className="p-5 flex items-center justify-between hover:bg-primary/5 transition-colors gap-3 w-full">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="font-black text-muted-foreground/20 italic text-xl shrink-0">#{i + 4}</div>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-muted shrink-0 flex items-center justify-center font-black text-sm">
                          {m.full_name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black leading-none mb-1 truncate title-mobile">{m.full_name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{m.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-primary leading-none">{m.merit || 0}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase">PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}