import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const DASH_REGEX = /[\u2013\u2014]/g;

describe('Task 2: Navigasi Kampus PolyMaps Earthy Minimal System', () => {
  const polyMapsPath = path.resolve(__dirname, '../pages/polymaps/PolyMapsPage.tsx');
  const source = fs.readFileSync(polyMapsPath, 'utf-8');

  it('contains 100% zero raw emojis across PolyMapsPage.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('contains strictly zero em-dashes and en-dashes across PolyMapsPage.tsx', () => {
    const dashMatches = source.match(DASH_REGEX) || [];
    expect(dashMatches).toEqual([]);
  });

  it('implements Earthy Minimal floating search capsule and menu button', () => {
    expect(source).toContain('bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 backdrop-blur-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)]');
    expect(source).toContain('text-[#6B7F5B]');
    expect(source).toContain('text-[#2E3A2F] dark:text-[#F8F6EE]');
  });

  it('applies Earthy Minimal tokens to Quick Filter Pills', () => {
    expect(source).toContain('bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white');
    expect(source).toContain('bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]');
  });

  it('implements Earthy Minimal surface and tactile snap controls on Bottom Sheet Container', () => {
    expect(source).toContain('bg-white/95 dark:bg-[#151D16]/95 backdrop-blur-2xl border-t border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_-10px_40px_rgba(46,58,47,0.12)]');
    expect(source).toContain('bg-[#F8F6EE] dark:bg-[#1E271F] border border-[#D9C9B2]/80 dark:border-[#3A4A3B]');
    expect(source).toContain('bg-[#2E3A2F] text-[#F8F6EE] dark:bg-[#6B7F5B] dark:text-white');
    expect(source).toContain('text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F]');
  });

  it('styles Building Sheet with 360 AKTIF badge, Sage Green button, and Terracotta CTA', () => {
    expect(source).toContain('360 AKTIF');
    expect(source).toContain('bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] text-white shadow-lg shadow-[#2E3A2F]/20');
    expect(source).toContain('bg-[#C96F4F] hover:bg-[#B35F41] text-white shadow-lg shadow-[#C96F4F]/25');
    expect(source).toContain('bg-[#F8F6EE]/60 dark:bg-[#1E271F]/60 border-[#D9C9B2]/60 dark:border-[#3A4A3B]');
  });

  it('applies Earthy Minimal styling to Explore Accordion Sidebar', () => {
    expect(source).toContain('bg-[#F8F6EE] dark:bg-[#151D16]');
    expect(source).toContain('border-[#D9C9B2]/50 dark:border-[#3A4A3B]');
  });

  it('preserves performance optimization and singleton Supabase instance', () => {
    expect(source).toContain('isLowEnd');
    expect(source).toContain("from '@/lib/supabase'");
  });
});
