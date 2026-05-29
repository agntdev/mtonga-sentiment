/**
 * TonConnect integration (T03).
 *
 * Mounts the official `@tonconnect/ui` button into the dapp and exposes
 * a minimal façade for the rest of the app:
 *
 *   - `initTonConnect()` — call once on page load; mounts the button,
 *     subscribes to wallet status changes, returns the live `TonConnectUI`
 *     instance.
 *   - `onWalletStatus(handler)` — subscribe to `{ connected, account }`
 *     updates so the voting flow (T04) can enable/disable the cast-vote
 *     action without re-importing TonConnect internals.
 *   - `disconnect()` — convenience for the UI logout button (handled by
 *     the TonConnect UI widget itself).
 *
 * The manifest lives at `/tonconnect-manifest.json` (served from
 * `public/`); wallets fetch it to render the dapp's name + icon in their
 * connect sheet.
 */

import { TonConnectUI } from '@tonconnect/ui';

const BUTTON_ROOT_ID = 'tonconnect-button';

const MANIFEST_URL =
  import.meta.env?.VITE_TONCONNECT_MANIFEST_URL ??
  new URL('/tonconnect-manifest.json', window.location.origin).toString();

let _ui = null;

/**
 * Lazily instantiate the singleton. `TonConnectUI` is heavy and writes
 * to `localStorage`; we want one instance per tab.
 */
export function getTonConnectUI() {
  if (_ui) return _ui;
  _ui = new TonConnectUI({
    manifestUrl: MANIFEST_URL,
    buttonRootId: BUTTON_ROOT_ID,
  });
  return _ui;
}

/**
 * Mount the wallet connect button and wire status broadcasting.
 *
 * @returns the underlying `TonConnectUI` instance.
 */
export function initTonConnect() {
  const ui = getTonConnectUI();

  // Re-emit a normalised event whenever the wallet status changes so
  // downstream modules (vote handler, display) don't need to know the
  // TonConnect API surface.
  ui.onStatusChange((wallet) => {
    const detail = walletToDetail(wallet);
    window.dispatchEvent(new CustomEvent('tonconnect:status', { detail }));
  });

  // Fire once on init so subscribers see the initial state.
  queueMicrotask(() => {
    const detail = walletToDetail(ui.wallet);
    window.dispatchEvent(new CustomEvent('tonconnect:status', { detail }));
  });

  return ui;
}

/**
 * Subscribe to wallet status. Returns an unsubscribe fn so callers can
 * detach without keeping a reference to the listener.
 *
 * @param {(s: { connected: boolean, account: string | null, chain: string | null }) => void} handler
 */
export function onWalletStatus(handler) {
  const wrapped = (event) => handler(event.detail);
  window.addEventListener('tonconnect:status', wrapped);
  return () => window.removeEventListener('tonconnect:status', wrapped);
}

/** Disconnect the current wallet (closes the connector session). */
export async function disconnect() {
  if (!_ui) return;
  await _ui.disconnect();
}

function walletToDetail(wallet) {
  if (!wallet) return { connected: false, account: null, chain: null };
  return {
    connected: true,
    account: wallet.account?.address ?? null,
    chain: wallet.account?.chain ?? null,
  };
}
