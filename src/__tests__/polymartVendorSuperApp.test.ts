import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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
