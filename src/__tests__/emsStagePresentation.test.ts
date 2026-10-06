import { describe, it, expect } from 'vitest';
import {
  type StageRevealStep,
  getNextRevealStep,
  getPrevRevealStep,
  isPodiumCardRevealed,
  createJuryDraftKey,
  serializeJuryDraft,
  deserializeJuryDraft,
} from '@/lib/ems';

export {
  type StageRevealStep,
  getNextRevealStep,
  getPrevRevealStep,
  isPodiumCardRevealed,
  createJuryDraftKey,
  serializeJuryDraft,
  deserializeJuryDraft,
};

describe('EMS Stage Presentation Mode Stepped Reveal Controller', () => {
  it('initializes in HIDDEN state where no podium cards are revealed', () => {
    const step: StageRevealStep = 'HIDDEN';
    expect(isPodiumCardRevealed(1, step)).toBe(false);
    expect(isPodiumCardRevealed(2, step)).toBe(false);
    expect(isPodiumCardRevealed(3, step)).toBe(false);
  });

  it('reveals 3rd place (Bronze) first upon initial advance', () => {
    const step = getNextRevealStep('HIDDEN');
    expect(step).toBe('BRONZE');
    expect(isPodiumCardRevealed(3, step)).toBe(true);
    expect(isPodiumCardRevealed(2, step)).toBe(false);
    expect(isPodiumCardRevealed(1, step)).toBe(false);
  });

  it('reveals 2nd place (Silver) next, retaining 3rd place visible', () => {
    const step = getNextRevealStep('BRONZE');
    expect(step).toBe('SILVER');
    expect(isPodiumCardRevealed(3, step)).toBe(true);
    expect(isPodiumCardRevealed(2, step)).toBe(true);
    expect(isPodiumCardRevealed(1, step)).toBe(false);
  });

  it('reveals 1st place (Champion / Johan) on the climax step', () => {
    const step = getNextRevealStep('SILVER');
    expect(step).toBe('CHAMPION');
    expect(isPodiumCardRevealed(3, step)).toBe(true);
    expect(isPodiumCardRevealed(2, step)).toBe(true);
    expect(isPodiumCardRevealed(1, step)).toBe(true);
  });

  it('allows stepping backwards in case of an emcee misclick', () => {
    expect(getPrevRevealStep('CHAMPION')).toBe('SILVER');
    expect(getPrevRevealStep('SILVER')).toBe('BRONZE');
    expect(getPrevRevealStep('BRONZE')).toBe('HIDDEN');
    expect(getPrevRevealStep('HIDDEN')).toBe('HIDDEN');
  });

  it('correctly maps keyboard shortcuts for presentation control', () => {
    const handleKey = (key: string, current: StageRevealStep): { nextStep?: StageRevealStep; triggerConfetti?: boolean; toggleFullscreen?: boolean } => {
      if (key === ' ' || key === 'ArrowRight') {
        return { nextStep: getNextRevealStep(current) };
      }
      if (key === 'ArrowLeft') {
        return { nextStep: getPrevRevealStep(current) };
      }
      if (key === 'r' || key === 'R') {
        return { nextStep: 'HIDDEN' };
      }
      if (key === 'c' || key === 'C') {
        return { triggerConfetti: true };
      }
      if (key === 'f' || key === 'F') {
        return { toggleFullscreen: true };
      }
      return {};
    };

    expect(handleKey(' ', 'HIDDEN').nextStep).toBe('BRONZE');
    expect(handleKey('ArrowRight', 'BRONZE').nextStep).toBe('SILVER');
    expect(handleKey('ArrowLeft', 'SILVER').nextStep).toBe('BRONZE');
    expect(handleKey('r', 'CHAMPION').nextStep).toBe('HIDDEN');
    expect(handleKey('c', 'ALL').triggerConfetti).toBe(true);
    expect(handleKey('f', 'ALL').toggleFullscreen).toBe(true);
  });
});

describe('EMS Jury Portal Local Auto-Save Draft Storage', () => {
  const eventId = 'evt-100';
  const juryCode = 'JURI-A';
  const participantId = 'part-42';

  it('generates consistent and isolated storage keys per participant', () => {
    const key = createJuryDraftKey(eventId, juryCode, participantId);
    expect(key).toBe('ems_jury_draft_evt-100_JURI-A_part-42');
  });

  it('serializes and deserializes rubric scores and general comments accurately', () => {
    const scores = { 'rubric-1': 5, 'rubric-2': 4, 'rubric-3': 5 };
    const comments = 'Projek sangat inovatif dan berdaya maju tinggi.';
    const raw = serializeJuryDraft(scores, comments);

    const hydrated = deserializeJuryDraft(raw);
    expect(hydrated).not.toBeNull();
    expect(hydrated?.scores).toEqual(scores);
    expect(hydrated?.comments).toBe(comments);
  });

  it('handles invalid or corrupted draft JSON gracefully without throwing', () => {
    expect(deserializeJuryDraft(null)).toBeNull();
    expect(deserializeJuryDraft('invalid-json')).toBeNull();
    expect(deserializeJuryDraft('{"incomplete": true}')).toBeNull();
  });
});
