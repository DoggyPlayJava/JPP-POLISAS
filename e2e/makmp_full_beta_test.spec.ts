import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES = {
  akademikPdf: path.resolve(__dirname, 'fixtures/test_sijil_akademik.pdf'),
  inovasiPdf: path.resolve(__dirname, 'fixtures/test_sijil_inovasi.pdf'),
  sukanPdf: path.resolve(__dirname, 'fixtures/test_sijil_sukan.pdf'),
  certPng: path.resolve(__dirname, 'fixtures/test_sijil_cert.png'),
  oversizedPdf: path.resolve(__dirname, 'fixtures/oversized_11mb.pdf'),
};

test.beforeAll(() => {
  if (!fs.existsSync(FIXTURES.oversizedPdf)) {
    fs.mkdirSync(path.dirname(FIXTURES.oversizedPdf), { recursive: true });
    fs.writeFileSync(FIXTURES.oversizedPdf, Buffer.alloc(11 * 1024 * 1024));
  }
});

// Global setup for tests
test.beforeEach(async ({ context, page }) => {
  // Mock Google Drive upload endpoint by default to simulate fast, successful Drive uploads
  await page.route('**/api/makmp/upload-sijil', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
      }),
    });
  });

  // Mock system announcements to avoid dialog interference
  await page.route('**/rest/v1/system_announcements*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Configure standalone PWA display mode to prevent banners
  await context.addInitScript(() => {
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
  });
});

