import { config as defaultConfig, configContent, BUSINESS_UNLOCKS, SIGN_STYLES, signWeightMult, DISHES, EQUIPMENT, WEATHER, deliveryBundles, arrivalIntervalMs, type Config, type SeatedType, type Rush } from './config';
import { integer, random, weighted } from './rng';
import { addStock, credit, currentGuests, customerValue, dayKey, deliveryInterval, deliveryQuote, dishUnlocked, dogUpgradeQuote, freshnessMs, kickAllQuote, queueSlots, restockQuote, rushConfig, upgradeQuote, wellRestedBonus } from './rules';
import { lifePathStatus, lifePathRewardQuote, unlockQuote } from './progression';
import { signboardQuote, signboardStyle } from './signboard';
import { attendanceDay, attendanceRewardQuote, applyQuestEvent, planDailyQuests, questRewardQuote, zeroLossWindow } from './quests';
import { flyerQuote } from './flyer';
import { planRushes, summarizeRush } from './rush';
import { menuReport } from './menu';
import { beerStatus } from './production';
import type { Command, Customer, Envelope, Group, Item, LoggedCommand, Order, Result, RulesVersion, Stats, SystemCommand, Table, World } from './types';

const RUSH_CLOCK_RULES: RulesVersion = 5; // config-exempt: fixed replay protocol revision
const PROGRESSION_RULES: RulesVersion = 6; // config-exempt: fixed replay protocol revision
const DELIVERY_RULES: RulesVersion = 7; // config-exempt: fixed replay protocol revision
const SIGNBOARD_RULES: RulesVersion = 9; // config-exempt: fixed replay protocol revision
const RUSH_SCHEDULE_RULES: RulesVersion = 8; // config-exempt: fixed replay protocol revision
const ARRIVAL_INTERVAL_RULES: RulesVersion = 10; // config-exempt: fixed replay protocol revision
const FLYER_RULES: RulesVersion = 11; // config-exempt: fixed replay protocol revision
const QUEST_RULES: RulesVersion = 12; // config-exempt: fixed replay protocol revision
const ATTENDANCE_RULES: RulesVersion = 13; // config-exempt: fixed replay protocol revision
const MENU_RULES: RulesVersion = 14; // config-exempt: fixed replay protocol revision
const CONFIG_PIN_RULES: RulesVersion = 15; // config-exempt: fixed replay protocol revision
const MENU_PAUSE_RULES: RulesVersion = 16; // config-exempt: fixed replay protocol revision
const LIVE_UPGRADE_RULES: RulesVersion = 17; // config-exempt: fixed replay protocol revision for owner live-upgrade policy
const BATCH_RULES: RulesVersion = 18; // config-exempt: fixed replay protocol revision for stocked beer and wash batches
const DISCONNECT_RULES: RulesVersion = 19; // config-exempt: replay protocol for trusted disconnection deadlines
const ABSENT_CALENDAR_RULES: RulesVersion = 20; // config-exempt: replay protocol for lazy absent-day calendars
const emptyStats = (): Stats => ({ arrived: 0, served: 0, lost: 0, rejected: 0, orders: 0, payment: 0, tip: 0, credited: 0, penalty: 0, spent: 0, rep: 0, wellRestedBonus: 0 });

