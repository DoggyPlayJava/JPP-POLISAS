import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    hasKeusahawananAccess: false,
    isSuperAdmin: false,
  }),
}));

describe('PolyMartLayout SuperApp Modernization', () => {
  it('exports CATEGORY_LIST with valid Lucide icon mapping and no raw emoji strings', async () => {
    const { CATEGORY_LIST } = await import('@/pages/polymart/PolyMartLayout');
    expect(CATEGORY_LIST).toBeDefined();
    expect(CATEGORY_LIST.length).toBe(8);

    // Verify all categories have icon components and clean labels
    CATEGORY_LIST.forEach((cat: any) => {
      expect(cat.key).toBeDefined();
      expect(cat.label).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(['function', 'object']).toContain(typeof cat.icon);
      // No raw emojis in labels
      expect(cat.label).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    });
  }, 30000);

  it('renders PolyMartLayout with stadium search capsule and discrete circular buttons', async () => {
    const { PolyMartLayout } = await import('@/pages/polymart/PolyMartLayout');
    const { MemoryRouter } = await import('react-router-dom');
    const { renderToString } = await import('react-dom/server');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/polymart'] },
        React.createElement(PolyMartLayout)
      )
    );

    // Stadium search capsule tokens
    expect(html).toContain('rounded-full');
    expect(html).toContain('border-amber-500/20');

    // Discrete circular button tokens
    expect(html).toContain('w-9 h-9 rounded-full');
    expect(html).toContain('MARKETPLACE');
  }, 30000);
});

describe('PolyMartHome SuperApp Modernization', () => {
  it('exports PolyMartHome function component cleanly', async () => {
    const { PolyMartHome } = await import('@/pages/polymart/PolyMartHome');
    expect(PolyMartHome).toBeDefined();
    expect(typeof PolyMartHome).toBe('function');
  });

  it('contains no raw emojis 🛍️ or 🛒 and utilizes vector fallbacks in PolyMartHome', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../pages/polymart/PolyMartHome.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Ensure raw emojis are eliminated
    expect(source).not.toContain('🛍️');
    expect(source).not.toContain('🛒');
    expect(source).not.toContain('🏪');

    // Ensure obsidian-amber banner tokens
    expect(source).toContain('max-h-[180px]');
    expect(source).toContain('Pasar Mahasiswa POLISAS');
    expect(source).toContain('CATEGORY_ICON_MAP');
    expect(source).toContain('FallbackIcon');
    expect(source).toContain('ShoppingBag');
    expect(source).toContain('PackageSearch');
  });
});

describe('PolyMartVendorStorefront Dedicated Merchant Page', () => {
  it('exports PolyMartVendorStorefront function component cleanly', async () => {
    const { PolyMartVendorStorefront } = await import('@/pages/polymart/PolyMartVendorStorefront');
    expect(PolyMartVendorStorefront).toBeDefined();
    expect(typeof PolyMartVendorStorefront).toBe('function');
  });

  it('contains the /polymart/kedai/:id route registered in App.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const appPath = path.resolve(__dirname, '../App.tsx');
    const source = fs.readFileSync(appPath, 'utf-8');

    expect(source).toContain('/polymart/kedai/:id');
    expect(source).toContain('PolyMartVendorStorefront');
  });

  it('contains navigation to vendor storefront in PolyMartHome.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const homePath = path.resolve(__dirname, '../pages/polymart/PolyMartHome.tsx');
    const source = fs.readFileSync(homePath, 'utf-8');

    expect(source).toContain('/polymart/kedai/');
  });

  it('contains Smart Preset Ambient Mesh tokens and 0 raw emojis in PolyMartVendorStorefront.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const storefrontPath = path.resolve(__dirname, '../pages/polymart/PolyMartVendorStorefront.tsx');
    const source = fs.readFileSync(storefrontPath, 'utf-8');

    // Smart Preset Ambient Mesh tokens
    expect(source).toContain('from-amber-950 via-slate-900 to-stone-950');
    expect(source).toContain('bg-amber-500/15 blur-3xl');

    // Verified badge token
    expect(source).toContain('Peniaga Siswa Sah POLISAS');

    // Zero raw emojis
    expect(source).not.toContain('🛍️');
    expect(source).not.toContain('🏪');
    expect(source).not.toContain('🛒');
    expect(source).not.toContain('⭐');
    expect(source).not.toContain('📦');
  });
});

