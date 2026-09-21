import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Home, Menu, Search, User, ChevronLeft, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * MakmpJppChrome — chrome JPP ringan untuk halaman MAKMP awam.
 *
 * Tujuan: buat MAKMP nampak sebahagian daripada ekosistem JPP Polisas
 * (bukan sistem berasingan) TANPA memaksa login.
 *
 * - Bottom nav ringan (Menu → portal, Utama, Semak Status, Profil)
 * - Spacer bawah supaya content tak bertindih dengan floating bottom nav
 */
export function MakmpJppChrome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const isStatus = location.pathname.startsWith('/makmp/status');

  return (
    <>
      {/* Bottom spacer — pastikan content tak tersorok di belakang dock */}
      <div className="h-24 md:h-20" aria-hidden="true" />

      <BottomNav
        onOpenSidebar={() => navigate('/portal')}
        customLinks={{
          left: [
            { icon: Menu, label: 'Portal', onClick: () => navigate('/portal') },
            { icon: Home, label: 'Utama', onClick: () => navigate('/'), isActive: location.pathname === '/makmp' },
          ],
          right: [
            {
              icon: Search,
              label: 'Status',
              onClick: () => navigate('/makmp/status'),
              isActive: isStatus,
            },
            {
              icon: User,
              label: 'Profil',
              onClick: () => (profile ? navigate('/tetapan') : navigate('/login')),
            },
          ],
        }}
      />
    </>
  );
}

/**
 * MakmpJppHeader — banner JPP kecil untuk dipaparkan di atas halaman MAKMP.
 * Menunjukkan MAKMP adalah modul di bawah JPP Polisas.
 */
export function MakmpJppHeader({ subtitle }: { subtitle?: string }) {
  const navigate = useNavigate();
  return (
    <div className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition group min-w-0"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          <img src="/jpp-logo.png" alt="JPP" className="w-5 h-5 object-contain shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate">
            JPP Polisas
          </span>
          <LayoutGrid className="w-3 h-3 shrink-0 opacity-60" />
        </button>
        {subtitle && (
          <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