/** No wall clock, IO or renderer: only config, seed, explicit time and commands. */
export class Game {
  readonly world: World;
  readonly log: LoggedCommand[] = [];
  private readonly results = new Map<string, LoggedCommand>();
  private commandKey: string | null = null;
  private activeRushIndex: number | null = null;
  private rulesVersion: RulesVersion = MENU_PAUSE_RULES;
  private currentConfig: Config;
  private readonly snapshots = new Map<string, Config>();
  get config() { return this.currentConfig; }
  get configs(): readonly Config[] { return [...this.snapshots.values()]; }
  constructor(readonly initialConfig: Config = defaultConfig, readonly seed = 1, readonly createdAt = 0, readonly playerId = 'guest') {
    if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(createdAt) || createdAt < 0) throw Error('game:invalid-origin');
    this.currentConfig = initialConfig; this.snapshots.set(initialConfig.version, initialConfig);
    const c = initialConfig.values;
    this.world = {
      now: createdAt, rng: seed >>> 0, nextId: 0, playerId, phase: 'resting', coins: c.shift.startingCoinsBase,
      reputation: 0, seasonEarned: 0, lifetimeEarned: 0, staminaMs: c.shift.durationMs,
      staminaAnchorMs: c.shift.durationMs, staminaAnchorAt: createdAt,
      completedShifts: 0, active: true, lastServedAt: null, dayEarned: {}, dayShifts: {},
      restStartedAt: createdAt, wellRestedDays: {},
      inventory: Object.fromEntries(DISHES.map(d => [d, (c.inventory.startingStock as Record<string, number[]>)[d]?.[0] ?? 0])) as World['inventory'],
      equipment: Object.fromEntries(EQUIPMENT.map(k => [k, k === 'kitchen' ? c.runtime.initialKitchenLevel : c.runtime.initialEquipmentLevel])) as World['equipment'],
      tables: [], glasses: [], queue: [], shift: null, serves: [], events: [], lostStreak: 0,
      delivery: null, nextDeliveryAt: null,
      dogLevel: 0, claimedLifePaths: [], badgeShards: 0, cosmeticTokens: 0, peakLeague: null, location: c.locations.fallback, lifePath: 0, unlocks: [], badges: [],
    };
    for (let i = 0; i < c.upgrades.table.startingTables; i++) this.world.tables.push(this.newTable());
    for (let i = 0; i < c.glasses.start; i++) this.world.glasses.push({ id: this.id('glass'), state: 'clean', itemId: null, readyAt: null, staleEmitted: false });
  }
  private id(kind: string, consume = true) { const next = this.world.nextId + 1; if (consume) this.world.nextId = next; return `${kind}-${next}`; }
  private emit(type: string, data: World['events'][number]['data'] = {}) {
    const id = this.id('event');
    const event = { id, type, at: this.world.now, configVersion: this.config.version, idempotencyKey: this.commandKey ?? `tick:${id}`, data };
    this.world.events.push(event);
    if (this.rulesVersion >= QUEST_RULES && this.world.daily) for (const row of applyQuestEvent(this.world, this.config, event)) this.emit('quest_progressed', { questId: row.id, progress: row.progress, target: row.target });
  }
  private newTable(): Table {
    const level = this.config.values.runtime.initialTableLevel;
    return { id: this.id('table'), level, capacity: this.config.values.upgrades.table.levels[level - 1].capacity, state: 'empty', group: null, order: null, until: null, roundsServed: 0 };
  }
  private items(): Item[] { return this.world.tables.flatMap(t => t.order?.items ?? []); }
  private queueDeadline(group: Group): number {
    return group.arrivedAt + Math.min(...group.customers.map(x => x.patienceMs)) + (this.rulesVersion === 1 ? this.config.values.patience.graceMs : 0);
  }
  private nextDue(): number {
    const w = this.world, c = this.config.values, times: number[] = [];
    if (w.phase === 'open' && w.shift) {
      times.push(w.shift.endsAt, w.shift.nextSpawnAt);
    }
    if (this.rulesVersion >= DELIVERY_RULES) {
      if (w.delivery) times.push(w.delivery.expiresAt);
      else if (w.phase === 'open' && w.nextDeliveryAt !== null) times.push(w.nextDeliveryAt);
    }
    if (w.shift && (w.phase === 'open' || this.rulesVersion >= RUSH_CLOCK_RULES && w.phase === 'closing')) {
      for (const r of w.shift.rushes) {
        times.push(r.end);
        if (w.phase === 'open') {
          times.push(r.start);
          if (this.rulesVersion >= RUSH_CLOCK_RULES && !r.warned) times.push(r.start - c.rush.schedule.warningMs);
        }
      }
    }
    if (w.shift?.flyer) times.push(w.shift.flyer.end);
    if (w.attendance) times.push(w.attendance.expiresAt);
    if (w.daily) {
      times.push(w.daily.expiresAt);
      const row = w.daily.rows.find(r => r.kind === 'zero_loss_window');
      if (row && row.progress < row.target && w.daily.lossFreeSince !== null) times.push(w.daily.lossFreeSince + zeroLossWindow(this.config));
    }
    for (const t of w.tables) {
      if (t.until !== null) times.push(t.until);
      if (t.order?.state === 'pending') times.push(t.order.placedAt + t.order.patienceMs);
      if (t.order?.state === 'grace') times.push(t.order.placedAt + t.order.patienceMs + c.patience.graceMs);
    }
    for (const q of w.queue) times.push(this.queueDeadline(q));
    for (const item of this.items()) {
      if (item.state === 'preparing' && item.readyAt !== null) times.push(item.readyAt);
      if (item.state === 'ready' && item.glassId) {
        const g = w.glasses.find(x => x.id === item.glassId)!;
        if (!g.staleEmitted && g.readyAt !== null) times.push(g.readyAt + freshnessMs(w, this.config));
      }
    }
    for (const g of w.glasses) if (g.state === 'washing' && g.readyAt !== null) times.push(g.readyAt);
    if (w.beer?.batch) times.push(w.beer.batch.readyAt);
    return Math.min(...times.filter(t => t > w.now));
  }
  private validateAdvance(now: number): void {
    const w = this.world;
    if (!Number.isSafeInteger(now) || now < w.now) throw Error('clock:non-monotonic');
    // Validate the whole possible pause, including inactive rest after timeout/closing.
    if (this.rulesVersion >= DISCONNECT_RULES && (!w.active || w.paused) && !this.shiftPauseTimers(now - w.now, false)) throw Error('clock:unsafePause');
  }
  /** Live adapter boundary; recorded history continues to use advance(). */
  catchUp(now: number): void {
    this.validateAdvance(now);
    if (this.rulesVersion === DISCONNECT_RULES && !this.world.active && now > this.world.now) {
      const prefix = `system:calendar:${ABSENT_CALENDAR_RULES}`;
      let suffix = 0, idempotencyKey = prefix;
      while (this.results.has(idempotencyKey)) idempotencyKey = `${prefix}:${++suffix}`;
      const result = this.applyCommand({ at: this.world.now, idempotencyKey, command: { type: 'adoptCalendarRules' } }, ABSENT_CALENDAR_RULES);
      if (!result.ok) throw Error('replay:calendarAdoption');
    }
    this.advance(now);
  }
  /** Advance the currently pinned replay rules without inventing a version boundary. */
  advance(now: number): void {
    this.validateAdvance(now);
    const w = this.world, outage = w.disconnection;
    if (outage && !outage.timedOut && now >= outage.expiresAt) {
      this.advanceTime(outage.expiresAt);
      outage.timedOut = true;
      this.emit('connection_expired', { shiftId: outage.shiftId });
      if (w.phase === 'open') { w.phase = 'closing'; this.emit('shift_closing', { reason: 'disconnected' }); }
      this.processDue();
    }
    this.advanceTime(now);
  }
  private gameplayPaused(): boolean {
    const w = this.world;
    return (!w.active || !!w.paused) && this.rulesVersion !== 1 && !w.disconnection?.timedOut;
  }
  private advanceTime(now: number): void {
    const w = this.world, c = this.config.values;
    if (this.gameplayPaused()) {
      do {
        // Calendar events must land at the same instant for live ticks and log replay.
        let next = now;
        if (this.rulesVersion >= DISCONNECT_RULES && (this.rulesVersion < ABSENT_CALENDAR_RULES || w.active)) for (const expiry of [w.daily?.expiresAt, w.active ? w.attendance?.expiresAt : undefined]) {
          if (expiry !== undefined && expiry > w.now) next = Math.min(next, expiry);
        }
        this.advancePaused(next);
      } while (w.now < now);
      return;
    }
    while (w.now < now) {
      const next = Math.min(now, this.nextDue());
      if (w.phase === 'open' && w.shift) w.staminaMs = Math.max(0, w.shift.endsAt - next);
      else if (w.phase === 'resting' && w.active) w.staminaMs = Math.min(c.shift.durationMs, w.staminaAnchorMs + (next - w.staminaAnchorAt) * c.shift.regenRate);
      w.now = next;
      this.processDue();
      // Closing may finish midway through a long offline advance; rest must freeze again.
      if (this.gameplayPaused() && w.now < now) return this.advanceTime(now);
    }
  }
  private advancePaused(now: number): void {
    const w = this.world;
    const elapsed = now - w.now;
    this.shiftPauseTimers(elapsed, true);
    w.now = now;
    if (this.rulesVersion >= MENU_PAUSE_RULES) this.observeAttendance();
    if (this.rulesVersion >= QUEST_RULES) this.ensureDailyQuests();
  }
  private shiftPauseTimers(elapsed: number, apply: boolean): boolean {
    const w = this.world;
    let valid = true;
    const shift = <T, K extends keyof T>(target: T, key: K) => {
      const next = Number(target[key]) + elapsed;
      valid = Number.isSafeInteger(next) && valid;
      if (apply) target[key] = next as T[K];
    };
    // Keep calendar time real; move gameplay deadlines so hidden/offline time is not played.
    if (w.shift && w.phase !== 'resting') {
      shift(w.shift, 'pausedMs');
      shift(w.shift, 'endsAt'); shift(w.shift, 'nextSpawnAt');
      if (w.shift.wellRestedUntil !== null) shift(w.shift, 'wellRestedUntil');
      if (w.shift.rushUntil != null) shift(w.shift, 'rushUntil');
      if (w.shift.flyer) { shift(w.shift.flyer, 'start'); shift(w.shift.flyer, 'end'); }
      for (const rush of w.shift.rushes) { shift(rush, 'start'); shift(rush, 'end'); }
    }
    for (const table of w.tables) {
      if (table.until !== null) shift(table, 'until');
      if (table.group) shift(table.group, 'arrivedAt');
      if (table.order) {
        shift(table.order, 'placedAt');
        for (const item of table.order.items) if (item.readyAt !== null) shift(item, 'readyAt');
      }
    }
    for (const group of w.queue) shift(group, 'arrivedAt');
    for (const glass of w.glasses) {
      if (glass.readyAt !== null) shift(glass, 'readyAt');
      if (glass.startedAt !== undefined) shift(glass, 'startedAt');
    }
    if (w.beer?.batch) { shift(w.beer.batch, 'startedAt'); shift(w.beer.batch, 'readyAt'); }
    if (w.lastServedAt !== null) shift(w, 'lastServedAt');
    if (w.nextDeliveryAt !== null) shift(w, 'nextDeliveryAt');
    if (w.delivery) { shift(w.delivery, 'placedAt'); shift(w.delivery, 'expiresAt'); }
    if (w.daily?.lossFreeSince != null) shift(w.daily, 'lossFreeSince');
    return valid;
  }
  private updateRush(): void {
    const w = this.world, s = w.shift;
    if (!s || (!w.active || w.paused) && !w.disconnection?.timedOut) return;
    const candidate = w.phase === 'open' ? s.rushes.findIndex(r => w.now >= r.start && w.now < r.end) : this.activeRushIndex;
    const planned = candidate == null ? undefined : s.rushes[candidate];
    const slot = w.phase !== 'resting' && planned && planned.start <= w.now && w.now < planned.end ? planned : undefined;
    const index = slot ? candidate : null, kind = slot?.kind ?? 'none';
    s.rushUntil = slot?.end ?? null;
    if (kind !== s.rush || index !== this.activeRushIndex) {
      const previous = s.rush, previousIndex = this.activeRushIndex;
      s.rush = kind; this.activeRushIndex = index;
      if (previous !== 'none') {
        const ended = previousIndex == null ? undefined : s.rushes[previousIndex];
        this.emit('rush_ended', { kind: previous, ...(ended?.eventStart === undefined ? {} : { shiftId: s.id, slot: previousIndex!, startedAt: w.events[ended.eventStart].at, endedAt: w.now, activeMs: Math.max(0, w.now - ended.start), ...summarizeRush(w.events, ended.eventStart) }) });
      }
      if (kind !== 'none') {
        if (s.rushScheduleSeed !== undefined) slot!.eventStart = w.events.length;
        this.emit('rush_started', { kind, until: slot!.end, weather: s.weather, location: w.location, ...(s.rushScheduleSeed === undefined ? {} : { shiftId: s.id, slot: index! }) });
      }
    }
    if (w.phase === 'open') for (const [index, r] of s.rushes.entries()) {
      if (!r.warned && w.now >= r.start - this.config.values.rush.schedule.warningMs && w.now < r.start) {
        r.warned = true;
        this.emit('rush_warning', { kind: r.kind, startsAt: r.start, remainingMs: r.start - w.now, slot: index });
      }
    }
  }
  private observeAttendance(create = false) {
    const w = this.world;
    if (!w.active || !w.attendance && !create) return;
    const { track, transition } = attendanceDay(w, this.config);
    if (transition === 'same') return;
    w.attendance = track;
    this.emit('attendance_day_opened', { day: track.lastActiveDateKey, cycleDay: track.cycleDay, expiresAt: track.expiresAt, transition });
  }
  private ensureDailyQuests(create = false) {
    const w = this.world;
    // Absent paused days have no gameplay events; refresh once on the next real visit.
    if (this.rulesVersion >= ABSENT_CALENDAR_RULES && !w.active && !create && this.gameplayPaused()) return;
    if (!w.daily && !create || w.daily && w.now < w.daily.expiresAt) return;
    w.daily = planDailyQuests(w, this.config);
    for (const row of w.daily.rows) this.emit('quest_generated', { questId: row.id, kind: row.kind, target: row.target, day: w.daily.day, tier: w.daily.tier, seed: w.daily.seed });
  }
  private tickQuests() {
    const w = this.world, daily = w.daily;
    if (!daily || !w.active || w.paused || w.phase === 'resting') return;
    daily.lossFreeSince ??= w.now;
    const row = daily.rows.find(r => r.kind === 'zero_loss_window');
    if (row && row.progress < row.target && daily.lossFreeServed && w.now - daily.lossFreeSince >= zeroLossWindow(this.config)) {
      row.progress++; daily.lossFreeSince = w.now; daily.lossFreeServed = false;
      this.emit('quest_progressed', { questId: row.id, progress: row.progress, target: row.target });
    }
  }
  private endFlyer(reason: 'expired' | 'shiftClosed') {
    const w = this.world, s = w.shift, campaign = s?.flyer;
    if (!s || !campaign) return;
    this.emit('flyer_ended', { shiftId: s.id, reason, startedAt: w.events[campaign.eventStart].at, endedAt: w.now, activeMs: Math.max(0, w.now - campaign.start), ...summarizeRush(w.events, campaign.eventStart) });
    delete s.flyer;
  }
  private processDue(): void {
    const w = this.world, c = this.config.values, s = w.shift;
    if (this.gameplayPaused()) return;
    if (this.rulesVersion >= QUEST_RULES) this.ensureDailyQuests();
    if (this.rulesVersion >= ATTENDANCE_RULES) this.observeAttendance();
    if (s?.flyer && w.now >= s.flyer.end) this.endFlyer('expired');
    if (this.rulesVersion >= RUSH_CLOCK_RULES) {
      if (w.phase === 'open' && s && w.now >= s.endsAt) { w.phase = 'closing'; this.emit('shift_closing'); }
      this.updateRush();
    } else if (w.phase === 'open' && s) {
      if (w.now >= s.endsAt) { w.phase = 'closing'; this.emit('shift_closing'); }
      const index = s.rushes.findIndex(r => w.now >= r.start && w.now < r.end);
      this.activeRushIndex = index < 0 ? null : index; // Private replay bookkeeping preserves the original slot without changing legacy events.
      const rush = s.rushes[index]?.kind ?? 'none';
      if (rush !== s.rush) { if (s.rush !== 'none') this.emit('rush_ended', { kind: s.rush }); s.rush = rush; if (rush !== 'none') this.emit('rush_started', { kind: rush }); }
    }
    for (const g of w.glasses) {
      if (g.state === 'washing' && g.readyAt !== null && w.now >= g.readyAt) {
        g.state = 'clean'; g.readyAt = null; g.itemId = null; g.staleEmitted = false;
        delete g.startedAt;
        this.emit('glass_washed', { glassId: g.id });
      }
    }
    if (w.beer?.batch && w.now >= w.beer.batch.readyAt) {
      const quantity = w.beer.batch.quantity;
      w.beer.ready += quantity; w.beer.batch = null;
      this.emit('beer_batch_ready', { quantity, available: w.beer.ready });
    }
    for (const item of this.items()) {
      if (item.state === 'preparing' && item.readyAt !== null && w.now >= item.readyAt) {
        item.state = 'ready'; this.emit(item.dish === 'bia' ? 'beer_poured' : 'dish_ready', { itemId: item.id });
        if (this.rulesVersion >= MENU_RULES && c.menu[item.dish].station === 'kitchen') this.emit('kitchen_job_ready', { shiftId: s!.id, itemId: item.id, dish: item.dish });
      }
      if (item.state === 'ready' && item.glassId) {
        const glass = w.glasses.find(g => g.id === item.glassId)!;
        if (!glass.staleEmitted && glass.readyAt !== null && w.now >= glass.readyAt + freshnessMs(w, this.config)) {
          glass.staleEmitted = true; this.emit('glass_stale', { glassId: glass.id });
        }
      }
    }
    for (const t of w.tables) {
      if (t.order?.state === 'pending' && w.now >= t.order.placedAt + t.order.patienceMs) {
        t.order.state = 'grace'; this.emit('order_grace', { tableId: t.id, orderId: t.order.id });
      }
      if (t.order?.state === 'grace' && w.now >= t.order.placedAt + t.order.patienceMs + c.patience.graceMs) this.lose(t);
      if (t.until !== null && w.now >= t.until) {
        if (t.state === 'seating') this.order(t);
        else if (t.state === 'consuming') {
          this.releaseGlasses(t);
          if (w.phase === 'open' && t.group && t.roundsServed < t.group.rounds) this.order(t);
          else if (t.group?.customers.some(x => x.type === 'chipheo')) {
            const chipheo = t.group.customers.filter(x => x.type === 'chipheo');
            const until = Math.max(...chipheo.map(x => t.group!.arrivedAt + x.patienceMs));
            if (until > w.now) { t.state = 'occupied'; t.until = until; this.emit('table_occupied', { tableId: t.id }); }
            else this.clean(t);
          } else this.clean(t);
        } else if (t.state === 'occupied') this.clean(t);
        else if (t.state === 'cleaning') {
          t.state = 'empty'; t.group = null; t.order = null; t.until = null; t.roundsServed = 0;
          this.emit('table_cleaned', { tableId: t.id });
        }
      }
    }
    for (const group of [...w.queue]) {
      if (w.now >= this.queueDeadline(group)) {
        w.queue = w.queue.filter(x => x.id !== group.id);
        if (s) s.stats.lost += group.customers.length;
        const loss = this.penalize(0, group.customers.length);
        w.lostStreak += 1;
        this.emit('customer_left', { groupId: group.id, reason: 'queue', count: group.customers.length, penalty: loss.coins, reputation: loss.reputation, ...(this.rulesVersion >= QUEST_RULES ? { vipCount: group.customers.filter(c => c.type === 'vip').length } : {}) });
      }
    }
    this.seatQueue();
    if (w.phase === 'open' && s && w.now >= s.nextSpawnAt) this.spawn();
    if (this.rulesVersion >= DELIVERY_RULES) this.processDelivery();
    this.prepare();
    this.wash();
    if (this.rulesVersion >= QUEST_RULES) this.tickQuests();
    if (w.phase === 'closing' && !w.delivery && w.queue.length === 0 && w.tables.every(t => ['empty', 'cleaning', 'broken'].includes(t.state))) {
      w.phase = 'resting'; w.completedShifts++;
      w.staminaAnchorMs = w.staminaMs; w.staminaAnchorAt = w.now;
      w.restStartedAt = w.now;
      const key = dayKey(w.now, this.config);
      w.dayShifts[key] = (w.dayShifts[key] ?? 0) + 1;
      if (s) s.closedAt = w.now;
      if (this.rulesVersion >= RUSH_CLOCK_RULES) this.updateRush();
      delete w.disconnection;
      this.endFlyer('shiftClosed');
      this.emit('shift_closed', { shiftId: s?.id ?? '', credited: s?.stats.credited ?? 0 });
      if (this.rulesVersion >= MENU_RULES) {
        const report = menuReport(w, this.config);
        if (report) {
          const { rows, ...values } = report;
          this.emit('menu_mix_summary', { ...values, ...Object.fromEntries(rows.flatMap(row => (['ordered', 'sold', 'wasted'] as const).map(key => [`${key}_${row.dish}`, row[key]]))) });
        }
      }
    }
  }
  private processDelivery() {
    const w = this.world, c = this.config.values;
    if (w.delivery && w.now >= w.delivery.expiresAt) {
      const q = deliveryQuote(w, this.config)!;
      const loss = this.penalize(q.penalty, 0);
      w.shift!.stats.deliveryMissed = (w.shift!.stats.deliveryMissed ?? 0) + 1;
      this.emit('shipper_missed', { deliveryId: w.delivery.id, gross: q.gross, penalty: loss.coins, reputation: loss.reputation });
      w.delivery = null;
    }
    if (w.phase !== 'open') { w.nextDeliveryAt = null; return; }
    if (!w.delivery && w.nextDeliveryAt !== null && w.now >= w.nextDeliveryAt) {
      const bundles = deliveryBundles(c, w.equipment.kitchen, c.customerTypes.shipper.grossBase);
      const bundle = bundles[integer(w, 0, bundles.length - 1)];
      w.delivery = { id: this.id('delivery'), placedAt: w.now, expiresAt: w.now + c.customerTypes.shipper.deadlineMs, lines: bundle.lines };
      w.nextDeliveryAt = w.now + deliveryInterval(w, this.config);
      this.emit('shipper_arrived', { deliveryId: w.delivery.id, gross: bundle.gross, expiresAt: w.delivery.expiresAt, items: bundle.lines.reduce((n, line) => n + line.quantity, 0), ...Object.fromEntries(bundle.lines.map(line => [`qty_${line.dish}`, line.quantity])) });
    }
  }
  private serveCoolingDown() {
    return this.world.lastServedAt !== null && this.world.now - this.world.lastServedAt < 1000 / this.config.values.spawn.playerServeCeilingPerSec;
  }
  private changeRep(delta: number) {
    const w = this.world;
    const applied = Math.max(0, w.reputation + delta) - w.reputation;
    w.reputation += applied;
    if (w.shift && w.phase !== 'resting') w.shift.stats.rep += applied;
  }
  private spend(amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > this.world.coins) throw Error('ledger:invalid-debit');
    this.world.coins -= amount;
    if (this.world.phase !== 'resting' && this.world.shift) this.world.shift.stats.spent += amount;
  }
  private penalize(amount: number, customers: number) {
    const w = this.world, charged = Math.min(w.coins, amount), previousRep = w.reputation;
    w.coins -= charged;
    if (w.shift) w.shift.stats.penalty += charged;
    this.changeRep(this.config.values.reputation.customerLeft * customers);
    return { coins: charged, reputation: previousRep - w.reputation };
  }
  private releaseGlasses(t: Table) {
    for (const item of t.order?.items ?? []) {
      if (!item.glassId) continue;
      const glass = this.world.glasses.find(g => g.id === item.glassId)!;
      glass.state = 'dirty'; glass.readyAt = null; glass.itemId = null;
      item.glassId = null;
    }
  }
  private clean(t: Table) {
    this.releaseGlasses(t);
    t.state = 'cleaning'; t.until = this.world.now + this.config.values.runtime.tableCleaningMs;
    this.emit('table_cleaning', { tableId: t.id });
  }
  private lose(t: Table): void {
    if (!t.order || !t.group || !this.world.shift) return;
    const w = this.world, s = w.shift!, order = t.order;
    let penalty = 0;
    for (const customer of t.group.customers) {
      const value = customerValue(w, this.config, order, customer);
      penalty += value.penalty;
      this.emit('customer_left', { customerId: customer.id, tableId: t.id, reason: 'expired', penalty: value.penalty });
    }
    const charged = Math.min(w.coins, penalty);
    const loss = this.penalize(penalty, t.group.customers.length); s.stats.lost += t.group.customers.length;
    order.state = 'expired';
    this.waste(t, 'expired');
    w.lostStreak++;
    this.emit('order_expired', { tableId: t.id, orderId: order.id, penalty: charged, reputation: loss.reputation, count: t.group.customers.length });
    this.clean(t);
  }
  private waste(table: Table, reason: 'expired' | 'cancelled') {
    for (const item of table.order!.items) {
      if (this.rulesVersion < MENU_RULES) { if (item.state !== 'pending') item.state = 'wasted'; continue; }
      if (!['preparing', 'ready'].includes(item.state)) continue;
      const previousState = item.state; item.state = 'wasted';
      this.emit('dish_wasted', { shiftId: this.world.shift!.id, tableId: table.id, orderId: table.order!.id, itemId: item.id, dish: item.dish, reason, previousState });
    }
  }
  private startMenu(complete = false) {
    const w = this.world, shift = w.shift;
    if (this.rulesVersion < MENU_RULES || !shift || shift.menu || w.phase === 'resting') return;
    shift.menu = { eventStart: w.events.length, serveStart: w.serves.length, complete };
    this.emit('menu_tracking_started', { shiftId: shift.id, complete });
  }
  private seatQueue(): void {
    for (const group of [...this.world.queue]) {
      const table = this.world.tables.filter(t => t.state === 'empty' && t.capacity >= group.customers.length).sort((a, b) => a.capacity - b.capacity)[0];
      if (!table) continue;
      this.world.queue = this.world.queue.filter(x => x.id !== group.id);
      table.group = group; table.state = 'seating'; table.until = this.world.now + this.config.values.runtime.tableSeatingMs;
      table.roundsServed = 0;
      this.emit('group_seated', { tableId: table.id, groupId: group.id, size: group.customers.length });
    }
  }
  private spawn(): void {
    const w = this.world, c = this.config.values, s = w.shift!;
    const first = s.firstGroup && s.onboarding;
    const size = first ? c.onboarding.firstShift.firstGroupSize : integer(w, 1, Math.max(...w.tables.map(t => t.capacity)));
    const types = Object.entries(c.customerTypes).filter(([, v]) => v.usesTable && v.weight > 0) as [SeatedType, typeof c.customerTypes.thuong][];
    let vipCount = 0;
    const customers: Customer[] = Array.from({ length: size }, () => {
      const type = first ? c.onboarding.firstShift.firstGroupType as SeatedType : weighted(w, types.map(([key, value]) => {
        const weatherMult = (c.weather[s.weather].customerWeightMult as Record<string, number>)[key] ?? 1;
        const rush = rushConfig(this.config, s.rush);
        const rushMult = key === 'voi' && 'voiWeightMult' in rush ? rush.voiWeightMult : 1;
        const allowed = key !== 'vip' || vipCount < c.customerTypes.vip.maxPerGroupPhase2;
        return [key, allowed ? value.weight * weatherMult * rushMult * (this.rulesVersion >= SIGNBOARD_RULES ? signWeightMult(signboardStyle(w, this.config), key) : 1) : 0];
      }));
      if (type === 'vip') vipCount++;
      const profile = c.customerTypes[type], rush = rushConfig(this.config, s.rush);
      const enjoyMult = this.rulesVersion >= RUSH_SCHEDULE_RULES && 'enjoyMult' in rush ? rush.enjoyMult : 1;
      return { id: this.id('customer'), type, patienceMs: Math.round(c.patience.thuongMs * profile.patienceMult * c.weather[s.weather].patienceMult), enjoyMs: integer(w, c.enjoy.minMs, c.enjoy.maxMs) * profile.enjoyMult * enjoyMult };
    });
    const leisurely = customers.some(x => x.type === 'ngoily'), hurried = customers.some(x => x.type === 'voi');
    const range = leisurely ? c.rounds.ngoily : hurried ? c.rounds.voi : customers.some(x => x.type === 'vip') ? c.rounds.vip : c.rounds.thuong;
    let rounds = this.rulesVersion === 1 ? 1 : range[0]; // config-exempt: v1 historical replay default
    if (leisurely) rounds = integer(w, ...range as [number, number]);
    else if (!first && !hurried && random(w) < c.demandMix.pSecondRound) rounds = this.rulesVersion === 1 ? c.rounds.thuong[1] : range[1];
    else if (this.rulesVersion !== 1 && !first && hurried && range[0] !== range[1]) rounds = integer(w, ...range as [number, number]);
    const group: Group = { id: this.id('group'), customers, rounds, arrivedAt: w.now };
    s.stats.arrived += size;
    if (w.queue.length >= queueSlots(w, this.config) && !w.tables.some(t => t.state === 'empty' && t.capacity >= size)) {
      s.stats.rejected += size; this.emit('queue_overflow', { size });
    } else {
      w.queue.push(group);
      this.emit('customer_spawned', { groupId: group.id, size, weather: s.weather, rush: s.rush });
      this.seatQueue();
    }
    const rush = rushConfig(this.config, s.rush);
    const interval = this.rulesVersion >= ARRIVAL_INTERVAL_RULES ? arrivalIntervalMs(c, s.weather, s.rush, this.rulesVersion >= FLYER_RULES && !!s.flyer) : Math.max(c.spawn.baseMs * c.weather[s.weather].spawnIntervalMult * rush.spawnIntervalMult, rush.floorMs);
    s.nextSpawnAt = w.now + Math.round(interval * (c.spawn.perCustomer ? size : 1));
    s.firstGroup = false;
  }
  private order(t: Table): void {
    const w = this.world, c = this.config.values, s = w.shift!, group = t.group!;
    const first = s.onboarding && s.stats.orders === 0;
    const items: Item[] = [];
    for (const customer of group.customers) {
      const dishes = first ? [...c.onboarding.firstShift.firstOrder] as typeof DISHES : ['bia'] as typeof DISHES;
      if (!first && random(w) < c.demandMix.pMoi) {
        const hot = DISHES.filter(d => c.menu[d].station === 'kitchen' && dishUnlocked(w, this.config, d));
        const cold: (typeof DISHES)[number] = random(w) < c.demandMix.pNemGivenMoi ? 'nem' : 'lac';
        // With no hot kitchen, use the measured cold-menu mix exactly.
        dishes.push(hot.length ? [cold, ...hot][integer(w, 0, hot.length)] : cold);
      }
      for (const dish of dishes) items.push({ id: this.id('item'), customerId: customer.id, dish, state: 'pending', readyAt: null, glassId: null });
    }
    t.order = { id: this.id('order'), placedAt: w.now, patienceMs: Math.min(...group.customers.map(x => x.patienceMs)), items, state: 'pending', readyEmitted: false };
    t.state = 'waiting'; t.until = null; s.stats.orders++;
    this.emit('order_placed', { tableId: t.id, orderId: t.order.id, items: items.length });
    if (this.rulesVersion >= MENU_RULES) for (const item of items) this.emit('dish_ordered', { shiftId: s.id, tableId: t.id, orderId: t.order.id, itemId: item.id, dish: item.dish, customerId: item.customerId, customerType: group.customers.find(customer => customer.id === item.customerId)!.type, tableSize: group.customers.length });
  }
  private prepare(): void {
    const w = this.world, c = this.config.values;
    const batches = this.rulesVersion >= BATCH_RULES && c.upgrades.keg.refillEnabled;
    const items = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state)).flatMap(t => t.order!.items);
    let pouring = items.filter(i => i.state === 'preparing' && i.dish === 'bia').length;
    let cooking = items.filter(i => i.state === 'preparing' && c.menu[i.dish].station === 'kitchen').length;
    for (const item of items) {
      if (item.state !== 'pending' || (batches && item.dish === 'bia' ? w.beer?.ready ?? 0 : w.inventory[item.dish]) <= 0 || !dishUnlocked(w, this.config, item.dish)) continue;
      const menu = c.menu[item.dish];
      let duration = menu.prepMs;
      if (menu.needsGlass) {
        if (!batches && pouring >= c.upgrades.keg.pourSlots[w.equipment.keg - 1]) continue;
        const glass = w.glasses.find(g => g.state === 'clean');
        if (!glass) continue;
        duration = batches ? 0 : c.upgrades.keg.pourMs[w.equipment.keg - 1];
        glass.state = 'in_use'; glass.itemId = item.id; glass.readyAt = w.now + duration; glass.staleEmitted = false;
        item.glassId = glass.id; pouring++;
      } else if (menu.station === 'kitchen') {
        if (cooking >= c.upgrades.kitchen.slots[w.equipment.kitchen]) continue;
        const mult = c.upgrades.kitchen.prepMult[w.equipment.kitchen];
        if (mult === null) continue;
        duration = Math.round(duration * mult); cooking++;
      }
      if (batches && item.dish === 'bia') w.beer!.ready--;
      else w.inventory[item.dish]--;
      item.state = duration > 0 ? 'preparing' : 'ready'; item.readyAt = w.now + duration;
      this.emit(menu.needsGlass ? 'beer_pouring' : 'dish_preparing', { itemId: item.id, dish: item.dish });
      if (batches && item.dish === 'bia') this.emit('beer_poured', { itemId: item.id, fromReserve: true });
      if (this.rulesVersion >= MENU_RULES && menu.station === 'kitchen') {
        this.emit('kitchen_job_started', { shiftId: w.shift!.id, itemId: item.id, dish: item.dish, prepMs: duration, readyAt: item.readyAt });
        if (item.state === 'ready') this.emit('kitchen_job_ready', { shiftId: w.shift!.id, itemId: item.id, dish: item.dish });
      }
    }
    for (const t of w.tables) if (t.order && ['pending', 'grace'].includes(t.order.state) && !t.order.readyEmitted && t.order.items.every(i => i.state === 'ready')) {
      t.order.readyEmitted = true; this.emit('order_ready', { tableId: t.id, orderId: t.order.id });
    }
    if (batches && (w.phase === 'open' || w.phase === 'closing' && items.some(i => i.state === 'pending'))) {
      w.beer ??= { ready: 0, batch: null };
      if (!w.beer.batch) {
        const status = beerStatus(w, this.config);
        const quantity = Math.min(status.batchSize, Math.max(0, status.capacity - status.stored), w.inventory.bia);
        if (quantity > 0) {
          w.inventory.bia -= quantity;
          w.beer.batch = { quantity, startedAt: w.now, readyAt: w.now + status.durationMs };
          this.emit('beer_batch_started', { quantity, readyAt: w.beer.batch.readyAt, stock: w.inventory.bia });
        }
      }
    }
  }
  private wash(): void {
    const w = this.world, c = this.config.values;
    if (this.rulesVersion >= BATCH_RULES && w.glasses.some(g => g.state === 'washing')) return;
    let slots = c.upgrades.washer.slots[w.equipment.washer - 1] - w.glasses.filter(g => g.state === 'washing').length;
    for (const glass of w.glasses) if (slots > 0 && glass.state === 'dirty') {
      glass.state = 'washing'; glass.readyAt = w.now + c.upgrades.washer.washMs[w.equipment.washer - 1]; slots--;
      if (this.rulesVersion >= BATCH_RULES) glass.startedAt = w.now;
      this.emit('glass_washing', { glassId: glass.id });
    }
  }
  /** Opening config is supplied by a trusted registry adapter, never by a player command payload. */
  command(envelope: Envelope, openingConfig?: Config): Result {
    if (!validEnvelope(envelope)) return { ok: false, reason: 'invalidCommand' };
    return this.applyCommand(envelope, ABSENT_CALENDAR_RULES, openingConfig, true);
  }
  /** Trusted adapter supplies one lossId per outage and reuses it only for retries. */
  disconnect(at: number, shiftId: string, lossId: string): Result {
    if (typeof lossId !== 'string' || !lossId) return { ok: false, reason: 'invalidCommand' };
    return this.applyCommand({ at, idempotencyKey: `system:connectionLost:${shiftId}:${lossId}`, command: { type: 'connectionLost', shiftId, lossId } }, ABSENT_CALENDAR_RULES, undefined, true);
  }
  /** Persistence replay only. HTTP/UI callers always use command(), which selects current rules. */
  replay(entry: LoggedCommand, config = this.config): Result {
    if (entry.command.type === 'adoptCalendarRules' && entry.rulesVersion !== ABSENT_CALENDAR_RULES) throw Error('replay:rulesVersion');
    if (entry.command.type === 'connectionLost' && (entry.rulesVersion < DISCONNECT_RULES || entry.rulesVersion >= ABSENT_CALENDAR_RULES && !entry.command.lossId)) throw Error('replay:rulesVersion');
    if (entry.command.type === 'activity' && entry.command.paused !== undefined && entry.rulesVersion < MENU_PAUSE_RULES) throw Error('replay:rulesVersion');
    if (entry.configVersion !== config.version || config.version !== this.config.version && (entry.command.type !== 'startShift' || entry.rulesVersion < CONFIG_PIN_RULES)) throw Error('replay:configVersion');
    return this.applyCommand(entry, entry.rulesVersion, entry.command.type === 'startShift' ? config : undefined);
  }
  private applyCommand(envelope: Envelope<Command | SystemCommand>, rulesVersion: RulesVersion, openingConfig?: Config, live = false): Result {
    if (!validReplayEnvelope(envelope)) return { ok: false, reason: 'invalidCommand' };
    const previous = this.results.get(envelope.idempotencyKey);
    if (previous) return JSON.stringify(previous.command) === JSON.stringify(envelope.command) ? { ...previous.result } : { ok: false, reason: 'idempotencyConflict' };
    if (envelope.at < this.world.now) return { ok: false, reason: 'staleCommand' };
    if (openingConfig && envelope.command.type !== 'startShift') return { ok: false, reason: 'configOnlyOnStart' };
    const selected = openingConfig ?? this.config, known = this.snapshots.get(selected.version);
    if (known && known !== selected && configContent(known) !== configContent(selected)) return { ok: false, reason: 'configVersionConflict' };
    // Old logs switched before advancing; v10+ keeps elapsed autonomous history under its preceding rules.
    if (rulesVersion < ARRIVAL_INTERVAL_RULES) this.rulesVersion = rulesVersion;
    if (live) this.catchUp(envelope.at); else this.advance(envelope.at);
    this.rulesVersion = rulesVersion;
    this.snapshots.set(selected.version, selected);
    this.commandKey = envelope.idempotencyKey;
    try {
      this.startMenu();
      if (rulesVersion >= QUEST_RULES) this.ensureDailyQuests();
      if (rulesVersion >= ATTENDANCE_RULES) this.observeAttendance();
      if (rulesVersion >= RUSH_CLOCK_RULES) this.updateRush();
      if (rulesVersion >= PROGRESSION_RULES) this.updateProgression();
      const result = this.execute(envelope.command, selected);
      if (rulesVersion >= DELIVERY_RULES && this.world.phase === 'open' && this.world.nextDeliveryAt === null && this.world.unlocks.includes(this.config.values.customerTypes.shipper.requires)) this.world.nextDeliveryAt = this.world.now + deliveryInterval(this.world, this.config);
      if (rulesVersion >= PROGRESSION_RULES) this.updateProgression();
      const entry = structuredClone({ ...envelope, result, configVersion: selected.version, rulesVersion });
      this.log.push(entry); this.results.set(entry.idempotencyKey, entry);
      this.processDue();
      return { ...result };
    } finally { this.commandKey = null; }
  }
  private updateProgression() {
    const target = lifePathStatus(this.world, this.config).level;
    while (this.world.lifePath < target) {
      this.world.lifePath++;
      this.emit('life_path_level_reached', { level: this.config.values.lifePath[this.world.lifePath].id, lifetimeEarned: this.world.lifetimeEarned });
    }
  }
  private execute(cmd: Command | SystemCommand, openingConfig = this.config): Result {
    const w = this.world, c = this.config.values, s = w.shift;
    const fail = (reason: string): Result => ({ ok: false, reason });
    switch (cmd.type) {
      case 'adoptCalendarRules': return { ok: true };
      case 'connectionLost': {
        if (!s || s.id !== cmd.shiftId || w.phase === 'resting') return fail('noShift');
        const grace = c.network.reconnectGraceMs;
        if (!w.disconnection) {
          if (!Number.isSafeInteger(grace) || grace <= 0 || !Number.isSafeInteger(w.now + grace) || !this.shiftPauseTimers(grace, false)) return fail('configClock');
          w.disconnection = { shiftId: s.id, expiresAt: w.now + grace, timedOut: false };
          this.emit('connection_lost', { shiftId: s.id, expiresAt: w.disconnection.expiresAt });
        }
        w.staminaAnchorAt = w.now; w.staminaAnchorMs = w.staminaMs; w.active = false;
        return { ok: true };
      }
      case 'activity':
        if (cmd.active && !w.disconnection?.timedOut) delete w.disconnection;
        w.staminaAnchorAt = w.now; w.staminaAnchorMs = w.staminaMs; w.active = cmd.active;
        if (this.rulesVersion >= MENU_PAUSE_RULES && cmd.paused) w.paused = true;
        else delete w.paused;
        if (this.rulesVersion >= ABSENT_CALENDAR_RULES && cmd.active) this.ensureDailyQuests();
        if (this.rulesVersion >= ATTENDANCE_RULES && cmd.active) this.observeAttendance(true);
        return { ok: true };
      case 'startShift': {
        const c = openingConfig.values, changed = openingConfig.version !== this.config.version, previousVersion = this.config.version;
        if (w.phase !== 'resting') return fail('shiftRunning');
        if (changed && !c.locations.list.some(location => location.id === w.location)) return fail('configLocationMissing');
        if (c.shift.openRequiresFullStamina && w.staminaMs < this.config.values.shift.durationMs) return fail('restFirst');
        if (this.rulesVersion >= CONFIG_PIN_RULES && !Number.isSafeInteger(w.now + c.shift.durationMs)) return fail('configClock');
        const day = dayKey(w.now, openingConfig);
        if ((w.dayShifts[day] ?? 0) >= c.shift.dailyShiftCap.newbie) return fail('dailyShiftCap');
        if (this.rulesVersion === 1 && (w.dayEarned[day] ?? 0) >= c.shift.dailyEarnCapBase) return fail('dailyEarnCap');
        const onboarding = c.onboarding.enabled && w.completedShifts === 0;
        if (changed && onboarding && !w.tables.some(table => c.upgrades.table.levels[table.level - 1].capacity >= c.onboarding.firstShift.firstGroupSize)) return fail('configOnboardingTables');
        const scheduled = !(onboarding && c.onboarding.firstShift.rushDisabled);
        const plan = this.rulesVersion >= RUSH_SCHEDULE_RULES && scheduled ? planRushes(openingConfig, w.location, this.id('shift', false), day, w.now) : null;
        if (this.rulesVersion >= RUSH_SCHEDULE_RULES && scheduled && !plan) return fail('rushScheduleUnavailable');
        if (changed) {
          w.staminaMs = Math.round(w.staminaMs / this.config.values.shift.durationMs * c.shift.durationMs);
          w.staminaAnchorAt = w.now; w.staminaAnchorMs = w.staminaMs;
          this.currentConfig = openingConfig;
          for (const table of w.tables) table.capacity = c.upgrades.table.levels[table.level - 1].capacity;
        }
        const weather = weighted(w, WEATHER.map(k => [k, c.weather[k].weight]));
        const rushes: NonNullable<World['shift']>['rushes'] = plan?.rushes ?? [];
        if (this.rulesVersion < RUSH_SCHEDULE_RULES && scheduled) {
          const spacing = (c.shift.durationMs - c.rush.schedule.noRushFirstMs) / (c.rush.schedule.perShift + 1);
          for (let i = 0; i < c.rush.schedule.perShift; i++) {
            const kind: Rush = i % 2 ? 'heavy' : 'light';
            const start = w.now + c.rush.schedule.noRushFirstMs + Math.round(spacing * (i + 1));
            rushes.push({ kind, start, end: Math.min(w.now + c.shift.durationMs, start + c.rush[kind].durationMs) });
          }
        }
        const rested = c.shift.wellRested;
        const wellRested = this.rulesVersion >= 3 && w.now - w.restStartedAt > rested.requiresRestHours * 3600000 && (!rested.oncePerDay || !w.wellRestedDays[day]); // config-exempt: hours to milliseconds
        w.shift = { id: this.id('shift'), startedAt: w.now, pausedMs: 0, endsAt: w.now + c.shift.durationMs, closedAt: null, configVersion: this.config.version, weather, rush: 'none', rushes, nextSpawnAt: w.now + Math.round(onboarding ? c.onboarding.firstShift.guaranteedFirstGroupWithinMs - c.runtime.tableSeatingMs : c.spawn.baseMs * c.spawn.warmupMult), firstGroup: true, onboarding, stats: emptyStats(), wellRestedUntil: wellRested ? w.now + rested.durationMs : null };
        if (plan) w.shift.rushScheduleSeed = plan.seed;
        w.phase = 'open'; w.lastServedAt = null; w.lostStreak = 0;
        if (changed) this.emit('config_pinned', { shiftId: w.shift.id, previousVersion, configVersion: this.config.version });
        this.startMenu(true);
        if (this.rulesVersion >= QUEST_RULES) this.ensureDailyQuests(true);
        if (this.rulesVersion >= ATTENDANCE_RULES) this.observeAttendance(true);
        this.emit('shift_opened', { shiftId: w.shift.id }); this.emit('weather_rolled', { weather });
        if (plan) for (const [slot, r] of rushes.entries()) this.emit('rush_scheduled', { shiftId: w.shift.id, slot, seed: plan.seed, kind: r.kind, startsAt: r.start, duration: r.end - r.start });
        if (wellRested) { w.wellRestedDays[day] = true; this.emit('well_rested_started', { shiftId: w.shift.id, day, until: w.shift.wellRestedUntil, mult: rested.mult }); }
        return { ok: true };
      }
      case 'endShift':
        if (w.phase !== 'open') return fail('noShift');
        w.phase = 'closing'; this.emit('shift_closing'); return { ok: true };
      case 'kickAll':
        if (w.phase === 'resting' || !c.shift.kickAllAllowed) return fail('noShift');
        if (w.delivery) return fail('deliveryPending');
        if (this.rulesVersion >= 4) {
          if (cmd.shiftId !== s?.id) return fail('shiftChanged');
          const quote = kickAllQuote(w, this.config);
          if (cmd.maxCost === undefined || quote.cost > cmd.maxCost) return fail('closeCostChanged');
          if (!quote.ok) return fail('notEnoughCoins');
          this.spend(quote.cost);
          if (w.phase === 'open') this.emit('shift_closing');
          w.phase = 'closing';
          for (const guest of quote.guests) this.emit('customer_dismissed', guest);
          for (const table of w.tables) if (currentGuests(table).length) {
            if (table.order && ['pending', 'grace'].includes(table.order.state)) {
              table.order.state = 'cancelled';
              this.waste(table, 'cancelled');
            }
            this.clean(table);
          }
          w.queue = [];
          this.emit('guests_dismissed', { shiftId: s!.id, cost: quote.cost, count: quote.guests.length });
          return { ok: true, amount: quote.cost };
        }
        w.phase = 'closing';
        for (const t of w.tables) {
          if (t.order && t.group && (this.rulesVersion === 1 || ['pending', 'grace'].includes(t.order.state))) this.lose(t);
          else if (t.group && t.state !== 'cleaning') this.clean(t);
        }
        w.queue = []; return { ok: true };
      case 'serve': {
        const t = w.tables.find(t => t.id === cmd.tableId);
        if (!t || !t.order || t.order.id !== cmd.orderId) return fail('orderGone');
        const o = t.order;
        if (o.state === 'expired') return { ok: false, reason: 'orderExpired', outcome: 'expired' };
        if (!s || w.phase === 'resting' || !['pending', 'grace'].includes(o.state)) return fail('orderGone');
        if (!o.items.every(i => i.state === 'ready')) return fail('orderNotReady');
        if (this.serveCoolingDown()) return fail('serveCooldown');
        let amount = 0, anyStale = false, anyTip = false, anyEarly = false;
        const grace = o.state === 'grace';
        const values = t.group!.customers.map(customer => {
          const value = customerValue(w, this.config, o, customer);
          const nominalBonus = this.rulesVersion >= 3 ? wellRestedBonus(w, this.config, value.payment, value.tip) : 0;
          return { customer, value, nominalBonus };
        });
        for (const { customer, value, nominalBonus } of values) {
          const baseCredit = credit(w, this.config, value.payment, 'servePayment') + credit(w, this.config, value.tip, 'serveTip');
          const bonus = nominalBonus ? credit(w, this.config, nominalBonus, 'servePayment') : 0;
          const credited = baseCredit + bonus;
          const rep = value.stale ? c.reputation.staleGlass : value.tip > 0 ? c.reputation.serveWithTip : c.reputation.serveNoTip;
          this.changeRep(rep); amount += credited; anyStale ||= value.stale; anyTip ||= value.tip > 0;
          anyEarly ||= value.ratio >= c.tip.patienceThreshold;
          s.stats.payment += value.payment; s.stats.tip += value.tip; s.stats.credited += credited; s.stats.served++;
          s.stats.wellRestedBonus += bonus;
          w.serves.push({ t: w.now, customerId: customer.id, customerType: customer.type, orderId: o.id, dishes: value.dishes, payment: value.payment, tip: value.tip, credited, hadMoi: value.dishes.some(d => d !== 'bia'), stale: value.stale, patienceRatio: value.ratio, ...(this.rulesVersion >= 3 ? { wellRestedBonus: bonus } : {}) });
          this.emit('customer_served', { customerId: customer.id, type: customer.type, payment: value.payment, tip: value.tip, stale: value.stale });
          if (nominalBonus) this.emit('well_rested_bonus', { customerId: customer.id, orderId: o.id, nominal: nominalBonus, credited: bonus });
        }
        const outcome = anyStale ? 'stale' : grace ? 'grace' : (this.rulesVersion === 1 ? anyTip : anyEarly) ? 'early' : 'late';
        o.state = 'served'; o.items.forEach(i => { i.state = 'served'; }); t.roundsServed++;
        t.state = 'consuming'; t.until = w.now + Math.round(Math.max(...t.group!.customers.map(x => x.enjoyMs)));
        w.lastServedAt = w.now; w.lostStreak = 0;
        this.emit('order_served', { tableId: t.id, orderId: o.id, outcome, amount, tipped: anyTip }); this.emit('coin_gain', { amount });
        return { ok: true, outcome, amount };
      }
      case 'serveDelivery': {
        const q = deliveryQuote(w, this.config);
        if (!s || w.phase === 'resting' || !q || q.order.id !== cmd.deliveryId || q.remainingMs === 0) return fail('deliveryGone');
        if (!q.ready) return fail('deliveryStock');
        if (this.serveCoolingDown()) return fail('serveCooldown');
        if (!q.safe) return fail('rewardOverflow');
        for (const line of q.lines) w.inventory[line.dish] -= line.quantity;
        const net = credit(w, this.config, q.net, 'shipperNet'), bonus = credit(w, this.config, q.bonus, 'shipperNet'), amount = net + bonus;
        s.stats.deliveryCompleted = (s.stats.deliveryCompleted ?? 0) + 1; s.stats.deliveryNet = (s.stats.deliveryNet ?? 0) + q.net; s.stats.deliveryBonus = (s.stats.deliveryBonus ?? 0) + bonus; s.stats.wellRestedBonus += bonus; s.stats.credited += amount;
        this.changeRep(c.reputation.serveNoTip); w.lastServedAt = w.now;
        this.emit('shipper_completed', { deliveryId: q.order.id, gross: q.gross, net: q.net, credited: amount, bonus, onTime: true });
        this.emit('coin_gain', { amount }); w.delivery = null;
        return { ok: true, amount };
      }
      case 'restock': {
        const q = restockQuote(w, this.config, cmd.dish, cmd.mode);
        if (!q.ok) return fail(dishUnlocked(w, this.config, cmd.dish) ? 'stockOrCoins' : 'dishLocked');
        this.spend(q.cost); w.inventory[cmd.dish] += q.quantity;
        this.emit('restocked', { dish: cmd.dish, quantity: q.quantity, cost: q.cost }); return { ok: true, amount: q.cost };
      }
      case 'upgrade': {
        const legacy = this.rulesVersion < LIVE_UPGRADE_RULES;
        const q = upgradeQuote(w, this.config, cmd.kind, legacy && c.upgrades.phase1UpgradesOutsideShiftOnly);
        if (!q.ok || q.cost === null) return fail(legacy ? w.phase !== 'resting' ? 'outsideShiftOnly' : 'upgradeUnavailable' : q.reason!);
        this.spend(q.cost); w.equipment[cmd.kind] = q.next;
        this.emit('upgrade_bought', { kind: cmd.kind, level: q.next, cost: q.cost }); return { ok: true, amount: q.cost };
      }
      case 'claimLifePath': {
        const q = lifePathRewardQuote(w, this.config, cmd.level);
        if (!q) return fail('rewardUnavailable');
        if (!q.safe) return fail('rewardOverflow');
        credit(w, this.config, q.coin, 'quest'); addStock(w, this.config, q.stock);
        w.badgeShards += q.badgeShards; w.cosmeticTokens += q.cosmeticTokens; w.claimedLifePaths.push(cmd.level);
        this.emit('life_path_reward_claimed', { level: c.lifePath[cmd.level].id, coin: q.coin, overflow: q.overflow, badgeShards: q.badgeShards, cosmeticTokens: q.cosmeticTokens, ...Object.fromEntries(DISHES.map(d => [`stock_${d}`, q.added[d]])) });
        return { ok: true, amount: q.amount };
      }
      case 'buyUnlock': {
        const q = unlockQuote(w, this.config, cmd.item);
        if (q.owned) return fail('unlockOwned');
        if (!q.requirements.every(r => r.met)) {
          const level = q.requirements.find(r => r.kind === 'level')?.need;
          this.emit('life_path_gate_blocked', { feature: cmd.item, requiredLevel: level == null ? null : c.lifePath[level].id });
          return fail('featureLocked');
        }
        if (!q.ok) return fail('notEnoughCoins');
        this.spend(q.cost); w.unlocks.push(cmd.item);
        this.emit('unlock_bought', { item: cmd.item, cost: q.cost }); return { ok: true, amount: q.cost };
      }
      case 'claimAttendance': {
        const q = attendanceRewardQuote(w, this.config, cmd.day);
        if (q.reason) return fail(q.reason);
        this.observeAttendance(true);
        this.changeRep(q.reputation);
        w.attendance!.lastClaimDateKey = cmd.day; w.attendance!.claimedDays.push(q.track.cycleDay);
        this.emit('attendance_claimed', { day: cmd.day, cycleDay: q.track.cycleDay, reputation: q.reputation });
        return { ok: true, amount: q.reputation };
      }
      case 'claimQuest': case 'claimDailyBonus': {
        const q = questRewardQuote(w, this.config, cmd.day, cmd.type === 'claimQuest' ? cmd.questId : null);
        if (q.reason) return fail(q.reason);
        if (q.coin) credit(w, this.config, q.coin, 'quest');
        if (q.reputation) this.changeRep(q.reputation);
        if (q.flyers) { w.flyers = (w.flyers ?? 0) + q.flyers; if (!w.unlocks.includes('flyer')) w.unlocks.push('flyer'); }
        w.badgeShards += q.shards;
        if (q.row) q.row.claimed = true; else w.daily!.bonusClaimed = true;
        this.emit(q.row ? 'quest_claimed' : 'daily_bonus_claimed', { day: cmd.day, questId: q.row?.id ?? null, coin: q.coin, reputation: q.reputation, flyers: q.flyers, badgeShards: q.shards });
        return { ok: true, amount: q.coin };
      }
      case 'buyFlyer': {
        const q = flyerQuote(w, this.config);
        if (q.buyReason) return fail(q.buyReason);
        const reputationBefore = w.reputation;
        this.changeRep(-q.cost); w.flyers = q.stock + 1;
        if (!w.unlocks.includes('flyer')) w.unlocks.push('flyer');
        this.emit('flyer_bought', { cost: q.cost, stock: w.flyers, reputationBefore, reputationAfter: w.reputation });
        return { ok: true, amount: q.cost };
      }
      case 'activateFlyer': {
        if (cmd.shiftId !== s?.id) return fail('shiftChanged');
        const q = flyerQuote(w, this.config);
        if (q.useReason) return fail(q.useReason);
        w.flyers = q.stock - 1; s!.flyersUsed = q.used + 1;
        s!.flyer = { start: w.now, end: w.now + c.unlocks.flyer.campaignMs, eventStart: w.events.length };
        this.emit('flyer_started', { shiftId: s!.id, until: s!.flyer.end, stock: w.flyers, used: s!.flyersUsed });
        return { ok: true };
      }
      case 'installSignboard': case 'setSignboard': {
        const q = signboardQuote(w, this.config, cmd.type === 'installSignboard' ? null : cmd.style);
        if (!q.ok) return fail(q.reason!);
        const previousStyle = w.signStyle ?? null;
        if (q.cost) this.spend(q.cost);
        if (cmd.type === 'installSignboard') w.unlocks.push('signboard');
        else if (!q.owned) w.unlocks.push(`signboard:${q.target}`);
        w.signStyle = q.target;
        this.emit(cmd.type === 'installSignboard' ? 'signboard_installed' : q.owned ? 'signboard_equipped' : 'signboard_bought', { style: q.target, previousStyle, cost: q.cost, requiredRep: q.requiredRep });
        return { ok: true, amount: q.cost };
      }
      case 'upgradeDog': {
        if (cmd.level !== w.dogLevel + 1) return fail('dogLevelChanged');
        const q = dogUpgradeQuote(w, this.config);
        if (!q.next || q.cost === null) return fail('maxLevel');
        if (!q.ok) return fail(w.coins < q.cost ? 'notEnoughCoins' : 'dogMaterials');
        this.spend(q.cost);
        for (const m of q.materials) w.inventory[m.dish] -= m.quantity;
        const fromLevel = w.dogLevel; w.dogLevel = q.next.level;
        this.emit(fromLevel === 0 ? 'dog_bought' : 'dog_upgraded', {
          fromLevel, toLevel: w.dogLevel, cost: q.cost,
          ...Object.fromEntries(q.materials.map(m => [`material_${m.dish}`, m.quantity])),
        });
        return { ok: true, amount: q.cost };
      }
      case 'upgradeTable': {
        if (this.rulesVersion < LIVE_UPGRADE_RULES && w.phase !== 'resting' && c.upgrades.phase1UpgradesOutsideShiftOnly) return fail('outsideShiftOnly');
        const t = w.tables.find(t => t.id === cmd.tableId);
        if (!t || t.state !== 'empty') return fail('tableBusy');
        const level = c.upgrades.table.levels[t.level];
        if (!level) return fail('maxLevel');
        if (level.requiredBadge && !w.badges.includes(level.requiredBadge)) return fail('badgeRequired');
        if (level.repBase && w.reputation < level.repBase[0]) return fail('reputationRequired');
        if (w.coins < level.priceBase) return fail('notEnoughCoins');
        this.spend(level.priceBase); t.level = level.level; t.capacity = level.capacity;
        this.emit('table_upgraded', { tableId: t.id, level: t.level }); return { ok: true, amount: level.priceBase };
      }
      case 'buyTable': {
        if (this.rulesVersion < LIVE_UPGRADE_RULES && w.phase !== 'resting' && c.upgrades.phase1UpgradesOutsideShiftOnly) return fail('outsideShiftOnly');
        if (w.tables.length >= c.upgrades.table.maxTables) return fail('maxTables');
        const seats = w.tables.reduce((sum, t) => sum + t.capacity, 0);
        const capacity = c.upgrades.table.levels[c.runtime.initialTableLevel - 1].capacity;
        const prices = c.upgrades.extraSeatPriceBase as Record<string, number>;
        let cost = 0;
        for (let i = 1; i <= capacity; i++) { const price = prices[String(seats + i)]; if (price === undefined) return fail('seatPriceUnconfigured'); cost += price; }
        if (w.coins < cost) return fail('notEnoughCoins');
        this.spend(cost); w.tables.push(this.newTable()); this.emit('table_bought', { cost }); return { ok: true, amount: cost };
      }
      case 'emergencyPack':
        if (!DISHES.filter(d => dishUnlocked(w, this.config, d)).every(d => w.inventory[d] === 0)) return fail('stockRemaining');
        addStock(w, this.config, c.crates.small); this.emit('emergency_pack_claimed'); return { ok: true };
    }
  }
}

