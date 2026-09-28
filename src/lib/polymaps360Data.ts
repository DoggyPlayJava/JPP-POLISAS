/**
 * polymaps360Data.ts
 * Repositori Data & Peta 360° Panorama PolyMaps POLISAS
 * 
 * Mengandungi pemetaan panorama equirectangular resolusi tinggi untuk bangunan
 * dan bilik kuliah / makmal di POLISAS bersumberkan projek my-map-polisas (normane176680).
 * Berfungsi sebagai fallback pintar dan pelengkap kepada data pangkalan data Supabase.
 */

export interface PolyMaps360Building {
  name: string;
  code: string;
  aliases: string[];
  panorama_360_url: string;
  description?: string;
  rooms?: Record<string, string>; // room_code -> panorama_url
}

const BASE_URL = 'https://normane176680.github.io/my-map-polisas/';

export const POLYMAPS_360_REGISTRY: PolyMaps360Building[] = [
  {
    name: 'BANGUNAN PENTADBIRAN',
    code: 'ADMIN',
    aliases: ['Blok Pentadbiran', 'Pentadbiran', 'Pejabat Pengarah', 'JMSK'],
    panorama_360_url: `${BASE_URL}image/PENTADBIRAN/PEJABAT%20PENGARAH,%20TIMBALAN%20PENGARAH%20AKEDEMIK%20JAMBATAN%20MATEMATIK%20DAN%20SAINS%20JMSK.jpg`,
    description: 'Blok Pentadbiran Utama POLISAS menempatkan Pejabat Pengarah, TPA, dan Jabatan Matematik & Sains.',
  },
  {
    name: 'BENGKEL JKA',
    code: 'JKA',
    aliases: ['Blok Jabatan Kejuruteraan Awam (PJ)', 'PJ', 'Kejuruteraan Awam', 'JKA'],
    panorama_360_url: `${BASE_URL}image/PJ/jka.jpg`,
    description: 'Blok Jabatan Kejuruteraan Awam (PJ) merangkumi bilik kuliah, makmal, dan studio ukur tanah.',
  },
  {
    name: 'Blok A JKE',
    code: 'JKE A',
    aliases: ['Blok Jabatan Kejuruteraan Elektrik (Block A)', 'JKE Blok A', 'JKEA'],
    panorama_360_url: `${BASE_URL}image/JKE_A/a101.png`,
    description: 'Bangunan JKE Blok A menempatkan bilik kuliah Aras 1 hingga 4, surau, dan kemudahan staf.',
    rooms: {
      'A101': `${BASE_URL}image/JKE_A/a101.png`,
      'A102': `${BASE_URL}image/JKE_A/a102.png`,
      'A103': `${BASE_URL}image/JKE_A/a103-a104.png`,
      'A104': `${BASE_URL}image/JKE_A/a103-a104.png`,
      'A201': `${BASE_URL}image/JKE_A/a201.png`,
      'A202': `${BASE_URL}image/JKE_A/a202.png`,
      'A203': `${BASE_URL}image/JKE_A/a203-a204.png`,
      'A204': `${BASE_URL}image/JKE_A/a203-a204.png`,
      'A301': `${BASE_URL}image/JKE_A/a301.png`,
      'A302': `${BASE_URL}image/JKE_A/a302-a303.png`,
      'A303': `${BASE_URL}image/JKE_A/a302-a303.png`,
      'A304': `${BASE_URL}image/JKE_A/a304-tandas%20tingkat%203.png`,
      'A401': `${BASE_URL}image/JKE_A/a401.png`,
      'A402': `${BASE_URL}image/JKE_A/a403-a402.png`,
      'A403': `${BASE_URL}image/JKE_A/a403-a402.png`,
      'A404': `${BASE_URL}image/JKE_A/a404.png`,
    },
  },
  {
    name: 'Blok B JKE',
    code: 'JKE B',
    aliases: ['Blok Jabatan Kejuruteraan Elektrik (Block B)', 'JKE Blok B', 'JKEB'],
    panorama_360_url: `${BASE_URL}image/JKE_B/b101.png`,
    description: 'Bangunan JKE Blok B menempatkan bilik kuliah dan makmal teknikal elektrik.',
    rooms: {
      'B101': `${BASE_URL}image/JKE_B/b101.png`,
      'B102': `${BASE_URL}image/JKE_B/b102.png`,
      'B201': `${BASE_URL}image/JKE_B/b201.png`,
      'B202': `${BASE_URL}image/JKE_B/b202.png`,
      'B301': `${BASE_URL}image/JKE_B/b301.png`,
      'B401': `${BASE_URL}image/JKE_B/b401.png`,
    },
  },
  {
    name: 'Blok C JKE',
    code: 'JKE C',
    aliases: ['Blok Jabatan Kejuruteraan Elektrik (Block C)', 'JKE Blok C', 'JKEC'],
    panorama_360_url: `${BASE_URL}image/JKE_C/c101.png`,
    description: 'Bangunan JKE Blok C menempatkan dewan kuliah dan makmal instrumentasi.',
    rooms: {
      'C101': `${BASE_URL}image/JKE_C/c101.png`,
      'C102': `${BASE_URL}image/JKE_C/c102.png`,
      'C201': `${BASE_URL}image/JKE_C/c201.png`,
      'C202': `${BASE_URL}image/JKE_C/c202.png`,
      'C301': `${BASE_URL}image/JKE_C/c301.png`,
      'C401': `${BASE_URL}image/JKE_C/c401.png`,
    },
  },
  {
    name: 'BANGUNAN JTM',
    code: 'JTM',
    aliases: ['Blok Jabatan Teknologi Makanan', 'Teknologi Makanan', 'Makmal JTM'],
    panorama_360_url: `${BASE_URL}image/JTM/BANGUNAN%20JTM.jpg`,
    description: 'Bangunan Jabatan Teknologi Makanan merangkumi loji pemprosesan makanan dan bilik kuliah.',
  },
  {
    name: 'MAKMAL JTM',
    code: 'JTM',
    aliases: ['Makmal Makanan', 'Loji JTM'],
    panorama_360_url: `${BASE_URL}image/JTM/BANGUNAN%20JTM.jpg`,
  },
  {
    name: 'BANGUNAN PH (MEKANIKAL)',
    code: 'JPH',
    aliases: ['Blok Jabatan Kejuruteraan Mekanikal (PH)', 'Blok PH', 'PH Mekanikal'],
    panorama_360_url: `${BASE_URL}image/PH/PH/BILIK%20KULIAH%20PH%20402.jpg`,
    description: 'Bangunan PH menempatkan bilik kuliah dan bilik seminar Jabatan Kejuruteraan Mekanikal.',
    rooms: {
      'PH102': `${BASE_URL}image/PH/PH/PH%20103%20DAN%20102.jpg`,
      'PH103': `${BASE_URL}image/PH/PH/PH%20103%20DAN%20102.jpg`,
      'PH104': `${BASE_URL}image/PH/PH/PH%20105%20DAN%20104.jpg`,
      'PH105': `${BASE_URL}image/PH/PH/PH%20105%20DAN%20104.jpg`,
      'PH201': `${BASE_URL}image/PH/PH/PH%20201.jpg`,
      'PH202': `${BASE_URL}image/PH/PH/PH%20202%20MEETING%20ROOM.jpg`,
      'PH203': `${BASE_URL}image/PH/PH/PH%20203%20BILIK%20SEROJA%20DAN%20PH%20204%20BILIK%20SEMINAR.jpg`,
      'PH204': `${BASE_URL}image/PH/PH/PH%20203%20BILIK%20SEROJA%20DAN%20PH%20204%20BILIK%20SEMINAR.jpg`,
      'PH205': `${BASE_URL}image/PH/PH/PH%20205.jpg`,
      'PH301': `${BASE_URL}image/PH/PH/PH%20301.jpg`,
      'PH402': `${BASE_URL}image/PH/PH/BILIK%20KULIAH%20PH%20402.jpg`,
    },
  },
  {
    name: 'MAHKOTA SQUARE',
    code: 'MAHKOTA SQUARE',
    aliases: ['Blok Mahkota Square', 'Dataran Mahkota'],
    panorama_360_url: `${BASE_URL}image/MahkotaSquare/BILIK%20LATIHAN%20ULPL.png`,
    description: 'Blok Mahkota Square menempatkan bilik latihan ULPL, firma perakaunan, dan pejabat urusetia.',
    rooms: {
      'MA102': `${BASE_URL}image/MahkotaSquare/MA102.png`,
      'MA103': `${BASE_URL}image/MahkotaSquare/MA103.png`,
      'MA202': `${BASE_URL}image/MahkotaSquare/MA202.png`,
      'MB101': `${BASE_URL}image/MahkotaSquare/MB101%20_%2002.png`,
      'ULPL': `${BASE_URL}image/MahkotaSquare/BILIK%20LATIHAN%20ULPL.png`,
    },
  },
  {
    name: 'DEWAN SRI MAHKOTA',
    code: 'DEWAN SRI MAHKOTA',
    aliases: ['Dewan Mahkota', 'Dewan Besar POLISAS'],
    panorama_360_url: `${BASE_URL}image/hall/Dewan%20sri%20mahkota.jpg`,
    description: 'Dewan konvokesyen dan acara rasmi institusi utama Politeknik Sultan Haji Ahmad Shah.',
  },
  {
    name: 'DEWAN AUDITORIUM JABATAN PERDAGANGAN',
    code: 'JP',
    aliases: ['Audi JP', 'Auditorium Perdagangan', 'Dewan Auditorium JP'],
    panorama_360_url: `${BASE_URL}image/hall/audi%20dan%20dewan%20mahkota.jpg`,
  },
  {
    name: 'DEWAN AUDITORIUM JABATAN KEJURUTERAAN ELEKTRIK',
    code: 'Dewan Audi JKE',
    aliases: ['Audi JKE', 'Auditorium JKE'],
    panorama_360_url: `${BASE_URL}image/hall/audi%20jke.jpg`,
  },
  {
    name: 'DEWAN KULIAH 2',
    code: 'DK2',
    aliases: ['Bilik Kuliah 2', 'DK 2 JKE'],
    panorama_360_url: `${BASE_URL}image/JKE/bilik%20kuliah%202.png`,
  },
  {
    name: 'Inkubator Cendawan',
    code: 'IC',
    aliases: ['Inkubator Cendawan JKE', 'Cendawan JKE'],
    panorama_360_url: `${BASE_URL}image/JKE/cendawan%20jke.png`,
  },
  {
    name: 'Makmal Komputer JKE',
    code: 'F JKE',
    aliases: ['Computer Centre JKE', 'Pusat Komputer JKE'],
    panorama_360_url: `${BASE_URL}image/JKE/computer%20centre.png`,
  },
  {
    name: 'BLOK A JABATAN PERDAGANGAN',
    code: 'JP BLOK A',
    aliases: ['Blok JP A', 'JP A', 'U5', 'Blok U5'],
    panorama_360_url: `${BASE_URL}image/U5/BILIK%20AHU%203%20_%20BILIK%20PENGURUSAN%20JP.png`,
    description: 'Bangunan Jabatan Perdagangan Blok A menempatkan bilik kuliah teori dan pejabat pengurusan JP.',
  },
  {
    name: 'BLOK B JABATAN PERDAGANGAN',
    code: 'JP BLOK B',
    aliases: ['Blok JP B', 'JP B', 'U6'],
    panorama_360_url: `${BASE_URL}image/JP%20BLOK%20B/BILIK%20AHU%201.jpg`,
    description: 'Bangunan Jabatan Perdagangan Blok B menempatkan bilik kuliah perakaunan dan pemasaran.',
  },
  {
    name: 'BLOK ME',
    code: 'ME',
    aliases: ['Blok ME JKM', 'Makmal ME'],
    panorama_360_url: `${BASE_URL}image/ME/me001.jpg`,
    description: 'Bangunan Blok ME menempatkan makmal komputer dan bilik tutorial Jabatan Kejuruteraan Mekanikal.',
    rooms: {
      'ME001': `${BASE_URL}image/ME/me001.jpg`,
      'ME004': `${BASE_URL}image/ME/me004.jpg`,
      'ME101': `${BASE_URL}image/ME/me101_me102_bilik_barang.jpg`,
      'ME102': `${BASE_URL}image/ME/me101_me102_bilik_barang.jpg`,
      'ME301': `${BASE_URL}image/ME/me302_me301.jpg`,
      'ME302': `${BASE_URL}image/ME/me302_me301.jpg`,
      'ME303': `${BASE_URL}image/ME/me303.jpg`,
    },
  },
  {
    name: 'BANGUNAN JKM 2',
    code: 'JKM',
    aliases: ['Blok U13 (JKM)', 'U13', 'CAD CAM Machining'],
    panorama_360_url: `${BASE_URL}image/U13/CAD%20CAM%20MACHINING%20CENTER%201.jpg`,
    description: 'Bangunan JKM 2 menempatkan pusat pemesinan CAD/CAM dan pejabat pensyarah JKM.',
  },
  {
    name: 'BENGKEL MEKANIKAL',
    code: 'JKM',
    aliases: ['Blok U12', 'U12', 'Makmal Metalurgi JKM'],
    panorama_360_url: `${BASE_URL}image/U12/PEJABAT%20JKM%201.jpg`,
    description: 'Bengkel Mekanikal merangkumi Pejabat Utama JKM 1, Makmal Metalurgi, dan makmal CNC.',
  },
  {
    name: 'BENGKEL KIMPALAN',
    code: 'JKM',
    aliases: ['Kimpalan JKM', 'Bengkel Gegas Kimpalan'],
    panorama_360_url: `${BASE_URL}image/Workshop/BENGKEL%20KIMPALAN.png`,
    description: 'Bengkel kimpalan arka, gas, dan fabrikasi logam institusi.',
  },
  {
    name: 'KAMSIS IBNU SINA',
    code: 'IS',
    aliases: ['Kolej Kediaman Ibnu Sina', 'Ibnu Sina', 'Asrama Lelaki IS'],
    panorama_360_url: `${BASE_URL}image/KAMSIS/KAMSIS%20IBNU%20SINA.jpg`,
    description: 'Kompleks Kolej Kediaman Siswa Ibnu Sina berserta pejabat penyelia dan kedai serbaneka.',
  },
  {
    name: 'BLOK KASIS',
    code: 'BLOK K',
    aliases: ['KAMSIS AL-BIRUNI', 'Al-Biruni', 'Asrama Al-Biruni', 'Blok K'],
    panorama_360_url: `${BASE_URL}image/KAMSIS/KAMSIS%20AL-BIRUNI.jpg`,
    description: 'Kompleks Kediaman Siswa Al-Biruni POLISAS.',
  },
  {
    name: 'BLOK SITI HAJAR',
    code: 'SITI HAJAR',
    aliases: ['KAMSIS SITI HAJAR', 'Siti Hajar', 'Asrama Siswi'],
    panorama_360_url: `${BASE_URL}image/KAMSIS/KAMSIS%20SITI%20HAJAR.jpg`,
    description: 'Kompleks Kolej Kediaman Siswi Siti Hajar POLISAS.',
  },
  {
    name: 'SURAU FAZ',
    code: 'SURAU FAZ',
    aliases: ['Surau Fatimah Az-Zahra', 'Surau Kamsis', 'Fatimah Az-Zahra'],
    panorama_360_url: `${BASE_URL}image/KAMSIS/SURAU%20FATIMAH%20AZ-ZAHRA.jpg`,
    description: 'Surau Fatimah Az-Zahra di kawasan kolej kediaman pelajar POLISAS.',
  },
  {
    name: 'KAFE AL-BIRUNI',
    code: 'KAFE AB',
    aliases: ['Cafe AB', 'Kafe Al Biruni'],
    panorama_360_url: `${BASE_URL}image/Cafe/Cafe_AB.jpg`,
    description: 'Medan selera dan kafetaria pelajar berdekatan Kolej Kediaman Al-Biruni.',
  },
  {
    name: 'POLYBUS',
    code: 'POLYBUS',
    aliases: ['Hentian Polybus', 'Garasi Bas POLISAS'],
    panorama_360_url: `${BASE_URL}image/Cafe/POLYBUS.jpg`,
    description: 'Stesen dan perkhidmatan bas pengangkutan rasmi kampus POLISAS.',
  },
  {
    name: 'PERHENTIAN BUS RAPID',
    code: 'RAPID',
    aliases: ['Bus Stop Rapid', 'Hentian Bas Rapid Kuantan'],
    panorama_360_url: `${BASE_URL}image/fasiliti/HENTIAN%20BAS.png`,
    description: 'Hentian bas utama pengangkutan awam Rapid Kuantan di hadapan kampus POLISAS.',
  },
];

