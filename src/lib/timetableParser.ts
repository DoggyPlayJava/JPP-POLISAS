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
  const match = raw.match(/^([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)\s*\((L|P|TU|O)\)/i);
  if (!match) return { courseCode: raw.trim(), classType: 'LAIN_LAIN' };
  
  const typeMap: Record<string, ClassType> = {
    L: 'KULIAH',
    P: 'AMALI',
    TU: 'TUTORIAL',
    O: 'LAIN_LAIN',
  };
  return {
    courseCode: match[1].trim().toUpperCase(),
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

export interface RoomLocationLookup {
  id: string;
  room_code: string;
  search_tags?: string | null;
}

/**
 * Normalizes time string from timetable headers into 24-hour HH:mm format.
 * In Malaysian polytechnic timetables, class hours occur during the daytime (08:00 - 18:00).
 * Headers often use 12-hour labels without AM/PM:
 * - Hours 1..7 represent afternoon/evening (1:00 PM -> 13:00, ..., 5:00 PM -> 17:00).
 * - Hours 8..12 represent morning/noon (8:00 AM -> 08:00, ..., 12:00 PM -> 12:00).
 * - Hours 13..23 are already in 24-hour format and preserved.
 */
export function normalizeTimetableTime(rawTimeStr: string): string | null {
  if (!rawTimeStr) return null;
  const trimmed = rawTimeStr.trim();
  const m = trimmed.match(/^(\d{1,2})[:.](\d{2})(?:\s*-\s*\d{1,2}[:.]\d{2})?$/);
  if (!m) return null;

  let h = parseInt(m[1], 10);
  const min = m[2];

  if (h >= 1 && h <= 7) {
    h += 12;
  }

  return `${String(h).padStart(2, '0')}:${min}`;
}

export function extractTimetableFromItems(
  items: PdfTextItem[],
  roomMappings: ImapsRoomMapping[] = [],
  locations: RoomLocationLookup[] = []
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
  const topDayY = orderedDays.length > 0
    ? Math.max(...orderedDays.map((d) => dayRowY.get(d)!))
    : 500;

  // Header time items (above ISNIN / day band: y > topDayY - 10)
  const headerTimeItems = items
    .filter((it) => it.y > topDayY - 10 && /^\d{1,2}[:.]\d{2}/.test(it.str))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const timeRows: PdfTextItem[][] = [];
  for (const it of headerTimeItems) {
    let r = timeRows.find((row) => Math.abs(row[0].y - it.y) <= 6);
    if (!r) {
      r = [];
      timeRows.push(r);
    }
    r.push(it);
  }
  timeRows.sort((a, b) => b[0].y - a[0].y); // top to bottom (Row 1: start times, Row 2: end times)

  const startRow = (timeRows[0] || []).sort((a, b) => a.x - b.x);
  const endRow = (timeRows[1] || []).sort((a, b) => a.x - b.x);

  const columns: { startTime: string; endTime: string; x0: number; x1: number }[] = [];

  for (let i = 0; i < startRow.length; i++) {
    const sItem = startRow[i];
    const sTime = normalizeTimetableTime(sItem.str);
    if (!sTime) continue;

    const eItem = endRow[i];
    const eTime = eItem
      ? normalizeTimetableTime(eItem.str)
      : (startRow[i + 1] ? normalizeTimetableTime(startRow[i + 1].str) : null);

    const prevX = i > 0 ? startRow[i - 1].x : null;
    const nextX = i < startRow.length - 1 ? startRow[i + 1].x : null;

    const x0 = prevX !== null ? (prevX + sItem.x) / 2 : sItem.x - 30;
    const x1 = nextX !== null
      ? (sItem.x + nextX) / 2
      : (eItem ? eItem.x + 30 : sItem.x + (sItem.x - (prevX ?? (sItem.x - 80))) * 0.9);

    const calculateDefaultEndTime = (startTime: string): string => {
      const [h, m] = startTime.split(':').map(Number);
      return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    columns.push({
      startTime: sTime,
      endTime: eTime || calculateDefaultEndTime(sTime),
      x0,
      x1,
    });
  }

  // Robust fallback: if header detection didn't find time columns (e.g. synthetic single-row tests)
  if (columns.length === 0) {
    const fallbackTimeMap = new Map<string, number>();
    for (const it of items) {
      const norm = normalizeTimetableTime(it.str);
      if (norm && !fallbackTimeMap.has(norm)) {
        fallbackTimeMap.set(norm, it.x);
      }
    }
    const sortedFallback = Array.from(fallbackTimeMap.entries())
      .map(([t, x]) => ({ t, x }))
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < sortedFallback.length; i++) {
      const cur = sortedFallback[i];
      const prevX = i > 0 ? sortedFallback[i - 1].x : null;
      const nextX = i < sortedFallback.length - 1 ? sortedFallback[i + 1].x : null;
      const nextT = i < sortedFallback.length - 1 ? sortedFallback[i + 1].t : null;

      const [h, m] = cur.t.split(':').map(Number);
      const defaultEnd = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      columns.push({
        startTime: cur.t,
        endTime: nextT || defaultEnd,
        x0: prevX !== null ? (prevX + cur.x) / 2 : cur.x - 30,
        x1: nextX !== null ? (cur.x + nextX) / 2 : cur.x + 80,
      });
    }
  }

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

  // Header bottom: just below the lowest header time item, or fallback above day 0
  const headerBottomY = headerTimeItems.length > 0
    ? Math.min(...headerTimeItems.map((it) => it.y)) - 5
    : (dayYEntries[0]?.y ?? 500) + 40;

  // Average row height across detected days
  const avgRowHeight = dayYEntries.length > 1
    ? (dayYEntries[0].y - dayYEntries[dayYEntries.length - 1].y) / (dayYEntries.length - 1)
    : 60;

  const entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[] = [];
  for (let di = 0; di < dayYEntries.length; di++) {
    const { day, y: curY } = dayYEntries[di];

    // Contiguous vertical day bands:
    // yTop: headerBottomY for first day (ISNIN), midpoint with previous day for subsequent days
    const yTop = di === 0
      ? headerBottomY
      : (dayYEntries[di - 1].y + curY) / 2;

    // yBottom: midpoint with next day, or curY - (avgRowHeight * 0.6) for last day
    const yBottom = di < dayYEntries.length - 1
      ? (curY + dayYEntries[di + 1].y) / 2
      : curY - (avgRowHeight * 0.6);

    for (const col of columns) {
      const cell = items
        .filter((it) => it.y >= yBottom && it.y < yTop && it.x >= col.x0 && it.x < col.x1)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      if (cell.length === 0) continue;

      const parsed = parseCell(cell, roomMappings, locations);
      if (!parsed.course_code) continue;

      entries.push({
        academic_session: metadata.session,
        semester: '',
        class_name: metadata.className,
        day_of_week: DAY_NAMES.indexOf(day) + 1,
        start_time: `${col.startTime}:00`,
        end_time: `${col.endTime}:00`,
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
  roomMappings: ImapsRoomMapping[] = [],
  locations: RoomLocationLookup[] = []
): Promise<{
  metadata: { session: string; effectiveDate: string; className: string; department: string };
  entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
}> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const page = await pdf.getPage(pageIndex);
  const content = await page.getTextContent();
  const items = toTextItems(content);
  return extractTimetableFromItems(items, roomMappings, locations);
}

export function isOnlineKeyword(token: string): boolean {
  if (!token) return false;
  const clean = token.replace(/[\s_\/-]+/g, '').toUpperCase();
  return (
    clean.includes('STEAM') ||
    clean.includes('TEAMS') ||
    clean === 'ONLINE' ||
    clean === 'ZOOM' ||
    clean === 'GOOGLEMEET' ||
    clean === 'MEET' ||
    clean === 'DALAMTALIAN'
  );
}

export function matchRoomToLocation(
  roomRaw: string,
  locations: RoomLocationLookup[] = [],
  roomMappings: ImapsRoomMapping[] = []
): { location_id: string | null; is_online: boolean } {
  const trimmed = (roomRaw || '').trim();
  if (!trimmed) {
    return { location_id: null, is_online: false };
  }

  // Handle composite rooms (e.g. "EA301/EA302" or "EA301 / EA302") -> match primary room
  const cleanRoom = trimmed.replace(/\s*[\/,]\s*/g, '/');
  const primaryRoom = cleanRoom.includes('/') ? cleanRoom.split('/')[0].trim() : cleanRoom;

  // 1. Check for online/virtual classes
  if (isOnlineKeyword(primaryRoom)) {
    return { location_id: null, is_online: true };
  }

  const rClean = primaryRoom.toLowerCase();

  // 2. Primary source: match against imaps_locations (room_code + search_tags)
  if (locations && locations.length > 0) {
    // 2a. Exact room_code match
    const exactRoom = locations.find(
      (loc) => loc.room_code && loc.room_code.toLowerCase().trim() === rClean
    );
    if (exactRoom) {
      return { location_id: exactRoom.id, is_online: false };
    }

    // 2b. Match within search_tags (e.g. EA301 has search_tags: "JKE, A301")
    const tagMatch = locations.find((loc) => {
      if (!loc.search_tags) return false;
      const tags = loc.search_tags.toLowerCase();
      const tokens = tags.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
      return tokens.includes(rClean) || tags.includes(rClean);
    });
    if (tagMatch) {
      return { location_id: tagMatch.id, is_online: false };
    }

    // 2c. Substring on room_code (e.g. room_code "EA301" includes "A301")
    const subMatch = locations.find(
      (loc) =>
        loc.room_code &&
        (loc.room_code.toLowerCase().includes(rClean) || rClean.includes(loc.room_code.toLowerCase()))
    );
    if (subMatch) {
      return { location_id: subMatch.id, is_online: false };
    }
  }

  // 3. Fallback: match against imaps_room_mappings (if any rows configured)
  if (roomMappings && roomMappings.length > 0) {
    const mapping = roomMappings.find((m) => {
      try {
        return (
          new RegExp(m.room_code_pattern, 'i').test(primaryRoom) ||
          m.room_code_pattern.toLowerCase() === rClean
        );
      } catch {
        return m.room_code_pattern.toLowerCase() === rClean;
      }
    });
    if (mapping) {
      return {
        location_id: mapping.location_id ?? null,
        is_online: mapping.is_online ?? false,
      };
    }
  }

  // 4. Fallback: prefix-stripping normalizer (e.g. EA301 vs A301, BF107 vs F107)
  if (locations && locations.length > 0) {
    const stripPrefix = (str: string) =>
      str.replace(/^(jke|jkm|jka|jp|jmsk|e|b|m|ka)[\s_-]*/i, '').trim().toLowerCase();
    const rStripped = stripPrefix(rClean);
    if (rStripped.length >= 3) {
      const prefixMatch = locations.find((loc) => {
        if (!loc.room_code) return false;
        return stripPrefix(loc.room_code) === rStripped;
      });
      if (prefixMatch) {
        return { location_id: prefixMatch.id, is_online: false };
      }
    }
  }

  return { location_id: null, is_online: false };
}

export function parseCell(
  cellInput: string | PdfTextItem[],
  mappingsOrLocations: (ImapsRoomMapping | RoomLocationLookup)[] = [],
  locationsParam: RoomLocationLookup[] = []
) {
  const cellItems = Array.isArray(cellInput) ? cellInput : null;
  const cellText = cellItems
    ? cellItems.slice().sort((a, b) => b.y - a.y || a.x - b.x).map((it) => it.str).join(' ').trim()
    : String(cellInput || '').trim();

  const courseRegex = /([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)\s*\((L|P|TU|O)\)/gi;
  const courseMatches = Array.from(cellText.matchAll(courseRegex));

  let courseCode = '';
  let classType: ClassType = 'LAIN_LAIN';

  if (courseMatches.length > 0) {
    courseCode = courseMatches.map((m) => m[1].trim().toUpperCase()).join(' / ');
    const firstParsed = parseCourseCodeAndType(courseMatches[0][0]);
    classType = firstParsed.classType;
  } else {
    const paMatch = cellText.match(/\b(PA|PENASIHAT\s*AKADEMIK)\b/i);
    if (paMatch) {
      courseCode = 'PA';
      classType = 'LAIN_LAIN';
    } else {
      return {
        course_code: '',
        class_type: 'LAIN_LAIN' as ClassType,
        lecturer_code: '',
        room_raw: '',
        location_id: null,
        is_online: false,
      };
    }
  }

  let roomMappings: ImapsRoomMapping[] = [];
  let locations: RoomLocationLookup[] = [...locationsParam];

  for (const item of mappingsOrLocations) {
    if ('room_code_pattern' in item) {
      roomMappings.push(item as ImapsRoomMapping);
    } else if ('room_code' in item) {
      locations.push(item as RoomLocationLookup);
    }
  }

  const cleanToken = (t: string) => t.replace(/^[,\s;/-]+|[,\s;/-]+$/g, '').trim();

  const isRoomCandidate = (t: string) => {
    if (!t || t.length < 2) return false;
    if (isOnlineKeyword(t)) return false;
    const res = matchRoomToLocation(t, locations, roomMappings);
    if (res.location_id) return true;
    return (
      /^[A-Za-z]{0,4}\d{2,4}[A-Za-z]?(?:\/[A-Za-z0-9_-]+)*$/i.test(t) ||
      /^(DEWAN|MAKMAL|BENGKEL|KULIAH|BKA|BKB|MBKA|MBKB|TECC|TECC_JP|CKOKO|JLUKISAN|CPROJEK|CBBATA|CBPAIP|CBKAYU|CMKON|JGEGAS|JMESIN\d*|JKIMPALAN|JAUTO\d*|JFAB|JFOUNDRY|JMET|JCNC|JCAD|MFIZIKAL|MSENSORI|MMMB\d*|MMKM|MMTN|MMPS|MMPN|MMAN|MMLM|PDKJP)/i.test(t)
    );
  };

  let lecturerTokens: string[] = [];
  let roomTokens: string[] = [];

  const isCourseItem = (str: string) => courseRegex.test(str) || /\bPA\b/i.test(str);

  if (cellItems && cellItems.length > 0) {
    const sorted = [...cellItems].sort((a, b) => b.y - a.y || a.x - b.x);
    const levels: PdfTextItem[][] = [];
    for (const it of sorted) {
      let lvl = levels.find((l) => Math.abs(l[0].y - it.y) <= 4);
      if (!lvl) {
        lvl = [];
        levels.push(lvl);
      }
      lvl.push(it);
    }
    levels.sort((a, b) => b[0].y - a[0].y);

    if (levels.length === 1) {
      const rest = cellText.replace(courseRegex, '').replace(/\bPA\b/i, '').trim();
      const tokens = rest.split(/[\s,;]+/).map(cleanToken).filter(Boolean);
      for (const t of tokens) {
        if (isOnlineKeyword(t) || isRoomCandidate(t)) {
          roomTokens.push(t);
        } else {
          lecturerTokens.push(t);
        }
      }
    } else if (levels.length === 2) {
      const l1Tokens = levels[1]
        .flatMap((it) => it.str.split(/[\s,;]+/))
        .map(cleanToken)
        .filter((t) => Boolean(t) && !isCourseItem(t));

      for (const t of l1Tokens) {
        if (isOnlineKeyword(t) || isRoomCandidate(t)) {
          roomTokens.push(t);
        } else {
          lecturerTokens.push(t);
        }
      }
    } else {
      // 3 or more levels:
      // In SPMP layout, the room/online destination is at the bottom level.
      // Top levels are courses, and middle levels are lecturers.
      const bottomLevel = levels[levels.length - 1];
      const middleLevels = levels.slice(1, levels.length - 1);

      roomTokens = bottomLevel
        .flatMap((it) => it.str.split(/[\s,;]+/))
        .map(cleanToken)
        .filter((t) => Boolean(t) && !isCourseItem(t));

      for (const lvl of middleLevels) {
        const lvlTokens = lvl
          .flatMap((it) => it.str.split(/[\s,;]+/))
          .map(cleanToken)
          .filter((t) => Boolean(t) && !isCourseItem(t));

        for (const t of lvlTokens) {
          if (isRoomCandidate(t) || isOnlineKeyword(t)) {
            if (roomTokens.length > 0 && roomTokens.every((rt) => isRoomCandidate(rt) || isOnlineKeyword(rt))) {
              roomTokens.unshift(t);
            } else {
              lecturerTokens.push(t);
            }
          } else {
            lecturerTokens.push(t);
          }
        }
      }
    }
  } else {
    // String-only input (used by unit tests)
    const rest = cellText
      .replace(courseRegex, '')
      .replace(/\bPA\b/i, '')
      .replace(/\s*\/\s*/g, '/')
      .trim();

    const tokens = rest.split(/[\s,;]+/).map(cleanToken).filter(Boolean);

    // Physical room priority
    const physicalIdx = tokens.findIndex((t) => isRoomCandidate(t));
    if (physicalIdx !== -1) {
      roomTokens.push(tokens[physicalIdx]);
      lecturerTokens = tokens.filter((_, idx) => idx !== physicalIdx && !isOnlineKeyword(tokens[idx]));
    } else {
      const onlineIdx = tokens.findIndex((t) => isOnlineKeyword(t));
      if (onlineIdx !== -1) {
        roomTokens.push(tokens[onlineIdx]);
        lecturerTokens = tokens.filter((_, idx) => idx !== onlineIdx);
      } else if (tokens.length > 0) {
        roomTokens.push(tokens[tokens.length - 1]);
        lecturerTokens = tokens.slice(0, -1);
      }
    }
  }

  // Ensure no course codes or PA remain in lecturerTokens
  lecturerTokens = lecturerTokens.filter((t) => !isCourseItem(t));

  // Priority rule:
  // If physical room candidate(s) exist, PRIORITIZE THEM over online keywords!
  const physicalRooms = roomTokens.filter((r) => !isOnlineKeyword(r) && isRoomCandidate(r));
  const onlineRooms = roomTokens.filter((r) => isOnlineKeyword(r));

  let chosenRoom = '';
  let isOnline = false;

  if (physicalRooms.length > 0) {
    chosenRoom = physicalRooms.join('/');
    isOnline = false;
  } else if (onlineRooms.length > 0) {
    chosenRoom = onlineRooms[0];
    isOnline = true;
  } else if (roomTokens.length > 0) {
    const validRooms = roomTokens.filter((r) => r.length >= 2);
    if (validRooms.length > 0) {
      chosenRoom = validRooms[0];
      isOnline = isOnlineKeyword(chosenRoom);
    }
  }

  const lecturer = lecturerTokens.join(',');
  const matched = matchRoomToLocation(chosenRoom, locations, roomMappings);

  return {
    course_code: courseCode,
    class_type: classType,
    lecturer_code: lecturer,
    room_raw: chosenRoom,
    location_id: matched.location_id,
    is_online: isOnline,
  };
}
