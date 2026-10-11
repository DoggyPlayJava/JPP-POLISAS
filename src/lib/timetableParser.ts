import type { ClassType, StudentTimetableEntry, ImapsRoomMapping } from '@/types';
import { ensurePdfPolyfills } from '@/lib/polyfills';

// Ensure polyfills are active for PDF.js execution (ReadableStream, Promise.withResolvers)
ensurePdfPolyfills();

async function getPdfLib() {
  ensurePdfPolyfills();
  if (typeof window === 'undefined') {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  const lib = await import('pdfjs-dist');
  if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return lib;
}

/**
 * Resilient PDF loader supporting iOS WebKit, Safari, and worker fallback.
 * Uses a cloned slice so the original ArrayBuffer is never transferred or detached.
 */
export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  ensurePdfPolyfills();
  const pdfjsLib = await getPdfLib();

  // Create isolated copy to protect original buffer against detachment across multiple parses
  const data = new Uint8Array(arrayBuffer.slice(0));

  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const tryLoad = async (useWorker: boolean) => {
    const opts: any = { data: new Uint8Array(data.buffer.slice(0)) };
    if (!useWorker) {
      opts.disableWorker = true;
    }
    const loadingTask = pdfjsLib.getDocument(opts);
    return await loadingTask.promise;
  };

  if (isIOS) {
    try {
      return await tryLoad(false);
    } catch {
      return await tryLoad(true);
    }
  }

  try {
    return await tryLoad(true);
  } catch (err) {
    console.warn('[timetable-parser] Worker failed, retrying without worker:', err);
    return await tryLoad(false);
  }
}

// Palette for distinct course color assignment
export const COURSE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export function parseCourseCodeAndType(raw: string): { courseCode: string; classType: ClassType } {
  const match = raw.match(/^([A-Z0-9]+)\s*\((L|P|TU|O)\)/i);
  if (!match) return { courseCode: raw.trim(), classType: 'LAIN_LAIN' };
  
  const typeMap: Record<string, ClassType> = {
    L: 'KULIAH',
    P: 'AMALI',
    TU: 'TUTORIAL',
    O: 'LAIN_LAIN',
  };
  return {
    courseCode: match[1].toUpperCase(),
    classType: typeMap[match[2].toUpperCase()] || 'LAIN_LAIN',
  };
}

export function mergeConsecutiveSlots<T extends {
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_code: string;
  class_type: ClassType;
  room_raw: string;
}>(slots: T[]): T[] {
  if (slots.length <= 1) return slots;

  const sorted = [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.start_time.localeCompare(b.start_time);
  });

  const merged: T[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const canMerge =
      current.day_of_week === next.day_of_week &&
      current.end_time === next.start_time &&
      current.course_code === next.course_code &&
      current.class_type === next.class_type &&
      current.room_raw === next.room_raw;

    if (canMerge) {
      current.end_time = next.end_time;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

export async function scanPdfClasses(arrayBuffer: ArrayBuffer): Promise<{ pageIndex: number; className: string }[]> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const classesFound: { pageIndex: number; className: string }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const fullText = (content?.items || [])
      .filter((it: any) => it && typeof it.str === 'string')
      .map((it: any) => it.str)
      .join(' ');
    const match = fullText.match(/KELAS\s*:\s*([A-Za-z0-9_-]+)/i);
    if (match) {
      classesFound.push({ pageIndex: pageNum, className: match[1].trim() });
    }
  }

  return classesFound;
}

// ── parseTimetablePage: coordinate grid extractor (JKE template) ─────────────

export interface PdfTextItem {
  str: string;
  x: number;    // device-space X
  y: number;    // device-space Y
  width: number;
  height: number;
}

export const DAY_NAMES = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT'];

export function toTextItems(content: any): PdfTextItem[] {
  return content.items
    .filter((it: any) => typeof it.str === 'string' && it.str.trim().length > 0)
    .map((it: any) => ({
      str: it.str.trim(),
      x: it.transform ? it.transform[4] : (it.x ?? 0),
      y: it.transform ? it.transform[5] : (it.y ?? 0),
      width: it.width ?? 0,
      height: it.height ?? 0,
    }));
}

