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

  // Time-column X anchors: Map normalized 24-hour time ("08:00".."17:00") to X coordinate
  const timeColMap = new Map<string, number>();
  for (const row of rows) {
    for (const it of row) {
      const normalized = normalizeTimetableTime(it.str);
      if (normalized && !timeColMap.has(normalized)) {
        timeColMap.set(normalized, it.x);
      }
    }
  }

  // Sort time columns strictly by X coordinate (left-to-right across the page).
  // This guarantees physical columns on the PDF grid always match chronological order.
  const timeColumns = Array.from(timeColMap.entries())
    .map(([time, x]) => ({ time, x }))
    .sort((a, b) => a.x - b.x);

  const times = timeColumns.map((c) => c.time);
  const timeXs = timeColumns.map((c) => c.x);
  const halfGap = timeXs.length > 1 ? (timeXs[1] - timeXs[0]) / 2 : 30;

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

      const parsed = parseCell(cellText, roomMappings, locations);
      if (!parsed.course_code) continue;

      const calculateDefaultEndTime = (startTime: string): string => {
        const [h, m] = startTime.split(':').map(Number);
        return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      };

      const startTimeFormatted = `${times[ti]}:00`;
      const endTimeFormatted = times[ti + 1] ? `${times[ti + 1]}:00` : calculateDefaultEndTime(times[ti]);

      entries.push({
        academic_session: metadata.session,
        semester: '',
        class_name: metadata.className,
        day_of_week: DAY_NAMES.indexOf(day) + 1,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
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
    clean === 'EMSTEAM' ||
    clean === 'AMSTEAM' ||
    clean === 'ONLINE' ||
    clean === 'TEAMS' ||
    clean === 'MSTEAMS' ||
    clean === 'MICROSOFTTEAMS' ||
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
  cellText: string,
  mappingsOrLocations: (ImapsRoomMapping | RoomLocationLookup)[] = [],
  locationsParam: RoomLocationLookup[] = []
) {
  const codeType = cellText.match(/^([A-Z0-9]+)\s*\((L|P|TU|O)\)/i);
  const { courseCode, classType } = codeType
    ? parseCourseCodeAndType(codeType[0])
    : { courseCode: '', classType: 'LAIN_LAIN' as ClassType };

  // Normalize slashes with adjacent tokens e.g. "EA301 / EA302" -> "EA301/EA302"
  const rest = cellText
    .replace(/^[A-Z0-9]+\s*\((L|P|TU|O)\)/i, '')
    .replace(/\s*\/\s*/g, '/')
    .trim();

  const tokens = rest.split(/\s+/).filter(Boolean);

  // Distinguish roomMappings vs locations if passed flexibly
  let roomMappings: ImapsRoomMapping[] = [];
  let locations: RoomLocationLookup[] = [...locationsParam];

  for (const item of mappingsOrLocations) {
    if ('room_code_pattern' in item) {
      roomMappings.push(item as ImapsRoomMapping);
    } else if ('room_code' in item) {
      locations.push(item as RoomLocationLookup);
    }
  }

  // Priority Rule:
  // If EMSTEAM or AMSTEAM coincides with a physical classroom token in the cell,
  // PRIORITIZE the physical classroom first!
  // Example: "AI EA301 EMSTEAM" or "NUR AMSTEAM EA303" or "AI EA301/EA302"
  let chosenRoom = '';
  let lecturerTokens: string[] = [];

  const isRoomCandidate = (t: string) => {
    if (isOnlineKeyword(t)) return false;
    // Check if matches location lookup directly
    const res = matchRoomToLocation(t, locations, roomMappings);
    if (res.location_id) return true;
    // Room code with digits (e.g. EA301, EA301/EA302, B101, F107, MK1, DK2)
    return (
      /^[A-Za-z]{0,4}\d{2,4}[A-Za-z]?(?:\/[A-Za-z]{0,4}\d{2,4}[A-Za-z]?)?$/i.test(t) ||
      /^(DEWAN|MAKMAL|BENGKEL|KULIAH)/i.test(t)
    );
  };

  const physicalIndex = tokens.findIndex(isRoomCandidate);

  if (physicalIndex !== -1) {
    // Physical room found: prioritize it!
    chosenRoom = tokens[physicalIndex];
    // Remaining non-online tokens form the lecturer code
    lecturerTokens = tokens.filter((_, idx) => idx !== physicalIndex && !isOnlineKeyword(tokens[idx]));
  } else {
    // No physical room found. Check if an online keyword is present
    const onlineIndex = tokens.findIndex(isOnlineKeyword);
    if (onlineIndex !== -1) {
      chosenRoom = tokens[onlineIndex];
      lecturerTokens = tokens.filter((_, idx) => idx !== onlineIndex);
    } else {
      // Fallback to classic last token
      chosenRoom = tokens[tokens.length - 1] ?? '';
      lecturerTokens = tokens.length > 1 ? tokens.slice(0, -1) : [];
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
    is_online: matched.is_online,
  };
}
