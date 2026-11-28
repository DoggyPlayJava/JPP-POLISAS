import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

/**
 * polySuaraHelpers.ts
 *
 * Helper utilities, constants, token parsers, and reaction aggregation
 * for the PolySuara Super App module.
 */

export interface CampusSticker {
  id: string;
  label: string;
  emoji: string;
  phrase: string;
  category: 'STUDY' | 'MOOD' | 'CAMPUS' | 'MEME';
  gradientClass: string;
  borderClass: string;
}

export interface ReactionSummary {
  type: string;
  emoji: string;
  count: number;
  userReacted: boolean;
  label?: string;
}

export interface AnimalAvatar {
  emoji: string;
  bgClass: string;
  textClass: string;
}

/**
 * Curated 8-pack POLISAS campus stickers representing student polytechnic life.
 * Stored via token format [sticker:id] for 0KB network payload.
 */
export const POLISAS_CAMPUS_STICKERS: CampusSticker[] = [
  {
    id: 'otak_jem',
    label: 'Otak Jem',
    emoji: '🧠💥',
    phrase: 'Assignment overload & mental fatigue',
    category: 'MOOD',
    gradientClass: 'from-amber-500/20 via-orange-500/15 to-red-500/20',
    borderClass: 'border-amber-500/40 text-amber-600 dark:text-amber-300',
  },
  {
    id: 'exam_mood',
    label: 'Exam Mood',
    emoji: '📚☕',
    phrase: 'Revision week & cafe session',
    category: 'STUDY',
    gradientClass: 'from-blue-500/20 via-indigo-500/15 to-purple-500/20',
    borderClass: 'border-blue-500/40 text-blue-600 dark:text-blue-300',
  },
  {
    id: 'relatable',
    label: 'Relatable Teruk',
    emoji: '😭💔',
    phrase: 'Shared campus struggles',
    category: 'MEME',
    gradientClass: 'from-rose-500/20 via-pink-500/15 to-purple-500/20',
    borderClass: 'border-rose-500/40 text-rose-600 dark:text-rose-300',
  },
  {
    id: 'pakat_makan',
    label: 'Pakat Makan',
    emoji: '🍔🛵',
    phrase: 'Food runs & Semambu food court',
    category: 'CAMPUS',
    gradientClass: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/20',
    borderClass: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-300',
  },
  {
    id: 'nangis_katil',
    label: 'Nangis Tepi Katil',
    emoji: '🛏️💧',
    phrase: 'Academic setbacks & heartbreak',
    category: 'MOOD',
    gradientClass: 'from-sky-500/20 via-blue-500/15 to-indigo-500/20',
    borderClass: 'border-sky-500/40 text-sky-600 dark:text-sky-300',
  },
  {
    id: 'solidariti',
    label: 'Solidariti',
    emoji: '✊🔥',
    phrase: 'Student welfare support & unity',
    category: 'CAMPUS',
    gradientClass: 'from-amber-500/20 via-red-500/15 to-rose-500/20',
    borderClass: 'border-red-500/40 text-red-600 dark:text-red-300',
  },
  {
    id: 'deadline_esok',
    label: 'Deadline Esok',
    emoji: '⏳⚡',
    phrase: 'Last-minute submissions before 11:59 PM',
    category: 'STUDY',
    gradientClass: 'from-violet-500/20 via-purple-500/15 to-fuchsia-500/20',
    borderClass: 'border-violet-500/40 text-violet-600 dark:text-violet-300',
  },
  {
    id: 'geng_repeat',
    label: 'Geng Repeat',
    emoji: '🔄😅',
    phrase: 'Staying positive through retakes',
    category: 'MEME',
    gradientClass: 'from-teal-500/20 via-emerald-500/15 to-lime-500/20',
    borderClass: 'border-teal-500/40 text-teal-600 dark:text-teal-300',
  },
];

/**
 * The 6 core expressive reactions (WhatsApp style).
 */
export const REACTION_EMOJIS: Array<{ type: string; emoji: string; label: string }> = [
  { type: 'heart', emoji: '❤️', label: 'Suka' },
  { type: 'laugh', emoji: '😂', label: 'Lawak' },
  { type: 'fire', emoji: '🔥', label: 'Padu' },
  { type: 'cry', emoji: '😢', label: 'Sedih' },
  { type: 'shock', emoji: '😮', label: 'Terkejut' },
  { type: 'hundred', emoji: '💯', label: 'Solid' },
];

