import { upgradeQuote, type Config, type WorldView } from '../../../packages/engine/src';

export function UpgradeHint({ world: w, config: c, t, open }: { world: WorldView; config: Config; t: (key: string, params?: Record<string, string | number>) => string; open: (kind: 'cooler' | 'tables') => void }) {
  if (!w.shift) return null;
  const stale = w.shift.menu?.complete ? w.serves.slice(w.shift.menu.serveStart).filter(s => s.stale).length : 0;
  const suggestions = [
    { kind: 'cooler' as const, count: stale, available: upgradeQuote(w, c, 'cooler').cost !== null },
    { kind: 'tables' as const, count: w.shift.stats.rejected, available: w.tables.length < c.values.upgrades.table.maxTables || w.tables.some(table => c.values.upgrades.table.levels[table.level]) },
  ].filter(row => row.available && row.count > 0).sort((a, b) => b.count - a.count);
  const hint = suggestions[0];
  if (!hint) return null;
  return <section className="upgrade-hint" aria-label={t('upgrade.hintTitle')} data-kind={hint.kind}>
    <h3>{t('upgrade.hintTitle')}</h3>
    <p>{t(`upgrade.hint.${hint.kind}`, { n: hint.count })}</p>
    <button className="secondary full" onClick={() => open(hint.kind)}>{t(`upgrade.hintOpen.${hint.kind}`)}</button>
  </section>;
}
