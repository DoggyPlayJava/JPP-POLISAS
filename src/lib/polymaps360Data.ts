/**
 * polymaps360Data.ts
 * Repositori Data & Peta 360° Panorama PolyMaps POLISAS
 * 
 * Mengandungi pemetaan panorama equirectangular resolusi tinggi untuk bangunan
 * dan bilik kuliah / makmal di POLISAS bersumberkan projek my-map-polisas (normane176680).
 * Berfungsi sebagai fallback pintar dan pelengkap kepada data pangkalan data Supabase.
 */

import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

export interface PolyMaps360Building {
  name: string;
  code: string;
  aliases: string[];
  panorama_360_url: string;
  description?: string;
  rooms?: Record<string, string>; // room_code -> panorama_url
}

const BASE_URL = 'https://normane176680.github.io/my-map-polisas/';
const assetUrl = (path: string) => `${BASE_URL}${path.startsWith('/') ? path.slice(1) : path}`;
const t = (k: string, fb: string, opt?: any): string => (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...(opt || {}) }) as string) : fb);

export const POLYMAPS_360_REGISTRY: PolyMaps360Building[] = [
  {
    name: t('services:bldg_admin_name', 'BANGUNAN PENTADBIRAN'),
    code: 'ADMIN',
    aliases: [t('services:bldg_admin_alias_blok', 'Blok Pentadbiran'), t('services:bldg_admin_alias_pentadbiran', 'Pentadbiran'), t('services:bldg_admin_alias_pejabat_pengarah', 'Pejabat Pengarah'), 'JMSK'],
    panorama_360_url: assetUrl('/image/PENTADBIRAN/PEJABAT%20PENGARAH,%20TIMBALAN%20PENGARAH%20AKEDEMIK%20JAMBATAN%20MATEMATIK%20DAN%20SAINS%20JMSK.jpg'),
    description: t('services:bldg_admin_desc', 'Blok Pentadbiran Utama POLISAS menempatkan Pejabat Pengarah, TPA, dan Jabatan Matematik & Sains.'),
  },
  {
    name: t('services:bldg_jka_name', 'BENGKEL JKA'),
    code: 'JKA',
    aliases: [t('services:bldg_jka_alias_blok', 'Blok Jabatan Kejuruteraan Awam (PJ)'), 'PJ', t('services:bldg_jka_alias_kejuruteraan_awam', 'Kejuruteraan Awam'), 'JKA'],
    panorama_360_url: assetUrl('/image/PJ/jka.jpg'),
    description: t('services:bldg_jka_desc', 'Blok Jabatan Kejuruteraan Awam (PJ) merangkumi bilik kuliah, makmal, dan studio ukur tanah.'),
  },
  {
    name: t('services:bldg_jke_a_name', 'Blok A JKE'),
    code: 'JKE A',
    aliases: [t('services:bldg_jke_a_alias_blok', 'Blok Jabatan Kejuruteraan Elektrik (Block A)'), t('services:bldg_jke_a_alias_jke_blok_a', 'JKE Blok A'), 'JKEA'],
    panorama_360_url: assetUrl('/image/JKE_A/a101.png'),
    description: t('services:bldg_jke_a_desc', 'Bangunan JKE Blok A menempatkan bilik kuliah Aras 1 hingga 4, surau, dan kemudahan staf.'),
    rooms: {
      'A101': assetUrl('/image/JKE_A/a101.png'),
      'A102': assetUrl('/image/JKE_A/a102.png'),
      'A103': assetUrl('/image/JKE_A/a103-a104.png'),
      'A104': assetUrl('/image/JKE_A/a103-a104.png'),
      'A201': assetUrl('/image/JKE_A/a201.png'),
      'A202': assetUrl('/image/JKE_A/a202.png'),
      'A203': assetUrl('/image/JKE_A/a203-a204.png'),
      'A204': assetUrl('/image/JKE_A/a203-a204.png'),
      'A301': assetUrl('/image/JKE_A/a301.png'),
      'A302': assetUrl('/image/JKE_A/a302-a303.png'),
      'A303': assetUrl('/image/JKE_A/a302-a303.png'),
      'A304': assetUrl('/image/JKE_A/a304-tandas%20tingkat%203.png'),
      'A401': assetUrl('/image/JKE_A/a401.png'),
      'A402': assetUrl('/image/JKE_A/a403-a402.png'),
      'A403': assetUrl('/image/JKE_A/a403-a402.png'),
      'A404': assetUrl('/image/JKE_A/a404.png'),
    },
  },
  {
    name: t('services:bldg_jke_b_name', 'Blok B JKE'),
    code: 'JKE B',
    aliases: [t('services:bldg_jke_b_alias_blok', 'Blok Jabatan Kejuruteraan Elektrik (Block B)'), t('services:bldg_jke_b_alias_jke_blok_b', 'JKE Blok B'), 'JKEB'],
    panorama_360_url: assetUrl('/image/JKE_B/b101.png'),
    description: t('services:bldg_jke_b_desc', 'Bangunan JKE Blok B menempatkan bilik kuliah dan makmal teknikal elektrik.'),
    rooms: {
      'B101': assetUrl('/image/JKE_B/b101.png'),
      'B102': assetUrl('/image/JKE_B/b102.png'),
      'B201': assetUrl('/image/JKE_B/b201.png'),
      'B202': assetUrl('/image/JKE_B/b202.png'),
      'B301': assetUrl('/image/JKE_B/b301.png'),
      'B401': assetUrl('/image/JKE_B/b401.png'),
    },
  },
  {
    name: t('services:bldg_jke_c_name', 'Blok C JKE'),
    code: 'JKE C',
    aliases: [t('services:bldg_jke_c_alias_blok', 'Blok Jabatan Kejuruteraan Elektrik (Block C)'), t('services:bldg_jke_c_alias_jke_blok_c', 'JKE Blok C'), 'JKEC'],
    panorama_360_url: assetUrl('/image/JKE_C/c101.png'),
    description: t('services:bldg_jke_c_desc', 'Bangunan JKE Blok C menempatkan dewan kuliah dan makmal instrumentasi.'),
    rooms: {
      'C101': assetUrl('/image/JKE_C/c101.png'),
      'C102': assetUrl('/image/JKE_C/c102.png'),
      'C201': assetUrl('/image/JKE_C/c201.png'),
      'C202': assetUrl('/image/JKE_C/c202.png'),
      'C301': assetUrl('/image/JKE_C/c301.png'),
      'C401': assetUrl('/image/JKE_C/c401.png'),
    },
  },
  {
    name: t('services:bldg_jtm_name', 'BANGUNAN JTM'),
    code: 'JTM',
    aliases: [t('services:bldg_jtm_alias_blok', 'Blok Jabatan Teknologi Makanan'), t('services:bldg_jtm_alias_teknologi_makanan', 'Teknologi Makanan'), t('services:bldg_jtm_alias_makmal', 'Makmal JTM')],
    panorama_360_url: assetUrl('/image/JTM/BANGUNAN%20JTM.jpg'),
    description: t('services:bldg_jtm_desc', 'Bangunan Jabatan Teknologi Makanan merangkumi loji pemprosesan makanan dan bilik kuliah.'),
  },
  {
    name: t('services:bldg_jtm_lab_name', 'MAKMAL JTM'),
    code: 'JTM',
    aliases: [t('services:bldg_jtm_lab_alias_makmal_makanan', 'Makmal Makanan'), t('services:bldg_jtm_lab_alias_loji_jtm', 'Loji JTM')],
    panorama_360_url: assetUrl('/image/JTM/BANGUNAN%20JTM.jpg'),
  },
  {
    name: t('services:bldg_ph_name', 'BANGUNAN PH (MEKANIKAL)'),
    code: 'JPH',
    aliases: [t('services:bldg_ph_alias_blok', 'Blok Jabatan Kejuruteraan Mekanikal (PH)'), t('services:bldg_ph_alias_blok_ph', 'Blok PH'), t('services:bldg_ph_alias_ph_mekanikal', 'PH Mekanikal')],
    panorama_360_url: assetUrl('/image/PH/PH/BILIK%20KULIAH%20PH%20402.jpg'),
    description: t('services:bldg_ph_desc', 'Bangunan PH menempatkan bilik kuliah dan bilik seminar Jabatan Kejuruteraan Mekanikal.'),
    rooms: {
      'PH102': assetUrl('/image/PH/PH/PH%20103%20DAN%20102.jpg'),
      'PH103': assetUrl('/image/PH/PH/PH%20103%20DAN%20102.jpg'),
      'PH104': assetUrl('/image/PH/PH/PH%20105%20DAN%20104.jpg'),
      'PH105': assetUrl('/image/PH/PH/PH%20105%20DAN%20104.jpg'),
      'PH201': assetUrl('/image/PH/PH/PH%20201.jpg'),
      'PH202': assetUrl('/image/PH/PH/PH%20202%20MEETING%20ROOM.jpg'),
      'PH203': assetUrl('/image/PH/PH/PH%20203%20BILIK%20SEROJA%20DAN%20PH%20204%20BILIK%20SEMINAR.jpg'),
      'PH204': assetUrl('/image/PH/PH/PH%20203%20BILIK%20SEROJA%20DAN%20PH%20204%20BILIK%20SEMINAR.jpg'),
      'PH205': assetUrl('/image/PH/PH/PH%20205.jpg'),
      'PH301': assetUrl('/image/PH/PH/PH%20301.jpg'),
      'PH402': assetUrl('/image/PH/PH/BILIK%20KULIAH%20PH%20402.jpg'),
    },
  },
  {
    name: t('services:bldg_mahkota_square_name', 'MAHKOTA SQUARE'),
    code: 'MAHKOTA SQUARE',
    aliases: [t('services:bldg_mahkota_square_alias_blok', 'Blok Mahkota Square'), t('services:bldg_mahkota_square_alias_dataran', 'Dataran Mahkota')],
    panorama_360_url: assetUrl('/image/MahkotaSquare/BILIK%20LATIHAN%20ULPL.png'),
    description: t('services:bldg_mahkota_square_desc', 'Blok Mahkota Square menempatkan bilik latihan ULPL, firma perakaunan, dan pejabat urusetia.'),
    rooms: {
      'MA102': assetUrl('/image/MahkotaSquare/MA102.png'),
      'MA103': assetUrl('/image/MahkotaSquare/MA103.png'),
      'MA202': assetUrl('/image/MahkotaSquare/MA202.png'),
      'MB101': assetUrl('/image/MahkotaSquare/MB101%20_%2002.png'),
      'ULPL': assetUrl('/image/MahkotaSquare/BILIK%20LATIHAN%20ULPL.png'),
    },
  },
  {
    name: t('services:bldg_dewan_sri_mahkota_name', 'DEWAN SRI MAHKOTA'),
    code: t('services:bldg_dewan_sri_mahkota_code', 'DEWAN SRI MAHKOTA'),
    aliases: [t('services:bldg_dewan_sri_mahkota_alias_dewan', 'Dewan Mahkota'), t('services:bldg_dewan_sri_mahkota_alias_besar', 'Dewan Besar POLISAS')],
    panorama_360_url: assetUrl('/image/hall/Dewan%20sri%20mahkota.jpg'),
    description: t('services:bldg_dewan_sri_mahkota_desc', 'Dewan konvokesyen dan acara rasmi institusi utama Politeknik Sultan Haji Ahmad Shah.'),
  },
  {
    name: t('services:bldg_audi_jp_name', 'DEWAN AUDITORIUM JABATAN PERDAGANGAN'),
    code: 'JP',
    aliases: [t('services:bldg_audi_jp_alias_audi_jp', 'Audi JP'), t('services:bldg_audi_jp_alias_auditorium_perdagangan', 'Auditorium Perdagangan'), t('services:bldg_audi_jp_alias_dewan_audi_jp', 'Dewan Auditorium JP')],
    panorama_360_url: assetUrl('/image/hall/audi%20dan%20dewan%20mahkota.jpg'),
  },
  {
    name: t('services:bldg_audi_jke_name', 'DEWAN AUDITORIUM JABATAN KEJURUTERAAN ELEKTRIK'),
    code: t('services:bldg_audi_jke_code', 'Dewan Audi JKE'),
    aliases: [t('services:bldg_audi_jke_alias_audi_jke', 'Audi JKE'), t('services:bldg_audi_jke_alias_auditorium_jke', 'Auditorium JKE')],
    panorama_360_url: assetUrl('/image/hall/audi%20jke.jpg'),
  },
  {
    name: t('services:bldg_dk2_name', 'DEWAN KULIAH 2'),
    code: 'DK2',
    aliases: [t('services:bldg_dk2_alias_bilik_kuliah_2', 'Bilik Kuliah 2'), t('services:bldg_dk2_alias_dk_2_jke', 'DK 2 JKE')],
    panorama_360_url: assetUrl('/image/JKE/bilik%20kuliah%202.png'),
  },
  {
    name: t('services:bldg_ic_name', 'Inkubator Cendawan'),
    code: 'IC',
    aliases: [t('services:bldg_ic_alias_inkubator_cendawan_jke', 'Inkubator Cendawan JKE'), t('services:bldg_ic_alias_cendawan_jke', 'Cendawan JKE')],
    panorama_360_url: assetUrl('/image/JKE/cendawan%20jke.png'),
  },
  {
    name: t('services:bldg_lab_komputer_jke_name', 'Makmal Komputer JKE'),
    code: 'F JKE',
    aliases: ['Computer Centre JKE', t('services:bldg_lab_komputer_jke_alias_pusat', 'Pusat Komputer JKE')],
    panorama_360_url: assetUrl('/image/JKE/computer%20centre.png'),
  },
  {
    name: t('services:bldg_jp_a_name', 'BLOK A JABATAN PERDAGANGAN'),
    code: t('services:bldg_jp_a_code', 'JP BLOK A'),
    aliases: [t('services:bldg_jp_a_alias_blok_jp_a', 'Blok JP A'), 'JP A', 'U5', t('services:bldg_jp_a_alias_blok_u5', 'Blok U5')],
    panorama_360_url: assetUrl('/image/U5/BILIK%20AHU%203%20_%20BILIK%20PENGURUSAN%20JP.png'),
    description: t('services:bldg_jp_a_desc', 'Bangunan Jabatan Perdagangan Blok A menempatkan bilik kuliah teori dan pejabat pengurusan JP.'),
  },
  {
    name: t('services:bldg_jp_b_name', 'BLOK B JABATAN PERDAGANGAN'),
    code: t('services:bldg_jp_b_code', 'JP BLOK B'),
    aliases: [t('services:bldg_jp_b_alias_blok_jp_b', 'Blok JP B'), 'JP B', 'U6'],
    panorama_360_url: assetUrl('/image/JP%20BLOK%20B/BILIK%20AHU%201.jpg'),
    description: t('services:bldg_jp_b_desc', 'Bangunan Jabatan Perdagangan Blok B menempatkan bilik kuliah perakaunan dan pemasaran.'),
  },
  {
    name: t('services:bldg_me_name', 'BLOK ME'),
    code: 'ME',
    aliases: [t('services:bldg_me_alias_blok_me_jkm', 'Blok ME JKM'), t('services:bldg_me_alias_makmal_me', 'Makmal ME')],
    panorama_360_url: assetUrl('/image/ME/me001.jpg'),
    description: t('services:bldg_me_desc', 'Bangunan Blok ME menempatkan makmal komputer dan bilik tutorial Jabatan Kejuruteraan Mekanikal.'),
    rooms: {
      'ME001': assetUrl('/image/ME/me001.jpg'),
      'ME004': assetUrl('/image/ME/me004.jpg'),
      'ME101': assetUrl('/image/ME/me101_me102_bilik_barang.jpg'),
      'ME102': assetUrl('/image/ME/me101_me102_bilik_barang.jpg'),
      'ME301': assetUrl('/image/ME/me302_me301.jpg'),
      'ME302': assetUrl('/image/ME/me302_me301.jpg'),
      'ME303': assetUrl('/image/ME/me303.jpg'),
    },
  },
  {
    name: t('services:bldg_jkm_2_name', 'BANGUNAN JKM 2'),
    code: 'JKM',
    aliases: [t('services:bldg_jkm_2_alias_blok_u13', 'Blok U13 (JKM)'), 'U13', 'CAD CAM Machining'],
    panorama_360_url: assetUrl('/image/U13/CAD%20CAM%20MACHINING%20CENTER%201.jpg'),
    description: t('services:bldg_jkm_2_desc', 'Bangunan JKM 2 menempatkan pusat pemesinan CAD/CAM dan pejabat pensyarah JKM.'),
  },
  {
    name: t('services:bldg_bengkel_mekanikal_name', 'BENGKEL MEKANIKAL'),
    code: 'JKM',
    aliases: [t('services:bldg_bengkel_mekanikal_alias_blok_u12', 'Blok U12'), 'U12', t('services:bldg_bengkel_mekanikal_alias_makmal_metalurgi', 'Makmal Metalurgi JKM')],
    panorama_360_url: assetUrl('/image/U12/PEJABAT%20JKM%201.jpg'),
    description: t('services:bldg_bengkel_mekanikal_desc', 'Bengkel Mekanikal merangkumi Pejabat Utama JKM 1, Makmal Metalurgi, dan makmal CNC.'),
  },
  {
    name: t('services:bldg_bengkel_kimpalan_name', 'BENGKEL KIMPALAN'),
    code: 'JKM',
    aliases: [t('services:bldg_bengkel_kimpalan_alias_kimpalan_jkm', 'Kimpalan JKM'), t('services:bldg_bengkel_kimpalan_alias_bengkel_gegas', 'Bengkel Gegas Kimpalan')],
    panorama_360_url: assetUrl('/image/Workshop/BENGKEL%20KIMPALAN.png'),
    description: t('services:bldg_bengkel_kimpalan_desc', 'Bengkel kimpalan arka, gas, dan fabrikasi logam institusi.'),
  },
  {
    name: t('services:bldg_is_name', 'KAMSIS IBNU SINA'),
    code: 'IS',
    aliases: [t('services:bldg_is_alias_kolej', 'Kolej Kediaman Ibnu Sina'), 'Ibnu Sina', t('services:bldg_is_alias_asrama_lelaki', 'Asrama Lelaki IS')],
    panorama_360_url: assetUrl('/image/KAMSIS/KAMSIS%20IBNU%20SINA.jpg'),
    description: t('services:bldg_is_desc', 'Kompleks Kolej Kediaman Siswa Ibnu Sina berserta pejabat penyelia dan kedai serbaneka.'),
  },
  {
    name: t('services:bldg_kasis_name', 'BLOK KASIS'),
    code: t('services:bldg_kasis_code', 'BLOK K'),
    aliases: [t('services:bldg_kasis_alias_kamsis_al_biruni', 'KAMSIS AL-BIRUNI'), 'Al-Biruni', t('services:bldg_kasis_alias_asrama', 'Asrama Al-Biruni'), t('services:bldg_kasis_alias_blok_k', 'Blok K')],
    panorama_360_url: assetUrl('/image/KAMSIS/KAMSIS%20AL-BIRUNI.jpg'),
    description: t('services:bldg_kasis_desc', 'Kompleks Kediaman Siswa Al-Biruni POLISAS.'),
  },
  {
    name: t('services:bldg_siti_hajar_name', 'BLOK SITI HAJAR'),
    code: 'SITI HAJAR',
    aliases: [t('services:bldg_siti_hajar_alias_kamsis', 'KAMSIS SITI HAJAR'), 'Siti Hajar', t('services:bldg_siti_hajar_alias_asrama', 'Asrama Siswi')],
    panorama_360_url: assetUrl('/image/KAMSIS/KAMSIS%20SITI%20HAJAR.jpg'),
    description: t('services:bldg_siti_hajar_desc', 'Kompleks Kolej Kediaman Siswi Siti Hajar POLISAS.'),
  },
  {
    name: t('services:bldg_surau_faz_name', 'SURAU FAZ'),
    code: t('services:bldg_surau_faz_code', 'SURAU FAZ'),
    aliases: [t('services:bldg_surau_faz_alias_surau', 'Surau Fatimah Az-Zahra'), t('services:bldg_surau_faz_alias_kamsis', 'Surau Kamsis'), 'Fatimah Az-Zahra'],
    panorama_360_url: assetUrl('/image/KAMSIS/SURAU%20FATIMAH%20AZ-ZAHRA.jpg'),
    description: t('services:bldg_surau_faz_desc', 'Surau Fatimah Az-Zahra di kawasan kolej kediaman pelajar POLISAS.'),
  },
  {
    name: t('services:bldg_kafe_ab_name', 'KAFE AL-BIRUNI'),
    code: t('services:bldg_kafe_ab_code', 'KAFE AB'),
    aliases: ['Cafe AB', t('services:bldg_kafe_ab_alias_kafe', 'Kafe Al Biruni')],
    panorama_360_url: assetUrl('/image/Cafe/Cafe_AB.jpg'),
    description: t('services:bldg_kafe_ab_desc', 'Medan selera dan kafetaria pelajar berdekatan Kolej Kediaman Al-Biruni.'),
  },
  {
    name: t('services:bldg_polybus_name', 'POLYBUS'),
    code: 'POLYBUS',
    aliases: [t('services:bldg_polybus_alias_hentian', 'Hentian Polybus'), t('services:bldg_polybus_alias_garasi', 'Garasi Bas POLISAS')],
    panorama_360_url: assetUrl('/image/Cafe/POLYBUS.jpg'),
    description: t('services:bldg_polybus_desc', 'Stesen dan perkhidmatan bas pengangkutan rasmi kampus POLISAS.'),
  },
  {
    name: t('services:bldg_rapid_name', 'PERHENTIAN BUS RAPID'),
    code: 'RAPID',
    aliases: ['Bus Stop Rapid', t('services:bldg_rapid_alias_hentian', 'Hentian Bas Rapid Kuantan')],
    panorama_360_url: assetUrl('/image/fasiliti/HENTIAN%20BAS.png'),
    description: t('services:bldg_rapid_desc', 'Hentian bas utama pengangkutan awam Rapid Kuantan di hadapan kampus POLISAS.'),
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

// ─── PENGURUSAN STATUS 360 PENTADBIR (DB-BACKED) ─────────────────────────────
// Status 360 disimpan dalam kolum is_360_enabled di pangkalan data (imaps_buildings /
// imaps_locations), BUKAN localStorage. Ini memastikan toggle pentadbir kelihatan
// pada SEMUA peranti (elak bug "phone A nampak 360, phone B tak nampak").

/**
 * Semak sama ada 360 bagi sesebuah bangunan AKTIF (berdasarkan kolum DB is_360_enabled)
 */
export function isBuilding360Active(building?: any): boolean {
  if (!building) return false;
  if (!hasBuilding360(building)) return false;
  return building.is_360_enabled === true;
}

/**
 * Semak sama ada 360 bagi bilik/lokasi AKTIF (berdasarkan kolum DB is_360_enabled)
 */
export function isLocation360Active(location?: any): boolean {
  if (!location) return false;
  const url = getLocation360Url(location);
  if (!url) return false;
  return location.is_360_enabled === true;
}

/**
 * Togol status 360 bangunan — tulis ke DB supaya semua peranti nampak perubahan.
 */
export async function toggleBuilding360(building: any, forceState?: boolean): Promise<boolean> {
  if (!building?.id) return false;
  const current = isBuilding360Active(building);
  const next = forceState !== undefined ? forceState : !current;

  const { error } = await supabase
    .from('imaps_buildings')
    .update({ is_360_enabled: next })
    .eq('id', building.id);

  if (error) {
    console.error('Failed to toggle building 360 in DB:', error.message);
    return current; // kekalkan status sedia ada jika gagal
  }
  building.is_360_enabled = next; // mutasi objek lokal supaya UI refresh serta-merta
  return next;
}

/**
 * Togol status 360 bilik/lokasi — tulis ke DB supaya semua peranti nampak perubahan.
 */
export async function toggleLocation360(location: any, forceState?: boolean): Promise<boolean> {
  if (!location?.id) return false;
  const current = isLocation360Active(location);
  const next = forceState !== undefined ? forceState : !current;

  const { error } = await supabase
    .from('imaps_locations')
    .update({ is_360_enabled: next })
    .eq('id', location.id);

  if (error) {
    console.error('Failed to toggle location 360 in DB:', error.message);
    return current;
  }
  location.is_360_enabled = next;
  return next;
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

