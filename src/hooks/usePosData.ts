import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  BusinessProduct, BusinessTransaction, BusinessTransactionItem,
  BusinessPosLog, BusinessPosAssignment,
  PosPaymentMethod, PosDiscountType, PosLogAction,
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
}

export interface StatsData {
  totalRevenue:      number;
  transactionCount:  number;
  unitsSold:         number;
  averageOrderValue: number;
  dailySales:        { date: string; revenue: number; count: number }[];
  topProducts:       { name: string; revenue: number; units: number }[];
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

    // 4. Check gerai shift (Gerai JPP shift system)
    const { data: shift } = await supabase
      .from('gerai_shifts')
      .select('id')
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
      })
      .select()
      .single();

    if (error) return { error: error.message };

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

    // Restore stock
    const txn = transactions.find(t => t.id === txnId);
    if (txn) {
      await Promise.all(
        txn.items.map(item =>
          supabase
            .from('business_products')
            .update({ stock_quantity: supabase.rpc('increment_product_stock', { p_product_id: item.product_id, p_qty: item.qty }) as any })
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

    const { data: txns } = await supabase
      .from('business_transactions')
      .select('total_amount, items, created_at')
      .eq('business_id', bId)
      .eq('status', 'COMPLETED')
      .gte('created_at', fromIso)
      .order('created_at');

    const safeArr = txns ?? [];

    const totalRevenue = safeArr.reduce((s: number, t: any) => s + (t.total_amount ?? 0), 0);
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

    return {
      totalRevenue,
      transactionCount,
      unitsSold,
      averageOrderValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
      dailySales,
      topProducts,
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
  };
}
