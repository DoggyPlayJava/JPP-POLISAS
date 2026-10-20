import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  BusinessProduct, BusinessTransaction, BusinessTransactionItem,
  BusinessPosLog, BusinessPosAssignment,
  BusinessExpense, BusinessPromotion, BusinessCashCheckpoint,
  PosPaymentMethod, PosDiscountType, PosLogAction, ExpenseCategory,
} from '@/types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

/** Generate invoice number prefix from business name.
 *  'Danish Bongsu Enterprise' → 'DBE'
 *  Falls back to first 3 chars if < 3 words.
 */
function buildInvoicePrefix(businessName: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }
  return businessName.replace(/\s+/g, '').slice(0, 3).toUpperCase();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProcessTransactionPayload {
  businessId:      string;
  items:           BusinessTransactionItem[];
  paymentMethod:   PosPaymentMethod;
  discountType?:   PosDiscountType;
  discountAmount?: number;
  discountNote?:   string;
  receivedAmount?: number;  // cash only
  customerName?:   string;
  customerNote?:   string;
  promotionId?:    string;  // ID promosi yang digunakan (Ciri 5)
  promotionCode?:  string;  // Kod untuk audit trail
  eventCouponId?:  string;  // ID kupon acara (voucher organisasi, e.g. MAHRAJAN)
  eventCouponCode?: string; // Kod kupon acara untuk audit
  eventCouponEventId?: string; // event_id kupon acara
}

export interface StatsData {
  totalRevenue:      number;  // jumlah selepas diskaun (accrual - completed only)
  grossRevenue:      number;  // jumlah sebelum diskaun
  totalDiscounts:    number;  // jumlah diskaun yang diberi
  transactionCount:  number;
  unitsSold:         number;
  averageOrderValue: number;
  dailySales:        { date: string; revenue: number; onlineCash?: number; count: number }[];
  topProducts:       { name: string; revenue: number; units: number }[];
  // Ciri Komersial Baharu
  totalExpenses:          number;
  netProfit:              number;
  expensesByCategory:     { category: string; amount: number }[];
  onlineRevenue:          number; // completed online only
  physicalRevenue:        number; // completed physical only
  onlinePendingRevenue:   number; // pending online QR (CONFIRMED/READY)
  totalCashCollected:     number; // totalRevenue + onlinePendingRevenue
  expenseItems?: { expense_date: string; description: string; category: string; amount: number }[];
}

// ── Main Hook ─────────────────────────────────────────────────────────────────

