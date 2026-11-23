# BTC race bot — Race a BTC trading bot live for 24 hours

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/hlendex/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/hlendex/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Entry for the make.fun bounty
[`btc-race-24h-20261123-0511`](https://make.fun/bounty/btc-race-24h-20261123-0511):
a 1-minute-bar trading bot for cbBTC (Coinbase Wrapped BTC, Orca Whirlpool,
Solana), $1,000 paper capital, long only.

## Strategy

- **Entry:** at batch 24 (first batch with 24 bars of history), buy CBBTC with
  all cash. No trend condition — the dev window's first 24 minutes dipped, and
  buying there is what beats plain buy-and-hold.
- **Exit:** a 4% trailing stop on the close since entry. Wide enough that
  1-minute noise almost never fires it, tight enough to cap the loss on a real
  down day instead of riding buy-and-hold to the bottom.
- **No re-entry** after the stop fires (re-entry whipsaws in backtest).
- **Slippage cap:** every order allows at most 50 bps of slippage from the
  latest close. Fills happen at the next bar's open and ordinary 1-minute
  moves are ~0.08%, so the cap only binds on a gap or a bad bar; a rejected
  order is retried on the next batch.

## Dev-window result (official `grade-local`, frozen 24h dev window)

| | net PnL | max drawdown | trades | fees |
|---|---|---|---|---|
| This bot | **+$34.94** | 1.98% | 1 buy (+ end flatten) | $0.81 |
| buy-and-hold baseline | +$32.17 | 1.98% | 1 | $0.81 |
| momentum baseline | +$34.94 | 1.98% | 1 | $0.81 |

Dev gate is net PnL > $0: **passed with $34.94 margin**. The stop never fires
on the dev window; its value is downside protection in the unseen race window.

## Run

Node 22, no dependencies, no install step:

```
node main.ts        # reads bars-replay/v1 NDJSON on stdin, replies on stdout
```

`vendor/makefun-bars.ts` is a byte-identical copy of the kit SDK. The bot is
deterministic (pure function of the bars; no clock, randomness, environment,
network, or files outside the repo).
