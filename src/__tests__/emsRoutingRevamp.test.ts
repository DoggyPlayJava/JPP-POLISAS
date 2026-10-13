import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS Routing & App Shell Layout Alignment', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const appPath = path.resolve(rootDir, 'src/App.tsx');
  const approvalPagePath = path.resolve(rootDir, 'src/pages/ems/EmsApprovalPage.tsx');
  const checkinSelectorPagePath = path.resolve(rootDir, 'src/pages/ems/EmsCheckinSelectorPage.tsx');
  const eventFormPagePath = path.resolve(rootDir, 'src/pages/ems/EmsEventFormPage.tsx');

  it('checks that src/App.tsx has /ems redirecting to /ems/dashboard', () => {
    const appContent = fs.readFileSync(appPath, 'utf-8');
    expect(appContent).toContain('<Route path="/ems" element={<Navigate to="/ems/dashboard" replace />} />');
  });

  it('checks that src/pages/ems/EmsApprovalPage.tsx does NOT contain <ThemeToggle', () => {
    const approvalContent = fs.readFileSync(approvalPagePath, 'utf-8');
    expect(approvalContent).not.toContain('<ThemeToggle');
  });

  it('checks that src/pages/ems/EmsCheckinSelectorPage.tsx does NOT contain <ThemeToggle', () => {
    const checkinContent = fs.readFileSync(checkinSelectorPagePath, 'utf-8');
    expect(checkinContent).not.toContain('<ThemeToggle');
  });

  it('checks that src/pages/ems/EmsEventFormPage.tsx does NOT contain <ThemeToggle', () => {
    const formContent = fs.readFileSync(eventFormPagePath, 'utf-8');
    expect(formContent).not.toContain('<ThemeToggle');
  });
});
