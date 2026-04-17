// ============================================================
// KkUnitDashboard — Dashboard khusus untuk unit KK
// (Exco Kediaman dan Kerohanian)
// Tab 1: Dashboard aktiviti & laporan (ExcoGenericDashboard)
// Tab 2: Unit Pengurusan Asrama — assign/remove staff
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ChevronRight, LayoutGrid, ShieldCheck,
  UserPlus, Trash2, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { hexToRgba } from '@/lib/utils';
import { ExcoGenericDashboard } from './ExcoGenericDashboard';

const KK_COLOR = '#E879F9';

// ─── Rujukan Asrama Banner ────────────────────────────────────────────────────
function AsramaBanner() {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate('/jpp/asrama')}
      className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all group text-left hover:brightness-110"
      style={{
        background: hexToRgba(KK_COLOR, 0.06),
        borderColor: hexToRgba(KK_COLOR, 0.2),
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(KK_COLOR, 0.15) }}
      >
        <Building2 className="w-6 h-6" style={{ color: KK_COLOR }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white leading-tight">
          Papan Rujukan Asrama
        </p>
        <p className="text-[10px] text-white/40 font-medium mt-1 leading-relaxed">
          Semak senarai pelajar dengan HPNM & merit untuk kelulusan permohonan kediaman sesi 2025/2026
        </p>
      </div>
      <ChevronRight className="w-5 h-5 flex-shrink-0 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
    </motion.button>
  );
}

