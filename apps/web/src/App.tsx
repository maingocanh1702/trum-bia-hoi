import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DISHES, EQUIPMENT, encodeSave, freshnessMs, restockQuote, stockCap, upgradeQuote, type Command, type Equipment, type Table } from '../../../packages/engine/src';
import { Sprite, menuAsset } from './assets';
import { translate } from './i18n';
import { advanceGuide, boot, dispatch, download, persist, readSettings, writeSettings } from './local';
import { createSound } from './audio';

type Sheet = 'stock' | 'upgrades' | 'book' | 'journey' | 'settings' | 'config' | null;
const icons: Record<string, string> = {
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',
  bolt: 'M13 2 5 13h6l-1 9 9-13h-6l1-7Z',
  stock: 'M3 8h18v13H3V8Zm-1 0 3-5h14l3 5M9 12h6',
  upgrade: 'm12 3 8 8h-5v10H9V11H4l8-8Z',
  book: 'M4 3h13a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Zm0 14h15M8 7h7M8 11h5',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  close: 'm6 6 12 12M6 18 18 6',
  sound: 'M4 9h4l5-5v16l-5-5H4V9Zm12-2a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16',
  check: 'm5 12 4 4L19 6',
  glass: 'M6 3h12l-1 18H7L6 3Zm1 5h10M10 11v6m4-6v6',
};
function Icon({ name }: { name: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name] ?? icons.star} /></svg>; }
const time = (ms: number) => `${Math.floor(Math.max(0, ms) / 60000).toString().padStart(2, '0')}:${Math.floor(Math.max(0, ms) / 1000 % 60).toString().padStart(2, '0')}`;

function SheetDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { ref.current?.close(); }; }, []);
  return <dialog ref={ref} className="sheet" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="sheet-inner"><div className="sheet-handle" /><header className="sheet-header"><h2>{title}</h2><button className="icon-button" aria-label={title + ' ×'} onClick={close}><Icon name="close" /></button></header><div className="sheet-content">{children}</div></div>
  </dialog>;
}

