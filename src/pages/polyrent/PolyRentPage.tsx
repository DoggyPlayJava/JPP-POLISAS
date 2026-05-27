import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
  Home, Plus, X, Search, MapPin, ChevronLeft, ArrowRight, 
  Phone, Heart, Filter, Calculator, Map, List, CheckCircle2, Navigation, Menu, Users, MessageCircle, ShieldCheck, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { PolyRentForm } from './PolyRentForm';
import { PolyRentCalculatorModal } from './PolyRentCalculatorModal';
import { PolyRentDetailModal } from './PolyRentDetailModal';
import { PolyRentSidebar } from './PolyRentSidebar';
import { PolyRentMyAdsModal } from './PolyRentMyAdsModal';
import { PolyRentReverseForm } from './PolyRentReverseForm';
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

const formatWhatsApp = (phone: string) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '6' + cleaned;
  } else if (!cleaned.startsWith('60') && !cleaned.startsWith('6')) {
    cleaned = '60' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
};

export function PolyRentPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(true);

  // Tour
  const { runTour, startTour, closeTour } = useTour('POLYRENT_PAGE', !loading);
  
  // States
  const [activeTab, setActiveTab] = useState<'CARI_BILIK' | 'PELAJAR_MENCARI'>('CARI_BILIK');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'SEMUA' | 'LELAKI' | 'PEREMPUAN' | 'SAVED'>('SEMUA');
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('polyrent_wishlist') || '[]'); } catch { return []; }
  });
  
  const [reverseAds, setReverseAds] = useState<any[]>([]);
  const [loadingReverse, setLoadingReverse] = useState(false);
  const [isReverseFormOpen, setIsReverseFormOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMyAdsOpen, setIsMyAdsOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  
  // Calculate average price for Price Insights
  const averagePrice = listings.length > 0 
    ? listings.reduce((acc, curr) => acc + curr.sewa_bulanan, 0) / listings.length 
    : 0;

  useEffect(() => {
    checkModuleStatus();
    fetchListings();
  }, []);

  // Persist wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('polyrent_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Smart wishlist sync: purge IDs that no longer exist in active listings
  // This runs after listings load — zero extra DB queries
  useEffect(() => {
    if (listings.length > 0 && wishlist.length > 0) {
      const activeIds = new Set(listings.map(l => l.id));
      const validWishlist = wishlist.filter(id => activeIds.has(id));
      if (validWishlist.length !== wishlist.length) {
        setWishlist(validWishlist);
      }
    }
  }, [listings]);

  // Automatic deep-linking listing detail popup
  useEffect(() => {
    const listingId = searchParams.get('listingId');
    if (!listingId) return;

    if (listings.length > 0) {
      const found = listings.find(l => l.id === listingId);
      if (found) {
        setSelectedListing(found);
      } else {
        // Fetch from database in case listing is hidden/archive or outside typical active viewport
        supabase
          .from('polyrent_listings')
          .select(`*, profiles:author_id ( full_name )`)
          .eq('id', listingId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setSelectedListing(data);
          });
      }
    }
  }, [searchParams, listings]);

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
  };

  const checkModuleStatus = async () => {
    const { data } = await supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'polyrent').maybeSingle();
    if (data && data.is_enabled === false) {
      setModuleEnabled(false);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('polyrent_listings')
        .select(`*, profiles:author_id ( full_name )`)
        .eq('status', 'OPEN')
        .or('is_hidden.is.null,is_hidden.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan senarai PolyRent.');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.lokasi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'SEMUA'
      || (activeFilter === 'SAVED' && wishlist.includes(l.id))
      || l.jantina_prefer.toUpperCase() === activeFilter;
    return matchSearch && matchFilter;
  });

  const savedListings = listings.filter(l => wishlist.includes(l.id));

  const fetchReverseAds = async () => {
    try {
      setLoadingReverse(true);
      const { data, error } = await supabase
        .from('polyrent_reverse_ads')
        .select(`*, profiles:student_id ( full_name ), klk_kawasan:kawasan_id ( name )`)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReverseAds(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReverse(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PELAJAR_MENCARI' && reverseAds.length === 0) {
      fetchReverseAds();
    }
  }, [activeTab]);

  const filteredReverseAds = reverseAds.filter(r => {
    const matchSearch = (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (r.klk_kawasan?.name && r.klk_kawasan.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchFilter = activeFilter === 'SEMUA' || r.jantina_prefer.toUpperCase() === activeFilter;
    return matchSearch && matchFilter;
  });

  // Parallax Scroll Effects
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const headerY = useTransform(scrollY, [0, 150], [0, -30]);
  const searchBarY = useTransform(scrollY, [0, 150], [0, -80]);
  const searchBarWidth = useTransform(scrollY, [0, 150], ['100%', '80%']);

  const berbaloiListings = filteredListings.filter(l => averagePrice > 0 && l.sewa_bulanan < (averagePrice * 0.9));
  const normalListings = filteredListings.filter(l => !(averagePrice > 0 && l.sewa_bulanan < (averagePrice * 0.9)));

  if (!moduleEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Home className="w-16 h-16 text-slate-800 mb-6" />
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">Modul PolyRent Ditutup</h1>
        <button onClick={() => navigate('/portal')} className="mt-8 px-6 py-3 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
          Kembali ke Portal
        </button>
      </div>
    );
  }

  // Helper function to render a listing card (Airbnb Style)
  const renderCard = (listing: any, isHorizontal: boolean = false) => {
    const isSaved = wishlist.includes(listing.id);
    const isCheaper = averagePrice > 0 && listing.sewa_bulanan < (averagePrice * 0.9);
    
    return (
      <motion.div
        key={listing.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setSelectedListing(listing)}
        className={cn("tour-polyrent-card group flex flex-col relative cursor-pointer snap-start", isHorizontal ? "w-64 shrink-0" : "w-full")}
      >
        {/* Top Right Wishlist Heart */}
        <button 
          onClick={(e) => toggleWishlist(e, listing.id)}
          className="tour-polyrent-wishlist absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-90 transition-all border border-white/10"
        >
          <Heart className={cn("w-4 h-4 transition-colors", isSaved ? "fill-rose-500 text-rose-500" : "text-white")} />
        </button>

        {/* Top Left Price Insight (Airbnb "Guest Favorite" style) */}
        {isCheaper && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-white shadow-lg text-slate-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
             Pilihan Berbaloi
          </div>
        )}

        {/* Image / Header */}
        <div className="relative w-full aspect-square rounded-[1.2rem] overflow-hidden mb-2.5 bg-slate-100 dark:bg-slate-800">
          {listing.images?.length > 0 || listing.image_url ? (
            <>
              <img src={listing.images?.length > 0 ? listing.images[0] : listing.image_url} alt="Bilik" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 animate-pulse">
              <Home className="w-10 h-10 mb-2 text-teal-500/30" />
              <span className="text-[10px] font-bold text-teal-600/50 uppercase">Tiada Gambar</span>
            </div>
          )}
        </div>

        {/* Minimal Airbnb-style Body Content */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{listing.lokasi}</h4>
            {listing.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Disahkan KLK" />}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs truncate mb-1">{listing.kekosongan} Kekosongan • {listing.jantina_prefer}</p>
          <div className="flex items-center gap-1">
             <span className="font-bold text-slate-900 dark:text-white text-sm">RM{listing.sewa_bulanan}</span>
             <span className="text-slate-500 text-xs font-medium">/ bulan</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-24 selection:bg-teal-500/30">
      
      {/* ── CINEMATIC HERO SECTION ── */}
      <div className="relative pt-6 pb-28 md:pb-36 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover opacity-20 mix-blend-overlay" alt="Room background" />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-slate-900/40 to-slate-900/80" />
        </div>
        
        {/* Top Navbar */}
        <div className="relative z-10 flex items-center justify-between p-4 px-6 max-w-7xl mx-auto mb-10">
          <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* Help (?) button - tour trigger */}
            <button
              onClick={startTour}
              className="tour-help-button w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors border border-white/10"
              title="Panduan PolyRent"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={() => setIsCalculatorOpen(true)} className="tour-polyrent-calculator w-10 h-10 rounded-full bg-indigo-500/20 backdrop-blur-md flex items-center justify-center text-indigo-300 hover:bg-indigo-500/30 transition-colors border border-indigo-500/30">
              <Calculator className="w-4 h-4" />
            </button>
            <button onClick={() => setIsFormOpen(true)} className="tour-polyrent-add flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-teal-500 text-white font-bold text-sm hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/30">
              <Plus className="w-4 h-4" /> Iklan
            </button>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div style={{ opacity: headerOpacity, y: headerY }}>
            <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold text-[9px] uppercase tracking-widest mb-4">
              PolyRent by JPP POLISAS
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-8">
              Cari Kawan Sewa.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">Lebih Jimat.</span>
            </h1>
          </motion.div>
          
          {/* Parallax Glassmorphic Search Bar */}
          <motion.div style={{ y: searchBarY, width: searchBarWidth }} className="tour-polyrent-search mx-auto bg-white/10 backdrop-blur-3xl border border-white/20 p-1.5 rounded-full flex items-center shadow-2xl">
             <div className="flex-1 flex items-center pl-4">
               <Search className="w-4 h-4 text-white mr-3" />
               <input 
                 type="text" 
                 value={searchQuery} 
                 onChange={e=>setSearchQuery(e.target.value)} 
                 placeholder="Cari kawasan (cth: Beserah)..." 
                 className="w-full bg-transparent text-white placeholder:text-white/60 focus:outline-none font-semibold text-sm" 
               />
             </div>
             <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-md shrink-0">
               <ArrowRight className="w-4 h-4" />
             </div>
          </motion.div>
        </div>
      </div>

      {/* ── TABS & FILTER PILLS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 mb-8 flex flex-col justify-center items-center gap-4">
        
        {/* Main Tabs */}
        <div className="tour-polyrent-tabs bg-white dark:bg-slate-900 rounded-full shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 p-1.5 flex overflow-hidden w-full max-w-sm">
          <button
            onClick={() => setActiveTab('CARI_BILIK')}
            className={cn(
              "flex-1 py-2.5 rounded-full text-xs font-bold transition-all text-center",
              activeTab === 'CARI_BILIK' 
                ? "bg-teal-500 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Iklan Rumah
          </button>
          <button
            onClick={() => setActiveTab('PELAJAR_MENCARI')}
            className={cn(
              "flex-1 py-2.5 rounded-full text-xs font-bold transition-all text-center",
              activeTab === 'PELAJAR_MENCARI' 
                ? "bg-teal-500 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Pelajar Mencari
          </button>
        </div>

        {/* Gender Filters + Saved */}
        {activeTab === 'CARI_BILIK' && (
          <div className="tour-polyrent-filters bg-white dark:bg-slate-900 rounded-full shadow-lg shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-white/5 p-1.5 flex gap-1 overflow-x-auto no-scrollbar max-w-full">
            {(['SEMUA', 'LELAKI', 'PEREMPUAN'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-6 sm:px-8 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap",
                  activeFilter === filter 
                    ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                {filter}
              </button>
            ))}
            <button
              onClick={() => setActiveFilter('SAVED')}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                activeFilter === 'SAVED'
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-rose-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              )}
            >
              <Heart className={cn("w-3 h-3", activeFilter === 'SAVED' ? 'fill-white' : '')} />
              Tersimpan {wishlist.length > 0 && <span className="ml-0.5 opacity-70">({wishlist.length})</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 pb-20">
        {activeTab === 'PELAJAR_MENCARI' ? (
          <div>
            <div className="flex justify-between items-end mb-6">
               <div>
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pelajar Cari Rumah</h2>
                 <p className="text-xs text-slate-500">Bilik kosong? Tawarkan terus kepada mereka.</p>
               </div>
               <button onClick={() => setIsReverseFormOpen(true)} className="px-4 py-2 rounded-xl bg-teal-500 text-white font-bold text-xs hover:bg-teal-600 transition-colors shadow-sm">
                 Saya Cari Bilik
               </button>
            </div>
            
            {loadingReverse ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredReverseAds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-teal-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Tiada Permintaan Semasa</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">Jadilah yang pertama untuk mengiklankan pencarian rumah/bilik sewa.</p>
                <button onClick={() => setIsReverseFormOpen(true)} className="px-6 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 transition-transform shadow-lg text-sm">
                  Saya Cari Rumah
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReverseAds.map(ad => (
                  <div key={ad.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                             {ad.profiles?.full_name?.substring(0,2) || 'PR'}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-900 dark:text-white">{ad.profiles?.full_name}</span>
                             <span className="text-[10px] font-medium text-slate-500">{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true, locale: ms })}</span>
                           </div>
                         </div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 dark:bg-teal-500/20 px-2 py-1 rounded-full">
                           {ad.jantina_prefer}
                         </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1 line-clamp-3">"{ad.description}"</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-auto">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bajet Maks</span>
                         <span className="text-base font-black text-rose-500">RM{ad.budget}</span>
                       </div>
                       
                       <button 
                         onClick={() => {
                           if (profile?.id === ad.student_id) {
                             toast('Ini adalah iklan anda sendiri', { icon: 'ℹ️' });
                           } else {
                             window.dispatchEvent(
                               new CustomEvent('open-polyrent-chat', {
                                 detail: {
                                   partnerId: ad.student_id,
                                   partnerName: ad.profiles?.full_name || 'Pelajar',
                                   listing: {
                                     id: ad.id,
                                     title: `Bajet RM${ad.budget}: ${ad.lokasi_prefer || 'Mana-mana'}`,
                                     sewa_bulanan: ad.budget,
                                     image_url: undefined
                                   }
                                 }
                               })
                             );
                           }
                         }}
                         className="px-4 py-2 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                       >
                         <MessageCircle className="w-4 h-4" />
                         Mesej
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          // Skeleton Loading (Premium Feel)
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 mt-12">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex flex-col">
                <div className="w-full aspect-square rounded-[1.2rem] bg-slate-200 dark:bg-slate-800 animate-pulse mb-3" />
                <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2" />
                <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
                <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              {activeFilter === 'SAVED'
                ? <Heart className="w-10 h-10 text-rose-400" />
                : <Search className="w-10 h-10 text-slate-400" />}
            </div>
            {activeFilter === 'SAVED' ? (
              <>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Tiada Iklan Tersimpan</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">Tekan ikon ❤️ pada mana-mana iklan untuk menyimpannya ke sini.</p>
                <button onClick={() => setActiveFilter('SEMUA')} className="mt-6 px-6 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 transition-transform shadow-lg">
                  Semak Iklan Lain
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Tiada Iklan Dijumpai</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">Cuba tukar carian atau tetapan penapis anda.</p>
              </>
            )}
          </div>
        ) : (
          <div className="pb-10 pt-4">
            
            {/* Horizontal Scroll untuk Harga Berbaloi */}
            {berbaloiListings.length > 0 && (
              <div className="mb-10 -mx-4 sm:mx-0">
                <div className="px-4 sm:px-0 mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilihan Berbaloi</h2>
                  <p className="text-slate-500 text-xs">Harga lebih rendah dari purata pasaran</p>
                </div>
                <div className="flex overflow-x-auto gap-4 px-4 sm:px-0 pb-6 snap-x snap-mandatory no-scrollbar">
                  {berbaloiListings.map(l => renderCard(l, true))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Semua Kediaman</h2>
            </div>
            
            {/* 2-Column Grid untuk semua (Airbnb style mobile layout) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              <AnimatePresence>
                {normalListings.map(l => renderCard(l, false))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* MULTI-STEP FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <PolyRentForm 
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              setIsFormOpen(false);
              fetchListings();
            }} 
          />
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedListing && (
          <PolyRentDetailModal 
            listing={selectedListing} 
            onClose={() => setSelectedListing(null)} 
            onInterest={() => {
              // Optimistically update the count in UI
              setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, interested_count: (l.interested_count || 0) + 1 } : l));
            }}
            onOpenChat={(userId, userName) => {
              if (profile?.id === userId) {
                toast('Ini adalah iklan anda sendiri', { icon: 'ℹ️' });
                return;
              }
              window.dispatchEvent(
                new CustomEvent('open-polyrent-chat', {
                  detail: {
                    partnerId: userId,
                    partnerName: userName,
                    listing: selectedListing
                  }
                })
              );
            }}
          />
        )}
      </AnimatePresence>


      {/* POLYRENT MENU SIDEBAR */}
      <PolyRentSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenMyAds={() => setIsMyAdsOpen(true)}
      />

      {/* MY ADS MODAL (HOST MANAGEMENT) */}
      <PolyRentMyAdsModal 
        isOpen={isMyAdsOpen} 
        onClose={() => setIsMyAdsOpen(false)} 
        onUpdateComplete={fetchListings} 
      />

      {/* REVERSE ADS FORM MODAL */}
      <AnimatePresence>
        {isReverseFormOpen && (
          <PolyRentReverseForm
            onClose={() => setIsReverseFormOpen(false)}
            onSuccess={() => {
              setIsReverseFormOpen(false);
              fetchReverseAds();
            }}
          />
        )}
      </AnimatePresence>



      {/* CALCULATOR MODAL */}
      <PolyRentCalculatorModal 
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* BOTTOM NAV */}
      <div className="tour-polyrent-menu">
        <BottomNav 
          customLinks={{
            left: [
              { icon: Menu, label: 'Menu', onClick: () => setIsSidebarOpen(true) },
              { icon: Home, label: 'Rumah', onClick: () => navigate('/portal'), isActive: false }
            ],
            right: [
              { icon: Calculator, label: 'Kira Bil', onClick: () => setIsCalculatorOpen(true) },
              { icon: Heart, label: 'Wishlist', onClick: () => {
                  if (activeFilter === ('SAVED' as any)) setActiveFilter('SEMUA');
                  else setActiveFilter('SAVED' as any);
              }, isActive: activeFilter === ('SAVED' as any) }
            ]
          }}
        />
      </div>

      {/* INTERACTIVE TOUR */}
      <SystemTour run={runTour} onClose={closeTour} tourKey="POLYRENT_PAGE" />
      <FloatingAiChat />
    </div>
  );
}
