/**
 * TON HTTP API client (T05).
 *
 * Reads transactions addressed to {@link VOTE_ADDRESS} from the public
 * toncenter v3 API. This is the only module that talks to the network on
 * the read path; the parser (T06) and tally (T07) consume its plain-JSON
 * output, which keeps them unit-testable without mocking `fetch`.
 *
 * `fetchTransactions` is deliberately thin: it builds the request, sets
 * the optional API key, surfaces HTTP/network errors as Error instances,
 * and returns the raw `transactions` array. Interpretation happens in T06.
 */

import { TON_API_BASE, TON_API_KEY, VOTE_ADDRESS } from './config.js';

/** toncenter caps `limit` at 256 per request. */
const MAX_LIMIT = 256;

/**
 * Fetch transactions involving an account, newest first.
 *
 * @param {object} [options]
 * @param {string} [options.address] — account to read (defaults to the vote address)
 * @param {number} [options.limit] — max transactions to return (1–256)
 * @param {number} [options.offset] — pagination offset
 * @param {typeof fetch} [options.fetchImpl] — injectable for tests
 * @param {AbortSignal} [options.signal] — to cancel an in-flight poll
 * @returns {Promise<Array<object>>} raw toncenter transaction objects
 * @throws {Error} on non-2xx responses or network failure
 */
export async function fetchTransactions({
  address = VOTE_ADDRESS,
  limit = 100,
  offset = 0,
  fetchImpl = fetch,
  signal,
} = {}) {
  const url = new URL(`${TON_API_BASE}/transactions`);
  url.searchParams.set('account', address);
  url.searchParams.set('limit', String(clampLimit(limit)));
  url.searchParams.set('offset', String(Math.max(0, offset)));
  url.searchParams.set('sort', 'desc');

  const headers = {};
  if (TON_API_KEY) headers['X-API-Key'] = TON_API_KEY;

  let response;
  try {
    response = await fetchImpl(url.toString(), { headers, signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(`TON API request failed: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(
      `TON API responded ${response.status} ${response.statusText}`.trim(),
    );
  }

  const data = await response.json();
  // toncenter v3 returns { transactions: [...] }; tolerate a bare array too.
  return Array.isArray(data) ? data : (data.transactions ?? []);
}

function clampLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), MAX_LIMIT);
}
