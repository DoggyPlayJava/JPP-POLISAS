import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS Deep Audit UI/UX Polish Verification', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const emsLibPath = path.resolve(rootDir, 'src/lib/ems.ts');
  const leaderboardPath = path.resolve(rootDir, 'src/pages/ems/EmsLeaderboardPage.tsx');
  const certificatePath = path.resolve(rootDir, 'src/pages/ems/EmsCertificatePage.tsx');
  const formPath = path.resolve(rootDir, 'src/pages/ems/EmsEventFormPage.tsx');
  const luckyDrawPath = path.resolve(rootDir, 'src/components/ems/EmsLuckyDrawModal.tsx');
  const juryPath = path.resolve(rootDir, 'src/pages/ems/EmsJuryPortalPage.tsx');
  const dashboardPath = path.resolve(rootDir, 'src/pages/ems/EmsDashboardPage.tsx');
  const checkinPath = path.resolve(rootDir, 'src/pages/ems/EmsCheckinPage.tsx');

  it('verifies checkinEmsParticipant strips EMS-PASS:: prefix and normalizes QR/URL inputs', () => {
    const content = fs.readFileSync(emsLibPath, 'utf-8');
    expect(content).toContain("cleanInput.replace('EMS-PASS::', '')");
    expect(content).toContain('/ems/pass/');
  });

  it('verifies realtime channel cleanup in EmsCheckinPage follows pChannel.unsubscribe()', () => {
    const content = fs.readFileSync(checkinPath, 'utf-8');
    expect(content).toContain('pChannel.unsubscribe()');
    expect(content).toContain('supabase.removeChannel(pChannel)');
  });

  it('verifies no mistranslation of "seret" for tie/draw in ems.ts and EmsLeaderboardPage.tsx', () => {
    const emsLib = fs.readFileSync(emsLibPath, 'utf-8');
    const leaderboard = fs.readFileSync(leaderboardPath, 'utf-8');
    expect(emsLib).not.toContain('pemenang seret');
    expect(leaderboard).not.toMatch(/Pemenang Seret|Markah Seret|markah seret/i);
    expect(leaderboard).toContain('Pemenang Seri');
    expect(leaderboard).toContain('Penentuan Pemenang Pecah Seri');
  });

  it('verifies typos in EmsCertificatePage are corrected', () => {
    const cert = fs.readFileSync(certificatePath, 'utf-8');
    expect(cert).not.toContain('Pemenang Utam /');
    expect(cert).toContain('Pemenang Utama /');
    expect(cert).not.toContain('Hak Cipta Terelihara');
    expect(cert).toContain('Hak Cipta Terpelihara');
  });

  it('verifies window.confirm anti-pattern is removed from EmsEventFormPage and replaced by modal', () => {
    const form = fs.readFileSync(formPath, 'utf-8');
    expect(form).not.toContain('window.confirm');
    expect(form).toContain('presetPrompt');
    expect(form).toContain('applyPreset');
    expect(form).not.toContain('meanda GANTI SEMUA');
  });

  it('verifies Likert score 4 and 3 color differentiation in EmsJuryPortalPage', () => {
    const jury = fs.readFileSync(juryPath, 'utf-8');
    expect(jury).toContain('bg-sky-600');
    expect(jury).not.toContain('dark:bg-[#14151f]');
  });

  it('verifies EmsLuckyDrawModal supports light and dark modes adaptively', () => {
    const luckyDraw = fs.readFileSync(luckyDrawPath, 'utf-8');
    expect(luckyDraw).toContain('bg-white dark:bg-[#0B0F19]');
    expect(luckyDraw).toContain('text-slate-900 dark:text-white');
  });

  it('verifies EmsDashboardPage card baseline pinning and strict line limit < 800', () => {
    const dashboard = fs.readFileSync(dashboardPath, 'utf-8');
    const lineCount = dashboard.split('\n').length;
    expect(lineCount).toBeLessThan(800);
    expect(dashboard).toContain('mt-auto');
    expect(dashboard).toContain('[text-wrap:balance]');
  });
});