/**
 * Normalise string for relaxed fuzzy comparison
 */
function cleanStr(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Mendapatkan URL 360 Panorama untuk sesebuah bangunan
 */
export function getBuilding360Url(building?: {
  id?: string;
  name?: string;
  code?: string;
  panorama_360_url?: string | null;
} | null): string | null {
  if (!building) return null;
  if (building.panorama_360_url && building.panorama_360_url.trim().length > 0) {
    return building.panorama_360_url.trim();
  }

  const cleanName = cleanStr(building.name);
  const cleanCode = cleanStr(building.code);

  for (const entry of POLYMAPS_360_REGISTRY) {
    if (cleanName && cleanStr(entry.name) === cleanName) return entry.panorama_360_url;
    if (cleanCode && cleanStr(entry.code) === cleanCode) return entry.panorama_360_url;
    if (entry.aliases.some((alias) => cleanStr(alias) === cleanName || cleanStr(alias) === cleanCode)) {
      return entry.panorama_360_url;
    }
  }

  // Partial substring matches
  for (const entry of POLYMAPS_360_REGISTRY) {
    const entryClean = cleanStr(entry.name);
    if (cleanName && (cleanName.includes(entryClean) || entryClean.includes(cleanName))) {
      return entry.panorama_360_url;
    }
    for (const alias of entry.aliases) {
      const aliasClean = cleanStr(alias);
      if (cleanName && (cleanName.includes(aliasClean) || aliasClean.includes(cleanName))) {
        return entry.panorama_360_url;
      }
    }
  }

  return null;
}

/**
 * Mendapatkan URL 360 Panorama untuk bilik atau lokasi tertentu
 */
export function getLocation360Url(location?: {
  room_code?: string;
  panorama_360_url?: string | null;
  building?: any;
} | null): string | null {
  if (!location) return null;
  if (location.panorama_360_url && location.panorama_360_url.trim().length > 0) {
    return location.panorama_360_url.trim();
  }

  const cleanRoom = cleanStr(location.room_code);
  if (!cleanRoom) {
    return getBuilding360Url(location.building);
  }

  // Cari dalam registry bilik setiap bangunan
  for (const entry of POLYMAPS_360_REGISTRY) {
    if (entry.rooms) {
      for (const [rCode, rUrl] of Object.entries(entry.rooms)) {
        if (cleanStr(rCode) === cleanRoom || cleanRoom.includes(cleanStr(rCode))) {
          return rUrl;
        }
      }
    }
  }

  // Fallback kepada panorama bangunan jika ada
  return getBuilding360Url(location.building);
}

/**
 * Semak sama ada sesebuah bangunan mempunyai peta 360 darjah
 */
export function hasBuilding360(building?: {
  name?: string;
  code?: string;
  panorama_360_url?: string | null;
} | null): boolean {
  return Boolean(getBuilding360Url(building));
}

// ─── PENGURUSAN STATUS TOOGLE 360 PENTADBIR ──────────────────────────────────
const STORAGE_KEY_BUILDINGS = 'polymaps_enabled_360_buildings';
const STORAGE_KEY_LOCATIONS = 'polymaps_enabled_360_locations';

/**
 * Mendapatkan senarai ID/Kod bangunan yang diaktifkan 360 oleh pentadbir (Lalai: Kosong / Semua OFF)
 */
export function getEnabled360BuildingIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUILDINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mendapatkan senarai ID lokasi/bilik yang diaktifkan 360 oleh pentadbir (Lalai: Kosong / Semua OFF)
 */
export function getEnabled360LocationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Semak sama ada 360 bagi sesebuah bangunan AKTIF (toggled ON oleh pentadbir)
 */
export function isBuilding360Active(building?: any): boolean {
  if (!building) return false;
  if (!hasBuilding360(building)) return false;

  // Jika pangkalan data mempunyai nilai eksplisit
  if (building.is_360_enabled === true) return true;

  const enabledList = getEnabled360BuildingIds();
  const idStr = String(building.id || '').trim();
  const codeStr = String(building.code || '').trim().toLowerCase();
  const nameStr = String(building.name || '').trim().toLowerCase();

  return enabledList.some((item) => {
    const it = String(item).toLowerCase();
    return it === idStr.toLowerCase() || (codeStr && it === codeStr) || (nameStr && it === nameStr);
  });
}

/**
 * Semak sama ada 360 bagi bilik/lokasi AKTIF (toggled ON oleh pentadbir)
 */
export function isLocation360Active(location?: any): boolean {
  if (!location) return false;
  const url = getLocation360Url(location);
  if (!url) return false;

  if (location.is_360_enabled === true) return true;

  const enabledList = getEnabled360LocationIds();
  const idStr = String(location.id || '').trim();
  const roomCode = String(location.room_code || '').trim().toLowerCase();

  return enabledList.some((item) => {
    const it = String(item).toLowerCase();
    return it === idStr.toLowerCase() || (roomCode && it === roomCode);
  });
}

/**
 * Togol status 360 bangunan (Lalai: OFF -> ON atau sebaliknya)
 */
export function toggleBuilding360(building: any, forceState?: boolean): boolean {
  if (!building) return false;
  const identifier = String(building.id || building.code || building.name || '').trim();
  if (!identifier) return false;

  const current = isBuilding360Active(building);
  const next = forceState !== undefined ? forceState : !current;

  try {
    const list = getEnabled360BuildingIds();
    let updated: string[];

    if (next) {
      if (!list.includes(identifier)) {
        updated = [...list, identifier];
      } else {
        updated = list;
      }
    } else {
      const matchLowers = [
        String(building.id || '').toLowerCase(),
        String(building.code || '').toLowerCase(),
        String(building.name || '').toLowerCase(),
      ].filter(Boolean);
      updated = list.filter((item) => !matchLowers.includes(String(item).toLowerCase()));
    }

    localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(updated));
    return next;
  } catch (err) {
    console.error('Failed to toggle building 360 in localStorage:', err);
    return next;
  }
}

