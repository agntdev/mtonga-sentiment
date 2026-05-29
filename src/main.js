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
 */

import { initTonConnect, onWalletStatus } from './tonconnect.js';

const statusElement = document.querySelector('#vote-status');
const walletStatusElement = document.querySelector('#wallet-status');
const voteButtons = document.querySelectorAll('[data-vote]');

const voteLabels = {
  yes: 'Bullish vote selected — Pavel Durov. Connect a wallet to send it as a TON transaction comment.',
  no: 'Bearish vote selected — 🐻. Connect a wallet to send it as a TON transaction comment.',
};

function setSelectedVote(selectedVote) {
  document.body.dataset.vote = selectedVote;
  voteButtons.forEach((button) => {
    const isSelected = button.dataset.vote === selectedVote;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });

  statusElement.textContent = voteLabels[selectedVote];
}

voteButtons.forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => setSelectedVote(button.dataset.vote));
});

initTonConnect();

onWalletStatus(({ connected, account }) => {
  document.body.dataset.walletConnected = String(connected);
  if (!walletStatusElement) return;
  walletStatusElement.textContent = connected
    ? `Wallet connected: ${formatAddress(account)}.`
    : 'Wallet: not connected.';
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
