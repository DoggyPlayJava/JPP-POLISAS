// ============================================================
// ExcoWrappers — Thin wrappers untuk route /exco/:unitCode/*
// Baca unitCode dari params, lookup config, semak akses, render template
// PENTING: Guna useJppConfig() bukan UNIT_CFG statik supaya nama
//          exco terkini (dari DB) digunakan dalam laporan PDF.
// ============================================================
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useJppConfig } from '@/contexts/JppConfigContext';
import { ExcoAktivitiPage } from '@/components/exco/ExcoAktivitiPage';
import { ExcoLaporanPage }  from '@/components/exco/ExcoLaporanPage';
import { JPP_MT_POSITIONS } from '@/types';

// ── Shared access check ───────────────────────────────────────────────────────
function useExcoAccess(unitCode: string) {
  const { profile, isSuperAdmin } = useAuth();
  const { unitConfig } = useJppConfig(); // ← Gunakan config dinamik dari DB
  const excoUnit  = unitCode.toUpperCase();
  const unitCfg   = unitConfig[excoUnit]; // ← Ambil dari context, bukan statik
  const jppUnit   = profile?.jpp_unit as string | undefined;
  const jppPos    = profile?.jpp_position as string | undefined;
  const isMT      = JPP_MT_POSITIONS.includes(jppPos as any);
  const isExco    = jppUnit === excoUnit;
  const hasAccess = isExco || isMT || isSuperAdmin;
  return { unitCfg, excoUnit, hasAccess };
}

// ─── AKTIVITI WRAPPER ─────────────────────────────────────────────────────────
export function ExcoAktivitiWrapper() {
  const { unitCode = '' } = useParams<{ unitCode: string }>();
  const { unitCfg, excoUnit, hasAccess } = useExcoAccess(unitCode);

  if (!unitCfg || !hasAccess) return <Navigate to="/jpp" replace />;

  return (
    <ExcoAktivitiPage
      excoUnit={excoUnit}
      themeColor={unitCfg.color}
      excoLabel={unitCfg.fullLabel}  // ← Nama terkini dari DB
    />
  );
}

// ─── LAPORAN WRAPPER ──────────────────────────────────────────────────────────
export function ExcoLaporanWrapper() {
  const { unitCode = '' } = useParams<{ unitCode: string }>();
  const { unitCfg, excoUnit, hasAccess } = useExcoAccess(unitCode);

  if (!unitCfg || !hasAccess) return <Navigate to="/jpp" replace />;

  return (
    <ExcoLaporanPage
      excoUnit={excoUnit}
      themeColor={unitCfg.color}
      excoLabel={unitCfg.fullLabel}  // ← Nama terkini dari DB dihantar ke laporan PDF
    />
  );
}
