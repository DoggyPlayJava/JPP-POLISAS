import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Banknote,
  QrCode,
  CreditCard,
  Receipt,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export function KeusahawananPosPage() {
  const { t } = useTranslation(['keusahawanan', 'common']);
  const [cart, setCart] = useState<CartItem[]>([
    { id: '1', name: 'Nasi Lemak Ayam Berempah', price: 6.5, qty: 2 },
    { id: '2', name: 'Air Teh Tarik Ais', price: 2.5, qty: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('cash');
  const [showReceipt, setShowReceipt] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleNewTransaction = () => {
    setCart([]);
    setShowReceipt(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">
              {t('module_title')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {t('pos_terminal')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('module_subtitle')}
          </p>
        </div>

        <Button
          onClick={handleNewTransaction}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t('new_transaction')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('product_catalog')}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: '1', name: 'Nasi Lemak Ayam Berempah', price: 6.5 },
              { id: '2', name: 'Air Teh Tarik Ais', price: 2.5 },
              { id: '3', name: 'Roti Bakar Kaya Butter', price: 3.0 },
              { id: '4', name: 'Mee Goreng Mamak', price: 5.0 },
              { id: '5', name: 'Kopi Ais Kaw', price: 3.0 },
              { id: '6', name: 'Waffle Coklat Pisang', price: 4.5 },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setCart((prev) => [...prev, { ...p, qty: 1 }])}
                className="p-4 rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    RM {p.price.toFixed(2)}
                  </p>
                </div>
                <div className="mt-3 text-right">
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    + Tambah
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout & Payment */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-border bg-card space-y-4 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">
              {t('receipt_preview')}
            </h3>

            {/* Cart Items */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Tiada item dalam troli jualan.
                </p>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs py-1.5 border-b border-border/20"
                  >
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.qty} x RM {item.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">
                      RM {(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center">
              <span className="font-bold text-sm text-foreground">Jumlah Kasar</span>
              <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                RM {subtotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-muted-foreground">Kaedah Bayaran:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span className="text-[9px] text-center leading-tight">
                    {t('payment_method_cash')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'qr'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span className="text-[9px] text-center leading-tight">
                    {t('payment_method_qr')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[9px] text-center leading-tight">
                    {t('payment_method_card')}
                  </span>
                </button>
              </div>
            </div>

            <Button
              onClick={() => setShowReceipt(true)}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{t('receipt_preview')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Modal Simulation */}
      {showReceipt && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-border bg-card max-w-md mx-auto shadow-2xl space-y-4"
        >
          <div className="text-center space-y-1">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-black text-lg text-foreground">{t('receipt_preview')}</h3>
            <p className="text-xs text-muted-foreground">POLISAS Student Entrepreneurship POS</p>
          </div>
          <div className="border-t border-b border-dashed border-border py-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kaedah:</span>
              <span className="font-bold text-foreground">
                {paymentMethod === 'cash'
                  ? t('payment_method_cash')
                  : paymentMethod === 'qr'
                  ? t('payment_method_qr')
                  : t('payment_method_card')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Bayaran:</span>
              <span className="font-black text-foreground">RM {subtotal.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default KeusahawananPosPage;
