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

  const navigate = useNavigate();
  const currentUserId = useRef<string | null>(null);

  // ── 1. FUNGSI TARIK PROFIL ──
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Simpan rujukan ke data profil untuk fallback
      const profileData = data as Profile;

      if (error) {
        console.error('[AuthContext] fetchProfile error:', error.message);
        setProfile(null);
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

      // Tarik semua keahlian dari junction table (multi-kelab) — TERMASUK ROLE
      const { data: memberships } = await supabase
        .from('student_club_memberships')
        .select('club_id, role, is_primary')
        .eq('user_id', userId)
        .eq('account_status', 'APPROVED')
        .order('is_primary', { ascending: false });

      if (memberships && memberships.length > 0) {
        const ids = memberships.map((m: any) => m.club_id);
        const mData: ClubMembership[] = memberships.map((m: any) => ({
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
        // AUTO-REPAIR: Jika tiada di junction table, insert profil utama ke dalam junction table!
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
           // Panggil semula diri sendiri sekali sahaja utk muat data yg baru disisip
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
        // Jatuh ke sini jika tiada pendaftaran & tiada auto-repair yg diperlukan
        setUserClubIds([]);
        setUserMemberships([]);
        setSelectedClubIdState(null);
        localStorage.removeItem('selectedClubId');
      }
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

    const initialize = async () => {
      try {
        // A. Tarik senarai kelab dulu
        await refreshClubs();

        // B. Jika URL adalah recovery link, tunggu onAuthStateChange handle —
        //    JANGAN panggil getSession() dulu kerana ia akan set user sebagai
        //    "authenticated biasa" sebelum PASSWORD_RECOVERY event fire.
        //    Biar isLoading=true supaya loading screen tunjuk sementara tunggu event.
        if (isRecoveryUrl) {
          // Jangan set isLoading(false) — biar onAuthStateChange handle
          return;
        }

        // C. Semak sesi sedia ada (flow log masuk biasa)
        const { data: { session: initialSession } } = await supabase.auth.getSession();

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

  // Real-time listener for multi-role membership changes
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to realtime changes on this user's memberships
    const channel = supabase.channel(`auth_memberships_changes_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_club_memberships',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("🔄 Realtime: Membership updated for logged in user", payload);
        fetchProfile(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProfile]);

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
  const profileRole = (profile?.role ?? '') as string;
  const isSuperAdmin = profileRole === 'SUPER_ADMIN_JPP' || profileRole === 'ADMIN' || profileRole === 'JPP';

  // Primary club = dari profiles.club_id (kekal sebagai fallback)
  const primaryClubId = profile?.club_id ?? null;
  // Effective club untuk digunakan dalam queries
  const effectiveClubId = selectedClubIdState ?? primaryClubId;

  // ── EFFECTIVE ROLE: Derive dari junction table berdasarkan selectedClubId ──
  // Bila user tukar kelab, role mereka bertukar secara automatik!
  const effectiveRole = (() => {
    // Super Admin JPP kekal sebagai Super Admin di mana-mana kelab
    if (isSuperAdmin) return 'SUPER_ADMIN_JPP';
    
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
  const isAdvisor   = effectiveRole === 'CLUB_ADVISOR'   || effectiveRole === 'PENASIHAT'   || isSuperAdmin;
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