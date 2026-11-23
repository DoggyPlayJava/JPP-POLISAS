import QRCode from 'qrcode';

export type BusinessRegistrationType = 'SSM' | 'PUSKEP' | 'EMS';

export interface BusinessCertificateMember {
  id: string;
  fullName: string;
  matricNo?: string | null;
  department?: string | null;
  programmeCode?: string | null;
  role: 'OWNER' | 'MEMBER';
  joinedAt?: string | null;
}

export interface BusinessCertificateMentor {
  name: string;
  department: string;
}

export interface BusinessRegistrationHistoryItem {
  type: string;
  number: string;
  changed_at?: string | null;
}

export interface BusinessCertificateAuthorityMeta {
  type: BusinessRegistrationType;
  shortLabel: string;
  badgeLabel: string;
  formCode: string;
  authorityTitle: string;
  statutoryClause: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
}

export interface BusinessCertificateData {
  businessId: string;
  businessName: string;
  description: string;
  categoryName: string;
  status: string;
  isActive: boolean;
  registrationType: BusinessRegistrationType;
  registrationNumber: string;
  hasRegistrationNumber: boolean;
  registrationHistory: BusinessRegistrationHistoryItem[];
  createdAt: string;
  approvedAt?: string | null;
  interviewDate?: string | null;
  businessPhone?: string | null;
  polymartIsActive?: boolean;
  isEmsSiswapreneur?: boolean;
  puskepUpgradeStatus?: string | null;
  logoUrl?: string | null;
  owner: {
    id: string;
    fullName: string;
    matricNo?: string | null;
    department?: string | null;
    programmeCode?: string | null;
    email?: string | null;
  };
  members: BusinessCertificateMember[];
  mentors: BusinessCertificateMentor[];
  generatedAt: string;
  generatedBy: string;
  documentRef: string;
  verificationUrl: string;
  integrityHash: string;
}

export interface RawBusinessProfileInput {
  id?: string | null;
  full_name?: string | null;
  matric_no?: string | null;
  department?: string | null;
  jabatan?: string | null;
  programme_code?: string | null;
  email?: string | null;
}

export interface RawBusinessInput {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  registration_type?: string | null;
  ssm_registration_number?: string | null;
  registration_no?: string | null;
  registration_history?: unknown[] | null;
  created_at?: string | null;
  interview_date?: string | null;
  logo_url?: string | null;
  business_phone?: string | null;
  polymart_is_active?: boolean | null;
  is_ems_siswapreneur?: boolean | null;
  puskep_upgrade_status?: string | null;
  mentors?: unknown[] | null;
  category?: { name?: string | null } | null;
  categoryName?: string | null;
  owner_id?: string | null;
  owner?: RawBusinessProfileInput | null;
  profiles?: RawBusinessProfileInput | null;
}

export interface RawBusinessMemberInput {
  id?: string;
  user_id?: string;
  role?: string;
  status?: string;
  joined_at?: string | null;
  user?: RawBusinessProfileInput | null;
}

export interface BuildBusinessCertificateParams {
  business: RawBusinessInput;
  members?: RawBusinessMemberInput[];
  approvedAt?: string | null;
  generatedAt?: string;
  generatedBy?: string;
  origin?: string;
}

const MALAY_MONTHS_UPPER = [
  'JANUARI',
  'FEBRUARI',
  'MAC',
  'APRIL',
  'MEI',
  'JUN',
  'JULAI',
  'OGOS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DISEMBER',
] as const;

const DEFAULT_VERIFY_ORIGIN = 'https://jpp.cipher-node.org';

/**
 * Resolves the authoritative registration number from either
 * `ssm_registration_number` or legacy `registration_no`.
 */
export function resolveRegistrationNumber(raw: {
  ssm_registration_number?: string | null;
  registration_no?: string | null;
}): string {
  return String(raw.ssm_registration_number || raw.registration_no || '').trim();
}

/**
 * Resolves the registration authority type (`SSM`, `PUSKEP`, or `EMS`).
 */
export function resolveRegistrationType(raw: {
  registration_type?: string | null;
  ssm_registration_number?: string | null;
  registration_no?: string | null;
  puskep_upgrade_status?: string | null;
  is_ems_siswapreneur?: boolean | null;
}): BusinessRegistrationType {
  const regType = String(raw.registration_type || '').trim().toUpperCase();
  const code = resolveRegistrationNumber(raw);

  if (regType === 'SSM') return 'SSM';
  if (
    regType === 'PUSKEP' ||
    String(raw.puskep_upgrade_status || '').trim().toUpperCase() === 'APPROVED' ||
    /^(P-|PUSKEP-)/i.test(code)
  ) {
    return 'PUSKEP';
  }
  if (regType === 'EMS' || Boolean(raw.is_ems_siswapreneur) || /^EMS-/i.test(code)) {
    return 'EMS';
  }
  return 'PUSKEP';
}

