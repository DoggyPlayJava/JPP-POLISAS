import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
  Trophy,
  Award,
  QrCode,
  Sparkles,
  ShoppingBag,
  HeartHandshake,
  Truck,
  ChevronRight
} from 'lucide-react';
import { ALL_CLUBS } from '@/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

import { triggerCommandPalette } from '@/lib/commandPalette';
export { triggerCommandPalette };

export function CommandPalette({ open: propOpen, onOpenChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Handle controlled vs uncontrolled
  const isControlled = propOpen !== undefined;
  const isOpen = isControlled ? propOpen : open;

  const [emsEvents, setEmsEvents] = useState<{ id: string; title: string; category?: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('ems_events')
      .select('id, title, category')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setEmsEvents(data as any);
      });
  }, [isOpen]);

  const isOpenRef = React.useRef(isOpen);
  isOpenRef.current = isOpen;
  const isControlledRef = React.useRef(isControlled);
  isControlledRef.current = isControlled;
  const propOpenRef = React.useRef(propOpen);
  propOpenRef.current = propOpen;
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    // Window-level capture phase handler to reliably intercept Ctrl+K before Chrome focuses omnibox
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K' || e.code === 'KeyK';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        if (isControlledRef.current) {
          onOpenChangeRef.current?.(!propOpenRef.current);
        } else {
          setOpen((prev) => !prev);
        }
        return;
      }

      if (e.key === 'Escape' && isOpenRef.current) {
        e.preventDefault();
        if (isControlledRef.current) {
          onOpenChangeRef.current?.(false);
        } else {
          setOpen(false);
        }
      }
    };

    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ open?: boolean }>;
      const nextOpen = customEvent.detail && typeof customEvent.detail.open === 'boolean'
        ? customEvent.detail.open
        : true;
      if (isControlledRef.current) {
        onOpenChangeRef.current?.(nextOpen);
      } else {
        setOpen(nextOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('jpp:open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('jpp:open-command-palette', handleCustomOpen);
    };
  }, []);

  const runCommand = useCallback((command: () => void) => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setOpen(false);
    }
    command();
  }, [isControlled, onOpenChange]);

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(val) => {
        if (isControlled) {
          onOpenChange?.(val);
        } else {
          setOpen(val);
        }
      }}
      label="Carian Global JPP"
      overlayClassName="fixed inset-0 z-[200] bg-background/60 backdrop-blur-md transition-opacity duration-200"
      contentClassName="fixed left-1/2 top-[12vh] z-[201] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-[2rem] border border-border/40 bg-card/95 shadow-2xl backdrop-blur-3xl p-0 outline-none"
    >
      <DialogPrimitive.Title className="sr-only">Carian Global JPP</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        Cari kelab, acara EMS, MAKMP, kebajikan, dan tindakan pantas.
      </DialogPrimitive.Description>
      <div className="flex items-center border-b border-border/40 px-6 py-4">
        <Search className="mr-3 h-5 w-5 text-muted-foreground/50" />
        <Command.Input
          placeholder="Cari kelab, acara EMS, MAKMP, kebajikan..."
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

        <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Tindakan Pantas & Hub</span>}>
          <Item icon={LayoutDashboard} label="Papan Pemuka Pelajar" onSelect={() => runCommand(() => navigate('/dashboard'))} />
          <Item icon={Sparkles} label="Portal Pelajar POLISAS Hub" onSelect={() => runCommand(() => navigate('/portal'))} />
          <Item icon={CalendarDays} label="Semua Aktiviti & Takwim" onSelect={() => runCommand(() => navigate('/aktiviti'))} />
          <Item icon={Flag} label="Senarai Kelab & Persatuan" onSelect={() => runCommand(() => navigate('/kelab'))} />
          <Item icon={Users} label="Jawatankuasa & Ahli" onSelect={() => runCommand(() => navigate('/ahli'))} />
        </Command.Group>

        <Command.Separator className="my-4 h-px bg-border/40" />

        <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">Pengurusan Acara EMS</span>}>
          <Item icon={Trophy} label="Papan Pemuka EMS (Event Management)" onSelect={() => runCommand(() => navigate('/ems/dashboard'))} />
          <Item icon={QrCode} label="Kaunter Imbasan QR Check-In" onSelect={() => runCommand(() => navigate('/ems/checkin'))} />
          <Item icon={Award} label="Portal Juri Penilai Rasmi EMS" onSelect={() => runCommand(() => navigate('/ems/juri'))} />
          <Item icon={ShieldCheck} label="Semakan Ketulenan Sijil Digital (E-Cert)" onSelect={() => runCommand(() => navigate('/ems/cert/verify'))} />
          <Item icon={FileText} label="Kelulusan Acara EMS (Pegawai / Exco)" onSelect={() => runCommand(() => navigate('/ems/approvals'))} />
        </Command.Group>

        {emsEvents.length > 0 && (
          <>
            <Command.Separator className="my-4 h-px bg-border/40" />
            <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Pentas & Acara EMS Terkini</span>}>
              {emsEvents.map((evt) => (
                <Item
                  key={evt.id}
                  icon={Sparkles}
                  label={`Pentas Pentadbiran / Live: ${evt.title}`}
                  shortLabel={evt.category || 'EMS'}
                  onSelect={() => runCommand(() => navigate(`/ems/leaderboard/${evt.id}`))}
                />
              ))}
            </Command.Group>
          </>
        )}

        <Command.Separator className="my-4 h-px bg-border/40" />

        <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Anugerah & Kebajikan Flagship</span>}>
          <Item icon={Award} label="Pencalonan Anugerah MAKMP 2026" onSelect={() => runCommand(() => navigate('/makmp'))} />
          <Item icon={ClipboardCheck} label="Status Pencalonan MAKMP" onSelect={() => runCommand(() => navigate('/makmp/status'))} />
          <Item icon={HeartHandshake} label="Food Bank Siswa POLISAS" onSelect={() => runCommand(() => navigate('/kebajikan/foodbank'))} />
          <Item icon={ShoppingBag} label="PolyMart Campus Marketplace" onSelect={() => runCommand(() => navigate('/polymart'))} />
          <Item icon={Truck} label="PolyServices & PolyRider" onSelect={() => runCommand(() => navigate('/services'))} />
        </Command.Group>

        <Command.Separator className="my-4 h-px bg-border/40" />

        <Command.Group heading={<span className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Pentadbiran</span>}>
          <Item icon={ClipboardCheck} label="Semakan Laporan (JPP)" onSelect={() => runCommand(() => navigate('/semakan-laporan'))} />
          <Item icon={ShieldCheck} label="Pusat Kawalan JPP / JPP HQ Portal" onSelect={() => runCommand(() => navigate('/jpp'))} />
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
            <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-xs">↵</kbd>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">Pilih</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-xs">↑</kbd>
              <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/40 bg-background text-[10px] font-black shadow-xs">↓</kbd>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">Navigasi</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-primary">
          <CommandIcon className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Portal Search</span>
        </div>
      </div>
    </Command.Dialog>
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