const STICKER_TOKEN_REGEX = /\[sticker:([a-zA-Z0-9_-]+)\]/;

/**
 * Extracts sticker token [sticker:id] from confession/comment content.
 */
export function extractStickerToken(content: string): { stickerId: string | null; cleanContent: string } {
  if (!content) {
    return { stickerId: null, cleanContent: '' };
  }
  const match = content.match(STICKER_TOKEN_REGEX);
  if (!match) {
    return { stickerId: null, cleanContent: content };
  }
  const stickerId = match[1];
  const cleanContent = content.replace(match[0], '').trim();
  return { stickerId, cleanContent };
}

/**
 * Embeds or replaces sticker token into confession/comment content.
 */
export function embedStickerToken(content: string, stickerId: string): string {
  const { cleanContent } = extractStickerToken(content || '');
  if (!stickerId) {
    return cleanContent;
  }
  if (!cleanContent) {
    return `[sticker:${stickerId}]`;
  }
  return `[sticker:${stickerId}] ${cleanContent}`;
}

/**
 * Strips legacy sticker tokens and spoiler markers from confession or comment content.
 */
export function cleanConfessionText(content: string): string {
  if (!content) return '';
  return content
    .replace(/\[sticker:[a-zA-Z0-9_-]+\]\s*/g, '')
    .replace(/\[spoiler-img\]\s*/g, '')
    .trim();
}

const SPOILER_IMG_TOKEN = '[spoiler-img]';

/**
 * Checks whether a confession marks its attached image as a spoiler/sensitive visual.
 */
export function hasSpoilerImageToken(content?: string | null): boolean {
  return Boolean(content && content.includes(SPOILER_IMG_TOKEN));
}

/**
 * Embeds or removes the [spoiler-img] marker cleanly from confession text.
 */
export function embedSpoilerImageToken(content: string, spoiler: boolean): string {
  const clean = (content || '').replace(/\[spoiler-img\]\s*/g, '').trim();
  if (!spoiler) return clean;
  return clean ? `${SPOILER_IMG_TOKEN} ${clean}` : SPOILER_IMG_TOKEN;
}

export interface CampusLocationLink {
  label: string;
  roomQuery: string;
}

const KNOWN_CAMPUS_LOCATIONS: Array<{ pattern: RegExp; label: string; roomQuery: string }> = [
  { pattern: /\bJTMK\b/i, label: 'JTMK', roomQuery: 'JTMK' },
  { pattern: /\bJKA\b/i, label: 'JKA', roomQuery: 'JKA' },
  { pattern: /\bJKM\b/i, label: 'JKM', roomQuery: 'JKM' },
  { pattern: /\bJKE\b/i, label: 'JKE', roomQuery: 'JKE' },
  { pattern: /\bJP\b/i, label: 'JP', roomQuery: 'JP' },
  { pattern: /\bKamsis\b/i, label: 'Kamsis', roomQuery: 'KAMSIS' },
  { pattern: /\bKafeteria\b/i, label: 'Kafeteria', roomQuery: 'KAFETERIA' },
  { pattern: /\bPerpustakaan\b/i, label: 'Perpustakaan', roomQuery: 'PERPUSTAKAAN' },
  { pattern: /\bDewan\s+Sri\s+Mahkota\b/i, label: 'Dewan Sri Mahkota', roomQuery: 'DSM' },
  { pattern: /\bDewan\s+Jubli\s+Perak\b/i, label: 'Dewan Jubli Perak', roomQuery: 'DJP' },
  { pattern: /\bPusat\s+Islam\b/i, label: 'Pusat Islam', roomQuery: 'PUSAT ISLAM' },
];

/**
 * Extracts up to 3 clickable POLISAS campus locations/room codes from confession copy for PolyMaps deep links.
 */
export function extractCampusLocations(content?: string | null): CampusLocationLink[] {
  if (!content) return [];
  const results: CampusLocationLink[] = [];
  const seenQueries = new Set<string>();

  for (const loc of KNOWN_CAMPUS_LOCATIONS) {
    if (loc.pattern.test(content) && !seenQueries.has(loc.roomQuery)) {
      seenQueries.add(loc.roomQuery);
      results.push({ label: loc.label, roomQuery: loc.roomQuery });
      if (results.length >= 3) return results;
    }
  }

  const roomMatches = content.match(/\b(BK\d{1,3}|MK\d{1,3}|A\d{3}|E\d{3})\b/gi);
  if (roomMatches) {
    for (const rawRoom of roomMatches) {
      const code = rawRoom.toUpperCase();
      if (!seenQueries.has(code)) {
        seenQueries.add(code);
        results.push({ label: code, roomQuery: code });
        if (results.length >= 3) break;
      }
    }
  }

  return results;
}

