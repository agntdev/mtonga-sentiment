/**
 * Vote-button UX (T02).
 *
 * The button DOM is composed of three spans: emoji (decorative,
 * aria-hidden), label (Yes/No), and small tagline (Bullish/Bearish ·
 * Durov/Bear). Selecting a button mirrors that to the live region in
 * the status panel so screen-reader users hear the change.
 *
 * Selection is the only UI state owned here; the TonConnect (T03) and
 * voting (T04) flows will pick the selected vote out of
 * `document.body.dataset.vote` when the wallet sends the transaction.
 */

const statusElement = document.querySelector('#vote-status');
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
