// ── exportXlsx.ts ─────────────────────────────────────────────────────────────
// Utiliti generik untuk export data ke fail XLSX menggunakan ExcelJS.
// Guna dynamic import supaya chunk ExcelJS kekal lazy (tidak membebankan bundle utama).
//
// Kelebihan berbanding CSV:
//   - Sel format boleh ditetapkan sebagai TEXT (elak No. IC/matrik jadi scientific
//     notation atau buang leading zero).
//   - Boleh embed gambar terus dalam sheet (untuk multimedia/backdrop).
//   - Boleh ada berbilang sheet, header berwarna, lebar kolum, autoFilter.

import { saveAs } from 'file-saver';

export interface XlsxColumn {
  header: string;
  /** Lebar kolum (default 18). */
  width?: number;
  /** Paksa semua nilai kolum ini sebagai teks (elak scientific notation). */
  asText?: boolean;
}

export interface XlsxSheetConfig {
  name: string;
  columns: XlsxColumn[];
  /** Data rows — setiap row adalah array nilai mengikut susunan columns. */
  rows: (string | number | null | undefined)[][];
  /** Warna header (ARGB tanpa #, cth 'FF0D9488'). Default biru gelap. */
  headerColor?: string;
  /** Wajibkan baris pertama (header) dibekukan + autoFilter. Default true. */
  freezeHeader?: boolean;
}

/** Kolum yang nilainya biasa berupa nombor panjang (IC, matrik, telefon) — set text. */
const LONG_NUMERIC_HEADERS = new Set(['ic', 'no ic', 'no. ic', 'nombor ic', 'matrik', 'no matrik', 'no. matrik', 'no matriks', 'no. matriks', 'telefon', 'no telefon', 'no. telefon', 'phone', 'no. phone', 'no pendaftaran', 'no. pendaftaran']);

export interface XlsxImageCell {
  row: number;        // 0-indexed (row 0 = baris pertama selepas header)
  col: number;        // 0-indexed
  /** URL atau base64 data URL gambar. */
  src: string;
  /** Lebar imej dalam px (default 80). */
  width?: number;
  /** Tinggi imej dalam px (default 80). */
  height?: number;
}

/**
 * Jana & muat turun fail XLSX dengan satu atau lebih sheet.
 */
export async function exportXlsx(
  filename: string,
  sheets: XlsxSheetConfig[],
  images?: XlsxImageCell[]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'JPP POLISAS';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    const headerColor = sheet.headerColor || 'FF1E293B';

    // Header row
    const headerRow = ws.addRow(sheet.columns.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    headerRow.height = 22;

    // Column widths
    sheet.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width || 18;
    });

    // Data rows
    sheet.rows.forEach((row, rIdx) => {
      const r = ws.addRow(row.map((v) => (v === null || v === undefined ? '' : v)));
      // Zebra striping
      if (rIdx % 2 === 0) {
        r.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
    });

    // Paksa kolum sensitif sebagai teks (IC, matrik, telefon) supaya tak jadi
    // scientific notation / buang leading zero.
    sheet.columns.forEach((c, i) => {
      const headerKey = c.header.toLowerCase().trim();
      const isLongNumeric = c.asText || LONG_NUMERIC_HEADERS.has(headerKey);
      if (isLongNumeric) {
        const col = ws.getColumn(i + 1);
        col.eachCell((cell, rowNumber) => {
          if (rowNumber > 1 && cell.value !== null && cell.value !== undefined && cell.value !== '') {
            cell.numFmt = '@'; // TEXT format
            cell.value = String(cell.value);
          }
        });
      }
    });

    // Freeze header + autoFilter
    if (sheet.freezeHeader !== false) {
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const lastCol = String.fromCharCode(64 + Math.min(sheet.columns.length, 26));
      ws.autoFilter = { from: 'A1', to: `${lastCol}1` };
    }
  }

  // Embed images (jika ada) — letak dalam sheet pertama
  if (images && images.length > 0) {
    const ws = wb.worksheets[0];
    for (const img of images) {
      try {
        const res = await fetch(img.src);
        if (!res.ok) continue;
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const id = wb.addImage({ buffer: buf as any, extension: img.src.includes('png') ? 'png' : 'jpeg' });
        ws.addImage(id, {
          tl: { col: img.col, row: img.row + 1 }, // +1 kerana header di row 1
          ext: { width: img.width || 80, height: img.height || 80 },
        });
      } catch {
        // abaikan imej yang gagal dimuat turun
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
