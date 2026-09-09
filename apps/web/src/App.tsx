import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { BUSINESS_UNLOCKS, kitchenStatus, flyerQuote, SIGN_STYLES, signboardQuote, DISHES, EQUIPMENT, currentGuests, deliveryQuote, dogUpgradeQuote, encodeSave, freshnessMs, kickAllQuote, lifePathStatus, restockQuote, rushStatus, stockCap, unlockQuote, upgradeQuote, wellRestedRemaining, type Command, type Equipment, type Order, type RequirementStatus, type Table } from '../../../packages/engine/src';
import { Sprite, TableSeats, menuAsset, reactions } from './assets';
import { translate } from './i18n';
import { advanceGuide, boot, dispatch, download, persist, readSettings, writeSettings, replaceSave } from './local';
import { Quests } from './Quests';
import { Kitchen } from './Kitchen';
import { createSound } from './audio';

type Sheet = 'stock' | 'upgrades' | 'book' | 'close' | 'journey' | 'settings' | 'config' | 'dog' | 'delivery' | 'signboard' | 'flyer' | 'quests' | null;
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
const orderDishes = (order: Order) => DISHES.map(dish => ({ dish, items: order.items.filter(i => i.dish === dish) })).filter(x => x.items.length);

function SheetDialog({ title, close, children, view }: { title: string; close: () => void; children: ReactNode; view?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); }; }, []);
  useEffect(() => { if (view) ref.current?.querySelector<HTMLButtonElement>('.sheet-header button')?.focus(); }, [view]);
  return <dialog ref={ref} className="sheet" aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="sheet-inner"><div className="sheet-handle" /><header className="sheet-header"><h2>{title}</h2><button className="icon-button" aria-label={title + ' ×'} onClick={close}><Icon name="close" /></button></header><div className="sheet-content">{children}</div></div>
  </dialog>;
}