// Cluster text items into horizontal bands (rows) by Y proximity.
export function clusterRowsByY(items: PdfTextItem[], tolerance = 5): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  let cur: PdfTextItem[] = [];
  let anchorY: number | null = null;
  for (const it of sorted) {
    if (anchorY === null || Math.abs(it.y - anchorY) <= tolerance) {
      cur.push(it);
      if (anchorY === null) anchorY = it.y;
    } else {
      rows.push(cur);
      cur = [it];
      anchorY = it.y;
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
}

export function rowText(row: PdfTextItem[]): string {
  return row
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((it) => it.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTimetableFromItems(
  items: PdfTextItem[],
  roomMappings: ImapsRoomMapping[] = []
): {
  metadata: { session: string; effectiveDate: string; className: string; department: string };
  entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
} {
  const rows = clusterRowsByY(items);

  // Header metadata via full-text regex (format-independent).
  const fullText = items
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((it) => it.str)
    .join(' ');
  const metadata = {
    className: fullText.match(/KELAS\s*:\s*([A-Za-z0-9_-]+)/i)?.[1]?.trim() ?? '',
    session: fullText.match(/SESI\s*:\s*([A-Za-z0-9_/: -]+?)(?=\s+(?:TARIKH|KELAS|JABATAN|ISNIN|\d{1,2}:)|$)/i)?.[1]?.trim()
      ?? fullText.match(/SESI\s*:\s*([A-Za-z0-9_/]+)/i)?.[1]?.trim()
      ?? '',
    effectiveDate: fullText.match(/TARIKH\s*KUATKUASA\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i)?.[1]?.trim() ?? '',
    department: fullText.match(/JABATAN\s*:\s*([A-Za-z ]+?)(?=\s+(?:TARIKH|KELAS|SESI|ISNIN|\d{1,2}:)|$)/i)?.[1]?.trim()
      ?? fullText.match(/JABATAN\s*:\s*([A-Za-z ]+)/i)?.[1]?.trim()
      ?? '',
  };

  // Time-column X anchors ("08:00".."16:00").
  const timeColX = new Map<string, number>();
  for (const row of rows) {
    for (const it of row) {
      const m = it.str.match(/^(\d{1,2}):(\d{2})$/);
      if (m) timeColX.set(`${String(+m[1]).padStart(2, '0')}:${m[2]}`, it.x);
    }
  }
  const times = [...timeColX.keys()].sort();

  // Day-row Y anchors from day-name cells.
  const dayRowY = new Map<string, number>();
  for (const row of rows) {
    const upper = rowText(row).toUpperCase();
    for (const day of DAY_NAMES) {
      if (upper.includes(day) && !dayRowY.has(day)) {
        dayRowY.set(day, Math.min(...row.map((it) => it.y)));
      }
    }
  }

  const orderedDays = DAY_NAMES.filter((d) => dayRowY.has(d));
  const timeXs = times.map((t) => timeColX.get(t)!).sort((a, b) => a - b);
  const halfGap = timeXs.length > 1 ? (timeXs[1] - timeXs[0]) / 2 : 30;

  // Track colors for course codes to ensure unique colors across courses
  const courseColorMap = new Map<string, string>();
  let paletteIndex = 0;
  const getCourseColor = (code: string): string => {
    if (!courseColorMap.has(code)) {
      courseColorMap.set(code, COURSE_PALETTE[paletteIndex % COURSE_PALETTE.length]);
      paletteIndex++;
    }
    return courseColorMap.get(code)!;
  };

  const dayYEntries = orderedDays
    .map((day) => ({ day, y: dayRowY.get(day)! }))
    .sort((a, b) => b.y - a.y); // top to bottom (higher Y to lower Y in PDF)

  const entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[] = [];
  for (let di = 0; di < dayYEntries.length; di++) {
    const { day, y: curY } = dayYEntries[di];
    const nextY = dayYEntries[di + 1]?.y ?? (curY - 60);
    const yTop = Math.max(curY, nextY) + 15;
    const yBottom = dayYEntries[di + 1] ? (curY + nextY) / 2 : (nextY - 5);
    for (let ti = 0; ti < times.length; ti++) {
      const x0 = timeXs[ti] - halfGap;
      const x1 = timeXs[ti] + halfGap;
      const cell = items
        .filter((it) => it.y >= yBottom && it.y <= yTop && it.x >= x0 && it.x < x1)
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const cellText = cell.map((it) => it.str).join(' ').trim();
      if (!cellText) continue;

      const parsed = parseCell(cellText, roomMappings);
      if (!parsed.course_code) continue;

      entries.push({
        academic_session: metadata.session,
        semester: '',
        class_name: metadata.className,
        day_of_week: DAY_NAMES.indexOf(day) + 1,
        start_time: `${times[ti]}:00`,
        end_time: `${times[ti + 1] ?? '17:00'}:00`,
        course_code: parsed.course_code,
        course_name: parsed.course_code, // legend match or manual edit fills this
        class_type: parsed.class_type,
        lecturer_code: parsed.lecturer_code,
        room_raw: parsed.room_raw,
        location_id: parsed.location_id,
        is_online: parsed.is_online,
        color: getCourseColor(parsed.course_code),
        is_archived: false,
      });
    }
  }

  return { metadata, entries: mergeConsecutiveSlots(entries) };
}

export async function parseTimetablePage(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  roomMappings: ImapsRoomMapping[] = []
): Promise<{
  metadata: { session: string; effectiveDate: string; className: string; department: string };
  entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
}> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const page = await pdf.getPage(pageIndex);
  const content = await page.getTextContent();
  const items = toTextItems(content);
  return extractTimetableFromItems(items, roomMappings);
}

export function parseCell(cellText: string, roomMappings: ImapsRoomMapping[] = []) {
  const codeType = cellText.match(/^([A-Z0-9]+)\s*\((L|P|TU|O)\)/i);
  const { courseCode, classType } = codeType
    ? parseCourseCodeAndType(codeType[0])
    : { courseCode: '', classType: 'LAIN_LAIN' as ClassType };

  const rest = cellText.replace(/^[A-Z0-9]+\s*\((L|P|TU|O)\)/i, '').trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  const room = tokens[tokens.length - 1] ?? '';
  const lecturer = tokens.length > 1 ? tokens.slice(0, -1).join(',') : '';

  const mapping = room
    ? roomMappings.find((m) => {
        try {
          return new RegExp(m.room_code_pattern, 'i').test(room) || m.room_code_pattern.toLowerCase() === room.toLowerCase();
        } catch {
          return m.room_code_pattern.toLowerCase() === room.toLowerCase();
        }
      })
    : undefined;

  return {
    course_code: courseCode,
    class_type: classType,
    lecturer_code: lecturer,
    room_raw: room,
    location_id: mapping?.location_id ?? null,
    is_online: mapping?.is_online ?? false,
  };
}
