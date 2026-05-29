import { describe, it, expect } from 'vitest';

import { tallyVotes, leadingSentiment, formatPct } from '../src/tally.js';

const votes = (...kinds) => kinds.map((vote) => ({ vote }));

describe('tallyVotes', () => {
  it('returns zeros for an empty list', () => {
    expect(tallyVotes([])).toEqual({ yes: 0, no: 0, total: 0, yesPct: 0, noPct: 0 });
  });

  it('counts and splits 100% across two sides', () => {
    const t = tallyVotes(votes('yes', 'yes', 'no', 'no'));
    expect(t).toMatchObject({ yes: 2, no: 2, total: 4, yesPct: 50, noPct: 50 });
  });

  it('percentages always sum to 100 even when they do not divide evenly', () => {
    const t = tallyVotes(votes('yes', 'no', 'no'));
    expect(t.yesPct + t.noPct).toBe(100);
    expect(t.yesPct).toBeCloseTo(33.3, 1);
  });

  it('ignores entries that are not yes/no', () => {
    const t = tallyVotes([{ vote: 'yes' }, { vote: 'maybe' }, {}]);
    expect(t).toMatchObject({ yes: 1, no: 0, total: 1, yesPct: 100, noPct: 0 });
  });
});

describe('leadingSentiment', () => {
  it('reports the leader, ties and empties', () => {
    expect(leadingSentiment(tallyVotes(votes('yes', 'yes', 'no')))).toBe('bullish');
    expect(leadingSentiment(tallyVotes(votes('no', 'no', 'yes')))).toBe('bearish');
    expect(leadingSentiment(tallyVotes(votes('yes', 'no')))).toBe('tie');
    expect(leadingSentiment(tallyVotes([]))).toBe('none');
  });
});

describe('formatPct', () => {
  it('renders one decimal with a percent sign', () => {
    expect(formatPct(33.333)).toBe('33.3%');
    expect(formatPct(50)).toBe('50%');
  });
});