/**
 * Returns formal statutory metadata, colors, and clauses for each registration scheme.
 */
export function getRegistrationAuthorityMeta(
  type: BusinessRegistrationType
): BusinessCertificateAuthorityMeta {
  switch (type) {
    case 'SSM':
      return {
        type: 'SSM',
        shortLabel: 'Suruhanjaya Syarikat Malaysia (SSM)',
        badgeLabel: 'BERDAFTAR SSM',
        formCode: 'BORANG P-D (KAEDAH PENDAFTARAN SISWAPRENEUR • SSM)',
        authorityTitle: 'SURUHANJAYA SYARIKAT MALAYSIA & PUSKEP POLISAS',
        statutoryClause:
          'Perniagaan ini telah berdaftar secara sah dengan Suruhanjaya Syarikat Malaysia (SSM) di bawah Akta Pendaftaran Perniagaan 1956 (Akta 197) serta diperakui dan direkodkan dalam Daftar Keusahawanan Siswa (PUSKEP) Politeknik Sultan Haji Ahmad Shah.',
        accentColor: '#1E3A8A',
        badgeBg: '#EFF6FF',
        badgeText: '#1E3A8A',
      };
    case 'EMS':
      return {
        type: 'EMS',
        shortLabel: 'Pendaftaran Sementara Program EMS Siswapreneur',
        badgeLabel: 'SEMENTARA (EMS SISWAPRENEUR)',
        formCode: 'BORANG P-D (SEMENTARA • PROGRAM SISWAPRENEUR EMS)',
        authorityTitle: 'UNIT KEUSAHAWANAN (PUSKEP) & EMS JPP-POLISAS',
        statutoryClause:
          'Perniagaan ini diberikan pendaftaran sementara di bawah Program Siswapreneur (Event Management System) JPP-POLISAS untuk tempoh penglibatan acara kampus sementara menantikan permohonan naik taraf rasmi ke daftar kekal PUSKEP atau SSM.',
        accentColor: '#92400E',
        badgeBg: '#FEF3C7',
        badgeText: '#92400E',
      };
    case 'PUSKEP':
    default:
      return {
        type: 'PUSKEP',
        shortLabel: 'Pusat Keusahawanan Politeknik (PUSKEP-POLISAS)',
        badgeLabel: 'BERDAFTAR PUSKEP-POLISAS',
        formCode: 'BORANG P-D (KAEDAH PENDAFTARAN SISWAPRENEUR • PUSKEP)',
        authorityTitle: 'PUSAT KEUSAHAWANAN POLITEKNIK (PUSKEP) POLISAS',
        statutoryClause:
          'Perniagaan ini telah didaftarkan secara rasmi di bawah Garis Panduan Keusahawanan Siswa Pusat Keusahawanan Politeknik (PUSKEP) dan Jawatankuasa Perwakilan Pelajar Politeknik Sultan Haji Ahmad Shah (JPP-POLISAS) untuk beroperasi di peringkat kampus.',
        accentColor: '#831010',
        badgeBg: '#FEF2F2',
        badgeText: '#831010',
      };
  }
}

/**
 * Generates deterministic document reference code: e.g. POLISAS-PUSKEP-2026-A1B2C3
 */
export function computeDocumentRef(
  businessId: string,
  regType: BusinessRegistrationType,
  createdAt?: string | null
): string {
  let year = new Date().getFullYear();
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      year = parsed.getUTCFullYear();
    }
  }
  const suffix =
    String(businessId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase() || '000000';
  return `POLISAS-${regType}-${year}-${suffix}`;
}

