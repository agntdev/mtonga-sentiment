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

## Current scope

This scaffold includes:

- Vite-based static frontend structure
- `index.html` entrypoint
- `src/styles.css` responsive layout and voting button styles
- `src/main.js` basic sentiment-selection state

Future tasks can connect the selected `yes` / `no` value to TonConnect transactions and on-chain result parsing.
