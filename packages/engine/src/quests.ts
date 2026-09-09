import { seasonTier } from './seasons';
import { dailyTargetCurve, type Config } from './config';
import { integer, seededRng } from './rng';
import { dayKey } from './rules';
import type { Attendance, DailyQuest, DailyQuests, DomainEvent, World } from './types';

/** Calendar boundary from the configured VN day formatter; no wall-clock dependency. */
export function nextDayAt(now: number, c: Config) {
  const day = dayKey(now, c);
  let low = now, high = now + 86400000; // config-exempt: one calendar day in milliseconds (VN has no DST).
  while (high - low > 1) { const mid = low + Math.floor((high - low) / 2); if (dayKey(mid, c) === day) low = mid; else high = mid; }
  return high;
}
export function planDailyQuests(w: World, c: Config): DailyQuests {
  const day = dayKey(w.now, c), definition = c.values.quests.daily;
  const tier = seasonTier(w, c).index + 1;
  const seed = JSON.stringify([day, tier]), rng = seededRng(seed), curve = dailyTargetCurve(c.values);
  const factor = ((Math.min(curve.max, Math.max(curve.min, tier)) - curve.min) / curve.divisor) ** curve.exponent;
  const rows: DailyQuest[] = definition.buckets.map(bucket => {
    const keys = Object.keys(bucket.pool).sort(), kind = keys[integer(rng, 0, keys.length - 1)];
    const [base, max] = (bucket.pool as Record<string, number[] | undefined>)[kind]!;
    const target = Math.ceil((base + (max - base) * factor) * (kind === 'earn_coins_base' ? c.values.k.value : 1));
    return { id: `${day}:${bucket.id}:${kind}`, kind, bucket: bucket.id, target, progress: 0, coin: bucket.rewardCoinBase, reputation: bucket.rewardRepBase, claimed: false };
  });
  for (const row of definition.fixed) rows.push({ id: `${day}:${row.id}`, kind: row.id, bucket: row.id, target: row.target, progress: 0, coin: row.rewardCoinBase, reputation: row.rewardRepBase, claimed: false });
  return { day, tier, seed, expiresAt: nextDayAt(w.now, c), rows, bonusClaimed: false, recipients: [], lossFreeSince: w.active && w.phase !== 'resting' ? w.now : null, lossFreeServed: false, vipShift: null, vipServed: false, vipLost: false, rushSlot: null, rushShift: null, rushServed: false };
}
export function zeroLossWindow(c: Config) { return c.values.quests.daily.buckets.find(b => b.id === 'risk')!.zeroLossWindowMs!; }
/** One event observer owns all daily progress; duplicate departure mirrors never add counts. */
export function applyQuestEvent(w: World, c: Config, e: DomainEvent): DailyQuest[] {
  const daily = w.daily;
  if (!daily) return [];
  const changed: DailyQuest[] = [];
  const add = (kind: string, amount = 1) => {
    const row = daily.rows.find(r => r.kind === kind); if (!row || row.progress >= row.target || amount <= 0) return;
    row.progress = Math.min(row.target, row.progress + amount); changed.push(row);
  };
  const resetLoss = () => { daily.lossFreeSince = w.phase === 'resting' ? null : w.now; daily.lossFreeServed = false; };
  if (e.type === 'shift_opened') {
    daily.vipShift = String(e.data.shiftId); daily.vipServed = false; daily.vipLost = false; resetLoss();
  } else if (e.type === 'customer_served') {
    const serve = w.serves.at(-1);
    if (!serve || serve.customerId !== e.data.customerId) throw Error('quest:missing-serve');
    add('serve_customers'); add('serve_beer', serve.dishes.filter(d => d === 'bia').length); add('serve_moi', serve.dishes.filter(d => d !== 'bia').length);
    if (serve.tip > 0 && serve.patienceRatio >= c.values.tip.patienceThreshold && !serve.stale) add('perfect_tip');
    if (!serve.stale) add('no_stale_beer', serve.dishes.filter(d => d === 'bia').length);
    daily.lossFreeServed = true;
    if (serve.customerType === 'vip') daily.vipServed = true;
    if (daily.rushSlot !== null) daily.rushServed = true;
  } else if (e.type === 'order_served') { add('serve_tables'); add('earn_coins_base', Number(e.data.amount)); }
  else if (e.type === 'shipper_completed') add('earn_coins_base', Number(e.data.credited));
  else if (e.type === 'customer_left' || e.type === 'customer_dismissed') {
    resetLoss();
    const guest = w.tables.flatMap(t => t.group?.customers ?? []).concat(w.queue.flatMap(g => g.customers)).find(g => g.id === e.data.customerId);
    if (guest?.type === 'vip' || Number(e.data.vipCount) > 0) daily.vipLost = true;
  } else if (e.type === 'rush_started' && typeof e.data.slot === 'number') {
    daily.rushSlot = e.data.slot; daily.rushShift = String(e.data.shiftId); daily.rushServed = false;
  } else if (e.type === 'rush_ended' && e.data.slot === daily.rushSlot && e.data.shiftId === daily.rushShift) {
    const slot = w.shift?.rushes[daily.rushSlot!];
    if (slot && w.now >= slot.end && daily.rushServed) add('survive_rush');
    daily.rushSlot = null; daily.rushShift = null; daily.rushServed = false;
  } else if (e.type === 'shift_closed') {
    add('shift_3');
    if (daily.vipShift === e.data.shiftId && daily.vipServed && !daily.vipLost) add('no_lost_vip');
    daily.vipShift = null; daily.lossFreeSince = null; daily.lossFreeServed = false;
  } else if (e.type === 'gift_sent') {
    // Only the future trusted transfer producer emits this; no public progress/gift command exists.
    const recipient = e.data.recipientId, row = daily.rows.find(r => r.kind === 'gift_3');
    if (row && typeof recipient === 'string' && recipient && recipient !== w.playerId && daily.recipients.length < row.target && !daily.recipients.includes(recipient)) { daily.recipients.push(recipient); add('gift_3'); }
  }
  return changed;
}
export function questRewardQuote(w: World, c: Config, day: string, questId: string | null) {
  const daily = w.daily, row = daily?.rows.find(r => r.id === questId);
  let reason = !daily || daily.day !== day || w.now >= daily.expiresAt ? 'questExpired' : questId === null ? daily.bonusClaimed ? 'questClaimed' : daily.rows.some(r => r.progress < r.target) ? 'questIncomplete' : null : !row ? 'questGone' : row.claimed ? 'questClaimed' : row.progress < row.target ? 'questIncomplete' : null;
  const coin = questId === null ? 0 : row?.coin ?? 0, reputation = questId === null ? 0 : row?.reputation ?? 0;
  const flyers = questId === null ? c.values.quests.daily.bonusAll5.flyer : 0, shards = questId === null ? c.values.quests.daily.bonusAll5.badgeShard : 0;
  if (!reason && (!Number.isSafeInteger(w.coins + coin) || !reputationRewardFits(w, reputation) || w.coins < 0 || !Number.isSafeInteger(w.badgeShards + shards) || w.badgeShards < 0)) reason = 'rewardOverflow';
  if (!reason && flyers && (!Number.isSafeInteger(w.flyers ?? 0) || (w.flyers ?? 0) < 0 || (w.flyers ?? 0) + flyers > c.values.unlocks.flyer.stockCap)) reason = 'flyerStockFull';
  return { row, coin, reputation, flyers, shards, reason };
}

