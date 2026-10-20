import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_ICON_MAP } from './PolyMartLayout';
import toast from 'react-hot-toast';
import { Heart, Store, Star, ArrowLeft, Trash2, ShoppingCart, Package, ShoppingBag } from 'lucide-react';
import { isProductOnSale, getProductEffectivePrice } from '@/lib/superAppHelpers';

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  business_products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category: string;
    stock_quantity: number;
    is_available: boolean;
    sale_price?: number | null;
    sale_start_at?: string | null;
    sale_end_at?: string | null;
    keusahawanan_businesses: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export function PolyMartWishlist({
  initialLoading = false,
  initialItems = [],
}: {
  initialLoading?: boolean;
  initialItems?: WishlistItem[];
} = {}) {
  const { t } = useTranslation(['commerce', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [loading, setLoading] = useState(initialLoading);

  const loadWishlist = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('polymart_wishlist')
      .select(`
        id, product_id, created_at,
        business_products!product_id(
          id, name, price, image_url, category, stock_quantity, is_available,
          sale_price, sale_start_at, sale_end_at,
          keusahawanan_businesses!business_id(id, name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as unknown as WishlistItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const removeItem = async (wishlistId: string) => {
    setItems(prev => prev.filter(i => i.id !== wishlistId));
    const { error } = await supabase.from('polymart_wishlist').delete().eq('id', wishlistId);
    if (error) {
      toast.error(t('commerce:wishlist_remove_failed', 'Gagal mengalih keluar'));
      loadWishlist(); // revert
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4 pb-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted/50" />
        <div className="space-y-1">
          <div className="h-5 w-32 bg-muted/60 rounded" />
          <div className="h-3 w-20 bg-muted/40 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-3 flex gap-3">
            <div className="w-20 h-20 rounded-xl bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted/40 rounded" />
              <div className="h-4 w-40 bg-muted/60 rounded" />
              <div className="h-4 w-20 bg-muted/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label={t('common:back', 'Kembali')}>
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-black text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> {t('commerce:wishlist_my_title', 'Wishlist Saya')}
          </h1>
          <p className="text-[11px] text-muted-foreground/60">
            {t('commerce:wishlist_saved_count', '{{count}} produk disimpan', { count: items.length })}
          </p>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xs">
            <Heart className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-muted-foreground/80">
            {t('commerce:wishlist_empty_title', 'Wishlist anda kosong')}
          </p>
          <p className="text-xs text-muted-foreground/50">
            {t('commerce:wishlist_empty_desc', 'Tekan ikon hati pada produk untuk menyimpan')}
          </p>
          <button onClick={() => navigate('/polymart')}
            className="mt-3 px-4 h-9 rounded-xl text-[11px] font-black text-white flex items-center gap-1.5 transition-all hover:brightness-110 cursor-pointer shadow-md shadow-amber-500/20"
            style={{ background: PM_GRADIENT }}>
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('commerce:wishlist_explore_polymart', 'Terokai PolyMart')}</span>
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {items.map(item => {
              const p = item.business_products;
              if (!p) return null;
              const FallbackIcon = CATEGORY_ICON_MAP[p.category] || Package;
              const isOut = p.stock_quantity <= 0 || !p.is_available;
              const isOnSale = isProductOnSale(p);
              const effPrice = getProductEffectivePrice(p);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                >
                  <div className="flex gap-3 p-3">
                    {/* Image */}
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer flex items-center justify-center"
                      style={{ background: PM_LIGHT }}
                      onClick={() => navigate(`/polymart/produk/${p.id}`)}
                    >
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-amber-600 dark:text-amber-400"><FallbackIcon className="w-8 h-8" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground/50 font-bold flex items-center gap-1">
                        <Store className="w-2.5 h-2.5" /> {p.keusahawanan_businesses?.name ?? t('commerce:wishlist_store_fallback', 'Kedai')}
                      </p>
                      <p className="text-sm font-black text-foreground truncate cursor-pointer hover:underline [text-wrap:balance]"
                        onClick={() => navigate(`/polymart/produk/${p.id}`)}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isOnSale ? (
                          <>
                            <span className="text-sm font-black text-rose-500 font-mono tabular-nums">RM {effPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-muted-foreground/50 line-through font-mono tabular-nums">RM {p.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-black font-mono tabular-nums" style={{ color: PM_ACCENT }}>RM {p.price.toFixed(2)}</span>
                        )}
                      </div>
                      {isOut && (
                        <span className="inline-block mt-1 text-[9px] font-black text-rose-500 uppercase tracking-wider">
                          {t('commerce:wishlist_out_of_stock', 'Stok Habis')}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                      {!isOut && (
                        <button onClick={() => navigate(`/polymart/produk/${p.id}`)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-500/10 transition-colors">
                          <ShoppingCart className="w-4 h-4" style={{ color: PM_ACCENT }} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
