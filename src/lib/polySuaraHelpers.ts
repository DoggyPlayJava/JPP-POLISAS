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
 * Strips legacy sticker tokens from confession or comment content.
 */
export function cleanConfessionText(content: string): string {
  if (!content) return '';
  return content.replace(/\[sticker:[a-zA-Z0-9_-]+\]\s*/g, '').trim();
}

const ANIMAL_AVATAR_MAP: Record<string, AnimalAvatar> = {
  kucing: {
    emoji: '🐱',
    bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  harimau: {
    emoji: '🐯',
    bgClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  elang: {
    emoji: '🦅',
    bgClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  singa: {
    emoji: '🦁',
    bgClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    textClass: 'text-yellow-600 dark:text-yellow-400',
  },
  serigala: {
    emoji: '🐺',
    bgClass: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
    textClass: 'text-slate-600 dark:text-slate-300',
  },
  kuda: {
    emoji: '🐴',
    bgClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300',
    textClass: 'text-stone-600 dark:text-stone-400',
  },
  beruang: {
    emoji: '🐻',
    bgClass: 'bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  kancil: {
    emoji: '🦌',
    bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  gajah: {
    emoji: '🐘',
    bgClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    textClass: 'text-indigo-600 dark:text-indigo-400',
  },
  tupai: {
    emoji: '🐿️',
    bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-600/20 dark:text-orange-300',
    textClass: 'text-orange-700 dark:text-orange-400',
  },
  kura: {
    emoji: '🐢',
    bgClass: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    textClass: 'text-green-600 dark:text-green-400',
  },
  lumba: {
    emoji: '🐬',
    bgClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    textClass: 'text-cyan-600 dark:text-cyan-400',
  },
  burung: {
    emoji: '🦜',
    bgClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
    textClass: 'text-teal-600 dark:text-teal-400',
  },
  panda: {
    emoji: '🐼',
    bgClass: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700/50 dark:text-zinc-200',
    textClass: 'text-zinc-700 dark:text-zinc-300',
  },
  musang: {
    emoji: '🦊',
    bgClass: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    textClass: 'text-red-600 dark:text-red-400',
  },
  landak: {
    emoji: '🦔',
    bgClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    textClass: 'text-violet-600 dark:text-violet-400',
  },
};

const DEFAULT_AVATAR: AnimalAvatar = {
  emoji: '👻',
  bgClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  textClass: 'text-slate-500 dark:text-slate-400',
};

/**
 * Derives dynamic animal avatar and styling from anonymous codename.
 * e.g. "Kucing Misteri" -> 🐱, "Harimau Berani" -> 🐯, "Musang Pantas" -> 🦊
 * Fallback to 👻 if codename is absent or unrecognized.
 */
export function getAnimalAvatarFromCodename(codename?: string): AnimalAvatar {
  if (!codename || typeof codename !== 'string') {
    return DEFAULT_AVATAR;
  }

  const normalized = codename.trim().toLowerCase();
  for (const [key, avatar] of Object.entries(ANIMAL_AVATAR_MAP)) {
    if (normalized.includes(key)) {
      return avatar;
    }
  }

  return DEFAULT_AVATAR;
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
        count: stats.count,
        userReacted: stats.userReacted,
      });
    }
  }

  return result;
}
