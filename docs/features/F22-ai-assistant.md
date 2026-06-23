# F22 — Bia Đấm (AI Assistant)

> Phase 3+. State-aware helper for learning/support. MVP fallback can be rule-based tips; LLM server-side only.

## 1. Scope

- Chat assistant with quota.
- Reads player state snapshot server-side.
- Routes intents: guide, bug report, feedback, support ticket.
- Does not execute gameplay actions.

## 2. Data model

```ts
type AssistantMessage = {
  id: string
  playerId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  intent?: 'guide' | 'bug' | 'feedback' | 'ticket'
}

type AssistantQuota = {
  playerId: string
  dayBucket: string
  used: number
  limit: number
}
```

## 3. State snapshot

Server may pass compact state:

- current coins/reputation;
- current shift bottlenecks;
- upgrade levels;
- current quests;
- Giải Nhậu tier and next threshold;
- recent losses/stale beer metrics.

Do not pass secrets: anti-cheat internals, private user data beyond game state, payment details.

## 4. Behavior

- Default quota: 20 messages/day.
- Burst limit: short window rate-limit.
- Assistant answers with short actionable advice.
- For bug/ticket intent, create support ticket or bridge record.
- History can be ephemeral; persist only needed support transcript.

## 5. Rule-based fallback

Before LLM:

- detect common bottlenecks and show canned tips;
- "hết cốc sạch" -> upgrade washer/buy glass;
- stale beer high -> pour later/upgrade cooler;
- lost VIP -> prioritize VIP badge/table.

## 6. UI

- Assistant entry in Learn loop, not primary gameplay HUD during rush.
- During active shift, assistant panel can open but should not obscure urgent tables.
- Answer max 3 concise bullets.

## 7. Analytics

- `assistant_opened`
- `assistant_message_sent {intent}`
- `assistant_quota_exceeded`
- `assistant_ticket_created {type}`
- `assistant_tip_clicked {tipId}`

## 8. Acceptance

- LLM calls only from server.
- Quota enforced server-side.
- Assistant cannot mutate gameplay state.
- Bug/ticket bridge includes player id, timestamp, and optional state snapshot.
