# F21 — Vé Số Lấy Hên (Lottery)

> Phase 4, blocked until legal review. Currency sink using in-game coins only; not betting, not real-money gambling.

## 0. Legal gate

Do not implement production lottery until legal review explicitly passes. Until then, only keep disabled code paths/mocks for design review.

## 1. Scope

- Mode A: printed ticket / Xổ số kiến thiết style.
- Mode B: Vietlott-style chosen numbers, later.
- Server fetches real published results.
- Rewards are spendable coins only, excluded from Giải Nhậu/Đường Lên Trùm.

## 2. Data model

```ts
type LotteryMode = 'kien_thiet' | 'vietlott'

type LotteryTicket = {
  id: string
  playerId: string
  mode: LotteryMode
  drawDate: string
  numbers: string
  price: number
  status: 'active' | 'settled' | 'expired'
  payout?: number
}

type LotteryDraw = {
  mode: LotteryMode
  drawDate: string
  result: string
  sourceUrl?: string
  settledAt: number
}
```

## 3. Purchase rules

- Buy with in-game `coins` only.
- Daily ticket limit, default 5 for Mode A.
- Ticket price base: `200 * k` for Mode A.
- Server assigns printed numbers for Mode A; client cannot choose after purchase.
- Mode B lets player choose numbers but server validates uniqueness/range.

## 4. Settlement

- Server fetches official result after draw time.
- Mode A matches suffix:
  - 2 digits: 1.5x
  - 3 digits: 8x
  - 4 digits: 50x
  - 6 digits: jackpot
- Mode B matches count of selected numbers.
- Payout goes to `coins` only.
- Payout does not count for `seasonEarned` or `lifetimeEarned`.

## 5. EV and safety

- Target EV: 0.6-0.8, net sink.
- Hard daily limit.
- No real money purchase, no ad-to-buy loops.
- Copy: "chơi cho vui", not investment language.

## 6. UI

- NPC/ticket seller entry.
- Ticket wallet.
- Result screen with clear source/date.
- Warning if daily limit reached.

## 7. Analytics

- `lottery_ticket_bought {mode, price}`
- `lottery_draw_settled {mode, tickets, totalPayout, ev}`
- `lottery_payout_claimed {amount}`
- `lottery_daily_limit_hit`

## 8. Acceptance

- Feature flag off until legal approval.
- Settlement is server-side and idempotent.
- Payout never updates ranking/Đường Lên Trùm ledgers.
- EV report can be generated per draw.
