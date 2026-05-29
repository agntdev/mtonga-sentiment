# mTonga sentiment

A lightweight frontend for voting bullish or bearish on TON sentiment.

## Development

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

## Testing

Unit tests (Vitest) cover the pure logic that the app depends on:

- `test/voting.test.js` — vote validation + TEP-74 text-comment encoding/round-trip
- `test/parseVotes.test.js` — comment extraction (pre-decoded + BOC fallback), classification, and `VoteStore` dedup/ordering
- `test/tally.test.js` — counts and percentages that always sum to 100
- `test/results.test.js` — the polling controller (fetch → parse → tally) with an injected `fetch`

CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on every push and pull request.
