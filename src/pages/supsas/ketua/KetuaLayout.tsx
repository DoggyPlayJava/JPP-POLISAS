import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, ChevronRight, LogIn, Key, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSupsas } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ─── Claim Invite Code Screen ─────────────────────────────────
function ClaimInviteScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refetch } = useSupsas();

  const handleClaim = async () => {
    if (!code.trim()) { toast.error('Sila masukkan kod jemputan'); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('supsas_claim_invite_code', { p_invite_code: code.trim().toUpperCase() });
    setLoading(false);
    if (error || !data?.success) {
      toast.error(data?.error ?? error?.message ?? 'Kod tidak sah');
      return;
    }
    toast.success(`Selamat datang, Ketua Kontinjen ${data.kontingen_name}!`);
    refetch();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Key className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Portal Ketua Kontinjen</h1>
          <p className="text-white/40 text-sm">Masukkan kod jemputan yang diberikan oleh Exco Sukan untuk meneruskan.</p>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Kod Jemputan</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleClaim()}
              placeholder="XXXX-XXXX"
              className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base font-mono font-bold placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all text-center tracking-[0.3em] uppercase"
              maxLength={9}
            />
          </div>
          <button
            onClick={handleClaim}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Aktifkan Kod
          </button>
          <p className="text-center text-[10px] text-white/20 font-medium">
            Hubungi Exco Sukan jika anda tidak menerima kod jemputan.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

// ─── Ketua Layout ─────────────────────────────────────────────
export function KetuaLayout() {
  const { profile, isLoading: authLoading } = useAuth();
  const { kontingen, edition } = useSupsas();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Must be logged in
  if (!profile) {
    return <Navigate to="/login?redirect=/supsas/ketua" replace />;
  }

  // Check if they are a leader of any kontingen in active edition
  const myKontingen = kontingen.find(k => k.leader_id === profile.id);

  // They're logged in but not a leader yet — show claim screen
  if (!myKontingen) {
    return <ClaimInviteScreen />;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Ketua Header */}
      <div className="px-4 pt-8 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
          <div
            className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-lg flex-shrink-0"
            style={{ borderColor: `${myKontingen.color}60`, backgroundColor: `${myKontingen.color}20`, color: myKontingen.color }}
          >
            {myKontingen.short_code.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 mb-0.5">Ketua Kontinjen</p>
            <p className="font-black text-white text-lg leading-none">{myKontingen.name}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{edition?.name}</p>
          </div>
        </div>
      </div>

      <main className="px-4 max-w-4xl mx-auto">
        <Outlet context={{ myKontingen }} />
      </main>

      <FloatingAiChat />
    </div>
  );
}
