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

## Deployment

The app is a static SPA — the production build in `dist/` can be served by any
static host. Two paths are provided:

### Docker / Fly.io (production, `*.fly.dev`)

A multi-stage `Dockerfile` builds the bundle with Node and serves it with
nginx (`nginx.conf`) on port `8080`, with gzip, immutable asset caching, and
security headers (CSP scoped to keep TonConnect working, `nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).

```bash
docker build -t mtonga-sentiment .
docker run -p 8080:8080 mtonga-sentiment   # http://localhost:8080

# Fly.io (config in fly.toml; HTTPS forced):
fly deploy
```

### GitHub Pages

`.github/workflows/pages.yml` builds and publishes `dist/` to GitHub Pages on
every push to `main`.

### Configuration

Build-time environment variables (all optional — see `src/config.js`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_VOTE_ADDRESS` | Address that collects vote transactions | project owner wallet |
| `VITE_VOTE_AMOUNT_NANO` | Amount attached to each vote (nanoTON) | `10000000` (0.01 TON) |
| `VITE_TON_API_BASE` | toncenter v3 API base | `https://toncenter.com/api/v3` |
| `VITE_TON_API_KEY` | toncenter API key (raises rate limit) | _none_ |
| `VITE_TONCONNECT_MANIFEST_URL` | Override the TonConnect manifest URL | `/tonconnect-manifest.json` |

> When deploying to a new domain, update `public/tonconnect-manifest.json`
> (or set `VITE_TONCONNECT_MANIFEST_URL`) so wallets fetch the correct
> manifest.
