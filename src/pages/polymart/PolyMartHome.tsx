import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { supabase } from '@/lib/supabase';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_ICON_MAP } from './PolyMartLayout';
import { useAuth } from '@/contexts/AuthContext';
import { type PolyAd } from '@/types';
import {
  Star, ShoppingCart, Store, TrendingUp, Zap, ChevronRight, ChevronLeft,
  Package, Clock, AlertCircle, Heart, Sparkles, PackageSearch, ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  // Flash sale / pre-order
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  is_preorder?: boolean;
}

interface PolyBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  product_count?: number;
}


// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, index, isWishlisted, onToggleWishlist }: { product: PolyProduct; index: number; isWishlisted: boolean; onToggleWishlist: (id: string) => void }) {
  const navigate = useNavigate();
  const FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const isOut = product.stock_quantity === 0;
  const avgRating = product.avg_rating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/polymart/produk/${product.id}`)}
      className="group cursor-pointer rounded-2xl bg-card dark:bg-slate-900/90 border border-border/60 hover:border-amber-400/50 hover:shadow-[0_8px_24px_rgba(245,158,11,0.08)] transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Image / Placeholder */}
      <div className="relative aspect-square overflow-hidden bg-muted/20 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
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
            {product.category}
          </div>
        )}
        {/* Flash sale badge */}
        {product.sale_price && product.sale_start_at && product.sale_end_at &&
          new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at) && (
          <div className="absolute bottom-2 left-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse z-10">
            <Zap className="w-2.5 h-2.5 fill-current" />
            <span>-{Math.round((1 - product.sale_price / product.price) * 100)}%</span>
          </div>
        )}
        {/* Pre-order badge */}
        {product.is_preorder && (
          <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
            <Package className="w-2.5 h-2.5" />
            <span>PRA-TEMPAH</span>
          </div>
        )}

        {/* Wishlist toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-950/80 backdrop-blur-xs border border-white/20 shadow-xs flex items-center justify-center z-10 hover:scale-110 active:scale-90 transition-all cursor-pointer"
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 transition-all ${isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground/60'}`} />
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1">
        {/* Business name */}
        <p className="text-[9px] font-bold text-muted-foreground/70 truncate flex items-center gap-1">
          <Store className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          <span>{product.keusahawanan_businesses?.name ?? 'Kedai'}</span>
        </p>

        {/* Product name */}
        <h3 className="text-[12px] font-bold text-foreground leading-snug line-clamp-2 min-h-[2rem]">
          {product.name}
        </h3>

        {/* Price + rating */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          {(() => {
            const isOnSale = product.sale_price && product.sale_start_at && product.sale_end_at &&
              new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at);
            return isOnSale ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-black text-rose-500">RM {product.sale_price!.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground/50 line-through">RM {product.price.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">RM {product.price.toFixed(2)}</span>
            );
          })()}
          {avgRating && avgRating > 0 ? (
            <div className="flex items-center gap-0.5 shrink-0">
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
      <div className="w-14 h-14 rounded-2xl border border-border/60 hover:border-amber-400/50 bg-muted/30 overflow-hidden relative transition-all group-hover:scale-105 shadow-xs">
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-500">
            <Store className="w-6 h-6" />
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-center text-muted-foreground group-hover:text-foreground transition-colors max-w-[64px] truncate">
        {biz.name}
      </p>
    </motion.div>
  );
}

