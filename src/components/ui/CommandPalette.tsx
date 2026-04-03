import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { 
  Search, 
  LayoutDashboard, 
  Flag, 
  CalendarDays, 
  Users, 
  FileText, 
  Settings,
  ShieldCheck,
  ClipboardCheck,
  Command as CommandIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_CLUBS } from '@/types';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: propOpen, onOpenChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Handle controlled vs uncontrolled
  const isControlled = propOpen !== undefined;
  const isOpen = isControlled ? propOpen : open;
  const setIsOpen = isControlled ? onOpenChange : setOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen?.((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setIsOpen]);

  const runCommand = (command: () => void) => {
    setIsOpen?.(false);
    command();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Command.Dialog
          open={isOpen}
          onOpenChange={(val) => setIsOpen?.(val)}
          label="Global Search"
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/40 backdrop-blur-2xl"
            onClick={() => setIsOpen?.(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-border/40 bg-card/80 shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex items-center border-b border-border/40 px-6 py-4">
              <Search className="mr-3 h-5 w-5 text-muted-foreground/50" />
              <Command.Input
                placeholder="Cari kelab, halaman atau tindakan..."
                className="flex h-10 w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/30"
              />
              <div className="ml-auto hidden items-center gap-1 rounded-lg border border-border/40 bg-muted/20 px-2 py-1 md:flex">
                <span className="text-[10px] font-black text-muted-foreground/60">ESC</span>
              </div>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-4 scrollbar-hide">
              <Command.Empty className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/20">
                    <Search className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">
                    Tiada hasil ditemui
                  </p>
                </div>
              </Command.Empty>

              <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Tindakan Pantas</span>}>
                <Item icon={LayoutDashboard} label="Papan Pemuka" onSelect={() => runCommand(() => navigate('/dashboard'))} />
                <Item icon={Flag} label="Senarai Kelab" onSelect={() => runCommand(() => navigate('/kelab'))} />
                <Item icon={CalendarDays} label="Semua Aktiviti" onSelect={() => runCommand(() => navigate('/aktiviti'))} />
                <Item icon={Users} label="Jawatankuasa" onSelect={() => runCommand(() => navigate('/ahli'))} />
              </Command.Group>

              <Command.Separator className="my-4 h-px bg-border/40" />

              <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Pentadbiran</span>}>
                <Item icon={ClipboardCheck} label="Semakan Laporan (JPP)" onSelect={() => runCommand(() => navigate('/semakan-laporan'))} />
                <Item icon={ShieldCheck} label="Pusat Kawalan JPP" onSelect={() => runCommand(() => navigate('/jpp-admin'))} />
                <Item icon={Settings} label="Tetapan Sistem" onSelect={() => runCommand(() => navigate('/tetapan'))} />
              </Command.Group>

              <Command.Separator className="my-4 h-px bg-border/40" />

              <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Kelab & Persatuan</span>}>
                {ALL_CLUBS.map((club) => (
                  <Item 
                    key={club.id} 
                    icon={Flag} 
                    label={club.name} 
                    shortLabel={club.shortName}
                    color={club.color}
                    onSelect={() => runCommand(() => navigate(`/kelab/${club.id}`))} 
                  />
                ))}
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-border/40 bg-muted/10 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-sm">↵</kbd>
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">Pilih</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-sm">↑</kbd>
                    <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-sm">↓</kbd>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">Navigasi</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-primary">
                <CommandIcon className="h-3 w-3" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">e-KPP Search</span>
              </div>
            </div>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}

function Item({ icon: Icon, label, shortLabel, color, onSelect }: any) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "group flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 outline-none transition-all duration-200",
        "aria-selected:bg-primary/10 aria-selected:shadow-inner"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all duration-200",
          "bg-muted/20 group-aria-selected:bg-primary group-aria-selected:scale-110",
        )}
        style={color && !['PRIMARY', 'ACCENT'].includes(color) ? { backgroundColor: color + '20' } : {}}
        >
          <Icon className={cn("h-4 w-4 transition-colors", "text-muted-foreground group-aria-selected:text-white")} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-foreground group-aria-selected:text-primary-foreground">{label}</span>
          {shortLabel && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{shortLabel}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all duration-300 group-aria-selected:translate-x-1 group-aria-selected:text-primary hover:text-primary" />
    </Command.Item>
  );
}
