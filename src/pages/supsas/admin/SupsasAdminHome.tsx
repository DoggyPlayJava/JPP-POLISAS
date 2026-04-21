import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Layers, Calendar, Medal, Activity,
  TrendingUp, Plus, ArrowRight, Zap, FileDown, Loader
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas } from '@/contexts/SupsasContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function SupsasAdminHome() {
  const { edition, kontingen, sports, medalTally, fixtures, isLive } = useSupsas();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const liveFixtures = fixtures.filter(f => f.status === 'live').length;
  const completedFixtures = fixtures.filter(f => f.status === 'completed').length;
  const totalMedals = medalTally.reduce((a, k) => a + k.total_medals, 0);
  const topKontingen = medalTally[0];

  // N-3: Export PDF Laporan SUPSAS
  const handleExportPDF = async () => {
    if (!edition) { toast.error('Tiada edisi untuk dieksport'); return; }
    setExporting(true);
    try {
      const kontingenMap: Record<string, string> = {};
      kontingen.forEach(k => { kontingenMap[k.id] = k.short_code + ' — ' + k.name; });
      const sportMap: Record<string, string> = {};
      sports.forEach(s => { sportMap[s.id] = s.name; });

      const tallyRows = medalTally.map((t, i) => `
        <tr>
          <td style="padding:8px 12px;font-weight:900;color:#b45309">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:700">${t.name} (${t.short_code})</td>
          <td style="padding:8px 12px;text-align:center">${t.gold}</td>
          <td style="padding:8px 12px;text-align:center">${t.silver}</td>
          <td style="padding:8px 12px;text-align:center">${t.bronze}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:900">${t.total_medals}</td>
        </tr>`).join('');

      const completedFx = fixtures.filter(f => f.status === 'completed');
      const fixtureRows = completedFx.map(f => `
        <tr>
          <td style="padding:6px 10px">${sportMap[f.sport_id] ?? '-'}</td>
          <td style="padding:6px 10px">${f.group_name ? 'Kump. ' + f.group_name : f.bracket_round === 2 ? 'Separuh Akhir' : f.bracket_round === 1 ? 'Akhir' : f.round ?? '-'}</td>
          <td style="padding:6px 10px">${kontingenMap[f.kontingen_a_id ?? ''] ?? 'TBD'}</td>
          <td style="padding:6px 10px;text-align:center;font-weight:900">${f.score_a ?? '-'} — ${f.score_b ?? '-'}</td>
          <td style="padding:6px 10px">${kontingenMap[f.kontingen_b_id ?? ''] ?? 'TBD'}</td>
          <td style="padding:6px 10px">${f.winner_id ? (kontingenMap[f.winner_id] ?? '-') : '-'}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Laporan SUPSAS — ${edition.name}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
          h1 { font-size: 28px; font-weight: 900; margin: 0; }
          h2 { font-size: 16px; font-weight: 900; margin: 32px 0 8px; color: #444; border-bottom: 2px solid #eee; padding-bottom: 6px; }
          p  { color: #555; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th { background: #1a1a1a; color: #fbbf24; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .footer { margin-top: 48px; font-size: 11px; color: #bbb; text-align: center; }
        </style></head><body>
        <h1>SUPSAS — ${edition.name}</h1>
        ${edition.tagline ? `<p>${edition.tagline}</p>` : ''}
        <p style="color:#999">Dijana: ${new Date().toLocaleString('ms-MY')} &bull; ${completedFx.length} perlawanan selesai &bull; ${totalMedals} medal &bull; ${kontingen.length} kontinjen</p>

        <h2>Papan Kedudukan Medal</h2>
        <table><thead><tr><th>#</th><th>Kontinjen</th><th>🥇 Emas</th><th>🥈 Perak</th><th>🥉 Gangsa</th><th>Jumlah</th></tr></thead>
        <tbody>${tallyRows || '<tr><td colspan="6" style="text-align:center;color:#bbb;padding:20px">Tiada data</td></tr>'}</tbody></table>

        <h2>Keputusan Perlawanan Selesai</h2>
        <table><thead><tr><th>Sukan</th><th>Pusingan</th><th>Pasukan A</th><th>Skor</th><th>Pasukan B</th><th>Pemenang</th></tr></thead>
        <tbody>${fixtureRows || '<tr><td colspan="6" style="text-align:center;color:#bbb;padding:20px">Tiada perlawanan selesai</td></tr>'}</tbody></table>

        <div class="footer">Laporan Rasmi SUPSAS &bull; ${edition.name} &bull; Sistem JPP POLISAS</div>
        </body></html>`;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.print(); }, 600);
      } else {
        toast.error('Sila benarkan popup untuk mencetak laporan');
      }
    } catch {
      toast.error('Gagal jana laporan');
    } finally {
      setExporting(false);
    }
  };

  const STAT_CARDS = [
    { label: 'Kontinjen',       value: kontingen.length, icon: Users,    color: 'violet', sub: 'jabatan berdaftar',    path: '/supsas/admin/kontinjen' },
    { label: 'Sukan Aktif',     value: sports.length,    icon: Trophy,   color: 'amber',  sub: 'acara dipertandingkan', path: '/supsas/admin/sukan' },
    { label: 'Perlawanan Live', value: liveFixtures,     icon: Activity, color: 'red',    sub: 'sedang berlangsung',    path: '/supsas/admin/jadual' },
    { label: 'Medal Diraih',    value: totalMedals,      icon: Medal,    color: 'emerald',sub: 'emas + perak + gangsa', path: '/supsas/admin/keputusan' },
  ];

  const colorMap: Record<string, string> = {
    violet:  'from-violet-500/10  border-violet-500/20  text-violet-400',
    amber:   'from-amber-500/10   border-amber-500/20   text-amber-400',
    red:     'from-red-500/10     border-red-500/20     text-red-400',
    emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };

  const QUICK_ACTIONS = [
    { label: 'Input Keputusan',  desc: 'Rekod medal & kedudukan',        path: '/supsas/admin/keputusan', icon: Layers,   urgent: liveFixtures > 0 },
    { label: 'Tambah Sukan',     desc: 'Daftar sukan baru ke edisi ini', path: '/supsas/admin/sukan',     icon: Plus,     urgent: false },
    { label: 'Urus Kontinjen',   desc: 'Jana kod jemputan ketua',        path: '/supsas/admin/kontinjen', icon: Users,    urgent: false },
    { label: 'Tetapkan Jadual',  desc: 'Setup perlawanan & masa',       path: '/supsas/admin/jadual',    icon: Calendar, urgent: false },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/60 mb-2">Panel Admin</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {edition?.name ?? 'SUPSAS Dashboard'}
          </h1>
          {edition?.tagline && (
            <p className="text-white/30 font-medium mt-1">{edition.tagline}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isLive && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/25">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-xs font-black uppercase tracking-widest text-red-400">Acara Sedang Berlangsung</span>
            </div>
          )}
          {/* N-3: Export PDF button */}
          {edition && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
            >
              {exporting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, sub, path }, i) => {
          const cls = colorMap[color];
          const [, borderCls, textCls] = cls.split(' ');
          return (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(path)}
              className={cn(
                'group relative p-5 rounded-3xl bg-gradient-to-br to-transparent border text-left transition-all hover:scale-[1.03] active:scale-[0.98]',
                cls
              )}
            >
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', `bg-${color}-500/10`, `border border-${color}-500/20`)}>
                <Icon className={cn('w-5 h-5', textCls)} />
              </div>
              <p className="text-3xl font-black text-white mb-1">{value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{sub}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-0.5">{label}</p>
              <ArrowRight className={cn('absolute bottom-5 right-5 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5', textCls)} />
            </motion.button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-black text-white mb-4">Tindakan Pantas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, desc, path, icon: Icon, urgent }, i) => (
            <motion.button
              key={path}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              onClick={() => navigate(path)}
              className={cn(
                'group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] text-left',
                urgent
                  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                urgent ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <Icon className={cn('w-5 h-5', urgent ? 'text-red-400' : 'text-amber-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-sm leading-none mb-0.5', urgent ? 'text-red-300' : 'text-white')}>{label}</p>
                <p className="text-[10px] text-white/30 font-medium">{desc}</p>
              </div>
              {urgent && <Zap className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />}
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top Kontingen */}
      {topKontingen && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">Pemimpin Sementara</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-12 rounded-full" style={{ backgroundColor: topKontingen.color }} />
            <div>
              <p className="text-2xl font-black text-white">{topKontingen.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                🥇 {topKontingen.gold} · 🥈 {topKontingen.silver} · 🥉 {topKontingen.bronze}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No edition warning */}
      {!edition && (
        <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-center">
          <Trophy className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
          <p className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2">Tiada Edisi Aktif</p>
          <p className="text-white/30 text-sm mb-4">Pergi ke Tetapan Edisi untuk mencipta dan mengaktifkan edisi SUPSAS.</p>
          <button
            onClick={() => navigate('/supsas/admin/tetapan')}
            className="px-6 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
          >
            Setup Edisi
          </button>
        </div>
      )}
    </div>
  );
}
