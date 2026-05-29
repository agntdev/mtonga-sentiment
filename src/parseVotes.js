/**
 * On-chain data parsing + in-memory store (T06).
 *
 * Turns raw toncenter v3 transactions (from T05) into normalised vote
 * records and accumulates them across polls. Every function except the
 * store is pure, so the parsing rules are unit-tested directly (T09).
 *
 * A vote record is:
 *   { hash, voter, vote: 'yes' | 'no', amount, timestamp }
 *
 * Dedup key is the transaction hash, so re-polling the same window never
 * double-counts. When the same wallet votes more than once, the most
 * recent transaction wins (see {@link VoteStore.latestByVoter}).
 */

import { Cell } from '@ton/core';

import { VALID_VOTES } from './config.js';

/**
 * Extract the text comment from a transaction's incoming message.
 *
 * toncenter v3 usually pre-decodes text comments at
 * `in_msg.message_content.decoded.comment`. When only the raw body BOC is
 * present we decode it ourselves: a TEP-74 text comment is a cell whose
 * first 32 bits are zero (op = 0) followed by the UTF-8 string.
 *
 * @param {object} tx — a toncenter transaction object
 * @returns {string | null} the comment text, or null if absent/unparseable
 */
export function extractComment(tx) {
  const inMsg = tx?.in_msg;
  if (!inMsg) return null;

  const decoded = inMsg.message_content?.decoded;
  if (decoded && typeof decoded.comment === 'string') {
    return decoded.comment;
  }

  const body = inMsg.message_content?.body;
  if (typeof body === 'string' && body.length > 0) {
    try {
      const slice = Cell.fromBase64(body).beginParse();
      if (slice.remainingBits < 32) return null;
      if (slice.loadUint(32) !== 0) return null; // not a text comment
      return slice.loadStringTail();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Classify a raw comment into a canonical vote, or null if it isn't one.
 *
 * @param {string | null | undefined} comment
 * @returns {'yes' | 'no' | null}
 */
export function classifyVote(comment) {
  const normalized = String(comment ?? '').trim().toLowerCase();
  return VALID_VOTES.includes(normalized) ? normalized : null;
}

/**
 * Parse a single transaction into a vote record, or null if it carries no
 * valid `yes`/`no` comment.
 *
 * @param {object} tx
 * @returns {{hash: string, voter: string|null, vote: 'yes'|'no', amount: string, timestamp: number} | null}
 */
export function parseTransaction(tx) {
  const vote = classifyVote(extractComment(tx));
  if (!vote) return null;

  const inMsg = tx?.in_msg ?? {};
  return {
    hash: tx?.hash ?? inMsg.hash ?? null,
    voter: inMsg.source ?? null,
    vote,
    amount: inMsg.value ?? '0',
    timestamp: Number(tx?.now ?? 0),
  };
}

/**
 * Parse a batch of transactions into vote records, skipping non-votes.
 *
 * @param {Array<object>} transactions
 * @returns {Array<object>} vote records
 */
export function parseVotes(transactions = []) {
  const votes = [];
  for (const tx of transactions) {
    const record = parseTransaction(tx);
    if (record) votes.push(record);
  }
  return votes;
}

/**
 * In-memory accumulator for vote records.
 *
 * Deduplicates by transaction hash so repeated polls are idempotent, and
 * preserves insertion data needed by the tally (T07) and display (T08).
 */
export class VoteStore {
  constructor() {
    /** @type {Map<string, object>} hash -> vote record */
    this._byHash = new Map();
  }

  /**
   * Add a batch of parsed vote records. Returns the number of *new*
   * records actually stored (useful for "X new votes" UI cues).
   *
   * @param {Array<object>} records
   * @returns {number}
   */
  ingest(records = []) {
    let added = 0;
    for (const record of records) {
      const key = record.hash ?? `${record.voter}:${record.timestamp}`;
      if (this._byHash.has(key)) continue;
      this._byHash.set(key, record);
      added += 1;
    }
    return added;
  }

  /** All stored vote records, newest first. */
  all() {
    return [...this._byHash.values()].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * One vote per wallet — the most recent transaction wins. Use this for
   * "one wallet, one vote" semantics; use {@link all} to count every tx.
   */
  latestByVoter() {
    const latest = new Map();
    for (const record of this.all()) {
      if (record.voter && !latest.has(record.voter)) {
        latest.set(record.voter, record);
      }
    }
    return [...latest.values()];
  }

  get size() {
    return this._byHash.size;
  }

  clear() {
    this._byHash.clear();
  }
}
