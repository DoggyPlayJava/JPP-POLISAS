import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────
export interface KarnivalEdition {
  id: string;
  name: string;
  tagline: string | null;
  edition_year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  voting_enabled: boolean;
  results_published: boolean;
  cover_image_url: string | null;
  created_at: string;
}

export interface KarnivalCategory {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  icon_emoji: string;
  max_votes: number;
  sort_order: number;
  is_active: boolean;
}

export interface KarnivalBooth {
  id: string;
  edition_id: string;
  category_id: string;
  kelab_id: string | null;
  kelab_name: string;
  booth_number: string | null;
  theme: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

// ─── Context Shape ───────────────────────────────────────────
interface KarnivalContextValue {
  edition: KarnivalEdition | null;
  categories: KarnivalCategory[];
  booths: KarnivalBooth[];
  isActive: boolean;
  votingOpen: boolean;
  resultsOut: boolean;
  showKarnival: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  refetch: () => void;
  enableRealtime: () => void;
  disableRealtime: () => void;
}

const KarnivalContext = createContext<KarnivalContextValue>({
  edition: null,
  categories: [],
  booths: [],
  isActive: false,
  votingOpen: false,
  resultsOut: false,
  showKarnival: false,
  isLoading: true,
  lastUpdated: null,
  refetch: () => {},
  enableRealtime: () => {},
  disableRealtime: () => {},
});

// ─── Provider ────────────────────────────────────────────────
export function KarnivalProvider({ children }: { children: React.ReactNode }) {
  const [edition,     setEdition]     = useState<KarnivalEdition | null>(null);
  const [categories,  setCategories]  = useState<KarnivalCategory[]>([]);
  const [booths,      setBooths]      = useState<KarnivalBooth[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  const fetchAll = useCallback(async () => {
    const { data: editionData } = await supabase
      .from('karnival_editions')
      .select('*')
      .order('edition_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!editionData) {
      setEdition(null);
      setCategories([]);
      setBooths([]);
      setIsLoading(false);
      setLastUpdated(new Date());
      return;
    }
    setEdition(editionData);

    const [catRes, boothRes] = await Promise.all([
      supabase
        .from('karnival_categories')
        .select('*')
        .eq('edition_id', editionData.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('karnival_booths')
        .select('*')
        .eq('edition_id', editionData.id)
        .eq('is_active', true)
        .order('booth_number'),
    ]);

    if (catRes.data)   setCategories(catRes.data as KarnivalCategory[]);
    if (boothRes.data) setBooths(boothRes.data as KarnivalBooth[]);
    setIsLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [fetchAll]);

  const enableRealtime = useCallback(() => {
    if (realtimeChannelRef.current) return;
    const channel = supabase
      .channel('karnival_admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'karnival_votes_v2' },   () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'karnival_editions' },    () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'karnival_booths' },      () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'karnival_categories' },  () => fetchAll())
      .subscribe();
    realtimeChannelRef.current = channel;
  }, [fetchAll]);

  const disableRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  useEffect(() => () => { disableRealtime(); }, [disableRealtime]);

  return (
    <KarnivalContext.Provider value={{
      edition, categories, booths,
      isActive:      !!edition?.is_active,
      votingOpen:    !!edition?.is_active && !!edition?.voting_enabled,
      resultsOut:    !!edition?.results_published,
      showKarnival:  !!edition?.is_active,
      isLoading, lastUpdated,
      refetch: fetchAll,
      enableRealtime,
      disableRealtime,
    }}>
      {children}
    </KarnivalContext.Provider>
  );
}

export function useKarnival() {
  return useContext(KarnivalContext);
}

// Lightweight hook untuk PortalPage — tanpa KarnivalProvider penuh
export interface KarnivalStatusResult {
  isActive: boolean;
  name: string;
  tagline: string | null;
  endDate: string | null;
  votingEnabled: boolean;
}

export function useKarnivalStatus() {
  const [status, setStatus] = useState<KarnivalStatusResult | null>(null);

  useEffect(() => {
    supabase
      .from('karnival_editions')
      .select('is_active, name, tagline, end_date, voting_enabled')
      .eq('is_active', true)
      .order('edition_year', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStatus({
            isActive: true,
            name: data.name,
            tagline: data.tagline ?? null,
            endDate: data.end_date ?? null,
            votingEnabled: !!data.voting_enabled,
          });
        } else {
          setStatus({ isActive: false, name: '', tagline: null, endDate: null, votingEnabled: false });
        }
      });
  }, []);

  return status;
}
