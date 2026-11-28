import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  resolveNotificationLink,
  localizeNotification,
} from '@/lib/notifications';
import {
  FRIENDLY_ANON_PERSONAS,
  isLegacyAnimalCodename,
  normalizePolySuaraCodename,
} from '@/lib/polySuaraHelpers';

describe('Notifications Deep-Linking, Localization (EN/MS), and Fictional Persona Normalization', () => {
  describe('resolveNotificationLink', () => {
    it('upgrades legacy /polysuara?id=<uuid> links to /polysuara?post=<uuid>', () => {
      const link = resolveNotificationLink({
        link: '/polysuara?id=conf-123',
        module: 'POLYSUARA',
        type: 'COMMENT',
        reference_id: 'conf-123',
      });
      expect(link).toBe('/polysuara?post=conf-123');
    });

    it('preserves exact ?post=<id>&comment=<cid> query parameters for PolySuara comments & replies', () => {
      const link = resolveNotificationLink({
        link: '/polysuara?post=conf-456&comment=comm-789',
        module: 'POLYSUARA',
        type: 'COMMENT_REPLY',
        reference_id: 'conf-456',
      });
      expect(link).toBe('/polysuara?post=conf-456&comment=comm-789');
    });

    it('enriches bare /polysuara link or missing link using reference_id', () => {
      expect(
        resolveNotificationLink({
          link: '/polysuara',
          module: 'POLYSUARA',
          type: 'UPVOTE_MILESTONE',
          reference_id: 'conf-999',
        })
      ).toBe('/polysuara?post=conf-999');

      expect(
        resolveNotificationLink({
          link: null,
          module: 'POLYSUARA',
          type: 'COMMENT',
          reference_id: 'conf-888',
        })
      ).toBe('/polysuara?post=conf-888');
    });

    it('routes legacy Kebajikan chat links to exact ticket detail for Exco vs student', () => {
      expect(
        resolveNotificationLink({
          link: '/kebajikan/buat-aduan',
          module: 'KEBAJIKAN',
          type: 'kebajikan_ticket_comment',
          title: '[Kebajikan] Komen Baru Tiket [TKT-001]',
          reference_id: 'ticket-abc',
        })
      ).toBe('/kebajikan/tiket/ticket-abc');

      expect(
        resolveNotificationLink({
          link: '/kebajikan/buat-aduan',
          module: 'KEBAJIKAN',
          type: 'kebajikan_ticket_comment',
          title: '[Kebajikan] Maklumbalas Tiket [TKT-001]',
          reference_id: 'ticket-abc',
        })
      ).toBe('/kebajikan/aduan/ticket-abc');
    });

    it('enriches PolyMart order & chat links and PolyTask / MAKMP links', () => {
      expect(
        resolveNotificationLink({
          link: '/polymart/pesanan-saya',
          module: 'POLYMART',
          type: 'polymart_order_ready',
          reference_id: 'ord-55',
        })
      ).toBe('/polymart/pesanan-saya?order=ord-55');

      expect(
        resolveNotificationLink({
          link: '/polymart/vendor',
          module: 'POLYMART',
          type: 'polymart_cancellation_request',
          reference_id: 'ord-77',
        })
      ).toBe('/polymart/vendor?order=ord-77');

      expect(
        resolveNotificationLink({
          link: '/polymart',
          module: 'POLYMART',
          type: 'polymart_chat_msg',
          reference_id: 'conv-12',
        })
      ).toBe('/polymart/mesej?chat=conv-12');

      expect(
        resolveNotificationLink({
          link: '/polytask',
          module: 'POLYTASK',
          type: 'polytask_assigned',
          reference_id: 'job-90',
        })
      ).toBe('/polytask/job/job-90');

      expect(
        resolveNotificationLink({
          link: null,
          module: 'MAKMP',
          type: 'MAKMP',
          reference_id: 'MK-2026-01',
        })
      ).toBe('/makmp/status?code=MK-2026-01');
    });
  });

  describe('localizeNotification (EN & MS Parity)', () => {
    it('translates PolySuara comment, reply, upvote, downvote, and auto-hide notifications cleanly to EN and MS', () => {
      const commentEn = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'COMMENT',
          title: 'Ulasan baharu pada luahan PolySuara anda',
          message: 'Seseorang mengulas luahan anda: "Setuju sangat!"',
        },
        undefined,
        'en'
      );
      expect(commentEn.title).toBe('New Comment');
      expect(commentEn.message).toBe('Someone commented on your post: "Setuju sangat!"');

      const replyEn = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'COMMENT_REPLY',
          title: 'Balasan baharu pada ulasan PolySuara anda',
          message: 'Seseorang membalas ulasan anda: "Betul tu!"',
        },
        undefined,
        'en'
      );
      expect(replyEn.title).toBe('New Reply');
      expect(replyEn.message).toBe('Someone replied to your comment: "Betul tu!"');

      const replyMs = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'COMMENT_REPLY',
          title: 'New reply to your PolySuara comment',
          message: 'Someone replied to your comment: "Nice point"',
        },
        undefined,
        'ms'
      );
      expect(replyMs.title).toBe('Balasan Baharu');
      expect(replyMs.message).toBe('Seseorang membalas ulasan anda: "Nice point"');

      const upvoteEn = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'UPVOTE_MILESTONE',
          title: 'Luahan PolySuara anda sedang hangat!',
          message: 'Luahan anda telah mencapai 25 sokongan daripada warga kampus.',
        },
        undefined,
        'en'
      );
      expect(upvoteEn.title).toBe('Popular Post on PolySuara');
      expect(upvoteEn.message).toContain('25 upvotes');

      const autoHideEn = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'AUTO_HIDE',
          title: 'Luahan PolySuara Disembunyikan Komuniti',
          message: 'Luahan anda disembunyikan.',
        },
        undefined,
        'en'
      );
      expect(autoHideEn.title).toBe('PolySuara Post Hidden');
    });

    it('sanitizes legacy animal names & ghost labels inside PolySuara broadcast notifications', () => {
      const sanitizedEn = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'NEW_CONFESSION',
          title: 'Kucing Oren baru luah sesuatu',
          message: 'Cerita kampus hari ini',
        },
        undefined,
        'en'
      );
      expect(sanitizedEn.title).not.toContain('Kucing');
      expect(sanitizedEn.title).toContain('shared on PolySuara');

      const ghostSanitized = localizeNotification(
        {
          module: 'POLYSUARA',
          type: 'NEW_CONFESSION',
          title: 'Hantu Tanpa Nama berkongsi di PolySuara',
          message: 'Salam semua',
        },
        undefined,
        'en'
      );
      expect(ghostSanitized.title).not.toContain('Hantu');
      expect(ghostSanitized.title).toContain('Korra');
    });

    it('localizes PolyMart, Kebajikan, MAKMP, and EKPP notifications into EN cleanly', () => {
      const pmEn = localizeNotification(
        {
          module: 'POLYMART',
          type: 'polymart_order_ready',
          title: '[PolyMart] Pesanan Siap Diambil',
          message: 'Pesanan anda (2x Nasi Lemak) sudah siap. Sila datang ambil!',
        },
        undefined,
        'en'
      );
      expect(pmEn.title).toBe('[PolyMart] Order Ready for Pickup');
      expect(pmEn.message).toContain('Your order');

      const kbEn = localizeNotification(
        {
          module: 'KEBAJIKAN',
          type: 'kebajikan_ticket_comment',
          title: '[Kebajikan] Maklumbalas Tiket [KBJ-102]',
          message: 'Urusetia: Menghantar pautan tiket',
        },
        undefined,
        'en'
      );
      expect(kbEn.title).toContain('Ticket Reply');
      expect(kbEn.message).toContain('Sent a ticket link');

      const makmpEn = localizeNotification(
        {
          module: 'MAKMP',
          type: 'MAKMP',
          title: '🎉 Tahniah! Anda Dicalonkan 3 Teratas MAKMP',
          message: 'Tahniah! Anda telah dicalonkan sebagai antara 3 teratas bagi anugerah "Anugerah Kepimpinan". Sila lengkapkan maklumat diri anda di portal.',
        },
        undefined,
        'en'
      );
      expect(makmpEn.title).toBe('Congratulations! Top 3 MAKMP Finalist');
      expect(makmpEn.message).toContain('Top 3');

      const ekppEn = localizeNotification(
        {
          module: 'EKPP',
          type: 'club_approved',
          title: 'Permohonan Diluluskan',
          message: 'Tahniah! Permohonan anda untuk menyertai Kelab Robotik telah diluluskan.',
        },
        undefined,
        'en'
      );
      expect(ekppEn.title).toBe('Application Approved');
      expect(ekppEn.message).toContain('Kelab Robotik has been approved.');
    });
  });

  describe('Zero-Animal Fictional Character Roster Coverage (70 Characters)', () => {
    it('remaps every legacy animal stem deterministically to one of the 70 curated characters across 7 franchises', () => {
      expect(FRIENDLY_ANON_PERSONAS).toHaveLength(70);
      const validNames = new Set(FRIENDLY_ANON_PERSONAS.map((p) => p.displayName));
      const legacyAnimals = [
        'Kucing Oren',
        'Harimau Berani',
        'Singa Santai',
        'Musang Cerdik',
        'Tupai Laju',
        'Burung Hantu',
        'Helang Biru',
        'Panda Comel',
        'Beruang Madu',
        'Arnab Pantas',
        'Koala Tenang',
        'Rusa Riang',
        'Kancil Bijak',
        'Otter Ceria',
        'Zirafah Tinggi',
        'Hantu Tanpa Nama',
        'Anon-a1b2c3',
      ];

      for (const raw of legacyAnimals) {
        const res = normalizePolySuaraCodename(raw);
        expect(validNames.has(res.displayName)).toBe(true);
        expect(isLegacyAnimalCodename(res.displayName)).toBe(false);
        expect(res.displayName).toBe(normalizePolySuaraCodename(raw).displayName);
      }
    });

    it('keeps the exact same 70-character list synchronized across polySuaraHelpers.ts, server.js, and SQL migration', () => {
      const rootDir = path.resolve(__dirname, '../..');
      const serverSrc = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf-8');
      const sqlSrc = fs.readFileSync(
        path.join(rootDir, 'supabase/migrations/20261128190000_polysuara_fictional_personas_deeplinks_and_notif_locale.sql'),
        'utf-8'
      );

      const serverArrayMatch = serverSrc.match(/const FICTIONAL_POLYSUARA_PERSONAS = \[([\s\S]*?)\];/);
      expect(serverArrayMatch).not.toBeNull();
      const serverNames = Array.from(serverArrayMatch![1].matchAll(/'([^']+)'/g), (m) => m[1]);

      const sqlArrayMatch = sqlSrc.match(/personas TEXT\[\] := ARRAY\[([\s\S]*?)\];/);
      expect(sqlArrayMatch).not.toBeNull();
      const sqlNames = Array.from(sqlArrayMatch![1].matchAll(/'([^']+)'/g), (m) => m[1]);

      const tsNames = FRIENDLY_ANON_PERSONAS.map((p) => p.displayName);
      expect(tsNames).toHaveLength(70);
      expect(serverNames).toEqual(tsNames);
      expect(sqlNames).toEqual(tsNames);
    });
  });
});
