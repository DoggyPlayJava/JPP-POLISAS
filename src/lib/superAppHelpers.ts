import { getMalaysianNickname } from './utils';

export { getMalaysianNickname };

export interface CampaignSlide {
  id: 'makmp' | 'kamsis' | 'karnival' | 'supsas';
  title: string;
  badge: string;
  description: string;
  actionText: string;
  actionPath?: string;
  variant: 'gold' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export function formatGreeting(
  hour: number,
  name: string,
  t?: (key: string, fallback?: string, options?: any) => string
): { title: string; subtitle: string } {
  let title = t ? t('portal:greeting_morning', 'Selamat Pagi,') : 'Selamat Pagi,';
  if (hour >= 5 && hour < 12) {
    title = t ? t('portal:greeting_morning', 'Selamat Pagi,') : 'Selamat Pagi,';
  } else if (hour >= 12 && hour < 19) {
    title = t ? t('portal:greeting_afternoon', 'Selamat Petang,') : 'Selamat Petang,';
  } else if (hour >= 19 && hour < 24) {
    title = t ? t('portal:greeting_evening', 'Selamat Malam,') : 'Selamat Malam,';
  } else {
    title = t ? t('portal:greeting_night', 'Masih Berjaga,') : 'Masih Berjaga,';
  }

  const defaultStudentName = t ? t('portal:student_polisas', 'Pelajar POLISAS') : 'Pelajar POLISAS';
  const formattedName = name && name.includes(' ') ? getMalaysianNickname(name, name) : (name || defaultStudentName);

  return {
    title,
    subtitle: formattedName,
  };
}

export function filterUpcomingEvents(events: any[], maxCount: number = 6): any[] {
  if (!Array.isArray(events)) return [];
  const now = new Date().toISOString();
  return events
    .filter(e => e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && e.event_date >= now.slice(0, 10))
    .sort((a, b) => (a.event_date > b.event_date ? 1 : -1))
    .slice(0, maxCount);
}

export function buildCampaignSlides(
  params: {
    kamsisStatus: string | null;
    makmpStatus: string | null;
    karnivalActive: boolean;
    supsasActive: boolean;
  },
  t?: (key: string, fallback?: string, options?: any) => string
): CampaignSlide[] {
  const slides: CampaignSlide[] = [];

  if (params.makmpStatus === 'DIJEMPUT') {
    slides.push({
      id: 'makmp',
      title: t ? t('portal:campaign_makmp_title', 'Anda Dijemput ke MAKMP 2026!') : 'Anda Dijemput ke MAKMP 2026!',
      badge: t ? t('portal:campaign_makmp_badge', 'Jemputan Khas') : 'Jemputan Khas',
      description: t ? t('portal:campaign_makmp_desc', 'Tahniah atas pencapaian cemerlang anda. Sila sahkan kehadiran & muat naik gambar.') : 'Tahniah atas pencapaian cemerlang anda. Sila sahkan kehadiran & muat naik gambar.',
      actionText: t ? t('portal:campaign_makmp_action', 'Semak Status') : 'Semak Status',
      actionPath: '/makmp',
      variant: 'gold',
    });
  }

  if (params.kamsisStatus && params.kamsisStatus !== 'OPT_OUT') {
    const isApproved = params.kamsisStatus === 'APPROVED';
    slides.push({
      id: 'kamsis',
      title: isApproved
        ? (t ? t('portal:campaign_kamsis_approved_title', 'Permohonan Asrama DILULUSKAN') : 'Permohonan Asrama DILULUSKAN')
        : (t ? t('portal:campaign_kamsis_pending_title', 'Status Permohonan Asrama (KAMSIS)') : 'Status Permohonan Asrama (KAMSIS)'),
      badge: isApproved
        ? (t ? t('portal:campaign_kamsis_approved_badge', 'LULUS') : 'LULUS')
        : 'KAMSIS',
      description: isApproved
        ? (t ? t('portal:campaign_kamsis_approved_desc', 'Tahniah! Anda telah ditawarkan penempatan asrama semester ini.') : 'Tahniah! Anda telah ditawarkan penempatan asrama semester ini.')
        : (t ? t('portal:campaign_kamsis_pending_desc', 'Permohonan anda sedang diproses atau sedia untuk semakan rayuan.') : 'Permohonan anda sedang diproses atau sedia untuk semakan rayuan.'),
      actionText: t ? t('portal:campaign_kamsis_action', 'Butiran Asrama') : 'Butiran Asrama',
      variant: isApproved ? 'emerald' : 'amber',
    });
  }

  if (params.karnivalActive) {
    slides.push({
      id: 'karnival',
      title: t ? t('portal:campaign_karnival_title', 'Karnival Siswa POLISAS 2026') : 'Karnival Siswa POLISAS 2026',
      badge: t ? t('portal:campaign_karnival_badge', 'Sedang Berlangsung') : 'Sedang Berlangsung',
      description: t ? t('portal:campaign_karnival_desc', 'Sertai pelbagai gerai jualan, persembahan pentas dan cabutan bertuah!') : 'Sertai pelbagai gerai jualan, persembahan pentas dan cabutan bertuah!',
      actionText: t ? t('portal:campaign_karnival_action', 'Masuk Karnival') : 'Masuk Karnival',
      actionPath: '/karnival',
      variant: 'violet',
    });
  }

  if (params.supsasActive) {
    slides.push({
      id: 'supsas',
      title: t ? t('portal:campaign_supsas_title', 'Sukan Antara Jabatan (SUPSAS)') : 'Sukan Antara Jabatan (SUPSAS)',
      badge: t ? t('portal:campaign_supsas_badge', 'Langsung') : 'Langsung',
      description: t ? t('portal:campaign_supsas_desc', 'Pantau kedudukan pingat dan jadual perlawanan sukan jabatan anda.') : 'Pantau kedudukan pingat dan jadual perlawanan sukan jabatan anda.',
      actionText: t ? t('portal:campaign_supsas_action', 'Papan Skor') : 'Papan Skor',
      actionPath: '/supsas',
      variant: 'amber',
    });
  }

  return slides;
}

export function getRoleBadgeTitle(
  role?: string,
  t?: (key: string, fallback?: string, options?: any) => string
): string {
  const studentDefault = t ? t('portal:role_student', 'SISWA POLISAS') : 'SISWA POLISAS';
  if (!role) return studentDefault;
  const r = role.trim().toUpperCase();
  if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPER_ADMIN_JPP' || r.includes('SUPER_ADMIN')) {
    return t ? t('portal:role_superadmin', 'PENTADBIR UTAMA') : 'PENTADBIR UTAMA';
  }
  if (r === 'JPP') {
    return t ? t('portal:role_jpp', 'MAJLIS JPP') : 'MAJLIS JPP';
  }
  if (r === 'STAFF' || r === 'PENSYARAH') {
    return t ? t('portal:role_staff', 'STAF POLISAS') : 'STAF POLISAS';
  }
  return studentDefault;
}

