import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kickTableRule, type SeedConfig } from '../src/index';
import { simulateCareer } from './career';
import { patchedConfig, type Patch } from './balance-gates';

/**
 * Wave 3 acceptance (plan section 6 `fun-kick-table`, FEEDBACK II.3, brief B7): the kick bot (the protocol bot that also sends a lingering table home whenever a
 * group waits at the door and at least 40 s of the shift remain, policy.ts `kickLingering`) against the never-kick bot (the acceptance protocol itself), seeds 42
 * AND 99, 30 days each. The rule: the kick bot's 30-day income may exceed the never-kick bot's by at most 10 % and its reputation at the end must be >= 0; if the
 * income overshoots, raise `kickTable.feeRate` (`--set=kickTable.feeRate=0.75`) and run again, recording every attempt.
 * Income = what the career sim calls income (career.ts: `w.lifetimeEarned` gained each day: payments, tips and shipper net as service credits them, capped per
 * day by `shift.dailyEarnCapBase`). The gated number is that income NET of the kick fees (income minus the fees the kick bot paid; the never-kick bot pays none):
 * the founder's reading of the rule (owner call 1, 2026-10-22, with `feeRate` 0.5; DECISIONS `## 07 · owner calls 2026-10-22`). Wave 3 had gated the gross
 * income (before the fees) and sealed 1.5; gross stays printed as information. Neither is the number of the S5 30-day value gate: that gate reads the served
 * standard-order value (balance-gates.ts `m.standard.totalValue`, printed here as "value std"). Printed with the served value, k, the guests served and lost,
 * the kicks, and both bots' final reputation.
 *   node --import tsx packages/engine/sim/kick-table.ts [--seeds=42,99] [--days=30] [--set=kickTable.feeRate=0.5 ...] [--out=file.json]
 */
// config-exempt: the owner's acceptance of plan section 6 / FEEDBACK II.3 ("thu nhập 30 ngày ≤ +10 %, uy tín cuối ≥ 0"), not a gameplay limit.
export const KICK_INCOME_MAX_OVER_NEVER = 0.1, KICK_FINAL_REPUTATION_MIN = 0;