export function App() {
  const [session] = useState(boot);
  const game = session.game, w = game.world, c = game.config.values;
  const prefs = useRef(readSettings());
  const [sound] = useState(() => createSound(game.config, prefs.current.muted));
  const [frame, setFrame] = useState(0);
  const [, setSettingsVersion] = useState(0);
  const settings = prefs.current;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(!settings.welcomed);
  const [saveError, setSaveError] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: string } | null>(null);
  const [lost, setLost] = useState<Record<string, number>>({});
  const cursor = useRef(w.events.length);
  const locale = settings.locale;
  const t = (key: string, params: Record<string, string | number> = {}) => translate(locale, key, params);
  const num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(n));
  const save = () => { try { persist(game); writeSettings(prefs.current); setSaveError(false); } catch { setSaveError(true); } };
  const processEvents = () => {
    const events = w.events.slice(cursor.current); cursor.current = w.events.length;
    advanceGuide(prefs.current, game, events);
    for (const e of events) {
      sound.event(e);
      if (e.type === 'order_expired') setLost(old => ({ ...old, [String(e.data.tableId)]: Number(e.data.penalty) }));
      if (e.type === 'order_served') setToast({ text: translate(prefs.current.locale, `outcome.${e.data.outcome}`, { n: Number(e.data.amount) }), kind: String(e.data.outcome) });
      if (e.type === 'shift_closed') { setSheet('book'); setToast({ text: translate(prefs.current.locale, 'book.closed'), kind: 'early' }); }
    }
  };
  const run = (cmd: Command) => {
    const result = dispatch(game, cmd);
    if (!result.ok) { sound.play('ui:denied'); setToast({ text: t(`error.${result.reason}`), kind: 'error' }); }
    else if (cmd.type === 'restock' || cmd.type === 'upgrade') setToast({ text: t(cmd.type === 'restock' ? 'stock.success' : 'upgrade.success'), kind: 'early' });
    processEvents(); save(); setFrame(x => x + 1);
    return result;
  };
  const setPrefs = (change: Partial<typeof settings>) => {
    Object.assign(prefs.current, change);
    if (change.muted !== undefined) sound.mute(change.muted);
    sound.play('ui:toggle');
    try { writeSettings(prefs.current); } catch { setSaveError(true); }
    setSettingsVersion(x => x + 1);
  };
  const open = (value: Sheet) => {
    setSheet(value);
    if (value === 'upgrades') { advanceGuide(prefs.current, game, [], 'ui_sheet_open:upgrade'); save(); }
  };
  useEffect(() => {
    sound.play(sheet || selectedEquipment || selectedTable || welcome ? 'ui:sheet_open' : 'ui:sheet_close');
  }, [sheet, selectedEquipment, selectedTable, welcome]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('brand');
  }, [locale]);
  useEffect(() => {
    if (session.error) return;
    const tick = setInterval(() => { game.advance(Math.max(Date.now(), w.now)); processEvents(); setFrame(x => x + 1); }, 100); // config-exempt: UI refresh cadence
    const checkpoint = setInterval(save, 1000); // config-exempt: local IO batching cadence
    const visibility = () => { run({ type: 'activity', active: !document.hidden }); };
    const pagehide = () => { dispatch(game, { type: 'activity', active: false }); save(); };
    const click = (e: MouseEvent) => { if ((e.target as Element).closest('button,select')) sound.play('ui:tap'); };
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
    return () => { clearInterval(tick); clearInterval(checkpoint); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', click, true); window.removeEventListener('pagehide', pagehide); sound.mute(true); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 5000); // config-exempt: transient UI feedback lifetime
    return () => clearTimeout(handle);
  }, [toast]);

  if (session.error) return <main className="recovery"><h1>{t('brand')}</h1><p role="alert">{t('save.corrupt')}</p><button onClick={() => download(session.original ?? '', 'tbh-original-save.json')}>{t('save.downloadOriginal')}</button><button onClick={() => location.reload()}>{t('save.retry')}</button></main>;

  const shift = w.shift, inShift = w.phase !== 'resting';
  const nextRush = shift?.rushes.find(r => r.start > w.now);
  const guide = settings.guideIndex === null ? null : c.onboarding.stepGuide.steps[settings.guideIndex];
  const showGuide = guide && (!guide.onlyAfter || w.completedShifts > 0);
  const cleanGlasses = w.glasses.filter(g => g.state === 'clean').length;

  function renderTable(table: Table, index: number) {
    const o = table.order, activeOrder = o && ['pending', 'grace'].includes(o.state);
    const ready = activeOrder && o.items.every(i => i.state === 'ready');
    const patience = activeOrder ? Math.max(0, (o.placedAt + o.patienceMs - w.now) / o.patienceMs) : 0;
    const stale = activeOrder && o.items.some(i => i.glassId && i.readyAt !== null && w.now >= i.readyAt + freshnessMs(w, game.config));
    const type = table.group?.customers.find(x => x.type === 'vip')?.type ?? table.group?.customers.find(x => x.type !== 'thuong')?.type ?? 'thuong';
    const counts = activeOrder ? DISHES.map(d => ({ dish: d, n: o.items.filter(i => i.dish === d).length })).filter(x => x.n) : [];
    return <section className={`table-space table-${index} state-${table.state}`} key={table.id} aria-label={t('table', { n: index + 1 })}>
      {activeOrder && <div className={`order-bubble ${o.state === 'grace' ? 'grace' : ''} ${stale ? 'stale' : ''}`}>
        <div className="order-top"><span>{t(`customer.${type}`)}</span><strong>{t('order.time', { s: Math.ceil(Math.max(0, o.placedAt + o.patienceMs + (o.state === 'grace' ? c.patience.graceMs : 0) - w.now) / 1000) })}</strong></div>
        <div className="order-items">{counts.map(x => <span key={x.dish}><Sprite id={menuAsset[x.dish]} /><b>{x.n}</b><span className="sr-only">{t(`dish.${x.dish}`)}</span></span>)}</div>
        <div className="patience-track"><i style={{ width: `${patience * 100}%` }} /></div>
        <button className={ready ? 'serve-button' : 'prep-button'} onClick={() => ready ? run({ type: 'serve', tableId: table.id, orderId: o.id }) : setSelectedTable(table.id)}>
          {ready ? <><Icon name="check" />{t('order.serve')}</> : t('order.preparing', { ready: o.items.filter(i => i.state === 'ready').length, total: o.items.length })}
        </button>
        {(o.state === 'grace' || stale) && <small>{t(stale ? 'order.stale' : 'order.grace')}</small>}
      </div>}
      {!activeOrder && lost[table.id] !== undefined && <button className="lost-bubble" onClick={() => setLost(old => { const next = { ...old }; delete next[table.id]; return next; })}>{t('outcome.expired', { n: lost[table.id] })}<small>{t('close')} ×</small></button>}
      <button className="table-object" onClick={() => setSelectedTable(table.id)} aria-label={t('order.details', { n: index + 1 })}>
        <div className="stools" aria-hidden="true"><i /><i /><i /><i /></div>
        <Sprite id={`table-lv${table.level}-empty`} />
        {table.group?.customers.map((customer, i) => <span className={`seated seated-${i}`} key={customer.id}><Sprite id={`customer-${customer.type.replace('_', '-')}`} /></span>)}
        <span className="table-number">{index + 1}</span>
      </button>
      <div className="table-caption">{t(`table.${table.state}`)}{!table.group && <small>{t('table.seats', { n: table.capacity })}</small>}</div>
    </section>;
  }
  function equipmentButton(kind: Equipment) {
    return <button className={`equipment-object ${kind}`} key={kind} onClick={() => setSelectedEquipment(kind)} aria-label={t(`equipment.${kind}`)}>
      <Sprite id={`${kind}-lv${Math.max(1, w.equipment[kind])}`} /><span>{t(`equipment.${kind}`)}</span><b>{t('level', { n: w.equipment[kind] })}</b>
    </button>;
  }
  function upgradeCard(kind: Equipment) {
    const q = upgradeQuote(w, game.config, kind);
    return <div className="upgrade-card" key={kind}><Sprite id={`${kind}-lv${Math.max(1, w.equipment[kind])}`} /><h3>{t(`equipment.${kind}`)}</h3><p>{t('level', { n: w.equipment[kind] })} {q.cost !== null ? `→ ${q.next}` : ''}</p><button disabled={!q.ok} onClick={() => run({ type: 'upgrade', kind })}>{q.cost === null ? t('upgrade.max') : t('upgrade.buy', { cost: num(q.cost) })}</button></div>;
  }

  return <div className="game-shell" data-frame={frame}>
    <aside className="side-story"><div className="vertical-sign">{t('brand')}</div><p>{t('tagline')}</p><div className="wall-window" /><div className="bicycle" /></aside>
    <main className={`game weather-${shift?.weather ?? 'sunny'}`}>
      <header className="hud">
        <div className="money"><Icon name="coin" /><div><span>{t('coins')}</span><strong>{num(w.coins)}</strong></div></div>
        <div className="energy"><div><Icon name="bolt" /><strong>{inShift && shift ? time(shift.endsAt - w.now) : `${Math.floor(w.staminaMs / c.shift.durationMs * 100)}%`}</strong></div><span className="energy-track"><i style={{ width: `${w.staminaMs / c.shift.durationMs * 100}%` }} /></span></div>
        <button className="icon-button settings-button" onClick={() => open('settings')} aria-label={t('nav.settings')}><Icon name="settings" /></button>
      </header>
      <div className="weather-row"><span className="weather-chip"><span aria-hidden="true">{shift?.weather === 'rain' ? '☂' : '☀'}</span>{t(`weather.${shift?.weather ?? 'sunny'}`)}</span><span className="rush-label">{inShift && nextRush ? t('rush.next', { time: time(nextRush.start - w.now) }) : t(`rush.${shift?.rush ?? 'none'}`)}</span></div>
      <section className="stall-scene" aria-label={t('brand')}>
        <div className="shop-sign"><small>{t('location.hem_nho')}</small><h1>{t('brand')}</h1><span>{t('location.subtitle')}</span></div>
        <div className="awning" aria-hidden="true" />
        <div className="equipment-row">{['cooler', 'keg', 'washer', 'kitchen'].map(k => equipmentButton(k as Equipment))}</div>
        <div className="glass-counter"><Sprite id="glass-clean" /><span>{cleanGlasses}<small>/{w.glasses.length}</small></span><span>{t('glass.clean')}</span></div>
      </section>
      <section className="yard" aria-label={t('location.hem_nho')}>
        {w.tables.map(renderTable)}
        {w.queue.length > 0 && <span className="queue-badge">{t('queue', { n: w.queue.length })}</span>}
        {!inShift && !shift && <div className="opening-note"><h2>{t('rest.title')}</h2><p>{t('rest.copy')}</p><button className="primary" onClick={() => run({ type: 'startShift' })}><Icon name="bolt" />{t('nav.shift')}</button><small>{t('rest.free')}</small></div>}
      </section>
      <div className="stock-strip">{DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= w.equipment.kitchen).map(d => <button key={d} onClick={() => open('stock')} aria-label={`${t(`dish.${d}`)}: ${w.inventory[d]}`}><Sprite id={menuAsset[d]} /><strong>{w.inventory[d]}</strong></button>)}<button className="reputation" onClick={() => open('journey')}><Icon name="star" />{num(w.reputation)}</button></div>
      {w.phase === 'closing' && <p className="status-line">{t('closing')}</p>}
      {!inShift && shift && <p className="status-line">{w.staminaMs < c.shift.durationMs ? t('rest.regen') : t('rest.free')}</p>}
      {showGuide && <div className="guide" role="status"><span className="guide-mark">!</span><p>{t(guide.copyKey)}</p>{c.onboarding.stepGuide.skippable && <button onClick={() => setPrefs({ guideDone: true, guideIndex: null })}>{t('skip')}</button>}</div>}
      <nav className="bottom-nav" aria-label={t('brand')}>
        <button className={!inShift ? 'primary' : ''} onClick={() => inShift ? open('book') : run({ type: 'startShift' })}><Icon name={inShift ? 'book' : 'bolt'} /><span>{t(inShift ? 'nav.book' : 'nav.shift')}</span></button>
        <button onClick={() => open('stock')}><Icon name="stock" /><span>{t('nav.stock')}</span></button>
        <button onClick={() => open('upgrades')}><Icon name="upgrade" /><span>{t('nav.upgrades')}</span></button>
        <button onClick={() => open('journey')}><Icon name="star" /><span>{t('nav.journey')}</span></button>
      </nav>
      {toast && <button className={`toast toast-${toast.kind}`} role="status" onClick={() => setToast(null)}>{toast.text}<span aria-hidden="true">×</span></button>}
      {saveError && <button className="save-error" role="alert" onClick={() => download(encodeSave(game), 'tbh-backup.json')}>{t('save.error')}</button>}
    </main>
    <aside className="side-story right"><div className="small-poster"><Sprite id="menu-beer" /><strong>{t('dish.bia')}</strong><p>{t('rest.free')}</p></div><p>{t('tagline')}</p></aside>

    {welcome && <SheetDialog title={t('welcome.title')} close={() => { setWelcome(false); setPrefs({ welcomed: true }); }}><div className="welcome-content"><Sprite id="glass-full" /><p>{t('welcome.copy')}</p><button className="primary" onClick={() => { setWelcome(false); setPrefs({ welcomed: true }); }}>{t('continue')}</button><small>{t('rest.free')}</small></div></SheetDialog>}

    {sheet && <SheetDialog title={t(sheet === 'book' ? 'book.title' : sheet === 'journey' ? 'journey.title' : sheet === 'settings' ? 'settings.title' : sheet === 'config' ? 'config.title' : `nav.${sheet}`)} close={() => setSheet(null)}>
      {sheet === 'stock' && <><p className="sheet-intro">{t('stock.copy')} <b>{num(w.coins)} {t('coins')}</b></p><div className="stock-list">{DISHES.map(dish => <div className="stock-row" key={dish}><Sprite id={menuAsset[dish]} /><div className="stock-info"><strong>{t(`dish.${dish}`)}</strong><span>{w.inventory[dish]} / {stockCap(w, game.config)}</span><progress value={w.inventory[dish]} max={stockCap(w, game.config)} /></div>{c.menu[dish].unlock.kitchenLevel > w.equipment.kitchen ? <small>{t('stock.locked', { n: c.menu[dish].unlock.kitchenLevel })}</small> : <div className="stock-actions">{(['bulk', 'full'] as const).map(mode => { const q = restockQuote(w, game.config, dish, mode); return <button key={mode} disabled={!q.ok} onClick={() => run({ type: 'restock', dish, mode })}>{t('stock.buy', { action: mode === 'bulk' ? t('stock.bulk', { n: c.inventory.bulkSize }) : t('stock.full'), cost: num(q.cost) })}</button>; })}</div>}</div>)}</div><button className="secondary full" onClick={() => run({ type: 'emergencyPack' })}>{t('stock.emergency')}</button></>}
      {sheet === 'upgrades' && <><p className="sheet-intro">{t(inShift ? 'upgrade.outside' : 'upgrade.copy')}</p><div className="upgrade-grid">{EQUIPMENT.map(upgradeCard)}</div><h3>{t('upgrade.tables')}</h3><div className="upgrade-grid">{w.tables.map((table, i) => { const next = c.upgrades.table.levels[table.level]; return <div className="upgrade-card" key={table.id}><Sprite id={`table-lv${table.level}-empty`} /><h3>{t('table', { n: i + 1 })}</h3><p>{t('table.seats', { n: table.capacity })}</p><button disabled={!next || inShift} onClick={() => run({ type: 'upgradeTable', tableId: table.id })}>{next ? t('upgrade.buy', { cost: num(next.priceBase) }) : t('upgrade.max')}</button></div>; })}</div><button className="secondary full" onClick={() => run({ type: 'buyTable' })}>{t('upgrade.addTable')}</button></>}
      {sheet === 'book' && (shift ? <><p className="sheet-intro">{t('shift')} · {time(Math.min(w.now, shift.endsAt) - shift.startedAt)}<b>{t(`weather.${shift.weather}`)}</b></p><dl className="ledger">{(['served', 'lost', 'payment', 'tip', 'penalty', 'spent'] as const).map(key => <div key={key}><dt>{t(`book.${key}`)}</dt><dd>{num(shift.stats[key])}</dd></div>)}<div className="ledger-total"><dt>{t('book.net')}</dt><dd>{num(shift.stats.credited - shift.stats.penalty - shift.stats.spent)}</dd></div></dl>{inShift && <div className="button-stack"><button className="primary" onClick={() => run({ type: 'endShift' })}>{t('book.end')}</button><button className="secondary" onClick={() => run({ type: 'kickAll' })}>{t('book.kick')}</button></div>}</> : <p>{t('book.none')}</p>)}
      {sheet === 'journey' && <><p className="sheet-intro">{t('journey.copy')}</p><dl className="ledger"><div><dt>{t('journey.lifetime')}</dt><dd>{num(w.lifetimeEarned)}</dd></div><div><dt>{t('journey.season')}</dt><dd>{num(w.seasonEarned)}</dd></div></dl><ol className="journey-list">{c.lifePath.map((level, i) => <li key={level.id} className={i === w.lifePath ? 'current' : ''}><span>{i}</span><div><h3>{locale === 'vi' ? level.name : `LP${i}`}</h3><p>{t(i === w.lifePath ? 'journey.current' : 'journey.unlock', { n: num(level.lifetimeBase) })}</p></div><Icon name={i === w.lifePath ? 'check' : 'star'} /></li>)}</ol></>}
      {sheet === 'settings' && <div className="settings-list"><label>{t('settings.language')}<select value={locale} onChange={e => setPrefs({ locale: e.target.value as 'vi' | 'en' })}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><button className="setting-row" onClick={() => setPrefs({ muted: !settings.muted })}><span>{t('settings.sound')}</span><b>{t(settings.muted ? 'settings.soundOff' : 'settings.soundOn')}</b></button><p>{t('settings.saved')}</p><button onClick={() => download(encodeSave(game), 'tbh-backup.json')}>{t('settings.export')}</button><button onClick={() => { setPrefs({ guideDone: false, guideIndex: 0 }); setSheet(null); }}>{t('settings.guide')}</button><button onClick={() => open('config')}>{t('settings.config')}</button></div>}
      {sheet === 'config' && <><p>{t('config.pinned', { version: game.config.version })}</p><pre className="config-json">{JSON.stringify(game.config.raw, null, 2)}</pre></>}
    </SheetDialog>}
    {selectedEquipment && <SheetDialog title={t(`equipment.${selectedEquipment}`)} close={() => setSelectedEquipment(null)}><div className="equipment-detail">{upgradeCard(selectedEquipment)}{inShift && <p>{t('upgrade.outside')}</p>}</div></SheetDialog>}
    {selectedTable && (() => { const table = w.tables.find(x => x.id === selectedTable)!; const o = table.order; return <SheetDialog title={t('table', { n: w.tables.indexOf(table) + 1 })} close={() => setSelectedTable(null)}><p>{t(`table.${table.state}`)}</p>{o && <div className="order-detail">{o.items.map(item => <div key={item.id}><Sprite id={menuAsset[item.dish]} /><strong>{t(`dish.${item.dish}`)}</strong><span>{item.state === 'ready' ? t('order.ready') : item.state === 'served' ? <Icon name="check" /> : t('order.preparing', { ready: 0, total: 1 })}</span></div>)}{['pending', 'grace'].includes(o.state) && <button className="primary full" onClick={() => { if (run({ type: 'serve', tableId: table.id, orderId: o.id }).ok) setSelectedTable(null); }}><Icon name="check" />{t('order.serve')}</button>}</div>}</SheetDialog>; })()}
  </div>;
}
