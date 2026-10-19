import { describe, it, expect } from 'vitest';
import commonEn from '../en/common.json';
import commonMs from '../ms/common.json';
import authEn from '../en/auth.json';
import authMs from '../ms/auth.json';
import navEn from '../en/nav.json';
import navMs from '../ms/nav.json';
import settingsEn from '../en/settings.json';
import settingsMs from '../ms/settings.json';

function verifyParity(enObj: Record<string, any>, msObj: Record<string, any>, namespace: string) {
  const enKeys = Object.keys(enObj).sort();
  const msKeys = Object.keys(msObj).sort();
  expect(enKeys, `Keys in ${namespace} should match`).toEqual(msKeys);
  for (const key of enKeys) {
    expect(typeof enObj[key]).toBe('string');
    expect(typeof msObj[key]).toBe('string');
    expect(enObj[key].trim().length).toBeGreaterThan(0);
    expect(msObj[key].trim().length).toBeGreaterThan(0);
  }
}

describe('Translation Dictionaries Parity', () => {
  it('has identical keys for common namespace', () => {
    verifyParity(commonEn, commonMs, 'common');
  });

  it('has identical keys for auth namespace', () => {
    verifyParity(authEn, authMs, 'auth');
  });

  it('has identical keys for nav namespace', () => {
    verifyParity(navEn, navMs, 'nav');
  });

  it('has identical keys for settings namespace', () => {
    verifyParity(settingsEn, settingsMs, 'settings');
  });
});
