/**
 * Shared configuration for the sentiment dapp.
 *
 * Every layer (voting, API reads, parsing, tally) agrees on the same
 * designated address and comment vocabulary through this module so the
 * "write" side (T04) and the "read" side (T05–T08) can never drift.
 *
 * All values can be overridden at build time with Vite env vars, which
 * keeps the deployed app (T10) configurable without code changes.
 */

/**
 * Designated address that collects sentiment votes. A vote is a tiny TON
 * transfer whose text comment — `yes` (bullish) or `no` (bearish) —
 * encodes the opinion. Defaults to the project owner wallet.
 */
export const VOTE_ADDRESS =
  import.meta.env?.VITE_VOTE_ADDRESS ??
  '0:9d43c795736f88570d78da16160ac946dfb9c2142967e5afa03e201877680c02';

/**
 * Amount attached to each vote, in nanoTON. 0.01 TON is large enough to
 * deter spam yet small enough to be a negligible "stamp".
 */
export const VOTE_AMOUNT_NANO =
  import.meta.env?.VITE_VOTE_AMOUNT_NANO ?? '10000000';

/** The only two comments that count as a vote. */
export const VALID_VOTES = Object.freeze(['yes', 'no']);

/** Human-friendly sentiment labels keyed by vote value. */
export const SENTIMENT = Object.freeze({
  yes: 'bullish',
  no: 'bearish',
});

/**
 * TON HTTP API (toncenter v3) base URL used to read incoming
 * transactions (T05). An optional API key raises the rate limit.
 */
export const TON_API_BASE =
  import.meta.env?.VITE_TON_API_BASE ?? 'https://toncenter.com/api/v3';

export const TON_API_KEY = import.meta.env?.VITE_TON_API_KEY ?? '';
