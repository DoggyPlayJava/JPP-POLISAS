import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Star, ShoppingCart, Store, TrendingUp, Zap, ChevronRight, ChevronLeft,
  Package, Clock, AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PolyProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock_quantity: number;
  publish_to_polymart: boolean;
  is_available: boolean;
  keusahawanan_businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    polymart_contact_method: string;
    status: string;
  } | null;
  avg_rating?: number;
  review_count?: number;
}

interface PolyBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  product_count?: number;
}

interface PolyAd {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  type: 'INTERNAL' | 'EXTERNAL';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  start_date?: string;
  end_date?: string;
  clicks: number;
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: PolyProduct; index: number }) {
  const navigate = useNavigate();
  const emoji = CATEGORY_EMOJI[product.category] ?? '📦';
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const isOut = product.stock_quantity === 0;
  const avgRating = product.avg_rating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/polymart/produk/${product.id}`)}
      className="group cursor-pointer rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-amber-500/30 hover:shadow-lg transition-all duration-300"
      style={{ '--hover-shadow': PM_GLOW } as React.CSSProperties}
    >
      {/* Image / Placeholder */}
      <div className="relative aspect-square overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: `linear-gradient(135deg, ${PM_LIGHT}, rgba(249,115,22,0.08))` }}>
            {emoji}
          </div>
        )}

        {/* Status badges */}
        {isOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase text-white tracking-widest bg-black/60 px-3 py-1 rounded-full">
              Habis
            </span>
          </div>
        )}
        {isLowStock && !isOut && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />
            <span>Hampir habis</span>
          </div>
        )}

        {/* Category pill */}
        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
          {product.category}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        {/* Business name */}
        <p className="text-[9px] font-bold text-muted-foreground/60 truncate flex items-center gap-1">
          <Store className="w-2.5 h-2.5 shrink-0" />
          {product.keusahawanan_businesses?.name ?? 'Kedai'}
        </p>

        {/* Product name */}
        <h3 className="text-[12px] font-black text-foreground leading-tight line-clamp-2">
          {product.name}
        </h3>

        {/* Price + rating */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[13px] font-black" style={{ color: PM_ACCENT }}>
            RM {product.price.toFixed(2)}
          </span>
          {avgRating && avgRating > 0 ? (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-bold text-muted-foreground">{avgRating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ── Business Card ──────────────────────────────────────────────────────────────
function BusinessCard({ biz }: { biz: PolyBusiness }) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate(`/polymart?vendor=${biz.id}`)}
      className="group flex flex-col items-center gap-2 cursor-pointer shrink-0"
    >
      <div className="w-14 h-14 rounded-2xl border-2 border-border/50 group-hover:border-amber-500/40 transition-colors overflow-hidden relative"
        style={{ background: PM_LIGHT }}>
        {biz.logo_url
          ? <img src={biz.logo_url} alt={biz.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Store className="w-6 h-6" style={{ color: PM_ACCENT }} /></div>
        }
      </div>
      <p className="text-[9px] font-bold text-center text-muted-foreground max-w-[60px] truncate">
        {biz.name}
      </p>
    </motion.div>
  );
}

// ── In-Feed Ad Card ────────────────────────────────────────────────────────────
function InFeedAdCard({ ad }: { ad: PolyAd }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Increment click asynchronously
    supabase.rpc('increment_polymart_ad_click', { ad_id: ad.id }).catch(() => {
      supabase.from('polymart_ads').update({ clicks: ad.clicks + 1 }).eq('id', ad.id).catch(() => {});
    });
    if (ad.link_url) {
      if (ad.link_url.startsWith('http')) window.open(ad.link_url, '_blank');
      else navigate(ad.link_url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="group cursor-pointer rounded-2xl border-2 border-amber-500/50 overflow-hidden relative shadow-lg hover:shadow-xl hover:border-amber-500 transition-all duration-300 flex flex-col bg-amber-500/10"
    >
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-[9px] font-black tracking-widest text-white uppercase z-10 shadow-md">
        Disponsor
      </div>
      
      <div className="relative aspect-square w-full">
        <img src={ad.image_url} alt={ad.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[12px] font-black text-white leading-tight drop-shadow-md">{ad.title}</p>
        </div>
      </div>
    </motion.div>
  );
}

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

// ── Ads Banner Carousel ────────────────────────────────────────────────────────
function HeroBanner({ totalProducts, totalVendors, ads }: { totalProducts: number; totalVendors: number; ads: PolyAd[] }) {
  const navigate = useNavigate();
  // Filter active ads based on dates
  const activeAds = useMemo(() => {
    const now = new Date();
    return ads.filter(ad => {
      if (ad.status !== 'ACTIVE') return false;
      if (ad.start_date && new Date(ad.start_date) > now) return false;
      if (ad.end_date && new Date(ad.end_date) < now) return false;
      return true;
    });
  }, [ads]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: true })]);

  const handleAdClick = async (ad: PolyAd) => {
    // Increment click asynchronously
    supabase.rpc('increment_polymart_ad_click', { ad_id: ad.id }).catch(() => {
      // Fallback if RPC doesn't exist: manually update
      supabase.from('polymart_ads').update({ clicks: ad.clicks + 1 }).eq('id', ad.id).catch(() => {});
    });
    // Navigate
    if (ad.link_url) {
      if (ad.link_url.startsWith('http')) window.open(ad.link_url, '_blank');
      else navigate(ad.link_url);
    }
  };

  const DefaultBanner = () => (
    <div className="relative rounded-3xl overflow-hidden w-full shrink-0"
      style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1207 100%)' }}>
      <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full blur-3xl opacity-30"
        style={{ background: PM_GRADIENT }} />
      <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full blur-2xl opacity-20"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />

      <div className="relative p-5 sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: PM_GRADIENT }}>
                <ShoppingCart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest">PolyMart Beta</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight mb-1">
              Jelajah Kedai<br />
              <span style={{ background: PM_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Kampus Anda
              </span>
            </h1>
            <p className="text-[11px] text-white/50 font-medium mb-4">
              Tempah produk dari peniaga berdaftar JPP.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Package, value: totalProducts, label: 'Produk' },
                { icon: Store,   value: totalVendors,  label: 'Peniaga' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: PM_LIGHT }}>
                    <s.icon className="w-3 h-3" style={{ color: PM_ACCENT }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-white leading-none">{s.value}</p>
                    <p className="text-[8px] text-white/40 font-medium">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-5xl sm:text-6xl leading-none select-none mt-1">🛍️</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full mb-5 group">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {/* Default banner runs first */}
          <DefaultBanner />
          {/* Active ads inject after */}
          {activeAds.map(ad => (
            <div key={ad.id} className="relative w-full shrink-0 cursor-pointer" onClick={() => handleAdClick(ad)}>
              <div className="flex items-center justify-center w-full aspect-[2.5/1] sm:aspect-[3/1] md:aspect-[4/1] overflow-hidden rounded-3xl bg-muted/30 border border-border/50">
                <img src={ad.image_url} alt={ad.title} loading="lazy" decoding="async" className="w-full h-full object-cover shrink-0 hover:scale-[1.02] transition-transform duration-500" />
              </div>
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-xl">
                <p className="text-[8px] font-black text-white uppercase tracking-widest">{ad.type === 'EXTERNAL' ? 'Penaja' : 'Iklan'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {(activeAds.length > 0) && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 hover:bg-background border border-border/50 shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all z-10 hidden sm:flex"
          >
            <ChevronLeft className="w-4 h-4 ml-[-2px]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 hover:bg-background border border-border/50 shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all z-10 hidden sm:flex"
          >
            <ChevronRight className="w-4 h-4 mr-[-2px]" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartHome() {
  const { activeCategory, searchQuery } = usePolymart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products,  setProducts]  = useState<PolyProduct[]>([]);
  const [businesses, setBusinesses] = useState<PolyBusiness[]>([]);
  const [ads,       setAds]       = useState<PolyAd[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sortBy,    setSortBy]    = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [vendorFilter, setVendorFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('vendor');
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // Fetch Products and Ads in parallel
      const [prodsRes, adsRes] = await Promise.all([
        supabase
          .from('business_products')
          .select(`
            id, name, description, price, category, image_url,
            stock_quantity, publish_to_polymart, is_available, business_id,
            keusahawanan_businesses!business_id(id, name, logo_url, polymart_contact_method, status)
          `)
          .eq('publish_to_polymart', true)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('polymart_ads')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const prods = prodsRes.data;
      setAds((adsRes.data as PolyAd[]) || []);

      // Filter active businesses
      const active = ((prods ?? []) as unknown as PolyProduct[]).filter(
        (p: PolyProduct) => (p.keusahawanan_businesses as any)?.status === 'ACTIVE'
      );

      // Get review stats
      const productIds = active.map(p => p.id);
      if (productIds.length > 0) {
        const { data: reviews } = await supabase
          .from('polymart_reviews')
          .select('product_id, rating');
        const statsMap: Record<string, { sum: number; count: number }> = {};
        reviews?.forEach(r => {
          if (!statsMap[r.product_id]) statsMap[r.product_id] = { sum: 0, count: 0 };
          statsMap[r.product_id].sum += r.rating;
          statsMap[r.product_id].count++;
        });
        active.forEach(p => {
          const s = statsMap[p.id];
          if (s && s.count > 0) { p.avg_rating = s.sum / s.count; p.review_count = s.count; }
        });
      }

      setProducts(active);

      // Unique businesses
      const bizMap = new Map<string, PolyBusiness>();
      active.forEach(p => {
        const b = p.keusahawanan_businesses;
        if (b && !bizMap.has(b.id)) {
          bizMap.set(b.id, { id: b.id, name: b.name, logo_url: b.logo_url });
        }
      });
      active.forEach(p => {
        const b = p.keusahawanan_businesses;
        if (b && bizMap.has(b.id)) {
          const entry = bizMap.get(b.id)!;
          entry.product_count = (entry.product_count ?? 0) + 1;
        }
      });
      setBusinesses(Array.from(bizMap.values()));
      setLoading(false);
    };
    load();
  }, []);

  const inFeedAds = useMemo(() => {
    const now = new Date();
    return ads.filter(ad => {
      if (ad.status !== 'ACTIVE' || ad.type !== 'INTERNAL') return false; 
      if (ad.start_date && new Date(ad.start_date) > now) return false;
      if (ad.end_date && new Date(ad.end_date) < now) return false;
      return true;
    });
  }, [ads]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (vendorFilter) list = list.filter(p => p.keusahawanan_businesses?.id === vendorFilter);
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.keusahawanan_businesses?.name ?? '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)); break;
    }

    const finalList: (PolyProduct | { _isAd: true; ad: PolyAd })[] = [...list];
    
    // Inject active ads into grid if we are browsing "all" products
    if (activeCategory === 'all' && !searchQuery && !vendorFilter && inFeedAds.length > 0) {
      if (finalList.length >= 2) finalList.splice(2, 0, { _isAd: true, ad: inFeedAds[0] });
      if (inFeedAds[1] && finalList.length >= 6) finalList.splice(6, 0, { _isAd: true, ad: inFeedAds[1] });
      if (inFeedAds[2] && finalList.length >= 10) finalList.splice(10, 0, { _isAd: true, ad: inFeedAds[2] });
    }

    return finalList;
  }, [products, activeCategory, searchQuery, sortBy, vendorFilter, inFeedAds]);

  const totalVendors = businesses.length;
  const totalProducts = products.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
        <p className="text-sm text-muted-foreground font-medium">Memuatkan PolyMart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero / Ads Carousel */}
      {activeCategory === 'all' && !searchQuery && !vendorFilter && (
        <HeroBanner totalProducts={totalProducts} totalVendors={totalVendors} ads={ads} />
      )}

      {/* Vendor filter active indicator */}
      {vendorFilter && (
        <div className="flex items-center justify-between py-2 px-3 rounded-2xl border border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5" style={{ color: PM_ACCENT }} />
            <span className="text-xs font-bold">
              {businesses.find(b => b.id === vendorFilter)?.name ?? 'Semua Kedai'}
            </span>
          </div>
          <button onClick={() => setVendorFilter(null)}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
            Papar Semua ×
          </button>
        </div>
      )}

      {/* Peniaga section */}
      {!searchQuery && activeCategory === 'all' && !vendorFilter && businesses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: PM_GRADIENT }}>
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-black text-foreground">Peniaga Aktif</h2>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-bold" style={{ color: PM_ACCENT }}>
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {businesses.map(b => <BusinessCard key={b.id} biz={b} />)}
          </div>
        </section>
      )}

      {/* Product grid section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: PM_LIGHT }}>
              <Zap className="w-3 h-3" style={{ color: PM_ACCENT }} />
            </div>
            <h2 className="text-sm font-black text-foreground">
              {searchQuery ? `Hasil Carian "${searchQuery}"` :
               activeCategory !== 'all' ? `${CATEGORY_EMOJI[activeCategory] ?? ''} ${activeCategory}` :
               vendorFilter ? 'Produk Kedai' : 'Semua Produk'}
              <span className="text-xs font-medium text-muted-foreground ml-1.5">({filtered.length})</span>
            </h2>
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="h-7 px-2 rounded-xl text-[10px] font-bold outline-none bg-muted/40 border border-border/50 text-foreground focus:border-border transition-all">
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga ↑</option>
            <option value="price_desc">Harga ↓</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🛒</div>
              <p className="text-sm font-bold text-muted-foreground/60">
                {searchQuery ? 'Tiada produk dijumpai' : 'Tiada produk dalam kategori ini'}
              </p>
              <p className="text-xs text-muted-foreground/40">Cuba kategori atau carian lain</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((item, i) => {
                if ('_isAd' in item) {
                  return <InFeedAdCard key={`ad-${item.ad.id}`} ad={item.ad} />;
                }
                const p = item as PolyProduct;
                return <ProductCard key={p.id} product={p} index={i} />;
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Empty state — no products at all */}
      {products.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-6xl">🏪</div>
          <div className="text-center">
            <p className="text-base font-black text-foreground">PolyMart Belum Ada Produk</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Peniaga belum muat naik produk ke marketplace.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 max-w-sm text-center">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Peniaga e-Keusahawanan boleh publish produk dari POS → Katalog Produk
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
