import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI } from './PolyMartLayout';
import toast from 'react-hot-toast';
import { Heart, Store, Star, ArrowLeft, Trash2, ShoppingCart, Package } from 'lucide-react';

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

export function PolyMartWishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.error('Gagal mengalih keluar');
      loadWishlist(); // revert
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-black text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> Wishlist Saya
          </h1>
          <p className="text-[11px] text-muted-foreground/60">{items.length} produk disimpan</p>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl">💕</div>
          <p className="text-sm font-bold text-muted-foreground/60">Wishlist anda kosong</p>
          <p className="text-xs text-muted-foreground/40">Tekan ❤️ pada produk untuk menyimpan</p>
          <button onClick={() => navigate('/polymart')}
            className="mt-3 px-4 h-9 rounded-xl text-[11px] font-black text-white"
            style={{ background: PM_GRADIENT }}>
            🛍️ Terokai PolyMart
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {items.map(item => {
              const p = item.business_products;
              if (!p) return null;
              const emoji = CATEGORY_EMOJI[p.category] ?? '📦';
              const isOut = p.stock_quantity <= 0 || !p.is_available;
              const isOnSale = p.sale_price && p.sale_start_at && p.sale_end_at &&
                new Date() >= new Date(p.sale_start_at) && new Date() <= new Date(p.sale_end_at);

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
                      className="w-20 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                      style={{ background: PM_LIGHT }}
                      onClick={() => navigate(`/polymart/produk/${p.id}`)}
                    >
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">{emoji}</div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground/50 font-bold flex items-center gap-1">
                        <Store className="w-2.5 h-2.5" /> {p.keusahawanan_businesses?.name ?? 'Kedai'}
                      </p>
                      <p className="text-sm font-black text-foreground truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/polymart/produk/${p.id}`)}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isOnSale ? (
                          <>
                            <span className="text-sm font-black text-rose-500">RM {p.sale_price!.toFixed(2)}</span>
                            <span className="text-[10px] text-muted-foreground/50 line-through">RM {p.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-black" style={{ color: PM_ACCENT }}>RM {p.price.toFixed(2)}</span>
                        )}
                      </div>
                      {isOut && (
                        <span className="inline-block mt-1 text-[9px] font-black text-rose-500 uppercase tracking-wider">
                          Stok Habis
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
