/**
 * BusinessSwitcherContext
 *
 * Konsep — sama seperti Club Switcher dalam e-KPP:
 *   • Student biasa   → auto-select business pertama yang ACTIVE mereka miliki
 *   • SUPER_ADMIN_JPP → boleh switch antara semua business yang ACTIVE
 *   • JPP unit=KEUSAHAWANAN → sama seperti SUPER_ADMIN_JPP
 *   • keusahawanan_unit_admins → sama seperti SUPER_ADMIN_JPP
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { KeusahawananBusiness } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessSwitcherContextValue {
  /** Business yang sedang dipilih/dipantau */
  selectedBusiness:    KeusahawananBusiness | null;
  /** ID shortcut */
  selectedBusinessId:  string | undefined;
  /** Tukar business yang dipantau (admin/unit keusahawanan sahaja) */
  setSelectedBusinessId: (id: string) => void;
  /** Semua business aktif (untuk dropdown switcher) */
  allBusinesses:       KeusahawananBusiness[];
  /** True jika user boleh switch business */
  canSwitch:           boolean;
  /** True jika user adalah Unit Keusahawanan (bukan JPP tapi ada akses penuh) */
  isUnitKeusahawanan:  boolean;
  /** Menggabungkan semua jenis 'admin' akses keusahawanan */
  isKeusahawananAdmin: boolean;
  /** Loading state */
  isLoading:           boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const BusinessSwitcherContext = createContext<BusinessSwitcherContextValue>({
  selectedBusiness:      null,
  selectedBusinessId:    undefined,
  setSelectedBusinessId: () => {},
  allBusinesses:         [],
  canSwitch:             false,
  isUnitKeusahawanan:    false,
  isKeusahawananAdmin:   false,
  isLoading:             true,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function BusinessSwitcherProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isSuperAdmin } = useAuth();

  const [allBusinesses,     setAllBusinesses]     = useState<KeusahawananBusiness[]>([]);
  const [myBusinessId,      setMyBusinessId]       = useState<string | undefined>(undefined);
  const [selectedId,        setSelectedId]         = useState<string | undefined>(undefined);
  const [isUnitKeusahawanan, setIsUnitKeusahawanan] = useState(false);
  const [isLoading,         setIsLoading]          = useState(true);

  // ── Derived flags ─────────────────────────────────────────────────────────

  const isExcoKeusahawanan =
    profile?.role === 'JPP' && profile?.jpp_unit === 'KEUSAHAWANAN';

  const isKeusahawananAdmin =
    isSuperAdmin || isExcoKeusahawanan || isUnitKeusahawanan;

  const canSwitch = isKeusahawananAdmin;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Check if user is in keusahawanan_unit_admins
      const { data: unitAdmin } = await supabase
        .from('keusahawanan_unit_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsUnitKeusahawanan(!!unitAdmin);
      const isAdmin = isSuperAdmin || isExcoKeusahawanan || !!unitAdmin;

      // 2. Fetch all ACTIVE businesses (for switcher dropdown)
      if (isAdmin) {
        const { data: bizList } = await supabase
          .from('keusahawanan_businesses')
          .select(`
            *,
            category:keusahawanan_categories(*),
            owner:profiles!keusahawanan_businesses_owner_id_fkey(id, full_name, avatar_url)
          `)
          .eq('status', 'ACTIVE')
          .eq('is_active', true)
          .order('name');
        setAllBusinesses(bizList || []);

        // Start on first business (or keep existing selection)
        setSelectedId(prev => prev || bizList?.[0]?.id);
      } else {
        // 3. For regular students — get their own ACTIVE membership's business
        const { data: mem } = await supabase
          .from('student_business_memberships')
          .select(`
            business:keusahawanan_businesses(
              *,
              category:keusahawanan_categories(*),
              owner:profiles!keusahawanan_businesses_owner_id_fkey(id, full_name, avatar_url)
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        const biz = (mem?.business as unknown) as KeusahawananBusiness | null;
        if (biz) {
          setAllBusinesses([biz]);
          setSelectedId(biz.id);
          setMyBusinessId(biz.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isSuperAdmin, isExcoKeusahawanan]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived selected business ─────────────────────────────────────────────

  const selectedBusiness = allBusinesses.find(b => b.id === selectedId) ?? null;

  // ── Context value ─────────────────────────────────────────────────────────

  return (
    <BusinessSwitcherContext.Provider value={{
      selectedBusiness,
      selectedBusinessId:    selectedId,
      setSelectedBusinessId: setSelectedId,
      allBusinesses,
      canSwitch,
      isUnitKeusahawanan,
      isKeusahawananAdmin,
      isLoading,
    }}>
      {children}
    </BusinessSwitcherContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBusinessSwitcher() {
  return useContext(BusinessSwitcherContext);
}
