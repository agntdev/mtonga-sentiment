import { describe, it, expect } from 'vitest';

import {
  extractComment,
  classifyVote,
  parseTransaction,
  parseVotes,
  VoteStore,
} from '../src/parseVotes.js';
import { encodeTextComment } from '../src/voting.js';

const txWithDecoded = (comment, overrides = {}) => ({
  hash: 'h1',
  now: 100,
  in_msg: {
    source: '0:abc',
    value: '10000000',
    message_content: { decoded: { comment } },
  },
  ...overrides,
});

const txWithBody = (comment, overrides = {}) => ({
  hash: 'h2',
  now: 200,
  in_msg: {
    source: '0:def',
    value: '10000000',
    message_content: { body: encodeTextComment(comment) },
  },
  ...overrides,
});

describe('extractComment', () => {
  it('reads the pre-decoded comment when present', () => {
    expect(extractComment(txWithDecoded('yes'))).toBe('yes');
  });

  it('falls back to decoding the raw body BOC', () => {
    expect(extractComment(txWithBody('no'))).toBe('no');
  });

  it('returns null when there is no incoming message or comment', () => {
    expect(extractComment({})).toBeNull();
    expect(extractComment({ in_msg: { message_content: {} } })).toBeNull();
  });
});

describe('classifyVote', () => {
  it('maps yes/no (any case) and rejects the rest', () => {
    expect(classifyVote('YES')).toBe('yes');
    expect(classifyVote(' no ')).toBe('no');
    expect(classifyVote('gm')).toBeNull();
    expect(classifyVote(undefined)).toBeNull();
  });
});

describe('parseTransaction / parseVotes', () => {
  it('builds a normalised record from a valid vote tx', () => {
    expect(parseTransaction(txWithDecoded('yes'))).toEqual({
      hash: 'h1',
      voter: '0:abc',
      vote: 'yes',
      amount: '10000000',
      timestamp: 100,
    });
  });

  it('returns null for non-vote transactions', () => {
    expect(parseTransaction(txWithDecoded('hello'))).toBeNull();
  });

  it('parses a batch, skipping non-votes', () => {
    const votes = parseVotes([txWithDecoded('yes'), txWithDecoded('spam'), txWithBody('no')]);
    expect(votes.map((v) => v.vote)).toEqual(['yes', 'no']);
  });
});

describe('VoteStore', () => {
  it('dedupes by hash and counts only new records', () => {
    const store = new VoteStore();
    const batch = parseVotes([txWithDecoded('yes')]);
    expect(store.ingest(batch)).toBe(1);
    expect(store.ingest(batch)).toBe(0); // same hash again
    expect(store.size).toBe(1);
  });

  it('orders all() newest-first', () => {
    const store = new VoteStore();
    store.ingest(parseVotes([txWithDecoded('yes'), txWithBody('no')]));
    expect(store.all().map((v) => v.timestamp)).toEqual([200, 100]);
  });

  it('latestByVoter keeps one (most recent) vote per wallet', () => {
    const store = new VoteStore();
    store.ingest([
      { hash: 'a', voter: '0:1', vote: 'no', amount: '1', timestamp: 10 },
      { hash: 'b', voter: '0:1', vote: 'yes', amount: '1', timestamp: 20 },
    ]);
    const latest = store.latestByVoter();
    expect(latest).toHaveLength(1);
    expect(latest[0].vote).toBe('yes');
  });
});
