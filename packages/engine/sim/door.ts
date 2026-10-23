import { PAIR } from '../src/index';
import type { CareerDay, CareerShift } from './career';

// config-exempt: the owner's acceptance protocol of plan S3 (PLAN §5 row S3, DESIGN-story §6): how many guests may walk out WITH a penalty and what
// the first shift must show at the door. A measurement target for the career bot, never a live gameplay limit and never a tuning input.
export const DOOR_TARGETS = { shifts1to24: 0.10, days8to14: 0.20, days15to21: 0.15, firstShiftArrivals: 15, firstShiftRefusedPairs: 5 } as const;

/** One band of the career: guests who arrived, who were turned away at the door (no penalty) and who left WITH a penalty (order or queue timeout). */
export interface DoorBand {
  band: string; shifts: number; arrived: number; rejected: number; lost: number;
  /** lost / arrived: every guest who reached the door counts, the refused ones too. */
  lostOfArrived: number;
  /** lost / (arrived - rejected): only guests who got a seat or a queue slot, the stricter reading (a one-table shop refuses most pairs). */
  lostOfAdmitted: number;
  target: number; ok: boolean;
}
export interface DoorTable {
  bands: DoorBand[];
  /** Shift 1 (the onboarding shift): guests who arrived (refused pairs included) and pairs turned away for lack of a two-chair table. `targetPairs` 0 means "exactly none":
   *  re-sealed by the founder on 2026-10-23 (QD-117 B) for a config whose shift 1 seats singles only (`spawn.singlesFirstShifts`), where no pair can come to be refused. */
  shift1: { arrived: number; rejected: number; refusedPairs: number; targetArrivals: number; targetPairs: number; ok: boolean } | null;
  /** Every band the run covers is within target (a band the run is too short for is absent and makes this false). */
  complete: boolean; ok: boolean;
}

const sum = (rows: readonly { arrived: number; rejected: number; lost: number }[]) => rows.reduce((t, r) => ({ arrived: t.arrived + r.arrived, rejected: t.rejected + r.rejected, lost: t.lost + r.lost }), { arrived: 0, rejected: 0, lost: 0 });
const band = (name: string, shifts: number, rows: readonly { arrived: number; rejected: number; lost: number }[], target: number): DoorBand => {
  const t = sum(rows), admitted = t.arrived - t.rejected;
  const lostOfArrived = t.arrived ? t.lost / t.arrived : 0, lostOfAdmitted = admitted > 0 ? t.lost / admitted : 0;
  return { band: name, shifts, ...t, lostOfArrived, lostOfAdmitted, target, ok: lostOfAdmitted <= target };
};

/** The S3 acceptance table from one career report: % of guests who left with a penalty by band, and what shift 1 shows at the door (`singlesInShift1`: no pair arrives there). */
export function doorTable(report: { rows: readonly Pick<CareerDay, 'day' | 'shifts' | 'arrived' | 'lost' | 'rejected'>[]; shiftStats: readonly CareerShift[] }, singlesInShift1 = false): DoorTable {
  const days = (from: number, to: number) => report.rows.filter(r => r.day >= from && r.day <= to);
  const early = report.shiftStats.filter(s => s.shift <= 24), bands: DoorBand[] = [];
  if (early.length === 24) bands.push(band('shifts 1-24', 24, early, DOOR_TARGETS.shifts1to24));
  for (const [name, from, to, target] of [['days 8-14', 8, 14, DOOR_TARGETS.days8to14], ['days 15-21', 15, 21, DOOR_TARGETS.days15to21]] as const) {
    const rows = days(from, to);
    if (rows.length === to - from + 1) bands.push(band(name, rows.reduce((n, r) => n + r.shifts, 0), rows, target));
  }
  const first = report.shiftStats[0], targetPairs = singlesInShift1 ? 0 : DOOR_TARGETS.firstShiftRefusedPairs;
  const shift1 = first ? { arrived: first.arrived, rejected: first.rejected, refusedPairs: Math.floor(first.noSeat / PAIR), targetArrivals: DOOR_TARGETS.firstShiftArrivals, targetPairs,
    ok: first.arrived >= DOOR_TARGETS.firstShiftArrivals && (singlesInShift1 ? first.noSeat === 0 : Math.floor(first.noSeat / PAIR) >= targetPairs) } : null;
  const complete = bands.length === 3 && shift1 !== null;
  return { bands, shift1, complete, ok: complete && bands.every(b => b.ok) && shift1!.ok };
}

/** Human-readable lines of the table (percentages with one decimal). */
export function doorLines(t: DoorTable): string[] {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    ...t.bands.map(b => `DOOR ${b.band}: arrived ${b.arrived} · refused ${b.rejected} · left with penalty ${b.lost} · ${pct(b.lostOfArrived)} of arrivals · ${pct(b.lostOfAdmitted)} of admitted guests (target <= ${pct(b.target)}) ${b.ok ? 'PASS' : 'FAIL'}`),
    ...(t.shift1 ? [`DOOR shift 1: arrived ${t.shift1.arrived} (>= ${t.shift1.targetArrivals}) · refused pairs ${t.shift1.refusedPairs} (${t.shift1.targetPairs ? `>= ${t.shift1.targetPairs}` : '= 0'}) ${t.shift1.ok ? 'PASS' : 'FAIL'}`] : []),
  ];
}
