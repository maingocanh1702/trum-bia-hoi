import type { Dish, Equipment, SeatedType, Weather, Rush } from './config';

export interface Customer { id: string; type: SeatedType; patienceMs: number; enjoyMs: number }
export interface Item {
  id: string; customerId: string; dish: Dish; state: 'pending' | 'preparing' | 'ready' | 'served' | 'wasted';
  readyAt: number | null; glassId: string | null;
}
export interface Order {
  id: string; placedAt: number; patienceMs: number; items: Item[];
  state: 'pending' | 'grace' | 'served' | 'expired'; readyEmitted: boolean;
}
export interface Group { id: string; customers: Customer[]; rounds: number; arrivedAt: number }
export interface Table {
  id: string; level: number; capacity: number;
  state: 'empty' | 'seating' | 'waiting' | 'consuming' | 'occupied' | 'cleaning' | 'broken';
  group: Group | null; order: Order | null; until: number | null; roundsServed: number;
}
export interface Glass {
  id: string; state: 'clean' | 'in_use' | 'dirty' | 'washing';
  itemId: string | null; readyAt: number | null; staleEmitted: boolean;
}
export interface ServeRecord {
  t: number; customerId: string; customerType: SeatedType; orderId: string; dishes: Dish[];
  payment: number; tip: number; credited: number; hadMoi: boolean; stale: boolean; patienceRatio: number;
}
export interface DomainEvent {
  id: string; type: string; at: number; configVersion: string;
  data: Record<string, string | number | boolean | null>;
}
export interface Stats {
  arrived: number; served: number; lost: number; rejected: number; orders: number;
  payment: number; tip: number; credited: number; penalty: number; spent: number; rep: number;
}
export interface Shift {
  id: string; startedAt: number; endsAt: number; closedAt: number | null; configVersion: string;
  weather: Weather; rush: Rush; rushes: { kind: Rush; start: number; end: number }[];
  nextSpawnAt: number; firstGroup: boolean; onboarding: boolean; stats: Stats;
}
export interface World {
  now: number; rng: number; nextId: number; phase: 'resting' | 'open' | 'closing';
  playerId: string; coins: number; reputation: number; seasonEarned: number; lifetimeEarned: number;
  staminaMs: number; staminaAnchorMs: number; staminaAnchorAt: number;
  completedShifts: number; active: boolean; lastServedAt: number | null;
  dayEarned: Record<string, number>; dayShifts: Record<string, number>;
  inventory: Record<Dish, number>; equipment: Record<Equipment, number>; tables: Table[];
  glasses: Glass[]; queue: Group[]; shift: Shift | null; serves: ServeRecord[];
  events: DomainEvent[]; lostStreak: number;
  location: string; lifePath: number; unlocks: string[]; badges: string[];
}
export type Command =
  | { type: 'startShift' }
  | { type: 'endShift' }
  | { type: 'kickAll' }
  | { type: 'serve'; tableId: string; orderId: string }
  | { type: 'restock'; dish: Dish; mode: 'bulk' | 'full' | 'one' }
  | { type: 'upgrade'; kind: Equipment }
  | { type: 'upgradeTable'; tableId: string }
  | { type: 'buyTable' }
  | { type: 'activity'; active: boolean }
  | { type: 'emergencyPack' };
export interface Envelope { idempotencyKey: string; at: number; command: Command }
export interface Result { ok: boolean; reason?: string; outcome?: 'early' | 'late' | 'grace' | 'expired' | 'stale'; amount?: number }
export interface LoggedCommand extends Envelope { result: Result }
