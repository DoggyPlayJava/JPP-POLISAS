import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Search, Loader2, Trash2, Home, MapPin, ChevronLeft, ShieldCheck, ShieldAlert, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { FeatureToggle } from '@/components/ui/FeatureToggle';

export function PolyRentAdmin() {
  const { t, i18n } = useTranslation(['housing', 'common']);
  const navigate = useNavigate();
  
  // Data States
  const [matchList, setMatchList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('polyrent_listings')
        .select(`
          *, 
          profiles:author_id(full_name, matric_no),
          polyrent_reports(id, reason, status, created_at, profiles:reporter_id(full_name))
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setMatchList(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(t('housing:fetch_polyrent_failed', 'Gagal memuatkan data PolyRent'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm(t('housing:confirm_delete_listing_perm', 'Padam iklan PolyRent ini secara kekal?'))) return;
    try {
      const { error } = await supabase.from('polyrent_listings').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('housing:ad_deleted_success', 'Iklan dipadam'));
      setMatchList(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      toast.error(t('housing:delete_ad_failed', 'Gagal memadam iklan'));
    }
  };

  const handleToggleVerified = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('polyrent_listings').update({ is_verified: !current }).eq('id', id);
      if (error) throw error;
      toast.success(!current ? t('housing:ad_verified_success', 'Iklan disahkan (Verified)') : t('housing:ad_unverified_success', 'Pengesahan ditarik balik'));
      setMatchList(prev => prev.map(m => m.id === id ? { ...m, is_verified: !current } : m));
    } catch (err) {
      toast.error(t('housing:error_updating_status', 'Ralat mengemas kini status'));
    }
  };

  const handleToggleHidden = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('polyrent_listings').update({ is_hidden: !current }).eq('id', id);
      if (error) throw error;
      toast.success(!current ? t('housing:ad_hidden_success', 'Iklan disembunyikan') : t('housing:ad_unhidden_success', 'Iklan dipulihkan'));
      setMatchList(prev => prev.map(m => m.id === id ? { ...m, is_hidden: !current } : m));
    } catch (err) {
      toast.error(t('housing:error_updating_status', 'Ralat mengemas kini status'));
    }
  };

  const handleResolveReports = async (listingId: string) => {
    try {
      const { error } = await supabase.from('polyrent_reports').update({ status: 'CLOSED' }).eq('listing_id', listingId).eq('status', 'OPEN');
      if (error) throw error;
      toast.success(t('housing:all_reports_resolved_success', 'Semua laporan telah diselesaikan'));
      // Update local state to mark reports as closed
      setMatchList(prev => prev.map(m => {
        if (m.id === listingId) {
          return {
            ...m,
            polyrent_reports: m.polyrent_reports?.map((r: any) => ({ ...r, status: 'CLOSED' }))
          };
        }
        return m;
      }));
    } catch (err) {
      toast.error(t('housing:resolve_reports_failed', 'Gagal menyelesaikan laporan'));
    }
  };

  const filteredMatch = matchList.filter(m => 
    (m.title && m.title.toLowerCase().includes(search.toLowerCase())) || 
    (m.lokasi && m.lokasi.toLowerCase().includes(search.toLowerCase())) ||
    m.profiles?.matric_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 sm:p-8 bg-slate-950 text-white space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/klk')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Home className="w-7 h-7 text-teal-500" />
            {t('housing:polyrent_mgmt_title', 'Pengurusan PolyRent')}
          </h1>
          <p className="text-sm text-white/50 mt-1">{t('housing:polyrent_mgmt_subtitle', 'Pantau dan urus iklan pencarian rakan serumah.')}</p>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6">
        <h3 className="text-lg font-bold text-white mb-2">{t('housing:module_settings_title', 'Tetapan Modul')}</h3>
        <p className="text-sm text-white/50 mb-4">{t('housing:module_settings_desc', 'Hidupkan atau matikan ciri PolyRent untuk semua pengguna portal.')}</p>
        <FeatureToggle 
          moduleId="polyrent" 
          label={t('housing:system_polyrent_label', 'Sistem PolyRent')} 
          description={t('housing:system_polyrent_desc', 'Buka portal iklan rumah/rakan bilik kepada pelajar.')} 
        />
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-96">
        <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text"
          placeholder={t('housing:search_polyrent_placeholder', 'Cari tajuk, lokasi, atau matrik...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Content Area */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-1 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-teal-500" />
            <p className="text-xs font-bold uppercase tracking-widest animate-pulse">{t('housing:loading_records', 'Memuatkan Rekod...')}</p>
          </div>
        ) : filteredMatch.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 py-20">
            <Home className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">{t('housing:no_ads_found', 'Tiada iklan dijumpai.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredMatch.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-black/20 border border-white/10 rounded-2xl p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-white leading-tight mb-1 flex items-center gap-2">
                        {m.title}
                        {m.is_verified && <ShieldCheck className="w-4 h-4 text-emerald-500" title={t('housing:verified_by_klk', 'Disahkan oleh KLK')} />}
                        {m.is_hidden && <EyeOff className="w-4 h-4 text-rose-500" title={t('housing:hidden_reported', 'Disembunyikan (Dilaporkan)')} />}
                      </h4>
                      <div className="text-xs text-white/50 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" /> {m.lokasi}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleVerified(m.id, m.is_verified)}
                        className={cn("p-1.5 rounded-lg transition-colors", m.is_verified ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white" : "bg-white/10 text-white/50 hover:bg-emerald-500/20 hover:text-emerald-400")}
                        title={m.is_verified ? t('housing:unverify_btn', 'Tarik Balik Pengesahan') : t('housing:verify_btn', 'Sahkan Iklan (Verify)')}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleHidden(m.id, m.is_hidden)}
                        className={cn("p-1.5 rounded-lg transition-colors", m.is_hidden ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white" : "bg-white/10 text-white/50 hover:bg-rose-500/20 hover:text-rose-400")}
                        title={m.is_hidden ? t('housing:unhide_btn', 'Pulihkan (Unhide)') : t('housing:hide_btn', 'Sembunyikan (Hide)')}
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors ml-1"
                        title={t('housing:delete_ad_perm_btn', 'Padam Iklan Secara Kekal')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-white/70 mb-4 line-clamp-2">
                    {t('housing:listing_summary_line', 'RM{{rent}} • {{vacancy}} Kosong • {{gender}}', {
                      rent: m.sewa_bulanan,
                      vacancy: m.kekosongan,
                      gender: m.jantina_prefer,
                    })}
                  </div>
                  
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center mt-auto">
                    <div>
                      <div className="text-xs font-bold text-teal-400">{m.profiles?.full_name}</div>
                      <div className="text-[10px] text-white/40 font-mono">{m.profiles?.matric_no}</div>
                    </div>
                    <div className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: i18n.language === 'en' ? enUS : ms })}
                    </div>
                  </div>

                  {m.polyrent_reports && m.polyrent_reports.filter((r: any) => r.status === 'OPEN').length > 0 && (
                    <div className="mt-4 pt-4 border-t border-rose-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <ShieldAlert className="w-4 h-4" />
                          <span className="text-xs font-bold">
                            {t('housing:active_reports_count', '{{count}} Laporan Aktif', {
                              count: m.polyrent_reports.filter((r: any) => r.status === 'OPEN').length,
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleResolveReports(m.id)}
                          className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded transition-colors"
                        >
                          {t('housing:resolve_reports_btn', 'Selesaikan Laporan')}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {m.polyrent_reports.filter((r: any) => r.status === 'OPEN').slice(0, 3).map((r: any) => (
                          <div key={r.id} className="text-[10px] text-rose-200/70 bg-rose-500/5 p-1.5 rounded line-clamp-1 border border-rose-500/10">
                            <span className="font-bold text-rose-300">{r.profiles?.full_name}:</span> {r.reason}
                          </div>
                        ))}
                        {m.polyrent_reports.filter((r: any) => r.status === 'OPEN').length > 3 && (
                          <div className="text-[10px] text-white/40 text-center italic mt-1">
                            {t('housing:other_reports_count', '+{{count}} laporan lain', {
                              count: m.polyrent_reports.filter((r: any) => r.status === 'OPEN').length - 3,
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
