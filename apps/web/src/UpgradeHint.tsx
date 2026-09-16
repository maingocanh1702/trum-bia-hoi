import { upgradeQuote, type Config, type WorldView, type menuReport } from '../../../packages/engine/src';

type Target = 'cooler' | 'tables' | 'stock' | 'keg' | 'washer' | 'kitchen';
export function UpgradeHint({ world: w, config: c, report, t, open }: { world: WorldView; config: Config; report: ReturnType<typeof menuReport>; t: (key: string, params?: Record<string, string | number>) => string; open: (kind: Target) => void }) {
  if (!w.shift) return null;
  const stale = w.shift.menu?.complete ? w.serves.slice(w.shift.menu.serveStart).filter(s => s.stale).length : 0;
  const targets: Record<string, Target | undefined> = { beerStock: 'stock', foodStock: 'stock', beerRefill: 'keg', tap: 'keg', glasses: 'washer', pan: 'kitchen' };
  const losses = report?.losses ?? { unknown: w.shift.stats.lost, queue: 0 };
  const suggestions = [
    ...Object.entries(losses).filter(([kind]) => kind !== 'queue').map(([kind, count]) => ({ kind, count, target: targets[kind] })),
    { kind: 'tables', count: losses.queue + w.shift.stats.rejected, target: w.tables.length < c.values.upgrades.table.maxTables || w.tables.some(table => c.values.upgrades.table.levels[table.level]) ? 'tables' as Target : undefined },
    { kind: 'cooler', count: upgradeQuote(w, c, 'cooler').cost === null ? 0 : stale, target: 'cooler' as Target },
  ].filter(row => row.count > 0).sort((a, b) => b.count - a.count || Number(b.kind === 'unknown') - Number(a.kind === 'unknown'));
  const hint = suggestions[0];
  if (!hint) return null;
  return <section className="upgrade-hint" aria-label={t('upgrade.hintTitle')} data-kind={hint.kind}>
    <h3>{t('upgrade.hintTitle')}</h3>
    <p>{t(`upgrade.hint.${hint.kind}`, { n: hint.count })}</p>
    {hint.target && <button className="secondary full" onClick={() => open(hint.target!)}>{t(`upgrade.hintOpen.${hint.target}`)}</button>}
  </section>;
}
