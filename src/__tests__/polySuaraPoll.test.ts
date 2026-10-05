import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { supabase } from '@/lib/supabase';
import {
  PolySuaraPoll,
  calculateNextPollVoteState,
  PollOption,
  PollProps,
} from '@/pages/polyservices/PolySuaraPoll';
import DefaultPolySuaraPoll from '@/pages/polyservices/PolySuaraPoll';

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Helper to inspect the React tree returned by PolySuaraPoll with active React dispatcher
function renderComponentTree(props: PollProps) {
  let captured: React.ReactElement | null = null;
  function Harness() {
    captured = PolySuaraPoll(props);
    return captured;
  }
  const html = renderToString(React.createElement(Harness));
  return { tree: captured as unknown as React.ReactElement, html };
}

// Recursive finder for React virtual elements matching a predicate
function findElements(node: any, predicate: (element: any) => boolean, results: any[] = []): any[] {
  if (!node) return results;
  if (Array.isArray(node)) {
    for (const item of node) {
      findElements(item, predicate, results);
    }
    return results;
  }
  if (typeof node !== 'object') return results;
  if (predicate(node)) {
    results.push(node);
  }
  if (node.props && node.props.children) {
    findElements(node.props.children, predicate, results);
  }
  return results;
}

describe('PolySuaraPoll Apple Porcelain & Dual Mode Suite', () => {
  const samplePoll: PollProps['poll'] = {
    id: 'poll-101',
    is_multiple_choice: false,
    polysuara_poll_options: [
      {
        id: 'opt-1',
        option_text: 'Menu Kafeteria Baru',
        vote_count: 10,
        polysuara_poll_votes: [{ user_id: 'usr-current' }, { user_id: 'usr-other-1' }],
      },
      {
        id: 'opt-2',
        option_text: 'Kekalkan Menu Sekarang',
        vote_count: 5,
        polysuara_poll_votes: [{ user_id: 'usr-other-2' }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Exports & Structure', () => {
    it('exports PolySuaraPoll as named and default export', () => {
      expect(PolySuaraPoll).toBeDefined();
      expect(typeof PolySuaraPoll).toBe('function');
      expect(DefaultPolySuaraPoll).toBeDefined();
      expect(PolySuaraPoll).toBe(DefaultPolySuaraPoll);
      expect(calculateNextPollVoteState).toBeDefined();
      expect(typeof calculateNextPollVoteState).toBe('function');
    });
  });

  describe('Apple Porcelain & Rose Glow Dual Theme Styling', () => {
    it('renders outer container with Apple Porcelain light mode and obsidian dark mode classes', () => {
      const { html, tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      expect(tree.props.className).toContain('bg-slate-50/90');
      expect(tree.props.className).toContain('dark:bg-slate-900/50');
      expect(tree.props.className).toContain('border-slate-200/80');
      expect(tree.props.className).toContain('dark:border-slate-800');
      expect(tree.props.className).toContain('shadow-2xs');
      expect(html).toContain('bg-slate-50/90');
    });

    it('renders header with dual theme muted uppercase typography', () => {
      const { tree, html } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const header = findElements(tree, el => el.props?.className?.includes('tracking-wider'))[0];
      expect(header).toBeDefined();
      expect(header.props.className).toContain('text-slate-500');
      expect(header.props.className).toContain('dark:text-slate-400');
      expect(header.props.className).toContain('text-xs');
      expect(header.props.className).toContain('font-bold');
      expect(header.props.className).toContain('uppercase');
      expect(html).toContain('Undian');
    });

    it('renders indicator for multiple choice polls in header', () => {
      const multiplePoll = {
        ...samplePoll,
        is_multiple_choice: true,
      };
      const { html } = renderComponentTree({
        poll: multiplePoll,
        currentUserId: 'usr-current',
      });

      expect(html).toContain('(Pelbagai Pilihan)');
    });

    it('renders option buttons with distinct voted vs default porcelain dual theme classes', () => {
      const { tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const buttons = findElements(tree, el => el.type === 'button');
      expect(buttons.length).toBe(2);

      // First button is voted by usr-current
      const votedBtn = buttons[0];
      expect(votedBtn.props.className).toContain('border-rose-400/60');
      expect(votedBtn.props.className).toContain('dark:border-rose-500/50');
      expect(votedBtn.props.className).toContain('bg-rose-50/60');
      expect(votedBtn.props.className).toContain('dark:bg-rose-500/10');
      expect(votedBtn.props.className).toContain('shadow-xs');
      expect(votedBtn.props.className).toContain('ring-1');
      expect(votedBtn.props.className).toContain('ring-rose-400/20');
      expect(votedBtn.props.className).toContain('dark:ring-rose-500/20');

      // Second button is not voted
      const unvotedBtn = buttons[1];
      expect(unvotedBtn.props.className).toContain('border-slate-200/80');
      expect(unvotedBtn.props.className).toContain('dark:border-slate-800');
      expect(unvotedBtn.props.className).toContain('bg-white');
      expect(unvotedBtn.props.className).toContain('dark:bg-slate-800/50');
      expect(unvotedBtn.props.className).toContain('hover:border-slate-300');
      expect(unvotedBtn.props.className).toContain('dark:hover:border-slate-700');
      expect(unvotedBtn.props.className).toContain('shadow-2xs');
    });

    it('renders progress bar fill with Rose Glow for voted option and subtle slate for unvoted', () => {
      const { tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const buttons = findElements(tree, el => el.type === 'button');
      
      const votedBar = findElements(buttons[0], el => el.props?.className?.includes('absolute inset-y-0'))[0];
      expect(votedBar.props.className).toContain('bg-rose-500/20');
      expect(votedBar.props.className).toContain('dark:bg-rose-500/25');

      const unvotedBar = findElements(buttons[1], el => el.props?.className?.includes('absolute inset-y-0'))[0];
      expect(unvotedBar.props.className).toContain('bg-slate-100');
      expect(unvotedBar.props.className).toContain('dark:bg-slate-700/40');
    });

    it('renders option text with high contrast rose-950/rose-100 when voted, slate-800/200 when unvoted', () => {
      const { tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const buttons = findElements(tree, el => el.type === 'button');

      const votedText = findElements(buttons[0], el => el.props?.children === 'Menu Kafeteria Baru')[0];
      expect(votedText.props.className).toContain('text-rose-950');
      expect(votedText.props.className).toContain('dark:text-rose-100');
      expect(votedText.props.className).toContain('font-semibold');

      const unvotedText = findElements(buttons[1], el => el.props?.children === 'Kekalkan Menu Sekarang')[0];
      expect(unvotedText.props.className).toContain('text-slate-800');
      expect(unvotedText.props.className).toContain('dark:text-slate-200');
      expect(unvotedText.props.className).toContain('font-medium');
    });

    it('renders percentage and vote count with mono numerals and dual theme rose/slate colors', () => {
      const { tree, html } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const buttons = findElements(tree, el => el.type === 'button');

      // Total votes = 10 + 5 = 15. opt-1 = 10/15 (67%), opt-2 = 5/15 (33%)
      const votedStat = findElements(buttons[0], el => el.props?.className?.includes('font-mono'))[0];
      expect(votedStat.props.className).toContain('text-rose-600');
      expect(votedStat.props.className).toContain('dark:text-rose-400');
      expect(votedStat.props.className).toContain('font-bold');

      const unvotedStat = findElements(buttons[1], el => el.props?.className?.includes('font-mono'))[0];
      expect(unvotedStat.props.className).toContain('text-slate-500');
      expect(unvotedStat.props.className).toContain('dark:text-slate-400');
      expect(unvotedStat.props.className).toContain('font-bold');

      const cleanHtml = html.replace(/<!--.*?-->/g, '');
      expect(cleanHtml).toContain('67% (10)');
      expect(cleanHtml).toContain('33% (5)');
    });

    it('renders total votes text with dual theme muted slate styling', () => {
      const { tree, html } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-current',
      });

      const totalFooter = findElements(tree, el => el.props?.className?.includes('JUMLAH UNDIAN:'))[0] ||
        findElements(tree, el => typeof el.props?.children === 'string' && el.props?.children.includes('JUMLAH UNDIAN'))[0] ||
        findElements(tree, el => Array.isArray(el.props?.children) && el.props?.children.some((c: any) => typeof c === 'string' && c.includes('JUMLAH UNDIAN')))[0];

      expect(totalFooter).toBeDefined();
      expect(totalFooter.props.className).toContain('text-slate-400');
      expect(totalFooter.props.className).toContain('dark:text-slate-500');
      expect(totalFooter.props.className).toContain('text-[10px]');
      const cleanHtml = html.replace(/<!--.*?-->/g, '');
      expect(cleanHtml).toContain('JUMLAH UNDIAN: 15');
    });
  });

  describe('Optimistic Vote State Logic (calculateNextPollVoteState)', () => {
    const testOptions: PollOption[] = [
      {
        id: 'opt-a',
        option_text: 'Pilihan A',
        vote_count: 3,
        polysuara_poll_votes: [{ user_id: 'usr-x' }],
      },
      {
        id: 'opt-b',
        option_text: 'Pilihan B',
        vote_count: 2,
        polysuara_poll_votes: [],
      },
    ];

    it('toggles vote ON when clicking unvoted option', () => {
      const next = calculateNextPollVoteState(testOptions, 'opt-b', 'usr-new', false);
      const optB = next.find(o => o.id === 'opt-b')!;
      expect(optB.vote_count).toBe(3);
      expect(optB.polysuara_poll_votes?.some(v => v.user_id === 'usr-new')).toBe(true);
    });

    it('toggles vote OFF when re-clicking an already voted option', () => {
      const alreadyVotedOptions: PollOption[] = [
        {
          id: 'opt-a',
          option_text: 'Pilihan A',
          vote_count: 3,
          polysuara_poll_votes: [{ user_id: 'usr-voter' }],
        },
      ];

      const next = calculateNextPollVoteState(alreadyVotedOptions, 'opt-a', 'usr-voter', false);
      const optA = next.find(o => o.id === 'opt-a')!;
      expect(optA.vote_count).toBe(2);
      expect(optA.polysuara_poll_votes?.some(v => v.user_id === 'usr-voter')).toBe(false);
    });

    it('switches vote in single-choice mode by clearing previous option vote', () => {
      const userVotedA: PollOption[] = [
        {
          id: 'opt-a',
          option_text: 'Pilihan A',
          vote_count: 5,
          polysuara_poll_votes: [{ user_id: 'usr-switcher' }],
        },
        {
          id: 'opt-b',
          option_text: 'Pilihan B',
          vote_count: 2,
          polysuara_poll_votes: [],
        },
      ];

      // User votes for option B (single-choice)
      const next = calculateNextPollVoteState(userVotedA, 'opt-b', 'usr-switcher', false);
      const optA = next.find(o => o.id === 'opt-a')!;
      const optB = next.find(o => o.id === 'opt-b')!;

      // Option A decremented & user removed
      expect(optA.vote_count).toBe(4);
      expect(optA.polysuara_poll_votes?.some(v => v.user_id === 'usr-switcher')).toBe(false);

      // Option B incremented & user added
      expect(optB.vote_count).toBe(3);
      expect(optB.polysuara_poll_votes?.some(v => v.user_id === 'usr-switcher')).toBe(true);
    });

    it('allows voting for multiple options simultaneously in multiple-choice mode', () => {
      const userVotedA: PollOption[] = [
        {
          id: 'opt-a',
          option_text: 'Pilihan A',
          vote_count: 5,
          polysuara_poll_votes: [{ user_id: 'usr-multi' }],
        },
        {
          id: 'opt-b',
          option_text: 'Pilihan B',
          vote_count: 2,
          polysuara_poll_votes: [],
        },
      ];

      // User votes for option B with isMultipleChoice = true
      const next = calculateNextPollVoteState(userVotedA, 'opt-b', 'usr-multi', true);
      const optA = next.find(o => o.id === 'opt-a')!;
      const optB = next.find(o => o.id === 'opt-b')!;

      // Option A unchanged
      expect(optA.vote_count).toBe(5);
      expect(optA.polysuara_poll_votes?.some(v => v.user_id === 'usr-multi')).toBe(true);

      // Option B incremented & user added
      expect(optB.vote_count).toBe(3);
      expect(optB.polysuara_poll_votes?.some(v => v.user_id === 'usr-multi')).toBe(true);
    });
  });

  describe('Interaction & RPC Dispatch', () => {
    it('clicking an option button triggers supabase.rpc toggle_polysuara_poll_vote', async () => {
      const { tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: 'usr-tester',
      });

      const buttons = findElements(tree, el => el.type === 'button');
      expect(buttons.length).toBeGreaterThan(0);

      // Click option 2
      await buttons[1].props.onClick();

      expect(supabase.rpc).toHaveBeenCalledWith('toggle_polysuara_poll_vote', {
        p_option_id: 'opt-2',
      });
    });

    it('does not trigger vote if currentUserId is empty', async () => {
      const { tree } = renderComponentTree({
        poll: samplePoll,
        currentUserId: '',
      });

      const buttons = findElements(tree, el => el.type === 'button');
      await buttons[0].props.onClick();

      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});
