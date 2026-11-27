import type { KebajikanTicketCategory, KebajikanTicketPriority } from '@/types';

export type KebajikanHandledUnit = 'KEBAJIKAN' | 'KK';

export interface ComplaintNudgeResult {
  triggered: boolean;
  suggestedCategory: KebajikanTicketCategory;
  handledByUnit: KebajikanHandledUnit;
  suggestedTitle: string;
  reason: 'facility' | 'kamsis' | 'cafeteria' | 'welfare' | null;
}

export interface EscalationSourceInput {
  content: string;
  category?: string | null;
  codename?: string | null;
  image_url?: string | null;
}

export interface EscalationSuggestion {
  category: KebajikanTicketCategory;
  handledByUnit: KebajikanHandledUnit;
  priority: KebajikanTicketPriority;
  title: string;
  imageUrls: string[];
}

export interface EscalationFormSubmission {
  confessionId: string;
  category: KebajikanTicketCategory;
  priority: KebajikanTicketPriority;
  title: string;
  note?: string | null;
}

export interface EscalateRpcArgs {
  p_confession_id: string;
  p_category: KebajikanTicketCategory;
  p_priority: KebajikanTicketPriority;
  p_title: string;
  p_note: string | null;
}

export interface KebajikanPrefillState {
  fromPolySuara: true;
  category: KebajikanTicketCategory;
  title: string;
  description: string;
}

const CAFETERIA_REGEX =
  /\b(kafe|kafeteria|cafe|cafeteria|kantin|al-?biruni|al-?ghazali|ibn\s?sina|makanan|lauk|nasi|minuman|gerai)\b/i;
const CAFETERIA_ISSUE_REGEX =
  /\b(basi|kotor|lipas|lalat|ulat|mahal|cekik|keracunan|sakit\s?perut|basi|berbau|tidak\s?bersih|kualiti|servis\s?teruk|unclean|hygiene|overpriced|spoiled|rotten|stale)\b/i;

const SPORTS_REGEX =
  /\b(futsal|badminton|bola\s?tampar|bola\s?sepak|padang|gelanggang|gim|gimnasium|gym|dewan\s?sukan|track|jaring\s?gol|court)\b/i;

const KAMSIS_WIFI_REGEX =
  /\b(kamsis|asrama|hostel|blok\s?[a-z0-9]|wifi|wi-fi|internet|line\s?(slow|teruk|putus)|router|rangkaian|air\s?kamsis|tiada\s?air|takde\s?air|water\s?cut)\b/i;

const FACILITY_REGEX =
  /\b(aircond|aircon|ac\b|kipas|lampu|paip|tandas|toilet|singki|sinki|bocor|tersumbat|rosak|pecah|patah|kerusi|meja|projektor|projector|soket|plug|elektrik|trip|blackout|lift|lif|tangga|pintu|tingkap|bumbung|makmal|bengkel|bk\d+|dewan\s?kuliah|dk\d+|jtmk|jke|jkm|jka|jp\b)\b/i;

const COMPLAINT_SIGNAL_REGEX =
  /\b(rosak|bocor|tersumbat|pecah|patah|padam|tiada|takde|tak\s?boleh|tidak\s?boleh|tidak\s?berfungsi|tak\s?berfungsi|panas|kotor|basi|busuk|bising|bahaya|lambat|slow|putus|terputus|mahal|aduan|lapor|mohon\s?(baiki|tindakan|bantuan|semak)|tolong\s?(baiki|tengok|semak)|broken|leak|leaking|clogged|not\s?working|outage|dirty|broken|damaged|fix|repair|urgent|kecemasan|banjir)\b/i;

const URGENT_OR_HIGH_REGEX =
  /\b(kecemasan|bahaya|banjir|elektrik|litar\s?pintas|keracunan|tiada\s?air|takde\s?air|emergency|hazard|flood|blackout|3\s?hari|berhari-hari|seminggu)\b/i;

const WELFARE_REGEX =
  /\b(bantuan\s?kewangan|kebajikan|food\s?bank|kecemasan|banjir|tidak\s?mampu|yuran|zakat|derma)\b/i;

export function getHandledUnitForCategory(category: KebajikanTicketCategory): KebajikanHandledUnit {
  return category === 'KAFETERIA' ? 'KK' : 'KEBAJIKAN';
}