/** Runtime validation for local imports and HTTP. Reject unknown command variants. */
export function validEnvelope(input: unknown): input is Envelope {
  return validReplayEnvelope(input) && input.command.type !== 'connectionLost' && input.command.type !== 'adoptCalendarRules' && !input.idempotencyKey.startsWith('system:');
}
/** Historical logs may contain reserved keys; only the public ingress forbids them. */
export function validReplayEnvelope(input: unknown): input is Envelope<Command | SystemCommand> {
  if (!input || typeof input !== 'object') return false;
  const e = input as Envelope<Command | SystemCommand>;
  if (typeof e.idempotencyKey !== 'string' || !e.idempotencyKey || e.idempotencyKey.length > 128 || !Number.isSafeInteger(e.at) || e.at < 0 || !e.command || typeof e.command !== 'object') return false; // config-exempt: protocol key length
  const c = e.command;
  switch (c.type) {
    case 'adoptCalendarRules': return new RegExp(`^system:calendar:${ABSENT_CALENDAR_RULES}(?::[1-9][0-9]*)?$`).test(e.idempotencyKey);
    case 'connectionLost': return typeof c.shiftId === 'string' && c.shiftId.length > 0 && (c.lossId === undefined || typeof c.lossId === 'string' && c.lossId.length > 0) && e.idempotencyKey === `system:connectionLost:${c.shiftId}:${c.lossId ?? e.at}`;
    case 'startShift': case 'endShift': case 'buyTable': case 'emergencyPack': case 'installSignboard': case 'buyFlyer': return true;
    case 'claimQuest': return typeof c.day === 'string' && typeof c.questId === 'string' && c.questId.length > 0;
    case 'claimAttendance': case 'claimDailyBonus': return typeof c.day === 'string';
    case 'activateFlyer': return typeof c.shiftId === 'string' && c.shiftId.length > 0;
    case 'kickAll': return (c.shiftId === undefined || typeof c.shiftId === 'string') && (c.maxCost === undefined || Number.isSafeInteger(c.maxCost) && c.maxCost >= 0);
    case 'activity': return typeof c.active === 'boolean' && (c.paused === undefined || typeof c.paused === 'boolean') && (!c.paused || c.active);
    case 'serve': return typeof c.tableId === 'string' && typeof c.orderId === 'string';
    case 'serveDelivery': return typeof c.deliveryId === 'string';
    case 'upgradeTable': return typeof c.tableId === 'string';
    case 'claimLifePath': return Number.isSafeInteger(c.level) && c.level > 0;
    case 'buyUnlock': return BUSINESS_UNLOCKS.includes(c.item);
    case 'setSignboard': return SIGN_STYLES.includes(c.style);
    case 'upgradeDog': return Number.isSafeInteger(c.level) && c.level > 0;
    case 'restock': return DISHES.includes(c.dish) && ['bulk', 'full', 'one'].includes(c.mode);
    case 'upgrade': return EQUIPMENT.includes(c.kind);
    default: return false;
  }
}
