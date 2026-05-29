/**
 * App bootstrap.
 *
 * - Vote-button UX (T02): the button DOM is composed of three spans —
 *   emoji (decorative, aria-hidden), label (Yes/No) and small tagline
 *   (Bullish/Bearish · Durov/Bear). Selecting a button mirrors that to
 *   the live region in the status panel so screen-reader users hear the
 *   change. Selection state lives on `document.body.dataset.vote`.
 * - TonConnect (T03): mount the wallet button + reflect connection
 *   state in the status panel. The voting (T04), API (T05) and
 *   results (T06–T08) layers subscribe to `tonconnect:status` for
 *   account info instead of reaching into the SDK directly.
 * - Voting (T04): the "Cast vote on-chain" button submits the selected
 *   sentiment as a small TON transfer with a `yes`/`no` text comment.
 *   It is enabled only once a side is picked *and* a wallet is connected.
 * - Live results (T08): a polling controller scans the chain and this
 *   module renders the running counts + percentage bars in real time.
 */

import { initTonConnect, onWalletStatus } from './tonconnect.js';
import { castVote } from './voting.js';
import { createResultsController } from './results.js';
import { formatPct } from './tally.js';

const statusElement = document.querySelector('#vote-status');
const walletStatusElement = document.querySelector('#wallet-status');
const castButton = document.querySelector('#cast-vote');
const feedbackElement = document.querySelector('#vote-feedback');
const voteButtons = document.querySelectorAll('[data-vote]');

// Live-results DOM handles (T08).
const resultsTotal = document.querySelector('#results-total');
const resultsStatus = document.querySelector('#results-status');
const yesPctEl = document.querySelector('#yes-pct');
const noPctEl = document.querySelector('#no-pct');
const yesBar = document.querySelector('#yes-bar');
const noBar = document.querySelector('#no-bar');
const yesCount = document.querySelector('#yes-count');
const noCount = document.querySelector('#no-count');

let selectedVote = null;
let walletConnected = false;

const voteLabels = {
  yes: 'Bullish vote selected — Pavel Durov. Connect a wallet to send it as a TON transaction comment.',
  no: 'Bearish vote selected — 🐻. Connect a wallet to send it as a TON transaction comment.',
};

function setSelectedVote(vote) {
  selectedVote = vote;
  document.body.dataset.vote = vote;
  voteButtons.forEach((button) => {
    const isSelected = button.dataset.vote === vote;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });

  statusElement.textContent = voteLabels[vote];
  refreshCastButton();
}

/**
 * The cast action requires both a chosen side and a connected wallet;
 * keep the button label honest about whichever prerequisite is missing.
 */
function refreshCastButton() {
  if (!castButton) return;
  const ready = Boolean(selectedVote) && walletConnected;
  castButton.disabled = !ready;
  if (ready) {
    castButton.textContent = `Cast ${selectedVote.toUpperCase()} vote on-chain`;
  } else if (!selectedVote) {
    castButton.textContent = 'Pick a side first';
  } else {
    castButton.textContent = 'Connect a wallet to vote';
  }
}

function setFeedback(message, kind = '') {
  if (!feedbackElement) return;
  feedbackElement.textContent = message;
  feedbackElement.dataset.kind = kind;
}

async function handleCastVote() {
  if (!selectedVote || !walletConnected) return;
  castButton.disabled = true;
  setFeedback('Confirm the transaction in your wallet…', 'pending');
  try {
    await castVote(selectedVote);
    setFeedback(
      `Vote sent! Your ${selectedVote.toUpperCase()} transaction is on its way — results update once it lands.`,
      'success',
    );
    // Nudge a refresh so the user's own vote shows up without waiting for
    // the next scheduled poll (it still needs a few seconds to land).
    setTimeout(() => results.refresh(), 4000);
  } catch (error) {
    // TonConnect rejects with a `UserRejectsError` when the user cancels.
    const cancelled = /reject|cancel/i.test(error?.message ?? '');
    setFeedback(
      cancelled ? 'Vote cancelled.' : `Could not send vote: ${error.message}`,
      cancelled ? '' : 'error',
    );
  } finally {
    refreshCastButton();
  }
}

voteButtons.forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => setSelectedVote(button.dataset.vote));
});

if (castButton) {
  castButton.addEventListener('click', handleCastVote);
}

initTonConnect();

onWalletStatus(({ connected, account }) => {
  walletConnected = connected;
  document.body.dataset.walletConnected = String(connected);
  if (walletStatusElement) {
    walletStatusElement.textContent = connected
      ? `Wallet connected: ${formatAddress(account)}.`
      : 'Wallet: not connected.';
  }
  refreshCastButton();
});

function formatAddress(address) {
  if (!address) return 'unknown';
  // TonConnect returns the raw hex (`0:abcd…`); show the first 4 + last 4
  // chars of the workchain payload so the user can recognise their wallet
  // without leaking the full address in the live region.
  const [chain, hash] = address.includes(':') ? address.split(':') : ['0', address];
  if (hash.length <= 12) return `${chain}:${hash}`;
  return `${chain}:${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

// --- Live results (T08) --------------------------------------------------

const plural = (n) => `${n} vote${n === 1 ? '' : 's'}`;

/** Paint a tally snapshot from the results controller into the DOM. */
function renderResults({ tally, status, error }) {
  if (yesBar) {
    yesBar.style.width = `${tally.yesPct}%`;
    yesBar.parentElement?.setAttribute('aria-valuenow', String(Math.round(tally.yesPct)));
  }
  if (noBar) {
    noBar.style.width = `${tally.noPct}%`;
    noBar.parentElement?.setAttribute('aria-valuenow', String(Math.round(tally.noPct)));
  }
  if (yesPctEl) yesPctEl.textContent = formatPct(tally.yesPct);
  if (noPctEl) noPctEl.textContent = formatPct(tally.noPct);
  if (yesCount) yesCount.textContent = plural(tally.yes);
  if (noCount) noCount.textContent = plural(tally.no);
  if (resultsTotal) resultsTotal.textContent = plural(tally.total);

  if (resultsStatus) {
    if (status === 'error') {
      resultsStatus.dataset.kind = 'error';
      resultsStatus.textContent = `Couldn't reach the TON API (${error?.message ?? 'unknown error'}). Retrying…`;
    } else {
      resultsStatus.dataset.kind = '';
      resultsStatus.textContent = tally.total
        ? 'Live from on-chain transactions · updates automatically.'
        : 'No votes yet — be the first to cast one.';
    }
  }
}

const results = createResultsController({ render: renderResults });
results.start();
