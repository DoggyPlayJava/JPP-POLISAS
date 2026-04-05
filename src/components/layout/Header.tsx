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

export function Header() {
  const { profile, selectedClubId, isSuperAdmin, isPresident, effectiveRole } = useAuth();
  
  const activeClubId = selectedClubId ?? profile?.club_id;
  const clubName = activeClubId
    ? (ALL_CLUBS.find(c => c.id === activeClubId)?.name ?? activeClubId.replace('club_', '').toUpperCase())
    : isSuperAdmin
      ? 'JPP Admin'
      : '';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

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
        {clubName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15 transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_4px_1px_rgba(212,160,23,0.4)]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">{clubName}</span>
            
            {/* Sync ADMIN badge with sidebar */}
            {(isSuperAdmin || isPresident) && effectiveRole !== 'CLUB_MEMBER' && effectiveRole !== 'AHLI' && (
              <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-none font-black ml-1 scale-90 origin-left">
                ADMIN
              </Badge>
            )}
          </div>
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
                 <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group">
                    <div className="text-left">
                      <p className="text-[11px] font-black">Lapor Isu Teknikal</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Pepijat atau ralat sistem</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </button>
                 
                 <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group">
                    <div className="text-left">
                      <p className="text-[11px] font-black">Cadangan UI/UX</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Idea penambahbaikan visual</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </button>
              </div>

              <div className="pt-3 border-t border-border/40">
                 <Button variant="outline" className="w-full rounded-xl h-10 font-black text-[9px] uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 shadow-none">
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