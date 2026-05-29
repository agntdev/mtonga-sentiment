import { describe, it, expect } from 'vitest';
import { Cell } from '@ton/core';

import {
  normalizeVote,
  isValidVote,
  encodeTextComment,
  buildVoteTransaction,
} from '../src/voting.js';
import { VOTE_ADDRESS, VOTE_AMOUNT_NANO } from '../src/config.js';

/** Decode the text comment back out of an encoded BOC payload. */
function decodeComment(base64) {
  const slice = Cell.fromBase64(base64).beginParse();
  expect(slice.loadUint(32)).toBe(0); // op = 0 text comment
  return slice.loadStringTail();
}

describe('normalizeVote / isValidVote', () => {
  it('accepts yes/no in any case with surrounding whitespace', () => {
    expect(normalizeVote('YES')).toBe('yes');
    expect(normalizeVote('  No ')).toBe('no');
    expect(isValidVote('Yes')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(() => normalizeVote('maybe')).toThrow();
    expect(() => normalizeVote('')).toThrow();
    expect(() => normalizeVote(null)).toThrow();
    expect(isValidVote('bullish')).toBe(false);
  });
});

describe('encodeTextComment', () => {
  it('round-trips through a TEP-74 text-comment cell', () => {
    expect(decodeComment(encodeTextComment('yes'))).toBe('yes');
    expect(decodeComment(encodeTextComment('no'))).toBe('no');
  });
});

describe('buildVoteTransaction', () => {
  it('targets the vote address with the configured amount and a 5-min TTL', () => {
    const tx = buildVoteTransaction('yes', 1000);
    expect(tx.validUntil).toBe(1300);
    expect(tx.messages).toHaveLength(1);
    expect(tx.messages[0].address).toBe(VOTE_ADDRESS);
    expect(tx.messages[0].amount).toBe(VOTE_AMOUNT_NANO);
    expect(decodeComment(tx.messages[0].payload)).toBe('yes');
  });

  it('throws on an invalid vote before building anything', () => {
    expect(() => buildVoteTransaction('perhaps', 1000)).toThrow();
  });
});
