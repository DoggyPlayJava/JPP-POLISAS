import { describe, it, expect } from 'vitest';
import {
  SettingsPage,
  resolveSettingsTab,
  SETTINGS_TAB_CONFIG,
} from '@/pages/SettingsPage';
import DefaultSettingsPage from '@/pages/SettingsPage';

describe('SettingsPage Super App Profile Hub', () => {
  describe('Exports and Component Definition', () => {
    it('exports SettingsPage as named and default component', () => {
      expect(SettingsPage).toBeDefined();
      expect(typeof SettingsPage).toBe('function');
      expect(DefaultSettingsPage).toBeDefined();
      expect(typeof DefaultSettingsPage).toBe('function');
      expect(SettingsPage).toBe(DefaultSettingsPage);
    });
  });

  describe('Tab Configuration & Backward Compatibility', () => {
    it('defines exactly the 6 super app tabs in correct sequence without obsolete billing', () => {
      const tabIds = SETTINGS_TAB_CONFIG.map(t => t.id);
      expect(tabIds).toEqual([
        'profil',
        'kediaman',
        'tema',
        'notifikasi',
        'keselamatan',
        'bantuan',
      ]);
      expect(tabIds).not.toContain('billing');
    });

    it('contains rich labels and descriptions for all 6 tabs', () => {
      const profilTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'profil');
      expect(profilTab?.label).toContain('Profil');

      const kediamanTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'kediaman');
      expect(kediamanTab?.label).toContain('Kediaman');

      const temaTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'tema');
      expect(temaTab?.label).toContain('Tema');

      const notifikasiTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'notifikasi');
      expect(notifikasiTab?.label).toContain('Pemberitahuan');

      const keselamatanTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'keselamatan');
      expect(keselamatanTab?.label).toContain('Keselamatan');

      const bantuanTab = SETTINGS_TAB_CONFIG.find(t => t.id === 'bantuan');
      expect(bantuanTab?.label).toContain('Bantuan');
    });

    it('maps legacy tab parameters to new super app tab ids seamlessly', () => {
      // Legacy Vercel-style query parameters
      expect(resolveSettingsTab('general')).toBe('profil');
      expect(resolveSettingsTab('notifications')).toBe('notifikasi');
      expect(resolveSettingsTab('security')).toBe('keselamatan');
      expect(resolveSettingsTab('help')).toBe('bantuan');

      // Obsolete billing fallback
      expect(resolveSettingsTab('billing')).toBe('profil');

      // Native modern super app tab ids
      expect(resolveSettingsTab('profil')).toBe('profil');
      expect(resolveSettingsTab('kediaman')).toBe('kediaman');
      expect(resolveSettingsTab('tema')).toBe('tema');
      expect(resolveSettingsTab('notifikasi')).toBe('notifikasi');
      expect(resolveSettingsTab('keselamatan')).toBe('keselamatan');
      expect(resolveSettingsTab('bantuan')).toBe('bantuan');

      // Case insensitivity and whitespace trimming
      expect(resolveSettingsTab('  GENERAL  ')).toBe('profil');
      expect(resolveSettingsTab('NOTIFICATIONS')).toBe('notifikasi');
      expect(resolveSettingsTab('Tema')).toBe('tema');

      // Defaults for undefined, null, empty or unknown parameters
      expect(resolveSettingsTab(undefined)).toBe('profil');
      expect(resolveSettingsTab(null)).toBe('profil');
      expect(resolveSettingsTab('')).toBe('profil');
      expect(resolveSettingsTab('random_unknown_tab')).toBe('profil');
    });
  });
});
