import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { UserRole, setGlobalClubs } from '@/types';
import { useNavigate } from 'react-router-dom';

// Simpan data keahlian penuh per kelab (untuk multi-role)
interface ClubMembership {
  club_id: string;
  role: string;
  is_primary: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  // Role flags — KINI BERDASARKAN selectedClubId (bukan profiles.role)
  isSuperAdmin: boolean;
  isAdvisor: boolean;
  isPresident: boolean;
  isMT: boolean;
  isMember: boolean;
  effectiveRole: string;           // Role sebenar untuk kelab yang dipilih
  // Multi-kelab support
  userClubIds: string[];           // Semua kelab yang diluluskan
  userMemberships: ClubMembership[]; // Data penuh keahlian (club_id + role)
  primaryClubId: string | null;    // Kelab utama (dari profiles.club_id)
  selectedClubId: string | null;   // Kelab yang sedang dilihat (untuk switcher)
  setSelectedClubId: (id: string) => void;
  hasKppAccess: boolean;           // SuperAdmin || KPP Exco || MT assigned to KPP
  isKppExco: boolean;
  hasKeusahawananAccess: boolean;  // SuperAdmin || Keusahawanan Exco || MT assigned to KEUSAHAWANAN || Unit Keusahawanan Admin
  isKeusahawananExco: boolean;
  hasKediamanAccess: boolean;      // SuperAdmin || Kediaman Exco (jpp_unit='KK') || MT assigned to KK || YDP || Unit Pengurusan Asrama admin
  isKediamanExco: boolean;
  hasKebajikanAccess: boolean;     // SuperAdmin || Kebajikan Exco (jpp_unit='KEBAJIKAN') || YDP || Unit Kebajikan Staff
  hasKebajikanKKAccess: boolean;   // SuperAdmin || KK Exco || MT assigned to KK || YDP (akses tiket kafeteria)
  isKebajikanExco: boolean;
  isUnitKebajikanStaff: boolean;   // Staff yang diassign dalam kebajikan_staff_assignments
  isJppMember: boolean;
  isYdp: boolean;                  // YDP / YANG_DIPERTUA — oversee semua unit
  refetchProfile: () => Promise<void>;
  refreshClubs: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  // Multi-kelab states
  const [userClubIds, setUserClubIds] = useState<string[]>([]);
  const [userMemberships, setUserMemberships] = useState<ClubMembership[]>([]);
  const [selectedClubIdState, setSelectedClubIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedClubId');
  });

  const setSelectedClubId = useCallback((id: string) => {
    localStorage.setItem('selectedClubId', id);
    setSelectedClubIdState(id);
  }, []);

  const [isMTKpp, setIsMTKpp] = useState(false);
  const [isMTKeusahawanan, setIsMTKeusahawanan] = useState(false);
  const [isMTKediaman, setIsMTKediaman] = useState(false);
  const [isUnitKeusahawananAdmin, setIsUnitKeusahawananAdmin] = useState(false);
  const [isUnitAsramaAdmin, setIsUnitAsramaAdmin] = useState(false);
  const [isUnitKebajikanStaff, setIsUnitKebajikanStaff] = useState(false);
  const navigate = useNavigate();
  const currentUserId = useRef<string | null>(null);

  // ── 1. FUNGSI TARIK PROFIL ──
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // OPTIMIZATION: Lakukan parallel fetching untuk profile dan semua memberships serentak
      const [profileRes, membershipsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('student_club_memberships').select('id, club_id, role, is_primary, account_status').eq('user_id', userId)
      ]);

      const profileData = profileRes.data as Profile;

      if (profileRes.error) {
        console.error('[AuthContext] fetchProfile error:', profileRes.error.message);
        
        // Auto-logout jika token JWT tidak sah (Berlaku selepas migrasi pelayan)
        const errMsg = profileRes.error.message?.toLowerCase() || '';
        if (errMsg.includes('key') || errMsg.includes('jwt') || errMsg.includes('unauthorized')) {
          console.warn('Token sesi tidak sah dikesan. Memaksa log keluar pengguna...');
          await supabase.auth.signOut();
          localStorage.removeItem('jpp-polisas-auth'); // Buang token lama secara paksa
          window.location.href = '/login'; // Bawa ke muka depan
          return;
        }
        
        // 🔧 FIX: Jika profil tidak wujud (406 dari PostgREST), cipta profil minimum
        // Ini berlaku apabila pengguna mendaftar melalui Google OAuth tetapi trigger
        // handle_new_user tidak berjaya mencipta profil (race condition / trigger missing)
        if (errMsg.includes('cannot coerce') || errMsg.includes('json object') || profileRes.error.code === 'PGRST116') {
          console.warn('🔧 Profil tidak dijumpai — mencipta profil minimum untuk pengguna OAuth...');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const meta = authUser.user_metadata || {};
            const fallbackName = (meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User').toUpperCase();
            const { data: newProfile, error: insertErr } = await supabase.from('profiles').upsert({
              id: userId,
              email: authUser.email,
              full_name: fallbackName,
              role: 'CLUB_MEMBER',
              account_status: 'APPROVED',
              avatar_url: meta.avatar_url || meta.picture || null,
            }, { onConflict: 'id' }).select('*').single();
            
            if (!insertErr && newProfile) {
              console.log('✅ Profil OAuth berjaya dicipta!');
              setProfile(newProfile as Profile);
              // Skip ke bawah untuk teruskan fetch memberships
            } else {
              console.error('❌ Gagal cipta profil OAuth:', insertErr);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(profileData);
        // Set primary club sebagai default selected
        if (profileData?.club_id) {
          setSelectedClubIdState(prev => {
            if (prev) return prev;
            localStorage.setItem('selectedClubId', profileData.club_id!);
            return profileData.club_id;
          });
        }
      }

      const allMemberships = membershipsRes.data || [];
      const approvedMemberships = allMemberships.filter(m => m.account_status === 'APPROVED');
      
      // Sort to prioritize is_primary
      approvedMemberships.sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1));

      if (approvedMemberships.length > 0) {
        const ids = approvedMemberships.map(m => m.club_id);
        const mData: ClubMembership[] = approvedMemberships.map(m => ({
          club_id: m.club_id,
          role: m.role,
          is_primary: m.is_primary,
        }));
        setUserClubIds(ids);
        setUserMemberships(mData);
        setSelectedClubIdState(prev => {
          if (prev && ids.includes(prev)) return prev;
          localStorage.setItem('selectedClubId', ids[0]);
          return ids[0];
        });
      } else if (profileData?.club_id) {
        // FIX SECURITY LEAK: Before auto-repairing, ensure there isn't already a PENDING/REJECTED request for this club!
        const existingAll = allMemberships.filter(m => m.club_id === profileData.club_id);

        if (existingAll.length === 0) {
          // AUTO-REPAIR ONLY IF TRULY MISSING
          console.log("🛠️ Auto-repairing missing club membership for user...");
          const { error: insErr } = await supabase.from('student_club_memberships').insert({
            user_id: userId,
            club_id: profileData.club_id,
            role: profileData.role || 'CLUB_MEMBER',
            account_status: 'APPROVED',
            is_primary: true
          });
          
          if (!insErr) {
             console.log("✅ Auto-repair successful! Refreshing profile...");
             const { data: newMemberships } = await supabase
               .from('student_club_memberships')
               .select('club_id, role, is_primary')
               .eq('user_id', userId)
               .eq('account_status', 'APPROVED');
               
             if (newMemberships && newMemberships.length > 0) {
               const ids = newMemberships.map((m: any) => m.club_id);
               setUserClubIds(ids);
               setUserMemberships(newMemberships.map((m: any) => ({
                 club_id: m.club_id, role: m.role, is_primary: m.is_primary
               })));
             }
          } else {
             console.error("❌ Auto-repair failed:", insErr);
          }
        } else {
           console.log("⚠️ Auto-repair skipped: Found existing membership with status: ", existingAll[0].account_status);
           setUserClubIds([]);
           setUserMemberships([]);
           setSelectedClubIdState(null);
           localStorage.removeItem('selectedClubId');
        }
      } else {
        // Jatuh ke sini jika tiada pendaftaran & tiada auto-repair yg diperlukan
        setUserClubIds([]);
        setUserMemberships([]);
        setSelectedClubIdState(null);
        localStorage.removeItem('selectedClubId');
      }

      // ── Run all role/permission checks in PARALLEL for speed ──────────────
      // OPTIMIZATION: Combine queries to prevent N+1 issues and reduce network roundtrips
      const isJppRole = profileData?.role === 'JPP' || profileData?.role === 'SUPER_ADMIN_JPP';

      let mtUnits: string[] = [];
      let isKeuAdmin = false;
      let isAsramaAdmin = false;
      let isKebajikanStaff = false;

      // Kebajikan staff check runs for everyone
      const kebajikanPromise = supabase.from('kebajikan_staff_assignments').select('id').eq('staff_user_id', userId).eq('is_active', true).maybeSingle();

      if (isJppRole) {
        // Gabungkan 3 queries jpp_mt_assignments kepada 1 query
        const mtPromise = supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', userId);
        const keuAdminPromise = supabase.from('keusahawanan_unit_admins').select('id').eq('user_id', userId).maybeSingle();
        const asramaAdminPromise = supabase.from('asrama_unit_admins').select('id').eq('user_id', userId).maybeSingle();
        
        const [kebajikanRes, mtRes, keuRes, asramaRes] = await Promise.all([
          kebajikanPromise, mtPromise, keuAdminPromise, asramaAdminPromise
        ]);
        
        mtUnits = mtRes.data?.map((r: any) => r.unit) || [];
        isKeuAdmin = !!keuRes.data;
        isAsramaAdmin = !!asramaRes.data;
        isKebajikanStaff = !!kebajikanRes.data;
      } else {
        const kebajikanRes = await kebajikanPromise;
        isKebajikanStaff = !!kebajikanRes.data;
      }

      setIsMTKpp(mtUnits.includes('KPP'));
      setIsMTKeusahawanan(mtUnits.includes('KEUSAHAWANAN'));
      setIsMTKediaman(mtUnits.includes('KK'));
      setIsUnitKeusahawananAdmin(isKeuAdmin);
      setIsUnitAsramaAdmin(isAsramaAdmin);
      setIsUnitKebajikanStaff(isKebajikanStaff);
    } catch (err) {
      // Jika junction table belum wujud (sebelum migration), jangan crash
      console.warn('[AuthContext] fetchMemberships: fetch or auto-repair failed', err);
    }
  }, []);

  // ── 2. FUNGSI TARIK KELAB (REFRESH GLOBAL) ──
  const refreshClubs = useCallback(async () => {
    try {
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true });

      if (!clubsError && clubsData) {
        setGlobalClubs(clubsData);
        console.log("🔄 Senarai kelab global telah dikemaskini.");
      }
    } catch (err) {
      console.error("Gagal muat semula kelab:", err);
    }
  }, []);

  // ── 3. INITIALIZE (KELAB + AUTH) ──
  useEffect(() => {
    let isMounted = true;

    // 🔑 PENTING: Semak URL hash DULU sebelum panggil getSession()
    // Supabase hantar token dalam URL hash: #access_token=...&type=recovery
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const urlType = hashParams.get('type');
    const isRecoveryUrl = urlType === 'recovery';

    // ⏱️ SAFETY TIMEOUT: Paksa loading screen hilang selepas 6 saat
    // Ini mengelak pengguna stuck di loading screen selama-lamanya jika
    // Supabase lambat atau ada network hiccup.
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Safety timeout triggered — forcing isLoading=false');
        setIsLoading(false);
      }
    }, 6000);

    const initialize = async () => {
      try {
        // B. Jika URL adalah recovery link, tunggu onAuthStateChange handle —
        //    JANGAN panggil getSession() dulu kerana ia akan set user sebagai
        //    "authenticated biasa" sebelum PASSWORD_RECOVERY event fire.
        //    Biar isLoading=true supaya loading screen tunjuk sementara tunggu event.
        if (isRecoveryUrl) {
          // Jangan set isLoading(false) — biar onAuthStateChange handle
          return;
        }

        // A+C: Jalankan refreshClubs dan getSession SECARA SELARI untuk jimat masa
        const [, { data: { session: initialSession } }] = await Promise.all([
          refreshClubs(),
          supabase.auth.getSession(),
        ]);

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            currentUserId.current = initialSession.user.id;
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error("[AuthContext] Init error:", err);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        // 🔑 Jika ini event pemulihan kata laluan, redirect ke halaman reset
        // JANGAN treat sebagai log masuk biasa
        if (event === 'PASSWORD_RECOVERY') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setIsPasswordRecovery(true);
          setIsLoading(false);
          navigate('/reset-password');
          return;
        }

        // Reset flag jika bukan recovery
        setIsPasswordRecovery(false);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          if (currentUserId.current !== currentSession.user.id) {
            currentUserId.current = currentSession.user.id;
            await fetchProfile(currentSession.user.id);
          }
        } else {
          currentUserId.current = null;
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, refreshClubs]);

  // Realtime listener for multi-role membership changes REMOVED to save 1,500 connections!
  useEffect(() => {
    if (!user) return;
    
    // Instead of realtime, we just fetch on mount/focus which is handled by fetchProfile elsewhere
    return () => {};
  }, [user]);

  const refetchProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    currentUserId.current = null;
    setProfile(null);
    setUser(null);
    setSession(null);
    setUserClubIds([]);
    setUserMemberships([]);
    localStorage.removeItem('selectedClubId');
    setSelectedClubIdState(null);
    setIsLoading(false);
  };

  // ── MULTI-ROLE ENGINE ──────────────────────────────────────────────────────
  // Super Admin JPP = role GLOBAL (dari profiles.role), tidak berubah mengikut kelab
  // PENTING: JPP (ahli biasa JPP) BUKAN super admin — mereka ada peranan tersendiri!
  const profileRole = (profile?.role ?? '') as string;
  const isSuperAdmin = profileRole === 'SUPER_ADMIN_JPP' || profileRole === 'ADMIN';
  const isJppMember  = profileRole === 'JPP' || profileRole === 'SUPER_ADMIN_JPP'; // Semua ahli JPP (termasuk SuperAdmin)

  // Primary club = dari profiles.club_id (kekal sebagai fallback)
  const primaryClubId = profile?.club_id ?? null;
  // Effective club untuk digunakan dalam queries
  const effectiveClubId = selectedClubIdState ?? primaryClubId;

  // ── EFFECTIVE ROLE: Derive dari junction table berdasarkan selectedClubId ──
  // Bila user tukar kelab, role mereka bertukar secara automatik!
  const effectiveRole = (() => {
    // Super Admin JPP kekal sebagai Super Admin di mana-mana kelab
    if (isSuperAdmin) return 'SUPER_ADMIN_JPP';
    
    // Ahli JPP biasa — kekalkan sebagai 'JPP', JANGAN naikkan ke SUPER_ADMIN_JPP
    if (isJppMember) return 'JPP';
    
    // Cari role untuk kelab yang sedang dipilih dari junction table
    if (effectiveClubId && userMemberships.length > 0) {
      const membership = userMemberships.find(m => m.club_id === effectiveClubId);
      if (membership) return membership.role;
    }
    
    // Fallback ke profiles.role HANYA JIKA effectiveClubId === primaryClubId (backward compat)
    if (effectiveClubId === primaryClubId) {
      return profileRole || 'CLUB_MEMBER';
    }
    
    return 'CLUB_MEMBER';
  })();

  // ── DERIVE ROLE FLAGS dari effectiveRole (bukan lagi dari profiles.role) ──
  // KPP Exco mendapat isAdvisor=true GLOBAL supaya boleh switch ke mana-mana kelab
  const isKppExco           = profileRole === 'JPP' && profile?.jpp_unit === 'KPP';
  const isKeusahawananExco  = profileRole === 'JPP' && profile?.jpp_unit === 'KEUSAHAWANAN';
  const isKediamanExco      = profileRole === 'JPP' && profile?.jpp_unit === 'KK'; // Exco Kediaman & Kerohanian
  const isKebajikanExco     = profileRole === 'JPP' && profile?.jpp_unit === 'KEBAJIKAN'; // Exco Kebajikan
  // YDP dan YANG_DIPERTUA — oversee semua unit, termasuk KPP dan Keusahawanan
  const isYdp = (profileRole === 'JPP' || profileRole === 'SUPER_ADMIN_JPP') &&
    (profile?.jpp_position === 'YDP' || profile?.jpp_position === 'YANG_DIPERTUA');
  const isAdvisor   = effectiveRole === 'CLUB_ADVISOR'   || effectiveRole === 'PENASIHAT'   || isSuperAdmin || isKppExco;
  const isPresident = effectiveRole === 'CLUB_PRESIDENT' || effectiveRole === 'PRESIDEN'    || isAdvisor;
  const isMT        = effectiveRole === 'CLUB_MT'        || effectiveRole === 'MT'          || isPresident;
  const isMember    = effectiveRole === 'CLUB_MEMBER'    || effectiveRole === 'CLUB_MEMBERS' || effectiveRole === 'AHLI' || isMT;


  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: !!user && !isPasswordRecovery,
        isPasswordRecovery,
        isSuperAdmin,
        isAdvisor,
        isPresident,
        isMT,
        isMember,
        effectiveRole,
        isKppExco,
        isKeusahawananExco,
        isKediamanExco,
        isKebajikanExco,
        isUnitKebajikanStaff,
        isJppMember,
        isYdp,
        hasKppAccess: isSuperAdmin || isKppExco || isMTKpp || isYdp,
        hasKeusahawananAccess: isSuperAdmin || isKeusahawananExco || isMTKeusahawanan || isUnitKeusahawananAdmin || isYdp,
        hasKediamanAccess: isSuperAdmin || isKediamanExco || isMTKediaman || isUnitAsramaAdmin || isYdp,
        hasKebajikanAccess: isSuperAdmin || isKebajikanExco || isUnitKebajikanStaff || isYdp,
        hasKebajikanKKAccess: isSuperAdmin || isKediamanExco || isMTKediaman || isYdp,
        userClubIds,
        userMemberships,
        primaryClubId,
        selectedClubId: effectiveClubId,
        setSelectedClubId,
        refetchProfile,
        refreshClubs,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}