/**
 * Detects 2-option Agree vs Disagree debate polls ("Setuju vs Tidak" / "Agree vs Disagree").
 */
export function isDebatePollOptions(
  options?: Array<{ option_text: string }> | null
): boolean {
  if (!options || options.length !== 2) return false;
  const texts = options.map((o) => (o.option_text || '').trim());
  const hasAgree = texts.some((txt) => /^(setuju|agree)$/i.test(txt));
  const hasDisagree = texts.some((txt) => /^(tidak(\s+setuju)?|disagree)$/i.test(txt));
  return hasAgree && hasDisagree;
}

export type PolySuaraPostIntent = 'DEBATE' | 'QNA' | 'SHOUTOUT' | 'CIVIC' | 'STANDARD';

/**
 * Classifies a confession's community format from its poll options, hashtags, or category.
 */
export function detectPostIntent(confession: {
  content?: string | null;
  category?: string | null;
  hashtags?: string[] | null;
  polysuara_polls?: Array<{ polysuara_poll_options?: Array<{ option_text: string }> }> | null;
}): PolySuaraPostIntent {
  const pollOpts = confession.polysuara_polls?.[0]?.polysuara_poll_options;
  if (isDebatePollOptions(pollOpts)) {
    return 'DEBATE';
  }
  const combinedTags = `${confession.content || ''} ${(confession.hashtags || []).join(' ')}`;
  if (/#(apresiasi|terimakasih|shoutout)\b/i.test(combinedTags)) {
    return 'SHOUTOUT';
  }
  if (/#(tanyakampus|qna|soalan)\b/i.test(combinedTags)) {
    return 'QNA';
  }
  if (/#debat\b/i.test(combinedTags)) {
    return 'DEBATE';
  }
  if (confession.category === 'FASILITI' || confession.category === 'KAMSIS') {
    return 'CIVIC';
  }
  return 'STANDARD';
}

/**
 * Determines whether a confession should display the 4-step physical Campus Action Tracker.
 * Excludes informational OFFICIAL_NOTE / FACT_CHECK community notes and non-facility categories
 * unless explicitly escalated to INVESTIGATING.
 */
export function shouldShowCivicTracker(
  category?: string | null,
  status?: string | null
): boolean {
  const normalizedStatus = (status || '').toUpperCase();
  if (normalizedStatus === 'OFFICIAL_NOTE' || normalizedStatus === 'FACT_CHECK') {
    return false;
  }
  const isCivicCategory = category === 'FASILITI' || category === 'KAMSIS';
  return isCivicCategory || normalizedStatus === 'INVESTIGATING';
}

/**
 * Maps JPP confession action status to a 1-4 civic progress stage.
 */
export function getCivicProgressStep(status?: string | null): 1 | 2 | 3 | 4 {
  switch ((status || '').toUpperCase()) {
    case 'RESOLVED':
      return 4;
    case 'INVESTIGATING':
      return 3;
    case 'ACKNOWLEDGED':
      return 2;
    default:
      return 1;
  }
}

export interface EmpathyNudgeResult {
  triggered: boolean;
  reasonKey: 'phone' | 'matric' | 'personal_name' | null;
}

/**
 * Zero-cost client-side guard detecting accidental PII or named targets before anonymous submission.
 */
export function checkEmpathyNudge(content?: string | null): EmpathyNudgeResult {
  if (!content) return { triggered: false, reasonKey: null };
  if (/\b01\d[- ]?\d{7,8}\b/.test(content)) {
    return { triggered: true, reasonKey: 'phone' };
  }
  if (/\b\d{2}[A-Z]{2,4}\d{2}F\d{4}\b/i.test(content)) {
    return { triggered: true, reasonKey: 'matric' };
  }
  if (/\b[a-z]{3,}\s+(bin|binti|a\/l|a\/p)\s+[a-z]{3,}\b/i.test(content)) {
    return { triggered: true, reasonKey: 'personal_name' };
  }
  return { triggered: false, reasonKey: null };
}

