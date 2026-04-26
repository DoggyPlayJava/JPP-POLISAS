import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, ShoppingBag, Search, Package, LayoutGrid,
  Shield, Home, SlidersHorizontal, X, LogIn,
} from 'lucide-react';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

// ── Constants ──────────────────────────────────────────────────────────────────
export const PM_ACCENT   = '#f59e0b';
export const PM_LIGHT    = 'rgba(245,158,11,0.12)';
export const PM_GLOW     = 'rgba(245,158,11,0.3)';
export const PM_GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';

export const CATEGORY_LIST = [
  { key: 'all',           label: 'Semua',          emoji: '🛍️' },
  { key: 'Makanan',       label: 'Makanan',         emoji: '🍔' },
  { key: 'Minuman',       label: 'Minuman',         emoji: '☕' },
  { key: 'Aksesori',      label: 'Aksesori',        emoji: '💎' },
  { key: 'Perkhidmatan',  label: 'Perkhidmatan',    emoji: '🔧' },
  { key: 'Pakaian',       label: 'Pakaian',         emoji: '👕' },
  { key: 'Elektronik',    label: 'Elektronik',       emoji: '📱' },
  { key: 'Umum',          label: 'Umum',            emoji: '📦' },
];

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
  refetchCounts: () => void;
}
const PolymartContext = createContext<PolymartCtx>({
  activeCategory: 'all', setActiveCategory: () => {},
  searchQuery: '', setSearchQuery: () => {},
  isVendor: false, pendingVendorCount: 0, myActiveOrdersCount: 0, refetchCounts: () => {},
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
  const [isVendor,          setIsVendor]           = useState(false);
  const [pendingVendorCount,setPendingVendorCount] = useState(0);
  const [myActiveOrdersCount, setMyActiveOrdersCount] = useState(0);

  const isHome    = location.pathname === '/polymart' || location.pathname === '/polymart/';
  const isOrders  = location.pathname.includes('/pesanan-saya');
  const isVendorP = location.pathname.includes('/vendor');
  const isAdmin   = location.pathname.includes('/admin');

  const refetchCounts = async () => {
    if (!user) return;
    const [buyerRes, vendorRes, bizRes] = await Promise.all([
      supabase.from('polymart_orders').select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id).in('status', ['PENDING', 'CONFIRMED', 'READY']),
      supabase.from('keusahawanan_businesses').select('id').eq('owner_id', user.id).eq('status', 'ACTIVE'),
      supabase.from('student_business_memberships').select('business_id').eq('user_id', user.id).eq('status', 'ACTIVE'),
    ]);
    setMyActiveOrdersCount(buyerRes.count ?? 0);

    const bizIds = [
      ...(vendorRes.data?.map(b => b.id) ?? []),
      ...(bizRes.data?.map(m => m.business_id) ?? []),
    ];
    setIsVendor(bizIds.length > 0);

    if (bizIds.length > 0) {
      const { count } = await supabase.from('polymart_orders')
        .select('id', { count: 'exact', head: true })
        .in('business_id', bizIds).eq('status', 'PENDING');
      setPendingVendorCount(count ?? 0);
    }
  };

  useEffect(() => { refetchCounts(); }, [user]);

  // Realtime subscription — hanya untuk VENDOR sahaja
  // Vendor perlu nampak pesanan baru masuk secara serta-merta (badge count dikemas kini live)
  // Pembeli biasa: badge count dikemas kini setiap kali mereka buka PolyMart (fetch-on-mount sudah ada di atas)
  useEffect(() => {
    if (!user || !isVendor) return; // \u2190 Pembeli biasa keluar di sini

    const sub = supabase.channel('polymart_vendor_orders_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polymart_orders' }, refetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user, isVendor]);

  return (
    <PolymartContext.Provider value={{
      activeCategory, setActiveCategory, searchQuery, setSearchQuery,
      isVendor, pendingVendorCount, myActiveOrdersCount, refetchCounts,
    }}>
      <div className="min-h-screen bg-background">

        {/* ── Top Navbar ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-5xl mx-auto px-3 sm:px-5">

            {/* Main row */}
            <div className="flex items-center gap-2.5 h-14">

              {/* Back */}
              <button
                onClick={() => isHome ? navigate(user ? '/portal' : '/') : navigate(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0 group">
                <ArrowLeft className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Logo */}
              {!showSearch && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => { navigate('/polymart'); setActiveCategory('all'); }}
                  className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: PM_GRADIENT }}>
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </div>
                  <div className="leading-none">
                    <p className="text-[13px] font-black text-foreground">PolyMart</p>
                    <p className="text-[8px] font-bold tracking-widest uppercase" style={{ color: PM_ACCENT }}>marketplace</p>
                  </div>
                </motion.button>
              )}

              {/* Search */}
              {showSearch ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-xl bg-muted/50 border border-border">
                    <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <input
                      autoFocus value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
                      placeholder="Cari produk, kedai..."
                      className="flex-1 text-[13px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              ) : (
                <button onClick={() => setShowSearch(true)}
                  className="flex-1 flex items-center gap-2 h-9 px-3 rounded-xl bg-muted/40 border border-border/40 hover:border-border transition-colors">
                  <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-[12px] text-muted-foreground/50">Cari produk atau kedai...</span>
                </button>
              )}

              {/* Right icons */}
              {!showSearch && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {user ? (
                    <>
                      <button onClick={() => navigate('/polymart/pesanan-saya')}
                        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors">
                        <Package className="w-[18px] h-[18px] text-muted-foreground" />
                        {myActiveOrdersCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full text-white text-[7px] font-black flex items-center justify-center"
                            style={{ background: PM_ACCENT }}>
                            {myActiveOrdersCount > 9 ? '9+' : myActiveOrdersCount}
                          </span>
                        )}
                      </button>

                      {isVendor && (
                        <button onClick={() => navigate('/polymart/vendor')}
                          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors">
                          <LayoutGrid className="w-[18px] h-[18px] text-muted-foreground" />
                          {pendingVendorCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center">
                              {pendingVendorCount > 9 ? '9+' : pendingVendorCount}
                            </span>
                          )}
                        </button>
                      )}

                      {(hasKeusahawananAccess || isSuperAdmin) && (
                        <button onClick={() => navigate('/polymart/admin')}
                          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-amber-500/10 transition-colors">
                          <Shield className="w-[17px] h-[17px]" style={{ color: PM_ACCENT }} />
                        </button>
                      )}
                    </>
                  ) : (
                    /* Pelawat — tunjuk butang Log Masuk */
                    <button
                      onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-black text-white transition-all hover:brightness-110"
                      style={{ background: PM_GRADIENT }}>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Log Masuk</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category pills – only on homepage */}
            {isHome && !showSearch && (
              <div className="flex items-center gap-1.5 pb-3 pt-0.5 overflow-x-auto scrollbar-hide">
                {CATEGORY_LIST.map(cat => (
                  <motion.button
                    key={cat.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory(cat.key)}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={activeCategory === cat.key
                      ? { background: PM_LIGHT, color: PM_ACCENT, border: `1.5px solid ${PM_ACCENT}40` }
                      : { background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1.5px solid hsl(var(--border)/0.5)' }
                    }
                  >
                    <span className="text-[13px] leading-none">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-4 pb-24 sm:pb-8">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Nav ───────────────────────────────────────── */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-background/92 backdrop-blur-xl border-t border-border/50 safe-area-pb">
          <div className="grid grid-cols-4 h-16">
            {[
              { icon: Home,        label: 'Utama',   path: '/polymart',              active: isHome,    badge: 0 },
              { icon: Search,      label: 'Cari',    path: '',                       active: false,     badge: 0, action: () => setShowSearch(true) },
              { icon: Package,     label: 'Pesanan', path: '/polymart/pesanan-saya', active: isOrders,  badge: myActiveOrdersCount,
                action: !user ? () => navigate(`/login?redirect=${encodeURIComponent('/polymart/pesanan-saya')}`) : undefined },
              { icon: isVendor ? LayoutGrid : SlidersHorizontal,
                                   label: isVendor ? 'Kedai' : 'Filter',
                                   path: isVendor ? '/polymart/vendor' : '',
                                   active: isVendorP,
                                   badge: isVendor ? pendingVendorCount : 0 },
            ].map((item, i) => (
              <button key={i}
                onClick={() => item.action ? item.action() : item.path && navigate(item.path)}
                className="flex flex-col items-center justify-center gap-1 relative transition-colors">
                {/* Active indicator */}
                {item.active && <div className="absolute top-0 inset-x-4 h-0.5 rounded-b-full" style={{ background: PM_GRADIENT }} />}
                <div className="relative">
                  <item.icon className="w-5 h-5 transition-colors"
                    style={{ color: item.active ? PM_ACCENT : 'hsl(var(--muted-foreground))' }} />
                  {(item.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center">
                      {(item.badge ?? 0) > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold transition-colors"
                  style={{ color: item.active ? PM_ACCENT : 'hsl(var(--muted-foreground))' }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
        
        {/* Global Floating AI Chat */}
        <FloatingAiChat />
      </div>
    </PolymartContext.Provider>
  );
}
