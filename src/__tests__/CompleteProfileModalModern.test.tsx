import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CompleteProfileModal Modern Institutional Polish', () => {
  const modalPath = path.resolve(__dirname, '../components/ui/CompleteProfileModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  it('replaces dated sparkles gradient with sleek institutional styling', () => {
    // Must remove dated spinning sparkles animation and 2024 gradient
    expect(content).not.toContain('animate={{ rotate: 360 }}');
    expect(content).not.toContain('h-32 bg-gradient-to-br from-primary to-accent');

    // Must have institutional dark styling with POLISAS portal subtitle
    expect(content).toMatch(/h-28 bg-slate-900 dark:bg-zinc-950 border-b border-white\/10/);
    expect(content).toContain('Portal Rasmi POLISAS');
    expect(content).toContain('POLISAS Emblem');
  });

  it('contains frosted emblem container with backdrop blur', () => {
    expect(content).toContain('bg-white/10 border border-white/20');
    expect(content).toContain('backdrop-blur-md');
  });

  it('contains smart matric auto-detection verification badge', () => {
    // When matricParsed is valid and knownProgramme exists, display animated confirmation
    expect(content).toMatch(/Pengesahan Program Automatik/i);
    expect(content).toContain('matricParsed.knownProgramme');
    expect(content).toContain('matricParsed.progCode');
    expect(content).toContain('matricParsed.fullYear');
  });

  it('modernizes intake session selection with segmented control pills', () => {
    expect(content).toMatch(/Intake 1/);
    expect(content).toMatch(/Intake 2/);
    expect(content).toMatch(/setIntakePeriod\(1\)/);
    expect(content).toMatch(/setIntakePeriod\(2\)/);
    expect(content).toContain('Pertengahan Tahun');
    expect(content).toContain('Awal Tahun');
  });

  it('preserves all security and critical profile submission operations', () => {
    expect(content).toContain('check_matric_registered');
    expect(content).toContain('verify_staff_code');
    expect(content).toContain('delete_own_account');
    expect(content).toContain('student_club_memberships');
    expect(content).toContain('getAkademikClubId');
    expect(content).toContain('refetchProfile');
  });

  it('preserves phone only and cohort only partial update scenarios', () => {
    expect(content).toContain('isOnlyMissingPhone');
    expect(content).toContain('isOnlyMissingCohort');
    expect(content).toContain('isMissingPhoneAndCohort');
    expect(content).toContain('isMissingCoreFields');
  });

  it('requires password creation and updateUser for full registration (Google SSO dual-auth)', () => {
    expect(content).toContain('supabase.auth.updateUser({ password');
    expect(content).toContain('Cipta Kata Laluan Akaun');
    expect(content).toContain('showPassword');
    expect(content).toContain('confirmPassword');
  });
});
