import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Package,
  Search,
  Filter,
  Check,
  X,
  Copy,
  MessageCircle,
  Phone,
  Eye,
  Receipt,
  Utensils,
  Coffee,
  Layers,
  Wrench,
  Tag,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Calendar,
  CheckSquare,
  Square,
  Inbox,
  User,
  Handshake,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import { ReceiptReviewSheet } from './ReceiptReviewSheet';

// ── Types ──────────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  order_id: string;
  product_id: string;
  name: string;
  image_url: string | null;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_variation: string | null;
  note: string | null;
}

export interface GroupedVendorOrder {
  id: string;
  buyer: {
    id: string;
    full_name: string;
    matric_no: string;
    phone: string | null;
  } | null;
  business_id: string;
  payment_method: 'COD' | 'QR_ONLINE' | null;
  payment_receipt_url: string | null;
  payment_receipt_rejected: boolean;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  payment_deadline_at: string | null;
  pickup_time: string | null;
  share_phone: boolean;
  status: OrderStatus;
  created_at: string;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  items: OrderItem[];
}

export interface VendorOrdersPipelineProps {
  orders: GroupedVendorOrder[];
  loading: boolean;
  onUpdate: () => void;
  bizName?: string;
  myBusinesses: Array<{ id: string; name: string }>;
  selectedBizId: string;
}

export type PipelineStage = 'actions' | 'processing' | 'completed';

export const PIPELINE_STAGES: Array<{
  key: PipelineStage;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'actions',
    label: 'Tindakan Diperlukan',
    sublabel: 'Menunggu Pengesahan',
    icon: AlertCircle,
  },
  {
    key: 'processing',
    label: 'Sedang Disediakan',
    sublabel: 'Dalam Penyediaan',
    icon: Clock,
  },
  {
    key: 'completed',
    label: 'Selesai & Arkib',
    sublabel: 'Selesai / Dibatalkan',
    icon: CheckCircle2,
  },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; colorClass: string; bgClass: string }> = {
  PENDING: {
    label: 'Menunggu',
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
  },
  CONFIRMED: {
    label: 'Disahkan',
    colorClass: 'text-indigo-500 dark:text-indigo-400',
    bgClass: 'bg-indigo-500/10 border-indigo-500/20',
  },
  READY: {
    label: 'Siap Diambil',
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
  },
  COMPLETED: {
    label: 'Selesai',
    colorClass: 'text-zinc-500 dark:text-zinc-400',
    bgClass: 'bg-zinc-500/10 border-zinc-500/20',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    colorClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
  },
};

const getCategoryIcon = (category: string) => {
  const className = 'w-4 h-4 text-muted-foreground stroke-[1.5]';
  switch (category) {
    case 'Makanan':
      return <Utensils className={className} />;
    case 'Minuman':
      return <Coffee className={className} />;
    case 'Aksesori':
      return <Layers className={className} />;
    case 'Perkhidmatan':
      return <Wrench className={className} />;
    case 'Pakaian':
      return <Tag className={className} />;
    case 'Elektronik':
      return <Smartphone className={className} />;
    default:
      return <Package className={className} />;
  }
};

