const statusElement = document.querySelector('#vote-status');
const voteButtons = document.querySelectorAll('[data-vote]');

const voteLabels = {
  yes: 'Bullish vote selected. TonConnect integration will later submit this as a transaction comment.',
  no: 'Bearish vote selected. TonConnect integration will later submit this as a transaction comment.',
};

function setSelectedVote(selectedVote) {
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