export function sanitizeConfessionSnippet(raw: string): string {
  return (raw || '')
    .replace(/\[spoiler-img\]/gi, '')
    .replace(/[#*_`~>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildShortTitleFromContent(raw: string, maxLength = 96): string {
  const clean = sanitizeConfessionSnippet(raw);
  if (!clean) return 'Aduan Pelajar (PolySuara)';
  const firstLine = clean.split(/[.!?\n]/)[0]?.trim() || clean;
  const candidate = firstLine.length >= 12 ? firstLine : clean;
  if (candidate.length <= maxLength) return candidate;
  return `${candidate.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeTicketImageUrls(imageUrls: unknown): string[] {
  if (!Array.isArray(imageUrls)) return [];
  return imageUrls
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function classifyComplaint(content: string, polySuaraCategory?: string | null): {
  category: KebajikanTicketCategory;
  reason: 'facility' | 'kamsis' | 'cafeteria' | 'welfare' | null;
} {
  const clean = sanitizeConfessionSnippet(content);
  const cat = (polySuaraCategory || '').toUpperCase();

  if (CAFETERIA_REGEX.test(clean) && (CAFETERIA_ISSUE_REGEX.test(clean) || COMPLAINT_SIGNAL_REGEX.test(clean))) {
    return { category: 'KAFETERIA', reason: 'cafeteria' };
  }

  if (SPORTS_REGEX.test(clean) && COMPLAINT_SIGNAL_REGEX.test(clean)) {
    return { category: 'FASILITI_SUKAN', reason: 'facility' };
  }

  if (cat === 'KAMSIS' || KAMSIS_WIFI_REGEX.test(clean)) {
    return { category: 'WIFI_KAMSIS', reason: 'kamsis' };
  }

  if (cat === 'FASILITI' || FACILITY_REGEX.test(clean)) {
    return { category: 'FASILITI_JABATAN', reason: 'facility' };
  }

  if (WELFARE_REGEX.test(clean)) {
    return { category: 'LAIN_LAIN', reason: 'welfare' };
  }

  return { category: 'LAIN_LAIN', reason: null };
}

export function detectComplaintNudge(
  content: string,
  polySuaraCategory: string
): ComplaintNudgeResult {
  const clean = sanitizeConfessionSnippet(content);
  const defaultResult: ComplaintNudgeResult = {
    triggered: false,
    suggestedCategory: 'LAIN_LAIN',
    handledByUnit: 'KEBAJIKAN',
    suggestedTitle: '',
    reason: null,
  };

  if (clean.length < 18) return defaultResult;

  const hasComplaintSignal = COMPLAINT_SIGNAL_REGEX.test(clean);
  if (!hasComplaintSignal) return defaultResult;

  const { category, reason } = classifyComplaint(clean, polySuaraCategory);
  if (!reason) return defaultResult;

  return {
    triggered: true,
    suggestedCategory: category,
    handledByUnit: getHandledUnitForCategory(category),
    suggestedTitle: buildShortTitleFromContent(clean, 90),
    reason,
  };
}

export function suggestKebajikanEscalation(input: EscalationSourceInput): EscalationSuggestion {
  const clean = sanitizeConfessionSnippet(input.content);
  const { category } = classifyComplaint(clean, input.category);
  const handledByUnit = getHandledUnitForCategory(category);
  const priority: KebajikanTicketPriority = URGENT_OR_HIGH_REGEX.test(clean) ? 'HIGH' : 'NORMAL';
  const title = buildShortTitleFromContent(clean, 96);
  const imageUrls = normalizeTicketImageUrls(input.image_url ? [input.image_url] : []);

  return {
    category,
    handledByUnit,
    priority,
    title,
    imageUrls,
  };
}

export function buildEscalationRpcArgs(input: EscalationFormSubmission): EscalateRpcArgs {
  const trimmedTitle = sanitizeConfessionSnippet(input.title).slice(0, 120);
  const trimmedNote = typeof input.note === 'string' && input.note.trim().length > 0
    ? input.note.trim().slice(0, 500)
    : null;

  return {
    p_confession_id: input.confessionId,
    p_category: input.category,
    p_priority: input.priority,
    p_title: trimmedTitle || 'Aduan Pelajar (PolySuara)',
    p_note: trimmedNote,
  };
}

export function buildKebajikanPrefillState(
  content: string,
  nudge: ComplaintNudgeResult
): KebajikanPrefillState {
  const clean = sanitizeConfessionSnippet(content);
  return {
    fromPolySuara: true,
    category: nudge.suggestedCategory,
    title: nudge.suggestedTitle || buildShortTitleFromContent(clean, 90),
    description: clean,
  };
}