export function App() {
  const [session] = useState(boot);
  const game = session.game, w = game.world, c = game.config.values;
  const questsRevealed = !c.onboarding.enabled || w.completedShifts >= c.onboarding.featureReveal.questsAfterShifts;
  const prefs = useRef(readSettings());
  const [sound] = useState(() => createSound(game.config, prefs.current.muted));
  const [frame, setFrame] = useState(0);
  const [, setSettingsVersion] = useState(0);
  const settings = prefs.current;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [closeShift, setCloseShift] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(!settings.welcomed);
  const [saveError, setSaveError] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: string; id?: string; gain?: number; loss?: { coins: number; reputation: number } } | null>(null);
  const cursor = useRef(w.events.length);
  const orderPanelRef = useRef<HTMLElement>(null);
  const tableTrigger = useRef<{ button: HTMLButtonElement; fallback: HTMLButtonElement | null } | null>(null);
  const locale = settings.locale;
  const t = (key: string, params: Record<string, string | number> = {}) => translate(locale, key, params);
  const num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(n));
  const orderTime = (o: Order) => t('order.time', { s: Math.ceil(Math.max(0, o.placedAt + o.patienceMs + (o.state === 'grace' ? c.patience.graceMs : 0) - w.now) / 1000) });
  const save = () => { try { persist(game); writeSettings(prefs.current); setSaveError(false); } catch { setSaveError(true); } };
  const processEvents = () => {
    const events = w.events.slice(cursor.current); cursor.current = w.events.length;
    advanceGuide(prefs.current, game, events);
    let loss: { coins: number; reputation: number } | undefined;
    for (const e of events) {
      sound.event(e);
      if (e.type === 'order_expired') setSelectedTable(current => current === e.data.tableId ? null : current);
      if (e.type === 'order_expired' || e.type === 'shipper_missed' || (e.type === 'customer_left' && e.data.reason === 'queue')) {
        loss ??= { coins: 0, reputation: 0 };
        loss.coins += Number(e.data.penalty); loss.reputation += Number(e.data.reputation);
      }
      if (e.type === 'attendance_claimed') setToast({ text: translate(prefs.current.locale, 'attendance.received', { n: Number(e.data.reputation) }), kind: 'early' });
      if (e.type === 'quest_claimed') setToast({ text: translate(prefs.current.locale, 'quests.received', { coin: Number(e.data.coin), rep: Number(e.data.reputation) }), kind: 'early' });
      if (e.type === 'daily_bonus_claimed') setToast({ text: translate(prefs.current.locale, 'quests.bonusReceived'), kind: 'early' });
      if (e.type === 'shipper_arrived') setToast({ text: translate(prefs.current.locale, 'delivery.arrived'), kind: 'early' });
      if (e.type === 'shipper_missed' || e.type === 'shipper_completed') setSheet(current => current === 'delivery' ? null : current);
      if (e.type === 'shipper_completed') setToast({ id: e.id, text: translate(prefs.current.locale, 'delivery.completed', { n: Number(e.data.credited) }), kind: 'earlyNoTip', gain: Number(e.data.credited) });
      if (e.type === 'order_served') {
        const kind = e.data.outcome === 'early' && e.data.tipped === false ? 'earlyNoTip' : String(e.data.outcome);
        setToast({ id: e.id, text: translate(prefs.current.locale, `outcome.${kind}`, { n: Number(e.data.amount) }), kind, gain: Number(e.data.amount) });
      }
      if (e.type === 'shift_closed') { setSelectedTable(null); setSheet('book'); if (!events.some(event => event.type === 'shipper_completed')) setToast({ text: translate(prefs.current.locale, 'book.closed'), kind: 'early' }); }
    }
    if (loss) setToast({ text: '', kind: 'loss', loss });
  };
  const run = (cmd: Command) => {
    const result = dispatch(game, cmd);
    if (!result.ok) { sound.play('ui:denied'); setToast({ text: t(`error.${result.reason}`), kind: 'error' }); }
    else if (cmd.type === 'restock' || cmd.type === 'upgrade') setToast({ text: t(cmd.type === 'restock' ? 'stock.success' : 'upgrade.success'), kind: 'early' });
    if (result.ok && cmd.type === 'upgradeDog') { setSheet(null); setToast({ text: t('dog.success', { n: w.dogLevel }), kind: 'early' }); }
    if (result.ok && cmd.type === 'activateFlyer') { setSheet(null); setToast({ text: t('flyer.started'), kind: 'early' }); }
    if (result.ok && cmd.type === 'buyUnlock') setToast({ text: t('business.success', { name: t(`business.${cmd.item}`) }), kind: 'early' });
    if (result.ok && cmd.type === 'claimLifePath') setToast({ text: t('journey.received', { n: num(result.amount ?? 0) }), kind: 'early', gain: result.amount });
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
    setSelectedTable(null); setSheet(value);
    if (value === 'upgrades') { advanceGuide(prefs.current, game, [], 'ui_sheet_open:upgrade'); save(); }
  };
  const showTable = (id: string, button: HTMLButtonElement) => {
    tableTrigger.current = { button, fallback: button.closest('.table-space')?.querySelector<HTMLButtonElement>('.table-object') ?? null };
    setSelectedTable(id);
  };
  useEffect(() => {
    sound.play(sheet || selectedEquipment || selectedTable || welcome ? 'ui:sheet_open' : 'ui:sheet_close');
  }, [sheet, selectedEquipment, selectedTable, welcome]);
  useEffect(() => {
    if (selectedTable) orderPanelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    else {
      const origin = tableTrigger.current;
      (origin?.button.isConnected ? origin.button : origin?.fallback)?.focus();
      tableTrigger.current = null;
    }
  }, [selectedTable]);
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
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedTable(null); };
    document.addEventListener('keydown', escape);
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
    return () => { clearInterval(tick); clearInterval(checkpoint); document.removeEventListener('keydown', escape); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', click, true); window.removeEventListener('pagehide', pagehide); sound.mute(true); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), toast.gain !== undefined ? 2400 : 5000); // config-exempt: transient UI feedback lifetime
    return () => clearTimeout(handle);
  }, [toast]);

  if (session.error) return <main className="recovery"><h1>{t('brand')}</h1><p role="alert">{t('save.corrupt')}</p>
    <button onClick={() => download(session.original ?? '', 'tbh-original-save.json')}>{t('save.downloadOriginal')}</button>
    <label>{t('save.import')}<input type="file" accept="application/json,.json" onChange={async e => {
      const file = e.currentTarget.files?.[0]; if (!file) return;
      try { replaceSave(await file.text()); location.reload(); } catch { setRecoveryError(true); }
    }} /></label>
    {recoveryError && <p role="alert">{t('save.importError')}</p>}
    {confirmReset ? <><p>{t('save.resetConfirm')}</p><button onClick={() => { try { replaceSave(null); location.reload(); } catch { setRecoveryError(true); } }}>{t('save.resetYes')}</button><button onClick={() => setConfirmReset(false)}>{t('save.cancel')}</button></> : <button onClick={() => setConfirmReset(true)}>{t('save.reset')}</button>}
    <button onClick={() => location.reload()}>{t('save.retry')}</button></main>;

  const shift = w.shift, inShift = w.phase !== 'resting';
  const rush = rushStatus(w, game.config);
  const rushReports = sheet === 'book' ? w.events.filter(e => e.type === 'rush_ended' && e.data.shiftId === shift?.id) : [];
  const kitchen = kitchenStatus(w, game.config);
  const flyers = flyerQuote(w, game.config);
  const flyerReport = sheet === 'flyer' ? w.events.filter(e => e.type === 'flyer_ended').at(-1) : undefined;
  const dogQuote = dogUpgradeQuote(w, game.config);
  const delivery = deliveryQuote(w, game.config);
  const deliveryUrgent = delivery && delivery.remainingMs / c.customerTypes.shipper.deadlineMs < c.tip.patienceThreshold;
  const path = lifePathStatus(w, game.config), nextMilestone = path.rows[w.lifePath + 1];
  const claimCount = path.rows.filter(row => row.claimable).length;
  const guide = settings.guideIndex === null ? null : c.onboarding.stepGuide.steps[settings.guideIndex];
  const showGuide = guide && (!guide.onlyAfter || w.completedShifts > 0);
  const cleanGlasses = w.glasses.filter(g => g.state === 'clean').length;
  const restedMs = wellRestedRemaining(w);
  const closeQuote = kickAllQuote(w, game.config);

  function renderTable(table: Table, index: number) {
    const o = table.order, activeOrder = o && ['pending', 'grace'].includes(o.state);
    const ready = activeOrder && o.items.every(i => i.state === 'ready');
    const patience = activeOrder ? Math.max(0, (o.placedAt + o.patienceMs - w.now) / o.patienceMs) : 0;
    const stale = activeOrder && o.items.some(i => i.glassId && i.readyAt !== null && w.now >= i.readyAt + freshnessMs(w, game.config));
    const guests = currentGuests(table), seated = guests.length > 0;
    const served = seated && o?.state === 'served' ? w.events.find(e => e.type === 'order_served' && e.data.orderId === o.id) : undefined;
    const feedback = served ? w.serves.filter(s => s.orderId === o?.id).map(s => ({ customerId: s.customerId, kind: s.stale ? 'stale' : served.data.outcome === 'grace' ? 'grace' : s.patienceRatio >= c.tip.patienceThreshold ? s.tip > 0 ? 'early' : 'earlyNoTip' : 'late' })) : [];
    const special = guests.find(x => x.type === 'vip')?.type ?? guests.find(x => x.type !== 'thuong')?.type;
    return <section className={`table-space table-${index} state-${table.state} ${activeOrder ? 'has-order' : ''} ${special ? `guest-${special}` : ''} ${o?.state === 'grace' ? 'is-urgent' : ''} ${selectedTable === table.id ? 'is-selected' : ''}`} key={table.id} data-table-id={table.id} aria-label={t('table', { n: index + 1 })}>
      {activeOrder && <button className={`table-order-hint ${ready ? 'is-ready' : ''} ${o.state === 'grace' ? 'is-urgent' : ''}`} onClick={e => showTable(table.id, e.currentTarget)} aria-label={t('order.details', { n: index + 1 })} aria-describedby={`${o.id}-description ${o.id}-time`}>
        <span className="bubble-dishes" aria-hidden="true">{orderDishes(o).map(({ dish, items }) => <span key={dish} className="bubble-dish"><Sprite id={dish === 'bia' ? stale ? 'glass-stale' : 'glass-full' : menuAsset[dish]} />{items.length > 1 && <b>{items.length}</b>}</span>)}</span>
        <span className="sr-only" id={`${o.id}-description`}>{orderDishes(o).map(({ dish, items }) => `${t(`dish.${dish}`)} × ${items.length}`).join(', ')} · {t(ready ? 'order.ready' : 'table.waiting')}</span>
        <span className="sr-only bubble-time" id={`${o.id}-time`}>{orderTime(o)}</span>
        <span className="bubble-status" aria-label={t(ready ? 'order.ready' : 'table.waiting')}>{ready ? <Icon name="check" /> : '…'}</span>
        <span className={`patience-track ${patience < c.tip.patienceThreshold ? 'is-low' : ''}`}><i style={{ width: `${patience * 100}%` }} /></span>
      </button>}
      <button className="table-object" aria-haspopup="dialog" aria-controls={selectedTable === table.id ? 'active-table-order' : undefined} onClick={e => showTable(table.id, e.currentTarget)} aria-label={t('order.details', { n: index + 1 })}>
        <TableSeats capacity={table.capacity} customers={guests} feedback={feedback} />
        <Sprite id={`table-lv${table.level}-empty`} />
        <span className="table-number">{index + 1}</span>
      </button>
      <div className="table-caption">{special && <strong className="guest-label">{t(`customer.${special}`)}</strong>}<span>{t(`table.${table.state}`)}</span>{!table.group && <small>{t('table.seats', { n: table.capacity })}</small>}{served && table.until !== null && ['consuming', 'occupied'].includes(table.state) && <time className="enjoy-time">{time(table.until - w.now)}</time>}</div>
    </section>;
  }
  function equipmentButton(kind: Equipment) {
    return <button className={`equipment-object ${kind} ${kind === 'kitchen' && kitchen.busy ? 'is-cooking' : ''}`} key={kind} onClick={() => { setSelectedTable(null); setSelectedEquipment(kind); }} aria-label={t(`equipment.${kind}`)}>
      <Sprite id={`${kind}-lv${Math.max(1, w.equipment[kind])}`} /><span>{t(`equipment.${kind}`)}</span><b>{kind === 'kitchen' ? `${kitchen.busy}/${kitchen.slots}` : t('level', { n: w.equipment[kind] })}</b>
    </button>;
  }
  const levelName = (level: number) => t(`lifePath.${c.lifePath[level].id}`);
  function requirementCopy(r: RequirementStatus) {
    const name = r.kind === 'peak' ? t(`league.${r.target}`) : r.kind === 'level' ? levelName(r.need!) : r.target ? t(`requirement.${r.target}`) : '';
    return t(`requirement.${r.kind}`, { have: num(r.have ?? 0), need: num(r.need ?? 0), name });
  }
  function requirementList(requirements: RequirementStatus[]) {
    return <ul className="requirement-list">{requirements.map((r, index) => <li key={index} className={r.met ? 'met' : ''}><span aria-label={t(r.met ? 'requirement.met' : 'requirement.missing')}>{r.met ? '✓' : '○'}</span>{requirementCopy(r)}</li>)}</ul>;
  }
  function businessCards() {
    return <div className="business-grid">{BUSINESS_UNLOCKS.map(item => {
      const quote = unlockQuote(w, game.config, item);
      return <article className="business-card" key={item}><Sprite id={item === 'qr' ? 'qr-payment' : 'phone'} /><div><h3>{t(`business.${item}`)}</h3>{item === 'qr' && <p>{t('business.qrEffect', { mult: c.tip.qrMult })}</p>}{requirementList(quote.requirements)}<button disabled={!quote.ok} onClick={() => run({ type: 'buyUnlock', item })}>{quote.owned ? t('business.owned') : t('business.buy', { cost: num(quote.cost) })}</button></div></article>;
    })}</div>;
  }
  function upgradeCard(kind: Equipment) {
    const q = upgradeQuote(w, game.config, kind);
    return <div className="upgrade-card" key={kind}><Sprite id={`${kind}-lv${Math.max(1, w.equipment[kind])}`} /><h3>{t(`equipment.${kind}`)}</h3><p>{t('level', { n: w.equipment[kind] })} {q.cost !== null ? `→ ${q.next}` : ''}</p><button disabled={!q.ok} onClick={() => run({ type: 'upgrade', kind })}>{q.cost === null ? t('upgrade.max') : t('upgrade.buy', { cost: num(q.cost) })}</button></div>;
  }

  return <div className="game-shell" data-frame={frame}>
    {!w.active && <div className="paused-overlay" role="status">{t('pause.hidden')}</div>}
    <div className="street-backdrop" aria-hidden="true"><Sprite id="bg-street" /></div>
    <main className={`game weather-${shift?.weather ?? 'sunny'}`}>
      <header className="hud">
        <div className="money"><Icon name="coin" /><div><span className="sr-only">{t('coins')}</span><strong>{num(w.coins)}</strong></div></div>
        <div className="energy"><div><Icon name="bolt" /><strong>{inShift && shift ? time(shift.endsAt - w.now) : `${Math.floor(w.staminaMs / c.shift.durationMs * 100)}%`}</strong></div><span className="energy-track"><i style={{ width: `${w.staminaMs / c.shift.durationMs * 100}%` }} /></span></div>
        <button className="icon-button settings-button" onClick={() => open('settings')} aria-label={t('nav.settings')}><Icon name="settings" /></button>
      </header>
      <div className="weather-row"><span className="weather-chip"><span aria-hidden="true">{shift?.weather === 'rain' ? '☂' : '☀'}</span>{t(`weather.${shift?.weather ?? 'sunny'}`)}</span>{restedMs > 0 && <span className="well-rested" role="timer" aria-label={t('wellRested.active', { time: time(restedMs), mult: c.shift.wellRested.mult })}><Icon name="star" /><time>{time(restedMs)}</time><b>×{c.shift.wellRested.mult}</b></span>}<span className={`rush-label ${rush.active ? 'is-active' : rush.next?.warning ? 'is-warning' : ''}`} role="timer">{rush.active ? <><Icon name="bolt" /><span><b>{t(`rush.${rush.active.kind}`)}</b><time>{t('rush.ends', { time: time(rush.active.remainingMs) })}</time></span></> : rush.next ? <span><b>{t('rush.upcoming', { kind: t(`rush.${rush.next.kind}`) })}</b><time>{time(rush.next.remainingMs)}</time></span> : t('rush.none')}</span>{!rush.active && rush.next?.warning && <span className="sr-only" role="status">{t('rush.warning', { kind: t(`rush.${rush.next.kind}`) })}</span>}</div>
      <section className={`stall-scene ${kitchen.level ? 'has-kitchen' : ''}`} aria-label={t('brand')}>
        {w.signStyle && <button className="sign-object" aria-label={t('sign.open', { style: t(`sign.${w.signStyle}`) })} aria-haspopup="dialog" onClick={() => open('signboard')}><Sprite id={`sign-${w.signStyle}`} /></button>}
        <div className="owner-station"><Sprite id="owner-idle" /><div className="serving-counter"><div className="counter-canopy" /><div className="counter-front"><h1>{t('brand')}</h1><div className="counter-bottles" aria-hidden="true"><i /><i /><i /><i /><i /></div></div></div></div>
        <div className="equipment-row">{['cooler', 'keg', 'washer'].map(k => equipmentButton(k as Equipment))}{kitchen.level > 0 && equipmentButton('kitchen')}</div>
        <div className="glass-counter"><Sprite id="glass-clean" /><span>{cleanGlasses}<small>/{w.glasses.length}</small></span><span className="sr-only">{t('glass.clean')}</span></div>
        <div className="business-props">{BUSINESS_UNLOCKS.filter(item => w.unlocks.includes(item)).map(item => <button key={item} className={item === 'phone' && delivery ? `has-delivery ${deliveryUrgent ? 'is-urgent' : ''}` : ''} onClick={() => open(item === 'phone' ? 'delivery' : 'upgrades')} aria-label={t(item === 'phone' ? 'delivery.open' : `business.${item}`)} aria-describedby={item === 'phone' && delivery ? 'delivery-clock' : undefined}><Sprite id={item === 'qr' ? 'qr-payment' : item === 'phone' && delivery ? 'customer-shipper' : 'phone'} />{item === 'phone' && delivery && <span id="delivery-clock" className="delivery-clock"><span className="sr-only">{t(deliveryUrgent ? 'delivery.urgent' : 'delivery.deadline')}</span>{deliveryUrgent && <b aria-hidden="true">! </b>}{time(Math.ceil(delivery.remainingMs / 1000) * 1000)}</span>}</button>)}</div>
        {w.dogLevel > 0 && <button className="dog-object" aria-label={t('dog.open', { n: w.dogLevel })} aria-haspopup="dialog" onClick={() => open('dog')}><Sprite id={`dog-idle-lv${w.dogLevel}`} /><span>{t('level', { n: w.dogLevel })}</span></button>}
      </section>
      <section className="yard" aria-label={t('location.hem_nho')}>
        {w.tables.map(renderTable)}
        {w.queue.length > 0 && <span className="queue-badge">{t('queue', { n: w.queue.length })}</span>}
        {!inShift && !shift && <div className="opening-note"><h2>{t('rest.title')}</h2><p>{t('rest.copy')}</p><button className="primary" onClick={() => run({ type: 'startShift' })}><Icon name="bolt" />{t('nav.shift')}</button><small>{t('rest.free')}</small></div>}
      </section>
      <div className="stock-strip">{DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= w.equipment.kitchen).map(d => <button key={d} onClick={() => open('stock')} aria-label={`${t(`dish.${d}`)}: ${w.inventory[d]}`}><Sprite id={menuAsset[d]} /><strong>{w.inventory[d]}</strong></button>)}<button className={`flyer-stock ${flyers.remainingMs > 0 ? 'active' : ''}`} onClick={() => open('flyer')} aria-label={t('flyer.open', { n: flyers.stock })}><Sprite id="flyer-bundle" /><strong>{flyers.remainingMs > 0 ? time(flyers.remainingMs) : flyers.stock}</strong></button>{questsRevealed && <button className="quest-trigger" onClick={() => open('quests')} aria-label={t('quests.title')}><Icon name="book" /><strong>{w.daily?.rows.filter(r => r.progress >= r.target).length ?? 0}/{c.quests.daily.count}</strong></button>}<button className="reputation" onClick={() => open('journey')}><Icon name="star" />{num(w.reputation)}</button></div>
      {w.phase === 'closing' && <p className="status-line">{t('closing')}</p>}
      {!inShift && shift && <p className="status-line">{w.staminaMs < c.shift.durationMs ? t('rest.regen') : t('rest.free')}</p>}
      {showGuide && <div className="guide" role="status"><span className="guide-mark">!</span><p>{t(guide.copyKey)}</p>{c.onboarding.stepGuide.skippable && <button onClick={() => setPrefs({ guideDone: true, guideIndex: null })}>{t('skip')}</button>}</div>}
      <nav className="bottom-nav" aria-label={t('brand')}>
        <button className={!inShift ? 'primary' : ''} onClick={() => inShift ? open('book') : run({ type: 'startShift' })}><Icon name={inShift ? 'book' : 'bolt'} /><span>{t(inShift ? 'nav.book' : 'nav.shift')}</span></button>
        <button onClick={() => open('stock')}><Icon name="stock" /><span>{t('nav.stock')}</span></button>
        <button onClick={() => open('upgrades')}><Icon name="upgrade" /><span>{t('nav.upgrades')}</span></button>
        <button onClick={() => open('journey')}><Icon name="star" /><span>{t('nav.journey')}</span>{claimCount > 0 && <b className="nav-badge" aria-hidden="true">{claimCount}</b>}</button>
      </nav>
      {toast?.loss ? <div className="toast toast-loss" role="status" aria-label={t('loss.aria', { coins: num(toast.loss.coins), reputation: num(toast.loss.reputation) })}>
        <span className="loss-value" aria-hidden="true"><Icon name="coin" /><strong>{toast.loss.coins ? '−' : ''}{num(toast.loss.coins)}</strong></span>
        <span className="loss-value" aria-hidden="true"><Icon name="star" /><strong>{toast.loss.reputation ? '−' : ''}{num(toast.loss.reputation)}</strong></span>
      </div> : toast?.gain !== undefined ? <div key={toast.id} className={`toast toast-gain gain-${toast.kind}`} role="status" aria-label={toast.text}>
        <span className="gain-reaction" aria-hidden="true">{reactions[toast.kind]}</span><strong aria-hidden="true">+{num(toast.gain)}</strong><Icon name="coin" />
      </div> : toast && <button className={`toast toast-${toast.kind}`} role="status" onClick={() => setToast(null)}>{toast.text}<span aria-hidden="true">×</span></button>}
      {saveError && <button className="save-error" role="alert" onClick={() => download(encodeSave(game), 'tbh-backup.json')}>{t('save.error')}</button>}
    </main>


    {welcome && <SheetDialog title={t('welcome.title')} close={() => { setWelcome(false); setPrefs({ welcomed: true }); }}><div className="welcome-content"><Sprite id="glass-full" /><p>{t('welcome.copy')}</p><button className="primary" onClick={() => { setWelcome(false); setPrefs({ welcomed: true }); }}>{t('continue')}</button><small>{t('rest.free')}</small></div></SheetDialog>}

    {sheet && <SheetDialog view={sheet} title={t(sheet === 'quests' ? 'quests.title' : sheet === 'flyer' ? 'flyer.title' : sheet === 'signboard' ? 'sign.title' : sheet === 'delivery' ? 'delivery.title' : sheet === 'dog' ? 'dog.title' : sheet === 'close' ? 'close.title' : sheet === 'book' ? 'book.title' : sheet === 'journey' ? 'journey.title' : sheet === 'settings' ? 'settings.title' : sheet === 'config' ? 'config.title' : `nav.${sheet}`)} close={() => setSheet(null)}>
      {sheet === 'quests' && questsRevealed && <Quests world={w} config={game.config} run={run} t={t} num={num} />}
      {sheet === 'flyer' && <div className="flyer-panel">
        <div className="flyer-summary"><Sprite id="flyer-bundle" /><div><strong>{t('flyer.stock', { n: flyers.stock, cap: c.unlocks.flyer.stockCap })}</strong><p>{t('flyer.used', { n: inShift ? flyers.used : 0, cap: c.unlocks.flyer.perShift })}</p></div></div>
        <p>{t('flyer.copy', { seconds: c.unlocks.flyer.campaignMs / 1000 })}</p>
        {!flyers.requirement.met && requirementList([flyers.requirement])}
        <div className="button-stack"><button className="secondary" disabled={!!flyers.buyReason} onClick={() => run({ type: 'buyFlyer' })}>{t('flyer.buy', { cost: num(flyers.cost) })}</button>{flyers.buyReason && <small>{t(`error.${flyers.buyReason}`)}</small>}
        <button className="primary" disabled={!!flyers.useReason} onClick={() => run({ type: 'activateFlyer', shiftId: shift!.id })}>{t('flyer.use')}</button>{flyers.useReason && <small>{t(`error.${flyers.useReason}`)}</small>}</div>
        {flyers.remainingMs > 0 && <p className="flyer-timer">{t('flyer.remaining')} <b>{time(flyers.remainingMs)}</b><progress max={c.unlocks.flyer.campaignMs} value={flyers.remainingMs} /></p>}
        {flyerReport && <section className="flyer-report" aria-label={t('flyer.report')}><h3>{t('flyer.report')}</h3><p>{t('flyer.elapsed', { seconds: Number(flyerReport.data.activeMs) / 1000 })}</p><dl className="ledger">{(['served', 'lost', 'revenue', 'tips'] as const).map(key => <div key={key}><dt>{t(`flyer.${key}`)}</dt><dd>{num(Number(flyerReport.data[key]))}</dd></div>)}</dl><small>{t('flyer.reportNote')}</small></section>}
      </div>}
      {sheet === 'signboard' && <div className="sign-shop"><p className="sheet-intro">{t('sign.copy')}</p>{!w.unlocks.includes('signboard') && (() => {
        const q = signboardQuote(w, game.config);
        return <div className="sign-install"><Sprite id="sign-wood" /><p>{t('sign.stallGate', { level: q.requiredStall })}</p><button className="primary full" disabled={!q.ok} onClick={() => run({ type: 'installSignboard' })}>{t('sign.install', { cost: num(q.cost) })}</button></div>;
      })()}<div className="sign-list">{SIGN_STYLES.map(style => {
        const q = signboardQuote(w, game.config, style), definition = c.signboard.styles[style];
        return <article className={`sign-card ${q.selected ? 'selected' : ''}`} key={style} aria-label={t(`sign.${style}`)}><Sprite id={`sign-${style}`} /><div><h3>{t(`sign.${style}`)} {q.selected && <small>{t('sign.selected')}</small>}</h3><ul>{Object.entries(definition).filter(([key]) => key.endsWith('Mult')).map(([key, mult]) => <li key={key}>{t(`sign.effect.${key}`, { mult })}</li>)}</ul>{q.requiredRep > 0 && <p className="sign-rep">{t('sign.repGate', { n: num(q.requiredRep), have: num(w.reputation) })}</p>}<button disabled={!q.ok} onClick={() => run({ type: 'setSignboard', style })}>{t(q.selected ? 'sign.selected' : !q.installed ? 'sign.installFirst' : q.owned ? 'sign.equip' : 'sign.buy', { cost: num(q.cost) })}</button></div></article>;
      })}</div></div>}
      {sheet === 'delivery' && <div className="delivery-panel">
        <div className="delivery-summary"><Sprite id="customer-shipper" /><div><h3>{t(delivery ? 'delivery.waiting' : 'delivery.idle')}</h3>{delivery ? <time role="timer" aria-label={t('delivery.deadline')}>{time(Math.ceil(delivery.remainingMs / 1000) * 1000)}</time> : <p>{t(w.phase === 'open' && w.nextDeliveryAt !== null ? 'delivery.next' : 'delivery.closed', { time: time(Math.max(0, (w.nextDeliveryAt ?? w.now) - w.now)) })}</p>}</div></div>
        {delivery && <>
          <progress className="delivery-progress" value={delivery.remainingMs} max={c.customerTypes.shipper.deadlineMs} aria-label={t('delivery.deadline')} />
          {deliveryUrgent && <p className="delivery-urgent" role="status">{t('delivery.urgent')}</p>}
          <ul className="delivery-lines">{delivery.lines.map(line => <li key={line.dish} className={line.have >= line.quantity ? 'is-ready' : ''}><Sprite id={menuAsset[line.dish]} /><div><strong>{t(`dish.${line.dish}`)} × {line.quantity}</strong><small>{t('delivery.stock', { have: line.have, need: line.quantity })}</small></div><span aria-label={t(line.have >= line.quantity ? 'requirement.met' : 'requirement.missing')}>{line.have >= line.quantity ? '✓' : '○'}</span></li>)}</ul>
          <p className="delivery-terms">{t('delivery.terms', { gross: num(delivery.gross), net: num(delivery.net), penalty: num(delivery.penalty) })}</p>
          <button className="primary full" disabled={!delivery.ready || !delivery.safe || !delivery.remainingMs} onClick={() => run({ type: 'serveDelivery', deliveryId: delivery.order.id })}>{t('delivery.serve', { n: num(delivery.credited) })}</button>
          {!delivery.safe && <p role="status">{t('error.rewardOverflow')}</p>}
          {!delivery.ready && <button className="secondary full" onClick={() => open('stock')}>{t('delivery.restock')}</button>}
        </>}
      </div>}
      {sheet === 'dog' && <div className="dog-panel">
        <div className="dog-summary"><Sprite id={`dog-idle-lv${w.dogLevel || dogQuote.next?.level}`} /><div><h3>{t(`dog.level${w.dogLevel}`)}</h3><p>{t(w.dogLevel ? 'dog.home' : 'dog.welcome')}</p></div></div>
        {dogQuote.next && dogQuote.cost !== null ? <>
          <h3>{t('dog.next', { name: t(`dog.level${dogQuote.next.level}`) })}</h3>
          <ul className="dog-requirements">
            <li className={w.coins >= dogQuote.cost ? 'is-ready' : ''}><Icon name="coin" /><strong>{num(dogQuote.cost)} {t('coins')}</strong><span>{t('dog.have', { n: num(w.coins) })}</span></li>
            {dogQuote.materials.map(m => <li key={m.dish} className={m.have >= m.quantity ? 'is-ready' : ''}><Sprite id={menuAsset[m.dish]} /><strong>{t(`dish.${m.dish}`)} × {m.quantity}</strong><span>{t('dog.have', { n: m.have })}</span></li>)}
          </ul>
          {dogQuote.materials.some(m => m.quantity > stockCap(w, game.config)) && <p>{t('dog.capacity')}</p>}
          <button className="primary full" disabled={!dogQuote.ok} onClick={() => run({ type: 'upgradeDog', level: dogQuote.next!.level })}>{t(w.dogLevel ? 'dog.upgrade' : 'dog.buy', { cost: num(dogQuote.cost) })}</button>
          <div className="dog-links"><button onClick={() => open('stock')}>{t('nav.stock')}</button><button onClick={() => open('upgrades')}>{t('dog.storage')}</button></div>
        </> : <p>{t('upgrade.max')}</p>}
      </div>}
      {sheet === 'close' && <div className="close-confirm"><p>{t('close.copy')}</p><p>{t('close.guests', { n: closeQuote.guests.length })}</p><div className="close-price"><Icon name="coin" /><strong>{num(closeQuote.cost)}</strong><span>{t('coins')}</span></div>{!closeQuote.ok && <p role="status">{t(closeQuote.deliveryBlocked ? 'error.deliveryPending' : 'error.notEnoughCoins')}</p>}<div className="button-stack"><button className="primary" disabled={!closeQuote.ok || closeShift !== shift?.id} onClick={() => run({ type: 'kickAll', shiftId: closeShift!, maxCost: closeQuote.cost })}>{t('close.confirm', { cost: num(closeQuote.cost) })}</button><button onClick={() => open('book')}>{t('close.wait')}</button></div></div>}
      {sheet === 'stock' && <><p className="sheet-intro">{t('stock.copy')} <b>{num(w.coins)} {t('coins')}</b></p><div className="stock-list">{DISHES.map(dish => <div className="stock-row" key={dish}><Sprite id={menuAsset[dish]} /><div className="stock-info"><strong>{t(`dish.${dish}`)}</strong><span>{w.inventory[dish]} / {stockCap(w, game.config)}</span><progress value={w.inventory[dish]} max={stockCap(w, game.config)} /></div>{c.menu[dish].unlock.kitchenLevel > w.equipment.kitchen ? <small>{t('stock.locked', { n: c.menu[dish].unlock.kitchenLevel })}</small> : <div className="stock-actions">{(['one', 'bulk', 'full'] as const).map(mode => { const q = restockQuote(w, game.config, dish, mode); return <button key={mode} disabled={!q.ok} onClick={() => run({ type: 'restock', dish, mode })}>{t('stock.buy', { action: mode === 'one' ? t('stock.one') : mode === 'bulk' ? t('stock.bulk', { n: c.inventory.bulkSize }) : t('stock.full'), cost: num(q.cost) })}</button>; })}</div>}</div>)}</div><button className="secondary full" onClick={() => run({ type: 'emergencyPack' })}>{t('stock.emergency')}</button></>}
      {sheet === 'upgrades' && <><button className="sign-entry full kitchen-entry" onClick={() => { setSheet(null); setSelectedEquipment('kitchen'); }}><Sprite id={`kitchen-lv${Math.max(1, kitchen.level)}`} /><span><strong>{t('kitchen.live')}</strong><small>{t('kitchen.slots', { busy: kitchen.busy, total: kitchen.slots })}</small></span><span aria-hidden="true">›</span></button><button className="sign-entry full" onClick={() => open('flyer')}><Sprite id="flyer-bundle" /><span><strong>{t('flyer.title')}</strong><small>{t('flyer.stock', { n: flyers.stock, cap: c.unlocks.flyer.stockCap })}</small></span><span aria-hidden="true">›</span></button><button className="sign-entry full" onClick={() => open('signboard')}><Sprite id={`sign-${w.signStyle ?? 'wood'}`} /><span><strong>{t('sign.title')}</strong><small>{w.signStyle ? t(`sign.${w.signStyle}`) : t('sign.notInstalled')}</small></span><span aria-hidden="true">›</span></button><button className="dog-entry full" onClick={() => open('dog')}><Sprite id={`dog-idle-lv${w.dogLevel || 1}`} /><span><strong>{t('dog.title')}</strong><small>{t(`dog.level${w.dogLevel}`)}</small></span><span aria-hidden="true">›</span></button><h3>{t('business.title')}</h3>{businessCards()}<p className="sheet-intro">{t(inShift ? 'upgrade.outside' : 'upgrade.copy')}</p><div className="upgrade-grid">{EQUIPMENT.map(upgradeCard)}</div><h3>{t('upgrade.tables')}</h3><div className="upgrade-grid">{w.tables.map((table, i) => { const next = c.upgrades.table.levels[table.level]; return <div className="upgrade-card" key={table.id}><Sprite id={`table-lv${table.level}-empty`} /><h3>{t('table', { n: i + 1 })}</h3><p>{t('table.seats', { n: table.capacity })}</p><button disabled={!next || inShift} onClick={() => run({ type: 'upgradeTable', tableId: table.id })}>{next ? t('upgrade.buy', { cost: num(next.priceBase) }) : t('upgrade.max')}</button></div>; })}</div><button className="secondary full" onClick={() => run({ type: 'buyTable' })}>{t('upgrade.addTable')}</button></>}
      {sheet === 'book' && (shift ? <>{questsRevealed && <button className="secondary full" onClick={() => open('quests')}>{t('quests.title')}</button>}<p className="sheet-intro">{t('shift')} · {time(Math.min(shift.closedAt ?? w.now, shift.endsAt) - shift.startedAt - shift.pausedMs)}<b>{t(`weather.${shift.weather}`)}</b></p><dl className="ledger">{(['served', 'lost', 'payment', 'tip', 'penalty', 'spent'] as const).map(key => <div key={key}><dt>{t(`book.${key}`)}</dt><dd>{num(shift.stats[key])}</dd></div>)}{(shift.stats.deliveryCompleted ?? 0) > 0 && <><div><dt>{t('book.deliveryCompleted')}</dt><dd>{shift.stats.deliveryCompleted}</dd></div><div><dt>{t('book.deliveryNet')}</dt><dd>{num(shift.stats.deliveryNet ?? 0)}</dd></div></>}{(shift.stats.deliveryMissed ?? 0) > 0 && <div><dt>{t('book.deliveryMissed')}</dt><dd>{shift.stats.deliveryMissed}</dd></div>}{shift.stats.wellRestedBonus > 0 && <div><dt>{t('book.wellRestedBonus')}</dt><dd>{num(shift.stats.wellRestedBonus)}</dd></div>}<div className="ledger-total"><dt>{t('book.net')}</dt><dd>{num(shift.stats.credited - shift.stats.penalty - shift.stats.spent)}</dd></div></dl><button className="secondary full" onClick={() => open('flyer')}>{t('flyer.title')}</button>{rushReports.length > 0 && <table className="rush-report"><caption>{t('book.rushes')}</caption><thead><tr><th scope="col">{t('book.rushKind')}</th><th scope="col">{t('book.rushServed')}</th><th scope="col">{t('book.rushLost')}</th><th scope="col">{t('book.rushRevenue')}</th></tr></thead><tbody>{rushReports.map(e => <tr key={e.id}><th scope="row">{t(`rush.${e.data.kind}`)}</th><td>{num(Number(e.data.served))}</td><td>{num(Number(e.data.lost))}</td><td>{num(Number(e.data.revenue))}</td></tr>)}</tbody></table>}{inShift && <div className="button-stack"><button className="primary" onClick={() => run({ type: 'endShift' })}>{t('book.end')}</button><button className="secondary" disabled={!c.shift.kickAllAllowed} onClick={() => { setCloseShift(shift.id); open('close'); }}>{t('book.kick', { cost: num(closeQuote.cost) })}</button></div>}</> : <p>{t('book.none')}</p>)}
      {sheet === 'journey' && <>
        <div className="journey-summary"><span>{t('journey.current')}</span><h3>{levelName(w.lifePath)}</h3><p>{num(w.lifetimeEarned)} {t('journey.earned')}</p>{nextMilestone && <><progress aria-label={t('journey.next', { name: levelName(nextMilestone.index) })} max={nextMilestone.lifetimeBase} value={Math.min(w.lifetimeEarned, nextMilestone.lifetimeBase)} /><p>{t('journey.next', { name: levelName(nextMilestone.index) })}</p></>}</div>
        <div className="progress-wallet"><span>{t('reward.badgeShard')} <b>{w.badgeShards}</b></span><span>{t('reward.cosmeticToken')} <b>{w.cosmeticTokens}</b></span></div>
        <ol className="milestone-list">{path.rows.map(row => <li key={row.id} data-level={row.index} className={row.index === w.lifePath ? 'current' : ''}>
          <header><span className="milestone-number">{row.index}</span><h3>{levelName(row.index)}</h3><span className={`milestone-state ${row.claimable ? 'claimable' : ''}`}>{t(row.index === 0 ? 'journey.reached' : row.claimed ? 'journey.claimed' : row.claimable ? 'journey.claimable' : 'journey.locked')}</span></header>
          {row.index > 0 && <p className="milestone-rewards">{num(row.rewardCoinBase)} {t('coins')}{row.extra.map((reward, index) => <span key={index}> · {t(`reward.${reward}`)}</span>)}</p>}
          {!row.reached && requirementList(row.requirements)}
          {row.claimable && <button className="primary" onClick={() => run({ type: 'claimLifePath', level: row.index })}>{t('journey.claim', { name: levelName(row.index) })}</button>}
        </li>)}</ol><button className="secondary full" onClick={() => open('upgrades')}>{t('journey.upgrades')}</button>
      </>}
      {sheet === 'settings' && <div className="settings-list"><label>{t('settings.language')}<select value={locale} onChange={e => setPrefs({ locale: e.target.value as 'vi' | 'en' })}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><button className="setting-row" onClick={() => setPrefs({ muted: !settings.muted })}><span>{t('settings.sound')}</span><b>{t(settings.muted ? 'settings.soundOff' : 'settings.soundOn')}</b></button><p>{t('settings.saved')}</p><button onClick={() => download(encodeSave(game), 'tbh-backup.json')}>{t('settings.export')}</button><button onClick={() => { setPrefs({ guideDone: false, guideIndex: 0 }); setSheet(null); }}>{t('settings.guide')}</button><button onClick={() => open('config')}>{t('settings.config')}</button></div>}
      {sheet === 'config' && <><p>{t('config.pinned', { version: game.config.version })}</p><pre className="config-json">{JSON.stringify(game.config.raw, null, 2)}</pre></>}
    </SheetDialog>}
    {selectedEquipment && <SheetDialog title={t(`equipment.${selectedEquipment}`)} close={() => setSelectedEquipment(null)}><div className="equipment-detail">{selectedEquipment === 'kitchen' && <Kitchen status={kitchen} t={t} onTable={tableId => { setSelectedEquipment(null); const button = document.querySelector<HTMLButtonElement>(`[data-table-id="${CSS.escape(tableId)}"] .table-object`); if (button) showTable(tableId, button); }} onStock={() => { setSelectedEquipment(null); open('stock'); }} />}{upgradeCard(selectedEquipment)}{inShift && <p>{t('upgrade.outside')}</p>}</div></SheetDialog>}
    {selectedTable && (() => {
      const table = w.tables.find(x => x.id === selectedTable)!; const o = table.order;
      const active = o && ['pending', 'grace'].includes(o.state);
      const ready = active && o.items.every(i => i.state === 'ready');
      const stale = active && o.items.some(i => i.glassId && i.readyAt !== null && w.now >= i.readyAt + freshnessMs(w, game.config));
      const guests = currentGuests(table);
      const type = guests.find(x => x.type === 'vip')?.type ?? guests.find(x => x.type !== 'thuong')?.type ?? 'thuong';
      const dishes = active ? orderDishes(o) : [];
      return <section ref={orderPanelRef} id="active-table-order" className={`order-panel ${o?.state === 'grace' ? 'is-urgent' : ''}`} role="dialog" aria-label={t('table', { n: w.tables.indexOf(table) + 1 })}>
        <header><span className={`customer-tag type-${type}`}>{guests.length ? t(`customer.${type}`) : t('table.empty')}</span><span>{t('table', { n: w.tables.indexOf(table) + 1 })}</span><button className="icon-button" aria-label={t('close')} onClick={() => setSelectedTable(null)}><Icon name="close" /></button></header>
        {active ? <><div className="order-heading"><strong>{dishes.length === 1 ? t(`dish.${dishes[0].dish}`) : t('order.dishCount', { n: dishes.length })}</strong><b>{orderTime(o)}</b></div>
          <div className="order-dishes">{dishes.map(({ dish, items }) => <div key={dish} className={items.every(i => i.state === 'ready') ? 'dish-ready' : ''}><Sprite id={menuAsset[dish]} /><strong>{t(`dish.${dish}`)}</strong>{items.every(i => i.state === 'ready') && <Icon name="check" />}<span>{items.filter(i => i.state === 'ready').length}/{items.length}</span></div>)}</div>
          {kitchen.jobs.some(job => job.orderId === o.id && job.state !== 'ready') && <button className="secondary full kitchen-link" onClick={() => { setSelectedTable(null); setSelectedEquipment('kitchen'); }}>{t('kitchen.live')}</button>}
          {(stale || o.state === 'grace') && <p className="order-warning">{t(stale ? 'order.stale' : 'order.grace')}</p>}
          <button className="primary full" disabled={!ready} onClick={() => { if (run({ type: 'serve', tableId: table.id, orderId: o.id }).ok) setSelectedTable(null); }}><Icon name="check" />{t('order.serve')}</button>
        </> : <p className="idle-table-info">{t(`table.${table.state}`)} · {t('table.seats', { n: table.capacity })}</p>}
      </section>;
    })()}

  </div>;
}
