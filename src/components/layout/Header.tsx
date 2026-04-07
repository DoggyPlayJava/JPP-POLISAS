import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, HelpCircle, MessageSquare, Send, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CLUBS } from '@/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Sparkles, ArrowUpRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function Header({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const { profile, selectedClubId, isSuperAdmin, isPresident, effectiveRole, refetchProfile } = useAuth();
  
  const activeClubId = selectedClubId ?? profile?.club_id;
  const clubName = activeClubId
    ? (ALL_CLUBS.find(c => c.id === activeClubId)?.name ?? activeClubId.replace('club_', '').toUpperCase())
    : isSuperAdmin
      ? 'JPP Admin'
      : '';

  // Get token info
  const tokenBalance = profile?.ai_token_balance ?? 0;
  const subTier = profile?.subscription_tier ?? 'free';
  const isLowToken = tokenBalance < 50;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  const handleClaimAdmin = async () => {
    if (!profile?.id) return;
    setIsUpdatingTier(true);
    const toastId = toast.loading('Menuntut akses admin...');
    try {
        const { error } = await supabase.rpc('update_user_ai_tier', {
            target_user_id: profile.id,
            new_tier: 'admin'
        });
        if (error) throw error;
        toast.success('Berjaya dinaik taraf ke Admin Tier!', { id: toastId });
        if (refetchProfile) await refetchProfile();
    } catch (e: any) {
        toast.error(e.message || 'Gagal menaik taraf', { id: toastId });
    } finally {
        setIsUpdatingTier(false);
    }
  };

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/carian?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/kelab');
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 relative z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center gap-3">
        {profile && (
          <Popover>
            <PopoverTrigger asChild>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                isLowToken 
                  ? "bg-rose-500/10 border-rose-500/30 lg:animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
                  : "bg-primary/5 hover:bg-primary/10 border-primary/10"
              )}>
                <div className={cn(
                  "p-1.5 rounded-lg flex items-center justify-center",
                  isLowToken ? "bg-rose-500/20 text-rose-500" : (subTier === 'pro' || isSuperAdmin) ? "bg-indigo-500/20 text-indigo-500 shadow-[0_0_8px_1px_rgba(99,102,241,0.2)]" : "bg-slate-500/20 text-slate-500"
                )}>
                  <Sparkles className={cn("w-3.5 h-3.5 fill-current", isLowToken && "animate-bounce")} />
                </div>
                <div className="flex flex-col text-left">
                  <span className={cn(
                    "text-[12px] font-black leading-none",
                    isLowToken ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  )}>
                    {tokenBalance.toLocaleString()} Token
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", isLowToken ? "text-rose-500/70" : "text-muted-foreground")}>
                      {isSuperAdmin ? 'ADMIN TIER' : (subTier === 'pro' ? 'PRO TIER' : 'FREE TIER')}
                    </span>
                    {isLowToken && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping ml-1" />}
                  </div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 rounded-[2rem] p-5 mt-2 border-none shadow-2xl glass-premium fade-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      (subTier === 'pro' || isSuperAdmin) ? "bg-indigo-500/10 text-indigo-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {(subTier === 'pro' || isSuperAdmin) ? <Crown size={20} className="fill-current" /> : <Sparkles size={20} className="fill-current" />}
                    </div>
                    <div>
                      <h4 className="text-xl font-black">{tokenBalance.toLocaleString()}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Baki Token Semasa</p>
                    </div>
                  </div>
                  <Badge variant={subTier === 'pro' || isSuperAdmin ? 'default' : 'outline'} className={cn(
                    "text-[9px] font-bold uppercase",
                    subTier === 'free' ? "border-amber-500/30 text-amber-600 dark:text-amber-400" : "bg-indigo-500 hover:bg-indigo-600"
                  )}>
                    {isSuperAdmin ? 'ADMIN TIER' : (subTier === 'pro' ? 'PRO TIER' : 'FREE TIER')}
                  </Badge>
                </div>
                
                <div className="space-y-1.5 pt-2">
                   {isSuperAdmin && subTier !== 'admin' ? (
                     <Button 
                        disabled={isUpdatingTier}
                        onClick={handleClaimAdmin}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
                     >
                        {isUpdatingTier ? (
                          <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-spin" /> Menuntut...</span>
                        ) : (
                          <span className="flex items-center gap-2"><Crown className="w-4 h-4" /> Tuntut Akses Admin</span>
                        )}
                     </Button>
                   ) : (
                     <Button 
                        onClick={() => navigate('/nexus?tab=langganan')}
                        className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold h-11 rounded-xl transition-all"
                     >
                        <span className="flex items-center gap-2"><ArrowUpRight className="w-4 h-4" /> Urus Langganan / {subTier === 'free' ? 'Dapatkan Pro' : 'Semak Langganan'}</span>
                     </Button>
                   )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex-1 max-w-sm mx-6 relative group hidden md:block">
        <form onSubmit={handleSearch} className="w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
          <Input
            placeholder="Cari kelab atau persatuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 rounded-xl bg-muted/40 border-border/50 focus-visible:ring-accent/40 text-sm w-full"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted/60 text-muted-foreground/70">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-[2rem] p-5 mt-2 border-none shadow-2xl glass-premium fade-in">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest">Bantuan & Isu</h4>
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5">Kami sedia membantu anda.</p>
                </div>
              </div>
              
              <div className="space-y-1.5">
                 <button 
                    onClick={() => navigate('/tetapan?tab=help')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                 >
                    <div className="text-left">
                      <p className="text-[11px] font-black">Lapor Isu Teknikal</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Pepijat atau ralat sistem</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </button>
                 
                 <button 
                    onClick={() => navigate('/tetapan?tab=help')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                 >
                    <div className="text-left">
                      <p className="text-[11px] font-black">Cadangan UI/UX</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Idea penambahbaikan visual</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </button>
              </div>

              <div className="pt-3 border-t border-border/40">
                 <Button 
                    variant="outline" 
                    onClick={() => window.open('https://wa.me/601139413699', '_blank')}
                    className="w-full rounded-xl h-10 font-black text-[9px] uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 shadow-none"
                 >
                    <Send size={12} /> WhatsApp JPP Support
                 </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <NotificationBell />
      </div>
    </header>
  );
}