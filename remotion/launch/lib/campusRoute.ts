import * as turf from '@turf/turf';
import { POLISAS_COORDS } from '../tokens';

export const CAMPUS_WALK_ROUTE = turf.lineString([
  POLISAS_COORDS.DATARAN_SISWA,
  POLISAS_COORDS.LALUAN_UTAMA,
  POLISAS_COORDS.BLOK_JTMK,
]);

export const CAMPUS_ROUTE_KM = turf.length(CAMPUS_WALK_ROUTE, { units: 'kilometers' });

export const CAMPUS_LANDMARKS = turf.featureCollection([
  turf.point(POLISAS_COORDS.DATARAN_SISWA, { name: 'Dataran Siswa', role: 'origin' }),
  turf.point(POLISAS_COORDS.LALUAN_UTAMA, { name: 'Laluan Berbumbung', role: 'waypoint' }),
  turf.point(POLISAS_COORDS.BLOK_JTMK, { name: 'Blok JTMK • Makmal 3', role: 'destination' }),
]);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function sliceCampusRoute(progress: number) {
  const distKm = Math.max(0.001, CAMPUS_ROUTE_KM * clamp01(progress));
  return turf.lineSliceAlong(CAMPUS_WALK_ROUTE, 0, distKm, { units: 'kilometers' });
}

export function getWalkerCoordinate(progress: number): [number, number] {
  const distKm = Math.max(0.001, CAMPUS_ROUTE_KM * clamp01(progress));
  const pt = turf.along(CAMPUS_WALK_ROUTE, distKm, { units: 'kilometers' });
  return [pt.geometry.coordinates[0], pt.geometry.coordinates[1]];
}
