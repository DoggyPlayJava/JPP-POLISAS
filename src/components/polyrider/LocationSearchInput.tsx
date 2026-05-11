import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader, X } from 'lucide-react';
import { queryCache } from '@/lib/cache';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    amenity?: string;
    building?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
  };
}

interface LocationResult {
  name: string;       // short human-readable name
  fullName: string;   // full display_name
  lat: number;
  lng: number;
}

interface PresetLocation {
  id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  icon?: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (result: LocationResult) => void;
  placeholder?: string;
  label?: string;
  color?: 'blue' | 'rose';
  /** Admin presets — used as local fallback when Nominatim is unavailable */
  presets?: PresetLocation[];
}

function buildShortName(result: NominatimResult): string {
  const addr = result.address || {};
  return (
    addr.amenity ||
    addr.building ||
    addr.road ||
    addr.neighbourhood ||
    addr.suburb ||
    addr.village ||
    addr.town ||
    addr.city ||
    result.display_name.split(',')[0]
  );
}

export function LocationSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Cari lokasi...',
  label,
  color = 'blue',
  presets = [],
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. from GPS detect)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fuzzy-match presets locally (instant, no network)
  const matchPresets = useCallback((q: string): LocationResult[] => {
    if (!presets.length || q.length < 2) return [];
    const lower = q.toLowerCase();
    return presets
      .filter(p => p.label.toLowerCase().includes(lower) || p.address.toLowerCase().includes(lower))
      .filter(p => p.lat && p.lng)
      .map(p => ({
        name: `${p.icon || '📍'} ${p.label}`,
        fullName: p.address,
        lat: p.lat!,
        lng: p.lng!,
      }));
  }, [presets]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const cacheKey = `nominatim_search_${q.toLowerCase().trim()}`;
    const cached = queryCache.get<LocationResult[]>(cacheKey);
    if (cached) {
      setResults(cached);
      setIsOpen(true);
      return;
    }

    // Show local preset matches instantly while Nominatim loads
    const presetMatches = matchPresets(q);
    if (presetMatches.length > 0) {
      setResults(presetMatches);
      setIsOpen(true);
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=my&accept-language=ms`,
        { headers: { 'User-Agent': 'JPP-POLISAS-PolyRider/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      const mapped: LocationResult[] = data.map((r) => ({
        name: buildShortName(r),
        fullName: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
      // Merge: preset matches first, then Nominatim (dedupe by name)
      const presetNames = new Set(presetMatches.map(p => p.name));
      const combined = [...presetMatches, ...mapped.filter(m => !presetNames.has(m.name))];
      queryCache.set(cacheKey, combined, 30 * 60 * 1000); // 30 min TTL
      setResults(combined);
      setIsOpen(combined.length > 0);
    } catch {
      // Nominatim down — fallback to presets only
      if (presetMatches.length === 0) setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [matchPresets]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: LocationResult) => {
    setQuery(result.name);
    setIsOpen(false);
    setResults([]);
    onSelect(result);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setResults([]);
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ringColor = color === 'rose'
    ? 'focus-within:border-rose-500/50 focus-within:ring-rose-500/20'
    : 'focus-within:border-blue-500/50 focus-within:ring-blue-500/20';

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Input */}
      <div className={`bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-white/5 rounded-2xl p-2.5 flex items-center gap-2 transition-colors focus-within:ring-1 ${ringColor}`}>
        <div className="flex-1 px-1">
          {label && (
            <p className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">
              {label}
            </p>
          )}
          <input
            type="text"
            placeholder={placeholder}
            className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none focus:ring-0 p-0"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
            autoComplete="off"
          />
        </div>
        {isLoading ? (
          <Loader className="w-4 h-4 text-slate-400 dark:text-white/30 animate-spin shrink-0" />
        ) : query ? (
          <button onClick={handleClear} className="p-1 text-slate-300 dark:text-white/20 hover:text-slate-500 dark:hover:text-white/50 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Search className="w-4 h-4 text-slate-300 dark:text-white/20 shrink-0" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[200] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-none"
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${color === 'rose' ? 'text-rose-400' : 'text-blue-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-white/40 truncate mt-0.5">{r.fullName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
