import * as turf from '@turf/turf';
import { POLISAS_COORDS } from '../tokens';

/**
 * 17-waypoint road-snapped walking path extracted from live OpenFreeMap vector
 * tiles inside POLISAS Semambu (`Dataran Siswa` -> `Laluan F Berbumbung` ->
 * `Simpang Akademik` -> `Blok JTMK • Makmal Komputer 3`).
 */
export const CAMPUS_ROUTE_COORDINATES: readonly [number, number][] = [
  [103.314577, 3.860995],
  [103.314598, 3.861402],
  [103.314593, 3.861471],
  [103.314545, 3.861525],
  [103.31484, 3.861803],
  [103.314995, 3.861755],
  [103.315247, 3.861814],
  [103.315725, 3.862012],
  [103.315827, 3.862066],
  [103.315644, 3.862237],
  [103.315773, 3.862365],
  [103.315821, 3.86244],
  [103.315837, 3.86252],
  [103.315848, 3.86267],
  [103.315837, 3.862922],
  [103.315907, 3.862986],
  [103.316304, 3.863147],
] as const;

export const CAMPUS_WALK_ROUTE = turf.lineString(
  CAMPUS_ROUTE_COORDINATES.map(([lng, lat]) => [lng, lat]),
);

export const CAMPUS_ROUTE_KM = turf.length(CAMPUS_WALK_ROUTE, { units: 'kilometers' });

export const CAMPUS_STRAIGHT_KM = turf.distance(
  CAMPUS_ROUTE_COORDINATES[0],
  CAMPUS_ROUTE_COORDINATES[CAMPUS_ROUTE_COORDINATES.length - 1],
  { units: 'kilometers' },
);

export const CAMPUS_ROUTE_CURVATURE_RATIO =
  CAMPUS_STRAIGHT_KM > 0 ? CAMPUS_ROUTE_KM / CAMPUS_STRAIGHT_KM : 1;

export const CAMPUS_LANDMARKS = turf.featureCollection([
  turf.point(POLISAS_COORDS.DATARAN_SISWA, { name: 'Dataran Siswa', role: 'origin' }),
  turf.point(POLISAS_COORDS.LALUAN_UTAMA, { name: 'Laluan F Berbumbung', role: 'waypoint' }),
  turf.point(POLISAS_COORDS.SIMPANG_AKADEMIK, { name: 'Simpang Akademik', role: 'junction' }),
  turf.point(POLISAS_COORDS.BLOK_JTMK, { name: 'Blok JTMK • Makmal 3', role: 'destination' }),
]);

export const CAMPUS_JUNCTION_NODES = turf.featureCollection(
  CAMPUS_ROUTE_COORDINATES.slice(1, -1).map((coord, idx) =>
    turf.point([coord[0], coord[1]], { seq: idx + 1 }),
  ),
);

export type CampusTurnKind = 'straight' | 'right' | 'left' | 'arrived';

export type CampusTurnStep = {
  readonly instruction: string;
  readonly roadName: string;
  readonly turnKind: CampusTurnKind;
  readonly isCovered: boolean;
  readonly distanceLabel: string;
};

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function sliceCampusRoute(progress: number) {
  const distKm = Math.max(0.001, CAMPUS_ROUTE_KM * clamp01(progress));
  return turf.lineSliceAlong(CAMPUS_WALK_ROUTE, 0, distKm, { units: 'kilometers' });
}

export function getWalkerCoordinate(progress: number): [number, number] {
  const distKm = Math.max(0.001, CAMPUS_ROUTE_KM * clamp01(progress));
  const pt = turf.along(CAMPUS_WALK_ROUTE, distKm, { units: 'kilometers' });
  return [pt.geometry.coordinates[0], pt.geometry.coordinates[1]];
}

/**
 * Computes instantaneous compass bearing along the OpenFreeMap walkway in degrees.
 */
export function getWalkerBearing(progress: number): number {
  const p = clamp01(progress);
  const pStart = Math.min(0.96, p);
  const pAhead = Math.min(1, pStart + 0.04);
  const fromPt = getWalkerCoordinate(pStart);
  const toPt = getWalkerCoordinate(pAhead);
  const rawBearing = turf.bearing(fromPt, toPt);
  return Number.isFinite(rawBearing) ? rawBearing : 0;
}

/**
 * Returns the active turn-by-turn navigation prompt and covered-walkway status
 * synced deterministically to `routeProgress` (`0..1`).
 */
export function getCampusTurnStep(progress: number): CampusTurnStep {
  const p = clamp01(progress);
  if (p >= 0.999) {
    return {
      instruction: 'Tiba di Blok JTMK • Makmal Komputer 3',
      roadName: 'Aras 2 · Bilik Kuliah Amali',
      turnKind: 'arrived',
      isCovered: true,
      distanceLabel: '0m • Tiba!',
    };
  }
  if (p < 0.22) {
    return {
      instruction: 'Terus ke Utara dari Dataran Siswa',
      roadName: 'Dataran Siswa → Susur Laluan F',
      turnKind: 'straight',
      isCovered: false,
      distanceLabel: '90m terus',
    };
  }
  if (p < 0.56) {
    return {
      instruction: 'Belok Kanan ke Laluan F Berbumbung',
      roadName: 'Laluan F Berbumbung • Kalis Hujan',
      turnKind: 'right',
      isCovered: true,
      distanceLabel: '140m berbumbung',
    };
  }
  if (p < 0.8) {
    return {
      instruction: 'Belok Kiri di Persimpangan Akademik',
      roadName: 'Persimpangan Laluan Utama Kampus',
      turnKind: 'left',
      isCovered: true,
      distanceLabel: '95m ke JTMK',
    };
  }
  return {
    instruction: 'Belok Kanan ke Blok JTMK • Makmal 3',
    roadName: 'Dataran Akademik JTMK',
    turnKind: 'right',
    isCovered: false,
    distanceLabel: '65m akhir',
  };
}
