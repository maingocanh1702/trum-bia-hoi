import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoalChip, say } from '../src/GoalChip';
import type { Goal } from '../src/goals';

// The chip and the cards of the Upgrades sheet write numbers one way: a whole number through `num`, a fraction through `decimal` (vi "1,25", en "1.25").
// Review round 1 of S4: the chip printed the raw number ("tip ×1.25" in Vietnamese) while the table card printed "Tip ×1,25".
const copy = (locale: 'vi' | 'en') => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
for (const locale of ['vi', 'en'] as const) test(`a goal effect writes a fraction with the ${locale} decimal separator and a whole number with its thousands separator`, () => {
  const strings = copy(locale), tag = locale === 'vi' ? 'vi-VN' : 'en-US';
  const t = (key: string, params: Record<string, string | number> = {}) => strings[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  const num = (n: number) => new Intl.NumberFormat(tag).format(Math.round(n)), decimal = (n: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(n);
  const one = (n: number) => say(t, { key: 'goal.fx.tip', params: { n } }, num, decimal);
  const point = locale === 'vi' ? ',' : '.';
  assert.equal(one(1.25), t('goal.fx.tip', { n: `1${point}25` }), 'the Lv4 table tip');
  assert.equal(one(1.2), t('goal.fx.tip', { n: `1${point}2` }), 'the QR tip');
  assert.equal(say(t, { key: 'goal.fx.seats', params: { n: 1200 } }, num, decimal), t('goal.fx.seats', { n: num(1200) }), 'a whole number keeps `num`');
  assert.equal(say(t, { key: 'goal.fx.tip', params: { n: 1.25 } }, num), t('goal.fx.tip', { n: '1.25' }), 'a caller without a decimal formatter keeps the raw number, as before');
});

// The chip itself passes the decimal formatter on: a table whose next level is the Lv4 tip bonus reads "tip ×1,25" in Vietnamese on the chip, as on the card.
for (const locale of ['vi', 'en'] as const) test(`the goal chip shows the Lv4 tip effect with the ${locale} decimal separator`, () => {
  const strings = copy(locale), tag = locale === 'vi' ? 'vi-VN' : 'en-US';
  const t = (key: string, params: Record<string, string | number> = {}) => strings[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  const num = (n: number) => new Intl.NumberFormat(tag).format(Math.round(n)), decimal = (n: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(n);
  const goal: Goal = { id: 'table:t1', lane: 'capacity', card: { kind: 'table', tableId: 't1' }, name: { key: 'goal.table', params: { n: 1 } }, effect: { key: 'goal.fx.tip', params: { n: 1.25 } },
    currency: 'coins', cost: 87500, eligible: true, busy: false };
  const html = renderToStaticMarkup(createElement(GoalChip, { goal, coins: 0, t, num, decimal, onOpen: () => {} }));
  assert.ok(html.includes(t('goal.fx.tip', { n: locale === 'vi' ? '1,25' : '1.25' })), html);
});
