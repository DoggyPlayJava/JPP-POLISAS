import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CLUBS } from '@/types';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Flag } from 'lucide-react';

/**
 * ClubSwitcher — hanya papar jika pengguna adalah ahli LEBIH DARI 1 kelab.
 * Menggunakan AuthContext.selectedClubId + setSelectedClubId untuk tukar paparan.
 */
export function ClubSwitcher() {
  const { userClubIds, selectedClubId, setSelectedClubId, isSuperAdmin } = useAuth();

  // Jika Super Admin JPP, papar kelab untuk Admin pilih.
  // Jika biasa, papar hanya jika multi-kelab.
  if (!isSuperAdmin && (!userClubIds || userClubIds.length <= 1)) return null;

  const clubs = isSuperAdmin 
    ? ALL_CLUBS 
    : userClubIds
        .map(id => ALL_CLUBS.find(c => c.id === id))
        .filter(Boolean) as typeof ALL_CLUBS;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-500/8 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
        <Flag className="w-3.5 h-3.5 text-indigo-500" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 shrink-0">
        Kelab:
      </span>
      <Select value={selectedClubId ?? ''} onValueChange={setSelectedClubId}>
        <SelectTrigger className="h-9 flex-1 rounded-xl border-none bg-indigo-500/10 text-indigo-700 font-black text-xs focus:ring-indigo-500/20 min-w-0">
          <SelectValue placeholder="Pilih kelab..." />
        </SelectTrigger>
        <SelectContent className="rounded-2xl shadow-2xl border-border/60">
          {clubs.map(club => (
            <SelectItem
              key={club.id}
              value={club.id}
              className="rounded-xl font-bold text-xs cursor-pointer"
            >
              {club.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