const LEGACY_ANIMAL_KEYWORDS: string[] = [
  'kucing',
  'harimau',
  'helang',
  'elang',
  'singa',
  'serigala',
  'kuda',
  'beruang',
  'kancil',
  'gajah',
  'tupai',
  'kura',
  'lumba',
  'burung',
  'panda',
  'musang',
  'landak',
  'arnab',
  'koala',
  'rusa',
  'otter',
  'zirafah',
  'hantu',
];

export interface FriendlyPersona {
  displayName: string;
  name: string;
  emoji: string;
  bgClass: string;
  textClass: string;
  franchise: string;
}

/**
 * 70 curated fictional character personas across 7 franchises (10 characters per series)
 * for anonymous student interaction. Strictly zero legacy animal codenames or ghost icons.
 */
export const FRIENDLY_ANON_PERSONAS: FriendlyPersona[] = [
  // 1. The Legend of Korra (10)
  { displayName: 'Korra', name: 'Korra', emoji: 'K', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Mako', name: 'Mako', emoji: 'M', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Bolin', name: 'Bolin', emoji: 'B', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Asami', name: 'Asami', emoji: 'A', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Tenzin', name: 'Tenzin', emoji: 'T', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Lin Beifong', name: 'Lin Beifong', emoji: 'LB', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Jinora', name: 'Jinora', emoji: 'J', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Kuvira', name: 'Kuvira', emoji: 'K', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Varrick', name: 'Varrick', emoji: 'V', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },
  { displayName: 'Zaheer', name: 'Zaheer', emoji: 'Z', bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', textClass: 'text-teal-700 dark:text-teal-300', franchise: 'The Legend of Korra' },

  // 2. Avatar: The Last Airbender (10)
  { displayName: 'Aang', name: 'Aang', emoji: 'A', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Katara', name: 'Katara', emoji: 'K', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Sokka', name: 'Sokka', emoji: 'S', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Toph', name: 'Toph', emoji: 'T', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Zuko', name: 'Zuko', emoji: 'Z', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Iroh', name: 'Iroh', emoji: 'I', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Azula', name: 'Azula', emoji: 'A', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Suki', name: 'Suki', emoji: 'S', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Appa', name: 'Appa', emoji: 'A', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },
  { displayName: 'Momo', name: 'Momo', emoji: 'M', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', textClass: 'text-sky-700 dark:text-sky-300', franchise: 'Avatar: The Last Airbender' },

  // 3. One Piece (10)
  { displayName: 'Monkey D. Luffy', name: 'Monkey D. Luffy', emoji: 'MDL', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Roronoa Zoro', name: 'Roronoa Zoro', emoji: 'RZ', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Nami', name: 'Nami', emoji: 'N', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Usopp', name: 'Usopp', emoji: 'U', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Sanji', name: 'Sanji', emoji: 'S', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Tony Tony Chopper', name: 'Tony Tony Chopper', emoji: 'TTC', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Nico Robin', name: 'Nico Robin', emoji: 'NR', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Franky', name: 'Franky', emoji: 'F', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Brook', name: 'Brook', emoji: 'B', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },
  { displayName: 'Jinbe', name: 'Jinbe', emoji: 'J', bgClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', textClass: 'text-red-700 dark:text-red-300', franchise: 'One Piece' },

  // 4. Sword Art Online (10)
  { displayName: 'Kirito', name: 'Kirito', emoji: 'K', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Asuna', name: 'Asuna', emoji: 'A', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Yui', name: 'Yui', emoji: 'Y', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Sinon', name: 'Sinon', emoji: 'S', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Leafa', name: 'Leafa', emoji: 'L', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Klein', name: 'Klein', emoji: 'K', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Eugeo', name: 'Eugeo', emoji: 'E', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Alice Zuberg', name: 'Alice Zuberg', emoji: 'AZ', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Yuuki Konno', name: 'Yuuki Konno', emoji: 'YK', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },
  { displayName: 'Agil', name: 'Agil', emoji: 'A', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', textClass: 'text-violet-700 dark:text-violet-300', franchise: 'Sword Art Online' },

  // 5. Harry Potter (10)
  { displayName: 'Harry Potter', name: 'Harry Potter', emoji: 'HP', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Hermione Granger', name: 'Hermione Granger', emoji: 'HG', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Ron Weasley', name: 'Ron Weasley', emoji: 'RW', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Albus Dumbledore', name: 'Albus Dumbledore', emoji: 'AD', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Severus Snape', name: 'Severus Snape', emoji: 'SS', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Luna Lovegood', name: 'Luna Lovegood', emoji: 'LL', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Neville Longbottom', name: 'Neville Longbottom', emoji: 'NL', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Draco Malfoy', name: 'Draco Malfoy', emoji: 'DM', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Minerva McGonagall', name: 'Minerva McGonagall', emoji: 'MM', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },
  { displayName: 'Sirius Black', name: 'Sirius Black', emoji: 'SB', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', textClass: 'text-amber-700 dark:text-amber-300', franchise: 'Harry Potter' },

  // 6. BoBoiBoy (10)
  { displayName: 'BoBoiBoy', name: 'BoBoiBoy', emoji: 'BBB', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Yaya', name: 'Yaya', emoji: 'Y', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Ying', name: 'Ying', emoji: 'Y', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Gopal', name: 'Gopal', emoji: 'G', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Fang', name: 'Fang', emoji: 'F', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Ochobot', name: 'Ochobot', emoji: 'O', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Papa Zola', name: 'Papa Zola', emoji: 'PZ', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Tok Aba', name: 'Tok Aba', emoji: 'TA', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Adu Du', name: 'Adu Du', emoji: 'AD', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },
  { displayName: 'Kapten Kaizo', name: 'Kapten Kaizo', emoji: 'KK', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', textClass: 'text-orange-700 dark:text-orange-300', franchise: 'BoBoiBoy' },

  // 7. Ejen Ali (10)
  { displayName: 'Ejen Ali', name: 'Ejen Ali', emoji: 'EA', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Alicia', name: 'Ejen Alicia', emoji: 'AL', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Bakar', name: 'Ejen Bakar', emoji: 'EB', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Rizwan', name: 'Ejen Rizwan', emoji: 'ER', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Khai', name: 'Ejen Khai', emoji: 'EK', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Iman', name: 'Ejen Iman', emoji: 'EI', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Moon', name: 'Ejen Moon', emoji: 'EM', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Rudy', name: 'Ejen Rudy', emoji: 'RY', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'Ejen Geetha', name: 'Ejen Geetha', emoji: 'EG', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
  { displayName: 'General Rama', name: 'General Rama', emoji: 'GR', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200', textClass: 'text-cyan-700 dark:text-cyan-300', franchise: 'Ejen Ali' },
];

const DEFAULT_AVATAR: AnimalAvatar = {
  emoji: FRIENDLY_ANON_PERSONAS[0].emoji,
  bgClass: FRIENDLY_ANON_PERSONAS[0].bgClass,
  textClass: FRIENDLY_ANON_PERSONAS[0].textClass,
};

function hashPersonaIndex(input: string): number {
  let hash = 0;
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return hash % FRIENDLY_ANON_PERSONAS.length;
}

/**
 * Checks whether a codename contains any legacy animal word (e.g. "Kucing Oren", "Burung Hantu").
 */
export function isLegacyAnimalCodename(codename?: string | null): boolean {
  if (!codename || typeof codename !== 'string') return false;
  const lower = codename.toLowerCase();
  return LEGACY_ANIMAL_KEYWORDS.some((kw) => new RegExp(`\\b${kw}`, 'i').test(lower));
}

/**
 * Normalizes any PolySuara codename (Anon-xxxxx hashes, legacy animal codenames from older DB rows,
 * or modern fictional personas) into a clean fictional persona display name, emblem, and styling.
 * Guarantees zero animal names ever appear in the UI.
 */
export function normalizePolySuaraCodename(
  codename?: string | null,
  isOP?: boolean
): { displayName: string; name: string; emoji: string; bgClass: string; textClass: string; isOP: boolean } {
  if (!codename || typeof codename !== 'string' || !codename.trim()) {
    const fallbackPersona = FRIENDLY_ANON_PERSONAS[0];
    return {
      displayName: fallbackPersona.displayName,
      name: fallbackPersona.displayName,
      emoji: fallbackPersona.emoji,
      bgClass: fallbackPersona.bgClass,
      textClass: fallbackPersona.textClass,
      isOP: Boolean(isOP),
    };
  }

  const hasPenulisTag = codename.includes('[Penulis]');
  const isOriginalPoster = Boolean(isOP || hasPenulisTag);
  const cleanName = codename.replace(/\[Penulis\]/gi, '').trim();

  if (!cleanName) {
    const fallbackPersona = FRIENDLY_ANON_PERSONAS[0];
    return {
      displayName: fallbackPersona.displayName,
      name: fallbackPersona.displayName,
      emoji: fallbackPersona.emoji,
      bgClass: fallbackPersona.bgClass,
      textClass: fallbackPersona.textClass,
      isOP: isOriginalPoster,
    };
  }

  // Exact match to one of the 70 curated fictional character personas
  const exactPersona = FRIENDLY_ANON_PERSONAS.find(
    (p) => p.displayName.toLowerCase() === cleanName.toLowerCase()
  );
  if (exactPersona) {
    return {
      displayName: exactPersona.displayName,
      name: exactPersona.displayName,
      emoji: exactPersona.emoji,
      bgClass: exactPersona.bgClass,
      textClass: exactPersona.textClass,
      isOP: isOriginalPoster,
    };
  }

  // Strict allowlist: deterministically remap EVERY non-exact codename
  // (Anon-xxxxx hashes, UUID/hex hashes, legacy animal names, or any unknown/custom string)
  // onto the 70 curated fictional character personas so raw uncurated labels can never leak.
  const persona = FRIENDLY_ANON_PERSONAS[hashPersonaIndex(cleanName)];
  return {
    displayName: persona.displayName,
    name: persona.displayName,
    emoji: persona.emoji,
    bgClass: persona.bgClass,
    textClass: persona.textClass,
    isOP: isOriginalPoster,
  };
}

/**
 * Derives non-animal persona emblem and styling from an anonymous codename.
 * Deterministically maps legacy animal codenames and Anon hashes to curated fictional personas.
 */
export function getAnimalAvatarFromCodename(codename?: string): AnimalAvatar {
  if (!codename || typeof codename !== 'string' || !codename.trim()) {
    return DEFAULT_AVATAR;
  }
  const cleanName = codename.replace(/\[Penulis\]/gi, '').trim();
  if (!cleanName || /^pelajar anon$/i.test(cleanName) || /^anonymous student$/i.test(cleanName)) {
    return DEFAULT_AVATAR;
  }
  const normalized = normalizePolySuaraCodename(cleanName);
  return {
    emoji: normalized.emoji,
    bgClass: normalized.bgClass,
    textClass: normalized.textClass,
  };
}

/**
 * Deterministically maps anonymous hashes (e.g. "Anon-eb689") and legacy animal codenames
 * into curated fictional campus personas while stripping [Penulis] tags and preserving OP status.
 */
export function getFriendlyAnonName(
  codename?: string,
  isOP?: boolean
): { displayName: string; name: string; emoji: string; bgClass: string; isOP?: boolean } {
  const persona = normalizePolySuaraCodename(codename, isOP);
  return {
    displayName: persona.displayName,
    name: persona.name,
    emoji: persona.emoji,
    bgClass: persona.bgClass,
    isOP: persona.isOP,
  };
}

/**
 * Aggregates a list of raw reaction entries into ReactionSummary objects.
 * Only returns reactions that have at least 1 count.
 */
export function aggregateReactions(
  reactions: Array<{ reaction_type: string; user_id?: string }>,
  currentUserId?: string
): ReactionSummary[] {
  if (!Array.isArray(reactions) || reactions.length === 0) {
    return [];
  }

  const map = new Map<string, { count: number; userReacted: boolean }>();

  for (const r of reactions) {
    if (!r || !r.reaction_type) continue;
    const existing = map.get(r.reaction_type) || { count: 0, userReacted: false };
    existing.count += 1;
    if (currentUserId && r.user_id === currentUserId) {
      existing.userReacted = true;
    }
    map.set(r.reaction_type, existing);
  }

  const result: ReactionSummary[] = [];

  for (const item of REACTION_EMOJIS) {
    const stats = map.get(item.type);
    if (stats && stats.count > 0) {
      result.push({
        type: item.type,
        emoji: item.emoji,
        label: item.label,
        count: stats.count,
        userReacted: stats.userReacted,
      });
      map.delete(item.type);
    }
  }

  // Any custom or unrecognized reactions
  for (const [type, stats] of map.entries()) {
    if (stats.count > 0) {
      result.push({
        type,
        emoji: '✨',
        label: type,
        count: stats.count,
        userReacted: stats.userReacted,
      });
    }
  }

  return result;
}

/**
 * Checks whether a given timestamp is within the last 1 hour (60 minutes).
 * Used for author self-delete grace period in PolySuara confessions and comments.
 */
export function isWithin1Hour(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (isNaN(time)) return false;
  const diffMs = Date.now() - time;
  return diffMs >= 0 && diffMs <= 60 * 60 * 1000;
}
