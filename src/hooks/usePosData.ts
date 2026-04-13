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
}

export interface StatsData {
  totalRevenue:      number;  // jumlah selepas diskaun
  grossRevenue:      number;  // jumlah sebelum diskaun
  totalDiscounts:    number;  // jumlah diskaun yang diberi
  transactionCount:  number;
  unitsSold:         number;
  averageOrderValue: number;
  dailySales:        { date: string; revenue: number; count: number }[];
  topProducts:       { name: string; revenue: number; units: number }[];
  // Ciri Komersial Baharu
  totalExpenses:          number;
  netProfit:              number;
  expensesByCategory:     { category: string; amount: number }[];
}

// ── Main Hook ─────────────────────────────────────────────────────────────────

export function usePosData(businessId?: string, parentLoading = false) {
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
    if (!user) return { error: 'Tiada sesi' };

    const {
      businessId: bid, items, paymentMethod,
      discountType, discountAmount = 0, discountNote,
      receivedAmount, customerName, customerNote,
      promotionId, promotionCode,
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
      await writeLog(bid, 'PROMO_USED', `Kupon ${promotionCode ?? promotionId} digunakan dalam transaksi ${invoiceNumber}.`, { promotion_id: promotionId, invoice_number: invoiceNumber }, txn.id);
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

    if (error) { toast.error('Gagal void: ' + error.message); return; }

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
      `Transaksi ${txn?.invoice_number ?? txnId} telah dibatalkan.`,
      { transaction_id: txnId },
      txnId
    );

    toast.success('Transaksi dibatalkan.');
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

    // Parallel query — transaksi dan perbelanjaan serentak
    const [txnResult, expResult] = await Promise.all([
      supabase
        .from('business_transactions')
        .select('total_amount, subtotal, discount_amount, items, created_at')
        .eq('business_id', bId)
        .eq('status', 'COMPLETED')
        .gte('created_at', fromIso)
        .order('created_at'),
      supabase
        .from('business_expenses')
        .select('amount, category')
        .eq('business_id', bId)
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate),
    ]);

    const safeArr     = txnResult.data ?? [];
    const safeExpArr  = expResult.data ?? [];

    // Net revenue (selepas diskaun) — nombor sebenar yang diterima
    const totalRevenue    = safeArr.reduce((s: number, t: any) => s + (t.total_amount ?? 0), 0);
    // Gross revenue (sebelum diskaun) — guna subtotal jika ada, fallback ke total_amount
    const grossRevenue    = safeArr.reduce((s: number, t: any) => s + (t.subtotal ?? t.total_amount ?? 0), 0);
    // Jumlah diskaun
    const totalDiscounts  = safeArr.reduce((s: number, t: any) => s + (t.discount_amount ?? 0), 0);
    const transactionCount = safeArr.length;

    let unitsSold = 0;
    const productMap: Record<string, { name: string; revenue: number; units: number }> = {};
    const dayMap:     Record<string, { revenue: number; count: number }> = {};

    safeArr.forEach((t: any) => {
      const day = t.created_at.split('T')[0];
      if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 };
      dayMap[day].revenue += t.total_amount ?? 0;
      dayMap[day].count   += 1;

      (t.items ?? []).forEach((item: BusinessTransactionItem) => {
        unitsSold += item.qty;
        if (!productMap[item.product_id]) productMap[item.product_id] = { name: item.name, revenue: 0, units: 0 };
        productMap[item.product_id].revenue += item.total_price;
        productMap[item.product_id].units   += item.qty;
      });
    });

    const dailySales = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({ date, ...val }));

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
    };
  }, []);

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const addProduct = async (bId: string, data: Omit<BusinessProduct, 'id' | 'business_id' | 'created_at'>) => {
    const { error } = await supabase.from('business_products').insert({ ...data, business_id: bId });
    if (error) { toast.error('Gagal tambah produk: ' + error.message); return; }
    await writeLog(bId, 'PRODUCT_ADD', `Produk baharu ditambah: ${data.name}`, { name: data.name, price: data.price });
    toast.success('Produk ditambah!');
    await fetchProducts(bId);
  };

  const updateProduct = async (productId: string, bId: string, data: Partial<BusinessProduct>) => {
    const { error } = await supabase.from('business_products').update(data).eq('id', productId);
    if (error) { toast.error('Gagal kemaskini: ' + error.message); return; }
    if ('stock_quantity' in data) {
      await writeLog(bId, 'STOCK_EDIT', `Stok produk dikemaskini.`, { product_id: productId, new_stock: data.stock_quantity });
    } else {
      await writeLog(bId, 'PRODUCT_EDIT', `Produk dikemaskini.`, { product_id: productId });
    }
    await fetchProducts(bId);
  };

  const deleteProduct = async (productId: string, bId: string, productName: string) => {
    const { error } = await supabase.from('business_products').delete().eq('id', productId);
    if (error) { toast.error('Gagal padam: ' + error.message); return; }
    await writeLog(bId, 'PRODUCT_DELETE', `Produk dipadam: ${productName}`, { product_id: productId });
    toast.success('Produk dipadamkan.');
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
    if (error) { toast.error('Gagal tambah perbelanjaan: ' + error.message); return false; }
    await writeLog(bId, 'EXPENSE_ADD', `Perbelanjaan RM${data.amount.toFixed(2)} (${data.category}): ${data.description}`, { amount: data.amount, category: data.category });
    toast.success('Perbelanjaan direkodkan!');
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
    if (error) { toast.error('Gagal padam: ' + error.message); return; }
    await writeLog(bId, 'EXPENSE_DELETE', 'Rekod perbelanjaan dipadam.', { expense_id: expenseId });
    toast.success('Rekod dipadam.');
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

    if (error || !data) return { valid: false, error: 'Kod promosi tidak sah.' };
    const p = data as BusinessPromotion;

    if (!p.is_active) return { valid: false, error: 'Kod promosi ini tidak aktif.' };

    const todayStr = new Date().toISOString().split('T')[0];
    if (p.valid_from && todayStr < p.valid_from) return { valid: false, error: 'Promosi ini belum bermula.' };
    if (p.valid_until && todayStr > p.valid_until) return { valid: false, error: 'Promosi ini telah tamat tempoh.' };
    if (p.max_uses !== null && p.uses_count >= p.max_uses) return { valid: false, error: 'Had penggunaan kupon ini telah dicapai.' };
    if (subtotal < p.min_purchase) return { valid: false, error: `Minimum pembelian RM${p.min_purchase.toFixed(2)} diperlukan.` };

    return { valid: true, promotion: p };
  };

  const addPromotion = async (bId: string, data: Omit<BusinessPromotion, 'id' | 'business_id' | 'uses_count' | 'created_at' | 'created_by'>) => {
    const { error } = await supabase.from('business_promotions').insert({
      ...data,
      business_id: bId,
      created_by:  user?.id,
    });
    if (error) {
      if (error.code === '23505') toast.error('Kod promosi sudah wujud untuk perniagaan ini.');
      else toast.error('Gagal cipta promosi: ' + error.message);
      return false;
    }
    await writeLog(bId, 'PROMO_CREATE', `Promosi baharu: ${data.code} — ${data.name}`, { code: data.code });
    toast.success('Promosi dicipta!');
    return true;
  };

  const togglePromotion = async (promotionId: string, bId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('business_promotions').update({ is_active: isActive }).eq('id', promotionId);
    if (error) { toast.error('Gagal kemaskini promosi.'); return; }
    await writeLog(bId, 'PROMO_TOGGLE', `Promosi ${isActive ? 'diaktifkan' : 'dinyahaktifkan'}.`, { promotion_id: promotionId, is_active: isActive });
    toast.success(isActive ? 'Promosi diaktifkan.' : 'Promosi dinyahaktifkan.');
  };

  const deletePromotion = async (promotionId: string, bId: string, code: string): Promise<void> => {
    const { error } = await supabase.from('business_promotions').delete().eq('id', promotionId);
    if (error) { toast.error('Gagal padam promosi.'); return; }
    toast.success(`Promosi ${code} dipadam.`);
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
    if (error) { toast.error('Gagal rekod checkpoint: ' + error.message); return false; }
    await writeLog(bId, 'CASH_CHECKPOINT', `Checkpoint baldi: ${data.label} — RM${data.cash_amount.toFixed(2)}`, { label: data.label, amount: data.cash_amount });
    toast.success('Checkpoint direkodkan!');
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
    if (error) { toast.error('Gagal padam checkpoint.'); return; }
    toast.success('Checkpoint dipadam.');
  };

  // ── POS Assignment (manual) ───────────────────────────────────────────────

  const assignPosToday = async (bId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('business_pos_assignments').upsert({
      business_id: bId, user_id: userId, assigned_by: user?.id, valid_date: today(),
    }, { onConflict: 'business_id,user_id,valid_date' });
    if (error) { toast.error('Gagal assign: ' + error.message); return; }
    await writeLog(bId, 'POS_ASSIGNED', `${userName} ditetapkan sebagai Staff POS hari ini.`, { user_id: userId, user_name: userName });
    toast.success(`${userName} ditetapkan untuk POS hari ini.`);
    await fetchAssignments(bId);
  };

  const removePosAssignment = async (assignmentId: string, bId: string) => {
    const a = assignments.find(x => x.id === assignmentId);
    await supabase.from('business_pos_assignments').delete().eq('id', assignmentId);
    if (a) await writeLog(bId, 'POS_ASSIGNED', `Tugasan POS ${a.user?.full_name ?? ''} dibuang.`, { user_id: a.user_id });
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
      
      await writeLog(bId, 'OWNERSHIP_TRANSFERRED', `Pemilikan perniagaan telah dipindahkan sepenuhnya kepada ${newOwnerName}.`);
      toast.success('Pemilikan perniagaan berjaya dipindahkan!');
      return true;
    } catch (err: any) {
      toast.error('Gagal pindah milik: ' + (err.message || 'Ralat tidak diketahui'));
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