// ── Main Pipeline Component ────────────────────────────────────────────────────
export const VendorOrdersPipeline: React.FC<VendorOrdersPipelineProps> = ({
  orders,
  loading,
  onUpdate,
  bizName,
  myBusinesses,
  selectedBizId,
}) => {
  const { profile } = useAuth();

  // Active Stage Tab
  const [activeStage, setActiveStage] = useState<PipelineStage>('actions');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'QR_ONLINE'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');

  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Sheet / Modal State for Single Order Actions
  const [reviewOrder, setReviewOrder] = useState<GroupedVendorOrder | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Cancellation Modal / Prompt State
  const [cancellingOrder, setCancellingOrder] = useState<GroupedVendorOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Completion Dialog State
  const [completingOrder, setCompletingOrder] = useState<GroupedVendorOrder | null>(null);
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState<'CASH' | 'QR' | 'TRANSFER'>('QR');

  // Expanded Cards State
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Business Filter
  const bizFilteredOrders = useMemo(() => {
    if (!selectedBizId || selectedBizId === 'all') return orders;
    return orders.filter((o) => o.business_id === selectedBizId);
  }, [orders, selectedBizId]);

  // 2. Stage Partitioning
  const stagePartitionedOrders = useMemo(() => {
    const actions: GroupedVendorOrder[] = [];
    const processing: GroupedVendorOrder[] = [];
    const completed: GroupedVendorOrder[] = [];

    bizFilteredOrders.forEach((order) => {
      if (
        order.status === 'PENDING' ||
        (order.payment_method === 'QR_ONLINE' &&
          order.payment_receipt_url &&
          !order.payment_verified_at &&
          order.status !== 'CANCELLED' &&
          order.status !== 'COMPLETED')
      ) {
        actions.push(order);
      } else if (order.status === 'CONFIRMED' || order.status === 'READY') {
        processing.push(order);
      } else {
        completed.push(order);
      }
    });

    return { actions, processing, completed };
  }, [bizFilteredOrders]);

  // Counts for Badges
  const actionsCount = stagePartitionedOrders.actions.length;
  const processingCount = stagePartitionedOrders.processing.length;
  const completedCount = stagePartitionedOrders.completed.length;

  const getStageCount = (stage: PipelineStage) => {
    switch (stage) {
      case 'actions':
        return actionsCount;
      case 'processing':
        return processingCount;
      case 'completed':
        return completedCount;
    }
  };

  // 3. Filter current stage orders by search, payment method, date
  const displayedOrders = useMemo(() => {
    let list = stagePartitionedOrders[activeStage];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.buyer?.full_name && o.buyer.full_name.toLowerCase().includes(q)) ||
          (o.buyer?.matric_no && o.buyer.matric_no.toLowerCase().includes(q))
      );
    }

    // Payment method filter
    if (paymentFilter !== 'ALL') {
      list = list.filter((o) => o.payment_method === paymentFilter);
    }

    // Date filter
    if (dateFilter === 'TODAY') {
      const todayStr = new Date().toDateString();
      list = list.filter((o) => new Date(o.created_at).toDateString() === todayStr);
    } else if (dateFilter === 'WEEK') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((o) => new Date(o.created_at).getTime() >= oneWeekAgo);
    }

    return list;
  }, [stagePartitionedOrders, activeStage, searchQuery, paymentFilter, dateFilter]);

  // Bulk selection helpers
  const displayedOrderIds = useMemo(() => displayedOrders.map((o) => o.id), [displayedOrders]);
  const isAllDisplayedSelected =
    displayedOrderIds.length > 0 && displayedOrderIds.every((id) => selectedOrderIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !displayedOrderIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...displayedOrderIds])));
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // ── Business Actions & RPC Handlers ──────────────────────────────────────────

  // Update Status for Single Order
  const handleUpdateStatus = async (
    order: GroupedVendorOrder,
    newStatus: OrderStatus,
    extra: Record<string, any> = {}
  ) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = { status: newStatus, updated_at: now, ...extra };
      if (newStatus === 'CONFIRMED') updates.confirmed_at = now;
      if (newStatus === 'READY') updates.ready_at = now;
      if (newStatus === 'COMPLETED') updates.completed_at = now;
      if (newStatus === 'CANCELLED') updates.cancelled_at = now;

      const orderIds = order.items.map((i) => i.order_id);

      // Demo mode support
      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (orderIds.includes(o.id)) {
              return { ...o, ...updates };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }

        if (newStatus === 'CANCELLED') {
          const storedProds = localStorage.getItem('mock_vendor_products');
          if (storedProds) {
            const parsedProds = JSON.parse(storedProds);
            const updatedProds = parsedProds.map((p: any) => {
              const matchedItem = order.items.find((item) => item.product_id === p.id);
              if (matchedItem) {
                if (matchedItem.selected_variation && p.variations) {
                  return {
                    ...p,
                    variations: p.variations.map((v: any) =>
                      v.name === matchedItem.selected_variation
                        ? { ...v, stock: v.stock + matchedItem.quantity }
                        : v
                    ),
                  };
                } else {
                  return {
                    ...p,
                    stock_quantity: (p.stock_quantity || 0) + matchedItem.quantity,
                  };
                }
              }
              return p;
            });
            localStorage.setItem('mock_vendor_products', JSON.stringify(updatedProds));
          }
        }

        toast.success(`Status dikemaskini: ${STATUS_CONFIG[newStatus].label}`);
        onUpdate();
        return;
      }

      // Cancellation stock release
      if (newStatus === 'CANCELLED') {
        for (const item of order.items) {
          await supabase.rpc('release_polymart_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
            p_variation: item.selected_variation || null,
          });
        }
      }

      // Completion RPC
      if (newStatus === 'COMPLETED') {
        const paymentMethod = extra.payment_method || completionPaymentMethod;
        for (const item of order.items) {
          const { error } = await supabase.rpc('complete_polymart_order', {
            p_order_id: item.order_id,
            p_business_id: order.business_id,
            p_product_id: item.product_id,
            p_quantity: item.quantity,
            p_unit_price: item.unit_price,
            p_payment_method: paymentMethod,
            p_served_by: profile?.id,
          });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('polymart_orders').update(updates).in('id', orderIds);
        if (error) throw error;
      }

      // Notify Buyer
      const buyerId = order.buyer?.id;
      if (buyerId) {
        const itemsDesc = order.items
          .map(
            (i) =>
              `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`
          )
          .join(', ');

        const messages: Record<string, { title: string; message: string }> = {
          CONFIRMED: {
            title: '[PolyMart] Pesanan Disahkan',
            message: `Pesanan anda (${itemsDesc}) telah disahkan. Sedia pada: ${order.pickup_time ?? 'Akan dimaklumkan'}`,
          },
          READY: {
            title: '[PolyMart] Pesanan Siap Diambil',
            message: `Pesanan anda (${itemsDesc}) sudah siap. Sila datang ambil!`,
          },
          COMPLETED: {
            title: '[PolyMart] Pesanan Selesai',
            message: 'Terima kasih kerana berurusan di PolyMart!',
          },
          CANCELLED: {
            title: '[PolyMart] Pesanan Dibatalkan',
            message: `Pesanan anda dibatalkan${extra.cancel_reason ? `: ${extra.cancel_reason}` : ''}`,
          },
        };

        const msg = messages[newStatus];
        if (msg) {
          await sendNotificationToUser(buyerId, {
            ...msg,
            type: `polymart_order_${newStatus.toLowerCase()}`,
            module: 'POLYMART',
            link: '/polymart/pesanan-saya',
            reference_id: order.id,
          });
        }
      }

      toast.success(`Status dikemaskini: ${STATUS_CONFIG[newStatus].label}`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mengemaskini status');
    } finally {
      setActionLoading(false);
      setCancellingOrder(null);
      setCancelReason('');
      setCompletingOrder(null);
    }
  };

  // Verify Receipt via ReceiptReviewSheet
  const handleVerifyReceipt = async () => {
    if (!reviewOrder) return;
    setReviewLoading(true);
    try {
      const now = new Date().toISOString();
      const orderIds = reviewOrder.items.map((i) => i.order_id);

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (orderIds.includes(o.id)) {
              return {
                ...o,
                payment_verified_at: now,
                payment_verified_by: profile?.id,
                status: 'CONFIRMED',
                confirmed_at: now,
                updated_at: now,
              };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }
        toast.success('Bayaran disahkan!');
        setReviewOrder(null);
        onUpdate();
        return;
      }

      const { error } = await supabase
        .from('polymart_orders')
        .update({
          payment_verified_at: now,
          payment_verified_by: profile?.id,
          status: 'CONFIRMED',
          confirmed_at: now,
          updated_at: now,
        })
        .in('id', orderIds);

      if (error) throw error;

      if (reviewOrder.buyer?.id) {
        await sendNotificationToUser(reviewOrder.buyer.id, {
          title: '[PolyMart] Bayaran Disahkan',
          message: 'Bayaran untuk tempahan anda telah disahkan. Pesanan sedang diproses!',
          type: 'polymart_payment_verified',
          module: 'POLYMART',
          link: '/polymart/pesanan-saya',
          reference_id: reviewOrder.id,
        });
      }

      toast.success('Bayaran disahkan!');
      setReviewOrder(null);
      onUpdate();
    } catch (err: any) {
      toast.error('Gagal mengesahkan bayaran: ' + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Reject Receipt via ReceiptReviewSheet
  const handleRejectReceipt = async () => {
    if (!reviewOrder) return;
    setReviewLoading(true);
    try {
      const now = new Date().toISOString();
      const orderIds = reviewOrder.items.map((i) => i.order_id);

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (orderIds.includes(o.id)) {
              return {
                ...o,
                payment_receipt_rejected: true,
                updated_at: now,
              };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }
        toast.error('Resit ditolak');
        setReviewOrder(null);
        onUpdate();
        return;
      }

      const { error } = await supabase
        .from('polymart_orders')
        .update({
          payment_receipt_rejected: true,
          updated_at: now,
        })
        .in('id', orderIds);

      if (error) throw error;

      if (reviewOrder.buyer?.id) {
        await sendNotificationToUser(reviewOrder.buyer.id, {
          title: '[PolyMart] Resit Ditolak',
          message: 'Resit pembayaran anda telah ditolak. Sila muat naik semula resit yang sah.',
          type: 'polymart_receipt_rejected',
          module: 'POLYMART',
          link: '/polymart/pesanan-saya',
          reference_id: reviewOrder.id,
        });
      }

      toast.error('Resit ditolak');
      setReviewOrder(null);
      onUpdate();
    } catch (err: any) {
      toast.error('Gagal menolak resit: ' + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Bulk Verify in 'actions' tab
  const handleBulkVerify = async () => {
    if (selectedOrderIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const selectedGroups = displayedOrders.filter((o) => selectedOrderIds.includes(o.id));
      const allItemOrderIds = selectedGroups.flatMap((g) => g.items.map((item) => item.order_id));

      if (allItemOrderIds.length === 0) {
        toast.error('Tiada pesanan terpilih');
        return;
      }

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (allItemOrderIds.includes(o.id)) {
              return {
                ...o,
                status: 'CONFIRMED',
                payment_verified_at: now,
                payment_verified_by: profile?.id,
                confirmed_at: now,
                updated_at: now,
              };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }
      } else {
        const { error } = await supabase
          .from('polymart_orders')
          .update({
            status: 'CONFIRMED',
            payment_verified_at: now,
            payment_verified_by: profile?.id,
            confirmed_at: now,
            updated_at: now,
          })
          .in('id', allItemOrderIds);

        if (error) throw error;
      }

      await Promise.all(
        selectedGroups.map(async (group) => {
          const buyerId = group.buyer?.id;
          if (buyerId) {
            const itemsDesc = group.items
              .map(
                (i) =>
                  `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`
              )
              .join(', ');

            await sendNotificationToUser(buyerId, {
              title: '[PolyMart] Bayaran Disahkan',
              message: `Bayaran untuk tempahan anda telah disahkan secara pukal. Pesanan sedang diproses! Sedia pada: ${group.pickup_time ?? 'Akan dimaklumkan'}`,
              type: 'polymart_payment_verified',
              module: 'POLYMART',
              link: '/polymart/pesanan-saya',
              reference_id: group.id,
            });
          }
        })
      );

      toast.success(`Berjaya mengesahkan ${selectedGroups.length} pesanan secara pukal!`);
      setSelectedOrderIds([]);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mengesahkan secara pukal');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Ready in 'processing' tab
  const handleBulkReady = async () => {
    if (selectedOrderIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const selectedGroups = displayedOrders.filter((o) => selectedOrderIds.includes(o.id));
      const allItemOrderIds = selectedGroups.flatMap((g) => g.items.map((item) => item.order_id));

      if (allItemOrderIds.length === 0) {
        toast.error('Tiada pesanan terpilih');
        return;
      }

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (allItemOrderIds.includes(o.id)) {
              return {
                ...o,
                status: 'READY',
                ready_at: now,
                updated_at: now,
              };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }
      } else {
        const { error } = await supabase
          .from('polymart_orders')
          .update({
            status: 'READY',
            ready_at: now,
            updated_at: now,
          })
          .in('id', allItemOrderIds);

        if (error) throw error;
      }

      await Promise.all(
        selectedGroups.map(async (group) => {
          const buyerId = group.buyer?.id;
          if (buyerId) {
            const itemsDesc = group.items
              .map(
                (i) =>
                  `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`
              )
              .join(', ');

            await sendNotificationToUser(buyerId, {
              title: '[PolyMart] Pesanan Siap Diambil',
              message: `Pesanan anda (${itemsDesc}) sudah siap. Sila datang ambil!`,
              type: 'polymart_order_ready',
              module: 'POLYMART',
              link: '/polymart/pesanan-saya',
              reference_id: group.id,
            });
          }
        })
      );

      toast.success(
        `Berjaya menukar status ${selectedGroups.length} pesanan kepada Siap Diambil secara pukal!`
      );
      setSelectedOrderIds([]);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal kemaskini secara pukal');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Dispatch In-App Chat Event
  const handleOpenInAppChat = (order: GroupedVendorOrder) => {
    if (order.business_id && order.buyer?.id) {
      window.dispatchEvent(
        new CustomEvent('open-polymart-chat', {
          detail: {
            businessId: order.business_id,
            buyerId: order.buyer.id,
          },
        })
      );
    }
  };

  // Copy Order ID
  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID pesanan disalin!');
  };

  return (
    <div className="space-y-6">
      {/* ── 3-Stage Pipeline Navigation Tabs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.key;
          const count = getStageCount(stage.key);

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => {
                setActiveStage(stage.key);
                setSelectedOrderIds([]);
              }}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-left relative overflow-hidden group active:scale-[0.99] ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm dark:bg-amber-500/15'
                  : 'bg-card border-border/60 hover:border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3
                    className={`text-xs sm:text-sm font-black truncate leading-tight ${
                      isActive ? 'text-foreground' : 'text-foreground/90'
                    }`}
                  >
                    {stage.label}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">
                    {stage.sublabel}
                  </p>
                </div>
              </div>

              <div className="shrink-0 ml-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-black border transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-muted text-muted-foreground border-border/40'
                  }`}
                >
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search, Filter & Bulk Actions Bar ── */}
      <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 p-3.5 sm:p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pembeli, no. matrik, atau ID pesanan..."
              className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-muted/40 border border-border/60 focus:border-amber-500 focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
                aria-label="Kosongkan carian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Filter */}
            <div className="flex items-center rounded-xl bg-muted/40 border border-border/60 p-0.5 text-xs font-bold text-muted-foreground">
              <button
                type="button"
                onClick={() => setPaymentFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  paymentFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                Semua Cara
              </button>
              <button
                type="button"
                onClick={() => setPaymentFilter('COD')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  paymentFilter === 'COD'
                    ? 'bg-background text-amber-500 dark:text-amber-400 shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                COD
              </button>
              <button
                type="button"
                onClick={() => setPaymentFilter('QR_ONLINE')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  paymentFilter === 'QR_ONLINE'
                    ? 'bg-background text-indigo-500 dark:text-indigo-400 shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                QR Online
              </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center rounded-xl bg-muted/40 border border-border/60 p-0.5 text-xs font-bold text-muted-foreground">
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  dateFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                Semua Tarikh
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('TODAY')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  dateFilter === 'TODAY'
                    ? 'bg-background text-foreground shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('WEEK')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  dateFilter === 'WEEK'
                    ? 'bg-background text-foreground shadow-sm font-black'
                    : 'hover:text-foreground'
                }`}
              >
                7 Hari
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Sub-bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={displayedOrders.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 font-bold"
            >
              {isAllDisplayedSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-500" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
              <span>Pilih Semua ({displayedOrders.length})</span>
            </button>

            {selectedOrderIds.length > 0 && (
              <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-[11px]">
                {selectedOrderIds.length} dipilih
              </span>
            )}
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground font-bold"
              >
                Batal Pilihan
              </button>
            )}

            {activeStage === 'actions' && selectedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkVerify}
                disabled={bulkActionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Sahkan Pukal ({selectedOrderIds.length})</span>
              </button>
            )}

            {activeStage === 'processing' && selectedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkReady}
                disabled={bulkActionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Package className="w-3.5 h-3.5" />
                )}
                <span>Tanda Siap Pukal ({selectedOrderIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Order List & Empty States ── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">Memuatkan saluran pesanan...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-card rounded-3xl border border-border/50 p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-black text-foreground">Tiada Pesanan Dijumpai</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || paymentFilter !== 'ALL' || dateFilter !== 'ALL'
              ? 'Tiada rekod pesanan yang sepadan dengan kriteria carian atau penapis anda.'
              : `Tiada pesanan dalam kategori ${
                  activeStage === 'actions'
                    ? 'Tindakan Diperlukan'
                    : activeStage === 'processing'
                    ? 'Sedang Disediakan'
                    : 'Selesai & Arkib'
                }.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedOrders.map((order) => {
            const isSelected = selectedOrderIds.includes(order.id);
            const isExpanded = !!expandedOrderIds[order.id];
            const cfg = STATUS_CONFIG[order.status];
            const totalAmount = order.items.reduce((s, i) => s + i.total_price, 0);
            const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
            const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;

            // Dynamic WhatsApp Templates
            const storeName = bizName || 'PolyMart';
            let waText = '';
            if (order.status === 'PENDING') {
              if (order.payment_method === 'QR_ONLINE') {
                waText = `[PolyMart] Hai ${order.buyer?.full_name || 'Pelajar'}! Tempahan anda ${shortId} di kedai ${storeName} telah diterima. Sila buat pembayaran QR Online dan muat naik resit ke sistem supaya kami boleh mengesahkan pesanan anda. Terima kasih!`;
              } else {
                waText = `[PolyMart] Hai ${order.buyer?.full_name || 'Pelajar'}! Tempahan anda ${shortId} secara COD di kedai ${storeName} telah diterima. Sila tunggu maklum balas daripada kami untuk pengesahan lanjut ya. Terima kasih!`;
              }
            } else if (order.status === 'CONFIRMED') {
              waText = `[PolyMart] Hai ${order.buyer?.full_name || 'Pelajar'}! Pembayaran / pesanan anda ${shortId} di kedai ${storeName} telah disahkan. Kami sedang menyiapkannya sekarang. Kami akan maklumkan semula apabila sedia untuk diambil. Terima kasih!`;
            } else if (order.status === 'READY') {
              const pickupPart = order.pickup_time ? ` pada ${order.pickup_time}` : '';
              waText = `[PolyMart] Hai ${order.buyer?.full_name || 'Pelajar'}! Tempahan anda ${shortId} di kedai ${storeName} telah SEDIA untuk diambil. Sila datang ambil di lokasi perniagaan kami${pickupPart}. Terima kasih!`;
            } else if (order.status === 'CANCELLED') {
              waText = `[PolyMart] Hai ${order.buyer?.full_name || 'Pelajar'}! Tempahan anda ${shortId} di kedai ${storeName} telah dibatalkan. Jika bayaran telah dibuat, pihak kami akan berhubung lanjut untuk proses pemulangan wang. Terima kasih.`;
            }

            const buyerPhone = order.buyer?.phone
              ? order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60')
              : null;
            const waUrl = buyerPhone ? `https://wa.me/${buyerPhone}?text=${encodeURIComponent(waText)}` : null;

            return (
              <motion.div
                key={order.id}
                layout
                className={`rounded-3xl border transition-all duration-300 bg-card overflow-hidden shadow-sm ${
                  isSelected
                    ? 'border-amber-500/80 ring-2 ring-amber-500/20'
                    : 'border-border/60 hover:border-amber-400/50'
                }`}
              >
                {/* ── Order Header Bar ── */}
                <div className="p-3.5 sm:p-4 border-b border-border/40 flex items-center justify-between gap-3 bg-muted/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectOrder(order.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Pilih pesanan"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground/60" />
                      )}
                    </button>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.bgClass} ${cfg.colorClass}`}
                    >
                      {cfg.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyOrderId(order.id)}
                      className="text-[10px] font-mono font-black text-muted-foreground hover:text-amber-500 bg-muted/60 hover:bg-muted border border-border/50 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      title="Salin ID Pesanan"
                    >
                      <span>{shortId}</span>
                      <Copy className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground hidden sm:inline">
                      {new Date(order.created_at).toLocaleDateString('ms-MY', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Expand/Collapse details */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="p-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                      aria-label="Butiran lanjut pesanan"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Order Body Content ── */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Buyer Info & Quick Action Icons */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                        {order.buyer?.full_name ? order.buyer.full_name[0].toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-foreground truncate">
                          {order.buyer?.full_name || 'Pelajar'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {order.buyer?.matric_no || 'Tiada No Matrik'}
                          </span>
                          {order.pickup_time && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{order.pickup_time}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chat & WhatsApp Shortcut Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenInAppChat(order)}
                        title="Chat bersama pembeli"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/60 hover:bg-amber-500 hover:text-white text-muted-foreground flex items-center justify-center border border-border/60 transition-colors shadow-sm"
                        aria-label="Chat Dalam Sistem"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp pembeli"
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 transition-colors shadow-sm"
                          aria-label="WhatsApp Pembeli"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-b border-border/40 pb-3"
                      >
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/20 p-3 rounded-2xl">
                          <div className="flex justify-between">
                            <span>No. Telefon:</span>
                            <span className="font-mono font-bold text-foreground">
                              {order.buyer?.phone || 'Tidak dikongsi'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>ID Pesanan Lengkap:</span>
                            <span className="font-mono text-[11px] text-foreground select-all">
                              {order.id}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Masa Pesanan Dibuat:</span>
                            <span className="font-mono text-[11px] text-foreground">
                              {new Date(order.created_at).toLocaleString('ms-MY')}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Items List */}
                  <div className="space-y-2.5">
                    {order.items.map((item) => (
                      <div
                        key={item.order_id}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/25 border border-border/40"
                      >
                        <div className="w-10 h-10 rounded-xl bg-background border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            getCategoryIcon(item.category)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-foreground truncate">{item.name}</p>
                            {item.selected_variation && (
                              <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-mono font-bold uppercase border border-border/40">
                                {item.selected_variation}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {`RM ${item.unit_price.toFixed(2)} x ${item.quantity}`}
                          </p>
                          {item.note && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5 truncate">
                              Nota: {item.note}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-black text-foreground">
                            {`RM ${item.total_price.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price & Payment Summary Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {order.payment_method === 'COD' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                          <Handshake className="w-3 h-3" />
                          <span>COD (Tunai)</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${
                              order.payment_verified_at
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                                : order.payment_receipt_rejected
                                ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                                : order.payment_receipt_url
                                ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
                                : 'bg-muted border-border/60 text-muted-foreground'
                            }`}
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>
                              {order.payment_verified_at
                                ? 'QR - Telah Dibayar'
                                : order.payment_receipt_rejected
                                ? 'QR - Resit Ditolak'
                                : order.payment_receipt_url
                                ? 'QR - Perlu Semak Resit'
                                : 'QR - Belum Bayar'}
                            </span>
                          </span>

                          {order.payment_receipt_url && (
                            <button
                              type="button"
                              onClick={() => setReviewOrder(order)}
                              className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-black flex items-center gap-1 transition-colors"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Semak Resit</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground font-bold mr-1.5">
                        Jumlah ({totalQty} item):
                      </span>
                      <span className="text-sm sm:text-base font-mono font-black text-amber-500 dark:text-amber-400">
                        {`RM ${totalAmount.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* ── Action Buttons based on Status ── */}
                  <div className="pt-2 border-t border-border/40 flex flex-wrap gap-2">
                    {order.status === 'PENDING' && (
                      <>
                        {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && !order.payment_verified_at ? (
                          <button
                            type="button"
                            onClick={() => setReviewOrder(order)}
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Semak Resit</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order, 'CONFIRMED')}
                            disabled={actionLoading}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Sahkan Pesanan</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setCancellingOrder(order)}
                          disabled={actionLoading}
                          className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 font-black text-xs flex items-center justify-center gap-1 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      </>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order, 'READY')}
                          disabled={actionLoading}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Tanda Siap Diambil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCancellingOrder(order)}
                          disabled={actionLoading}
                          className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 font-black text-xs flex items-center justify-center gap-1 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      </>
                    )}

                    {order.status === 'READY' && (
                      <button
                        type="button"
                        onClick={() => setCompletingOrder(order)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sahkan Selesai (Ambil)</span>
                      </button>
                    )}

                    {order.status === 'CANCELLED' && order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && (
                      <div className="w-full p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate font-bold">Resit dikesan untuk pesanan terbatal. Sila semak pemulangan wang.</span>
                        </div>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-black text-[10px] shrink-0"
                          >
                            Hubungi WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Integrated Receipt Review Sheet ── */}
      {reviewOrder && (
        <ReceiptReviewSheet
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          receiptUrl={reviewOrder.payment_receipt_url}
          orderId={reviewOrder.id}
          buyerName={reviewOrder.buyer?.full_name}
          buyerMatric={reviewOrder.buyer?.matric_no}
          amount={reviewOrder.items.reduce((s, i) => s + i.total_price, 0)}
          paymentVerifiedAt={reviewOrder.payment_verified_at}
          paymentRejected={reviewOrder.payment_receipt_rejected}
          onVerify={handleVerifyReceipt}
          onReject={handleRejectReceipt}
          loading={reviewLoading}
        />
      )}

      {/* ── Cancellation Modal ── */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border/50 p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black text-foreground">Sahkan Pembatalan Pesanan</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Pesanan #{cancellingOrder.id.slice(0, 8).toUpperCase()} akan dibatalkan dan kuantiti stok akan dikembalikan secara automatik.
              </p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nyatakan sebab pembatalan (cth: stok habis)..."
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-muted/40 border border-border/60 text-foreground focus:outline-none focus:border-rose-500"
              />
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancelReason('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(cancellingOrder, 'CANCELLED', {
                      cancel_reason: cancelReason,
                    })
                  }
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition-colors"
                >
                  {actionLoading ? 'Memproses...' : 'Sahkan Batal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Completion Dialog ── */}
      <AnimatePresence>
        {completingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border/50 p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-black text-foreground">Sahkan Selesai Pesanan</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Sila sahkan kaedah pembayaran akhir untuk pesanan #{completingOrder.id.slice(0, 8).toUpperCase()}:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'QR', 'TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setCompletionPaymentMethod(method)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black border transition-colors ${
                      completionPaymentMethod === method
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {method === 'CASH' ? 'Tunai' : method === 'QR' ? 'QR Pay' : 'Transfer'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingOrder(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(completingOrder, 'COMPLETED', {
                      payment_method: completionPaymentMethod,
                    })
                  }
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-colors"
                >
                  {actionLoading ? 'Menyimpan...' : 'Sahkan Selesai'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorOrdersPipeline;
