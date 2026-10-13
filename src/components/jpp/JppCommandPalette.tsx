import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  LayoutDashboard,
  Users,
  CalendarDays,
  Map,
  HeartHandshake,
  Settings,
  Activity,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useJppConfig } from '@/contexts/JppConfigContext';

interface JppCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JppCommandPalette({ open, onOpenChange }: JppCommandPaletteProps) {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const { unitConfig, unitOrder } = useJppConfig();
  const [search, setSearch] = useState('');

  const isYDP = profile?.jpp_position === 'YDP' || profile?.jpp_position === 'YANG_DIPERTUA' || isSuperAdmin;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden bg-white/95 dark:bg-[#151D16]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Papan Perintah JPP HQ</DialogTitle>
        <Command
          className="w-full flex flex-col text-slate-900 dark:text-white"
          loop
          value={search}
          onValueChange={setSearch}
        >
          <div className="flex items-center px-4 py-3.5 border-b border-slate-200/80 dark:border-white/10 gap-3">
            <Search className="w-5 h-5 text-slate-400 dark:text-white/40 shrink-0" />
            <Command.Input
              placeholder="Cari apa-apa sahaja di JPP HQ... (e.g. Takwim, FoodBank, KPP)"
              className="w-full bg-transparent text-sm font-medium placeholder-slate-400 dark:placeholder-white/30 outline-none text-slate-900 dark:text-white"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 dark:text-white/40 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-12 text-center text-xs text-slate-400 dark:text-white/40 font-medium">
              Tiada modul atau arahan sepadan ditemui.
            </Command.Empty>

            <Command.Group heading="Navigasi Utama" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 px-3 py-1.5">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                <span>Laman Utama JPP</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp/members'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <Users className="w-4 h-4 text-blue-500" />
                <span>Pengurusan Ahli JPP</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp/takwim'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <span>Takwim Kampus & Aktiviti</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp/polymaps'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <Map className="w-4 h-4 text-sky-500" />
                <span>Pentadbiran PolyMaps 360</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp/foodbank'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <span>Hab Food Bank JPP</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/jpp/demerit'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 dark:aria-selected:text-emerald-400 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sistem Merit & Demerit JPP</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Unit-Unit Exco" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 px-3 py-1.5 mt-2">
              {unitOrder.map((code) => {
                const cfg = unitConfig[code];
                if (!cfg) return null;
                return (
                  <Command.Item
                    key={code}
                    onSelect={() => runCommand(() => navigate(`/jpp/unit/${code.toLowerCase()}`))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-emerald-500/10 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: cfg.color }}
                    />
                    <div className="flex flex-col">
                      <span>Unit {cfg.shortLabel}</span>
                      <span className="text-[10px] text-slate-500 dark:text-white/40 font-normal">{cfg.fullLabel}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                  </Command.Item>
                );
              })}
            </Command.Group>

            {isYDP && (
              <Command.Group heading="Tindakan Pentadbir" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 px-3 py-1.5 mt-2">
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/jpp/users'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Users className="w-4 h-4 text-violet-500" />
                  <span>Pangkalan Data Pengguna & PRO</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/jpp/settings'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Konfigurasi JPP HQ</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </Command.Item>
                {isSuperAdmin && (
                  <Command.Item
                    onSelect={() => runCommand(() => navigate('/jpp/telemetry'))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <Activity className="w-4 h-4 text-orange-500" />
                    <span>SentinelAI Telemetri Sistem</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                  </Command.Item>
                )}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-[10px] text-slate-500 dark:text-white/40 font-medium">
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 font-mono">↓</kbd>
              untuk navigasi
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 font-mono">↵</kbd>
              untuk pilih
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