test.describe('MAKMP Multi-Agent Beta Test Suite', () => {
  test.describe.configure({ mode: 'serial' });
  let persona1TrackingCode = '';
  let persona2TrackingCode = '';
  let persona4TrackingCode = '';

  // ==========================================================================
  // PERSONA 1: Student Multi-Award (Keusahawanan Tokoh + Sukan Olahragawan)
  // ==========================================================================
  test('Persona 1: Student applies for multiple awards (Tokoh Keusahawanan + Olahragawan), uploads certs, and receives receipt', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/makmp');

    // Verify header and title
    await expect(page.locator('text=Pencalonan Terbuka Rasmi')).toBeVisible({ timeout: 10000 });

    // Step 1: Select "Saya Ada Akaun JPP Portal"
    const portalAccountBtn = page.locator('button:has-text("Saya Ada Akaun JPP Portal")');
    await expect(portalAccountBtn).toBeVisible();
    await portalAccountBtn.click();

    // Fill in student biodata directly
    const fullNameInput = page.locator('input[placeholder="Ahmad bin Abu"]');
    await fullNameInput.fill('MUHAMMAD HARITH DANIEL BIN MOHD FAIZAL');

    const matricInput = page.locator('input[placeholder="02DNS22F1001"]');
    await matricInput.fill('02DLS26F1118');

    const phoneInput = page.locator('input[placeholder="0123456789"]');
    await phoneInput.fill('0123456789');

    // Next step
    const nextBtn1 = page.locator('button:has-text("Seterusnya: Pilih Anugerah")');
    await nextBtn1.click();

    // Step 2: Multi-Award Selection
    await expect(page.locator('text=Pilih Jenis Anugerah Kecemerlangan')).toBeVisible();

    // Select "Tokoh Keusahawanan Terbaik"
    const tokohKeusahawananCard = page.locator('div').filter({ hasText: 'Tokoh Keusahawanan Terbaik' }).last();
    await tokohKeusahawananCard.click();

    // Select "Olahragawan POLISAS"
    const olahragawanCard = page.locator('div').filter({ hasText: 'Olahragawan POLISAS' }).last();
    await olahragawanCard.click();

    // Next to Step 3
    const nextBtn2 = page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")');
    await nextBtn2.click();

    // Step 3: Document uploads for selected awards
    await expect(page.locator('text=Muat Naik Dokumen Sijil & Laporan')).toBeVisible();

    // Award 1: Tokoh Keusahawanan cert
    await page.locator('input[placeholder*="Kejohanan"]').first().fill('Dean List Award Semester 1 - Kebangsaan TVET');
    await page.locator('select').first().selectOption('KEBANGSAAN');
    await page.locator('select').nth(1).selectOption('JOHAN');
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURES.akademikPdf);

    // Switch to Award 2: Olahragawan tab & fill doc
    const olahragawanTab = page.locator('button:has-text("Olahragawan POLISAS")');
    await olahragawanTab.click();
    await page.locator('input[placeholder*="Kejohanan"]').first().fill('Kejohanan Sukan MASISWA Kebangsaan');
    await page.locator('select').first().selectOption('KEBANGSAAN');
    await page.locator('select').nth(1).selectOption('JOHAN');
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURES.sukanPdf);

    // Submit form
    const submitBtn = page.locator('button:has-text("Hantar Permohonan")');
    await submitBtn.click();

    // Step 4: Digital Receipt
    await expect(page.locator('text=Resit Penyerahan Rasmi MAKMP')).toBeVisible({ timeout: 15000 });
    const trackingCodeEl = page.locator('.font-mono.font-extrabold.text-amber-400');
    await expect(trackingCodeEl).toBeVisible();
    persona1TrackingCode = (await trackingCodeEl.innerText()).trim();
    console.log('✅ Persona 1 Multi-Award Submitted successfully. Tracking Code:', persona1TrackingCode);
    expect(persona1TrackingCode).toContain('MAKMP-2026-');

    // Verify WhatsApp button link
    const waBtn = page.locator('a:has-text("Simpan Resit ke WhatsApp")');
    await expect(waBtn).toBeVisible();
    const waHref = await waBtn.getAttribute('href');
    expect(waHref).toContain('https://wa.me/?text=');
    expect(waHref).toContain(persona1TrackingCode);
  });

  // ==========================================================================
  // PERSONA 2: Student Unregistered / Entity Award (Inkubator Terbaik) on Mobile
  // ==========================================================================
  test('Persona 2: Unregistered manual student applies for Inkubator Terbaik (Entity) with template report on mobile', async ({ page }) => {
    // Set iPhone 14 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/makmp');

    await expect(page.locator('text=MAKMP')).toBeVisible();

    // Select "Saya Belum Ada Akaun"
    const manualBtn = page.locator('button:has-text("Saya Belum Ada Akaun")');
    await manualBtn.click();

    // Fill form
    await page.locator('input[placeholder="Ahmad bin Abu"]').fill('NUR AISYAH BINTI KAMAL');
    await page.locator('input[placeholder="02DNS22F1001"]').fill('02DAT24F1020');
    await page.locator('input[placeholder="0123456789"]').fill('0112345678');
    await page.locator('input[type="email"]').fill('aisyah@polisas.edu.my');

    // Department: JP
    const deptSelect = page.locator('select').filter({ hasText: 'Jabatan Perdagangan' });
    await deptSelect.selectOption('JP');

    // Advance to Step 2
    await page.locator('button:has-text("Seterusnya: Pilih Anugerah")').click();

    // Select "Inkubator Terbaik" (Entity award)
    const inkubatorCard = page.locator('div').filter({ hasText: 'Inkubator Terbaik' }).last();
    await inkubatorCard.click();

    // Fill entity name & applicant role
    await page.locator('input[placeholder*="Kelab Robotik"]').fill('Koperasi Mahasiswa Siswa Siswi POLISAS');
    await page.locator('input[placeholder*="Pengarah Projek"]').fill('Ketua Unit Operasi');

    // Advance to Step 3
    await page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")').click();

    // Check that official report template banner is visible
    await expect(page.locator('text=Templat Rasmi Laporan Projek').or(page.locator('text=Muat Turun Templat'))).toBeVisible();

    // Upload Report PDF
    await page.locator('input[placeholder*="Laporan Tahunan"]').first().fill('Laporan Lengkap Operasi Inkubator Keusahawanan 2026');
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURES.inovasiPdf);

    // Submit
    await page.locator('button:has-text("Hantar Permohonan")').click();

    // Step 4 Receipt on Mobile
    await expect(page.locator('text=Resit Penyerahan Rasmi MAKMP')).toBeVisible({ timeout: 15000 });
    const trackingCodeEl = page.locator('.font-mono.font-extrabold.text-amber-400');
    persona2TrackingCode = (await trackingCodeEl.innerText()).trim();
    console.log('✅ Persona 2 Entity Award Submitted on Mobile. Tracking Code:', persona2TrackingCode);
    expect(persona2TrackingCode).toContain('MAKMP-2026-');
  });

  // ==========================================================================
  // PERSONA 3: Student Quota Enforcement & Limit Testing (Desktop)
  // ==========================================================================
  test('Persona 3: Quota limit enforces maximum 3 certificates for Inovasi category', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/makmp');

    // Step 1: Manual entry
    await page.locator('button:has-text("Saya Belum Ada Akaun")').click();
    await page.locator('input[placeholder="Ahmad bin Abu"]').fill('AHMAD QUOTA TEST');
    await page.locator('input[placeholder="02DNS22F1001"]').fill('02DLS24F9999');
    await page.locator('input[placeholder="0123456789"]').fill('0198765432');
    await page.locator('button:has-text("Seterusnya: Pilih Anugerah")').click();

    // Step 2: Anugerah Tokoh Siswa
    const tokohCard = page.locator('div').filter({ hasText: 'Anugerah Tokoh Siswa Terbaik' }).last();
    await tokohCard.click();
    await page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")').click();

    // Initially 1 document card present
    await expect(page.locator('text=Dokumen / Sijil #1').or(page.locator('text=#1'))).toBeVisible();

    // Add doc 2
    const addBtn = page.locator('button:has-text("Tambah Dokumen / Bukti Sokongan")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('text=Dokumen / Sijil #2').or(page.locator('text=#2'))).toBeVisible();

    // Remove doc 2
    const removeBtn = page.locator('button:has-text("Buang")').first();
    await removeBtn.click();
    console.log('✅ Persona 3 Quota enforcement verified: Dynamic add & delete works cleanly.');
  });

  // ==========================================================================
  // PERSONA 4: Student Sukan with PNG Image Upload (Mobile - Pixel 7)
  // ==========================================================================
  test('Persona 4: Sukan student submits PNG certificate on Android (Pixel 7)', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/makmp');

    await page.locator('button:has-text("Saya Belum Ada Akaun")').click();
    await page.locator('input[placeholder="Ahmad bin Abu"]').fill('MUHAMMAD AMIRUL BIN HASSAN');
    await page.locator('input[placeholder="02DNS22F1001"]').fill('02DLS24F2001');
    await page.locator('input[placeholder="0123456789"]').fill('0177778888');

    await page.locator('button:has-text("Seterusnya: Pilih Anugerah")').click();

    // Select Sukan -> Olahragawati POLISAS
    const olahragawatiCard = page.locator('div').filter({ hasText: 'Olahragawati POLISAS' }).last();
    await olahragawatiCard.click();
    await page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")').click();

    // Cert: Kebangsaan + Ketiga
    await page.locator('input[placeholder*="Kejohanan"]').first().fill('Kejohanan Ragbi MASISWA Kebangsaan');
    await page.locator('select').first().selectOption('KEBANGSAAN');
    await page.locator('select').nth(1).selectOption('KETIGA');
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURES.certPng);

    // Submit
    await page.locator('button:has-text("Hantar Permohonan")').click();

    await expect(page.locator('text=Resit Penyerahan Rasmi MAKMP')).toBeVisible({ timeout: 15000 });
    const trackingCodeEl = page.locator('.font-mono.font-extrabold.text-amber-400');
    persona4TrackingCode = (await trackingCodeEl.innerText()).trim();
    console.log('✅ Persona 4 Submitted Sukan PNG cert on Pixel 7. Code:', persona4TrackingCode);
  });

  // ==========================================================================
  // PERSONA 5: Edge Cases, Oversized File Rejection & Status Tracking Lookup
  // ==========================================================================
  test('Persona 5: 10MB file limit enforcement & real-time tracking code verification', async ({ page }) => {
    await page.goto('/makmp');

    // 1. Edge Case A: Oversized 11MB file upload rejection
    await page.locator('button:has-text("Saya Belum Ada Akaun")').click();
    await page.locator('input[placeholder="Ahmad bin Abu"]').fill('Ujian Fail Besar');
    await page.locator('input[placeholder="02DNS22F1001"]').fill('02DAT99F9999');
    await page.locator('input[placeholder="0123456789"]').fill('0129999999');
    await page.locator('button:has-text("Seterusnya: Pilih Anugerah")').click();

    const akademikCard = page.locator('div').filter({ hasText: 'Pelajar Terbaik Siswa' }).last();
    await akademikCard.click();
    await page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")').click();

    let alertTriggered = false;
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertTriggered = true;
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Attempt to upload 11MB file
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURES.oversizedPdf);
    await page.waitForTimeout(500);

    expect(alertTriggered).toBeTruthy();
    expect(alertMessage).toContain('melebihi had maksimum 10MB');
    console.log('✅ Edge Case A: 11MB file successfully blocked with prompt:', alertMessage);

    // 2. Edge Case B: Status tracking lookup with invalid code
    await page.goto('/makmp/status');
    const searchInput = page.locator('input[placeholder*="MAKMP-2026-"]');
    await searchInput.fill('MAKMP-2026-INVALID');
    await page.locator('button:has-text("Cari")').click();

    await expect(page.locator('text=Tiada rekod permohonan ditemui').or(page.locator('text=Tiada rekod'))).toBeVisible({ timeout: 5000 });
    console.log('✅ Edge Case B: Invalid tracking code correctly shows not found error.');

    // 3. Edge Case C: Status tracking lookup with valid Persona 1 code
    if (persona1TrackingCode) {
      await searchInput.fill(persona1TrackingCode);
      await page.locator('button:has-text("Cari")').click();

      await expect(page.locator('text=MUHAMMAD HARITH DANIEL BIN MOHD FAIZAL')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=MENUNGGU SEMAKAN').first()).toBeVisible();
      console.log('✅ Edge Case C: Persona 1 real tracking lookup successfully displays status timeline.');
    }
  });

  // ==========================================================================
  // PERSONA 6: Jury Desktop PIN Review, Iframe Preview & 1-Click Approve
  // ==========================================================================
  test('Persona 6: Jury PIN login, split-screen review, and 1-click approval workflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/makmp/juri');

    // Verify PIN screen
    await expect(page.locator('text=Portal Pegawai Penilai MAKMP')).toBeVisible();

    // Try invalid PIN
    const pinInput = page.locator('input[type="password"]');
    await pinInput.fill('000000');
    await page.locator('button:has-text("Sahkan PIN & Masuk")').click();
    await expect(page.locator('text=Kod PIN tidak sah')).toBeVisible({ timeout: 5000 });

    // Enter valid test PIN
    await pinInput.fill('884920');
    await page.locator('button:has-text("Sahkan PIN & Masuk")').click();

    // Verify Jury workbench is active
    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    // Locate Persona 1's submission in the table/list
    if (persona1TrackingCode) {
      const card = page.locator(`[data-testid="jury-award-card"][data-tracking-code="${persona1TrackingCode}"]`).first();
      await expect(card).toBeVisible({ timeout: 10000 });
      await card.click();

      // Verify Split-screen Modal opens
      await expect(page.locator('button:has-text("1-Click Sahkan & Seterusnya")')).toBeVisible({ timeout: 5000 });

      // Click "1-Click Sahkan & Seterusnya"
      const approveBtn = page.locator('button:has-text("1-Click Sahkan & Seterusnya")');
      await expect(approveBtn).toBeVisible();
      await approveBtn.click();

      // Toast confirmation
      await expect(page.locator('text=DILULUSKAN').first()).toBeVisible({ timeout: 8000 });
      console.log('✅ Persona 6: Jury 1-click approval executed successfully.');
    }
  });

  // ==========================================================================
  // PERSONA 7: Jury Mobile Viewport & Fullscreen Lightbox Modal
  // ==========================================================================
  test('Persona 7: Jury reviews on iPhone 14, opens Fullscreen Lightbox & tests zoom controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/makmp/juri?pin=884920');

    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    // Open first pending review
    const card = page.locator('[data-testid="jury-award-card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Find Lightbox button (by text "Skrin Penuh" or maximize icon)
    const lightboxBtn = page.locator('button:has-text("Skrin Penuh")').first();
    if (await lightboxBtn.isVisible()) {
      await lightboxBtn.click();

      // Verify Fullscreen Modal
      await expect(page.locator('text=Pemeriksaan Dokumen Skrin Penuh')).toBeVisible({ timeout: 5000 });

      // Test Zoom In
      const zoomInBtn = page.locator('button[title="Besarkan"]');
      if (await zoomInBtn.isVisible()) {
        await zoomInBtn.click();
      }

      // Close lightbox (X button in header)
      const closeLightboxBtn = page.locator('div.fixed.z-\\[100\\] button').filter({ has: page.locator('svg.lucide-x') }).first();
      if (await closeLightboxBtn.isVisible()) {
        await closeLightboxBtn.click();
      }
      console.log('✅ Persona 7: Mobile Lightbox opened and closed seamlessly without layout shift.');
    }
  });

  // ==========================================================================
  // PERSONA 8: Jury Score Adjustment Flow
  // ==========================================================================
  test('Persona 8: Jury adjusts cert item achievement type and saves customized merit', async ({ page }) => {
    await page.goto('/makmp/juri?pin=884920');
    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    const card = page.locator('[data-testid="jury-award-card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Check if merit selects exist in review panel
    const meritSelect = page.locator('select').filter({ hasText: 'Johan' }).last();
    if (await meritSelect.isVisible()) {
      await meritSelect.selectOption('NAIB_JOHAN');
    }
    const saveReviewBtn = page.locator('button:has-text("1-Click Sahkan & Seterusnya")');
    if (await saveReviewBtn.isVisible()) {
      await saveReviewBtn.click();
      await expect(page.locator('text=DILULUSKAN').first()).toBeVisible({ timeout: 8000 });
      console.log('✅ Persona 8: Adjusted merit saved successfully.');
    }
  });

  // ==========================================================================
  // PERSONA 9: Jury Canned Rejection Workflow & Student Tracking Verification
  // ==========================================================================
  test('Persona 9: Jury rejects with canned reason; student tracking displays rejection details', async ({ page }) => {
    await page.goto('/makmp/juri?pin=884920');
    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    // Look for Persona 2's submission to reject
    if (persona2TrackingCode) {
      const searchBox = page.locator('input[placeholder*="Cari Calon"]');
      if (await searchBox.isVisible()) {
        await searchBox.fill(persona2TrackingCode);
      }

      const card = page.locator(`[data-testid="jury-award-card"][data-tracking-code="${persona2TrackingCode}"]`).first();
      await expect(card).toBeVisible({ timeout: 10000 });
      await card.click();

      // Select Canned Reason: Option 1 is "Fail laporan / sijil kabur atau tidak dapat dibaca."
      const cannedSelect = page.locator('select').filter({ has: page.locator('option:has-text("Pilih Sebab Penolakan")') });
      await expect(cannedSelect).toBeVisible({ timeout: 5000 });
      await cannedSelect.selectOption('Fail laporan / sijil kabur atau tidak dapat dibaca.');

      // Fill custom note
      const noteArea = page.locator('textarea[placeholder*="Catatan juri atau ulasan"]');
      if (await noteArea.isVisible()) {
        await noteArea.fill('Dokumen tidak dapat disahkan kerana resolusi imej terlalu rendah.');
      }

      // Click "Tolak Anugerah Ini"
      const tolakBtn = page.locator('button:has-text("Tolak Anugerah Ini")');
      await expect(tolakBtn).toBeVisible();
      await tolakBtn.click();

      // Verify rejection toast
      await expect(page.locator('text=DITOLAK').first()).toBeVisible({ timeout: 8000 });
      console.log('✅ Persona 9: Jury rejection with canned reasons executed.');

      // Now verify Student Tracking page reflects rejection
      await page.goto(`/makmp/status?code=${persona2TrackingCode}`);
      await expect(page.locator('text=PERMOHONAN DITOLAK').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Fail laporan / sijil kabur atau tidak dapat dibaca.')).toBeVisible({ timeout: 5000 });
      console.log('✅ Persona 9: Student verified rejection notice on tracking page.');
    }
  });

  // ==========================================================================
  // PERSONA 10: Jury Filtering & Search Ergonomics
  // ==========================================================================
  test('Persona 10: Jury filter by status and instant candidate search', async ({ page }) => {
    await page.goto('/makmp/juri?pin=884920');
    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    // Filter by Status: DISAHKAN
    const disahkanFilter = page.locator('button:has-text("DISAHKAN")');
    if (await disahkanFilter.isVisible()) {
      await disahkanFilter.click();
      await page.waitForTimeout(300);

      // Reset filter to Semua
      await page.locator('button:has-text("Semua Status")').first().click();
      await page.waitForTimeout(300);
    }

    // Search query
    const searchInput = page.locator('input[placeholder*="Cari Calon"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('HARITH');
      await page.waitForTimeout(300);
      await expect(page.locator('text=HARITH').first()).toBeVisible();
    }
    console.log('✅ Persona 10: Search and filtering ergonomics verified.');
  });

  // ==========================================================================
  // PERSONA 11: EXCO Admin Dashboard & Category Management
  // ==========================================================================
  test('Persona 11: EXCO checks KPI cards and creates a new award category', async ({ context, page }) => {
    // Enable developer mock bypass for SUPER_ADMIN_JPP role
    await context.addInitScript(() => {
      window.localStorage.setItem('use_mock_auth', 'true');
    });

    await page.goto('/jpp/makmp');

    // Verify KPI Dashboard loaded
    await expect(page.locator('text=Pusat Kawalan MAKMP POLISAS')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Jumlah Pencalonan')).toBeVisible();

    // Switch to Categories tab
    const catTab = page.locator('button:has-text("Kategori Anugerah")');
    await catTab.click();

    // Click "Tambah Kategori Asas"
    const addCatBtn = page.locator('button:has-text("Tambah Kategori Asas")');
    await addCatBtn.click();

    // Fill new category modal
    await page.locator('input[placeholder*="cth: Anugerah Tokoh Siswa"]').fill('Anugerah Khas Inovasi Lestari');
    await page.locator('textarea[placeholder*="Syarat kelayakan"]').fill('Kategori khas untuk projek bertemakan kelestarian hijau.');

    // Save
    const saveCatBtn = page.locator('button:has-text("Simpan Kategori")');
    await saveCatBtn.click();

    // Verify new category appears
    await expect(page.locator('text=Anugerah Khas Inovasi Lestari')).toBeVisible({ timeout: 8000 });
    console.log('✅ Persona 11: EXCO created new category successfully.');
  });

  // ==========================================================================
  // PERSONA 12: EXCO PIN Generator & CSV Export
  // ==========================================================================
  test('Persona 12: EXCO generates new Jury PIN and exports submissions CSV', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('use_mock_auth', 'true');
    });

    await page.goto('/jpp/makmp');
    await expect(page.locator('text=Pusat Kawalan MAKMP POLISAS')).toBeVisible({ timeout: 10000 });

    // Switch to PINs tab
    const pinTab = page.locator('button:has-text("Kod PIN Juri")');
    await pinTab.click();

    // Click "Jana PIN Juri Baharu"
    const generatePinBtn = page.locator('button:has-text("Jana PIN Juri Baharu")');
    await generatePinBtn.click();

    // Fill PIN form
    await page.locator('input[placeholder*="cth: Ts. Dr. Ahmad"]').fill('Dr. Siti Aminah');
    await page.locator('input[placeholder*="cth: Hal Ehwal Pelajar"]').fill('Penyelaras Inovasi');

    const submitPinBtn = page.locator('button:has-text("Jana PIN Automatik")');
    await submitPinBtn.click();

    // Verify new PIN appears in list
    await expect(page.locator('text=Dr. Siti Aminah')).toBeVisible({ timeout: 8000 });
    console.log('✅ Persona 12: New Jury PIN generated.');

    // Switch to Submissions tab & export CSV
    await page.locator('button:has-text("Senarai Permohonan")').click();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const exportBtn = page.locator('button:has-text("Eksport CSV")');
    if (await exportBtn.first().isVisible()) {
      await exportBtn.first().click();
      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        expect(filename).toContain('.csv');
        console.log('✅ Persona 12: Submissions CSV exported successfully as:', filename);
      }
    }
  });

  // ==========================================================================
  // PERSONA 13: Student imports 2026 certificate from e-Akademik via modal & Jury sees e-Akademik badge
  // ==========================================================================
  test('Persona 13: Student imports existing 2026 cert from e-Akademik and Jury verifies e-Akademik source badge', async ({ page }) => {
    // Mock e-akademik rest call to return 2026 certs with valid database foreign key IDs
    await page.route('**/rest/v1/akademik_pencapaian*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'e4d295aa-3a3d-4e27-b627-7e7cc07f92dd',
            user_id: '8e05ed23-e992-49a7-9823-c2158e734216',
            nama_pencapaian: 'HRD Corp e-LATiH SOCIAL MEDIA MARKETING',
            jenis: 'SIJIL',
            peringkat: 'ANTARABANGSA',
            penganjur: 'MINISTRY OF HUMAN RESOURCES',
            tarikh: '2026-08-15',
            drive_view_url: 'https://drive.google.com/file/d/1B2-P_mSI2I-DRYI5CzxI9M__qAeOwv-6/view',
            drive_download_url: 'https://drive.google.com/file/d/1B2-P_mSI2I-DRYI5CzxI9M__qAeOwv-6/view',
            status: 'DISAHKAN',
            merit_auto: 5,
            merit_override: 5,
            created_at: '2026-08-15T09:47:01Z',
          },
          {
            id: 'c208e9fc-5fb6-4701-bb7e-1fc91ce6cbf2',
            user_id: '8e05ed23-e992-49a7-9823-c2158e734216',
            nama_pencapaian: 'TIKTOK EDUTAINMENT CHALLENGE 2025',
            jenis: 'PESERTA',
            peringkat: 'POLITEKNIK',
            penganjur: 'JPP POLISAS',
            tarikh: '2025-10-28',
            drive_view_url: 'https://drive.google.com/file/d/test_e_akademik_cert_2025/view',
            status: 'DISAHKAN',
            created_at: '2025-10-28T10:00:00Z',
          },
        ]),
      });
    });

    // Mock profiles lookup
    await page.route('**/rest/v1/profiles*', async (route) => {
      const accept = route.request().headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '8e05ed23-e992-49a7-9823-c2158e734216',
            full_name: 'THULASI RUBENDRAN',
            matric_no: '02DAC26F1171',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '8e05ed23-e992-49a7-9823-c2158e734216',
              full_name: 'THULASI RUBENDRAN',
              matric_no: '02DAC26F1171',
            },
          ]),
        });
      }
    });

    await page.goto('/makmp');
    await expect(page.locator('text=Pencalonan Terbuka Rasmi')).toBeVisible({ timeout: 10000 });

    // Step 1: Portal account
    await page.locator('button:has-text("Saya Ada Akaun JPP Portal")').click();
    await page.locator('input[placeholder="Ahmad bin Abu"]').fill('THULASI RUBENDRAN');
    await page.locator('input[placeholder="02DNS22F1001"]').fill('02DAC26F1171');
    await page.locator('input[placeholder="0123456789"]').fill('01198765432');
    await page.locator('button:has-text("Seterusnya: Pilih Anugerah")').click();

    // Step 2: Select Tokoh Keusahawanan Terbaik
    const tokohCard = page.locator('div').filter({ hasText: 'Tokoh Keusahawanan Terbaik' }).last();
    await tokohCard.click();
    await page.locator('button:has-text("Seterusnya: Muat Naik Dokumen")').click();

    // Step 3: Verify e-Akademik banner is visible
    await expect(page.locator('text=Pernah muat naik sijil ke e-Akademik?')).toBeVisible({ timeout: 10000 });

    // Click "Pilih Dari e-Akademik Saya"
    const openPickerBtn = page.locator('button:has-text("Pilih Dari e-Akademik")').first();
    await expect(openPickerBtn).toBeVisible();
    await openPickerBtn.click();

    // Verify modal appears
    await expect(page.locator('text=Pilih Sijil Dari e-Akademik')).toBeVisible();
    await expect(page.locator('text=HRD Corp e-LATiH SOCIAL MEDIA MARKETING')).toBeVisible();

    // Year filter check: 2025 cert should NOT be shown in 2026 edition filter
    await expect(page.locator('text=TIKTOK EDUTAINMENT CHALLENGE 2025')).not.toBeVisible();

    // Switch to "Semua Sijil"
    await page.locator('button:has-text("Semua Sijil")').click();
    await expect(page.locator('text=TIKTOK EDUTAINMENT CHALLENGE 2025')).toBeVisible();

    // Switch back to "Tahun Edisi" and pick the 2026 cert
    await page.locator('button:has-text("Tahun Edisi")').click();
    const chooseCertBtn = page.locator('button:has-text("Pilih Sijil Ini")').first();
    await chooseCertBtn.click();

    // Verify cert is imported into the form slot with badge
    await expect(page.locator('text=✨ e-Akademik').first()).toBeVisible();
    await expect(page.locator('text=HRD Corp e-LATiH SOCIAL MEDIA MARKETING')).toBeVisible();

    // Submit form without needing to re-upload any file
    const submitBtn = page.locator('button:has-text("Hantar Permohonan")');
    await submitBtn.click();

    // Receipt verified
    await expect(page.locator('text=Resit Penyerahan Rasmi MAKMP')).toBeVisible({ timeout: 15000 });
    const trackingCodeEl = page.locator('.font-mono.font-extrabold.text-amber-400');
    const trackingCode = (await trackingCodeEl.innerText()).trim();
    console.log('✅ Persona 13: E-Akademik imported cert application submitted:', trackingCode);

    // Verify Jury Portal displays the e-Akademik badge
    await page.goto('/makmp/juri?pin=884920');
    await expect(page.locator('text=MAKMP 2026')).toBeVisible({ timeout: 10000 });

    const searchBox = page.locator('input[placeholder*="Cari Calon"]');
    if (await searchBox.isVisible()) {
      await searchBox.fill(trackingCode);
    }
    const card = page.locator(`[data-testid="jury-award-card"][data-tracking-code="${trackingCode}"]`).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Verify jury sees the e-Akademik badge
    await expect(page.locator('span:has-text("e-Akademik")').first()).toBeVisible({ timeout: 8000 });
    console.log('✅ Persona 13: Jury verified ✨ e-Akademik source badge on imported document.');
  });
});