describe('PolyMartProductDetail & BottomNav Suppression Revamp', () => {
  it('exports PolyMartProductDetail and ProductVariationBottomSheet cleanly', async () => {
    const { PolyMartProductDetail, ProductVariationBottomSheet } = await import('@/pages/polymart/PolyMartProductDetail');
    expect(PolyMartProductDetail).toBeDefined();
    expect(typeof PolyMartProductDetail).toBe('function');
    expect(ProductVariationBottomSheet).toBeDefined();
    expect(typeof ProductVariationBottomSheet).toBe('function');
  });

  it('suppresses BottomNav on /polymart/produk/ in PolyMartLayout.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const layoutPath = path.resolve(__dirname, '../pages/polymart/PolyMartLayout.tsx');
    const source = fs.readFileSync(layoutPath, 'utf-8');

    expect(source).toContain("location.pathname.includes('/polymart/produk/')");
  });

  it('contains sticky bottom action dock with fixed bottom-0 and twin CTAs in PolyMartProductDetail.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const detailPath = path.resolve(__dirname, '../pages/polymart/PolyMartProductDetail.tsx');
    const source = fs.readFileSync(detailPath, 'utf-8');

    // Sticky bottom dock tokens
    expect(source).toContain('fixed bottom-0');
    expect(source).toContain('+ Troli');
    expect(source).toContain('Beli Sekarang');
    expect(source).toContain('pb-28');
  });

  it('contains slide-up variation bottom sheet with spring animations', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const detailPath = path.resolve(__dirname, '../pages/polymart/PolyMartProductDetail.tsx');
    const source = fs.readFileSync(detailPath, 'utf-8');

    // Slide-up bottom sheet tokens
    expect(source).toContain("y: '100%'");
    expect(source).toContain('y: 0');
    expect(source).toContain('ProductVariationBottomSheet');
  });

  it('contains 0 raw emojis in PolyMartProductDetail.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const detailPath = path.resolve(__dirname, '../pages/polymart/PolyMartProductDetail.tsx');
    const source = fs.readFileSync(detailPath, 'utf-8');

    // Purged raw emojis
    expect(source).not.toContain('🛒');
    expect(source).not.toContain('🛍️');
    expect(source).not.toContain('⚠️');
    expect(source).not.toContain('✅');
    expect(source).not.toContain('📦');
    expect(source).not.toContain('⚡');
    expect(source).not.toContain('😔');
  });
});

