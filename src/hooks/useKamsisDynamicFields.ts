// ============================================================
// useKamsisDynamicFields — Hook untuk fetch soalan dinamik asrama
// ============================================================
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface KamsisFormField {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'checkbox';
  options: string[] | null;
  is_required: boolean;
  display_order: number;
}

// In-memory cache
let _cachedFields: KamsisFormField[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minit

export function useKamsisDynamicFields() {
  const [fields, setFields] = useState<KamsisFormField[]>(_cachedFields ?? []);
  const [loading, setLoading] = useState(!_cachedFields);

  useEffect(() => {
    const now = Date.now();
    if (_cachedFields && now - _cacheTime < CACHE_TTL) {
      setFields(_cachedFields);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kamsis_dynamic_fields')
          .select('id,field_key,label,field_type,options,is_required,display_order')
          .order('display_order').order('created_at');

        if (cancelled) return;

        // Handle DB not ready (42P01 = table not exist)
        if (error?.code === '42P01') {
          setLoading(false);
          return;
        }

        const fetchedFields = (data ?? []) as KamsisFormField[];
        _cachedFields = fetchedFields;
        _cacheTime = Date.now();

        setFields(fetchedFields);
      } catch {
        // Fail gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Also expose a way to manually refetch/refresh for settings page
  const refresh = async () => {
    setLoading(true);
    _cacheTime = 0; // invalidate
    const { data } = await supabase
      .from('kamsis_dynamic_fields')
      .select('id,field_key,label,field_type,options,is_required,display_order')
      .order('display_order').order('created_at');
    if (data) {
      _cachedFields = data as KamsisFormField[];
      _cacheTime = Date.now();
      setFields(data as KamsisFormField[]);
    }
    setLoading(false);
  };

  return { fields, loading, refresh };
}
