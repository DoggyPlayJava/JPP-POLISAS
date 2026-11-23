import { describe, it, expect, vi } from 'vitest';

// Bypass global mock in src/tests/setup.ts so we test REAL PDF byte generation
vi.unmock('@react-pdf/renderer');

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {
  buildBusinessCertificateData,
  computeDocumentRef,
  computeIntegrityDigest,
  deriveEntityStructure,
  formatMalayDate,
  formatMalayDateTime,
  generateCertificateQrDataUrl,
  resolveRegistrationNumber,
  resolveRegistrationType,
  sanitizePdfFilename,
} from '@/lib/businessCertificate';
import { BusinessRegistrationCertPDF } from '@/components/keusahawanan/BusinessRegistrationCertPDF';
import '@/lib/polyfills';

const ROOT_DIR = process.cwd();
const POLISAS_LOGO_BUF = fs.readFileSync(path.join(ROOT_DIR, 'public/polisas-logo.jpg'));
const JPP_LANDSCAPE_BUF = fs.readFileSync(
  path.join(ROOT_DIR, 'src/assets/Logo-JPP-Laporan.jpeg')
);
const JPP_CREST_BUF = fs.readFileSync(path.join(ROOT_DIR, 'public/jpp-logo.png'));

async function extractPdfTextAndPageCount(buffer: Buffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(pageText);
  }
  await doc.destroy();
  return {
    numPages: pages.length,
    pages,
    fullText: pages.join('\n'),
  };
}

