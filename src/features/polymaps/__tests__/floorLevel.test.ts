import { describe, expect, it } from 'vitest';
import {
  parseFloorLevel,
  toDbFloorFields,
  formatFloorShort,
  formatFloorLong,
  compareFloorOrder,
} from '../domain/floorLevel';

describe('floorLevel canonical domain', () => {
  it('maps Ground Floor variants (G, Ground, Aras Bawah, 0) canonically to 0 / G', () => {
    for (const input of ['G', 'g', 'GF', 'Ground', 'Ground Floor', 'Aras Bawah', 'Bawah', '0', '00', 0]) {
      expect(parseFloorLevel(input)).toEqual({
        floor_level: 0,
        floor_label: 'G',
        floor_order: 0,
      });
    }
  });

  it('parses standard positive levels with optional Malay/English prefixes', () => {
    expect(parseFloorLevel('1')).toEqual({ floor_level: 1, floor_label: '1', floor_order: 1 });
    expect(parseFloorLevel('02')).toEqual({ floor_level: 2, floor_label: '2', floor_order: 2 });
    expect(parseFloorLevel(3)).toEqual({ floor_level: 3, floor_label: '3', floor_order: 3 });
    expect(parseFloorLevel('Aras 4')).toEqual({ floor_level: 4, floor_label: '4', floor_order: 4 });
    expect(parseFloorLevel('T5')).toEqual({ floor_level: 5, floor_label: '5', floor_order: 5 });
    expect(parseFloorLevel('Level 2')).toEqual({ floor_level: 2, floor_label: '2', floor_order: 2 });
  });

  it('parses basement levels cleanly (B1 -> -1, LG -> -1)', () => {
    expect(parseFloorLevel('B1')).toEqual({ floor_level: -1, floor_label: 'B1', floor_order: -1 });
    expect(parseFloorLevel('b2')).toEqual({ floor_level: -2, floor_label: 'B2', floor_order: -2 });
    expect(parseFloorLevel('LG')).toEqual({ floor_level: -1, floor_label: 'B1', floor_order: -1 });
    expect(parseFloorLevel(-1)).toEqual({ floor_level: -1, floor_label: 'B1', floor_order: -1 });
  });

  it('falls back deterministically for null, undefined, or garbage values', () => {
    expect(parseFloorLevel(null)).toEqual({ floor_level: 1, floor_label: '1', floor_order: 1 });
    expect(parseFloorLevel('')).toEqual({ floor_level: 1, floor_label: '1', floor_order: 1 });
    expect(parseFloorLevel('unknown', { floor_level: 0, floor_label: 'G', floor_order: 0 })).toEqual({
      floor_level: 0,
      floor_label: 'G',
      floor_order: 0,
    });
  });

  it('builds DB-safe fields so G never sends string G to INTEGER floor_level', () => {
    const dbFields = toDbFloorFields('G');
    expect(typeof dbFields.floor_level).toBe('number');
    expect(Number.isInteger(dbFields.floor_level)).toBe(true);
    expect(dbFields).toEqual({ floor_level: 0, floor_label: 'G', floor_order: 0 });
  });

  it('formats short and localized long labels accurately', () => {
    expect(formatFloorShort(0)).toBe('G');
    expect(formatFloorShort('G')).toBe('G');
    expect(formatFloorShort(2)).toBe('T2');
    expect(formatFloorShort(-1)).toBe('B1');

    expect(formatFloorLong(0, 'ms')).toBe('Aras Bawah (G)');
    expect(formatFloorLong(0, 'en')).toBe('Ground Floor (G)');
    expect(formatFloorLong(3, 'ms')).toBe('Aras 3');
    expect(formatFloorLong(3, 'en')).toBe('Level 3');
    expect(formatFloorLong('B1', 'ms')).toBe('Aras B1');
    expect(formatFloorLong('B1', 'en')).toBe('Basement B1');
  });

  it('sorts floors in physical vertical order (B2 < B1 < G < 1 < 2 < 10)', () => {
    const unsorted = ['10', '2', 'G', 'B1', '1', 'B2'];
    expect([...unsorted].sort(compareFloorOrder)).toEqual(['B2', 'B1', 'G', '1', '2', '10']);
  });
});