describe('Task 1 Pembaikan PolyMart Bugfixes & SuperApp Modernization', () => {
  it('exports ActiveVendorsSheet and integrates it into PolyMartHome.tsx cleanly', async () => {
    const { ActiveVendorsSheet } = await import('@/pages/polymart/PolyMartHome');
    expect(ActiveVendorsSheet).toBeDefined();
    expect(typeof ActiveVendorsSheet).toBe('function');

    const fs = await import('fs');
    const path = await import('path');
    const homePath = path.resolve(__dirname, '../pages/polymart/PolyMartHome.tsx');
    const source = fs.readFileSync(homePath, 'utf-8');

    // Slide-up ActiveVendorsSheet tokens and connection
    expect(source).toContain('ActiveVendorsSheet');
    expect(source).toContain('setShowAllVendors(true)');
    expect(source).toContain("y: '100%'");
    expect(source).toContain('y: 0');
    expect(source).toContain('Peniaga Siswa Sah POLISAS');
    expect(source).toContain('Lawati Kedai');
    expect(source).toContain('<option value="popular">Paling Laris</option>');
    expect(source).toContain("case 'popular':");
  });

  it('renders ActiveVendorsSheet when open with vendor list and search input', async () => {
    const { ActiveVendorsSheet } = await import('@/pages/polymart/PolyMartHome');
    const { MemoryRouter } = await import('react-router-dom');
    const { renderToString } = await import('react-dom/server');

    const mockBusinesses = [
      {
        id: 'biz-1',
        name: 'Kafe Siswa POLISAS',
        logo_url: null,
        product_count: 5,
        avg_rating: 4.8,
        review_count: 12,
      },
    ];

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ActiveVendorsSheet, {
          isOpen: true,
          onClose: () => {},
          businesses: mockBusinesses,
        })
      )
    );

    expect(html).toContain('Semua Peniaga Siswa');
    expect(html).toContain('Kafe Siswa POLISAS');
    expect(html).toContain('Peniaga Siswa Sah POLISAS');
    expect(html).toContain('5 produk');
    expect(html).toContain('Lawati Kedai');
    expect(html).toContain('Cari peniaga atau jenama...');
  });

  it('verifies mobile search capsule min-w-0 and responsive circular buttons in PolyMartLayout.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const layoutPath = path.resolve(__dirname, '../pages/polymart/PolyMartLayout.tsx');
    const source = fs.readFileSync(layoutPath, 'utf-8');

    // Mobile search button capsule min-w-0
    expect(source).toContain('flex sm:hidden flex-1 min-w-0 items-center gap-2.5 h-10 px-3 rounded-full');

    // Responsive store button classes eliminating overflow on <380px mobile screens
    expect(source).toContain('w-9 h-9 sm:w-auto sm:px-3.5 sm:h-9 rounded-full');
    expect(source).toContain('hidden sm:inline');
    expect(source).toContain('absolute -top-1 -right-1 sm:static');
  });

  it('queries polymart_orders and calculates sales_count in PolyMartVendorStorefront.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const storefrontPath = path.resolve(__dirname, '../pages/polymart/PolyMartVendorStorefront.tsx');
    const source = fs.readFileSync(storefrontPath, 'utf-8');

    // Query polymart_orders with completed/confirmed statuses
    expect(source).toContain("from('polymart_orders')");
    expect(source).toContain("'COMPLETED', 'CONFIRMED', 'READY'");
    expect(source).toContain('salesMap');
    expect(source).toContain('sales_count');

    // Popular tab sorts primarily by sales_count descending
    expect(source).toContain("activeTab === 'popular'");
    expect(source).toContain('salesB - salesA');

    // Micro-badge with TrendingUp icon for sold counts
    expect(source).toContain('TrendingUp');
    expect(source).toContain('terjual');
  });

  it('verifies PolyMartFeed sorts hot products by sales and orders count', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const feedPath = path.resolve(__dirname, '../components/portal/PolyMartFeed.tsx');
    const source = fs.readFileSync(feedPath, 'utf-8');

    // Queries polymart_orders
    expect(source).toContain("from('polymart_orders')");
    expect(source).toContain('salesMap');
    expect(source).toContain('salesB - salesA');
  });

  it('renders ProductVariationBottomSheet with active sale without ReferenceError', async () => {
    const { ProductVariationBottomSheet } = await import('@/pages/polymart/PolyMartProductDetail');
    const { MemoryRouter } = await import('react-router-dom');
    const { renderToString } = await import('react-dom/server');

    const mockProduct: any = {
      id: 'prod-test-sale',
      name: 'Nasi Ambeng Special',
      price: 12.0,
      sale_price: 10.0,
      sale_start_at: new Date(Date.now() - 3600000).toISOString(),
      sale_end_at: new Date(Date.now() + 3600000).toISOString(),
      stock_quantity: 10,
      reserved_stock: 0,
      category: 'Makanan',
      image_url: null,
      variations: [],
      keusahawanan_businesses: {
        id: 'biz-1',
        name: 'Dapur Mak Teh',
        online_payment_enabled: true,
        cod_enabled: true,
      },
    };

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ProductVariationBottomSheet, {
          product: mockProduct,
          isOpen: true,
          mode: 'BUY',
          onClose: () => {},
        })
      )
    );

    expect(html).toContain('Nasi Ambeng Special');
    expect(html).toContain('10.00');
    expect(html).toContain('12.00');
  });
});



