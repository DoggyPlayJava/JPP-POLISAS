import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, ShoppingBag, Search, Package, LayoutGrid,
  Shield, Home, SlidersHorizontal, X, LogIn, ShoppingCart, HelpCircle, Store, Plus, Heart, MessageCircle,
  Utensils, Coffee, Sparkles, Wrench, Shirt, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { BottomNav } from '@/components/layout/BottomNav';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';

// ── Constants ──────────────────────────────────────────────────────────────────
export const PM_ACCENT   = '#f59e0b';
export const PM_LIGHT    = 'rgba(245,158,11,0.12)';
export const PM_GLOW     = 'rgba(245,158,11,0.3)';
export const PM_GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';

export const CATEGORY_LIST = [
  { key: 'all',          label: 'Semua',        icon: LayoutGrid },
  { key: 'Makanan',      label: 'Makanan',      icon: Utensils },
  { key: 'Minuman',      label: 'Minuman',      icon: Coffee },
  { key: 'Aksesori',     label: 'Aksesori',     icon: Sparkles },
  { key: 'Perkhidmatan', label: 'Servis',       icon: Wrench },
  { key: 'Pakaian',      label: 'Pakaian',      icon: Shirt },
  { key: 'Elektronik',   label: 'Gadget',       icon: Smartphone },
  { key: 'Umum',         label: 'Umum',         icon: Package },
];

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Makanan: Utensils,
  Minuman: Coffee,
  Aksesori: Sparkles,
  Perkhidmatan: Wrench,
  Pakaian: Shirt,
  Elektronik: Smartphone,
  Umum: Package,
};

export const CATEGORY_EMOJI: Record<string, string> = {
  Makanan: '🍔', Minuman: '☕', Aksesori: '💎',
  Perkhidmatan: '🔧', Pakaian: '👕', Elektronik: '📱', Umum: '📦',
};

// ── Shared Context ─────────────────────────────────────────────────────────────
interface PolymartCtx {
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isVendor: boolean;
  pendingVendorCount: number;
  myActiveOrdersCount: number;
  cartCount: number;
  refetchCounts: () => void;
}
const PolymartContext = createContext<PolymartCtx>({
  activeCategory: 'all', setActiveCategory: () => {},
  searchQuery: '', setSearchQuery: () => {},
  isVendor: false, pendingVendorCount: 0, myActiveOrdersCount: 0, cartCount: 0, refetchCounts: () => {},
});
export const usePolymart = () => useContext(PolymartContext);