// ── In-Feed Ad Card ────────────────────────────────────────────────────────────
function InFeedAdCard({ ad }: { ad: PolyAd }) {
  const navigate = useNavigate();
  
  const handleClick = async () => {
    // Increment click asynchronously
    try {
      const { error } = await supabase.rpc('increment_polymart_ad_click', { ad_id: ad.id });
      if (error) {
        await supabase.from('polymart_ads').update({ clicks: ad.clicks + 1 }).eq('id', ad.id);
      }
    } catch (e) {
      console.warn('Ad click tracking failed', e);
    }
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
      className="group cursor-pointer rounded-2xl border border-amber-500/40 overflow-hidden relative shadow-sm hover:shadow-md hover:border-amber-500 transition-all duration-300 flex flex-col bg-amber-500/10"
    >
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-[9px] font-black tracking-widest text-white uppercase z-10 shadow-xs">
        Disponsor
      </div>
      
      <div className="relative aspect-square w-full">
        <img src={ad.image_url} alt={ad.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[12px] font-black text-white leading-tight drop-shadow-sm">{ad.title}</p>
        </div>
      </div>
    </motion.div>
  );
}

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
    try {
      const { error } = await supabase.rpc('increment_polymart_ad_click', { ad_id: ad.id });
      if (error) {
        await supabase.from('polymart_ads').update({ clicks: ad.clicks + 1 }).eq('id', ad.id);
      }
    } catch (e) {
      console.warn('Ad click tracking failed', e);
    }
    // Navigate
    if (ad.link_url) {
      if (ad.link_url.startsWith('http')) window.open(ad.link_url, '_blank');
      else navigate(ad.link_url);
    }
  };

  const DefaultBanner = () => (
    <div
      className="relative rounded-3xl overflow-hidden w-full shrink-0 border border-amber-500/20 max-h-[180px] bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40"
    >
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 bg-amber-500 pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full blur-2xl opacity-15 bg-orange-500 pointer-events-none" />

      <div className="relative p-4 sm:p-5 flex items-center justify-between h-full">
        <div className="flex-1 pr-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Pasar Mahasiswa POLISAS</span>
          </div>

          <h1 className="text-base sm:text-xl font-black text-white leading-tight mb-1">
            Jelajah & Tempah Produk{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Kampus Anda
            </span>
          </h1>

          <p className="text-[10px] sm:text-[11px] text-white/60 font-medium mb-3 line-clamp-1">
            Tempah produk terus dari usahawan mahasiswa POLISAS.
          </p>

          <div className="flex items-center gap-2 sm:gap-3">
            {[
              { icon: Package, value: totalProducts, label: 'Produk' },
              { icon: Store,   value: totalVendors,  label: 'Peniaga' },
            ].map(s => (
              <div key={s.label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400">
                  <s.icon className="w-3 h-3" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs sm:text-sm font-black text-white leading-none">{s.value}</span>
                  <span className="text-[8px] sm:text-[9px] text-white/50 font-medium">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-400 shadow-inner shrink-0 mr-2">
          <ShoppingBag className="w-8 h-8" />
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
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Wishlist toggle
  const toggleWishlist = async (productId: string) => {
    if (!user) { toast.error('Sila log masuk untuk simpan ke wishlist'); return; }
    const isCurrently = wishlistIds.has(productId);
    // Optimistic update
    setWishlistIds(prev => {
      const next = new Set(prev);
      isCurrently ? next.delete(productId) : next.add(productId);
      return next;
    });
    if (isCurrently) {
      const { error } = await supabase.from('polymart_wishlist').delete()
        .eq('user_id', user.id).eq('product_id', productId);
      if (error) {
        setWishlistIds(prev => { const n = new Set(prev); n.add(productId); return n; });
        toast.error('Gagal mengalih keluar dari wishlist');
      }
    } else {
      const { error } = await supabase.from('polymart_wishlist').insert({
        user_id: user.id, product_id: productId,
      });
      if (error) {
        setWishlistIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
        if (!error.message.includes('duplicate')) toast.error('Gagal menyimpan ke wishlist');
      } else {
        toast.success('Disimpan ke wishlist ❤️', { duration: 1500 });
      }
    }
  };

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
            sale_price, sale_start_at, sale_end_at, is_preorder,
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

      // Fetch wishlist if logged in
      if (user) {
        const { data: wl } = await supabase.from('polymart_wishlist')
          .select('product_id').eq('user_id', user.id);
        if (wl) setWishlistIds(new Set(wl.map(w => w.product_id)));
      }
    };
    load();
  }, [user]);

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
      const q = searchQuery.toLowerCase().trim();
      const qWords = q.split(/\s+/);

      // Simple fuzzy: check if string contains query OR if all query words appear (in any order)
      const fuzzyMatch = (text: string): number => {
        const t = text.toLowerCase();
        // Exact substring = highest score
        if (t.includes(q)) return 3;
        // All words match individually (e.g. "baju hitam" matches "baju warna hitam")
        if (qWords.every(w => t.includes(w))) return 2;
        // At least half the words match
        const matchCount = qWords.filter(w => t.includes(w)).length;
        if (matchCount >= Math.ceil(qWords.length / 2)) return 1;
        // Typo tolerance: check if any word is 1-2 chars different (simple distance)
        const tWords = t.split(/\s+/);
        for (const qw of qWords) {
          for (const tw of tWords) {
            if (qw.length >= 3 && tw.length >= 3) {
              // Check if words share >60% characters
              const shorter = Math.min(qw.length, tw.length);
              let common = 0;
              const twChars = [...tw];
              for (const c of qw) {
                const idx = twChars.indexOf(c);
                if (idx >= 0) { common++; twChars.splice(idx, 1); }
              }
              if (common / shorter >= 0.6) return 0.5;
            }
          }
        }
        return 0;
      };

      // Score each product
      const scored = list.map(p => {
        const nameScore = fuzzyMatch(p.name) * 3;        // Name match = 3x weight
        const descScore = fuzzyMatch(p.description ?? '') * 1;
        const vendorScore = fuzzyMatch(p.keusahawanan_businesses?.name ?? '') * 1.5;
        const catScore = fuzzyMatch(p.category) * 2;
        return { p, score: nameScore + descScore + vendorScore + catScore };
      });

      list = scored.filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.p);
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
      <section className="tour-polymart-home">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: PM_LIGHT }}>
              <Zap className="w-3 h-3" style={{ color: PM_ACCENT }} />
            </div>
            <h2 className="text-sm font-black text-foreground">
              {searchQuery ? `Hasil Carian "${searchQuery}"` :
               activeCategory !== 'all' ? activeCategory :
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
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xs">
                <PackageSearch className="w-7 h-7" />
              </div>
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
                return <ProductCard key={p.id} product={p} index={i} isWishlisted={wishlistIds.has(p.id)} onToggleWishlist={toggleWishlist} />;
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Empty state — no products at all */}
      {products.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xs">
            <Store className="w-8 h-8" />
          </div>
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
