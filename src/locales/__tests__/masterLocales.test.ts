import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const localesDir = path.resolve(__dirname, '..');

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
import klkEn from '../en/klk.json';
import klkMs from '../ms/klk.json';
import supsasEn from '../en/supsas.json';
import supsasMs from '../ms/supsas.json';
import gigEn from '../en/gig.json';
import gigMs from '../ms/gig.json';

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
  it('has identical keys for klk namespace', () => verifyParity(klkEn, klkMs, 'klk'));
  it('has identical keys for supsas namespace', () => verifyParity(supsasEn, supsasMs, 'supsas'));
  it('has identical keys for gig namespace', () => verifyParity(gigEn, gigMs, 'gig'));

  it('ensures English translations do not have redundant slashes or overlong parentheticals', () => {
    const namespaces = ['common', 'akademik', 'kebajikan', 'jpp', 'makmp', 'ems', 'supsas', 'housing', 'keusahawanan', 'gig'];
    namespaces.forEach(ns => {
      const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', `${ns}.json`), 'utf-8'));
      // Ensure pruned keys are concise
      if (ns === 'common' && en.ic_no) {
        expect(en.ic_no).not.toContain(' / ');
      }
      if (ns === 'kebajikan' && en.foodbank_package_mode) {
        expect(en.foodbank_package_mode.length).toBeLessThan(25);
      }
      if (ns === 'akademik' && en.appeal_approved_toast) {
        expect(en.appeal_approved_toast).toBe('Appeal approved');
      }
      if (ns === 'akademik') {
        if (en.evidence_url) expect(en.evidence_url).toBe('Evidence Link (Optional)');
        if (en.unlock_reason_placeholder) expect(en.unlock_reason_placeholder).toBe('State reason for request...');
      }
      if (ns === 'kebajikan') {
        if (en.submit_title) expect(en.submit_title).toBe('Student Complaint System');
        if (en.submit_duplicate_title) expect(en.submit_duplicate_title).toBe('Similar Complaint in Progress');
      }
      if (ns === 'jpp') {
        if (en.announcements_push_toggle) expect(en.announcements_push_toggle).toBe('Push Notification');
        if (en.services_status_investigating) expect(en.services_status_investigating).toBe('New / Investigating');
        if (en.announcements_composer_title) expect(en.announcements_composer_title).toBe('Announcement Creator');
      }
      if (ns === 'makmp') {
        if (en.nom_ic_no) expect(en.nom_ic_no).toBe('Identity Card Number');
        if (en.nom_step_documents) expect(en.nom_step_documents).toBe('Attachments & Certs');
        if (en.track_documents_list) expect(en.track_documents_list).toBe('Supporting Documents');
      }
      if (ns === 'ems' && en.reg_ic_no) {
        expect(en.reg_ic_no).toBe('Identity Card Number');
      }
      if (ns === 'supsas' && en.no_edition_warning) {
        expect(en.no_edition_warning).toBe('No edition found');
      }
      if (ns === 'housing' && en.stat_kamsis_students) {
        expect(en.stat_kamsis_students).toBe('In Dormitory');
      }
      if (ns === 'keusahawanan' && en.shift_opening_checklist) {
        expect(en.shift_opening_checklist).toBe('Opening Checklist');
      }
    });
  });
});
