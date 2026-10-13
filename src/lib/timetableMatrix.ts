/**
 * Timetable Matrix Coordinate & Grid Engine
 * 
 * Provides coordinate mapping for the POLISAS 5-day x 9-hour class schedule matrix.
 * Standard hours: 08:00 to 17:00 (9 hourly column buckets).
 * Official break: 13:00 to 14:00 (Rehat & Solat).
 */

export const MATRIX_START_HOUR = 8;
export const MATRIX_END_HOUR = 17;
export const REHAT_START_HOUR = 13;
export const REHAT_END_HOUR = 14;

export interface MatrixTimeSlot {
  index: number;
  startHour: number;
  endHour: number;
  label: string;
  shortLabel: string;
  isBreak: boolean;
}

export const MATRIX_TIME_SLOTS: MatrixTimeSlot[] = Array.from(
  { length: MATRIX_END_HOUR - MATRIX_START_HOUR },
  (_, i) => {
    const startHour = MATRIX_START_HOUR + i;
    const endHour = startHour + 1;
    const isBreak = startHour === REHAT_START_HOUR;

    const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

    return {
      index: i,
      startHour,
      endHour,
      label: `${formatHour(startHour)} - ${formatHour(endHour)}`,
      shortLabel: `${startHour}:00`,
      isBreak,
    };
  }
);

export interface GridSpan {
  colStart: number; // 1-indexed for CSS Grid
  colSpan: number;
}

/**
 * Parses a time string (e.g. "08:00:00", "08:00", "8:30") into decimal hours.
 */
export function parseTimeToDecimalHour(timeStr: string): number {
  if (!timeStr) return MATRIX_START_HOUR;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
  return hours + minutes / 60;
}

/**
 * Calculates 1-indexed CSS Grid column start and span based on start and end time.
 * Clamps coordinates to valid column ranges within the matrix.
 */
export function getSlotGridSpan(
  startTime: string,
  endTime: string,
  baseStartHour = MATRIX_START_HOUR,
  totalCols = MATRIX_TIME_SLOTS.length
): GridSpan {
  const startDecimal = parseTimeToDecimalHour(startTime);
  const endDecimal = parseTimeToDecimalHour(endTime);

  // Calculate 1-indexed start column
  const rawColStart = Math.floor(startDecimal - baseStartHour) + 1;
  const colStart = Math.max(1, Math.min(totalCols, rawColStart));

  // Calculate span based on duration
  const duration = Math.max(1, Math.ceil(endDecimal - startDecimal));
  const maxPossibleSpan = totalCols - colStart + 1;
  const colSpan = Math.max(1, Math.min(maxPossibleSpan, duration));

  return {
    colStart,
    colSpan,
  };
}

/**
 * Normalizes display time into HH:mm format without trailing seconds.
 */
export function formatMatrixTime(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (clean.length >= 5) return clean.slice(0, 5);
  return clean;
}