export function getHeaderGradientClass(karnivalActive?: boolean, supsasActive?: boolean): string {
  if (karnivalActive) {
    return 'from-violet-950 via-purple-900 to-indigo-950';
  }
  if (supsasActive) {
    return 'from-amber-950 via-slate-900 to-sky-950';
  }
  return 'from-emerald-950 via-slate-900 to-slate-950 text-white border-b border-emerald-500/20';
}

export type CampusServiceId =
  | 'polysuara'
  | 'polymart'
  | 'takwim'
  | 'polymaps'
  | 'polyrent'
  | 'kebajikan'
  | 'akademik_qr'
  | 'ekpp'
  | 'polyrider'
  | 'polyservices'
  | 'kamsis'
  | 'ems';

export interface CampusServiceItem {
  id: CampusServiceId;
  label: string;
  routeOrAction: string;
  badge?: string;
  description?: string;
  sublabel?: string;
  color?: string;
  tourClass?: string;
}

export function getCampusServicesConfig(
  params: {
    kamsisStatus?: string | null;
    kbOpenCount?: number;
  },
  t?: (key: string, fallback?: string, options?: any) => string
): CampusServiceItem[] {
  return [
    {
      id: 'polysuara',
      label: 'PolySuara',
      sublabel: t ? t('portal:service_polysuara_sub', 'Suara Siswa') : 'Suara Siswa',
      description: t ? t('portal:service_polysuara_sub', 'Suara Siswa') : 'Suara Siswa',
      routeOrAction: '/polysuara',
      color: 'rose',
    },
    {
      id: 'polymart',
      label: 'PolyMart',
      sublabel: t ? t('portal:service_polymart_sub', 'Pasaran Siswa') : 'Pasaran Siswa',
      description: t ? t('portal:service_polymart_sub', 'Pasaran Siswa') : 'Pasaran Siswa',
      routeOrAction: '/polymart',
      color: 'amber',
    },
    {
      id: 'takwim',
      label: t ? t('portal:service_takwim_title', 'Takwim') : 'Takwim',
      sublabel: t ? t('portal:service_takwim_sub', 'Kalendar Rasmi') : 'Kalendar Rasmi',
      description: t ? t('portal:service_takwim_sub', 'Kalendar Rasmi') : 'Kalendar Rasmi',
      routeOrAction: '/akademik/takwim?tab=pusat',
      color: 'indigo',
      tourClass: 'tour-qa-polyservices',
    },
    {
      id: 'polymaps',
      label: 'PolyMaps',
      sublabel: t ? t('portal:service_polymaps_sub', 'Peta Kampus') : 'Peta Kampus',
      description: t ? t('portal:service_polymaps_sub', 'Peta Kampus') : 'Peta Kampus',
      routeOrAction: '/polymaps',
      color: 'emerald',
    },
    {
      id: 'polyrent',
      label: 'PolyRent',
      sublabel: t ? t('portal:service_polyrent_sub', 'Sewa Rumah') : 'Sewa Rumah',
      description: t ? t('portal:service_polyrent_sub', 'Sewa Rumah') : 'Sewa Rumah',
      routeOrAction: '/polyrent',
      color: 'cyan',
    },
    {
      id: 'kebajikan',
      label: t ? t('portal:service_kebajikan_title', 'E-Kebajikan') : 'E-Kebajikan',
      sublabel: t ? t('portal:service_kebajikan_sub', 'Aduan & Bantuan') : 'Aduan & Bantuan',
      description: t ? t('portal:service_kebajikan_sub', 'Aduan & Bantuan') : 'Aduan & Bantuan',
      routeOrAction: '/kebajikan',
      badge: params.kbOpenCount && params.kbOpenCount > 0 ? String(params.kbOpenCount) : undefined,
      color: 'teal',
      tourClass: 'tour-qa-kebajikan',
    },
    {
      id: 'akademik_qr',
      label: t ? t('portal:service_akademik_qr_title', 'Scan QR') : 'Scan QR',
      sublabel: t ? t('portal:service_akademik_qr_sub', 'Kumpul Merit') : 'Kumpul Merit',
      description: t ? t('portal:service_akademik_qr_sub', 'Kumpul Merit') : 'Kumpul Merit',
      routeOrAction: '/akademik/qr',
      badge: t ? t('portal:service_akademik_qr_badge', 'MERIT') : 'MERIT',
      color: 'purple',
      tourClass: 'tour-qa-qr',
    },
    {
      id: 'ekpp',
      label: t ? t('portal:service_ekpp_title', 'Kelab EKPP') : 'Kelab EKPP',
      sublabel: t ? t('portal:service_ekpp_sub', 'Persatuan Siswa') : 'Persatuan Siswa',
      description: t ? t('portal:service_ekpp_sub', 'Persatuan Siswa') : 'Persatuan Siswa',
      routeOrAction: '/kelab',
      badge: t ? t('portal:service_ekpp_badge', 'KELAB') : 'KELAB',
      color: 'blue',
      tourClass: 'tour-mod-ekpp',
    },
  ];
}