/** Shared preflight for the two reputation-reward claims; changeRep owns the mutation. */
function reputationRewardFits(w: World, amount: number) {
  return Number.isSafeInteger(amount) && amount >= 0 && Number.isSafeInteger(w.reputation + amount) && w.reputation >= 0 && (!w.shift || w.phase === 'resting' || Number.isSafeInteger(w.shift.stats.rep + amount));
}
/** Preview an observed day without mutating state or backfilling hidden dates. */
export function attendanceDay(w: World, c: Config): { track: Attendance; transition: string } {
  const day = dayKey(w.now, c), previous = w.attendance;
  if (previous?.lastActiveDateKey === day) return { track: previous, transition: 'same' };
  const missed = !!previous && dayKey(previous.expiresAt, c) !== day;
  const reset = !previous || missed && c.values.quests.loginMissResets;
  const cycleDay = reset ? 1 : previous.cycleDay % c.values.quests.loginTrackRepBase.length + 1;
  return { track: { cycleDay, lastActiveDateKey: day, lastClaimDateKey: previous?.lastClaimDateKey ?? null, expiresAt: nextDayAt(w.now, c), claimedDays: cycleDay === 1 ? [] : [...previous!.claimedDays] }, transition: !previous ? 'first' : reset ? 'reset' : cycleDay === 1 ? 'wrap' : 'next' };
}
export function attendanceRewardQuote(w: World, c: Config, day: string) {
  const { track } = attendanceDay(w, c), reputation = c.values.quests.loginTrackRepBase[track.cycleDay - 1];
  const reason = day !== track.lastActiveDateKey ? 'attendanceExpired' : !w.active ? 'attendanceInactive' : track.lastClaimDateKey === day ? 'attendanceClaimed' : !reputationRewardFits(w, reputation) ? 'rewardOverflow' : null;
  return { track, reputation, reason };
}