describe('Business Registration Certificate Engine & PDF Audit', () => {
  it('resolves SSM, PUSKEP, and EMS registration types and formats helpers deterministically', () => {
    expect(
      resolveRegistrationType({ registration_type: 'SSM', ssm_registration_number: '202403198765' })
    ).toBe('SSM');
    expect(
      resolveRegistrationType({ registration_type: null, ssm_registration_number: 'P-2026-014' })
    ).toBe('PUSKEP');
    expect(
      resolveRegistrationType({
        registration_type: 'EMS',
        puskep_upgrade_status: 'APPROVED',
        ssm_registration_number: 'P-2026-099',
      })
    ).toBe('PUSKEP');
    expect(
      resolveRegistrationType({
        registration_type: 'EMS',
        is_ems_siswapreneur: true,
        ssm_registration_number: 'EMS-2026-48219',
      })
    ).toBe('EMS');

    expect(
      resolveRegistrationNumber({
        ssm_registration_number: '  P-2026-014  ',
        registration_no: 'OLD-123',
      })
    ).toBe('P-2026-014');

    expect(computeDocumentRef('a1b2c3d4-5555-6666-7777-888899990000', 'PUSKEP', '2026-03-15T00:00:00Z')).toBe(
      'POLISAS-PUSKEP-2026-A1B2C3'
    );

    const d1 = computeIntegrityDigest({
      businessId: 'biz-1',
      registrationType: 'PUSKEP',
      registrationNumber: 'P-2026-014',
      businessName: 'Kopi Semambu',
      ownerName: 'Ahmad',
      status: 'ACTIVE',
    });
    const d2 = computeIntegrityDigest({
      businessId: 'biz-1',
      registrationType: 'PUSKEP',
      registrationNumber: 'P-2026-014',
      businessName: 'Kopi Semambu',
      ownerName: 'Ahmad',
      status: 'ACTIVE',
    });
    expect(d1).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(d1).toBe(d2);

    expect(deriveEntityStructure(1).labelMs).toBe('PEMILIKAN TUNGGAL (SISWA)');
    expect(deriveEntityStructure(4).labelMs).toBe('PERKONGSIAN SISWA (4 AHLI)');

    expect(formatMalayDate('2026-11-23T08:00:00Z')).toBe('23 NOVEMBER 2026');
    expect(formatMalayDateTime('2026-11-23T07:46:00Z')).toBe('23 NOVEMBER 2026, 15:46 MYT');
    expect(sanitizePdfFilename('Kopi & Teh Semambu!', '202403198765 (003612345-K)')).toBe(
      'Sijil_Pendaftaran_202403198765_003612345-K_Kopi_Teh_Semambu.pdf'
    );
  });

  it('Scenario 1: Active PUSKEP Sole Proprietorship generates valid 2-page PDF + scannable QR', async () => {
    const data = buildBusinessCertificateData({
      business: {
        id: '11111111-aaaa-bbbb-cccc-000000000001',
        name: 'Kopi Kampus Semambu Enterprise',
        description: 'Menyediakan minuman kopi artisan dan makanan ringan kepada warga POLISAS.',
        status: 'ACTIVE',
        is_active: true,
        registration_type: 'PUSKEP',
        ssm_registration_number: 'P-2026-014',
        created_at: '2026-03-10T02:00:00Z',
        polymart_is_active: true,
        business_phone: '019-8765432',
        category: { name: 'Makanan & Minuman' },
        mentors: [{ name: 'Pn. Norazila Binti Hassan', department: 'Jabatan Perdagangan' }],
        owner_id: 'owner-1',
        owner: {
          id: 'owner-1',
          full_name: 'Muhammad Amirul Hafiz Bin Razak',
          matric_no: '02DDT24F1001',
          jabatan: 'JTMK',
          programme_code: 'DDT',
        },
      },
      members: [],
      approvedAt: '2026-03-12T04:30:00Z',
      generatedAt: '2026-11-23T08:00:00Z',
      generatedBy: 'Muhammad Amirul Hafiz Bin Razak',
      origin: 'https://jpp.cipher-node.org',
    });

    const qrDataUrl = await generateCertificateQrDataUrl(data.verificationUrl);
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrPngBuffer = Buffer.from(qrBase64, 'base64');

    // Decode QR via sharp + jsqr to verify scannability
    const { data: rawPixels, info } = await sharp(qrPngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decodedQr = jsQR(
      new Uint8ClampedArray(rawPixels),
      info.width,
      info.height
    );
    expect(decodedQr).not.toBeNull();
    expect(decodedQr?.data).toBe(
      'https://jpp.cipher-node.org/keusahawanan/sijil/P-2026-014'
    );

    const pdfBuf = await renderToBuffer(
      React.createElement(BusinessRegistrationCertPDF, {
        data,
        qrDataUrl,
        polisasLogoSrc: POLISAS_LOGO_BUF,
        jppLandscapeLogoSrc: JPP_LANDSCAPE_BUF,
        jppCrestSrc: JPP_CREST_BUF,
      })
    );

    expect(pdfBuf.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    const parsed = await extractPdfTextAndPageCount(pdfBuf);
    expect(parsed.numPages).toBe(2);
    expect(parsed.pages[0]).toContain('PERAKUAN PENDAFTARAN PERNIAGAAN');
    expect(parsed.pages[0]).toContain('P-2026-014');
    expect(parsed.pages[0]).toContain('KOPI KAMPUS SEMAMBU ENTERPRISE');
    expect(parsed.pages[0]).toContain('MUHAMMAD AMIRUL HAFIZ BIN RAZAK');
    expect(parsed.pages[0]).toContain('02DDT24F1001');
    expect(parsed.pages[0]).toContain('PEMILIKAN TUNGGAL (SISWA)');
    expect(parsed.pages[0]).toContain('AKTIF & DISAHKAN');
    expect(parsed.pages[0]).toContain(data.documentRef);
    expect(parsed.pages[0]).toContain(data.integrityHash);
    expect(parsed.pages[0]).toContain('POLITEKNIK SULTAN HAJI AHMAD SHAH');

    expect(parsed.pages[1]).toContain('MAKLUMAT PERNIAGAAN & PEMILIK TERKINI');
    expect(parsed.pages[1]).toContain('PN. NORAZILA BINTI HASSAN');
    expect(parsed.pages[1]).toContain(data.verificationUrl);

    expect(parsed.fullText).not.toMatch(/\b(undefined|null|NaN)\b/);
    expect(parsed.fullText).not.toContain('[object Object]');
  });

  it('Scenario 2: Active SSM Partnership includes history, 4 members, and 3 mentors cleanly on 2 pages', async () => {
    const data = buildBusinessCertificateData({
      business: {
        id: '22222222-bbbb-cccc-dddd-000000000002',
        name: 'Kuantan Tech & Print Studio',
        description: 'Perkhidmatan percetakan, reka bentuk grafik serta penyelenggaraan komputer pelajar.',
        status: 'ACTIVE',
        is_active: true,
        registration_type: 'SSM',
        ssm_registration_number: '202403198765 (003612345-K)',
        registration_history: [
          { type: 'PUSKEP', number: 'P-2025-008', changed_at: '2025-09-01T00:00:00Z' },
        ],
        created_at: '2025-06-01T00:00:00Z',
        polymart_is_active: false,
        category: { name: 'Perkhidmatan & Percetakan' },
        mentors: [
          { name: 'Dr. Ahmad Faisal Bin Yusof', department: 'JTMK' },
          { name: 'En. Zulkifli Bin Omar', department: 'JKE' },
          { name: 'Pn. Siti Mariam Binti Ali', department: 'JP' },
        ],
        owner_id: 'owner-2',
        owner: {
          id: 'owner-2',
          full_name: 'Nurul Izzah Binti Mohd Noor',
          matric_no: '02DDT23F2010',
          jabatan: 'JTMK',
          programme_code: 'DDT',
        },
      },
      members: [
        {
          id: 'm1',
          user_id: 'owner-2',
          role: 'OWNER',
          status: 'ACTIVE',
          joined_at: '2025-06-01T00:00:00Z',
          user: {
            id: 'owner-2',
            full_name: 'Nurul Izzah Binti Mohd Noor',
            matric_no: '02DDT23F2010',
            jabatan: 'JTMK',
            programme_code: 'DDT',
          },
        },
        {
          id: 'm2',
          user_id: 'mem-2',
          role: 'MEMBER',
          status: 'ACTIVE',
          joined_at: '2025-06-05T00:00:00Z',
          user: {
            id: 'mem-2',
            full_name: 'Farid Hakimi Bin Ismail',
            matric_no: '02DKA23F1045',
            jabatan: 'JKA',
          },
        },
        {
          id: 'm3',
          user_id: 'mem-3',
          role: 'MEMBER',
          status: 'ACTIVE',
          joined_at: '2025-06-10T00:00:00Z',
          user: {
            id: 'mem-3',
            full_name: 'Aisyah Humaira Binti Zahari',
            matric_no: '02DPM24F1012',
            jabatan: 'JP',
          },
        },
        {
          id: 'm4',
          user_id: 'mem-4',
          role: 'MEMBER',
          status: 'ACTIVE',
          joined_at: '2025-06-15T00:00:00Z',
          user: {
            id: 'mem-4',
            full_name: 'Daniel Tan Wei Ming',
            matric_no: '02DEE24F1088',
            jabatan: 'JKE',
          },
        },
      ],
      approvedAt: '2025-06-03T08:00:00Z',
      generatedAt: '2026-11-23T08:00:00Z',
      generatedBy: 'Nurul Izzah Binti Mohd Noor',
      origin: 'https://jpp.cipher-node.org',
    });

    const qrDataUrl = await generateCertificateQrDataUrl(data.verificationUrl);
    const pdfBuf = await renderToBuffer(
      React.createElement(BusinessRegistrationCertPDF, {
        data,
        qrDataUrl,
        polisasLogoSrc: POLISAS_LOGO_BUF,
        jppLandscapeLogoSrc: JPP_LANDSCAPE_BUF,
        jppCrestSrc: JPP_CREST_BUF,
      })
    );

    const parsed = await extractPdfTextAndPageCount(pdfBuf);
    expect(parsed.numPages).toBe(2);
    expect(parsed.pages[0]).toContain('BERDAFTAR SSM');
    expect(parsed.pages[0]).toContain('202403198765 (003612345-K)');
    expect(parsed.pages[0]).toContain('PERKONGSIAN SISWA (4 AHLI)');
    expect(parsed.pages[0]).toContain('P-2025-008');

    expect(parsed.pages[1]).toContain('REKOD PENDAFTARAN TERDAHULU');
    expect(parsed.pages[1]).toContain('DANIEL TAN WEI MING');
    expect(parsed.pages[1]).toContain('DR. AHMAD FAISAL BIN YUSOF');
    expect(parsed.fullText).not.toMatch(/\b(undefined|null|NaN)\b/);
  });

  it('Scenario 3: Active EMS Siswapreneur renders temporary EMS badge and code', async () => {
    const data = buildBusinessCertificateData({
      business: {
        id: '33333333-cccc-dddd-eeee-000000000003',
        name: 'Siswa Waffle Bytes',
        description: 'Gerai jualan wafel dan minuman sempena Karnival Keusahawanan POLISAS.',
        status: 'ACTIVE',
        is_active: true,
        registration_type: 'EMS',
        ssm_registration_number: 'EMS-2026-48219',
        is_ems_siswapreneur: true,
        puskep_upgrade_status: 'NONE',
        created_at: '2026-08-08T01:00:00Z',
        category: { name: 'Makanan & Minuman' },
        owner_id: 'owner-3',
        owner: { id: 'owner-3', full_name: 'Siti Nurhaliza Binti Karim', matric_no: '02DPM24F2001' },
      },
      generatedAt: '2026-11-23T08:00:00Z',
      origin: 'https://jpp.cipher-node.org',
    });

    const qrDataUrl = await generateCertificateQrDataUrl(data.verificationUrl);
    const pdfBuf = await renderToBuffer(
      React.createElement(BusinessRegistrationCertPDF, {
        data,
        qrDataUrl,
        polisasLogoSrc: POLISAS_LOGO_BUF,
        jppLandscapeLogoSrc: JPP_LANDSCAPE_BUF,
      })
    );

    const parsed = await extractPdfTextAndPageCount(pdfBuf);
    expect(parsed.numPages).toBe(2);
    expect(parsed.pages[0]).toContain('EMS-2026-48219');
    expect(parsed.pages[0]).toContain('SEMENTARA (EMS SISWAPRENEUR)');
    expect(parsed.fullText).not.toMatch(/\b(undefined|null|NaN)\b/);
  });

  it('Scenario 4: PENDING_INTERVIEW business displays DRAF watermark', async () => {
    const data = buildBusinessCertificateData({
      business: {
        id: '44444444-dddd-eeee-ffff-000000000004',
        name: 'Draf Perniagaan Baharu',
        description: 'Dalam semakan temuduga.',
        status: 'PENDING_INTERVIEW',
        is_active: true,
        registration_type: 'PUSKEP',
        ssm_registration_number: 'P-2026-077',
        created_at: '2026-11-20T01:00:00Z',
        owner_id: 'owner-4',
        owner: { id: 'owner-4', full_name: 'Ahmad Zaki Bin Musa' },
      },
      generatedAt: '2026-11-23T08:00:00Z',
      origin: 'https://jpp.cipher-node.org',
    });

    const qrDataUrl = await generateCertificateQrDataUrl(data.verificationUrl);
    const pdfBuf = await renderToBuffer(
      React.createElement(BusinessRegistrationCertPDF, { data, qrDataUrl })
    );

    const parsed = await extractPdfTextAndPageCount(pdfBuf);
    expect(parsed.numPages).toBe(2);
    expect(parsed.pages[0]).toContain('DRAF SEMAKAN');
    expect(parsed.pages[0]).toContain('MENUNGGU TEMUDUGA / KELULUSAN');
    expect(parsed.fullText).not.toMatch(/\b(undefined|null|NaN)\b/);
  });

  it('Scenario 5: Extreme stress test (72-char name, 5 mentors, 9 members, 450-char description)', async () => {
    const longName =
      'Konsortium Inovasi Kejuruteraan Makanan Dan Teknologi Digital Pelajar POL';
    expect(longName.length).toBeGreaterThanOrEqual(70);

    const longDesc =
      'Perniagaan ini mengendalikan perkhidmatan pembangunan aplikasi digital, percetakan bahan akademik berteknologi tinggi, katering acara rasmi kolej kediaman serta pembekalan kelengkapan keusahawanan kepada seluruh komuniti Politeknik Sultan Haji Ahmad Shah termasuk sokongan penghantaran kampus secara berjadual pada setiap minggu akademik dan program keusahawanan peringkat kebangsaan yang dianjurkan bersama pihak industri serta rakan strategik.';
    expect(longDesc.length).toBeGreaterThan(400);

    const extraMembers = Array.from({ length: 8 }, (_, idx) => ({
      id: `stress-m-${idx + 2}`,
      user_id: `stress-u-${idx + 2}`,
      role: 'MEMBER' as const,
      status: 'ACTIVE' as const,
      joined_at: `2026-04-0${idx + 1}T00:00:00Z`,
      user: {
        id: `stress-u-${idx + 2}`,
        full_name: `Ahli Pasukan Keusahawanan Nombor ${idx + 2}`,
        matric_no: `02DDT24F10${10 + idx}`,
        jabatan: 'JTMK',
      },
    }));

    const mentors = Array.from({ length: 5 }, (_, idx) => ({
      name: `Pensyarah Mentor Penasihat ${idx + 1}`,
      department: `Jabatan Akademik ${idx + 1}`,
    }));

    const data = buildBusinessCertificateData({
      business: {
        id: '55555555-eeee-ffff-aaaa-000000000005',
        name: longName,
        description: longDesc,
        status: 'ACTIVE',
        is_active: true,
        registration_type: 'PUSKEP',
        ssm_registration_number: 'P-2026-255',
        created_at: '2026-04-01T00:00:00Z',
        mentors,
        owner_id: 'stress-u-1',
        owner: {
          id: 'stress-u-1',
          full_name: 'Ketua Pengarah Eksekutif Siswa POLISAS',
          matric_no: '02DDT24F1000',
          jabatan: 'JTMK',
        },
      },
      members: extraMembers,
      approvedAt: '2026-04-02T00:00:00Z',
      generatedAt: '2026-11-23T08:00:00Z',
      origin: 'https://jpp.cipher-node.org',
    });

    const qrDataUrl = await generateCertificateQrDataUrl(data.verificationUrl);
    const pdfBuf = await renderToBuffer(
      React.createElement(BusinessRegistrationCertPDF, {
        data,
        qrDataUrl,
        polisasLogoSrc: POLISAS_LOGO_BUF,
        jppLandscapeLogoSrc: JPP_LANDSCAPE_BUF,
        jppCrestSrc: JPP_CREST_BUF,
      })
    );

    const parsed = await extractPdfTextAndPageCount(pdfBuf);
    expect(parsed.numPages).toBeGreaterThanOrEqual(2);
    // Page 1 must NEVER spill over onto a second page before Page 2 starts
    expect(parsed.pages[0]).toContain('PERAKUAN PENDAFTARAN PERNIAGAAN');
    expect(parsed.pages[0]).toContain('P-2026-255');
    expect(parsed.pages[1]).toContain('MAKLUMAT PERNIAGAAN & PEMILIK TERKINI');
    expect(parsed.fullText).toContain('PENSYARAH MENTOR PENASIHAT 5');
    expect(parsed.fullText).toContain('AHLI PASUKAN KEUSAHAWANAN NOMBOR 9');
    expect(parsed.fullText).not.toMatch(/\b(undefined|null|NaN)\b/);
  });
});
