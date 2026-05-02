// ============================================================
// useKlkDynamicFields — Shared hook untuk fetch soalan dinamik
// + kawasan dari klk_form_fields & klk_kawasan
// Cache 5 minit in-memory supaya tidak fetch berulang kali
// ============================================================
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface KlkFormField {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'checkbox';
  options: string[] | null;
  is_required: boolean;
  applies_to: 'LUAR' | 'KAMSIS' | 'SEMUA';
  sort_order: number;
}

export interface KlkKawasan {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

// In-memory cache
let _cachedFields: KlkFormField[] | null = null;
let _cachedKawasan: KlkKawasan[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minit

// Fallback kawasan jika DB belum ready
const FALLBACK_KAWASAN = [
  'SEMAMBU', 'TAMAN TAS', 'KUBANG BUAYA', 'ALOR AKAR',
  'AIR PUTIH', 'BUKIT SEKILAU', 'INDERA MAHKOTA', 'SUNGAI ISAP',
  'BUKIT RANGIN', 'PERMATANG BADAK', 'PELINDUNG', 'BESERAH',
  'BUKIT GOH', 'KOTASAS', 'BANDAR DAMANSARA',
];

export function useKlkDynamicFields(tinggalLuar: boolean) {
  const [fields, setFields] = useState<KlkFormField[]>(_cachedFields ?? []);
  const [kawasanList, setKawasanList] = useState<string[]>(
    _cachedKawasan?.filter(k => k.is_active).map(k => k.name) ?? FALLBACK_KAWASAN
  );
  const [loading, setLoading] = useState(!_cachedFields);

  useEffect(() => {
    const now = Date.now();
    if (_cachedFields && _cachedKawasan && now - _cacheTime < CACHE_TTL) {
      // Pakai cache
      setFields(filterFields(_cachedFields, tinggalLuar));
      setKawasanList(_cachedKawasan.filter(k => k.is_active).map(k => k.name));
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [fieldsRes, kawasanRes] = await Promise.all([
          supabase.from('klk_form_fields')
            .select('id,field_key,label,field_type,options,is_required,applies_to,sort_order')
            .eq('is_active', true)
            .order('sort_order').order('created_at'),
          supabase.from('klk_kawasan')
            .select('id,name,is_active,sort_order')
            .eq('is_active', true)
            .order('sort_order').order('name'),
        ]);

        if (cancelled) return;

        // Handle DB not ready (42P01 = table not exist)
        if (fieldsRes.error?.code === '42P01' || kawasanRes.error?.code === '42P01') {
          setLoading(false);
          return;
        }

        const fetchedFields = (fieldsRes.data ?? []) as KlkFormField[];
        const fetchedKawasan = (kawasanRes.data ?? []) as KlkKawasan[];

        _cachedFields = fetchedFields;
        _cachedKawasan = fetchedKawasan;
        _cacheTime = Date.now();

        setFields(filterFields(fetchedFields, tinggalLuar));
        setKawasanList(
          fetchedKawasan.length > 0
            ? fetchedKawasan.map(k => k.name)
            : FALLBACK_KAWASAN
        );
      } catch {
        // Fail gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tinggalLuar]);

  return { fields, kawasanList, loading };
}

// Filter soalan ikut status kediaman pelajar
function filterFields(fields: KlkFormField[], tinggalLuar: boolean): KlkFormField[] {
  return fields.filter(f => {
    if (f.applies_to === 'SEMUA') return true;
    if (f.applies_to === 'LUAR') return tinggalLuar;
    if (f.applies_to === 'KAMSIS') return !tinggalLuar;
    return false;
  });
}