// ─── Unit Pengurusan Asrama Tab ───────────────────────────────────────────────
function UnitAsramaTab() {
  const { profile, isSuperAdmin, isKediamanExco } = useAuth();

  const [unitAdmins, setUnitAdmins]       = useState<any[]>([]);
  const [searchUser, setSearchUser]       = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading]            = useState(true);

  const canManage = isSuperAdmin || isKediamanExco;

  const fetchUnitAdmins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('asrama_unit_admins')
      .select('*, user:user_id(id, full_name, avatar_url, matric_no, role, email)')
      .order('created_at', { ascending: false });
    setUnitAdmins(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUnitAdmins(); }, [fetchUnitAdmins]);

  // Search all users (Students + JPP + Admin) — no role restriction
  const handleSearchUser = async (q: string) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }

    // Search by nama ATAU no. matrik (jangan filter account_status — nak cari semua)
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, matric_no, role, email')
      .or(`full_name.ilike.%${q}%,matric_no.ilike.%${q}%`)
      .limit(8);

    // Exclude yang dah ada dalam senarai — UUID tanpa single quotes (format PostgREST)
    if (unitAdmins.length > 0) {
      const excludeIds = unitAdmins.map(a => a.user_id).join(',');
      query = query.not('id', 'in', `(${excludeIds})`);
    }

    const { data } = await query;
    setSearchResults(data || []);
  };

  const handleAddAdmin = async (userId: string, userName: string) => {
    const { error } = await supabase
      .from('asrama_unit_admins')
      .insert({ user_id: userId, assigned_by: profile?.id, notes: 'Ditugaskan melalui panel KK' });
    if (error) { toast.error('Gagal: ' + error.message); return; }
    toast.success(`${userName} berjaya ditambah sebagai Unit Pengurusan Asrama!`);
    setSearchUser(''); setSearchResults([]);
    fetchUnitAdmins();
  };

  const handleRemoveAdmin = async (adminId: string, userName: string) => {
    if (!window.confirm(`Buang ${userName} dari Unit Pengurusan Asrama?`)) return;
    const { error } = await supabase.from('asrama_unit_admins').delete().eq('id', adminId);
    if (error) { toast.error('Gagal membuang: ' + error.message); return; }
    toast.success(`${userName} berjaya dibuang.`);
    fetchUnitAdmins();
  };

  return (
    <motion.div
      key="unit-asrama"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Info banner */}
      <div
        className="rounded-[2rem] p-5 border space-y-2"
        style={{
          borderColor: hexToRgba(KK_COLOR, 0.25),
          background: hexToRgba(KK_COLOR, 0.04),
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: KK_COLOR }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: KK_COLOR }}>
            Unit Pengurusan Asrama — Akses Rujukan
          </p>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Pengguna yang disenaraikan di sini mendapat akses ke <strong className="text-white/70">Papan Rujukan Asrama</strong> ({' '}
          <code className="text-[10px] text-fuchsia-400">/jpp/asrama</code>) untuk membantu Exco Kediaman semak merit dan
          HPNM pelajar bagi tujuan kelulusan permohonan kediaman i-KAMSIS. Mereka <em>tidak</em> mempunyai kuasa edit data pelajar.
        </p>
      </div>

      {/* Search + Add (hanya Exco KK & SuperAdmin) */}
      {canManage && (
        <div
          className="rounded-[2rem] border p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> Tambah Pegawai Unit Pengurusan Asrama
          </p>
          <div className="relative">
            <input
              value={searchUser}
              onChange={e => handleSearchUser(e.target.value)}
              placeholder="Cari nama pengguna..."
              className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 transition-all"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-2xl bg-[#0f0f13] border border-white/10 shadow-xl overflow-hidden">
                  {searchResults.map(u => {
                    // Tentukan jenis akaun untuk badge
                    const roleLabel =
                      u.role === 'SUPER_ADMIN_JPP' ? 'Super Admin' :
                      u.role === 'JPP'             ? 'JPP' :
                      u.role === 'CLUB_PRESIDENT'  ? 'Presiden' :
                      u.role === 'CLUB_MT'         ? 'MT Kelab' :
                      'Pelajar';
                    const roleBg =
                      u.role === 'SUPER_ADMIN_JPP' ? '#ef4444' :
                      u.role === 'JPP'             ? '#8b5cf6' :
                      u.role === 'CLUB_PRESIDENT'  ? '#f59e0b' :
                      '#64748b';
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleAddAdmin(u.id, u.full_name)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: KK_COLOR }}
                        >
                          {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-white">{u.full_name}</p>
                            <span
                              className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: roleBg + '99' }}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/50">
                            {u.matric_no || u.email || 'Tiada maklumat'}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: hexToRgba(KK_COLOR, 0.1), color: KK_COLOR }}
                        >
                          + Tambah
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Senarai current unit admins */}
      <div
        className="rounded-[2rem] border p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Senarai Unit Pengurusan Asrama ({unitAdmins.length})
          </p>
          <button
            onClick={fetchUnitAdmins}
            className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Muat Semula
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : unitAdmins.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-6">
            Tiada pegawai unit ditetapkan lagi.
          </p>
        ) : (
          <div className="space-y-2">
            {unitAdmins.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                  style={{ background: KK_COLOR }}
                >
                  {a.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{a.user?.full_name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <p className="text-[10px] text-white/50 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" style={{ color: KK_COLOR }} />
                      Unit Pengurusan Asrama
                    </p>
                    {/* Tunjuk jenis akaun */}
                    {a.user?.role && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white/70"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        {a.user.role === 'SUPER_ADMIN_JPP' ? 'Super Admin' :
                         a.user.role === 'JPP' ? 'JPP' :
                         a.user.role === 'CLUB_PRESIDENT' ? 'Presiden' :
                         a.user.role === 'CLUB_MT' ? 'MT Kelab' :
                         'Pelajar'}
                      </span>
                    )}
                    {a.user?.matric_no && (
                      <span className="text-[9px] text-white/30 font-mono">{a.user.matric_no}</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemoveAdmin(a.id, a.user?.full_name)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function KkUnitDashboard() {
  const { hasKediamanAccess, isKediamanExco, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'unit'>('dashboard');

  // Tab "Unit Pengurusan Asrama" hanya kelihatan untuk Exco KK & SuperAdmin (boleh manage)
  const showUnitTab = isSuperAdmin || isKediamanExco;

  return (
    <div className="space-y-5">
      {/* Tabs — hanya papar jika ada hak manage */}
      {showUnitTab && (
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'dashboard'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('unit')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'unit'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Unit Pengurusan Asrama
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-5"
          >
            {/* Rujukan Asrama shortcut — hanya untuk yang ada akses */}
            {hasKediamanAccess && <AsramaBanner />}

            {/* Generic dashboard (aktiviti, laporan, tindakan pantas) */}
            <ExcoGenericDashboard
              excoUnit="KK"
              themeColor={KK_COLOR}
              excoLabel="Kediaman & Kerohanian"
            />
          </motion.div>
        )}

        {activeTab === 'unit' && showUnitTab && (
          <motion.div
            key="unit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <UnitAsramaTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
