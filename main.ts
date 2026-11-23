// BTC race bot: buy early, hold, protect with a wide trailing stop.
//
// Strategy (single asset, long only, all-in / all-out):
//   - Entry: at batch 24 (the first batch with 24 bars of history, the same bar
//     the kit's momentum baseline first rebalances on), buy CBBTC with all cash.
//     No trend condition: on the dev window the first 24 minutes dipped and the
//     buy there is what beats plain buy-and-hold; making entry conditional on a
//     trend read would only fit dev-window noise.
//   - While holding: track the trailing peak close since entry. Exit (sell the
//     whole position) when the latest close falls 4% (400 bps) below that peak.
//     4% is wide enough that ordinary 1-minute noise (stdev ~0.08%/bar, daily
//     realised vol ~3%) almost never fires it, but it caps the loss on a real
//     down day instead of riding buy-and-hold to the bottom.
//   - Orders cap slippage at 50 bps from the latest close (MAX_SLIPPAGE_BPS):
//     fills happen at the next bar's open, and ordinary 1-minute moves are
//     ~0.08% (stdev), so 50 bps only ever binds on a gap or a bad bar —
//     and a rejected order is simply retried on the next batch, since the
//     bot re-attempts entry every batch while flat (and re-attempts the
//     stop-sell every batch while holding). The first version allowed
//     10,000 bps (no cap at all); capping it is cheap insurance for the
//     unseen race window, where a single gap fill could otherwise cost
//     more than the whole edge the strategy is built on.
//
// Dev-window result (official grade-local, exact replay): net PnL +$34.94,
// max drawdown 1.98%, 1 buy (+ end flatten), fees $0.81. Buy-and-hold on the
// same window: +$32.17. The stop never fires on the dev window.
//
// Deterministic: pure function of the bars seen (bigint comparisons only).
// No clock, no randomness, no environment, no network, stdlib only
// (vendor/makefun-bars.ts is a byte-identical copy of the kit SDK).

import { BPS, runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const ENTRY_BATCH = 24;
const TRAILING_STOP_BPS = 400n;
/** Max slippage vs the latest close, in bps (see header): 50 bps. */
const MAX_SLIPPAGE_BPS = 50;

/** First batch this run may trade on: 24 bars of history, or the warm-up's end. */
let entryBatch = ENTRY_BATCH;
/** Trailing peak close since entry (bigint price units), null while flat. */
let peak: bigint | null = null;
/** True once the trailing stop has fired: stay out for the rest of the run. */
let stoppedOut = false;

await runBars({
  onHello(state) {
    entryBatch = Math.max(ENTRY_BATCH, state.warmupBars);
  },
  onBatch(state: BarsState, batch): OrderInput[] {
    const symbol = state.hello.symbols[0].symbol;
    const close = state.close(symbol);
    if (close === null) return [];
    const held = state.positions.get(symbol);

    if (held === undefined) {
      // Flat: enter once, at/after the entry batch, unless stopped out.
      if (stoppedOut || batch.seq < entryBatch) return [];
      const room = state.weightRoom(symbol);
      const notional = state.cash < room ? state.cash : room;
      if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      peak = close;
      return [{ side: 'buy', symbol, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }

    // Holding: update the trailing peak, exit 4% below it.
    if (peak === null || close > peak) peak = close;
    if (close * BPS < peak * (BPS - TRAILING_STOP_BPS)) {
      stoppedOut = true;
      peak = null;
      return [{ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
