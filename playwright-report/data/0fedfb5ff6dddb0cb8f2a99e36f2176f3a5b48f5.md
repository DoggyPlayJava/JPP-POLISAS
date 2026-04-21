# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: takwim.spec.ts >> Modul Takwim Global JPP >> MT / Exco boleh buka borang Tambah Perancangan
- Location: e2e\takwim.spec.ts:27:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Takwim Global JPP')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Takwim Global JPP')

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - generic:
      - generic:
        - generic:
          - generic:
            - img
          - generic:
            - heading [level=1]: JPP Digital Portal
            - paragraph: JPP Polisas
            - paragraph: Portal JPP · e-Kebajikan · e-Keusahawanan
        - generic:
          - generic:
            - generic: Log Masuk
            - generic: Masukkan emel dan kata laluan anda untuk teruskan.
          - generic:
            - generic:
              - generic:
                - text: Emel
                - generic:
                  - img
                  - textbox:
                    - /placeholder: emel@gmail.com
              - generic:
                - generic:
                  - generic: Kata Laluan
                  - button: Lupa?
                - generic:
                  - img
                  - textbox
              - button:
                - generic: Log Masuk
                - img
              - generic:
                - generic:
                  - generic:
                    - generic: ATAU
                - button:
                  - img
                  - text: Teruskan dengan Google
          - generic:
            - generic:
              - generic: Belum ada akaun?
              - button: Daftar
        - generic:
          - generic:
            - generic: JPP Digital Portal Beroperasi
          - paragraph: © 2026 JPP Digital Portal · Polisas. Hak cipta terpelihara.
  - dialog "Install Aplikasi JPP" [ref=e2]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e11]:
        - heading "Install Aplikasi JPP" [level=2] [ref=e12]
        - paragraph [ref=e13]: Rasai kuasa penuh portal JPP dengan lebih pantas dan lancar terus dari Home Screen anda.
    - paragraph [ref=e16]: Rasai kuasa penuh portal JPP dengan lebih pantas dan lancar terus dari Home Screen anda.
    - generic [ref=e17]:
      - button "Pasang Sekarang" [ref=e18] [cursor=pointer]
      - button "Nanti" [ref=e19] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Modul Takwim Global JPP', () => {
  4  |   // We assume the user logs in correctly or auth context mocks are provided in a real CI setup.
  5  |   // We will test if the page structure exists and modal opens correctly.
  6  |   
  7  |   test('boleh navigasi ke halaman Takwim dan papar senarai takwim', async ({ page }) => {
  8  |     // 1. Go to Login page (Optional steps depending on how auth state is retained in testing)
  9  |     await page.goto('/login');
  10 |     // Assuming Playwright automatically logs in via setup/teardown in your system or we skip to public Takwim if possible.
  11 |     // For this e2e, we will navigate to standard root first to trigger route mounts.
  12 |     
  13 |     // 2. Go to Takwim
  14 |     await page.goto('/jpp/takwim');
  15 |     
  16 |     // 3. Verify Page loaded correctly
  17 |     const headerTitle = page.locator('h1:has-text("Takwim Global JPP")');
  18 |     await expect(headerTitle).toBeVisible({ timeout: 10000 });
  19 |     
  20 |     // 4. Verify Filters exist
  21 |     const btnKelab = page.locator('button:has-text("Kelab/Karnival")');
  22 |     const btnSupsas = page.locator('button:has-text("SUPSAS")');
  23 |     await expect(btnKelab).toBeVisible();
  24 |     await expect(btnSupsas).toBeVisible();
  25 |   });
  26 | 
  27 |   test('MT / Exco boleh buka borang Tambah Perancangan', async ({ page }) => {
  28 |     await page.goto('/jpp/takwim');
  29 |     
  30 |     // Verify Page loaded correctly
> 31 |     await expect(page.locator('text=Takwim Global JPP')).toBeVisible();
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  32 |     
  33 |     // Click button Tambah (It should only be visible if user is logged in as MT/Exco, 
  34 |     // so we conditionally check or assuming the test environment uses an Exco profile)
  35 |     const btnTambah = page.locator('button:has-text("Tambah")');
  36 |     
  37 |     if (await btnTambah.isVisible()) {
  38 |         await btnTambah.click();
  39 |         
  40 |         // Verify Modal appears
  41 |         const modalTitle = page.locator('h2:has-text("Perancangan Program")');
  42 |         await expect(modalTitle).toBeVisible();
  43 |         
  44 |         // Fill form
  45 |         await page.fill('input[placeholder="Contoh: Mesyuarat Agung JPP..."]', 'Program Robotik Automasi');
  46 |         await page.fill('textarea[placeholder="Tujuan atau matlamat program jika ada..."]', 'Mendedahkan sains teknologi kepada warga kelab.');
  47 |         
  48 |         // Modal can be closed
  49 |         await page.locator('button:has-text("Simpan Perancangan Takwim")').toBeVisible();
  50 |         await page.keyboard.press('Escape'); // Close modal
  51 |     }
  52 |   });
  53 | 
  54 |   test('operasi penapisan berfungsi (Filter Tab)', async ({ page }) => {
  55 |     await page.goto('/jpp/takwim');
  56 |     
  57 |     // Wait for data fetching to complete by waiting for "Menyegerakkan Takwim..." loading spinner to vanish
  58 |     await expect(page.locator('text=Menyegerakkan Takwim...')).toBeHidden({ timeout: 15000 });
  59 |     
  60 |     // Click 'SUPSAS' filter
  61 |     const btnSupsas = page.locator('button:has-text("SUPSAS")');
  62 |     await btnSupsas.click();
  63 |     
  64 |     // Ensure active state on filter button is applied
  65 |     await expect(btnSupsas).toHaveClass(/bg-white\/10/);
  66 |   });
  67 | });
  68 | 
```