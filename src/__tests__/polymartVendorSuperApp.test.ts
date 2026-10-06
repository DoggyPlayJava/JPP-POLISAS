import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies for SSR testing
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { id: 'test-user-123', full_name: 'Vendor Boss' },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('@/lib/notifications', () => ({
  sendNotificationToUser: vi.fn().mockResolvedValue(undefined),
}));

describe('ReceiptReviewSheet Component', () => {
  it('exports ReceiptReviewSheet correctly as named and default export', async () => {
    const mod = await import('@/pages/polymart/vendor/ReceiptReviewSheet');
    expect(mod.ReceiptReviewSheet).toBeDefined();
    expect(typeof mod.ReceiptReviewSheet).toBe('function');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.ReceiptReviewSheet);
  });

  it('contains slide-up bottom sheet animation tokens (framer-motion, y: "100%", y: 0)', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/ReceiptReviewSheet.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    // framer-motion import and tokens
    expect(sourceCode).toContain('framer-motion');
    expect(sourceCode).toContain("initial={{ y: '100%' }}");
    expect(sourceCode).toContain('animate={{ y: 0 }}');
    expect(sourceCode).toContain("exit={{ y: '100%' }}");

    // Drag handle pill
    expect(sourceCode).toContain('w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto');
  });

  it('contains action buttons Sahkan Bayaran and Tolak Resit with proper styling tokens', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/ReceiptReviewSheet.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    expect(sourceCode).toContain('Sahkan Bayaran');
    expect(sourceCode).toContain('Tolak Resit');
    expect(sourceCode).toContain('bg-rose-500/10');
    expect(sourceCode).toContain('bg-emerald-500');
  });

  it('contains zero raw emojis across the entire file', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/ReceiptReviewSheet.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    // Emoji regex checking standard unicode emoji ranges
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(sourceCode).not.toMatch(emojiRegex);
  });

  it('renders correctly via SSR string rendering when open', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ReceiptReviewSheet } = await import('@/pages/polymart/vendor/ReceiptReviewSheet');

    const mockVerify = vi.fn().mockResolvedValue(undefined);
    const mockReject = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    const html = renderToString(
      React.createElement(ReceiptReviewSheet, {
        isOpen: true,
        onClose: mockClose,
        receiptUrl: 'https://example.com/receipt-sample.jpg',
        orderId: 'a1b2c3d4e5f6',
        buyerName: 'Ahmad Albab',
        buyerMatric: '03DEP21F1001',
        amount: 25.5,
        paymentVerifiedAt: null,
        paymentRejected: false,
        onVerify: mockVerify,
        onReject: mockReject,
        loading: false,
      })
    );

    // Verify rendered content
    expect(html).toContain('Semakan Resit Pembayaran');
    expect(html).toContain('#A1B2C3D4');
    expect(html).toContain('Ahmad Albab');
    expect(html).toContain('03DEP21F1001');
    expect(html).toContain('RM 25.50');
    expect(html).toContain('Sahkan Bayaran');
    expect(html).toContain('Tolak Resit');
    expect(html).toContain('https://example.com/receipt-sample.jpg');
  });

  it('displays empty state placeholder when no receiptUrl is provided', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ReceiptReviewSheet } = await import('@/pages/polymart/vendor/ReceiptReviewSheet');

    const html = renderToString(
      React.createElement(ReceiptReviewSheet, {
        isOpen: true,
        onClose: vi.fn(),
        receiptUrl: null,
        orderId: 'order-12345',
        buyerName: 'Siti Sarah',
        amount: 10,
        paymentVerifiedAt: null,
        paymentRejected: false,
        onVerify: vi.fn(),
        onReject: vi.fn(),
        loading: false,
      })
    );

    expect(html).toContain('Tiada fail resit dimuat naik');
  });

  it('displays verified badge when paymentVerifiedAt is present', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ReceiptReviewSheet } = await import('@/pages/polymart/vendor/ReceiptReviewSheet');

    const html = renderToString(
      React.createElement(ReceiptReviewSheet, {
        isOpen: true,
        onClose: vi.fn(),
        receiptUrl: 'https://example.com/receipt.jpg',
        orderId: 'order-verified',
        buyerName: 'Ali bin Abu',
        amount: 15.0,
        paymentVerifiedAt: '2026-10-06T08:00:00Z',
        paymentRejected: false,
        onVerify: vi.fn(),
        onReject: vi.fn(),
        loading: false,
      })
    );

    expect(html).toContain('Pembayaran Telah Disahkan!');
    // Verify buttons are not rendered when already verified
    expect(html).not.toContain('Sahkan Bayaran');
  });

  it('renders nothing when isOpen is false', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ReceiptReviewSheet } = await import('@/pages/polymart/vendor/ReceiptReviewSheet');

    const html = renderToString(
      React.createElement(ReceiptReviewSheet, {
        isOpen: false,
        onClose: vi.fn(),
        receiptUrl: 'https://example.com/receipt.jpg',
        orderId: 'order-hidden',
        amount: 12.0,
        onVerify: vi.fn(),
        onReject: vi.fn(),
        loading: false,
      })
    );

    expect(html).toBe('');
  });
});

