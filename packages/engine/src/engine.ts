import { config as defaultConfig, DISHES, EQUIPMENT, WEATHER, type Config, type SeatedType, type Rush } from './config';
import { integer, random, weighted } from './rng';
import { addStock, credit, customerValue, dayKey, dishUnlocked, freshnessMs, queueSlots, restockQuote, rushConfig, upgradeQuote } from './rules';
import type { Command, Customer, Envelope, Group, Item, LoggedCommand, Order, Result, Stats, Table, World } from './types';

const emptyStats = (): Stats => ({ arrived: 0, served: 0, lost: 0, rejected: 0, orders: 0, payment: 0, tip: 0, credited: 0, penalty: 0, spent: 0, rep: 0 });

/** No wall clock, IO or renderer: only config, seed, explicit time and commands. */
export class Game {
  readonly world: World;
  readonly log: LoggedCommand[] = [];
  private readonly results = new Map<string, LoggedCommand>();
  constructor(readonly config: Config = defaultConfig, readonly seed = 1, readonly createdAt = 0, readonly playerId = 'guest') {
    if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(createdAt) || createdAt < 0) throw Error('game:invalid-origin');
    const c = config.values;
    this.world = {
      now: createdAt, rng: seed >>> 0, nextId: 0, playerId, phase: 'resting', coins: c.shift.startingCoinsBase,
      reputation: 0, seasonEarned: 0, lifetimeEarned: 0, staminaMs: c.shift.durationMs,
      staminaAnchorMs: c.shift.durationMs, staminaAnchorAt: createdAt,
      completedShifts: 0, active: true, lastServedAt: null, dayEarned: {}, dayShifts: {},
      inventory: Object.fromEntries(DISHES.map(d => [d, (c.inventory.startingStock as Record<string, number[]>)[d]?.[0] ?? 0])) as World['inventory'],
      equipment: Object.fromEntries(EQUIPMENT.map(k => [k, k === 'kitchen' ? c.runtime.initialKitchenLevel : c.runtime.initialEquipmentLevel])) as World['equipment'],
      tables: [], glasses: [], queue: [], shift: null, serves: [], events: [], lostStreak: 0,
      location: c.locations.fallback, lifePath: 0, unlocks: [], badges: [],
    };
    for (let i = 0; i < c.upgrades.table.startingTables; i++) this.world.tables.push(this.newTable());
    for (let i = 0; i < c.glasses.start; i++) this.world.glasses.push({ id: this.id('glass'), state: 'clean', itemId: null, readyAt: null, staleEmitted: false });
  }
  private id(kind: string) { return `${kind}-${++this.world.nextId}`; }
  private emit(type: string, data: World['events'][number]['data'] = {}) {
    this.world.events.push({ id: this.id('event'), type, at: this.world.now, configVersion: this.config.version, data });
  }
  private newTable(): Table {
    const level = this.config.values.runtime.initialTableLevel;
    return { id: this.id('table'), level, capacity: this.config.values.upgrades.table.levels[level - 1].capacity, state: 'empty', group: null, order: null, until: null, roundsServed: 0 };
  }
  private items(): Item[] { return this.world.tables.flatMap(t => t.order?.items ?? []); }
  private nextDue(): number {
    const w = this.world, c = this.config.values, times: number[] = [];
    if (w.phase === 'open' && w.shift) {
      times.push(w.shift.endsAt, w.shift.nextSpawnAt);
      for (const r of w.shift.rushes) times.push(r.start, r.end);
    }
    for (const t of w.tables) {
      if (t.until !== null) times.push(t.until);
      if (t.order?.state === 'pending') times.push(t.order.placedAt + t.order.patienceMs);
      if (t.order?.state === 'grace') times.push(t.order.placedAt + t.order.patienceMs + c.patience.graceMs);
    }
    for (const q of w.queue) times.push(q.arrivedAt + Math.min(...q.customers.map(x => x.patienceMs)) + c.patience.graceMs);
    for (const item of this.items()) {
      if (item.state === 'preparing' && item.readyAt !== null) times.push(item.readyAt);
      if (item.state === 'ready' && item.glassId) {
        const g = w.glasses.find(x => x.id === item.glassId)!;
        if (!g.staleEmitted && g.readyAt !== null) times.push(g.readyAt + freshnessMs(w, this.config));
      }
    }
    for (const g of w.glasses) if (g.state === 'washing' && g.readyAt !== null) times.push(g.readyAt);
    return Math.min(...times.filter(t => t > w.now));
  }
  advance(now: number): void {
    const w = this.world, c = this.config.values;
    if (!Number.isSafeInteger(now) || now < w.now) throw Error('clock:non-monotonic');
    while (w.now < now) {
      const next = Math.min(now, this.nextDue());
      if (w.phase === 'open' && w.shift) w.staminaMs = Math.max(0, w.shift.endsAt - next);
      else if (w.phase === 'resting' && w.active) w.staminaMs = Math.min(c.shift.durationMs, w.staminaAnchorMs + (next - w.staminaAnchorAt) * c.shift.regenRate);
      w.now = next;
      this.processDue();
    }
  }
  private processDue(): void {
    const w = this.world, c = this.config.values, s = w.shift;
    if (w.phase === 'open' && s) {
      if (w.now >= s.endsAt) { w.phase = 'closing'; this.emit('shift_closing'); }
      const rush = s.rushes.find(r => w.now >= r.start && w.now < r.end)?.kind ?? 'none';
      if (rush !== s.rush) { if (s.rush !== 'none') this.emit('rush_ended', { kind: s.rush }); s.rush = rush; if (rush !== 'none') this.emit('rush_started', { kind: rush }); }
    }
    for (const g of w.glasses) {
      if (g.state === 'washing' && g.readyAt !== null && w.now >= g.readyAt) {
        g.state = 'clean'; g.readyAt = null; g.itemId = null; g.staleEmitted = false;
        this.emit('glass_washed', { glassId: g.id });
      }
    }
    for (const item of this.items()) {
      if (item.state === 'preparing' && item.readyAt !== null && w.now >= item.readyAt) {
        item.state = 'ready'; this.emit(item.dish === 'bia' ? 'beer_poured' : 'dish_ready', { itemId: item.id });
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
      if (w.now >= group.arrivedAt + Math.min(...group.customers.map(x => x.patienceMs)) + c.patience.graceMs) {
        w.queue = w.queue.filter(x => x.id !== group.id);
        if (s) s.stats.lost += group.customers.length;
        this.changeRep(c.reputation.customerLeft * group.customers.length);
        w.lostStreak += 1;
        this.emit('customer_left', { groupId: group.id, reason: 'queue', count: group.customers.length, penalty: 0 });
      }
    }
    this.seatQueue();
    if (w.phase === 'open' && s && w.now >= s.nextSpawnAt) this.spawn();
    this.prepare();
    this.wash();
    if (w.phase === 'closing' && w.queue.length === 0 && w.tables.every(t => ['empty', 'cleaning', 'broken'].includes(t.state))) {
      w.phase = 'resting'; w.completedShifts++;
      w.staminaAnchorMs = w.staminaMs; w.staminaAnchorAt = w.now;
      const key = dayKey(w.now, this.config);
      w.dayShifts[key] = (w.dayShifts[key] ?? 0) + 1;
      if (s) s.closedAt = w.now;
      this.emit('shift_closed', { shiftId: s?.id ?? '', credited: s?.stats.credited ?? 0 });
    }
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
    w.coins -= charged; s.stats.penalty += charged; s.stats.lost += t.group.customers.length;
    this.changeRep(this.config.values.reputation.customerLeft * t.group.customers.length);
    order.state = 'expired';
    order.items.forEach(i => { if (i.state !== 'pending') i.state = 'wasted'; });
    w.lostStreak++;
    this.emit('order_expired', { tableId: t.id, orderId: order.id, penalty: charged, count: t.group.customers.length });
    this.clean(t);
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
        return [key, allowed ? value.weight * weatherMult * rushMult : 0];
      }));
      if (type === 'vip') vipCount++;
      const profile = c.customerTypes[type];
      return { id: this.id('customer'), type, patienceMs: Math.round(c.patience.thuongMs * profile.patienceMult * c.weather[s.weather].patienceMult), enjoyMs: integer(w, c.enjoy.minMs, c.enjoy.maxMs) * profile.enjoyMult };
    });
    let rounds = 1;
    if (customers.some(x => x.type === 'ngoily')) rounds = integer(w, ...c.rounds.ngoily as [number, number]);
    else if (!first && !customers.some(x => x.type === 'voi') && random(w) < c.demandMix.pSecondRound) rounds = c.rounds.thuong[1];
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
    const interval = Math.max(c.spawn.baseMs * c.weather[s.weather].spawnIntervalMult * rush.spawnIntervalMult, rush.floorMs);
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
  }
  private prepare(): void {
    const w = this.world, c = this.config.values;
    const items = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state)).flatMap(t => t.order!.items);
    let pouring = items.filter(i => i.state === 'preparing' && i.dish === 'bia').length;
    let cooking = items.filter(i => i.state === 'preparing' && c.menu[i.dish].station === 'kitchen').length;
    for (const item of items) {
      if (item.state !== 'pending' || w.inventory[item.dish] <= 0 || !dishUnlocked(w, this.config, item.dish)) continue;
      const menu = c.menu[item.dish];
      let duration = menu.prepMs;
      if (menu.needsGlass) {
        if (pouring >= c.upgrades.keg.pourSlots[w.equipment.keg - 1]) continue;
        const glass = w.glasses.find(g => g.state === 'clean');
        if (!glass) continue;
        duration = c.upgrades.keg.pourMs[w.equipment.keg - 1];
        glass.state = 'in_use'; glass.itemId = item.id; glass.readyAt = w.now + duration; glass.staleEmitted = false;
        item.glassId = glass.id; pouring++;
      } else if (menu.station === 'kitchen') {
        if (cooking >= c.upgrades.kitchen.slots[w.equipment.kitchen]) continue;
        const mult = c.upgrades.kitchen.prepMult[w.equipment.kitchen];
        if (mult === null) continue;
        duration = Math.round(duration * mult); cooking++;
      }
      w.inventory[item.dish]--; item.state = duration > 0 ? 'preparing' : 'ready'; item.readyAt = w.now + duration;
      this.emit(menu.needsGlass ? 'beer_pouring' : 'dish_preparing', { itemId: item.id, dish: item.dish });
    }
    for (const t of w.tables) if (t.order && ['pending', 'grace'].includes(t.order.state) && !t.order.readyEmitted && t.order.items.every(i => i.state === 'ready')) {
      t.order.readyEmitted = true; this.emit('order_ready', { tableId: t.id, orderId: t.order.id });
    }
  }
  private wash(): void {
    const w = this.world, c = this.config.values;
    let slots = c.upgrades.washer.slots[w.equipment.washer - 1] - w.glasses.filter(g => g.state === 'washing').length;
    for (const glass of w.glasses) if (slots > 0 && glass.state === 'dirty') {
      glass.state = 'washing'; glass.readyAt = w.now + c.upgrades.washer.washMs[w.equipment.washer - 1]; slots--;
      this.emit('glass_washing', { glassId: glass.id });
    }
  }
  command(envelope: Envelope): Result {
    if (!validEnvelope(envelope)) return { ok: false, reason: 'invalidCommand' };
    const previous = this.results.get(envelope.idempotencyKey);
    if (previous) return JSON.stringify(previous.command) === JSON.stringify(envelope.command) ? { ...previous.result } : { ok: false, reason: 'idempotencyConflict' };
    if (envelope.at < this.world.now) return { ok: false, reason: 'staleCommand' };
    this.advance(envelope.at);
    const result = this.execute(envelope.command);
    const entry = structuredClone({ ...envelope, result });
    this.log.push(entry); this.results.set(entry.idempotencyKey, entry);
    this.processDue();
    return { ...result };
  }
  private execute(cmd: Command): Result {
    const w = this.world, c = this.config.values, s = w.shift;
    const fail = (reason: string): Result => ({ ok: false, reason });
    switch (cmd.type) {
      case 'activity':
        w.staminaAnchorAt = w.now; w.staminaAnchorMs = w.staminaMs; w.active = cmd.active;
        return { ok: true };
      case 'startShift': {
        if (w.phase !== 'resting') return fail('shiftRunning');
        if (c.shift.openRequiresFullStamina && w.staminaMs < c.shift.durationMs) return fail('restFirst');
        const day = dayKey(w.now, this.config);
        if ((w.dayShifts[day] ?? 0) >= c.shift.dailyShiftCap.newbie) return fail('dailyShiftCap');
        if ((w.dayEarned[day] ?? 0) >= c.shift.dailyEarnCapBase) return fail('dailyEarnCap');
        const onboarding = c.onboarding.enabled && w.completedShifts === 0;
        const weather = weighted(w, WEATHER.map(k => [k, c.weather[k].weight]));
        const rushes: NonNullable<World['shift']>['rushes'] = [];
        if (!(onboarding && c.onboarding.firstShift.rushDisabled)) {
          const spacing = (c.shift.durationMs - c.rush.schedule.noRushFirstMs) / (c.rush.schedule.perShift + 1);
          for (let i = 0; i < c.rush.schedule.perShift; i++) {
            const kind: Rush = i % 2 ? 'heavy' : 'light';
            const start = w.now + c.rush.schedule.noRushFirstMs + Math.round(spacing * (i + 1));
            rushes.push({ kind, start, end: Math.min(w.now + c.shift.durationMs, start + c.rush[kind].durationMs) });
          }
        }
        w.shift = { id: this.id('shift'), startedAt: w.now, endsAt: w.now + c.shift.durationMs, closedAt: null, configVersion: this.config.version, weather, rush: 'none', rushes, nextSpawnAt: w.now + Math.round(onboarding ? c.onboarding.firstShift.guaranteedFirstGroupWithinMs - c.runtime.tableSeatingMs : c.spawn.baseMs * c.spawn.warmupMult), firstGroup: true, onboarding, stats: emptyStats() };
        w.phase = 'open'; w.lastServedAt = null; w.lostStreak = 0;
        this.emit('shift_opened', { shiftId: w.shift.id }); this.emit('weather_rolled', { weather });
        return { ok: true };
      }
      case 'endShift':
        if (w.phase !== 'open') return fail('noShift');
        w.phase = 'closing'; this.emit('shift_closing'); return { ok: true };
      case 'kickAll':
        if (w.phase === 'resting' || !c.shift.kickAllAllowed) return fail('noShift');
        w.phase = 'closing';
        for (const t of w.tables) if (t.order && t.group) this.lose(t); else if (t.group) this.clean(t);
        w.queue = []; return { ok: true };
      case 'serve': {
        const t = w.tables.find(t => t.id === cmd.tableId);
        if (!t || !t.order || t.order.id !== cmd.orderId) return fail('orderGone');
        const o = t.order;
        if (o.state === 'expired') return { ok: false, reason: 'orderExpired', outcome: 'expired' };
        if (!s || w.phase === 'resting' || !['pending', 'grace'].includes(o.state)) return fail('orderGone');
        if (!o.items.every(i => i.state === 'ready')) return fail('orderNotReady');
        if (w.lastServedAt !== null && w.now - w.lastServedAt < 1000 / c.spawn.playerServeCeilingPerSec) return fail('serveCooldown');
        let amount = 0, anyStale = false, anyTip = false;
        const grace = o.state === 'grace';
        for (const customer of t.group!.customers) {
          const value = customerValue(w, this.config, o, customer);
          const credited = credit(w, this.config, value.payment, 'servePayment') + credit(w, this.config, value.tip, 'serveTip');
          const rep = value.stale ? c.reputation.staleGlass : value.tip > 0 ? c.reputation.serveWithTip : c.reputation.serveNoTip;
          this.changeRep(rep); amount += credited; anyStale ||= value.stale; anyTip ||= value.tip > 0;
          s.stats.payment += value.payment; s.stats.tip += value.tip; s.stats.credited += credited; s.stats.served++;
          w.serves.push({ t: w.now, customerId: customer.id, customerType: customer.type, orderId: o.id, dishes: value.dishes, payment: value.payment, tip: value.tip, credited, hadMoi: value.dishes.some(d => d !== 'bia'), stale: value.stale, patienceRatio: value.ratio });
          this.emit('customer_served', { customerId: customer.id, type: customer.type, payment: value.payment, tip: value.tip, stale: value.stale });
        }
        const outcome = anyStale ? 'stale' : grace ? 'grace' : anyTip ? 'early' : 'late';
        o.state = 'served'; o.items.forEach(i => { i.state = 'served'; }); t.roundsServed++;
        t.state = 'consuming'; t.until = w.now + Math.round(Math.max(...t.group!.customers.map(x => x.enjoyMs)));
        w.lastServedAt = w.now; w.lostStreak = 0;
        this.emit('order_served', { tableId: t.id, orderId: o.id, outcome, amount }); this.emit('coin_gain', { amount });
        return { ok: true, outcome, amount };
      }
      case 'restock': {
        const q = restockQuote(w, this.config, cmd.dish, cmd.mode);
        if (!q.ok) return fail(dishUnlocked(w, this.config, cmd.dish) ? 'stockOrCoins' : 'dishLocked');
        this.spend(q.cost); w.inventory[cmd.dish] += q.quantity;
        this.emit('restocked', { dish: cmd.dish, quantity: q.quantity, cost: q.cost }); return { ok: true, amount: q.cost };
      }
      case 'upgrade': {
        const q = upgradeQuote(w, this.config, cmd.kind);
        if (!q.ok || q.cost === null) return fail(w.phase !== 'resting' ? 'outsideShiftOnly' : 'upgradeUnavailable');
        this.spend(q.cost); w.equipment[cmd.kind] = q.next;
        this.emit('upgrade_bought', { kind: cmd.kind, level: q.next, cost: q.cost }); return { ok: true, amount: q.cost };
      }
      case 'upgradeTable': {
        if (w.phase !== 'resting' && c.upgrades.phase1UpgradesOutsideShiftOnly) return fail('outsideShiftOnly');
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
        if (w.phase !== 'resting' && c.upgrades.phase1UpgradesOutsideShiftOnly) return fail('outsideShiftOnly');
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
  if (!input || typeof input !== 'object') return false;
  const e = input as Envelope;
  if (typeof e.idempotencyKey !== 'string' || !e.idempotencyKey || e.idempotencyKey.length > 128 || !Number.isSafeInteger(e.at) || e.at < 0 || !e.command || typeof e.command !== 'object') return false; // config-exempt: protocol key length
  const c = e.command;
  switch (c.type) {
    case 'startShift': case 'endShift': case 'kickAll': case 'buyTable': case 'emergencyPack': return true;
    case 'activity': return typeof c.active === 'boolean';
    case 'serve': return typeof c.tableId === 'string' && typeof c.orderId === 'string';
    case 'upgradeTable': return typeof c.tableId === 'string';
    case 'restock': return DISHES.includes(c.dish) && ['bulk', 'full', 'one'].includes(c.mode);
    case 'upgrade': return EQUIPMENT.includes(c.kind);
    default: return false;
  }
}
