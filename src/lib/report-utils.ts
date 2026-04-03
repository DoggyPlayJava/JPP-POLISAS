import { format, parseISO } from 'date-fns';

export interface RawActivity {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  budget?: number;
  tindakan?: string;
  image_urls?: string[];
}

export interface RawProgram {
  id: string;
  nama_program: string;
  deskripsi?: string;
  tarikh_mula: string;
  tarikh_tamat: string;
  location?: string;
  budget?: number;
  tindakan?: string;
  pengarah_program?: string;
  image_urls?: string[];
}

export function normalizeReportData(activities: RawActivity[], programs: RawProgram[]) {
  const normalizedPrograms = programs.map(p => ({
    id: p.id,
    title: p.nama_program,
    description: p.deskripsi || '',
    start_date: p.tarikh_mula,
    end_date: p.tarikh_tamat,
    location: p.location,
    budget: p.budget,
    tindakan: p.tindakan || p.deskripsi || 'Program Takwim Rasmi',
    image_urls: p.image_urls || [],
    _source: 'takwim',
  }));

  const normalizedActivities = activities.map(a => ({
    ...a,
    _source: 'aktiviti',
  }));

  return [...normalizedActivities, ...normalizedPrograms].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
}