describe('VendorOrdersPipeline Component', () => {
  it('exports VendorOrdersPipeline correctly as named and default export', async () => {
    const mod = await import('@/pages/polymart/vendor/VendorOrdersPipeline');
    expect(mod.VendorOrdersPipeline).toBeDefined();
    expect(typeof mod.VendorOrdersPipeline).toBe('function');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.VendorOrdersPipeline);
  });

  it('defines the 3 status keys "actions", "processing", "completed"', async () => {
    const mod = await import('@/pages/polymart/vendor/VendorOrdersPipeline');
    expect(mod.PIPELINE_STAGES).toBeDefined();
    const stageKeys = mod.PIPELINE_STAGES.map((s: any) => s.key);
    expect(stageKeys).toEqual(['actions', 'processing', 'completed']);

    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    expect(sourceCode).toContain("'actions'");
    expect(sourceCode).toContain("'processing'");
    expect(sourceCode).toContain("'completed'");
  });

  it('integrates ReceiptReviewSheet component', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    expect(sourceCode).toContain("from './ReceiptReviewSheet'");
    expect(sourceCode).toContain('<ReceiptReviewSheet');
  });

  it('contains zero raw emojis across the entire file', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(sourceCode).not.toMatch(emojiRegex);
  });

  it('contains hairline border and design styling tokens', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    expect(sourceCode).toContain('border-border/60 hover:border-amber-400/50');
  });

  it('preserves core business logic: complete_polymart_order, release_polymart_stock, use_mock_auth, open-polymart-chat', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    expect(sourceCode).toContain('complete_polymart_order');
    expect(sourceCode).toContain('release_polymart_stock');
    expect(sourceCode).toContain('use_mock_auth');
    expect(sourceCode).toContain('open-polymart-chat');
  });

  it('renders correctly via SSR with sample orders across tabs', async () => {
    const { renderToString } = await import('react-dom/server');
    const { VendorOrdersPipeline } = await import('@/pages/polymart/vendor/VendorOrdersPipeline');

    const sampleOrders = [
      {
        id: 'ord-action-001',
        buyer: {
          id: 'buyer-1',
          full_name: 'Muhammad Hakim',
          matric_no: '03DEP22F1002',
          phone: '0123456789',
        },
        business_id: 'biz-1',
        payment_method: 'COD' as const,
        payment_receipt_url: null,
        payment_receipt_rejected: false,
        payment_verified_at: null,
        payment_verified_by: null,
        payment_deadline_at: null,
        pickup_time: '12:30 PM',
        share_phone: true,
        status: 'PENDING' as const,
        created_at: new Date().toISOString(),
        cancellation_requested_at: null,
        cancellation_reason: null,
        items: [
          {
            order_id: 'item-1',
            product_id: 'prod-1',
            name: 'Nasi Lemak Ayam Berempah',
            image_url: null,
            category: 'Makanan',
            quantity: 2,
            unit_price: 6.5,
            total_price: 13.0,
            selected_variation: 'Pedas',
            note: 'Kurang manis',
          },
        ],
      },
      {
        id: 'ord-proc-002',
        buyer: {
          id: 'buyer-2',
          full_name: 'Nurul Izzah',
          matric_no: '03DEP22F1005',
          phone: '0198765432',
        },
        business_id: 'biz-1',
        payment_method: 'QR_ONLINE' as const,
        payment_receipt_url: 'https://example.com/receipt2.jpg',
        payment_receipt_rejected: false,
        payment_verified_at: new Date().toISOString(),
        payment_verified_by: 'vendor-1',
        payment_deadline_at: null,
        pickup_time: '01:00 PM',
        share_phone: true,
        status: 'CONFIRMED' as const,
        created_at: new Date().toISOString(),
        cancellation_requested_at: null,
        cancellation_reason: null,
        items: [
          {
            order_id: 'item-2',
            product_id: 'prod-2',
            name: 'Kopi Ais Kaw',
            image_url: null,
            category: 'Minuman',
            quantity: 1,
            unit_price: 3.5,
            total_price: 3.5,
            selected_variation: null,
            note: null,
          },
        ],
      },
    ];

    const html = renderToString(
      React.createElement(VendorOrdersPipeline, {
        orders: sampleOrders,
        loading: false,
        onUpdate: vi.fn(),
        bizName: 'Kafe Siswa',
        myBusinesses: [{ id: 'biz-1', name: 'Kafe Siswa' }],
        selectedBizId: 'biz-1',
      })
    );

    // Verify 3 Pipeline Stage Tabs exist
    expect(html).toContain('Tindakan Diperlukan');
    expect(html).toContain('Sedang Disediakan');
    expect(html).toContain('Selesai &amp; Arkib');

    // Verify orders are represented in the default 'actions' view
    expect(html).toContain('Muhammad Hakim');
    expect(html).toContain('03DEP22F1002');
    expect(html).toContain('Nasi Lemak Ayam Berempah');
    expect(html).toContain('RM 13.00');
    expect(html).toContain('#ORD-ACTI');
    expect(html).toContain('Sahkan Pesanan');
  });
});
