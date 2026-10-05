import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatProductPrice } from '@/lib/superAppHelpers';
import { cn } from '@/lib/utils';

export interface PolyMartFeedProps {
  products?: any[];
  className?: string;
}

export function PolyMartFeed({ products: initialProducts, className }: PolyMartFeedProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [loading, setLoading] = useState<boolean>(!initialProducts);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('business_products')
          .select(`
            id,
            name,
            price,
            sale_price,
            image_url,
            category,
            publish_to_polymart,
            is_available,
            business_id,
            keusahawanan_businesses!business_id(id, name, status)
          `)
          .eq('publish_to_polymart', true)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) {
          console.warn('[PolyMartFeed] Error fetching products:', error.message);
          return;
        }

        if (isMounted && data) {
          // Filter out products from inactive businesses
          const activeProducts = data.filter((item: any) => {
            const biz = Array.isArray(item.keusahawanan_businesses)
              ? item.keusahawanan_businesses[0]
              : item.keusahawanan_businesses;
            return !biz || biz.status === 'ACTIVE';
          });
          setProducts(activeProducts);
        }
      } catch (err) {
        console.warn('[PolyMartFeed] Unexpected error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  const handleCardClick = () => {
    navigate('/keusahawanan/dashboard');
  };

  const handleOpenMart = () => {
    navigate('/keusahawanan/dashboard');
  };

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className={cn('w-full max-w-full overflow-hidden space-y-3', className)} aria-label="PolyMart Siswa">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                PolyMart Siswa
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Pasaran Kampus
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Produk & makanan usahawan siswa POLISAS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenMart}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer group"
        >
          <span>Buka Mart</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal Feed */}
      {loading ? (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[145px] sm:w-[180px] h-[210px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2.5 flex flex-col justify-between animate-pulse"
            >
              <div className="w-full h-24 sm:h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 mt-2">
                <div className="w-3/4 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {products.map((item) => {
            const hasSale = item.sale_price !== null && item.sale_price !== undefined && item.sale_price < item.price;
            const displayPrice = hasSale ? item.sale_price : item.price;

            return (
              <div
                key={item.id}
                onClick={handleCardClick}
                className="snap-start shrink-0 w-[145px] sm:w-[180px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col group p-2 sm:p-2.5"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
              >
                {/* Photo & Pesan Tag */}
                <div className="relative h-24 sm:h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-24 sm:h-28 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-2">
                      <ShoppingBag className="w-7 h-7 mb-1 stroke-1" />
                      <span className="text-[10px] text-center line-clamp-1">
                        {item.category || 'Produk'}
                      </span>
                    </div>
                  )}

                  {/* "Pesan" Tag */}
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm">
                      <Tag className="w-2.5 h-2.5" />
                      Pesan
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="pt-2 flex-1 flex flex-col justify-between space-y-1.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" title={item.name}>
                    {item.name}
                  </h3>

                  <div className="flex items-baseline gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                      {formatProductPrice(displayPrice)}
                    </span>
                    {hasSale && (
                      <span className="text-[10px] text-slate-400 line-through font-mono">
                        {formatProductPrice(item.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PolyMartFeed;
