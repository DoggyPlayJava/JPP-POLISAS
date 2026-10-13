import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS User Experience (UX) Revamp Audit', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const dashboardPath = path.resolve(rootDir, 'src/pages/ems/EmsDashboardPage.tsx');
  const formPath = path.resolve(rootDir, 'src/pages/ems/EmsEventFormPage.tsx');
  const registerPath = path.resolve(rootDir, 'src/pages/ems/EmsPublicRegisterPage.tsx');
  const approvalPath = path.resolve(rootDir, 'src/pages/ems/EmsApprovalPage.tsx');

  it('checks that EmsDashboardPage has search input and Portal wayfinding breadcrumb', () => {
    const content = fs.readFileSync(dashboardPath, 'utf-8');
    expect(content).toMatch(/searchQuery|setSearchQuery/);
    expect(content).toMatch(/Kembali ke Portal|navigate\('\/portal'\)|navigate\('\/'\)/);
  });

  it('checks that EmsDashboardPage has confirmation safeguard before marking event completed', () => {
    const content = fs.readFileSync(dashboardPath, 'utf-8');
    expect(content).toMatch(/confirmComplete|setConfirmComplete/);
  });

  it('checks that EmsEventFormPage has quick section navigation bar or anchors', () => {
    const content = fs.readFileSync(formPath, 'utf-8');
    expect(content).toMatch(/sec-info|sec-datetime|sec-form-fields|sec-rubrics|activeSection/);
  });

  it('checks that EmsEventFormPage validates empty criteria names before submitting', () => {
    const content = fs.readFileSync(formPath, 'utf-8');
    expect(content).toMatch(/criteria_name\.trim\(\)|emptyCriteria/);
  });

  it('checks that EmsPublicRegisterPage scrolls to top smoothly on step change', () => {
    const content = fs.readFileSync(registerPath, 'utf-8');
    expect(content).toMatch(/window\.scrollTo\(\{.*top:\s*0/s);
  });

  it('checks that EmsApprovalPage requires or strongly prompts for a rejection reason', () => {
    const content = fs.readFileSync(approvalPath, 'utf-8');
    expect(content).toMatch(/!rejectNote\.trim\(\)/);
  });
});