// ── Layout ─────────────────────────────────────────────────────────────────────
export function PolyMartLayout() {
  const { user, hasKeusahawananAccess, isSuperAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [activeCategory,    setActiveCategory]    = useState('all');
  const [searchQuery,       setSearchQuery]        = useState('');
  const [showSearch,        setShowSearch]         = useState(false);
  const [showMobileSearch,  setShowMobileSearch]   = useState(false);
  const [isVendor,          setIsVendor]           = useState(false);
  const [pendingVendorCount,setPendingVendorCount] = useState(0);
  const [myActiveOrdersCount, setMyActiveOrdersCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [myBizIds, setMyBizIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { runTour, startTour, closeTour } = useTour('POLYMART_LAYOUT', !!user);

  // Debounced search for live results inside mobile search overlay
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (localStorage.getItem('use_mock_auth') === 'true') {
          setSearchResults([
            { id: 'mock-prod-1', name: 'Nasi Lemak Ayam Goreng', price: 5.5, image_url: null, category: 'Makanan', keusahawanan_businesses: { name: 'Kedai Mock Cik Jah' } },
            { id: 'mock-prod-2', name: 'Kopi Ais Kaw', price: 3.0, image_url: null, category: 'Minuman', keusahawanan_businesses: { name: 'Kedai Mock Cik Jah' } }
          ]);
          setIsSearching(false);
          return;
        }
        const { data, error } = await supabase
          .from('business_products')
          .select(`
            id, name, price, image_url, category, is_available,
            keusahawanan_businesses ( name )
          `)
          .eq('is_available', true)
          .ilike('name', `%${searchQuery.trim()}%`)
          .limit(5);
        if (data) setSearchResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const isHome    = location.pathname === '/polymart' || location.pathname === '/polymart/';
  const isOrders  = location.pathname.includes('/pesanan-saya');
  const isVendorP = location.pathname.includes('/vendor');
  const isAdmin   = location.pathname.includes('/admin');

  const refetchCounts = useCallback(async () => {
    if (!user) return;
    if (localStorage.getItem('use_mock_auth') === 'true') {
      setMyActiveOrdersCount(1);
      setCartCount(2);
      
      const stored = localStorage.getItem('mock_vendor_orders');
      let pendingCount = 14;
      let bizIds = ['e489a087-46d2-4030-aeb1-ae7b1ba00ee3', '4b3a5eb4-1299-460f-addf-7105e7f2e58a'];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          pendingCount = parsed.filter((o: any) => o.status === 'PENDING').length;
          bizIds = [...new Set<string>(parsed.map((o: any) => o.business_id))];
        } catch (e) {
          console.error(e);
        }
      }
      setMyBizIds(bizIds);
      setIsVendor(true);
      setPendingVendorCount(pendingCount);
      return;
    }
    const [buyerRes, vendorRes, bizRes, cartRes] = await Promise.all([
      supabase.from('polymart_orders').select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id).in('status', ['PENDING', 'CONFIRMED', 'READY']),
      supabase.from('keusahawanan_businesses').select('id').eq('owner_id', user.id).eq('status', 'ACTIVE'),
      supabase.from('student_business_memberships').select('business_id').eq('user_id', user.id).eq('status', 'ACTIVE'),
      supabase.from('polymart_cart_items').select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
    ]);
    setMyActiveOrdersCount(buyerRes.count ?? 0);
    setCartCount(cartRes.count ?? 0);

    const bizIds = [
      ...(vendorRes.data?.map(b => b.id) ?? []),
      ...(bizRes.data?.map(m => m.business_id) ?? []),
    ];
    setMyBizIds(bizIds);
    setIsVendor(bizIds.length > 0);

    if (bizIds.length > 0) {
      const { count } = await supabase.from('polymart_orders')
        .select('id', { count: 'exact', head: true })
        .in('business_id', bizIds).eq('status', 'PENDING');
      setPendingVendorCount(count ?? 0);
    }
  }, [user]);

  useEffect(() => { refetchCounts(); }, [refetchCounts]);

  // Realtime subscription — hanya untuk VENDOR sahaja
  // Vendor perlu nampak pesanan baru masuk secara serta-merta (badge count dikemas kini live)
  // Pembeli biasa: badge count dikemas kini setiap kali mereka buka PolyMart (fetch-on-mount sudah ada di atas)
  useEffect(() => {
    if (!user || !isVendor || myBizIds.length === 0) return; // ← Pembeli biasa keluar di sini

    const sub = supabase.channel('polymart_vendor_orders_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polymart_orders' }, (payload) => {
        const record = (payload.new && Object.keys(payload.new).length > 0) ? payload.new : payload.old;
        if (record && myBizIds.includes((record as Record<string, any>).business_id)) {
           refetchCounts();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user, isVendor, myBizIds, refetchCounts]);



  return (
    <PolymartContext.Provider value={{
      activeCategory, setActiveCategory, searchQuery, setSearchQuery,
      isVendor, pendingVendorCount, myActiveOrdersCount, cartCount, refetchCounts,
    }}>
      <SystemTour
        run={runTour}
        onClose={closeTour}
        tourKey="POLYMART_LAYOUT"
      />
      <div className="min-h-screen bg-background">

        {/* ── Top Navbar ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-background/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="max-w-5xl mx-auto px-3 sm:px-5">

            {/* Main row */}
            <div className="flex items-center gap-2.5 h-14">

              {/* Back */}
              <button
                onClick={() => isHome ? navigate(user ? '/portal' : '/') : navigate(-1)}
                className="w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer group"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Logo */}
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => { navigate('/polymart'); setActiveCategory('all'); }}
                className="flex items-center gap-2.5 shrink-0 cursor-pointer text-left"
              >
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-400/30"
                  style={{ background: PM_GRADIENT }}
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div className="leading-tight hidden sm:block">
                  <p className="text-[13px] font-black tracking-tight text-foreground">PolyMart</p>
                  <p className="text-[8px] font-black tracking-widest uppercase text-amber-600 dark:text-amber-400">
                    MARKETPLACE
                  </p>
                </div>
              </motion.button>

              {/* Search Bar - Desktop: Full Stadium Input, Mobile: Stadium Trigger Button */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="flex sm:hidden flex-1 min-w-0 items-center gap-2.5 h-10 px-3 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 shadow-xs text-muted-foreground/60 cursor-pointer"
              >
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-left truncate flex-1">Cari makanan, servis, pakaian...</span>
              </button>

              <div className="hidden sm:flex flex-1 items-center gap-2.5 h-10 px-4 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/25 shadow-xs transition-all">
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari makanan, minuman, servis, pakaian..."
                  className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-muted shrink-0 cursor-pointer">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Right icons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={startTour}
                  className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-amber-500/80 hover:text-amber-500 transition-all active:scale-95 cursor-pointer"
                  aria-label="Panduan PolyMart"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {user ? (
                  <>
                    {/* Hide Cart on mobile since it is in BottomNav */}
                    <button
                      onClick={() => navigate('/polymart/troli')}
                      className="tour-polymart-cart relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                      aria-label="Troli Beli-belah"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-slate-950 text-[8px] font-black flex items-center justify-center shadow-xs bg-amber-400">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </button>

                    {/* Hide Orders on mobile since it is in BottomNav */}
                    <button
                      onClick={() => navigate('/polymart/pesanan-saya')}
                      className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                      aria-label="Pesanan Saya"
                    >
                      <Package className="w-4 h-4" />
                      {myActiveOrdersCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-slate-950 text-[8px] font-black flex items-center justify-center shadow-xs bg-amber-400">
                          {myActiveOrdersCount > 9 ? '9+' : myActiveOrdersCount}
                        </span>
                      )}
                    </button>

                    {/* Wishlist */}
                    <button
                      onClick={() => navigate('/polymart/wishlist')}
                      className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-rose-400/40 text-muted-foreground hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
                      aria-label="Senarai Hajat"
                    >
                      <Heart className="w-4 h-4" />
                    </button>

                    {/* Chat */}
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-inbox'))}
                      className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                      aria-label="Mesej"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Button: Kedai (if vendor) OR Admin (if non-vendor JPP/Admin) OR Mulai Bisnes (if regular non-vendor student) */}
                    {isVendor ? (
                      <button
                        onClick={() => navigate('/polymart/vendor')}
                        className="tour-polymart-vendor relative w-9 h-9 sm:w-auto sm:px-3.5 sm:h-9 rounded-full flex items-center justify-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                        title="Kedai Saya"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Kedai</span>
                        {pendingVendorCount > 0 && (
                          <span className="absolute -top-1 -right-1 sm:static min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                            {pendingVendorCount}
                          </span>
                        )}
                      </button>
                    ) : (
                      /* Not a Vendor: Show Admin for JPP/Admins, or Mulai Bisnes with text for regular students */
                      (hasKeusahawananAccess || isSuperAdmin) ? (
                        <button
                          onClick={() => navigate('/polymart/admin')}
                          className="relative w-9 h-9 sm:w-auto sm:px-3.5 sm:h-9 rounded-full flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                          title="Panel Admin"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Admin</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/keusahawanan/onboarding')}
                          className="relative w-9 h-9 sm:w-auto sm:px-3.5 sm:h-9 rounded-full flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                          title="Mulai Bisnes"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Mulai Bisnes</span>
                        </button>
                      )
                    )}
                  </>
                ) : (
                  /* Pelawat — tunjuk butang Log Masuk */
                  <button
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                    style={{ background: PM_GRADIENT }}>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Log Masuk</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category pills – only on homepage */}
            {isHome && !showSearch && (
              <div className="tour-polymart-categories flex items-center gap-2 pb-3 pt-1 overflow-x-auto scrollbar-hide">
                {CATEGORY_LIST.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.key;
                  return (
                    <motion.button
                      key={cat.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveCategory(cat.key)}
                      className={cn(
                        'flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border',
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400/60 shadow-md shadow-amber-500/20 font-black'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-slate-950' : 'text-muted-foreground')} />
                      <span>{cat.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-4 after:content-[''] after:block after:h-40 after:shrink-0">
          <Outlet />
        </main>

        {/* ── Mobile Fullscreen Search & Filter Overlay ── */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col sm:hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/40 bg-background safe-area-pt">
                <button onClick={() => setShowMobileSearch(false)} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex-1 flex items-center gap-2 h-11 px-4 rounded-full bg-muted/50 border border-border focus-within:border-primary/50 transition-colors">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari produk..."
                    className="flex-1 text-[13px] font-medium bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="shrink-0 p-1 rounded-full bg-muted-foreground/10 hover:bg-muted-foreground/20">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Conditional Categories or Live Search Results */}
              <div className="flex-1 overflow-y-auto p-5">
                {!searchQuery.trim() ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Penapis Kategori</p>
                    <div className="flex flex-col gap-2">
                      {CATEGORY_LIST.map(cat => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.key;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => {
                              setActiveCategory(cat.key);
                              setShowMobileSearch(false);
                              navigate('/polymart');
                            }}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer text-left',
                              isActive
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 font-bold'
                                : 'border-border/40 hover:bg-muted/50 text-foreground'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border',
                              isActive
                                ? 'bg-amber-500 text-slate-950 border-amber-400/50'
                                : 'bg-muted/60 text-muted-foreground border-border/40'
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold flex-1">{cat.label}</span>
                            {isActive && (
                              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
                      <span>Hasil Carian Padanan</span>
                      {isSearching && <span className="text-[9px] lowercase font-medium text-amber-500 animate-pulse">mencari...</span>}
                    </p>

                    {isSearching && searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-muted-foreground/60 font-medium">Sedang mencari produk...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2.5">
                        {searchResults.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              setShowMobileSearch(false);
                              navigate(`/polymart/produk/${prod.id}`);
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-2xl border border-border bg-card shadow-xs active:scale-[0.98] transition-all cursor-pointer animate-in fade-in duration-200"
                          >
                            <div className="w-12 h-12 rounded-xl bg-muted/40 overflow-hidden border border-border shrink-0 flex items-center justify-center">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag className="w-5 h-5 text-muted-foreground/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="text-xs font-bold text-foreground truncate leading-snug">{prod.name}</h4>
                              <p className="text-[9px] text-muted-foreground/60 font-semibold mt-0.5 truncate flex items-center gap-1">
                                <Store className="w-2.5 h-2.5" />
                                {prod.keusahawanan_businesses?.name || 'Perniagaan Pelajar'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-amber-500">RM {prod.price.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}

                        {/* View all search button */}
                        <button
                          onClick={() => {
                            setShowMobileSearch(false);
                            navigate('/polymart');
                          }}
                          className="w-full py-3 mt-2 rounded-2xl border border-dashed border-amber-500/30 text-[11px] font-black uppercase tracking-wider text-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" /> Lihat Semua Hasil Carian
                        </button>
                      </div>
                    ) : (
                      !isSearching && (
                        <div className="text-center py-10 rounded-2xl border border-dashed border-border p-4">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-xs font-bold text-muted-foreground">Tiada hasil carian ditemui</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1 leading-normal">Cuba ejaan atau produk lain seperti "baju", "air" atau "sambal".</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile Bottom Nav (Global Standardized) ── */}
        {!(
          location.pathname.includes('/polymart/vendor') ||
          location.pathname.includes('/polymart/admin') ||
          location.pathname.includes('/polymart/produk/')
        ) && (
          <div className="tour-polymart-mobile-nav">
            <BottomNav 
              customLinks={{
                left: [
                  { icon: Home, label: 'Utama', onClick: () => navigate('/portal'), isActive: false },
                  { icon: Heart, label: 'Kegemaran', onClick: () => !user ? navigate(`/login?redirect=${encodeURIComponent('/polymart/wishlist')}`) : navigate('/polymart/wishlist'), isActive: location.pathname.includes('/polymart/wishlist') }
                ],
                right: [
                  { icon: ShoppingCart, label: 'Troli', onClick: () => !user ? navigate(`/login?redirect=${encodeURIComponent('/polymart/troli')}`) : navigate('/polymart/troli'), isActive: location.pathname.includes('/polymart/troli'), badge: cartCount },
                  { icon: Package, label: 'Pesanan', onClick: () => !user ? navigate(`/login?redirect=${encodeURIComponent('/polymart/pesanan-saya')}`) : navigate('/polymart/pesanan-saya'), isActive: isOrders, badge: myActiveOrdersCount }
                ]
              }}
            />
          </div>
        )}
        
        {/* Global Floating AI Chat */}
        <FloatingAiChat />
      </div>
    </PolymartContext.Provider>
  );
}
