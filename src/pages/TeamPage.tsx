import React, { useEffect, useState } from 'react';
import { Search, Mail, Shield, MoreVertical, UserPlus, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase'; // 👈 Tukar ke supabase
import { useAuth } from '@/contexts/AuthContext';
import { ClubActivity } from '@/types'; // 👈 Gunakan jenis yang betul
import { cn } from '@/lib/utils';

export function TeamPage() {
  const { profile } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.club_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Ambil data dari jadual club_committee (UUID based)
      const { data: members, error: memError } = await supabase
        .from('club_committee')
        .select('*')
        .eq('club_id', profile?.club_id)
        .order('order_index', { ascending: true });

      // Ambil statistik aktiviti untuk pengiraan task
      const { data: acts, error: actError } = await supabase
        .from('club_activities')
        .select('*')
        .eq('club_id', profile?.club_id);

      if (memError) throw memError;

      setTeam(members || []);
      setActivities(acts || []);
    } catch (error: any) {
      console.error('Error fetching team:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeam = team.filter(m =>
    (m.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.position_title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black opacity-20 uppercase">Memuatkan...</div>;

  return (
    <div className="page-container space-y-12">
      {/* ... (Header UI kekal sama) ... */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredTeam.map((member) => {
            // Logik pengiraan tugasan berdasarkan data kelab
            const activeTasks = activities.filter(a => a.status !== 'selesai').length;

            return (
              <motion.div key={member.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="premium-card h-full flex flex-col relative overflow-hidden bg-white/60 backdrop-blur-md">
                  <CardHeader className="p-8 pb-4 relative">
                    <div className="flex items-start justify-between">
                      <Avatar className="h-24 w-24 rounded-[2rem] border-4 border-background shadow-2xl">
                        <AvatarImage src={member.image_url} />
                        <AvatarFallback className="bg-primary text-white font-black text-2xl">
                          {member.full_name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="mt-8 space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tighter">{member.full_name || "Nama Belum Set"}</CardTitle>
                      <p className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">{member.position_title}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8 pt-4 flex-1">
                    <Badge className="bg-accent/10 text-accent border-none font-black text-[10px] uppercase tracking-widest">{member.category}</Badge>

                    <div className="pt-8 border-t border-border/30 grid grid-cols-2 gap-8 mt-6">
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em]">Status</p>
                        <span className="text-sm font-bold text-emerald-500">Aktif</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}