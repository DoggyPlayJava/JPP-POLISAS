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