export function usePosData(businessId?: string, parentLoading = false) {
  const { t } = useTranslation(['commerce', 'common']);
  const { user, profile, isSuperAdmin } = useAuth();

  const [products, setProducts]       = useState<BusinessProduct[]>([]);
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [logs, setLogs]               = useState<BusinessPosLog[]>([]);
  const [assignments, setAssignments] = useState<BusinessPosAssignment[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  // null = belum semak, true/false = keputusan
  const [posAccess, setPosAccess]     = useState<boolean | null>(null);

  // ── Fetch Products ───────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (bId?: string) => {
    const bid = bId || businessId;
    if (!bid) return;
    const { data, error } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_id', bid)
      .order('category')
      .order('name');
    if (!error) setProducts(data || []);
  }, [businessId]);

  // ── Fetch Transaction History ─────────────────────────────────────────────

  const fetchTransactions = useCallback(async (bId?: string) => {
    const bid = bId || businessId;
    if (!bid) return;
    const { data, error } = await supabase
      .from('business_transactions')
      .select(`
        *,
        server:served_by(id, full_name),
        voider:voided_by(id, full_name)
      `)
      .eq('business_id', bid)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error) setTransactions(data || []);
  }, [businessId]);

  // ── Fetch Logs ───────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (bId?: string) => {
    const bid = bId || businessId;
    if (!bid) return;
    const { data } = await supabase
      .from('business_pos_logs')
      .select('*')
      .eq('business_id', bid)
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
  }, [businessId]);

  // ── Fetch POS Assignments ─────────────────────────────────────────────────

  const fetchAssignments = useCallback(async (bId?: string) => {
    const bid = bId || businessId;
    if (!bid) return;
    const { data } = await supabase
      .from('business_pos_assignments')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('business_id', bid)
      .eq('valid_date', today());
    setAssignments(data || []);
  }, [businessId]);

  // ── POS Access Check ─────────────────────────────────────────────────────
  /** Returns true if the current user may operate the POS for this business today.
   *  Access is granted if user:
   *  1. Is SUPER_ADMIN_JPP — always
   *  2. Is JPP with unit = KEUSAHAWANAN — always
   *  3. Is the OWNER of this business (ACTIVE membership)
   *  4. Has an ACTIVE shift today in gerai_shifts (for JPP-run Gerai)
   *  5. Has a manual POS assignment for today
   *  6. Is an ACTIVE member AND the business has no shift enabled (owner assigns manually)
   */
  const checkPosAccess = useCallback(async (bId?: string): Promise<boolean> => {
    const bid = bId || businessId;
    if (!bid || !user) return false;

    // 1. SuperAdmin bypass
    if (isSuperAdmin) { setPosAccess(true); return true; }

    // 2. Exco Keusahawanan (JPP unit)
    if (profile?.role === 'JPP' && profile?.jpp_unit === 'KEUSAHAWANAN') {
      setPosAccess(true); return true;
    }

    // 2b. Unit Keusahawanan admin (non-JPP officers with elevated access)
    const { data: unitAdmin } = await supabase
      .from('keusahawanan_unit_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (unitAdmin) { setPosAccess(true); return true; }

    // 3. Check membership role
    const { data: membership } = await supabase
      .from('student_business_memberships')
      .select('role, status')
      .eq('business_id', bid)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.status !== 'ACTIVE') { setPosAccess(false); return false; }

    // Owner always has access
    if (membership.role === 'OWNER') { setPosAccess(true); return true; }

    // 4. Check business shift system
    const { data: business } = await supabase
      .from('keusahawanan_businesses')
      .select('is_shift_enabled')
      .eq('id', bid)
      .single();

    const isShiftEnabled = business?.is_shift_enabled ?? false;

    if (!isShiftEnabled) {
      // If shift is disabled, all ACTIVE members can access POS
      setPosAccess(true); 
      return true;
    }

    // If shift is enabled, check business_shifts for today
    const { data: shift } = await supabase
      .from('business_shifts')
      .select('id')
      .eq('business_id', bid)
      .eq('assigned_to', user.id)
      .eq('shift_date', today())
      .maybeSingle();
    if (shift) { setPosAccess(true); return true; }

    // 5. Check manual POS assignment for today
    const { data: assignment } = await supabase
      .from('business_pos_assignments')
      .select('id')
      .eq('business_id', bid)
      .eq('user_id', user.id)
      .eq('valid_date', today())
      .maybeSingle();
    if (assignment) { setPosAccess(true); return true; }

    setPosAccess(false);
    return false;
  }, [businessId, user, isSuperAdmin, profile]);

  // ── Generate Invoice Number ───────────────────────────────────────────────

  const generateInvoiceNumber = useCallback(async (bId?: string): Promise<string> => {
    const bid = bId || businessId;
    if (!bid) return 'INV-001';

    // Get business name for prefix
    const { data: biz } = await supabase
      .from('keusahawanan_businesses')
      .select('name')
      .eq('id', bid)
      .single();

    const prefix = biz?.name ? buildInvoicePrefix(biz.name) : 'TXN';

    // Count all existing completed transactions for this business
    const { count } = await supabase
      .from('business_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', bid);

    const seq = (count ?? 0) + 1;
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }, [businessId]);

  // ── Write POS Log ─────────────────────────────────────────────────────────

  const writeLog = async (
    bId: string, action: PosLogAction, description: string,
    metadata: Record<string, any> = {}, transactionId?: string
  ) => {
    await supabase.from('business_pos_logs').insert({
      business_id:    bId,
      transaction_id: transactionId ?? null,
      actor_id:       user?.id,
      actor_name:     profile?.full_name ?? 'Sistem',
      action_type:    action,
      description,
      metadata,
    });
  };

  // ── Process Transaction ───────────────────────────────────────────────────

  const processTransaction = async (payload: ProcessTransactionPayload) => {
    if (!user) return { error: t('commerce:no_session', 'Tiada sesi') };

    const {
      businessId: bid, items, paymentMethod,
      discountType, discountAmount = 0, discountNote,
      receivedAmount, customerName, customerNote,
      promotionId, promotionCode,
      eventCouponId, eventCouponCode, eventCouponEventId,
    } = payload;

    const subtotal = items.reduce((s, i) => s + i.total_price, 0);
    let   actualDiscount = discountAmount;

    // Normalise percent discount to RM
    if (discountType === 'PERCENT') {
      actualDiscount = parseFloat(((discountAmount / 100) * subtotal).toFixed(2));
    }
    const totalAmount  = Math.max(0, subtotal - actualDiscount);
    const changeAmount = paymentMethod === 'CASH' && receivedAmount != null
      ? parseFloat((receivedAmount - totalAmount).toFixed(2))
      : null;

    const invoiceNumber = await generateInvoiceNumber(bid);

    const { data: txn, error } = await supabase
      .from('business_transactions')
      .insert({
        business_id:     bid,
        invoice_number:  invoiceNumber,
        items:           items,
        subtotal,
        discount_type:   discountType ?? null,
        discount_amount: actualDiscount,
        discount_note:   discountNote ?? null,
        total_amount:    totalAmount,
        payment_method:  paymentMethod,
        received_amount: receivedAmount ?? null,
        change_amount:   changeAmount,
        customer_name:   customerName ?? null,
        customer_note:   customerNote ?? null,
        served_by:       user.id,
        status:          'COMPLETED',
        // Ciri 5: rekod kupon jika digunakan
        promotion_id:    promotionId ?? null,
        promotion_code:  promotionCode ?? null,
        event_coupon_id: eventCouponId ?? null,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // Ciri 5: Increment uses_count untuk kupon yang digunakan
    if (promotionId) {
      const { error: promoErr } = await supabase
        .from('business_promotions')
        .update({ uses_count: supabase.rpc('increment', { x: 1 }) as any })
        .eq('id', promotionId);
      // Gunakan RPC manual jika rpc increment tidak ada
      if (promoErr) {
        await supabase.rpc('increment_promotion_uses', { p_promotion_id: promotionId })
          .then(({ error: e }) => {
            if (e) {
              // Fallback: fetch current count dan increment manual
              supabase.from('business_promotions').select('uses_count').eq('id', promotionId).single()
                .then(({ data: pd }) => {
                  if (pd) supabase.from('business_promotions').update({ uses_count: (pd.uses_count ?? 0) + 1 }).eq('id', promotionId);
                });
            }
          });
      }
      await writeLog(bid, 'PROMO_USED', t('commerce:coupon_used_in_txn', 'Kupon {{code}} digunakan dalam transaksi {{invoice}}.', { code: promotionCode ?? promotionId, invoice: invoiceNumber }), { promotion_id: promotionId, invoice_number: invoiceNumber }, txn.id);
    }

    // Ciri 6: Claim kupon acara (voucher organisasi, contoh MAHRAJAN)
    if (eventCouponId && eventCouponEventId) {
      const res = await supabase.rpc('claim_event_coupon', {
        p_coupon_id:      eventCouponId,
        p_event_id:       eventCouponEventId,
        p_business_id:    bid,
        p_transaction_id: txn.id,
        p_discount_amount: actualDiscount,
      });
      if (res.error) {
        await writeLog(bid, 'PROMO_USED', t('commerce:claim_coupon_failed', 'Gagal claim kupon acara {{coupon}}: {{error}}', { coupon: eventCouponCode ?? eventCouponId, error: res.error.message }), { event_coupon_id: eventCouponId }, txn.id);
      } else if (res.data && !res.data.success) {
        await writeLog(bid, 'PROMO_USED', t('commerce:claim_coupon_failed', 'Gagal claim kupon acara {{coupon}}: {{error}}', { coupon: eventCouponCode ?? eventCouponId, error: res.data.error }), { event_coupon_id: eventCouponId }, txn.id);
      } else {
        await writeLog(bid, 'PROMO_USED', t('commerce:claim_coupon_success', 'Kupon acara {{coupon}} di-claim dalam transaksi {{invoice}}.', { coupon: eventCouponCode ?? eventCouponId, invoice: invoiceNumber }), { event_coupon_id: eventCouponId, invoice_number: invoiceNumber }, txn.id);
      }
    }

    // Deduct stock for each item
    await Promise.all(
      items.map(item =>
        supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_qty:        item.qty,
        }).then(({ error: e }) => {
          if (e) console.warn('Stock deduct failed for', item.product_id, e.message);
        })
      )
    );

    // Write audit log
    await writeLog(
      bid, 'TRANSACTION_CREATE',
      `Transaksi ${invoiceNumber} berjumlah RM${totalAmount.toFixed(2)} – ${paymentMethod}`,
      { invoice_number: invoiceNumber, total_amount: totalAmount, item_count: items.length, payment_method: paymentMethod },
      txn.id
    );

    await fetchProducts(bid);
    await fetchTransactions(bid);

    return { success: true, transaction: txn as BusinessTransaction, invoiceNumber };
  };

  // ── Void Transaction ──────────────────────────────────────────────────────

  const voidTransaction = async (txnId: string, businessId_: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('business_transactions')
      .update({ status: 'VOIDED', voided_by: user.id, voided_at: new Date().toISOString() })
      .eq('id', txnId);

    if (error) { toast.error(t('commerce:void_failed', 'Gagal void: {{error}}', { error: error.message })); return; }

    // Restore stock — panggil rpc secara berasingan, bukan inject dalam .update()
    const txn = transactions.find(t => t.id === txnId);
    if (txn?.items?.length) {
      await Promise.all(
        txn.items.map(item =>
          supabase.rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_qty:        item.qty,
          }).then(({ error: e }) => {
            if (e) console.warn('[POS] Stock restore failed for', item.product_id, e.message);
          })
        )
      );
    }

    await writeLog(
      businessId_, 'TRANSACTION_VOID',
      t('commerce:txn_voided_log', 'Transaksi {{invoice}} telah dibatalkan.', { invoice: txn?.invoice_number ?? txnId }),
      { transaction_id: txnId },
      txnId
    );

    toast.success(t('commerce:txn_voided_toast', 'Transaksi dibatalkan.'));
    await fetchTransactions(businessId_);
  };

  // ── Fetch Statistics ──────────────────────────────────────────────────────

  const fetchStats = useCallback(async (
    bId: string, range: '1d' | '7d' | '1m'
  ): Promise<StatsData> => {
    const now = new Date();
    const from = new Date(now);
    if (range === '7d')  from.setDate(now.getDate() - 6);
    if (range === '1m')  from.setDate(now.getDate() - 29);
    const fromIso = from.toISOString().split('T')[0] + 'T00:00:00Z';
    const fromDate = from.toISOString().split('T')[0];
    const toDate   = now.toISOString().split('T')[0];

    // Parallel query — transaksi, perbelanjaan, dan pesanan polymart online pending serentak
    const [txnResult, expResult, polymartPendingResult] = await Promise.all([
      supabase
        .from('business_transactions')
        .select('total_amount, subtotal, discount_amount, items, created_at, invoice_number')
        .eq('business_id', bId)
        .eq('status', 'COMPLETED')
        .gte('created_at', fromIso)
        .order('created_at'),
      supabase
        .from('business_expenses')
        .select('amount, category, expense_date, description')
        .eq('business_id', bId)
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate),
      supabase
        .from('polymart_orders')
        .select('total_price, unit_price, quantity, created_at, payment_method')
        .eq('business_id', bId)
        .in('status', ['CONFIRMED', 'READY'])
        .eq('payment_method', 'QR_ONLINE') // Filter only QR_ONLINE — cash/COD belum diterima
        .gte('created_at', fromIso)
        .order('created_at'),
    ]);

    const safeArr     = txnResult.data ?? [];
    const safeExpArr  = expResult.data ?? [];
    const safePmPending = polymartPendingResult?.data ?? [];

    // Net revenue (selepas diskaun) — nombor sebenar yang diterima
    const totalRevenue    = safeArr.reduce((s: number, t: any) => s + (t.total_amount ?? 0), 0);
    // Gross revenue (sebelum diskaun) — guna subtotal jika ada, fallback ke total_amount
    const grossRevenue    = safeArr.reduce((s: number, t: any) => s + (t.subtotal ?? t.total_amount ?? 0), 0);
    // Jumlah diskaun
    const totalDiscounts  = safeArr.reduce((s: number, t: any) => s + (t.discount_amount ?? 0), 0);
    const transactionCount = safeArr.length;

    // Hitung kutipan pending atas talian
    const onlinePendingRevenue = safePmPending.reduce(
      (s: number, o: any) => {
        const val = o.total_price !== null && o.total_price !== undefined
          ? Number(o.total_price)
          : (Number(o.unit_price ?? 0) * Number(o.quantity ?? 0));
        return s + val;
      },
      0
    );
    const totalCashCollected = totalRevenue + onlinePendingRevenue;

    let unitsSold = 0;
    const productMap: Record<string, { name: string; revenue: number; units: number }> = {};
    
    // Map harian untuk sales (accrual selesai) dan onlineCash (cash basis)
    const dayMap:     Record<string, { revenue: number; onlineCash: number; count: number }> = {};

    let onlineRevenue = 0;
    let physicalRevenue = 0;

    // 1. Masukkan transaksi POS completed harian
    safeArr.forEach((t: any) => {
      const day = t.created_at.split('T')[0];
      if (!dayMap[day]) dayMap[day] = { revenue: 0, onlineCash: 0, count: 0 };
      dayMap[day].revenue += t.total_amount ?? 0;
      dayMap[day].onlineCash += t.total_amount ?? 0; // complete transaction is already cash collected
      dayMap[day].count   += 1;

      if (t.invoice_number?.startsWith('PM-')) {
        onlineRevenue += t.total_amount ?? 0;
      } else {
        physicalRevenue += t.total_amount ?? 0;
      }

      (t.items ?? []).forEach((item: BusinessTransactionItem) => {
        unitsSold += item.qty;
        if (!productMap[item.product_id]) productMap[item.product_id] = { name: item.name, revenue: 0, units: 0 };
        productMap[item.product_id].revenue += item.total_price;
        productMap[item.product_id].units   += item.qty;
      });
    });

    // 2. Masukkan pending online harian ke dalam daily onlineCash harian
    safePmPending.forEach((o: any) => {
      const day = o.created_at.split('T')[0];
      if (!dayMap[day]) dayMap[day] = { revenue: 0, onlineCash: 0, count: 0 };
      const amt = o.total_price !== null && o.total_price !== undefined
        ? Number(o.total_price)
        : (Number(o.unit_price ?? 0) * Number(o.quantity ?? 0));
      dayMap[day].onlineCash += amt;
    });

    const dailySales = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        onlineCash: val.onlineCash,
        count: val.count
      }));

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Ciri 2: kira perbelanjaan operasi
    const totalExpenses = safeExpArr.reduce((s: number, e: any) => s + (e.amount ?? 0), 0);
    const catMap: Record<string, number> = {};
    safeExpArr.forEach((e: any) => {
      catMap[e.category] = (catMap[e.category] ?? 0) + (e.amount ?? 0);
    });
    const expensesByCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }));

    return {
      totalRevenue,
      grossRevenue,
      totalDiscounts,
      transactionCount,
      unitsSold,
      averageOrderValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
      dailySales,
      topProducts,
      // Ciri 2
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      expensesByCategory,
      onlineRevenue,
      physicalRevenue,
      onlinePendingRevenue,
      totalCashCollected,
      expenseItems: safeExpArr,
    };
  }, []);

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const addProduct = async (bId: string, data: Omit<BusinessProduct, 'id' | 'business_id' | 'created_at'>) => {
    const { error } = await supabase.from('business_products').insert({ ...data, business_id: bId });
    if (error) { toast.error(t('commerce:add_product_failed', 'Gagal tambah produk: {{error}}', { error: error.message })); return; }
    await writeLog(bId, 'PRODUCT_ADD', t('commerce:new_product_added_log', 'Produk baharu ditambah: {{name}}', { name: data.name }), { name: data.name, price: data.price });
    toast.success(t('commerce:product_added_toast', 'Produk ditambah!'));
    await fetchProducts(bId);
  };

  const updateProduct = async (productId: string, bId: string, data: Partial<BusinessProduct>) => {
    const { error } = await supabase.from('business_products').update(data).eq('id', productId);
    if (error) { toast.error(t('commerce:update_failed', 'Gagal kemaskini: {{error}}', { error: error.message })); return; }
    if ('stock_quantity' in data) {
      await writeLog(bId, 'STOCK_EDIT', t('commerce:stock_updated_log', 'Stok produk dikemaskini.'), { product_id: productId, new_stock: data.stock_quantity });
    } else {
      await writeLog(bId, 'PRODUCT_EDIT', t('commerce:product_updated_log', 'Produk dikemaskini.'), { product_id: productId });
    }
    await fetchProducts(bId);
  };

  const deleteProduct = async (productId: string, bId: string, productName: string) => {
    const { error } = await supabase.from('business_products').delete().eq('id', productId);
    if (error) { toast.error(t('commerce:delete_failed', 'Gagal padam: {{error}}', { error: error.message })); return; }
    await writeLog(bId, 'PRODUCT_DELETE', t('commerce:product_deleted_log', 'Produk dipadam: {{name}}', { name: productName }), { product_id: productId });
    toast.success(t('commerce:product_deleted_toast', 'Produk dipadamkan.'));
    await fetchProducts(bId);
  };

  // ── Ciri 2: Perbelanjaan Operasi ─────────────────────────────────────────

  const addExpense = async (bId: string, data: { amount: number; category: ExpenseCategory; description: string; expense_date?: string }) => {
    const { error } = await supabase.from('business_expenses').insert({
      business_id:  bId,
      amount:       data.amount,
      category:     data.category,
      description:  data.description,
      expense_date: data.expense_date ?? new Date().toISOString().split('T')[0],
      recorded_by:  user?.id,
    });
    if (error) { toast.error(t('commerce:add_expense_failed', 'Gagal tambah perbelanjaan: {{error}}', { error: error.message })); return false; }
    await writeLog(bId, 'EXPENSE_ADD', t('commerce:expense_recorded_log', 'Perbelanjaan RM{{amount}} ({{category}}): {{description}}', { amount: data.amount.toFixed(2), category: data.category, description: data.description }), { amount: data.amount, category: data.category });
    toast.success(t('commerce:expense_recorded_toast', 'Perbelanjaan direkodkan!'));
    return true;
  };

  const fetchExpenses = useCallback(async (bId: string, fromDate?: string, toDate?: string): Promise<BusinessExpense[]> => {
    let q = supabase.from('business_expenses').select('*').eq('business_id', bId).order('expense_date', { ascending: false }).order('created_at', { ascending: false });
    if (fromDate) q = q.gte('expense_date', fromDate);
    if (toDate)   q = q.lte('expense_date', toDate);
    const { data, error } = await q;
    if (error) { console.warn('[POS] fetchExpenses error:', error.message); return []; }
    return (data ?? []) as BusinessExpense[];
  }, []);

  const deleteExpense = async (expenseId: string, bId: string) => {
    const { error } = await supabase.from('business_expenses').delete().eq('id', expenseId);
    if (error) { toast.error(t('commerce:delete_failed', 'Gagal padam: {{error}}', { error: error.message })); return; }
    await writeLog(bId, 'EXPENSE_DELETE', t('commerce:expense_deleted_log', 'Rekod perbelanjaan dipadam.'), { expense_id: expenseId });
    toast.success(t('commerce:record_deleted_toast', 'Rekod dipadam.'));
  };

  // ── Ciri 5: Promosi & Kupon ───────────────────────────────────────────────

  const fetchPromotions = useCallback(async (bId: string): Promise<BusinessPromotion[]> => {
    const { data, error } = await supabase
      .from('business_promotions')
      .select('*')
      .eq('business_id', bId)
      .order('created_at', { ascending: false });
    if (error) { console.warn('[POS] fetchPromotions error:', error.message); return []; }
    return (data ?? []) as BusinessPromotion[];
  }, []);

  /** Sahkan kod kupon. Return { valid: true, promotion } atau { valid: false, error: string } */
  const validatePromoCode = async (
    bId: string, code: string, subtotal: number
  ): Promise<{ valid: boolean; promotion?: BusinessPromotion; error?: string }> => {
    const { data, error } = await supabase
      .from('business_promotions')
      .select('*')
      .eq('business_id', bId)
      .ilike('code', code.trim())  // case-insensitive
      .single();

    if (error || !data) return { valid: false, error: t('commerce:promo_invalid', 'Kod promosi tidak sah.') };
    const p = data as BusinessPromotion;

    if (!p.is_active) return { valid: false, error: t('commerce:promo_inactive', 'Kod promosi ini tidak aktif.') };

    const todayStr = new Date().toISOString().split('T')[0];
    if (p.valid_from && todayStr < p.valid_from) return { valid: false, error: t('commerce:promo_not_started', 'Promosi ini belum bermula.') };
    if (p.valid_until && todayStr > p.valid_until) return { valid: false, error: t('commerce:promo_expired', 'Promosi ini telah tamat tempoh.') };
    if (p.max_uses !== null && p.uses_count >= p.max_uses) return { valid: false, error: t('commerce:promo_usage_limit_reached', 'Had penggunaan kupon ini telah dicapai.') };
    if (subtotal < p.min_purchase) return { valid: false, error: t('commerce:promo_min_purchase_req', 'Minimum pembelian RM{{min}} diperlukan.', { min: p.min_purchase.toFixed(2) }) };

    return { valid: true, promotion: p };
  };

  const addPromotion = async (bId: string, data: Omit<BusinessPromotion, 'id' | 'business_id' | 'uses_count' | 'created_at' | 'created_by'>) => {
    const { error } = await supabase.from('business_promotions').insert({
      ...data,
      business_id: bId,
      created_by:  user?.id,
    });
    if (error) {
      if (error.code === '23505') toast.error(t('commerce:promo_code_exists', 'Kod promosi sudah wujud untuk perniagaan ini.'));
      else toast.error(t('commerce:create_promo_failed', 'Gagal cipta promosi: {{error}}', { error: error.message }));
      return false;
    }
    await writeLog(bId, 'PROMO_CREATE', t('commerce:new_promo_log', 'Promosi baharu: {{code}} — {{name}}', { code: data.code, name: data.name }), { code: data.code });
    toast.success(t('commerce:promo_created_toast', 'Promosi dicipta!'));
    return true;
  };

  const togglePromotion = async (promotionId: string, bId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('business_promotions').update({ is_active: isActive }).eq('id', promotionId);
    if (error) { toast.error(t('commerce:update_promo_failed', 'Gagal kemaskini promosi.')); return; }
    await writeLog(bId, 'PROMO_TOGGLE', t('commerce:promo_toggled_log', 'Promosi {{status}}.', { status: isActive ? t('commerce:promo_activated', 'diaktifkan') : t('commerce:promo_deactivated', 'dinyahaktifkan') }), { promotion_id: promotionId, is_active: isActive });
    toast.success(isActive ? t('commerce:promo_activated_toast', 'Promosi diaktifkan.') : t('commerce:promo_deactivated_toast', 'Promosi dinyahaktifkan.'));
  };

  const deletePromotion = async (promotionId: string, bId: string, code: string): Promise<void> => {
    const { error } = await supabase.from('business_promotions').delete().eq('id', promotionId);
    if (error) { toast.error(t('commerce:delete_promo_failed', 'Gagal padam promosi.')); return; }
    toast.success(t('commerce:promo_deleted_toast', 'Promosi {{code}} dipadam.', { code }));
  };

  // ── Ciri 1: Cash Checkpoint ───────────────────────────────────────────────

  const addCashCheckpoint = async (bId: string, data: { label: string; cash_amount: number; note?: string }) => {
    const { error } = await supabase.from('business_cash_checkpoints').insert({
      business_id:  bId,
      label:        data.label,
      cash_amount:  data.cash_amount,
      note:         data.note ?? null,
      recorded_by:  user?.id,
    });
    if (error) { toast.error(t('commerce:record_checkpoint_failed', 'Gagal rekod checkpoint: {{error}}', { error: error.message })); return false; }
    await writeLog(bId, 'CASH_CHECKPOINT', t('commerce:cash_checkpoint_log', 'Checkpoint baldi: {{label}} — RM{{amount}}', { label: data.label, amount: data.cash_amount.toFixed(2) }), { label: data.label, amount: data.cash_amount });
    toast.success(t('commerce:checkpoint_recorded_toast', 'Checkpoint direkodkan!'));
    return true;
  };

  const fetchCashCheckpoints = useCallback(async (bId: string, date?: string): Promise<BusinessCashCheckpoint[]> => {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('business_cash_checkpoints')
      .select('*')
      .eq('business_id', bId)
      .eq('checkpoint_date', targetDate)
      .order('checkpoint_time', { ascending: true });
    if (error) { console.warn('[POS] fetchCashCheckpoints error:', error.message); return []; }
    return (data ?? []) as BusinessCashCheckpoint[];
  }, []);

  const deleteCashCheckpoint = async (checkpointId: string): Promise<void> => {
    const { error } = await supabase.from('business_cash_checkpoints').delete().eq('id', checkpointId);
    if (error) { toast.error(t('commerce:delete_checkpoint_failed', 'Gagal padam checkpoint.')); return; }
    toast.success(t('commerce:checkpoint_deleted_toast', 'Checkpoint dipadam.'));
  };

  // ── POS Assignment (manual) ───────────────────────────────────────────────

  const assignPosToday = async (bId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('business_pos_assignments').upsert({
      business_id: bId, user_id: userId, assigned_by: user?.id, valid_date: today(),
    }, { onConflict: 'business_id,user_id,valid_date' });
    if (error) { toast.error(t('commerce:assign_failed', 'Gagal assign: {{error}}', { error: error.message })); return; }
    await writeLog(bId, 'POS_ASSIGNED', t('commerce:pos_staff_assigned_log', '{{name}} ditetapkan sebagai Staff POS hari ini.', { name: userName }), { user_id: userId, user_name: userName });
    toast.success(t('commerce:pos_staff_assigned_toast', '{{name}} ditetapkan untuk POS hari ini.', { name: userName }));
    await fetchAssignments(bId);
  };

  const removePosAssignment = async (assignmentId: string, bId: string) => {
    const a = assignments.find(x => x.id === assignmentId);
    await supabase.from('business_pos_assignments').delete().eq('id', assignmentId);
    if (a) await writeLog(bId, 'POS_ASSIGNED', t('commerce:pos_assignment_removed_log', 'Tugasan POS {{name}} dibuang.', { name: a.user?.full_name ?? '' }), { user_id: a.user_id });
    await fetchAssignments(bId);
  };

  // ── Ownership ───────────────────────────────────────────────────────────

  const transferOwnership = async (bId: string, newOwnerId: string, newOwnerName: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('transfer_business_ownership', {
        p_business_id: bId,
        p_new_owner_id: newOwnerId
      });
      if (error) throw error;
      
      await writeLog(bId, 'SETTINGS_UPDATED', t('commerce:ownership_transferred_log', 'Pemilikan perniagaan telah dipindahkan sepenuhnya kepada {{name}}.', { name: newOwnerName }));
      toast.success(t('commerce:ownership_transferred_toast', 'Pemilikan perniagaan berjaya dipindahkan!'));
      return true;
    } catch (err: any) {
      toast.error(t('commerce:transfer_ownership_failed', 'Gagal pindah milik: {{error}}', { error: err.message || t('commerce:unknown_error', 'Ralat tidak diketahui') }));
      return false;
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Kalau parent masih loading, jangan buat apa-apa — tunggu businessId
    if (parentLoading) return;

    // Parent dah siap tapi tiada business — resolve terus
    if (!businessId) {
      setPosAccess(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      fetchProducts(),
      fetchTransactions(),
      fetchAssignments(),
      checkPosAccess(),
    ]).finally(() => setIsLoading(false));
  }, [businessId, parentLoading]);

  return {
    products, transactions, logs, assignments,
    isLoading, posAccess,
    fetchProducts, fetchTransactions, fetchLogs, fetchAssignments,
    checkPosAccess, generateInvoiceNumber,
    processTransaction, voidTransaction,
    fetchStats,
    addProduct, updateProduct, deleteProduct,
    assignPosToday, removePosAssignment,
    writeLog,
    // Ciri 2: Perbelanjaan
    addExpense, fetchExpenses, deleteExpense,
    // Ciri 5: Promosi
    fetchPromotions, validatePromoCode, addPromotion, togglePromotion, deletePromotion,
    // Ciri 1: Cash Checkpoint
    addCashCheckpoint, fetchCashCheckpoints, deleteCashCheckpoint,
    // Ownership
    transferOwnership,
  };
}
