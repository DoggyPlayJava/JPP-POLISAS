import { describe, it, expect } from 'vitest';

// Core namespaces
import commonEn from '../en/common.json';
import commonMs from '../ms/common.json';
import authEn from '../en/auth.json';
import authMs from '../ms/auth.json';
import navEn from '../en/nav.json';
import navMs from '../ms/nav.json';
import settingsEn from '../en/settings.json';
import settingsMs from '../ms/settings.json';

// Domain namespaces
import portalEn from '../en/portal.json';
import portalMs from '../ms/portal.json';
import kppEn from '../en/kpp.json';
import kppMs from '../ms/kpp.json';
import jppEn from '../en/jpp.json';
import jppMs from '../ms/jpp.json';
import keusahawananEn from '../en/keusahawanan.json';
import keusahawananMs from '../ms/keusahawanan.json';
import kebajikanEn from '../en/kebajikan.json';
import kebajikanMs from '../ms/kebajikan.json';
import karnivalEn from '../en/karnival.json';
import karnivalMs from '../ms/karnival.json';
import emsEn from '../en/ems.json';
import emsMs from '../ms/ems.json';
import makmpEn from '../en/makmp.json';
import makmpMs from '../ms/makmp.json';
import commerceEn from '../en/commerce.json';
import commerceMs from '../ms/commerce.json';
import servicesEn from '../en/services.json';
import servicesMs from '../ms/services.json';
import akademikEn from '../en/akademik.json';
import akademikMs from '../ms/akademik.json';
import housingEn from '../en/housing.json';
import housingMs from '../ms/housing.json';
import supsasEn from '../en/supsas.json';
import supsasMs from '../ms/supsas.json';

function verifyParity(enObj: Record<string, any>, msObj: Record<string, any>, namespace: string) {
  const enKeys = Object.keys(enObj).sort();
  const msKeys = Object.keys(msObj).sort();
  expect(enKeys, `Keys in ${namespace} should match exactly`).toEqual(msKeys);
  for (const key of enKeys) {
    expect(typeof enObj[key], `Value for ${namespace}:${key} in EN must be a string`).toBe('string');
    expect(typeof msObj[key], `Value for ${namespace}:${key} in MS must be a string`).toBe('string');
    expect(enObj[key].trim().length, `Value for ${namespace}:${key} in EN cannot be empty`).toBeGreaterThan(0);
    expect(msObj[key].trim().length, `Value for ${namespace}:${key} in MS cannot be empty`).toBeGreaterThan(0);
  }
}

describe('Master Translation Dictionaries Parity (100% All Domains)', () => {
  it('has identical keys for common namespace', () => verifyParity(commonEn, commonMs, 'common'));
  it('has identical keys for auth namespace', () => verifyParity(authEn, authMs, 'auth'));
  it('has identical keys for nav namespace', () => verifyParity(navEn, navMs, 'nav'));
  it('has identical keys for settings namespace', () => verifyParity(settingsEn, settingsMs, 'settings'));
  it('has identical keys for portal namespace', () => verifyParity(portalEn, portalMs, 'portal'));
  it('has identical keys for kpp namespace', () => verifyParity(kppEn, kppMs, 'kpp'));
  it('has identical keys for jpp namespace', () => verifyParity(jppEn, jppMs, 'jpp'));
  it('has identical keys for keusahawanan namespace', () => verifyParity(keusahawananEn, keusahawananMs, 'keusahawanan'));
  it('has identical keys for kebajikan namespace', () => verifyParity(kebajikanEn, kebajikanMs, 'kebajikan'));
  it('has identical keys for karnival namespace', () => verifyParity(karnivalEn, karnivalMs, 'karnival'));
  it('has identical keys for ems namespace', () => verifyParity(emsEn, emsMs, 'ems'));
  it('has identical keys for makmp namespace', () => verifyParity(makmpEn, makmpMs, 'makmp'));
  it('has identical keys for commerce namespace', () => verifyParity(commerceEn, commerceMs, 'commerce'));
  it('has identical keys for services namespace', () => verifyParity(servicesEn, servicesMs, 'services'));
  it('has identical keys for akademik namespace', () => verifyParity(akademikEn, akademikMs, 'akademik'));
  it('has identical keys for housing namespace', () => verifyParity(housingEn, housingMs, 'housing'));
  it('has identical keys for supsas namespace', () => verifyParity(supsasEn, supsasMs, 'supsas'));
});