export function getCampaignVariantClasses(variant: CampaignSlide['variant']): string {
  switch (variant) {
    case 'gold':
      return 'from-amber-500/20 via-yellow-500/10 to-amber-950/30 border-amber-500/30 text-amber-300';
    case 'emerald':
      return 'from-emerald-500/20 via-teal-500/10 to-emerald-950/30 border-emerald-500/30 text-emerald-300';
    case 'violet':
      return 'from-violet-500/20 via-purple-500/10 to-indigo-950/30 border-violet-500/30 text-violet-300';
    case 'amber':
      return 'from-amber-500/20 via-orange-500/10 to-amber-950/30 border-amber-500/30 text-amber-300';
    case 'rose':
      return 'from-rose-500/20 via-pink-500/10 to-rose-950/30 border-rose-500/30 text-rose-300';
    default:
      return 'from-slate-800/40 via-slate-900/30 to-slate-950/40 border-slate-700/30 text-slate-300';
  }
}

/**
 * Formats a numeric or string price into standard 'RM X.XX' format.
 * Handles invalid, negative, or undefined values safely by returning 'RM 0.00'.
 */
export function formatProductPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') {
    return 'RM 0.00';
  }

  let num: number;
  if (typeof price === 'number') {
    num = price;
  } else {
    const cleaned = String(price).replace(/[^0-9.-]+/g, '');
    num = parseFloat(cleaned);
  }

  if (isNaN(num) || num < 0) {
    return 'RM 0.00';
  }

  return `RM ${num.toFixed(2)}`;
}

/**
 * Determines whether a product has an active discount / promotion.
 * A product is only considered on sale if:
 * 1. sale_price is provided, strictly positive, and less than regular price.
 * 2. sale_start_at and sale_end_at are valid dates and current time falls strictly within that window.
 */
export function isProductOnSale(product?: {
  price?: number | null;
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
} | null): boolean {
  if (!product || product.price == null || product.sale_price == null) {
    return false;
  }
  const price = typeof product.price === 'number' ? product.price : parseFloat(String(product.price));
  const salePrice = typeof product.sale_price === 'number' ? product.sale_price : parseFloat(String(product.sale_price));

  if (isNaN(price) || isNaN(salePrice) || salePrice <= 0 || salePrice >= price) {
    return false;
  }
  if (!product.sale_start_at || !product.sale_end_at) {
    return false;
  }

  const startTime = new Date(product.sale_start_at).getTime();
  const endTime = new Date(product.sale_end_at).getTime();
  if (isNaN(startTime) || isNaN(endTime)) {
    return false;
  }

  const now = Date.now();
  return now >= startTime && now <= endTime;
}

/**
 * Returns the effective price for a product (discounted sale_price if active, otherwise regular price).
 */
export function getProductEffectivePrice(product: {
  price: number;
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
}): number {
  if (isProductOnSale(product)) {
    const sale = typeof product.sale_price === 'number' ? product.sale_price : parseFloat(String(product.sale_price));
    return isNaN(sale) ? product.price : sale;
  }
  return product.price;
}
