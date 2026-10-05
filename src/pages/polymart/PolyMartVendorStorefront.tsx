import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePolymart, CATEGORY_ICON_MAP, PM_ACCENT } from './PolyMartLayout';
import toast from 'react-hot-toast';
import {
  Store, Star, ShoppingBag, ShoppingCart, MessageCircle, Phone, Share2,
  Package, Search, ChevronRight, CheckCircle2, Award, Clock, ArrowLeft,
  Heart, PackageSearch, Utensils, Shirt, Wrench, Sparkles, MapPin,
  CreditCard, Banknote, X, Zap
} from 'lucide-react';

interface VendorBusiness {
  id: string;
  name: string;
  description: string | null;
  category_id?: string | null;
  owner_id: string;
  status: string;
  logo_url: string | null;
  cover_url?: string | null;
  is_active: boolean;
  is_ems_siswapreneur?: boolean;
  ssm_registration_number?: string | null;
  registration_no?: string | null;
  business_phone?: string | null;
  online_payment_enabled?: boolean;
  cod_enabled?: boolean;
  payment_qr_url?: string | null;
  payment_instructions?: string | null;
  polymart_contact_method?: string;
  polymart_pickup_info?: string | null;
  polymart_location?: string | null;
}

interface VendorProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock_quantity: number;
  publish_to_polymart: boolean;
  is_available: boolean;
  business_id: string;
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  is_preorder?: boolean;
  avg_rating?: number;
  review_count?: number;
  polymart_pickup_info?: string | null;
  polymart_location?: string | null;
}

