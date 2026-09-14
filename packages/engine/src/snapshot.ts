import type { Game } from './engine';
import type { Glass } from './types';

/** Pure, versioned, JSON-safe projection of a Game's World for read-only tooling. */
export interface Snapshot {
  schema: 1;
  configVersion: string;
  now: number;
  phase: 'resting' | 'open' | 'closing';
  seed?: number;
  logLength: number;
  shift: {
    elapsed: number; duration: number; weather: string; rush: string;
    stats: Record<string, number | undefined>;
  } | null;
  tables: {
    id: string; state: string; level: number; capacity: number;
    groupId: string | null; orderId: string | null; orderState: string | null;
    itemsReady: number; itemsTotal: number;
  }[];
  queue: { id: string; size: number; rounds: number; arrivedAt: number }[];
  glasses: Record<Glass['state'], number>;
  keg: { ready: number; batch: { quantity: number; startedAt: number; readyAt: number } | null } | null;
  inventory: Record<string, number>;
  equipment: Record<string, number>;
  economy: { coins: number; reputation: number; seasonEarned: number; lifetimeEarned: number; serves: number };
  location: string;
  lease: { id: string; locationId: string; fallback: string; startedAt: number; expiresAt: number;
    rent: number; deposit: number; forfeitOnEarlyLeave: boolean; expired?: boolean } | null;
  staminaMs: number;
  completedShifts: number;
  quests: { claimed: number; total: number; bonusClaimed: boolean } | null;
  attendance: { cycleDay: number; claimedDays: number } | null;
  signboard: string | null;
  flyer: number;
  dog: number;
}

export function snapshot(game: Game): Snapshot {
  const w = game.world;
  const glasses: Record<Glass['state'], number> = { clean: 0, in_use: 0, dirty: 0, washing: 0 };
  for (const glass of w.glasses) glasses[glass.state]++;
  return {
    schema: 1,
    configVersion: game.config.version,
    now: w.now,
    phase: w.phase,
    seed: game.seed,
    logLength: game.log.length,
    shift: w.shift === null ? null : {
      elapsed: Math.min(w.shift.closedAt ?? w.now, w.shift.endsAt) - w.shift.startedAt - w.shift.pausedMs,
      duration: w.shift.endsAt - w.shift.startedAt - w.shift.pausedMs,
      weather: w.shift.weather, rush: w.shift.rush, stats: { ...w.shift.stats },
    },
    tables: w.tables.map(t => ({
      id: t.id, state: t.state, level: t.level, capacity: t.capacity,
      groupId: t.group?.id ?? null, orderId: t.order?.id ?? null, orderState: t.order?.state ?? null,
      itemsReady: t.order?.items.filter(i => i.state === 'ready').length ?? 0,
      itemsTotal: t.order?.items.length ?? 0,
    })),
    queue: w.queue.map(g => ({ id: g.id, size: g.customers.length, rounds: g.rounds, arrivedAt: g.arrivedAt })),
    glasses,
    keg: w.beer ? { ready: w.beer.ready, batch: w.beer.batch ? { ...w.beer.batch } : null } : null,
    inventory: { ...w.inventory },
    equipment: { ...w.equipment },
    economy: { coins: w.coins, reputation: w.reputation, seasonEarned: w.seasonEarned, lifetimeEarned: w.lifetimeEarned, serves: w.serves.length },
    location: w.location,
    lease: w.lease ? { ...w.lease } : null,
    staminaMs: w.staminaMs,
    completedShifts: w.completedShifts,
    quests: w.daily ? { claimed: w.daily.rows.filter(r => r.claimed).length, total: w.daily.rows.length, bonusClaimed: w.daily.bonusClaimed } : null,
    attendance: w.attendance ? { cycleDay: w.attendance.cycleDay, claimedDays: w.attendance.claimedDays.length } : null,
    signboard: w.signStyle ?? null,
    flyer: w.flyers ?? 0,
    dog: w.dogLevel,
  };
}
