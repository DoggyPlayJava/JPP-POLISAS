import type { CanonicalFloor } from '../types';

const DEFAULT_FLOOR: CanonicalFloor = {
  floor_level: 1,
  floor_label: '1',
  floor_order: 1,
};

function clampFloorOrder(value: number): number {
  return Math.max(-10, Math.min(99, Math.trunc(value)));
}

function orderToLabel(order: number): string {
  if (order === 0) return 'G';
  if (order < 0) return `B${Math.abs(order)}`;
  return String(order);
}

/**
 * Single canonical floor parser shared by PolyMaps, 360° Studio, Bulk Import,
 * Missing Reports, and Admin.
 *
 * Maps Ground Floor ('G', 'Ground', 'Aras Bawah', '0', 0) <-> { floor_level: 0, floor_label: 'G', floor_order: 0 }
 * so INTEGER DB columns never receive non-numeric strings like 'G'.
 */
export function parseFloorLevel(
  raw: unknown,
  fallback: CanonicalFloor = DEFAULT_FLOOR,
): CanonicalFloor {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ...fallback };
    const order = clampFloorOrder(raw);
    return {
      floor_level: order,
      floor_label: orderToLabel(order),
      floor_order: order,
    };
  }

  if (typeof raw !== 'string') {
    return { ...fallback };
  }

  let clean = raw.trim().toUpperCase();
  if (!clean) {
    return { ...fallback };
  }

  // Strip common Malay / English prefixes ("Aras 3", "Tingkat 2", "Level 1", "T4", "TG")
  clean = clean.replace(/^(ARAS|TINGKAT|FLOOR|LEVEL)\s+/i, '').trim();
  clean = clean.replace(/^T(?=[0-9G])/i, '').trim();

  if (
    clean === 'G' ||
    clean === 'GF' ||
    clean === 'GROUND' ||
    clean === 'GROUND FLOOR' ||
    clean === 'BAWAH' ||
    clean === 'ARAS BAWAH' ||
    /^0+$/.test(clean)
  ) {
    return { floor_level: 0, floor_label: 'G', floor_order: 0 };
  }

  if (clean === 'LG' || clean === 'LOWER GROUND') {
    return { floor_level: -1, floor_label: 'B1', floor_order: -1 };
  }

  const basementMatch = clean.match(/^B(\d+)$/);
  if (basementMatch) {
    const order = clampFloorOrder(-Number.parseInt(basementMatch[1], 10));
    return {
      floor_level: order,
      floor_label: orderToLabel(order),
      floor_order: order,
    };
  }

  if (/^-?\d+$/.test(clean)) {
    const order = clampFloorOrder(Number.parseInt(clean, 10));
    return {
      floor_level: order,
      floor_label: orderToLabel(order),
      floor_order: order,
    };
  }

  return { ...fallback };
}

/**
 * Produces DB-safe floor columns (`floor_level` INTEGER + `floor_label` TEXT + `floor_order` SMALLINT).
 */
export function toDbFloorFields(
  raw: unknown,
  fallback: CanonicalFloor = DEFAULT_FLOOR,
): CanonicalFloor {
  return parseFloorLevel(raw, fallback);
}

/**
 * Compact badge label (e.g. 'G', 'T2', 'B1').
 */
export function formatFloorShort(raw: unknown): string {
  const parsed = parseFloorLevel(raw);
  if (parsed.floor_order === 0) return 'G';
  if (parsed.floor_order < 0) return parsed.floor_label;
  return `T${parsed.floor_order}`;
}

/**
 * Localized descriptive floor label (e.g. 'Aras Bawah (G)' / 'Ground Floor (G)').
 */
export function formatFloorLong(raw: unknown, lang: 'ms' | 'en' = 'ms'): string {
  const parsed = parseFloorLevel(raw);
  if (parsed.floor_order === 0) {
    return lang === 'en' ? 'Ground Floor (G)' : 'Aras Bawah (G)';
  }
  if (parsed.floor_order < 0) {
    return lang === 'en' ? `Basement ${parsed.floor_label}` : `Aras ${parsed.floor_label}`;
  }
  return lang === 'en' ? `Level ${parsed.floor_order}` : `Aras ${parsed.floor_order}`;
}

/**
 * Comparator for sorting floors vertically (B2 < B1 < G < 1 < 2 < 10).
 */
export function compareFloorOrder(a: unknown, b: unknown): number {
  return parseFloorLevel(a).floor_order - parseFloorLevel(b).floor_order;
}
