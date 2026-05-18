import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Trash2, CheckCircle, Plus, Minus, Home, Loader2, Info, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';

export function PolyRentMyAdsModal({ isOpen, onClose, onUpdateComplete }: { isOpen: boolean; onClose: () => void; onUpdateComplete: () => void }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'IKLAN_RUMAH' | 'PENCARIAN_BILIK'>('IKLAN_RUMAH');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myReverseAds, setMyReverseAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchMyAds();
    }
  }, [isOpen, profile?.id, activeTab]);

  const fetchMyAds = async () => {
    setLoading(true);
    try {
      if (activeTab === 'IKLAN_RUMAH') {
        const { data, error } = await supabase
          .from('polyrent_listings')
          .select('*')
          .eq('author_id', profile?.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMyListings(data || []);
      } else {
        const { data, error } = await supabase
          .from('polyrent_reverse_ads')
          .select('*, klk_kawasan:kawasan_id(name)')
          .eq('student_id', profile?.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMyReverseAds(data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan iklan anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKekosongan = async (id: string, current: number, change: number) => {
    const newKekosongan = Math.max(0, current + change);
    if (newKekosongan === current) return;

    // Optimistic UI update
    setMyListings(prev => prev.map(l => l.id === id ? { ...l, kekosongan: newKekosongan } : l));

    try {
      // If kekosongan reaches 0, auto-close the listing so it doesn't show as available
      const autoStatus = newKekosongan === 0 ? 'CLOSED' : (current === 0 && newKekosongan > 0 ? 'OPEN' : undefined);
      
      const updatePayload: any = { kekosongan: newKekosongan };
      if (autoStatus) {
        updatePayload.status = autoStatus;
        setMyListings(prev => prev.map(l => l.id === id ? { ...l, kekosongan: newKekosongan, status: autoStatus } : l));
      }

      const { error } = await supabase
        .from('polyrent_listings')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;
      
      if (autoStatus === 'CLOSED') {
        toast.success('Kekosongan 0 — Iklan ditutup secara automatik (Penuh)', { icon: '🏠' });
      } else if (autoStatus === 'OPEN') {
        toast.success('Kekosongan ada — Iklan dibuka semula secara automatik!', { icon: '✅' });
      } else {
        toast.success(`Kekosongan dikemaskini: ${newKekosongan} orang`);
      }
      onUpdateComplete();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengemaskini kekosongan');
      fetchMyAds(); // revert
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    
    // Optimistic UI update
    setMyListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));

    try {
      const { error } = await supabase
        .from('polyrent_listings')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(newStatus === 'CLOSED' ? 'Iklan ditutup (Telah Disewa)' : 'Iklan dibuka semula');
      onUpdateComplete();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menukar status');
      fetchMyAds();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Adakah anda pasti mahu memadam iklan ini? Tindakan ini tidak boleh dipulihkan.")) return;

    setMyListings(prev => prev.filter(l => l.id !== id));
    
    try {
      const { error } = await supabase
        .from('polyrent_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Iklan berjaya dipadam');
      onUpdateComplete();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memadam iklan');
      fetchMyAds();
    }
  };

  const handleDeleteReverseAd = async (id: string) => {
    if (!window.confirm("Padam iklan pencarian ini?")) return;
    setMyReverseAds(prev => prev.filter(a => a.id !== id));
    try {
      const { error } = await supabase.from('polyrent_reverse_ads').delete().eq('id', id);
      if (error) throw error;
      toast.success('Iklan pencarian dipadam');
      onUpdateComplete();
    } catch (err) {
      toast.error('Gagal memadam iklan');
      fetchMyAds();
    }
  };

  const handleToggleReverseStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    setMyReverseAds(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try {
      const { error } = await supabase.from('polyrent_reverse_ads').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(newStatus === 'CLOSED' ? 'Ditutup (Sudah jumpa rumah)' : 'Dibuka Semula');
      onUpdateComplete();
    } catch (err) {
      toast.error('Gagal menukar status');
      fetchMyAds();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex flex-col justify-end items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-[90dvh] sm:h-[85dvh] max-w-3xl bg-slate-50 dark:bg-slate-950 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-col border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center justify-between p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">Iklan Saya</h2>
                      <p className="text-xs text-slate-500 font-medium">Urus iklan rumah & pencarian anda</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="px-6 flex gap-4">
                  <button
                    onClick={() => setActiveTab('IKLAN_RUMAH')}
                    className={cn("pb-3 text-sm font-bold border-b-2 transition-all", activeTab === 'IKLAN_RUMAH' ? "border-indigo-500 text-indigo-500" : "border-transparent text-slate-500 hover:text-slate-700")}
                  >
                    Iklan Tuan Rumah
                  </button>
                  <button
                    onClick={() => setActiveTab('PENCARIAN_BILIK')}
                    className={cn("pb-3 text-sm font-bold border-b-2 transition-all", activeTab === 'PENCARIAN_BILIK' ? "border-teal-500 text-teal-500" : "border-transparent text-slate-500 hover:text-slate-700")}
                  >
                    Pencarian Bilik (Reverse)
                  </button>
                </div>
              </div>

              {/* Content List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                    <p className="text-sm font-medium">Memuatkan iklan anda...</p>
                  </div>
                ) : activeTab === 'IKLAN_RUMAH' ? (
                  myListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                        <Home className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Tiada Iklan Rumah</h3>
                      <p className="text-slate-500 text-sm">Anda belum memuat naik sebarang iklan rumah sewa.</p>
                    </div>
                  ) : (
                    myListings.map((listing) => (
                      <div key={listing.id} className={cn("bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm flex flex-col gap-5", listing.status === 'CLOSED' ? "border-slate-200 dark:border-white/5 opacity-75" : "border-indigo-100 dark:border-indigo-500/20")}>
                        
                        {/* Top Row: Info */}
                        <div className="flex gap-4">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                            {listing.images?.length > 0 || listing.image_url ? (
                              <img src={listing.images?.length > 0 ? listing.images[0] : listing.image_url} className="w-full h-full object-cover grayscale-[20%]" alt="Rumah" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-slate-300" /></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 flex items-center gap-1.5">
                                {listing.title}
                                {listing.is_hidden && <EyeOff className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Iklan disembunyikan akibat laporan" />}
                              </h4>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0", listing.status === 'OPEN' ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                {listing.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2 truncate">{listing.lokasi}</p>
                            <p className="text-xs font-bold text-indigo-500 mb-2">RM{listing.sewa_bulanan} / kepala</p>
                            <p className="text-[10px] text-slate-400">Dibuat {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: ms })}</p>
                          </div>
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-white/5" />

                        {/* Bottom Row: Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Kekosongan Stepper */}
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slot Kosong</span>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-200 dark:border-white/5">
                              <button 
                                onClick={() => handleUpdateKekosongan(listing.id, listing.kekosongan, -1)}
                                disabled={listing.kekosongan <= 0}
                                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 disabled:opacity-50"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-lg font-black text-slate-900 dark:text-white w-6 text-center">{listing.kekosongan}</span>
                              <button 
                                onClick={() => handleUpdateKekosongan(listing.id, listing.kekosongan, 1)}
                                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Status & Delete */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button 
                              onClick={() => handleToggleStatus(listing.id, listing.status)}
                              className={cn("px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all", listing.status === 'OPEN' ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-emerald-500 text-white")}
                            >
                              <CheckCircle className="w-4 h-4" />
                              {listing.status === 'OPEN' ? 'Tandakan Disewa' : 'Buka Semula'}
                            </button>
                            
                            <button 
                              onClick={() => handleDelete(listing.id)}
                              className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                        {listing.kekosongan === 0 && listing.status === 'OPEN' && (
                          <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>Kekosongan adalah 0. Iklan masih 'Aktif' tetapi pencari mungkin tidak berminat. Sila 'Tandakan Disewa' jika rumah sudah penuh.</p>
                          </div>
                        )}

                      </div>
                    ))
                  )
                ) : (
                  myReverseAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-6">
                        <Package className="w-10 h-10 text-teal-400" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Tiada Pencarian Semasa</h3>
                      <p className="text-slate-500 text-sm">Anda belum mengiklankan pencarian bilik/rumah.</p>
                    </div>
                  ) : (
                    myReverseAds.map((ad) => (
                      <div key={ad.id} className={cn("bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm flex flex-col gap-4", ad.status === 'CLOSED' ? "border-slate-200 dark:border-white/5 opacity-75" : "border-teal-100 dark:border-teal-500/20")}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-2", ad.status === 'OPEN' ? "bg-teal-500/10 text-teal-600" : "bg-slate-100 text-slate-500")}>
                              {ad.status === 'OPEN' ? 'Sedang Mencari' : 'Sudah Berjumpa'}
                            </span>
                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">"{ad.description}"</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 font-bold uppercase">Bajet</span>
                            <p className="text-lg font-black text-rose-500">RM{ad.budget}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>{ad.klk_kawasan?.name || 'Mana-mana Kawasan'}</span>
                          <span>{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true, locale: ms })}</span>
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-white/5" />

                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleToggleReverseStatus(ad.id, ad.status)}
                            className={cn("px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all", ad.status === 'OPEN' ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-teal-500 text-white")}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {ad.status === 'OPEN' ? 'Tandakan Selesai' : 'Buka Semula'}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteReverseAd(ad.id)}
                            className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
