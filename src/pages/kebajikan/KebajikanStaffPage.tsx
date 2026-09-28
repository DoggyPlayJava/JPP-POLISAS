import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { KebajikanStaffAssignment, KEBAJIKAN_THEME_COLOR } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, Trash2, Shield, ShieldCheck, Search, X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

const TEAL = KEBAJIKAN_THEME_COLOR;

interface ProfileResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  matric_no: string | null;
  role: string;
}

export function KebajikanStaffPage() {
  const { user, isSuperAdmin, isKebajikanExco } = useAuth();
  const isAllowed = isSuperAdmin || isKebajikanExco;

  const [staff, setStaff]         = useState<KebajikanStaffAssignment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<ProfileResult[]>([]);
  const [addingId, setAddingId]   = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kebajikan_staff_assignments')
      .select(`
        *,
        staff:profiles!kebajikan_staff_assignments_staff_user_id_fkey(id, full_name, email, avatar_url, matric_no),
        assigner:profiles!kebajikan_staff_assignments_assigned_by_fkey(id, full_name)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });
    setStaff((data as KebajikanStaffAssignment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, matric_no, role')
      .ilike('full_name', `%${query}%`)
      .limit(10);
    // Exclude already-added staff
    const existingIds = staff.map(s => s.staff_user_id);
    setResults((data || []).filter(p => !existingIds.includes(p.id)) as ProfileResult[]);
    setSearching(false);
  }, [query, staff]);

  const handleAdd = async (person: ProfileResult, role: 'STAFF' | 'SENIOR_STAFF' = 'STAFF') => {
    if (!isAllowed) return;
    setAddingId(person.id);
    const { error } = await supabase.from('kebajikan_staff_assignments').insert({
      staff_user_id: person.id,
      assigned_by:  user?.id,
      role,
      is_active:    true,
    });
    if (error) {
      toast.error('Gagal tambah staff: ' + error.message);
    } else {
      toast.success(`${person.full_name} ditambah sebagai Unit Kebajikan Staff.`);
      setResults(prev => prev.filter(p => p.id !== person.id));
      await fetchStaff();
    }
    setAddingId(null);
  };

  const handleRemove = async (assignment: KebajikanStaffAssignment) => {
    if (!isAllowed) return;
    const { error } = await supabase
      .from('kebajikan_staff_assignments')
      .update({ is_active: false })
      .eq('id', assignment.id);
    if (error) {
      toast.error('Gagal buang staff.');
    } else {
      toast.success(`${assignment.staff?.full_name || 'Staff'} telah dibuang.`);
      setStaff(prev => prev.filter(s => s.id !== assignment.id));
    }
  };

  const handleToggleRole = async (assignment: KebajikanStaffAssignment) => {
    if (!isAllowed) return;
    const newRole = assignment.role === 'SENIOR_STAFF' ? 'STAFF' : 'SENIOR_STAFF';
    const { error } = await supabase
      .from('kebajikan_staff_assignments')
      .update({ role: newRole })
      .eq('id', assignment.id);
    if (error) {
      toast.error('Gagal kemaskini peranan.');
    } else {
      setStaff(prev => prev.map(s => s.id === assignment.id ? { ...s, role: newRole } : s));
      toast.success(`Peranan dikemaskini kepada ${newRole === 'SENIOR_STAFF' ? 'Senior Staff' : 'Staff'}.`);
    }
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto min-h-screen transition-colors">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shadow-sm">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Unit Kebajikan Staff</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Urus pegawai yang membantu mengendalikan tiket aduan pelajar</p>
          </div>
        </div>
      </div>

      {/* Add Staff Panel */}
      {isAllowed && (
        <div className="mb-8 rounded-3xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-2xl p-5 sm:p-6">
          <p className="text-sm font-black text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Tambah Staff Baharu
          </p>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama pengguna..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-teal-500 transition-colors shadow-inner"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-5 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/20 shadow-sm"
            >
              {searching ? '...' : 'Cari'}
            </button>
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }} className="px-3 py-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {results.map(person => (
                  <div key={person.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors">
                    <Avatar className="h-9 w-9 rounded-xl flex-shrink-0">
                      <AvatarImage src={person.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="rounded-xl text-xs font-black bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300">{initials(person.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{person.full_name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{person.email} · {person.matric_no || person.role}</p>
                    </div>
                    <button
                      onClick={() => handleAdd(person, 'STAFF')}
                      disabled={addingId === person.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/20 shadow-sm"
                    >
                      <Check className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
            {results.length === 0 && query && !searching && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Tiada pengguna ditemui untuk "{query}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Staff List */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-black text-slate-900 dark:text-slate-200">Senarai Aktif <span className="text-teal-600 dark:text-teal-400 ml-2 font-bold">{staff.length}</span></p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-white/10" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada Unit Kebajikan Staff ditambah</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.01] hover:bg-slate-100/70 dark:hover:bg-white/[0.03] transition-colors group"
              >
                <Avatar className="h-11 w-11 rounded-xl flex-shrink-0 shadow-sm">
                  <AvatarImage src={s.staff?.avatar_url || ''} className="object-cover" />
                  <AvatarFallback className="rounded-xl text-xs font-black bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300">{initials(s.staff?.full_name || '?')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200">{s.staff?.full_name}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${s.role === 'SENIOR_STAFF' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-transparent' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent'}`}>
                      {s.role === 'SENIOR_STAFF' ? 'Senior Staff' : 'Staff'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.staff?.email}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Ditambah {format(new Date(s.assigned_at), 'd MMM yyyy', { locale: ms })}
                    {s.assigner && ` oleh ${s.assigner.full_name}`}
                  </p>
                </div>
                {isAllowed && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleRole(s)}
                      title={s.role === 'SENIOR_STAFF' ? 'Turunkan ke Staff' : 'Naikkan ke Senior Staff'}
                      className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 shadow-sm transition-colors"
                    >
                      {s.role === 'SENIOR_STAFF' ? <Shield className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRemove(s)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/15 text-slate-500 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-slate-100/60 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5">
        <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Staff Unit Kebajikan hanya boleh melihat tiket yang didelegasikan kepada mereka. Mereka boleh mengemaskini status dan menambah komen ke tiket tersebut.
        </p>
      </div>
    </div>
  );
}
