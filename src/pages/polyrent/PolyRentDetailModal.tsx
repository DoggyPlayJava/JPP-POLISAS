import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Phone, Users, Navigation, Home, ShieldCheck, Calendar, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const formatWhatsApp = (phone: string, text?: string) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = '6' + cleaned;
  else if (!cleaned.startsWith('60') && !cleaned.startsWith('6')) cleaned = '60' + cleaned;
  
  let url = `https://wa.me/${cleaned}`;
  if (text) {
    url += `?text=${encodeURIComponent(text)}`;
  }
  return url;
};

// Detect if a string looks like a valid phone number
const isValidPhone = (val: string): boolean => {
  if (!val) return false;
  const stripped = val.replace(/[\s\-\+\(\)]/g, '');
  // Must be mostly digits, at least 8 digits, and not a long sentence
  return /^[0-9]{8,15}$/.test(stripped) && val.length < 20;
};

interface DetailModalProps {
  listing: any;
  onClose: () => void;
  onInterest: () => void;
  onOpenChat: (userId: string, userName: string) => void;
}

export function PolyRentDetailModal({ listing, onClose, onInterest, onOpenChat }: DetailModalProps) {
  const { t, i18n } = useTranslation(['housing', 'common']);
  const { profile } = useAuth();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [kawasanRating, setKawasanRating] = useState<any>(null);

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [safetyRatingForm, setSafetyRatingForm] = useState(5);
  const [facilityRatingForm, setFacilityRatingForm] = useState(5);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const fetchRating = async () => {
    if (listing.kawasan_id) {
      const { data } = await supabase.rpc('polyrent_get_kawasan_rating', { p_kawasan_id: listing.kawasan_id });
      if (data && data.length > 0 && data[0].total_reviews > 0) {
        setKawasanRating(data[0]);
      }
    }
  };

  React.useEffect(() => {
    fetchRating();
  }, [listing.kawasan_id]);

  const images = listing.images?.length > 0 ? listing.images : (listing.image_url ? [listing.image_url] : []);

  const handleContact = async () => {
    // Fire and forget increment
    await supabase.rpc('increment_polyrent_interest', { listing_id: listing.id });
    onInterest();
    
    const messageTemplate = `Salam, saya ${profile?.full_name || 'Pelajar'} dari POLISAS. Adakah bilik di ${listing.lokasi} yang berharga RM${listing.sewa_bulanan} masih ada?`;
    window.open(formatWhatsApp(listing.contact_info, messageTemplate), '_blank');
  };

  const handleReport = async () => {
    if (!profile) {
      toast.error(t('housing:detail_login_to_report', 'Sila log masuk untuk melaporkan iklan.'));
      return;
    }
    if (!reportReason.trim()) {
      toast.error(t('housing:detail_specify_reason', 'Sila nyatakan sebab aduan.'));
      return;
    }
    setIsSubmittingReport(true);
    try {
      const { error } = await supabase.from('polyrent_reports').insert({
        listing_id: listing.id,
        reporter_id: profile.id,
        reason: reportReason,
        status: 'OPEN'
      });
      if (error) {
        if (error.code === '23505') throw new Error(t('housing:detail_already_reported', 'Anda telah melaporkan iklan ini sebelum ini.'));
        throw error;
      }
      toast.success(t('housing:detail_report_success', 'Aduan berjaya dihantar untuk semakan JPP.'));
      setIsReportOpen(false);
      setReportReason('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('housing:detail_report_failed', 'Gagal menghantar aduan.'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!profile) {
      toast.error(t('housing:detail_login_to_rate', 'Sila log masuk untuk memberi rating.'));
      return;
    }
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase.from('polyrent_location_reviews').insert({
        kawasan_id: listing.kawasan_id,
        reviewer_id: profile.id,
        safety_rating: safetyRatingForm,
        facility_rating: facilityRatingForm
      });
      if (error) {
        if (error.code === '23505') throw new Error(t('housing:detail_already_rated', 'Anda telah memberi rating untuk kawasan ini sebelum ini.'));
        throw error;
      }
      toast.success(t('housing:detail_rating_success', 'Terima kasih! Rating anda berjaya direkodkan.'));
      setIsRatingOpen(false);
      fetchRating(); // refresh average
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('housing:detail_rating_failed', 'Gagal menghantar rating.'));
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60  z-[200] flex flex-col justify-end items-center sm:p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-[95dvh] sm:h-[85dvh] max-w-2xl bg-white dark:bg-slate-950 rounded-t-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative"
        >
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            {/* Edge-to-Edge Header Images */}
            <div className="relative w-full h-[40vh] min-h-[300px] bg-slate-100 dark:bg-slate-900 shrink-0">
              {images.length > 0 ? (
                <>
                  <img src={images[activeImgIndex]} alt="Rumah Sewa" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  
                  {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20  px-3 py-1.5 rounded-full">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImgIndex(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImgIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/50 dark:to-emerald-900/50 animate-pulse">
                  <Home className="w-16 h-16 mb-4 text-teal-500/50" />
                  <span className="text-sm font-bold uppercase tracking-widest text-teal-600/50">{t('housing:detail_no_image', 'Tiada Gambar')}</span>
                </div>
              )}
              
              <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/30  flex items-center justify-center text-white hover:bg-white/40 transition-colors z-20 border border-white/20">
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-6 left-6 right-6 z-20">
                <div className="inline-flex px-3 py-1 mb-3 rounded-full bg-white/20  text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                  {listing.jantina_prefer}
                </div>
                <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md flex items-center gap-2">
                  {listing.title}
                  {listing.is_verified && <ShieldCheck className="w-6 h-6 text-emerald-400 drop-shadow-md shrink-0" title={t('housing:verified_by_klk', 'Disahkan oleh KLK')} />}
                </h2>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              
              {/* Title & Basic Info */}
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium mb-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  {listing.lokasi}
                </div>
                
                {listing.kawasan_id && kawasanRating && (
                  <div className="mb-4 mt-2 p-3 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-100 dark:border-teal-500/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-widest">{t('housing:detail_klk_safety', 'Keselamatan KLK')}</span>
                          <span className="text-sm font-black text-teal-900 dark:text-teal-100">{kawasanRating.avg_safety} / 5.0</span>
                        </div>
                      </div>
                      <div className="w-[1px] h-8 bg-teal-200 dark:bg-teal-500/30" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-widest">{t('housing:detail_facility', 'Fasiliti')}</span>
                        <span className="text-sm font-black text-teal-900 dark:text-teal-100">{kawasanRating.avg_facility} / 5.0</span>
                      </div>
                      <div className="ml-auto flex items-center">
                         <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/20 px-2 py-1 rounded-full whitespace-nowrap">
                           {t('housing:detail_reviews_count', '{{count}} Ulasan', { count: kawasanRating.total_reviews })}
                         </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {listing.kawasan_id && (
                  <div className="mb-6">
                    {!isRatingOpen ? (
                      <button 
                        onClick={() => setIsRatingOpen(true)}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        {t('housing:detail_rate_area_prompt', 'Pernah tinggal di sini? Beri Rating Kawasan')}
                      </button>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">{t('housing:detail_rate_area_title', 'Nilai Kawasan KLK Ini')}</h4>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('housing:detail_safety_label', 'Keselamatan')}</span>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                              <button key={'s'+v} onClick={() => setSafetyRatingForm(v)} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${safetyRatingForm >= v ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('housing:detail_amenities_label', 'Kemudahan/Fasiliti')}</span>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                              <button key={'f'+v} onClick={() => setFacilityRatingForm(v)} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${facilityRatingForm >= v ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setIsRatingOpen(false)} className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                            {t('common:cancel', 'Batal')}
                          </button>
                          <button 
                            onClick={handleSubmitRating} 
                            disabled={isSubmittingRating}
                            className="px-4 py-1.5 rounded-lg bg-teal-500 text-white text-[10px] font-bold hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {isSubmittingRating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            {t('housing:detail_save_rating_btn', 'Simpan Rating')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-indigo-500" /> {listing.kekosongan} {t('housing:detail_vacancies_count', 'Kekosongan', { count: listing.kekosongan })}
                  </div>
                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Navigation className="w-4 h-4 text-emerald-500" /> {listing.jarak_polisas_km ? t('housing:detail_km_to_polisas', '{{distance}} KM ke POLISAS', { distance: listing.jarak_polisas_km }) : t('housing:detail_distance_unknown', 'Jarak unknown')}
                  </div>
                  {listing.available_from && (
                    <>
                      <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-amber-500" /> {t('housing:detail_available_from', 'Bermula {{date}}', { date: new Date(listing.available_from).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Syarat & Ciri */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t('housing:detail_terms_traits_heading', 'Syarat & Ciri Dicari')}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {listing.ciri_ciri_dicari || t('housing:detail_no_special_terms', 'Tiada syarat khusus. Sila hubungi tuan rumah.')}
                </p>
              </div>

              {listing.kemudahan && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t('housing:detail_facilities_heading', 'Kemudahan Disediakan')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{listing.kemudahan}</p>
                </div>
              )}
              
              {/* Host Profile */}
              <div className="flex items-center gap-4 pt-8 pb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-xl uppercase shadow-inner">
                  {listing.profiles?.full_name?.substring(0,2) || 'PR'}
                </div>
                <div>
                   <p className="text-base font-bold text-slate-900 dark:text-white">
                     {t('housing:detail_posted_by', 'Diiklankan oleh {{name}}', { name: listing.profiles?.full_name })}
                   </p>
                   <p className="text-xs text-slate-500 font-medium">
                     {t('housing:detail_uploaded_ago', 'Dimuat naik {{time}}', { time: formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: i18n.language === 'en' ? enUS : ms }) })}
                   </p>
                </div>
              </div>

              {/* Report Section */}
              <div className="pt-4 pb-8 border-t border-slate-100 dark:border-white/5">
                {!isReportOpen ? (
                  <button 
                    onClick={() => setIsReportOpen(true)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-500 transition-colors font-medium"
                  >
                    <AlertTriangle className="w-4 h-4" /> {t('housing:detail_report_listing_btn', 'Laporkan Iklan Ini')}
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('housing:detail_report_reason_title', 'Sebab Aduan (Scam / Palsu / Dll)')}</h4>
                    <textarea 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder={t('housing:detail_report_reason_placeholder', 'Sila jelaskan sebab anda melaporkan iklan ini...')}
                      rows={3}
                      className="w-full text-sm p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-rose-500/50 outline-none mb-3 resize-none dark:text-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setIsReportOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                      >
                        {t('common:cancel', 'Batal')}
                      </button>
                      <button 
                        onClick={handleReport}
                        disabled={isSubmittingReport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
                      >
                        {isSubmittingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />} {t('housing:detail_submit_report_btn', 'Hantar Aduan')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

            </div>
          </div>

          {/* Floating Sticky Action Bar (Airbnb Reserve Style) */}
          <div className="absolute bottom-0 inset-x-0 px-6 py-4 pb-8 sm:pb-6 bg-white/80 dark:bg-slate-950/80  border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             <div className="flex flex-col">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">{t('housing:detail_monthly_rent_label', 'Sewa Bulanan')}</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">RM{listing.sewa_bulanan}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-0.5">{t('housing:detail_per_person', '/kepala')}</span>
                </div>
                {listing.deposit_awal > 0 && (
                   <span className="text-[10px] text-slate-500 font-medium mt-1 underline decoration-dashed underline-offset-2">
                     {t('housing:detail_deposit_label', 'Depo: RM{{amount}}', { amount: listing.deposit_awal })}
                   </span>
                )}
             </div>
             
           <div className="flex flex-col items-end">
               {(listing.interested_count > 0) && (
                  <div className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse mb-1">
                    🔥 {t('housing:detail_negotiating_count', '{{count}} sedang berunding', { count: listing.interested_count })}
                  </div>
               )}
               <div className="flex items-center gap-2">
                 {/* Chat button — only show if Tuan Rumah enabled in-app chat */}
                 {listing.enable_in_app_chat !== false && (
                   <button
                     onClick={() => {
                       if (profile?.id === listing.author_id) {
                         toast(t('housing:detail_own_listing', 'Ini adalah iklan anda sendiri'), { icon: 'ℹ️' });
                       } else {
                         onOpenChat(listing.author_id, listing.profiles?.full_name || 'Tuan Rumah');
                       }
                     }}
                     className="h-12 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                   >
                     <MessageCircle className="w-4 h-4" /> {t('housing:detail_chat_btn', 'Chat')}
                   </button>
                 )}

                 {/* WhatsApp button — smart detection */}
                 {isValidPhone(listing.contact_info) ? (
                   <button
                     onClick={handleContact}
                     className="h-12 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-rose-500/30"
                   >
                     WhatsApp
                   </button>
                 ) : (
                   <button
                     onClick={() => {
                       // Show the contact info as a toast since it's not a phone number
                       if (listing.contact_info && listing.contact_info.trim()) {
                         toast(listing.contact_info, {
                           icon: '📋',
                           duration: 6000,
                           style: { maxWidth: '320px', fontSize: '13px' }
                         });
                       } else {
                         toast(t('housing:detail_no_contact_info', 'Tiada maklumat hubungi disediakan. Sila guna In-App Chat.'), { icon: '⚠️' });
                       }
                     }}
                     className="h-12 px-6 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     <Phone className="w-4 h-4" /> {t('housing:detail_contact_btn', 'Hubungi')}
                   </button>
                 )}
               </div>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
