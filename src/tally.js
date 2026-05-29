/**
 * Vote tallying + percentage maths (T07).
 *
 * Pure functions over the vote records produced by T06. The display
 * layer (T08) calls {@link tallyVotes} on every poll to recompute live
 * counts and percentages, so this module must stay free of DOM/network
 * concerns and be safe to call frequently.
 */

/**
 * Tally a list of vote records into counts and percentages.
 *
 * Percentages are computed over the total of *counted* votes (yes + no)
 * and always sum to 100 when there is at least one vote — the larger
 * side absorbs any rounding remainder so the bars never overflow or fall
 * short of 100%.
 *
 * @param {Array<{vote: 'yes' | 'no'}>} records
 * @returns {{yes:number,no:number,total:number,yesPct:number,noPct:number}}
 */
export function tallyVotes(records = []) {
  let yes = 0;
  let no = 0;
  for (const record of records) {
    if (record?.vote === 'yes') yes += 1;
    else if (record?.vote === 'no') no += 1;
  }

  const total = yes + no;
  if (total === 0) {
    return { yes: 0, no: 0, total: 0, yesPct: 0, noPct: 0 };
  }

  // Round one side and derive the other so the pair always sums to 100.
  const yesPct = roundTo((yes / total) * 100, 1);
  const noPct = roundTo(100 - yesPct, 1);

  return { yes, no, total, yesPct, noPct };
}

/**
 * The winning sentiment, or 'tie' / 'none'.
 *
 * @param {{yes:number,no:number,total:number}} tally
 * @returns {'bullish' | 'bearish' | 'tie' | 'none'}
 */
export function leadingSentiment({ yes, no, total }) {
  if (!total) return 'none';
  if (yes === no) return 'tie';
  return yes > no ? 'bullish' : 'bearish';
}

/** Format a percentage for display, e.g. `42.5%`. */
export function formatPct(pct) {
  return `${roundTo(pct, 1)}%`;
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