export function PolyMartVendorStorefront() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetchCounts } = usePolymart();

  const [business, setBusiness] = useState<VendorBusiness | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Store metrics state
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchStoreData = async () => {
      setLoading(true);
      try {
        // Fetch business metadata
        const { data: bizData, error: bizErr } = await supabase
          .from('keusahawanan_businesses')
          .select('*')
          .eq('id', id)
          .single();

        if (bizErr || !bizData) {
          toast.error('Kedai tidak dijumpai');
          setLoading(false);
          return;
        }

        setBusiness(bizData as VendorBusiness);

        // Fetch products
        const { data: prodsData, error: prodsErr } = await supabase
          .from('business_products')
          .select('*')
          .eq('business_id', id)
          .eq('publish_to_polymart', true)
          .eq('is_available', true)
          .order('created_at', { ascending: false });

        if (prodsErr) {
          console.error('Error fetching vendor products:', prodsErr);
          setLoading(false);
          return;
        }

        const rawProducts = (prodsData || []) as VendorProduct[];

        // Fetch reviews for rating computation
        if (rawProducts.length > 0) {
          const prodIds = rawProducts.map(p => p.id);
          const { data: reviewsData } = await supabase
            .from('polymart_reviews')
            .select('product_id, rating')
            .in('product_id', prodIds);

          if (reviewsData && reviewsData.length > 0) {
            const statsMap: Record<string, { sum: number; count: number }> = {};
            let storeSum = 0;
            reviewsData.forEach(r => {
              if (!statsMap[r.product_id]) statsMap[r.product_id] = { sum: 0, count: 0 };
              statsMap[r.product_id].sum += r.rating;
              statsMap[r.product_id].count++;
              storeSum += r.rating;
            });

            rawProducts.forEach(p => {
              const s = statsMap[p.id];
              if (s && s.count > 0) {
                p.avg_rating = s.sum / s.count;
                p.review_count = s.count;
              }
            });

            setAvgRating(storeSum / reviewsData.length);
            setTotalReviews(reviewsData.length);
          } else {
            setAvgRating(0);
            setTotalReviews(0);
          }
        }

        setProducts(rawProducts);

        // Fetch user wishlist
        if (user) {
          const { data: wlData } = await supabase
            .from('polymart_wishlist')
            .select('product_id')
            .eq('user_id', user.id);
          if (wlData) setWishlistIds(new Set(wlData.map(w => w.product_id)));
        }
      } catch (err) {
        console.error('Error in vendor storefront loading:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [id, user]);

  // Wishlist toggle handler
  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error('Sila log masuk untuk simpan ke senarai hajat');
      return;
    }
    const isCurrently = wishlistIds.has(productId);
    setWishlistIds(prev => {
      const next = new Set(prev);
      isCurrently ? next.delete(productId) : next.add(productId);
      return next;
    });

    if (isCurrently) {
      const { error } = await supabase
        .from('polymart_wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      if (error) {
        setWishlistIds(prev => new Set(prev).add(productId));
        toast.error('Gagal mengalih keluar dari senarai hajat');
      }
    } else {
      const { error } = await supabase
        .from('polymart_wishlist')
        .insert({ user_id: user.id, product_id: productId });
      if (error) {
        setWishlistIds(prev => {
          const n = new Set(prev);
          n.delete(productId);
          return n;
        });
        if (!error.message.includes('duplicate')) {
          toast.error('Gagal menyimpan ke senarai hajat');
        }
      } else {
        toast.success('Disimpan ke senarai hajat');
      }
    }
  };

  // Format phone number for WhatsApp
  const phone = business?.business_phone;
  const formattedPhone = phone ? phone.replace(/\D/g, '').replace(/^0/, '60') : null;

  // Actions
  const handleChatClick = () => {
    if (!business) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('open-polymart-chat', {
        detail: { businessId: business.id }
      })
    );
  };

  const handleShareClick = async () => {
    const shareData = {
      title: `${business?.name ?? 'Kedai'} - PolyMart POLISAS`,
      text: `Jom sokong perniagaan siswa ${business?.name ?? 'ini'} di PolyMart POLISAS!`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Pautan kedai disalin ke papan keratan');
    }
  };

  // Store category list derived from existing products
  const storeCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    return ['all', ...cats];
  }, [products]);

  // Primary category for watermark
  const primaryCategory = useMemo(() => {
    return products[0]?.category || 'Umum';
  }, [products]);

  const CategoryWatermark = ({ className }: { className?: string }) => {
    const Icon = CATEGORY_ICON_MAP[primaryCategory] || Store;
    return <Icon className={className} />;
  };

  // Filtered & Sorted products
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // Tab filter
    if (activeTab === 'popular') {
      list.sort((a, b) => {
        const scoreA = (a.avg_rating || 0) * (a.review_count || 1);
        const scoreB = (b.avg_rating || 0) * (b.review_count || 1);
        return scoreB - scoreA;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, activeTab, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }}
        />
        <p className="text-xs font-bold text-muted-foreground">Memuatkan etalase kedai...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <PackageSearch className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-black text-foreground">Kedai Tidak Ditemui</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Peniaga ini mungkin belum mengaktifkan akaun etalase PolyMart mereka.
          </p>
        </div>
        <button
          onClick={() => navigate('/polymart')}
          className="px-4 py-2 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 transition-colors"
        >
          Kembali ke PolyMart
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto -mx-3 sm:mx-auto">
      {/* ── Cover Area: Real Image or Smart Preset Ambient Mesh ── */}
      {business.cover_url ? (
        <div className="relative h-40 sm:h-52 w-full overflow-hidden bg-slate-900 border-b border-border/40">
          <img src={business.cover_url} alt={business.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative h-40 sm:h-52 w-full bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 border-b border-amber-500/20 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl opacity-20 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-orange-500/15 blur-2xl opacity-15 pointer-events-none" />
          <div className="absolute right-4 bottom-2 text-white/[0.07] pointer-events-none">
            <CategoryWatermark className="w-28 h-28 sm:w-36 sm:h-36" />
          </div>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Store Profile Header Card ── */}
      <div className="px-3 sm:px-0 -mt-10 sm:-mt-12 relative z-10">
        <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex items-start gap-3.5">
            {/* Avatar squircle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/20 bg-muted/40 shadow-lg overflow-hidden shrink-0 flex items-center justify-center">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-amber-500" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Peniaga Siswa Sah POLISAS</span>
                </span>
                {business.is_ems_siswapreneur && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                    <Award className="w-3 h-3 text-indigo-500" />
                    <span>Siswapreneur EMS</span>
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-xl font-black text-foreground truncate">
                {business.name}
              </h1>

              {business.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {business.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
            <button
              onClick={handleChatClick}
              className="flex-1 h-9 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Sembang Peniaga</span>
            </button>

            {formattedPhone && (
              <a
                href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hai ${business.name}, saya berminat dengan produk anda di PolyMart POLISAS!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              onClick={handleShareClick}
              className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Kongsi Kedai"
              aria-label="Kongsi"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Store Metrics Strip ── */}
      <div className="px-3 sm:px-0">
        <div className="grid grid-cols-3 gap-2 bg-card/70 dark:bg-slate-900/70 border border-border/60 rounded-2xl p-3 text-center">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Penilaian</span>
            </p>
            <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">
              {avgRating > 0 ? (
                <>
                  {avgRating.toFixed(1)} <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 inline -mt-0.5" />
                </>
              ) : (
                'Baru'
              )}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">
                ({totalReviews} ulasan)
              </span>
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Package className="w-3 h-3 text-amber-500" />
              <span>Produk Aktif</span>
            </p>
            <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">
              {products.length} Barangan
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <CreditCard className="w-3 h-3 text-amber-500" />
              <span>Pembayaran</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
              {business.online_payment_enabled && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  DuitNow QR
                </span>
              )}
              {business.cod_enabled !== false && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Tunai (COD)
                </span>
              )}
              {!business.online_payment_enabled && business.cod_enabled === false && (
                <span className="text-[9px] text-muted-foreground">Khas</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Store Navigation Tabs ── */}
      <div className="px-3 sm:px-0">
        <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
          {[
            { id: 'all', label: 'Semua Produk', count: products.length },
            { id: 'popular', label: 'Paling Laris' },
            { id: 'info', label: 'Info & Lokasi Ambil' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-3 sm:px-0">
        {activeTab === 'info' ? (
          /* Info & Lokasi Ambil Tab */
          <div className="bg-card/70 border border-border/60 rounded-3xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Lokasi & Panduan Ambil Pesanan</span>
              </h3>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-1">
                <p className="font-bold text-foreground">
                  {business.polymart_location || 'Kampus POLISAS'}
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {business.polymart_pickup_info ||
                    'Sila rujuk masa yang dipersetujui semasa checkout. Tunjukkan kod QR pesanan apabila berjumpa dengan peniaga.'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                <span>Syarat & Kaedah Pembayaran</span>
              </h3>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  {business.online_payment_enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/20">
                      <CreditCard className="w-3 h-3" /> DuitNow QR Disokong
                    </span>
                  )}
                  {business.cod_enabled !== false && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/20">
                      <Banknote className="w-3 h-3" /> Tunai / COD Diterima
                    </span>
                  )}
                </div>
                {business.payment_instructions && (
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {business.payment_instructions}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <Store className="w-3.5 h-3.5 text-amber-500" />
                <span>Maklumat Pendaftaran Peniaga</span>
              </h3>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Pendaftaran SSM / Pelajar:</span>
                  <span className="font-mono font-bold text-foreground">
                    {business.ssm_registration_number || business.registration_no || 'Disahkan Unit Keusahawanan'}
                  </span>
                </div>
                {business.business_phone && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">No. Hubungan Rasmi:</span>
                    <span className="font-mono font-bold text-foreground">{business.business_phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Status Peniaga:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Disahkan POLISAS
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Products Tabs ('all' or 'popular') */
          <div className="space-y-4">
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-full bg-background border border-border/70 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-xs transition-all">
                <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari dalam kedai ini..."
                  className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-muted shrink-0 cursor-pointer">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              {storeCategories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {storeCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`h-7 px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs font-black'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                      }`}
                    >
                      {cat === 'all' ? 'Semua' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {displayedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border/60 rounded-3xl p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <PackageSearch className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-foreground">Kedai ini belum memuat naik produk aktif.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {searchQuery ? 'Tiada padanan carian dijumpai.' : 'Sila kembali semula sebentar lagi.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedProducts.map((p, idx) => {
                  const FallbackIcon = CATEGORY_ICON_MAP[p.category] || Package;
                  const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= 5;
                  const isOut = p.stock_quantity === 0;
                  const isWishlisted = wishlistIds.has(p.id);

                  const isOnSale =
                    p.sale_price &&
                    p.sale_start_at &&
                    p.sale_end_at &&
                    new Date() >= new Date(p.sale_start_at) &&
                    new Date() <= new Date(p.sale_end_at);

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.25), duration: 0.2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/polymart/produk/${p.id}`)}
                      className="group cursor-pointer rounded-2xl bg-card dark:bg-slate-900/90 border border-border/60 hover:border-amber-400/50 hover:shadow-[0_8px_24px_rgba(245,158,11,0.08)] transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      {/* Image / Vector Squircle Fallback */}
                      <div className="relative aspect-square overflow-hidden bg-muted/20 flex items-center justify-center">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs group-hover:scale-110 transition-transform">
                              <FallbackIcon className="w-6 h-6" />
                            </div>
                          </div>
                        )}

                        {/* Status badges */}
                        {isOut && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <span className="text-[10px] font-black uppercase text-white tracking-widest bg-black/70 px-2.5 py-1 rounded-full border border-white/20">
                              Habis
                            </span>
                          </div>
                        )}
                        {isLowStock && !isOut && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-xs">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Hampir habis</span>
                          </div>
                        )}

                        {/* Category pill */}
                        {!isLowStock && (
                          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-xs text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 border border-white/10">
                            {p.category}
                          </div>
                        )}

                        {/* Sale / Pre-order badge */}
                        {isOnSale && (
                          <div className="absolute bottom-2 left-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse z-10">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            <span>-{Math.round((1 - p.sale_price! / p.price) * 100)}%</span>
                          </div>
                        )}
                        {p.is_preorder && (
                          <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
                            <Package className="w-2.5 h-2.5" />
                            <span>PRA-TEMPAH</span>
                          </div>
                        )}

                        {/* Wishlist toggle */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleWishlist(p.id);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-950/80 backdrop-blur-xs border border-white/20 shadow-xs flex items-center justify-center z-10 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                          aria-label="Senarai Hajat"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-all ${
                              isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground/60'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Product Info */}
                      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1">
                        <h3 className="text-[12px] font-bold text-foreground leading-snug line-clamp-2 min-h-[2rem]">
                          {p.name}
                        </h3>

                        {/* Price + rating */}
                        <div className="flex items-center justify-between pt-1 mt-auto">
                          {isOnSale ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs sm:text-sm font-black text-rose-500">
                                RM {p.sale_price!.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50 line-through">
                                RM {p.price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                              RM {p.price.toFixed(2)}
                            </span>
                          )}

                          {p.avg_rating && p.avg_rating > 0 ? (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {p.avg_rating.toFixed(1)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
