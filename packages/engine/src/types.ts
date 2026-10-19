import type { Config, Dish, Equipment, SeatedType, Weather, Rush, BusinessUnlock, SignStyle } from './config';

export interface Customer { id: string; type: SeatedType; patienceMs: number; enjoyMs: number }
export interface Item {
  id: string; customerId: string; dish: Dish; state: 'pending' | 'preparing' | 'ready' | 'served' | 'wasted';
  readyAt: number | null; glassId: string | null; kitchenBatchId?: string;
}
export interface Order {
  id: string; placedAt: number; patienceMs: number; items: Item[];
  state: 'pending' | 'grace' | 'served' | 'expired' | 'cancelled'; readyEmitted: boolean;
}
export interface DeliveryOrder { id: string; placedAt: number; expiresAt: number; lines: { dish: Dish; quantity: number }[] }
/** `seats`: chairs of the table when the group sat down (rules 28); the group keeps that tray for every round. */
export interface Group { id: string; customers: Customer[]; rounds: number; arrivedAt: number; seats?: number }
export interface Table {
  id: string; level: number; capacity: number;
  state: 'empty' | 'seating' | 'waiting' | 'consuming' | 'occupied' | 'cleaning' | 'broken';
  group: Group | null; order: Order | null; until: number | null; roundsServed: number;
}
export interface Glass {
  id: string; state: 'clean' | 'in_use' | 'dirty' | 'washing';
  itemId: string | null; readyAt: number | null; staleEmitted: boolean; startedAt?: number;
}
export interface ServeRecord {
  t: number; customerId: string; customerType: SeatedType; orderId: string; dishes: Dish[];
  payment: number; tip: number; credited: number; hadMoi: boolean; stale: boolean; patienceRatio: number;
  wellRestedBonus?: number;
}
export interface DomainEvent {
  id: string; type: string; at: number; configVersion: string; idempotencyKey: string;
  data: Record<string, string | number | boolean | null>;
}
export interface Stats {
  arrived: number; served: number; lost: number; rejected: number; orders: number;
  payment: number; tip: number; credited: number; penalty: number; spent: number; rep: number;
  wellRestedBonus: number;
  /** Guests of pairs turned away at the door because no table had two chairs (rules 28); also counted in `rejected`. */
  noSeat?: number;
  deliveryCompleted?: number; deliveryMissed?: number; deliveryNet?: number; deliveryBonus?: number;
}
export interface Shift {
  id: string; startedAt: number; pausedMs: number; endsAt: number; closedAt: number | null; configVersion: string;
  weather: Weather; rush: Rush; rushes: { kind: Rush; start: number; end: number; warned?: boolean; eventStart?: number }[];
  rushScheduleSeed?: string;
  menu?: { eventStart: number; serveStart: number; complete: boolean };
  flyersUsed?: number; flyer?: { start: number; end: number; eventStart: number };
  nextSpawnAt: number; firstGroup: boolean; onboarding: boolean; stats: Stats;
  wellRestedUntil: number | null; rushUntil?: number | null;
}
export interface DailyQuest {
  id: string; kind: string; bucket: string; target: number; progress: number;
  coin: number; reputation: number; claimed: boolean;
}
export interface DailyQuests {
  day: string; tier: number; seed: string; expiresAt: number; rows: DailyQuest[];
  bonusClaimed: boolean; recipients: string[];
  lossFreeSince: number | null; lossFreeServed: boolean;
  vipShift: string | null; vipServed: boolean; vipLost: boolean;
  rushSlot: number | null; rushShift: string | null; rushServed: boolean;
}
export interface Attendance {
  cycleDay: number; lastActiveDateKey: string; lastClaimDateKey: string | null;
  expiresAt: number; claimedDays: number[];
}
export type SeasonKind = 'ranking' | 'contest';
export interface SeasonPeriod {
  id: string; kind: SeasonKind; startsAt: number; endsAt: number; trackingFromAt: number; configVersion: string;
  tiers: Config['values']['league']['tiers']; countedSources: string[];
  closedShifts: number; firstReachedCurrentSeasonEarnedAt: number | null;
}
export interface SeasonResult extends Pick<SeasonPeriod, 'id' | 'kind' | 'startsAt' | 'endsAt' | 'trackingFromAt' | 'configVersion' | 'closedShifts' | 'firstReachedCurrentSeasonEarnedAt'> {
  earned: number; tierId: string; tierName: string;
}
export interface World {
  now: number; rng: number; nextId: number; phase: 'resting' | 'open' | 'closing';
  playerId: string; coins: number; reputation: number; seasonEarned: number; lifetimeEarned: number;
  staminaMs: number; staminaAnchorMs: number; staminaAnchorAt: number;
  completedShifts: number; active: boolean; paused?: boolean; lastServedAt: number | null;
  disconnection?: { shiftId: string; expiresAt: number; timedOut: boolean };
  restStartedAt: number; wellRestedDays: Record<string, boolean>;
  dayEarned: Record<string, number>; dayShifts: Record<string, number>;
  inventory: Record<Dish, number>; equipment: Record<Equipment, number>; tables: Table[];
  glasses: Glass[]; queue: Group[]; shift: Shift | null; serves: ServeRecord[];
  beer?: { ready: number; batch: { quantity: number; startedAt: number; readyAt: number } | null };
  events: DomainEvent[]; lostStreak: number;
  delivery: DeliveryOrder | null; nextDeliveryAt: number | null;
  dogLevel: number; claimedLifePaths: number[]; badgeShards: number; cosmeticTokens: number; peakLeague: string | null;
  signStyle?: SignStyle; flyers?: number; daily?: DailyQuests; attendance?: Attendance;
  lease?: { id: string; locationId: string; fallback: string; startedAt: number; expiresAt: number;
    rent: number; deposit: number; forfeitOnEarlyLeave: boolean; expired?: boolean };
  seasons?: { ranking: SeasonPeriod; contest: SeasonPeriod; contestEarned: number; results: SeasonResult[];
    legacy: { earned: number; throughAt: number } };
  location: string; lifePath: number; unlocks: string[]; badges: string[];
}
/** Read-only consumers need no replay RNG, identifiers or private planning seeds. */
export type WorldView = Omit<World, 'rng' | 'nextId' | 'events' | 'daily' | 'shift'> & {
  daily?: Omit<DailyQuests, 'seed'>;
  shift: Omit<Shift, 'rushScheduleSeed'> | null;
};
export type Command =
  | { type: 'startShift' }
  | { type: 'endShift' }
  | { type: 'kickAll'; shiftId?: string; maxCost?: number }
  | { type: 'serve'; tableId: string; orderId: string }
  | { type: 'serveDelivery'; deliveryId: string }
  | { type: 'restock'; dish: Dish; mode: 'bulk' | 'full' | 'one' }
  | { type: 'upgrade'; kind: Equipment }
  | { type: 'upgradeTable'; tableId: string }
  | { type: 'buyTable' }
  | { type: 'buyChair'; tableId: string }
  | { type: 'buyGlass'; count: number }
  | { type: 'rentLocation'; locationId: string; leaseId: string | null; maxCost: number }
  | { type: 'leaveLocation'; leaseId: string }
  | { type: 'upgradeDog'; level: number }
  | { type: 'claimLifePath'; level: number }
  | { type: 'buyUnlock'; item: BusinessUnlock }
  | { type: 'claimAttendance'; day: string }
  | { type: 'claimQuest'; day: string; questId: string }
  | { type: 'claimDailyBonus'; day: string }
  | { type: 'buyFlyer' }
  | { type: 'activateFlyer'; shiftId: string }
  | { type: 'installSignboard' }
  | { type: 'setSignboard'; style: SignStyle }
  | { type: 'activity'; active: boolean; paused?: boolean }
  | { type: 'emergencyPack' };
export type SystemCommand = { type: 'connectionLost'; shiftId: string | null; lossId?: string } // lossId absent only in early rules19 persisted logs
  | { type: 'connectionRestored'; recoveryId: string; active: boolean; paused: boolean }
  | { type: 'adoptCalendarRules' };
export interface Envelope<C = Command> { idempotencyKey: string; at: number; command: C }
export interface Result { ok: boolean; reason?: string; outcome?: 'early' | 'late' | 'grace' | 'expired' | 'stale'; amount?: number }
export type RulesVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28; // config-exempt: persisted replay protocol revisions, not economy tuning
export interface LoggedCommand extends Envelope<Command | SystemCommand> { result: Result; configVersion: string; rulesVersion: RulesVersion }
