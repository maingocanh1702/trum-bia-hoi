import { Icon } from './Icon';
import type { Copy, Goal } from './goals';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** A registry copy in the player's language: `keyed` params are i18n keys of their own (an equipment name), the rest are plain values. */
export function say(t: Translate, copy: Copy, num: (n: number) => string): string {
  const params = Object.fromEntries(Object.entries(copy.params ?? {}).map(([name, value]) => [name, typeof value === 'number' && Number.isInteger(value) ? num(value) : value]));
  for (const [name, key] of Object.entries(copy.keyed ?? {})) params[name] = t(key);
  return t(copy.key, params);
}

/** F27/P0 "Mục tiêu kế tiếp": name, effect (one number), price and what is still missing. A tap opens the Upgrades sheet at that item. */
export function GoalChip({ goal, coins, t, num, onOpen }: { goal: Goal; coins: number; t: Translate; num: (n: number) => string; onOpen: (goal: Goal) => void }) {
  const missing = Math.max(0, goal.cost! - coins), name = say(t, goal.name, num), effect = goal.effect ? say(t, goal.effect, num) : '';
  return <button className={`goal-chip${missing === 0 ? ' is-ready' : ''}`} data-goal-chip={goal.id} onClick={() => onOpen(goal)}>
    <span className="sr-only">{t('goal.title')}: </span><Icon name="upgrade" />
    <span className="goal-text"><strong>{effect ? `${name} · ${effect}` : name}</strong><small>{t(missing === 0 ? 'goal.ready' : 'goal.short', { cost: num(goal.cost!), missing: num(missing) })}</small></span>
  </button>;
}
