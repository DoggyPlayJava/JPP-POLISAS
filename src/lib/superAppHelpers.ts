export interface CampaignSlide {
  id: 'makmp' | 'kamsis' | 'karnival' | 'supsas';
  title: string;
  badge: string;
  description: string;
  actionText: string;
  actionPath?: string;
  variant: 'gold' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export function formatGreeting(hour: number, name: string): { title: string; subtitle: string } {
  let title = 'Selamat Sejahtera,';
  if (hour >= 5 && hour < 12) title = 'Selamat Pagi,';
  else if (hour >= 12 && hour < 19) title = 'Selamat Petang,';
  else if (hour >= 19 && hour < 24) title = 'Selamat Malam,';
  else title = 'Masih Berjaga,';

  return {
    title,
    subtitle: name || 'Pelajar POLISAS',
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

export function buildCampaignSlides(params: {
  kamsisStatus: string | null;
  makmpStatus: string | null;
  karnivalActive: boolean;
  supsasActive: boolean;
}): CampaignSlide[] {
  const slides: CampaignSlide[] = [];

  if (params.makmpStatus === 'DIJEMPUT') {
    slides.push({
      id: 'makmp',
      title: 'Anda Dijemput ke MAKMP 2026! 🎉',
      badge: 'Jemputan Khas',
      description: 'Tahniah atas pencapaian cemerlang anda. Sila sahkan kehadiran & muat naik gambar.',
      actionText: 'Semak Status',
      actionPath: '/makmp',
      variant: 'gold',
    });
  }

  if (params.kamsisStatus && params.kamsisStatus !== 'OPT_OUT') {
    const isApproved = params.kamsisStatus === 'APPROVED';
    slides.push({
      id: 'kamsis',
      title: isApproved ? 'Permohonan Asrama DILULUSKAN' : 'Status Permohonan Asrama (KAMSIS)',
      badge: isApproved ? 'LULUS' : 'KAMSIS',
      description: isApproved
        ? 'Tahniah! Anda telah ditawarkan penempatan asrama semester ini.'
        : 'Permohonan anda sedang diproses atau sedia untuk semakan rayuan.',
      actionText: 'Butiran Asrama',
      variant: isApproved ? 'emerald' : 'amber',
    });
  }

  if (params.karnivalActive) {
    slides.push({
      id: 'karnival',
      title: 'Karnival Siswa POLISAS 2026 🎪',
      badge: 'Sedang Berlangsung',
      description: 'Sertai pelbagai gerai jualan, persembahan pentas dan cabutan bertuah!',
      actionText: 'Masuk Karnival',
      actionPath: '/karnival',
      variant: 'violet',
    });
  }

  if (params.supsasActive) {
    slides.push({
      id: 'supsas',
      title: 'Sukan Antara Jabatan (SUPSAS) 🏆',
      badge: 'Langsung',
      description: 'Pantau kedudukan pingat dan jadual perlawanan sukan jabatan anda.',
      actionText: 'Papan Skor',
      actionPath: '/supsas',
      variant: 'amber',
    });
  }

  return slides;
}

export function getRoleBadgeTitle(role?: string): string {
  if (!role) return 'SISWA POLISAS';
  const r = role.trim().toUpperCase();
  if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPER_ADMIN_JPP' || r.includes('SUPER_ADMIN')) {
    return 'PENTADBIR UTAMA';
  }
  if (r === 'JPP') {
    return 'MAJLIS JPP';
  }
  if (r === 'STAFF' || r === 'PENSYARAH') {
    return 'STAF POLISAS';
  }
  return 'SISWA POLISAS';
}

export function getHeaderGradientClass(karnivalActive?: boolean, supsasActive?: boolean): string {
  if (karnivalActive) {
    return 'from-violet-950 via-purple-900 to-indigo-950';
  }
  if (supsasActive) {
    return 'from-amber-950 via-slate-900 to-sky-950';
  }
  return 'from-emerald-950 via-slate-900 to-slate-950';
}

export interface CampusServiceItem {
  id: 'polyrider' | 'polymart' | 'polyservices' | 'kamsis' | 'ems' | 'kebajikan' | 'akademik_qr' | 'ekpp';
  label: string;
  routeOrAction: string;
  badge?: string;
  description?: string;
  color?: string;
  tourClass?: string;
}

export function getCampusServicesConfig(params: {
  kamsisStatus: string | null;
  kbOpenCount?: number;
}): CampusServiceItem[] {
  return [
    {
      id: 'polyrider',
      label: 'PolyRider',
      routeOrAction: '/polyrider',
      description: 'Ride & Penghantaran',
      color: 'emerald',
    },
    {
      id: 'polymart',
      label: 'PolyMart',
      routeOrAction: '/polymart',
      description: 'Pasaran Siswa',
      color: 'amber',
    },
    {
      id: 'polyservices',
      label: 'PolyServices',
      routeOrAction: 'modal:polymart',
      description: 'Khidmat Kampus',
      color: 'indigo',
      tourClass: 'tour-qa-polyservices',
    },
    {
      id: 'kamsis',
      label: 'Kamsis',
      routeOrAction: 'modal:kamsis',
      description: 'Penempatan Asrama',
      badge: params.kamsisStatus === 'APPROVED' ? 'LULUS' : undefined,
      color: 'cyan',
    },
    {
      id: 'ems',
      label: 'EMS',
      routeOrAction: '/ems/dashboard',
      description: 'Pengurusan Acara',
      color: 'rose',
    },
    {
      id: 'kebajikan',
      label: 'E-Kebajikan',
      routeOrAction: '/kebajikan',
      description: 'Aduan & Bantuan',
      badge: params.kbOpenCount && params.kbOpenCount > 0 ? String(params.kbOpenCount) : undefined,
      color: 'teal',
      tourClass: 'tour-qa-kebajikan',
    },
    {
      id: 'akademik_qr',
      label: 'Scan QR',
      routeOrAction: '/akademik/qr',
      description: 'Kumpul Merit',
      color: 'purple',
      tourClass: 'tour-qa-qr',
    },
    {
      id: 'ekpp',
      label: 'Kelab EKPP',
      routeOrAction: '/kelab',
      description: 'Persatuan Siswa',
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

