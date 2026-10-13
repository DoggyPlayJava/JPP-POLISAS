import React, { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createEmsParticipantManual } from '@/lib/ems';
import type { EmsEvent } from '@/types';

export interface EmsManualRegModalProps {
  event: EmsEvent | null;
  onClose: () => void;
  onRegistered?: () => void;
}

export function EmsManualRegModal({ event, onClose, onRegistered }: EmsManualRegModalProps) {
  const [form, setForm] = useState({
    leader_name: '',
    matrix_no: '',
    email: '',
    phone: '',
    team_name: '',
    booth_no: '',
    category_name: '',
    participant_type: 'STUDENT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        leader_name: '',
        matrix_no: '',
        email: '',
        phone: '',
        team_name: '',
        booth_no: '',
        category_name: event.category || '',
        participant_type: 'STUDENT',
      });
    }
  }, [event]);

  if (!event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leader_name.trim()) {
      toast.error('Sila masukkan Nama Ketua / Peserta.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createEmsParticipantManual({
        event_id: event.id,
        participant_type: form.participant_type || 'STUDENT',
        entity_mode: event.event_mode || 'INDIVIDUAL',
        leader_name: form.leader_name.trim(),
        matrix_no: form.matrix_no.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        team_name: form.team_name.trim() || undefined,
        booth_no: form.booth_no.trim() || undefined,
        category_name: form.category_name.trim() || undefined,
      });

      toast.success('Peserta berjaya didaftarkan secara manual!');
      onRegistered?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftar peserta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/80 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl my-8 relative text-slate-900 dark:text-white animate-in fade-in-50 zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          aria-label="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-primary dark:text-amber-400 mb-1">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Pendaftaran Manual Peserta
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Acara: {event.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Ketua / Peserta <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.leader_name}
              onChange={(e) => setForm({ ...form, leader_name: e.target.value })}
              placeholder="Contoh: Muhammad Ali bin Ahmad"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. Matrik (Pilihan)</label>
              <input
                type="text"
                value={form.matrix_no}
                onChange={(e) => setForm({ ...form, matrix_no: e.target.value })}
                placeholder="Contoh: 15DKA21F1001"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-Mel (Pilihan)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Contoh: peserta@polisas.edu.my"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. Telefon (Pilihan)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Contoh: 0123456789"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori (Pilihan)</label>
              <input
                type="text"
                value={form.category_name}
                onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                placeholder="Contoh: Inovasi / Sukan"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Pasukan (Pilihan)</label>
              <input
                type="text"
                value={form.team_name}
                onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                placeholder="Contoh: Team TechSquad"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. Booth (Pilihan)</label>
              <input
                type="text"
                value={form.booth_no}
                onChange={(e) => setForm({ ...form, booth_no: e.target.value })}
                placeholder="Contoh: Booth 12"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all shadow-sm disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Daftar Peserta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