/**
 * Togol status 360 bilik/lokasi
 */
export function toggleLocation360(location: any, forceState?: boolean): boolean {
  if (!location) return false;
  const identifier = String(location.id || location.room_code || '').trim();
  if (!identifier) return false;

  const current = isLocation360Active(location);
  const next = forceState !== undefined ? forceState : !current;

  try {
    const list = getEnabled360LocationIds();
    let updated: string[];

    if (next) {
      if (!list.includes(identifier)) {
        updated = [...list, identifier];
      } else {
        updated = list;
      }
    } else {
      const matchLowers = [
        String(location.id || '').toLowerCase(),
        String(location.room_code || '').toLowerCase(),
      ].filter(Boolean);
      updated = list.filter((item) => !matchLowers.includes(String(item).toLowerCase()));
    }

    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(updated));
    return next;
  } catch (err) {
    console.error('Failed to toggle location 360 in localStorage:', err);
    return next;
  }
}

/**
 * Menentukan status 360 bangunan untuk penggayaan warna:
 * - 'active'    -> Hijau (ada 360 & togol ON)
 * - 'available' -> Biru  (ada 360 & togol OFF - lalai)
 * - 'none'      -> Neutral (tiada 360)
 */
export function getBuilding360Status(building?: any): 'active' | 'available' | 'none' {
  if (!hasBuilding360(building)) return 'none';
  return isBuilding360Active(building) ? 'active' : 'available';
}

/**
 * Menentukan status 360 bilik/lokasi untuk penggayaan warna:
 * - 'active'    -> Hijau (ada 360 & togol ON)
 * - 'available' -> Biru  (ada 360 & togol OFF - lalai)
 * - 'none'      -> Neutral (tiada 360)
 */
export function getLocation360Status(location?: any): 'active' | 'available' | 'none' {
  const url = getLocation360Url(location);
  if (!url) return 'none';
  return isLocation360Active(location) ? 'active' : 'available';
}

