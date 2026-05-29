/**
 * Live results controller (T08).
 *
 * Wires the read pipeline together: poll the TON API (T05) → parse votes
 * (T06) → accumulate in the store (T06) → tally (T07) → hand a snapshot
 * to a caller-supplied `render` function. The controller owns the
 * polling lifecycle and is DOM-free, so the rendering side stays
 * swappable and testable; `main.js` provides the actual DOM renderer.
 */

import { fetchTransactions } from './tonApi.js';
import { parseVotes, VoteStore } from './parseVotes.js';
import { tallyVotes, leadingSentiment } from './tally.js';

/** Default poll cadence — brisk enough to feel live, gentle on the API. */
export const DEFAULT_POLL_MS = 15000;

/**
 * Create a results controller.
 *
 * @param {object} options
 * @param {(snapshot: {tally:object, leading:string, status:'ok'|'error', error?:Error, lastUpdated:number}) => void} options.render
 * @param {VoteStore} [options.store]
 * @param {number} [options.pollIntervalMs]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.limit] — transactions to scan per poll
 */
export function createResultsController({
  render,
  store = new VoteStore(),
  pollIntervalMs = DEFAULT_POLL_MS,
  fetchImpl,
  limit = 256,
} = {}) {
  if (typeof render !== 'function') {
    throw new Error('createResultsController requires a render function.');
  }

  let timer = null;
  let inFlight = false;

  function emit(status, error) {
    const tally = tallyVotes(store.all());
    render({
      tally,
      leading: leadingSentiment(tally),
      status,
      error,
      lastUpdated: Math.floor(Date.now() / 1000),
    });
  }

  /** Fetch once and re-render. Guards against overlapping polls. */
  async function refresh() {
    if (inFlight) return;
    inFlight = true;
    try {
      const transactions = await fetchTransactions({ limit, fetchImpl });
      store.ingest(parseVotes(transactions));
      emit('ok');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      emit('error', error);
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (timer) return;
    emit('ok'); // paint the (empty) initial state immediately
    refresh();
    timer = setInterval(refresh, pollIntervalMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, refresh, store };
}
