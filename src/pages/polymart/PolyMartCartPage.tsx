import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToBusinessVendor } from '@/lib/notifications';
import toast from 'react-hot-toast';
import { Trash2, Minus, Plus, Store, ArrowRight, ShoppingCart } from 'lucide-react';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category: string;
    stock_quantity: number;
    reserved_stock: number;
    business_id: string;
    keusahawanan_businesses: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  };
}

export function PolyMartCartPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { refetchCounts } = usePolymart();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null); // business_id
  const [pickupTime, setPickupTime] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/polymart/troli');
      return;
    }
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('polymart_cart_items')
      .select(`
        id, quantity,
        product:business_products (
          id, name, price, image_url, category, stock_quantity, reserved_stock, business_id,
          keusahawanan_businesses (id, name, logo_url)
        )
      `)
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Cast the response because Supabase types might be imperfect with joins
      setItems(data as unknown as CartItem[]);
    }
    setLoading(false);
  };

  const updateQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    await supabase.from('polymart_cart_items').update({ quantity: newQty }).eq('id', id);
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('polymart_cart_items').delete().eq('id', id);
    refetchCounts();
    toast.success('Dibuang dari troli');
  };

  const handleCheckout = async (businessId: string) => {
    if (!user) return;
    const time = pickupTime[businessId]?.trim();
    if (!time) {
      toast.error('Sila isi masa ambil untuk pesanan ini');
      return;
    }

    const businessItems = items.filter(i => i.product.business_id === businessId);
    if (businessItems.length === 0) return;

    setCheckingOut(businessId);
    try {
      // 1. Tempah stok dahulu untuk setiap barang
      for (const item of businessItems) {
        const { error: reserveError } = await supabase.rpc('reserve_polymart_stock', {
          p_product_id: item.product.id,
          p_quantity: item.quantity
        });
        if (reserveError) throw new Error(`Stok tidak cukup untuk ${item.product.name}`);
      }

      // 2. Cipta pesanan
      const ordersToInsert = businessItems.map(item => ({
        product_id: item.product.id,
        business_id: businessId,
        buyer_id: user.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        pickup_time: time,
        share_phone: true,
        status: 'PENDING'
      }));

      const { data: insertedOrders, error: orderError } = await supabase
        .from('polymart_orders')
        .insert(ordersToInsert)
        .select('id');

      if (orderError) {
        // Revert stok jika gagal
        for (const item of businessItems) {
          await supabase.rpc('release_polymart_stock', { p_product_id: item.product.id, p_quantity: item.quantity });
        }
        throw orderError;
      }

      // 3. Buang dari troli
      const itemIds = businessItems.map(i => i.id);
      await supabase.from('polymart_cart_items').delete().in('id', itemIds);

      // 4. Notify vendor (sekali sahaja per vendor)
      try {
        await sendNotificationToBusinessVendor(businessId, {
          title: '🛍️ Pesanan Pukal Baharu!',
          message: `${profile?.full_name ?? 'Pelajar'} menempah ${businessItems.length} jenis barang.`,
          type: 'polymart_order_new',
          module: 'POLYMART',
          link: `/polymart/vendor`,
          actor_name: profile?.full_name,
        });
      } catch (e) {}

      toast.success('Pesanan dihantar berjaya!', { icon: '🎉' });
      
      // Update UI
      setItems(prev => prev.filter(i => i.product.business_id !== businessId));
      refetchCounts();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa checkout');
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Group items by vendor
  const vendorGroups: Record<string, CartItem[]> = {};
  items.forEach(item => {
    const bizId = item.product.business_id;
    if (!vendorGroups[bizId]) vendorGroups[bizId] = [];
    vendorGroups[bizId].push(item);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-6 h-6" style={{ color: PM_ACCENT }} />
        <h1 className="text-xl font-black text-foreground">Troli Saya</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border border-border/40 rounded-3xl">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Troli kosong</p>
          <p className="text-xs text-muted-foreground mt-1">Jom beli sesuatu di PolyMart!</p>
          <button onClick={() => navigate('/polymart')}
            className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 shadow-md"
            style={{ background: PM_GRADIENT }}>
            Kembali ke Kedai
          </button>
        </div>
      ) : (
        <AnimatePresence>
          {Object.entries(vendorGroups).map(([bizId, groupItems]) => {
            const business = groupItems[0].product.keusahawanan_businesses;
            const subtotal = groupItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            
            return (
              <motion.div
                key={bizId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Vendor Header */}
                <div className="p-3 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-sm font-black text-foreground">{business?.name || 'Kedai'}</h3>
                </div>

                {/* Items */}
                <div className="p-4 space-y-4">
                  {groupItems.map(item => {
                    const availableStock = Math.max(0, item.product.stock_quantity - (item.product.reserved_stock || 0));
                    const maxQty = Math.min(availableStock, 10);
                    const emoji = CATEGORY_EMOJI[item.product.category] ?? '📦';

                    return (
                      <div key={item.id} className="flex gap-3 relative">
                        {/* Img */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">{emoji}</div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-foreground leading-tight truncate">{item.product.name}</h4>
                            <p className="text-sm font-black mt-0.5" style={{ color: PM_ACCENT }}>RM {item.product.price.toFixed(2)}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            {/* Qty control */}
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                                disabled={item.quantity <= 1}>
                                <Minus className="w-3 h-3 text-muted-foreground" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                                disabled={item.quantity >= maxQty}>
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            
                            <button onClick={() => removeItem(item.id)}
                              className="text-rose-500 hover:text-rose-600 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Checkout Footer */}
                <div className="p-4 bg-muted/10 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Jumlah (Beli Bersemuka)</span>
                    <span className="text-lg font-black" style={{ color: PM_ACCENT }}>RM {subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      value={pickupTime[bizId] || ''} 
                      onChange={e => setPickupTime(prev => ({ ...prev, [bizId]: e.target.value }))}
                      placeholder="Waktu Ambil (cth: 2.00 PM)"
                      className="flex-1 h-10 px-3 rounded-xl text-xs outline-none bg-background border border-border/50 text-foreground focus:border-amber-500/50" 
                    />
                    <button 
                      onClick={() => handleCheckout(bizId)}
                      disabled={checkingOut === bizId}
                      className="h-10 px-4 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all hover:brightness-110 disabled:opacity-60"
                      style={{ background: PM_GRADIENT }}>
                      {checkingOut === bizId ? '⏳' : 'Checkout'} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
