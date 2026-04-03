/**
 * ─── JPP-POLISAS Query Cache ─────────────────────────────────────────────────
 * In-memory cache dengan TTL untuk mengurangkan database hits.
 * Semasa 800+ pengguna serentak, cache ini menghalang queries berulang
 * untuk data yang jarang berubah (announcements, leaderboard, club info).
 *
 * Cache akan clear secara automatik apabila data dikemaskini (via invalidate).
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Dapatkan data dari cache. Return null jika tiada atau sudah expired. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** Simpan data dalam cache dengan TTL (ms). */
  set<T>(key: string, data: T, ttlMs = 30_000): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  /** Padam semua entries yang bermula dengan prefix. */
  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Padam SEMUA cache (contoh: lepas sign out). */
  clear(): void {
    this.store.clear();
  }

  /** Debug: lihat berapa entries dalam cache. */
  get size(): number {
    return this.store.size;
  }
}

/** Singleton cache instance untuk keseluruhan app. */
export const queryCache = new QueryCache();

/**
 * TTL (Time-To-Live) configs — berapa lama data boleh di-cache
 * sebelum di-fetch semula dari database.
 */
export const CACHE_TTL = {
  /** Pengumuman — jarang berubah, cache 5 minit */
  ANNOUNCEMENT: 5 * 60 * 1000,
  /** Data dashboard (tasks, activities, programs) — 30 saat */
  DASHBOARD: 30 * 1000,
  /** Senarai ahli kelab — 2 minit */
  MEMBERS: 2 * 60 * 1000,
  /** Leaderboard global — 10 minit */
  LEADERBOARD: 10 * 60 * 1000,
  /** Kiraan undi karnival — 5 saat (real-time feel) */
  VOTE_COUNT: 5 * 1000,
  /** Settings sistem (karnival mode, allow_add_takwim, dll.) — 1 minit */
  SETTINGS: 60 * 1000,
} as const;
