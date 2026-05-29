/**
 * Voting logic (T04).
 *
 * A vote is cast by sending a small TON transfer to {@link VOTE_ADDRESS}
 * carrying a plain-text comment of `yes` (bullish) or `no` (bearish).
 * The comment is encoded as a standard text-comment cell (32 zero
 * op-bits followed by the UTF-8 string) — the exact format the on-chain
 * parser (T06) reads back, so writes and reads stay symmetric.
 *
 * This module is intentionally free of DOM access: `buildVoteTransaction`
 * and `normalizeVote` are pure and unit-tested (T09); `castVote` is the
 * only function that touches the wallet.
 */

import { beginCell } from '@ton/core';

import { getTonConnectUI } from './tonconnect.js';
import { VOTE_ADDRESS, VOTE_AMOUNT_NANO, VALID_VOTES } from './config.js';

/** A vote request stays valid for 5 minutes after it is built. */
const VALID_FOR_SECONDS = 300;

/**
 * Normalise and validate a raw vote string.
 *
 * @param {unknown} vote
 * @returns {'yes' | 'no'} the canonical vote value
 * @throws {Error} if the value is not exactly `yes` or `no`
 */
export function normalizeVote(vote) {
  const normalized = String(vote ?? '').trim().toLowerCase();
  if (!VALID_VOTES.includes(normalized)) {
    throw new Error(
      `Invalid vote "${vote}": expected one of ${VALID_VOTES.join(', ')}.`,
    );
  }
  return normalized;
}

/** Non-throwing predicate companion to {@link normalizeVote}. */
export function isValidVote(vote) {
  return VALID_VOTES.includes(String(vote ?? '').trim().toLowerCase());
}

/**
 * Encode a text comment into the base64 BOC payload TonConnect expects.
 * Mirrors the TEP-74 "text comment" body used by wallets.
 *
 * @param {string} text
 * @returns {string} base64-encoded message body
 */
export function encodeTextComment(text) {
  return beginCell()
    .storeUint(0, 32) // op = 0 marks a plain text comment
    .storeStringTail(text)
    .endCell()
    .toBoc()
    .toString('base64');
}

/**
 * Build the TonConnect `sendTransaction` request for a sentiment vote.
 *
 * @param {unknown} vote — `yes` or `no`
 * @param {number} [nowSeconds] — injectable clock for tests
 * @returns the TonConnect transaction request object
 */
export function buildVoteTransaction(vote, nowSeconds = Math.floor(Date.now() / 1000)) {
  const normalized = normalizeVote(vote);
  return {
    validUntil: nowSeconds + VALID_FOR_SECONDS,
    messages: [
      {
        address: VOTE_ADDRESS,
        amount: VOTE_AMOUNT_NANO,
        payload: encodeTextComment(normalized),
      },
    ],
  };
}

/**
 * Cast a vote through the connected wallet. Requires an active
 * TonConnect session — callers should gate this on wallet status.
 *
 * @param {unknown} vote — `yes` or `no`
 * @returns the TonConnect `sendTransaction` result (signed BOC)
 */
export async function castVote(vote) {
  const tx = buildVoteTransaction(vote);
  const ui = getTonConnectUI();
  if (!ui.connected) {
    throw new Error('Connect a TON wallet before casting a vote.');
  }
  return ui.sendTransaction(tx);
}