export interface KickRun {
  seed: number; bot: 'never' | 'kick'; income: number; net: number; kicks: number; kickGuests: number; kickCost: number; kickReputation: number;
  finalReputation: number; served: number; lost: number; standardK: number | null; standardValue: number; rawK: number | null; lifePath: number; commandHash: string;
}
export function kickRun(config: SeedConfig, seed: number, days: number, kick: boolean): KickRun {
  const { report } = simulateCareer({ days, seed, config, policy: { kick } });
  const income = report.rows.reduce((sum, row) => sum + row.income, 0), last = report.rows.at(-1)!;
  return { seed, bot: kick ? 'kick' : 'never', income, net: income - report.kicks.cost, kicks: report.kicks.count, kickGuests: report.kicks.guests, kickCost: report.kicks.cost,
    kickReputation: report.kicks.reputation, finalReputation: last.reputation, served: report.value.served, lost: report.shiftStats.reduce((n, s) => n + s.lost, 0),
    standardK: report.normalised.kValue, standardValue: report.normalised.totalValue, rawK: report.value.kValue, lifePath: last.lifePath, commandHash: report.commandHash };
}
/** `incomeOver` the gross gain (information), `netOver` the gain net of the kick fees, `incomeOk` the income gate: the NET gain is at most +10 % (owner call 1). */
export interface KickVerdict { seed: number; never: KickRun; kick: KickRun; incomeOver: number; netOver: number; incomeOk: boolean; reputationOk: boolean }
export function kickVerdict(never: KickRun, kick: KickRun): KickVerdict {
  const incomeOver = kick.income / never.income - 1, netOver = kick.net / never.net - 1;
  return { seed: never.seed, never, kick, incomeOver, netOver, incomeOk: netOver <= KICK_INCOME_MAX_OVER_NEVER, reputationOk: kick.finalReputation >= KICK_FINAL_REPUTATION_MIN };
}
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)} %`;
const tr = (x: number) => `${(x / 1e6).toFixed(3)} tr`;
export function kickLines(verdicts: KickVerdict[], feeRate: number, repPerGuest: number, days: number): string[] {
  const lines = [`kickTable.feeRate ${feeRate} · kickTable.repPerGuest ${repPerGuest} · ${days}-day careers, the plan's protocol bot with and without kicks`,
    `seed | bot | ${days}-day income | vs never | net of kick fees | vs never | kicks (guests) | kick fees | reputation taken | final reputation | served | lost | k std (raw) | value std | LP`];
  for (const v of verdicts) for (const run of [v.never, v.kick]) lines.push([run.seed, run.bot, tr(run.income), run.bot === 'kick' ? pct(v.incomeOver) : '-', tr(run.net), run.bot === 'kick' ? pct(v.netOver) : '-',
    `${run.kicks} (${run.kickGuests})`, run.kickCost, run.kickReputation, run.finalReputation, run.served, run.lost,
    `${run.standardK?.toFixed(3)} (${run.rawK?.toFixed(3)})`, tr(run.standardValue), run.lifePath].join(' | '));
  lines.push('gate | target | ' + verdicts.map(v => `seed ${v.seed}`).join(' | ') + ' | PASS/FAIL');
  lines.push(`30-day income net of the kick fees, kick bot vs never-kick | <= +${KICK_INCOME_MAX_OVER_NEVER * 100} % | ${verdicts.map(v => pct(v.netOver)).join(' | ')} | ${verdicts.every(v => v.incomeOk) ? 'PASS' : 'FAIL'}`);
  // The reputation row cannot fail by construction (Game.changeRep clamps reputation at 0), so it prints the never-kick bot's beside the kick bot's.
  lines.push(`final reputation, kick bot (never-kick) | >= ${KICK_FINAL_REPUTATION_MIN}, clamped at 0 | ${verdicts.map(v => `${v.kick.finalReputation} (${v.never.finalReputation})`).join(' | ')} | ${verdicts.every(v => v.reputationOk) ? 'PASS' : 'FAIL'}`);
  lines.push(`information: 30-day income before the kick fees (gross), kick bot vs never-kick | - | ${verdicts.map(v => pct(v.incomeOver)).join(' | ')} | INFO`);
  lines.push(`information: served standard-order value (the S5 30-day value gate's number), kick bot vs never-kick | - | ${verdicts.map(v => pct(v.kick.standardValue / v.never.standardValue - 1)).join(' | ')} | INFO`);
  return lines;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const patch: Patch = {};
  for (const a of argv.filter(x => x.startsWith('--set='))) { const [path, ...rest] = a.slice(6).split('='); patch[path] = JSON.parse(rest.join('=')); }
  const seeds = (option('seeds') ?? '42,99').split(',').map(Number), days = Number(option('days') ?? 30), config = patchedConfig(patch);
  const rule = kickTableRule(config.values)!;
  const verdicts = seeds.map(seed => {
    const started = Date.now(), never = kickRun(config, seed, days, false), kick = kickRun(config, seed, days, true);
    console.error(`# seed ${seed} ${((Date.now() - started) / 1000).toFixed(1)} s`);
    return kickVerdict(never, kick);
  });
  for (const line of kickLines(verdicts, rule.feeRate, rule.repPerGuest, days)) console.log(line);
  const pass = verdicts.every(v => v.incomeOk && v.reputationOk);
  console.log(`kick verdict: ${pass ? 'PASS' : 'FAIL'} (patch ${JSON.stringify(patch)})`);
  if (option('out')) writeFileSync(option('out')!, JSON.stringify({ patch, feeRate: rule.feeRate, repPerGuest: rule.repPerGuest, days, verdicts }, null, 2) + '\n');
  process.exitCode = pass ? 0 : 1;
}
