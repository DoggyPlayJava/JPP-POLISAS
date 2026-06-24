import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Grant localStorage mock auth, mock display-mode: standalone to prevent PWA prompt, and disable system tour
  await context.addInitScript(() => {
    window.localStorage.setItem('use_mock_auth', 'true');
    window.localStorage.setItem('POLYMART_LAYOUT', 'true');
    
    // Mock matchMedia to return matches: true for display-mode: standalone
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) => {
      if (query.includes('display-mode: standalone')) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        } as any;
      }
      return originalMatchMedia(query);
    };

    // Also mock navigator.standalone for iOS
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true
    });
  });
});

test('PolyMart Vendor Dashboard inline verification', async ({ page }) => {
  // Intercept system announcements network call and return empty to prevent announcement modal from overlaying the UI
  await page.route('**/rest/v1/system_announcements*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Navigate directly to the vendor page
  await page.goto('/polymart/vendor');

  // Verify that the page loads the dashboard (allow up to 15s for mock auth context safety timeout to resolve)
  await expect(page.locator('text=Tindakan Diperlukan')).toBeVisible({ timeout: 15000 });

  // Locate the specific order card for order ID "7ab2d97c-fbd5-4c04-b992-4fce05d975b4" (#7AB2D97C)
  const orderCard = page.locator('div.rounded-\\[2rem\\]').filter({ has: page.locator('button:text("#7AB2D97C")') });
  await expect(orderCard).toBeVisible();

  // Wait for the inline panel within this specific card to render
  const panelText = orderCard.locator('p:has-text("Semak Resit Pembayaran")');
  await expect(panelText).toBeVisible();

  // Locate verification, rejection, and thumbnail inside this card
  const verifyBtn = orderCard.locator('button:has-text("Sahkan")');
  const rejectBtn = orderCard.locator('button:has-text("Tolak")');
  const thumbnail = orderCard.locator('img[alt="Resit"]');

  // Verify all elements exist and are visible
  await expect(verifyBtn).toBeVisible();
  await expect(rejectBtn).toBeVisible();
  await expect(thumbnail).toBeVisible();

  // Clicking the thumbnail should trigger the receipt modal zoom
  await thumbnail.click();
  const receiptModal = page.locator('h3:has-text("Resit Pembayaran QR")').first();
  await expect(receiptModal).toBeVisible();

  // Close the modal by clicking the header X button
  const closeModalBtn = page.locator('h3:has-text("Resit Pembayaran QR")').locator('..').locator('button');
  await closeModalBtn.click();
  await expect(receiptModal).not.toBeVisible();

  // Now perform inline verification by clicking Sahkan
  await verifyBtn.click();

  // Verify the specific order card's verify button is no longer visible
  await expect(verifyBtn).not.toBeVisible();
});
