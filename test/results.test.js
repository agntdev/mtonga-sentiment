import { describe, it, expect, vi } from 'vitest';

import { createResultsController } from '../src/results.js';
import { encodeTextComment } from '../src/voting.js';

const voteTx = (hash, comment, now) => ({
  hash,
  now,
  in_msg: {
    source: `0:${hash}`,
    value: '10000000',
    message_content: { decoded: { comment } },
  },
});

/** A fetch stub returning a fixed toncenter-shaped payload. */
const stubFetch = (transactions) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ transactions }) }));

describe('createResultsController', () => {
  it('requires a render function', () => {
    expect(() => createResultsController({})).toThrow();
  });

  it('fetches, parses, tallies and renders a snapshot', async () => {
    const render = vi.fn();
    const fetchImpl = stubFetch([voteTx('a', 'yes', 1), voteTx('b', 'no', 2), voteTx('c', 'yes', 3)]);
    const c = createResultsController({ render, fetchImpl });

    await c.refresh();

    const last = render.mock.calls.at(-1)[0];
    expect(last.status).toBe('ok');
    expect(last.tally).toMatchObject({ yes: 2, no: 1, total: 3 });
    expect(last.leading).toBe('bullish');
  });

  it('dedupes across repeated polls', async () => {
    const render = vi.fn();
    const fetchImpl = stubFetch([voteTx('a', 'yes', 1)]);
    const c = createResultsController({ render, fetchImpl });

    await c.refresh();
    await c.refresh();

    expect(c.store.size).toBe(1);
    expect(render.mock.calls.at(-1)[0].tally.total).toBe(1);
  });

  it('renders an error snapshot when the API fails, keeping prior data', async () => {
    const render = vi.fn();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, statusText: 'Server Error' }));
    const c = createResultsController({ render, fetchImpl });

    await c.refresh();

    const last = render.mock.calls.at(-1)[0];
    expect(last.status).toBe('error');
    expect(last.error).toBeInstanceOf(Error);
  });

  it('also accepts a bare-array API response', async () => {
    const render = vi.fn();
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => [voteTx('a', 'no', 1)] }));
    const c = createResultsController({ render, fetchImpl });

    await c.refresh();
    expect(render.mock.calls.at(-1)[0].tally).toMatchObject({ no: 1, total: 1 });
  });
});