function fnv1a32(str: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Computes a deterministic 64-bit double FNV-1a integrity digest (`XXXX-XXXX-XXXX-XXXX`).
 */
export function computeIntegrityDigest(
  input:
    | string
    | {
        businessId: string;
        registrationType: string;
        registrationNumber: string;
        businessName: string;
        ownerName?: string | null;
        status?: string | null;
      }
): string {
  const canonical =
    typeof input === 'string'
      ? input
      : [
          input.businessId,
          input.registrationType,
          input.registrationNumber || 'UNASSIGNED',
          input.businessName.trim().toUpperCase(),
          (input.ownerName || '').trim().toUpperCase(),
          (input.status || '').trim().toUpperCase(),
        ].join('|');

  const hi = fnv1a32(canonical, 0x811c9dc5).toString(16).toUpperCase().padStart(8, '0');
  const reversed = canonical.split('').reverse().join('');
  const lo = fnv1a32(`JPP-POLISAS::${reversed}::${canonical.length}`, 0x9e3779b9)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');

  const hex = `${hi}${lo}`;
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/**
 * Deterministic uppercase Malay date formatter (e.g. `23 NOVEMBER 2026`), independent of OS ICU locale.
 */
export function formatMalayDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // Use Malaysia timezone (+08:00) consistently
  const myt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const day = myt.getUTCDate();
  const month = MALAY_MONTHS_UPPER[myt.getUTCMonth()] || 'JANUARI';
  const year = myt.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Deterministic uppercase Malay date-time formatter (e.g. `23 NOVEMBER 2026, 15:46 MYT`).
 */
export function formatMalayDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const myt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const day = myt.getUTCDate();
  const month = MALAY_MONTHS_UPPER[myt.getUTCMonth()] || 'JANUARI';
  const year = myt.getUTCFullYear();
  const hh = String(myt.getUTCHours()).padStart(2, '0');
  const mm = String(myt.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm} MYT`;
}

/**
 * Derives entity ownership structure based on active member count.
 */
export function deriveEntityStructure(activeMemberCount: number): {
  labelMs: string;
  labelEn: string;
} {
  if (activeMemberCount <= 1) {
    return {
      labelMs: 'PEMILIKAN TUNGGAL (SISWA)',
      labelEn: 'Sole Proprietorship (Student)',
    };
  }
  return {
    labelMs: `PERKONGSIAN SISWA (${activeMemberCount} AHLI)`,
    labelEn: `Student Partnership (${activeMemberCount} Members)`,
  };
}

function normalizeDept(profile?: RawBusinessProfileInput | null): string | null {
  if (!profile) return null;
  const dept = (profile.jabatan || profile.department || '').trim();
  const prog = (profile.programme_code || '').trim();
  if (dept && prog) return `${dept} (${prog})`;
  return dept || prog || null;
}

/**
 * Builds the canonical certificate data contract from raw business, member, and approval records.
 */
export function buildBusinessCertificateData(
  params: BuildBusinessCertificateParams
): BusinessCertificateData {
  const { business } = params;
  const regType = resolveRegistrationType(business);
  const regNo = resolveRegistrationNumber(business);
  const hasRegistrationNumber = regNo.length > 0;

  const rawOwner = business.owner || business.profiles || null;
  const ownerId = business.owner_id || rawOwner?.id || 'owner';
  const ownerName = (rawOwner?.full_name || 'Pemilik Berdaftar').trim();

  // Deduplicate active members while preserving owner metadata
  const memberMap = new Map<string, BusinessCertificateMember>();

  for (const rawMem of params.members || []) {
    const status = String(rawMem.status || 'ACTIVE').trim().toUpperCase();
    if (status === 'PENDING' || status === 'REJECTED') continue;

    const uid = rawMem.user_id || rawMem.user?.id || rawMem.id;
    if (!uid) continue;

    const role: 'OWNER' | 'MEMBER' =
      String(rawMem.role || '').toUpperCase() === 'OWNER' || uid === ownerId
        ? 'OWNER'
        : 'MEMBER';

    const profile = rawMem.user || (uid === ownerId ? rawOwner : null);

    memberMap.set(uid, {
      id: uid,
      fullName: (profile?.full_name || (uid === ownerId ? ownerName : 'Ahli Perniagaan')).trim(),
      matricNo: profile?.matric_no?.trim() || null,
      department: normalizeDept(profile),
      programmeCode: profile?.programme_code?.trim() || null,
      role,
      joinedAt: rawMem.joined_at || business.created_at || null,
    });
  }

  // Ensure owner is always represented at the top
  const existingOwnerMember = memberMap.get(ownerId);
  const resolvedOwner = {
    id: ownerId,
    fullName: existingOwnerMember?.fullName || ownerName,
    matricNo: existingOwnerMember?.matricNo || rawOwner?.matric_no?.trim() || null,
    department: existingOwnerMember?.department || normalizeDept(rawOwner),
    programmeCode:
      existingOwnerMember?.programmeCode || rawOwner?.programme_code?.trim() || null,
    email: rawOwner?.email?.trim() || null,
  };

  if (!existingOwnerMember) {
    memberMap.set(ownerId, {
      id: ownerId,
      fullName: resolvedOwner.fullName,
      matricNo: resolvedOwner.matricNo,
      department: resolvedOwner.department,
      programmeCode: resolvedOwner.programmeCode,
      role: 'OWNER',
      joinedAt: business.created_at || null,
    });
  } else {
    memberMap.set(ownerId, {
      ...existingOwnerMember,
      role: 'OWNER',
    });
  }

  const members = Array.from(memberMap.values()).sort((a, b) => {
    if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
    if (a.role !== 'OWNER' && b.role === 'OWNER') return 1;
    const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.fullName.localeCompare(b.fullName);
  });

  const mentors: BusinessCertificateMentor[] = Array.isArray(business.mentors)
    ? business.mentors
        .map((m: any) => ({
          name: String(m?.name || '').trim(),
          department: String(m?.department || '').trim(),
        }))
        .filter((m) => m.name.length > 0)
    : [];

  const registrationHistory: BusinessRegistrationHistoryItem[] = Array.isArray(
    business.registration_history
  )
    ? business.registration_history
        .map((h: any) => ({
          type: String(h?.type || 'SSM').trim().toUpperCase(),
          number: String(h?.number || '').trim(),
          changed_at: h?.changed_at ? String(h.changed_at) : null,
        }))
        .filter((h) => h.number.length > 0)
    : [];

  const createdAt = business.created_at || new Date().toISOString();
  const generatedAt = params.generatedAt || new Date().toISOString();
  const generatedBy = (params.generatedBy || resolvedOwner.fullName || 'SISTEM PORTAL').trim();
  const status = String(business.status || 'PENDING_INTERVIEW').trim().toUpperCase();
  const isActive = business.is_active !== false;

  const baseOrigin =
    params.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : DEFAULT_VERIFY_ORIGIN);
  const lookupParam = encodeURIComponent(hasRegistrationNumber ? regNo : business.id);
  const verificationUrl = `${baseOrigin.replace(/\/$/, '')}/keusahawanan/sijil/${lookupParam}`;

  const documentRef = computeDocumentRef(business.id, regType, createdAt);
  const integrityHash = computeIntegrityDigest({
    businessId: business.id,
    registrationType: regType,
    registrationNumber: regNo,
    businessName: business.name,
    ownerName: resolvedOwner.fullName,
    status,
  });

  return {
    businessId: business.id,
    businessName: String(business.name || 'Perniagaan Siswa').trim(),
    description: String(business.description || '').trim(),
    categoryName: String(
      business.category?.name || business.categoryName || 'Keusahawanan Umum'
    ).trim(),
    status,
    isActive,
    registrationType: regType,
    registrationNumber: regNo,
    hasRegistrationNumber,
    registrationHistory,
    createdAt,
    approvedAt: params.approvedAt || null,
    interviewDate: business.interview_date || null,
    businessPhone: business.business_phone || null,
    polymartIsActive: Boolean(business.polymart_is_active),
    isEmsSiswapreneur: Boolean(business.is_ems_siswapreneur),
    puskepUpgradeStatus: business.puskep_upgrade_status || null,
    logoUrl: business.logo_url || null,
    owner: resolvedOwner,
    members,
    mentors,
    generatedAt,
    generatedBy,
    documentRef,
    verificationUrl,
    integrityHash,
  };
}

/**
 * Generates a high-redundancy (Level H) QR code PNG Data URL for certificate verification.
 */
export async function generateCertificateQrDataUrl(
  verificationUrl: string
): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    width: 360,
    margin: 1,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Converts browser images (including WebP, relative paths, or remote Supabase assets)
 * into a crisp PNG Data URL safe for `@react-pdf/renderer`, returning `null` on timeout/CORS error.
 */
export async function sanitizeImageForPdf(
  url?: string | null,
  timeoutMs = 4500
): Promise<string | null> {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  if (/^data:image\/(png|jpeg|jpg);base64,/i.test(trimmed)) {
    return trimmed;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const resolvedUrl = trimmed.startsWith('/')
    ? `${window.location.origin}${trimmed}`
    : trimmed;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 320;
        const w = img.naturalWidth || maxDim;
        const h = img.naturalHeight || maxDim;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        finish(canvas.toDataURL('image/png'));
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = resolvedUrl;
  });
}

/**
 * Generates a clean, filesystem-safe PDF download filename.
 */
export function sanitizePdfFilename(businessName: string, regNumber?: string | null): string {
  const cleanReg = String(regNumber || 'POLISAS')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'POLISAS';
  const cleanName = String(businessName || 'Perniagaan')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Perniagaan';
  return `Sijil_Pendaftaran_${cleanReg}_${cleanName}.pdf`;
}
