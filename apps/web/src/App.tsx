import { shiftLocationReport } from '../../shared/shift-location';
import { Account, LoginInvitation } from './Account';
import { canInvite, type LoginTouchpoint } from './login-prompt';
import { SeasonHistory } from './SeasonHistory';
import { Seasons } from './Seasons';
import { Leaderboard } from './Leaderboard';
import { Locations } from './Locations';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { buyGlassQuote, buyTableQuote, buyChairQuote, tableUpgradeQuote, chairUpgradeQuote, tableUpgrade, tableBenefit, effectiveTableLevel, chairPatienceMult, trayDishes, tableSlots, guestPatienceLeft, isEconomy2, isSeatModel, PAIR, BUSINESS_UNLOCKS, menuReport, orderPreparation, beerStatus, washerStatus, kitchenStatus, flyerQuote, SIGN_STYLES, signboardQuote, DISHES, EQUIPMENT, currentGuests, deliveryQuote, dogUpgradeQuote, encodeSave, freshnessMs, kickAllQuote, kickTableQuote, kickTableRule, lifePathStatus, restockQuote, restRequired, rushStatus, stockCap, unlockQuote, upgradeQuote, wellRestedRemaining, type BusinessUnlock, type Command, type Equipment, type Order, type RequirementStatus, type Table, type DomainEvent, type Game } from '../../../packages/engine/src';
import { Sprite, TableSeats, chairAsset, menuAsset, reactions, hasSpriteArt, trayAsset } from './assets';
import { translate } from './i18n';
import { advanceGuide, dispatch, download, openingConfig, readSettings, writeSettings, replaceSave, type BootSession } from './local';
import { Quests } from './Quests';
import { Kitchen } from './Kitchen';
import { MenuReport } from './MenuReport';
import { UpgradeHint } from './UpgradeHint';
import { start, type StartState, type Session } from './start';
import { createSound } from './audio';
import { Icon } from './Icon';
import { DoorQueue, type TurnedAway } from './DoorQueue';
import { FlyingFeedback, type Floater } from './FlyingFeedback';
import { idleToGuideMs, revealed } from './reveal';
import { savedLocale } from './locale';
import { beerOut, firstGoal, pickSpotlight } from './spotlight';
import { GoalChip, say } from './GoalChip';
import { listGoals, pickNextGoal, type Goal } from './goals';
import { leaveRows, pairsWithoutSeat } from './leave-reasons';
import { batchToast, type BatchToast } from './batch-toast';
import { HINT_TARGET, hintRules, holds as hintHolds, nextHint, type Hint, type HintTarget } from './hints';
import { rushRecap, type RushRecap } from './rush-recap';

// Owner 2026-09-11: risk features are deferred; legacy UI remains testable only in an explicit dev preview.
const guestOnly = import.meta.env.VITE_TBH_GUEST_ONLY === '1';
const showDeferredRisk = import.meta.env.DEV && import.meta.env.VITE_TBH_RISK_PREVIEW === '1';
declare const __TBH_COMMIT__: string;

type Sheet = 'account' | 'seasons' | 'locations' | 'stock' | 'upgrades' | 'book' | 'close' | 'journey' | 'settings' | 'config' | 'dog' | 'delivery' | 'signboard' | 'flyer' | 'quests' | 'buyTable' | 'rush' | null;
const time = (ms: number) => `${Math.floor(Math.max(0, ms) / 60000).toString().padStart(2, '0')}:${Math.floor(Math.max(0, ms) / 1000 % 60).toString().padStart(2, '0')}`;
const orderDishes = (order: Order) => DISHES.map(dish => ({ dish, items: order.items.filter(i => i.dish === dish) })).filter(x => x.items.length);

function SheetDialog({ title, close, children, view, pausedLabel }: { title: string; close: () => void; children: ReactNode; view?: string; pausedLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); }; }, []);
  useEffect(() => { if (view) ref.current?.querySelector<HTMLButtonElement>('.sheet-header button')?.focus(); }, [view]);
  return <dialog ref={ref} className="sheet" aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="sheet-inner"><div className="sheet-handle" /><header className="sheet-header"><h2>{title}</h2><button className="icon-button" aria-label={title + ' ×'} onClick={close}><Icon name="close" /></button></header><p className="sheet-pause" role="status"><span aria-hidden="true">Ⅱ</span>{pausedLabel}</p><div className="sheet-content">{children}</div></div>
  </dialog>;
}

/** Owner 2026-09-17 (FEEDBACK I.1): no language screen. The game opens in Vietnamese; a saved English choice stays; Settings switches it. */
export function App() {
  const locale = savedLocale();
  useEffect(() => { document.documentElement.lang = locale; document.title = translate(locale, 'brand'); }, [locale]);
  return <StartedApp />;
}
function StartedApp() {
  const [state, setState] = useState<StartState | null>(null);
  const [mode, setMode] = useState<'guest' | 'google' | null>(null);
  const t = (key: string) => translate(readSettings().locale, key);
  useEffect(() => { let active = true; void start().then(value => { if (active) setState(value); else if ('reauth' in value) { void value.reauth.close(); } else if ('session' in value) { value.session.storage?.close(); if ('remote' in value.session) value.session.remote.close(); } }); return () => { active = false; }; }, []);
  const choose = async (mode: 'local' | 'remote' | 'reauthenticate') => { setState(null); setState(await start(mode)); };
  if (state && 'reauth' in state) return <main className="recovery"><h1>{t('brand')}</h1><Account remote={state.reauth} locale={readSettings().locale} t={t} close={() => void state.reauth.close().then(() => choose('remote'))} /></main>;
  if (state && 'session' in state) {
    const remote = 'remote' in state.session ? state.session.remote : null;
    if (remote?.identity.provider === 'guest' && !mode && sessionStorage.getItem('tbh.playing') !== remote.identity.playerId) {
      const play = (next: 'guest' | 'google') => { sessionStorage.setItem('tbh.playing', remote.identity.playerId); setMode(next); };
      return <main className="language-entry"><section className="welcome-content" aria-label={t('account.modes')}>
        <Sprite id="glass-full" /><h1>{t('brand')}</h1><h2>{t('account.modes')}</h2>
        <button className="primary" onClick={() => play('google')}>{t('account.signIn')}</button><p>{t('account.savedCopy')}</p>
        <button className="secondary" onClick={() => play('guest')}>{t('account.playGuest')}</button><p>{t('account.guestCopy')}</p>
      </section></main>;
    }
    return <GameView session={state.session} initialAccount={mode === 'google'} onAccountChange={() => void choose('remote')} onReauthenticate={() => void remote?.close().then(() => choose('reauthenticate'))} />;
  }
  return <main className="recovery"><h1>{t('brand')}</h1>{!state ? <p role="status">{t('save.loading')}</p> : 'local' in state ? <>
    <h2>{t('network.localTitle')}</h2><p>{t('network.localCopy')}</p>
    <button onClick={() => download(state.local, 'tbh-original-save.json')}>{t('save.downloadOriginal')}</button>
    {state.legacy && state.local !== state.legacy && <button onClick={() => download(state.legacy!, 'tbh-legacy-save.json')}>{t('save.downloadLegacy')}</button>}
    <button onClick={() => void choose('local')}>{t('network.keepLocal')}</button><button onClick={() => void choose('remote')}>{t('network.newServer')}</button>
  </> : <><p role="alert">{t(`network.${['otherTab', 'invalidSession', 'conflict', 'storage'].includes(state.error) ? state.error : 'unavailable'}`)}</p>{['invalidSession', 'conflict'].includes(state.error) && <button className="primary" onClick={() => void choose('reauthenticate')}>{t('account.reauthenticate')}</button>}<button onClick={() => location.reload()}>{t('save.retry')}</button></>}</main>;
}
function GameView({ session, onAccountChange, onReauthenticate, initialAccount = false }: { session: Session; onAccountChange: () => void; onReauthenticate: () => void; initialAccount?: boolean }) {
  const remote = 'remote' in session ? session.remote : null;
  const game = session.game, w = game.world, c = game.config.values;
  const show = revealed(w, game.config);
  const prefs = useRef(readSettings());
  const [sound] = useState(() => createSound(game.config, prefs.current.muted));
  const [frame, setFrame] = useState(0);
  const [, setSettingsVersion] = useState(0);
  const settings = prefs.current;
  const [sheet, setSheet] = useState<Sheet>(initialAccount ? 'account' : null);
  const shiftLocation = sheet === 'book' ? ('remote' in session ? session.remote.shiftLocation : shiftLocationReport(session.game.world, session.game.config)) : null;
  const scrollToTables = useRef(false);
  function focusTables() {
    const heading = document.getElementById('upgrade-tables');
    heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start' });
  }
  useEffect(() => {
    if (sheet === 'upgrades' && scrollToTables.current) { scrollToTables.current = false; focusTables(); }
  }, [sheet]);
  const [invitation, setInvitation] = useState<LoginTouchpoint | null>(null);
  const [closeShift, setCloseShift] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const menuPaused = Boolean(sheet || selectedEquipment || remote?.accountBusy);
  const menuPause = useRef(menuPaused);
  const [saveError, setSaveError] = useState<boolean | 'conflict'>(false);
  const [saving, setSaving] = useState(false);
  const saveSequence = useRef(0);
  const [recoveryError, setRecoveryError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<BatchToast | null>(null);
  const [hint, setHint] = useState<Hint | null>(null); // hints.ts: the one just-in-time hint on screen (founder 2026-10-22, B2)
  const [recap, setRecap] = useState<RushRecap | null>(null); // rush-recap.ts: the card of the rush that just ended (B2.6), nothing stored
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [turnedAway, setTurnedAway] = useState<TurnedAway[]>([]);
  const floaterId = useRef(0);
  const lastTouch = useRef(Date.now());
  const cursor = useRef(w.events.length);
  const orderPanelRef = useRef<HTMLElement>(null);
  const tableTrigger = useRef<{ button: HTMLButtonElement; fallback: HTMLButtonElement | null } | null>(null);
  const locale = settings.locale;
  const t = (key: string, params: Record<string, string | number> = {}) => translate(locale, key, params);
  const num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(n));
  const decimal = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 }).format(n); // 1,15 in Vietnamese, 1.15 in English
  const orderTime = (o: Order) => t('order.time', { s: Math.ceil(Math.max(0, o.placedAt + o.patienceMs + (o.state === 'grace' ? c.patience.graceMs : 0) - w.now) / 1000) });
  const save = async () => {
    const sequence = ++saveSequence.current; setSaving(true);
    try { if (!remote) await session.storage!.save(game as Game); writeSettings(prefs.current); if (sequence === saveSequence.current) setSaveError(false); }
    catch (error) { if (sequence === saveSequence.current) setSaveError(error instanceof Error && error.message === 'storage:conflict' ? 'conflict' : true); }
    finally { if (sequence === saveSequence.current) setSaving(false); }
  };
  const tableEl = (id: unknown) => document.querySelector(`[data-table-id="${CSS.escape(String(id))}"] .table-object`);
  // F27/P0(b): a changed number leaves from whatever changed it; coins land in the wallet, lost reputation falls.
  const launch = (kind: Floater['kind'], from: Element | null, text = '') => {
    if (!from) return;
    const a = from.getBoundingClientRect(), b = kind === 'coin' ? document.querySelector('.money')?.getBoundingClientRect() : undefined;
    const x = a.left + a.width / 2, y = a.top + a.height / 2;
    // config-exempt: purely visual flourish (coin count, stagger, fall distance, lifetime)
    const rows: Floater[] = Array.from({ length: kind === 'coin' ? 3 : 1 }, (_, i) => ({ id: ++floaterId.current, kind, x, y, dx: b ? b.left + b.width / 2 - x : 0, dy: b ? b.top + b.height / 2 - y : 56, delay: i * 90, text }));
    setFloaters(list => [...list, ...rows]);
    setTimeout(() => setFloaters(list => list.filter(f => !rows.some(r => r.id === f.id))), 1500);
  };
  const processEvents = (incoming?: DomainEvent[]) => {
    const events = incoming ?? game.world.events.slice(cursor.current); cursor.current = game.world.events.length;
    advanceGuide(prefs.current, game, events);
    for (const e of events) {
      sound.event(e);
      if (e.type === 'order_expired') setSelectedTable(current => current === e.data.tableId ? null : current);
      if (e.type === 'order_served') launch('coin', tableEl(e.data.tableId));
      if (e.type === 'order_expired' && Number(e.data.reputation)) launch('rep', tableEl(e.data.tableId), `−${num(Number(e.data.reputation))}`);
      if (e.type === 'customer_left' && e.data.reason === 'queue' && Number(e.data.reputation)) launch('rep', document.querySelector('.door'), `−${num(Number(e.data.reputation))}`);
      if (e.type === 'table_kicked' && Number(e.data.reputation)) launch('rep', tableEl(e.data.tableId), `−${num(Number(e.data.reputation))}`); // Wave 3: the reputation a send-home took falls from that table
      if (e.type === 'queue_overflow') {
        const row = { id: e.id, size: Number(e.data.size) };
        setTurnedAway(list => [...list, row]);
        setTimeout(() => setTurnedAway(list => list.filter(x => x.id !== row.id)), 2200); // config-exempt: transient door feedback lifetime
      }
      if (e.type === 'shipper_missed' || e.type === 'shipper_completed') setSheet(current => current === 'delivery' ? null : current);
      // Founder 2026-10-22 (B2.6): a rush that ends while the shift runs leaves a one-tap card that pauses like a sheet; never over another sheet, and not when the
      // shift is closing (its book shows the rush). Built from the rush's own events.
      if (e.type === 'rush_ended' && game.world.phase === 'open' && !menuPause.current) { const card = rushRecap(game.world.events, e); if (card) { setRecap(card); setSelectedTable(null); setSheet(current => current ?? 'rush'); } }
      if (e.type === 'shift_closed') { setSelectedTable(null); setSheet('book'); }
    }
    // One toast per batch (batch-toast.ts): the last reward wins, a loss names ONE reason and replaces it, a refused group never hides a reward.
    const batch = batchToast(events, (key, params) => translate(prefs.current.locale, key, params));
    if (batch) setToast(batch);
    return events.length;
  };
  const run = async (cmd: Command) => {
    const result = remote ? await remote.command(cmd) : dispatch(game as Game, cmd);
    // A refusal names its own number where it has one: the tables a second chair waits for (reason.chairsLocked / error.chairsLocked carry {n} from the config).
    if (!result.ok) { sound.play('ui:denied'); setToast({ text: t(`error.${result.reason}`, { n: num(isSeatModel(c) ? c.upgrades.table.chairsAfterTables : 0) }), kind: 'error' }); }
    else if (cmd.type === 'restock' || cmd.type === 'upgrade') setToast({ text: t(cmd.type === 'restock' ? 'stock.success' : 'upgrade.success'), kind: 'early' });
    if (result.ok && cmd.type === 'upgradeDog') { setSheet(null); setToast({ text: t('dog.success', { n: game.world.dogLevel }), kind: 'early' }); }
    if (result.ok && cmd.type === 'activateFlyer') { setSheet(null); setToast({ text: t('flyer.started'), kind: 'early' }); }
    if (result.ok && cmd.type === 'buyUnlock') setToast({ text: t('business.success', { name: t(`business.${cmd.item}`) }), kind: 'early' });
    if (result.ok && cmd.type === 'claimLifePath') setToast({ text: t('journey.received', { n: num(result.amount ?? 0) }), kind: 'early', gain: result.amount });
    if (result.ok && (cmd.type === 'endShift' || cmd.type === 'kickAll')) setSheet(game.world.phase === 'resting' ? 'book' : null);
    if (!remote) processEvents(); void save(); setFrame(x => x + 1);
    return result;
  };
  const syncActivity = () => {
    const active = !document.hidden, paused = menuPause.current;
    if (remote) { remote.setPresence(active, paused); return; }
    if (w.active !== active || Boolean(w.paused) !== (active && paused)) void run({ type: 'activity', active, paused: active && paused });
  };
  useLayoutEffect(() => {
    menuPause.current = menuPaused;
    if (!session.error) syncActivity();
  }, [menuPaused]);
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
  useEffect(() => {
    setInvitation(null);
    const reason = sheet === 'book' ? 'firstShift' : sheet === 'seasons' ? 'leaderboard' : null;
    const guest = remote?.identity.provider === 'guest';
    if (reason && canInvite(prefs.current, game, guest, reason)) {
      setInvitation(reason);
      setPrefs({ loginPromptPlayer: game.world.playerId, loginPromptShift: game.world.completedShifts });
    } else if (sheet === 'account' && guest) {
      // An explicitly opened account panel also counts as seeing the same benefits.
      setPrefs({ loginPromptPlayer: game.world.playerId, loginPromptShift: game.world.completedShifts });
    }
  }, [sheet, w.completedShifts, remote?.identity.provider]);
  const showTable = (id: string, button: HTMLButtonElement) => {
    tableTrigger.current = { button, fallback: button.closest('.table-space')?.querySelector<HTMLButtonElement>('.table-object') ?? null };
    setSelectedTable(id);
  };
  useEffect(() => {
    sound.play(sheet || selectedEquipment || selectedTable ? 'ui:sheet_open' : 'ui:sheet_close');
  }, [sheet, selectedEquipment, selectedTable]);
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
    if (remote) { remote.onChange = events => {
      if (remote.world.playerId !== w.playerId) { remote.onChange = () => {}; void remote.close().then(onAccountChange); return; }
      if (events.length) { processEvents(events); void save(); } setFrame(x => x + 1);
    }; remote.start(); }
    const tick = remote ? undefined : setInterval(() => { (game as Game).advance(Math.max(Date.now(), w.now)); if (processEvents()) void save(); setFrame(x => x + 1); }, 100); // config-exempt: UI refresh cadence
    const checkpoint = remote ? undefined : setInterval(save, 1000); // config-exempt: local IO batching cadence
    const visibility = () => syncActivity();
    const pagehide = () => { if (remote) remote.setPresence(false, menuPause.current); else { dispatch(game as Game, { type: 'activity', active: false }); void save(); } };
    const online = () => remote?.setPresence(!document.hidden, menuPause.current);
    window.addEventListener('online', online);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.storage?.saving) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (e: MouseEvent) => { if ((e.target as Element).closest('button,select')) sound.play('ui:tap'); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedTable(null); };
    document.addEventListener('keydown', escape);
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide); window.addEventListener('beforeunload', beforeUnload);
    return () => { remote?.close(); window.removeEventListener('online', online); clearInterval(tick); clearInterval(checkpoint); document.removeEventListener('keydown', escape); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', click, true); window.removeEventListener('pagehide', pagehide); window.removeEventListener('beforeunload', beforeUnload); sound.mute(true); };
  }, []);
  // F27: no tap for `idleToGuideMs` while a shift runs and nobody was ever served -> the step guide steps in as a fallback.
  useEffect(() => {
    if (session.error) return;
    const touch = () => { lastTouch.current = Date.now(); };
    document.addEventListener('pointerdown', touch, true); document.addEventListener('keydown', touch, true);
    const watch = setInterval(() => {
      if (document.hidden || menuPause.current || game.world.phase !== 'open') { touch(); return; }
      if (Date.now() - lastTouch.current < idleToGuideMs(game.config)) return;
      touch(); advanceGuide(prefs.current, game, [], 'ui_idle'); void save(); setFrame(x => x + 1);
    }, 1000); // config-exempt: idle watcher cadence
    return () => { document.removeEventListener('pointerdown', touch, true); document.removeEventListener('keydown', touch, true); clearInterval(watch); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), toast.gain !== undefined ? 2400 : 5000); // config-exempt: transient UI feedback lifetime
    return () => clearTimeout(handle);
  }, [toast]);

  if (session.error) return <main className="recovery"><h1>{t('brand')}</h1><p role="alert">{t(session.error === 'corrupt' ? 'save.corrupt' : session.error === 'conflict' ? 'save.conflict' : 'save.storageUnavailable')}</p>
    {session.original !== null && <button onClick={() => download(session.original!, 'tbh-original-save.json')}>{t('save.downloadOriginal')}</button>}
    {session.legacy != null && <button onClick={() => download(session.legacy!, 'tbh-legacy-save.json')}>{t('save.downloadLegacy')}</button>}
    {session.error === 'corrupt' && <><label>{t('save.import')}<input type="file" accept="application/json,.json" onChange={async e => {
      const file = e.currentTarget.files?.[0]; if (!file) return;
      try { await replaceSave(await file.text(), session as BootSession); location.reload(); } catch { setRecoveryError(true); }
    }} /></label>
    {recoveryError && <p role="alert">{t('save.importError')}</p>}
    {confirmReset ? <><p>{t('save.resetConfirm')}</p><button onClick={async () => { try { await replaceSave(null, session as BootSession); location.reload(); } catch { setRecoveryError(true); } }}>{t('save.resetYes')}</button><button onClick={() => setConfirmReset(false)}>{t('save.cancel')}</button></> : <button onClick={() => setConfirmReset(true)}>{t('save.reset')}</button>}</>}
    <button onClick={() => location.reload()}>{t('save.retry')}</button></main>;

  const shift = w.shift, inShift = w.phase !== 'resting';
  // D8 (rules 28): the first shifts of a save open at once, so between them the stamina is not a wait. The bar and the rest line ask `restRequired` of the
  // snapshot the next opening will use: locally `openingConfig` (the bundle when the pin is older, as `dispatch` sends it). Remote mode keeps the pin of the
  // server snapshot, but the server opens a new shift with `registry.resolve(id, now)`: after a registry publication the two can differ, so a remote player in
  // the first shifts may see a wait the opening does not ask (open item, BLOCKERS `07 · remote rest line …`).
  const mustRest = restRequired(w, remote ? game.config : openingConfig(game as Game)), energyMs = inShift || mustRest ? w.staminaMs : c.shift.durationMs;
  const rush = rushStatus(w, game.config);
  const rushReports = sheet === 'book' ? w.events.filter(e => e.type === 'rush_ended' && e.data.shiftId === shift?.id) : [];
  const kitchen = kitchenStatus(w, game.config);
  const beer = beerStatus(w, game.config), washer = washerStatus(w, game.config);
  const beerRestock = restockQuote(w, game.config, 'bia', 'full');
  const lowBeerStock = beerRestock.quantity > 0 && w.inventory.bia < beer.batchSize;
  const beerInventory = t('beer.inventory', { n: w.inventory.bia, cap: stockCap(w, game.config) });
  const pouredBeer = t('beer.poured', { ready: beer.serveNow, max: beer.capacity, batch: beer.batchSize, s: beer.durationMs / 1000 }); // "rót sẵn n": the beers a guest can get right now
  const flyers = flyerQuote(w, game.config);
  const flyerReport = sheet === 'flyer' ? w.events.filter(e => e.type === 'flyer_ended').at(-1) : undefined;
  const dogQuote = dogUpgradeQuote(w, game.config);
  const delivery = deliveryQuote(w, game.config);
  const deliveryUrgent = delivery && delivery.remainingMs / c.customerTypes.shipper.deadlineMs < c.tip.patienceThreshold;
  const path = lifePathStatus(w, game.config), nextMilestone = path.rows[w.lifePath + 1];
  const claimCount = path.rows.filter(row => row.claimable).length;
  const guide = settings.guideIndex === null ? null : c.onboarding.stepGuide.steps[settings.guideIndex];
  const showGuide = c.onboarding.enabled && guide && (!guide.onlyAfter || w.completedShifts > 0);
  // Founder 2026-10-22 (B2): one just-in-time hint at a time (hints.ts), never over a sheet, the order panel or the step guide (they share one banner slot);
  // shown once (`hintsDone`), it stays while its moment lasts or until tapped away.
  const hintBlocked = Boolean(sheet || selectedEquipment || selectedTable || showGuide);
  const dismissedHint = useRef('');
  useEffect(() => {
    if (hint) { if (!hintHolds(hint, w, game.config, show.upgrades)) setHint(null); return; }
    const candidate = hintBlocked ? null : nextHint(w, game.config, prefs.current.hintsDone, { spotBusy: spot.target !== null, upgrades: show.upgrades });
    if (!candidate || `${candidate.id}:${candidate.since}` === dismissedHint.current) return;
    setHint(candidate);
    if (!prefs.current.hintsDone.includes(candidate.id)) prefs.current.hintsDone = [...prefs.current.hintsDone, candidate.id];
    try { writeSettings(prefs.current); } catch { setSaveError(true); }
  });
  const cleanGlasses = w.glasses.filter(g => g.state === 'clean').length;
  const restedMs = wellRestedRemaining(w);
  const closeQuote = kickAllQuote(w, game.config);

  const report = remote ? remote.menu : sheet === 'book' || sheet === 'upgrades' ? menuReport((game as Game).world, game.config) : null;
  const leave = report && shift ? leaveRows(report.losses, shift.stats.rejected) : []; // the shift book's "why guests left", most first
  const pairs = shift ? pairsWithoutSeat(shift.stats) : 0; // S3: pairs turned away at the door for lack of a two-chair table
  // Founder 2026-10-22 (B2.5): "Khách bỏ đi" split so the book's counts add up to its reasons: a guest who gave up in the queue never sat down, so he could not get in.
  const queueLeft = report?.losses.queue ?? 0, leftSeated = shift ? Math.max(0, shift.stats.lost - queueLeft) : 0, noEntry = shift ? shift.stats.rejected + queueLeft : 0;
  const guideOrder = w.tables.filter(table => table.order && ['pending', 'grace'].includes(table.order.state))
    .sort((a, b) => a.order!.placedAt + a.order!.patienceMs - b.order!.placedAt - b.order!.patienceMs)[0]?.order;
  // F27/P0(a): at most one element carries data-spotlight; first-play also gets a pointer arrow on it.
  const spot = pickSpotlight(w, game.config, { sheet, dialogOpen: Boolean(sheet || selectedEquipment) });
  const goal = firstGoal(w, game.config), beerEmpty = beerOut(w, game.config);
  const nextGoal = pickNextGoal(w, game.config), next = settings.goalChip ? nextGoal : null; // the chip; the Settings switch only hides it
  // S6 (D10): a quick "Mua ghế" on the HUD that does not pause, the way "Nhập bia" does: only while a second chair is the registry's next goal AND the wallet pays it
  // (the sensible next step, D18: chairs come after the tables and before the levels); otherwise nothing is shown, the chip already says what is missing.
  const quickChair = show.upgrades && nextGoal && nextGoal.card.kind === 'buyChair' && nextGoal.cost !== null && w.coins >= nextGoal.cost
    ? { tableId: nextGoal.card.tableId, n: w.tables.findIndex(x => x.id === (nextGoal.card as { tableId: string }).tableId) + 1, cost: nextGoal.cost } : null;
  const slots = tableSlots(w, game.config); // S6 (D13): the yard draws every place of the current location, the unbought ones as empty spots
  const leaveFree = toast?.loss ? !toast.loss.coins && !toast.loss.reputation : false; // a group turned away at the door costs nothing
  const leaveLabel = !toast?.loss ? '' : toast.reason && leaveFree ? t('loss.ariaFree', { reason: t(`leave.${toast.reason}`) })
    : toast.reason ? t('loss.ariaReason', { reason: t(`leave.${toast.reason}`), coins: num(toast.loss.coins), reputation: num(toast.loss.reputation) })
    : t('loss.aria', { coins: num(toast.loss.coins), reputation: num(toast.loss.reputation) });
  const sheetGoals = sheet === 'upgrades' || sheet === 'buyTable' ? listGoals(w, game.config) : [], sheetGoal = sheet === 'upgrades' && !show.upgradeList ? pickNextGoal(w, game.config) : null;
  const goalTarget = useRef<string | null>(null);
  useEffect(() => {
    if (sheet !== 'upgrades' || !goalTarget.current) return;
    const card = document.querySelector<HTMLElement>(`[data-goal="${goalTarget.current}"]`); goalTarget.current = null;
    card?.setAttribute('data-targeted', ''); card?.scrollIntoView({ block: 'center' }); // plain DOM on purpose: the card unmounts with the sheet and React owns neither attribute
  }, [sheet]);
  const openGoal = (g: Goal) => { goalTarget.current = g.id; open('upgrades'); };
  const lit = (on: boolean) => on ? { 'data-spotlight': '' } : {};
  const hintLit = (target: HintTarget) => !!hint && !hintBlocked && spot.target === null && HINT_TARGET[hint.id] === target;
  const pointer = spot.arrow ? <i className="spotlight-arrow" aria-hidden="true" /> : null;
  const upgradeHint = <UpgradeHint world={w} config={game.config} report={report} t={t} open={kind => {
    if (kind === 'stock') open('stock');
    else if (kind !== 'tables') { setSheet(null); setSelectedEquipment(kind); }
    else if (sheet === 'upgrades') focusTables();
    else { scrollToTables.current = true; open('upgrades'); }
  }} />;

  // Founder 2026-10-22 (B2.1c): the tip window as the serve will judge it (rules.ts customerValue): every guest keeps `tip.patienceThreshold` of their OWN
  // patience (a chair level stretches the order, never this), the order is not in grace and no beer of the tray went flat. The bar and the order card read it.
  const tipWindow = (o: Order, guests: ReturnType<typeof currentGuests>, stale: boolean) => o.state === 'pending' && !stale && guests.every(guest => guestPatienceLeft(w, o, guest) >= c.tip.patienceThreshold);
  function renderTable(table: Table, index: number) {
    const o = table.order, activeOrder = o && ['pending', 'grace'].includes(o.state);
    const ready = activeOrder && o.items.every(i => i.state === 'ready');
    const patience = activeOrder ? Math.max(0, (o.placedAt + o.patienceMs - w.now) / o.patienceMs) : 0;
    const stale = activeOrder && o.items.some(i => i.glassId && i.readyAt !== null && w.now >= i.readyAt + freshnessMs(w, game.config));
    const guests = currentGuests(table), seated = guests.length > 0;
    // The bar counts down the order's own deadline (better chairs stretch it) but turns low with the TIP window (tipWindow above), like the order card's clock.
    const tip = activeOrder && tipWindow(o, guests, Boolean(stale));
    const served = seated && o?.state === 'served' ? w.events.find(e => e.type === 'order_served' && e.data.orderId === o.id) : undefined;
    const feedback = served ? w.serves.filter(s => s.orderId === o?.id).map(s => ({ customerId: s.customerId, kind: s.stale ? 'stale' : served.data.outcome === 'grace' ? 'grace' : s.patienceRatio >= c.tip.patienceThreshold ? s.tip > 0 ? 'early' : 'earlyNoTip' : 'late' })) : [];
    const special = guests.find(x => x.type === 'vip')?.type ?? guests.find(x => x.type !== 'thuong')?.type;
    const here = spot.target && 'tableId' in spot.target && spot.target.tableId === table.id ? spot.target.kind : null;
    const litBubble = Boolean(activeOrder) && here !== null && selectedTable !== table.id, litTable = here === 'seated' && !activeOrder;
    const dishes = trayDishes(c, table), chairLevel = table.chairLevel ?? 1; // S6 (P4): the tray shows the dishes the table's level allows; the chairs show their level
    return <section className={`table-space table-${index} state-${table.state} ${activeOrder ? 'has-order' : ''} ${special ? `guest-${special}` : ''} ${o?.state === 'grace' ? 'is-urgent' : ''} ${selectedTable === table.id ? 'is-selected' : ''}`} key={table.id} data-table-id={table.id} data-chair-level={chairLevel} aria-label={t('table', { n: index + 1 })}>
      {activeOrder && <button {...lit(litBubble)} className={`table-order-hint ${ready ? 'is-ready' : ''} ${o.state === 'grace' ? 'is-urgent' : ''}`} onClick={e => showTable(table.id, e.currentTarget)} aria-label={t('order.details', { n: index + 1 })} aria-describedby={`${o.id}-description ${o.id}-time${tip ? ` ${o.id}-tip` : ''}`}>
        <span className="bubble-dishes" aria-hidden="true">{orderDishes(o).map(({ dish, items }) => <span key={dish} className="bubble-dish"><Sprite id={dish === 'bia' ? stale ? 'glass-stale' : 'glass-full' : menuAsset[dish]} />{items.length > 1 && <b>{items.length}</b>}</span>)}</span>
        <span className="sr-only" id={`${o.id}-description`}>{orderDishes(o).map(({ dish, items }) => `${t(`dish.${dish}`)} × ${items.length}`).join(', ')} · {t(ready ? 'order.ready' : 'table.waiting')}</span>
        <span className="sr-only bubble-time" id={`${o.id}-time`}>{orderTime(o)}</span>
        {tip && <span className="sr-only" id={`${o.id}-tip`}>{t('order.tipOpen')}</span>}
        <span className="bubble-status" aria-label={t(ready ? 'order.ready' : 'table.waiting')}>{ready ? <Icon name="check" /> : '…'}</span>
        <span className={`patience-track ${tip ? 'is-tip' : 'is-low'}`}><i style={{ width: `${patience * 100}%` }} /></span>
        {litBubble && pointer}
      </button>}
      <button {...lit(litTable)} className="table-object" data-level={table.level} aria-haspopup="dialog" aria-controls={selectedTable === table.id ? 'active-table-order' : undefined} onClick={e => showTable(table.id, e.currentTarget)} aria-label={t('order.details', { n: index + 1 })}>
        <TableSeats capacity={table.capacity} chairLevel={chairLevel} customers={guests} feedback={feedback} />
        <Sprite id={`table-lv${table.level}-empty`} />
        <span className="tray" aria-hidden="true" data-dishes={dishes}>{trayAsset.slice(0, dishes).map(id => <Sprite key={id} id={id} />)}</span>
        <span className="table-number">{index + 1}</span>
        {litTable && pointer}
      </button>
      <div className="table-caption">{special && <strong className="guest-label">{t(`customer.${special}`)}</strong>}<span>{t(`table.${table.state}`)}</span>{!table.group && <small>{t('table.seats', { n: table.capacity })} · {t('table.tray', { n: dishes })}</small>}{served && table.until !== null && ['consuming', 'occupied'].includes(table.state) && <time className="enjoy-time">{time(table.until - w.now)}</time>}</div>
    </section>;
  }
  function equipmentButton(kind: Equipment) {
    const production = kind === 'keg' ? beer : kind === 'washer' ? washer : null;
    const cold = freshnessMs(w, game.config);
    const count = kind === 'keg' ? `${beer.serveNow}/${beer.capacity}` : kind === 'washer' ? `${washer.busy}/${washer.batchSize}` : kind === 'kitchen' ? `${kitchen.busy}/${kitchen.slots}` : Number.isFinite(cold) ? t('cooler.seconds', { seconds: Math.round(cold) / 1000 }) : '∞';
    return <button {...lit(kind === 'washer' && hintLit('washer'))} className={`equipment-object ${kind} ${kind === 'kitchen' && kitchen.busy ? 'is-cooking' : ''} ${kind === 'keg' && beerEmpty ? 'is-empty' : ''}`} key={kind} onClick={() => { setSelectedTable(null); setSelectedEquipment(kind); }} aria-label={t(`equipment.${kind}`)}>
      <Sprite id={`${kind}-lv${Math.max(1, w.equipment[kind])}`} /><span>{t(`equipment.${kind}`)}</span><b className="capacity-badge" aria-label={t(`production.${kind === 'washer' ? 'washing' : kind === 'keg' ? 'ready' : kind === 'cooler' ? 'freshness' : 'busy'}`, { count })}>{kind === 'keg' ? t('production.ready', { count }) : kind === 'cooler' ? t('production.freshness', { count }) : kind === 'washer' ? t('production.washShort', { count }) : count}</b>{/* founder 2026-10-22 (B2.3): no bare number under the cooler or at the sink */}
      {production && production.busy > 0 && <progress className="equipment-progress" aria-label={t('production.batchProgress', { n: production.busy })} value={production.progress} max={1} />}
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
  function businessCard(item: BusinessUnlock) {
    const quote = unlockQuote(w, game.config, item);
    return <article className="business-card" key={item} data-goal={`unlock:${item}`}><Sprite id={item === 'qr' ? 'qr-payment' : 'phone'} /><div><h3>{t(`business.${item}`)}</h3>{item === 'phone' && c.unlocks.phone.effect.includes('shipper') && c.customerTypes.shipper.requires === 'phone' && <p>{t('business.phoneEffect')}</p>}{item === 'qr' && <p>{t('business.qrEffect', { mult: decimal(c.tip.qrMult) })}</p>}{requirementList(item === 'qr' ? [...quote.requirements].sort((a, b) => Number(b.target === 'phone') - Number(a.target === 'phone')) : quote.requirements)}<button disabled={!quote.ok} onClick={() => run({ type: 'buyUnlock', item })}>{quote.owned ? t('business.owned') : t('business.buy', { cost: num(quote.cost) })}</button></div></article>;
  }
  function upgradeCard(kind: Equipment) {
    const q = upgradeQuote(w, game.config, kind);
    const metrics = (level: number) => {
      const i = level - 1;
      if (!level) return null;
      // Instant pour (rules 28): the taps are off the serving path, so a level is its reserve and its refill batch -- no tap count, no seconds per glass.
      if (kind === 'keg') return <><small>{t(`equipment.keg.level${level}`)}</small><p>{beer.instant ? t('production.tank', { max: c.upgrades.keg.kegStorage[i] }) : t(c.upgrades.keg.refillEnabled ? 'production.taps' : 'production.directPour', { n: c.upgrades.keg.pourSlots[i], seconds: c.upgrades.keg.pourMs[i] / 1000, max: c.upgrades.keg.refillEnabled ? c.upgrades.keg.kegStorage[i] : c.upgrades.keg.pourSlots[i] })}</p>{c.upgrades.keg.refillEnabled && <p>{t('production.refill', { n: c.upgrades.keg.kegBatch[i], seconds: c.upgrades.keg.refillMs[i] / 1000 })}</p>}</>;
      if (kind === 'washer') return <p>{t('production.batch', { n: c.upgrades.washer.slots[i], seconds: c.upgrades.washer.washMs[i] / 1000 })}</p>;
      if (kind === 'cooler') {
        const cold = c.upgrades.cooler.freshnessMs[i];
        return <><p>{t('production.freshness', { count: cold === null ? '∞' : t('cooler.seconds', { seconds: cold / 1000 }) })}</p><p>{cold === null ? t('cooler.forever') : t('cooler.staleAfter', { seconds: cold / 1000, reputation: num(c.reputation.staleGlass).replace('-', '−') })}</p></>;
      }
      if (kind === 'stall') return <p>{t('production.stockCap', { n: c.upgrades.stall.stockCap[i] })}</p>;
      const dishes = c.upgrades.kitchen.unlocks[level];
      return <><p>{t(dishes.length ? 'kitchen.unlocks' : 'kitchen.noNewDishes', { dishes: dishes.map(dish => t(`dish.${dish}`)).join(' + ') })}</p><p>{t('production.kitchenSlots', { n: c.upgrades.kitchen.slots[level] })}</p>{isEconomy2(c) && <p>{t('production.portions', { n: c.upgrades.kitchen.portionsPerPan[level] })}</p>}<p>{t('kitchen.speed', { percent: Math.round((1 - (c.upgrades.kitchen.prepMult[level] ?? 1)) * 100) })}</p></>;
    };
    return <div className="upgrade-card" key={kind} data-goal={`equipment:${kind}`}><h3>{t(`equipment.${kind}`)}</h3>{kind === 'kitchen' && <p>{t('kitchen.rawStock')}</p>}{kind === 'cooler' && <p>{t('cooler.weather', { hot: c.weather.hot.freshnessMult, humid: c.weather.humid.freshnessMult })}</p>}<div className="equipment-comparison">{[w.equipment[kind], ...(q.cost !== null ? [q.next] : [])].map((level, i) => <section key={i}>{level > 0 && hasSpriteArt(`${kind}-lv${level}`) ? <Sprite id={`${kind}-lv${level}`} /> : <div className="equipment-empty">{t(!level ? kind === 'kitchen' ? 'kitchen.locked' : 'equipment.unowned' : 'equipment.noArt')}</div>}<strong>{t(i ? 'production.next' : 'level', { n: level })}</strong>{metrics(level)}</section>)}</div><button disabled={!q.ok} onClick={() => run({ type: 'upgrade', kind })}>{q.cost === null ? t('upgrade.max') : t('upgrade.buy', { cost: num(q.cost) })}</button>{q.reason && q.cost !== null && <p role="status">{q.reason === 'lifePathRequired' ? t('upgrade.lifePath', { name: levelName(q.requiredLifePath) }) : t(`error.${q.reason}`)}</p>}</div>;
  }

  const entryCard = (goal: Goal) => {
    if (goal.card.kind === 'signboard') return <button key={goal.id} data-goal={goal.id} className="sign-entry full" onClick={() => open('signboard')}><Sprite id={`sign-${w.signStyle ?? 'wood'}`} /><span><strong>{t('sign.title')}</strong><small>{w.signStyle ? t(`sign.${w.signStyle}`) : t('sign.notInstalled')}</small></span><span aria-hidden="true">›</span></button>;
    return <button key={goal.id} data-goal={goal.id} className="sign-entry full" onClick={() => open('flyer')}><Sprite id="flyer-bundle" /><span><strong>{t('flyer.title')}</strong><small>{t('flyer.stock', { n: flyers.stock, cap: c.unlocks.flyer.stockCap })}</small></span><span aria-hidden="true">›</span></button>;
  };
  /** One card of the Upgrades sheet for a registry item (goals.ts); a new kind of item adds a case here and a provider there. */
  function renderCard(goal: Goal) {
    const card = goal.card;
    if (card.kind === 'table') { const i = w.tables.findIndex(x => x.id === card.tableId); return tableCard(w.tables[i], i); }
    if (card.kind === 'equipment') return upgradeCard(card.equipment);
    if (card.kind === 'business') return businessCard(card.item);
    if (card.kind === 'buyTable') return buyTableButton(goal.id);
    // S6: a chair goal on its own (the one-card sheet, or a sheet that lists chairs apart from their tables); the full lane keeps it on its table's card.
    if (card.kind === 'buyChair' || card.kind === 'chairUpgrade') {
      const i = w.tables.findIndex(x => x.id === card.tableId), table = w.tables[i];
      return <div className="upgrade-card" key={goal.id}><Sprite id={chairAsset(card.kind === 'chairUpgrade' ? (table.chairLevel ?? 1) + 1 : table.chairLevel ?? 1)} /><h3>{t('table', { n: i + 1 })}</h3>{card.kind === 'buyChair' ? chairBuyBlock(table) : chairLevelBlock(table)}</div>;
    }
    return entryCard(goal);
  }
  /** F27/P3 + FEEDBACK II.4: every buy button shows its price and, when dimmed, exactly one reason: the first refusal its command would give (rules.ts quotes). */
  const whyNot = (reason: string | null, n = 0, name = '') => reason ? t(`reason.${reason}`, { n: num(n), name }) : '';
  function buyTableButton(id: string, bought?: () => void) {
    const q = buyTableQuote(w, game.config), why = whyNot(q.reason), seat = isSeatModel(c);
    // Seat model: "Mua bàn · N xu" (the n-th table's rung of the ladder, no number once the alley is full); a capacity snapshot keeps "Mua thêm bàn · N xu".
    const label = q.cost === null || seat && q.reason === 'maxTables' ? t('upgrade.addTable') : t(seat ? 'upgrade.buyTable' : 'upgrade.addTablePrice', { cost: num(q.cost) });
    return <div className="buy-card" key={id} data-goal={id}>{effectLine(id)}<button {...lit(spot.target?.kind === 'goal' && goal?.kind === 'buyTable')} className="secondary full" disabled={!q.ok} aria-describedby={why ? 'buy-table-reason' : undefined} onClick={async () => { if ((await run({ type: 'buyTable' })).ok) bought?.(); }}>{label}</button>{why && <p id="buy-table-reason" className="buy-reason" role="status">{why}</p>}</div>;
  }
  /** What a table of a level gives the group that sits down at it (S4, D19), one short label each (the benefits stack, so level 3 lists the extra round and the second snack). */
  const perks = (level: number) => {
    const b = tableBenefit(c, level), parts = [b.extraRounds > 0 && t('table.benefit.rounds', { n: b.extraRounds }), b.pExtraMoi > 0 && t('table.benefit.snack', { n: Math.round(b.pExtraMoi * 100) }), b.tipMult > 1 && t('table.benefit.tip', { n: decimal(b.tipMult) })].filter((part): part is string => Boolean(part));
    return parts.length ? parts : [t('table.benefit.none')];
  };
  // The life-path gate names the level the player has to reach: one reason, in words (reason.lifePathRequired).
  const gateName = (level: number) => level > 0 ? levelName(level) : '';
  /** S6 (plan S6 row "giá + hiệu ứng trước→sau + 1 lý do"): the registry's one-number effect of an item, printed on its block of the sheet; nothing when the item has nothing left to buy. */
  // The effect line of a capacity block: only while the item still has a price (S6 review round 2: a full alley's "Mua thêm bàn" has nothing left to promise, so no "+1 chỗ" above it).
  const effectLine = (id: string) => { const g = sheetGoals.find(x => x.id === id); return g?.effect && g.cost !== null ? <p className="goal-effect">{say(t, g.effect, num, decimal)}</p> : null; };
  /** Seat model: a one-chair table sells its second chair (registry item `chair:<table>`): its effect (1 → 2 chỗ), its price and the quote's one reason (a locked chair names the tables it waits for); a pair is the most a table holds, so a pair has no block. */
  function chairBuyBlock(table: Table) {
    const chair = isSeatModel(c) && table.capacity < PAIR ? buyChairQuote(w, game.config, table) : null, chairWhy = chair ? whyNot(chair.reason, isSeatModel(c) ? c.upgrades.table.chairsAfterTables : 0) : '';
    return chair && <div className="buy-card chair-goal" data-goal={`chair:${table.id}`}>{effectLine(`chair:${table.id}`)}<button disabled={!chair.ok} aria-describedby={chairWhy ? `chair-reason-${table.id}` : undefined} onClick={() => run({ type: 'buyChair', tableId: table.id })}>{t('upgrade.buyChair', { cost: num(chair.cost ?? 0) })}</button>{chairWhy && <p id={`chair-reason-${table.id}`} className="buy-reason" role="status">{chairWhy}</p>}</div>;
  }
  /** S4 (rules 28): a snapshot with the level ladders sells the chair level (registry item `chairLevel:<table>`): its effect (kiên nhẫn ×1 → ×1,15), price and one reason like the others. */
  function chairLevelBlock(table: Table) {
    const comfort = isSeatModel(c) && tableUpgrade(c) !== null ? chairUpgradeQuote(w, game.config, table) : null;
    const comfortWhy = comfort && comfort.gate !== 'maxLevel' ? whyNot(comfort.reason, 0, gateName(comfort.requiredLifePath)) : '';
    return comfort && <div className="buy-card chair-goal" data-goal={`chairLevel:${table.id}`}>{effectLine(`chairLevel:${table.id}`)}<button data-action="chairUpgrade" disabled={!comfort.ok} aria-describedby={comfortWhy ? `comfort-reason-${table.id}` : undefined} onClick={() => run({ type: 'upgradeChair', tableId: table.id })}>{comfort.next ? t('upgrade.chairUp', { cost: num(comfort.cost!) }) : t('upgrade.chairMax')}</button>{comfortWhy && <p id={`comfort-reason-${table.id}`} className="buy-reason" role="status">{comfortWhy}</p>}</div>;
  }
  function tableCard(table: Table, i: number) {
    const q = tableUpgradeQuote(w, game.config, table), why = q.gate === 'maxLevel' ? '' : whyNot(q.reason, q.next?.repBase?.[0], gateName(q.requiredLifePath)); // top level: nothing is left to buy, so the button's own label "Đã tối đa" is the one reason, even while guests sit there (the command answers the transient tableBusy first, which would only mislead)
    // S4 (rules 28): a snapshot with the level ladders also says what the level and the chairs give; S6: the chair and the chair level are registry items of their own, drawn on this card.
    const ladders = isSeatModel(c) && tableUpgrade(c) !== null, chairLevel = table.chairLevel ?? 1;
    return <div className="upgrade-card" key={table.id} data-goal={`table:${table.id}`}><Sprite id={`table-lv${table.level}-empty`} /><h3>{t('table', { n: i + 1 })}</h3><p>{t('table.seats', { n: table.capacity })}</p>{ladders && <><div className="table-perk"><p>{t('level', { n: table.level })}</p><ul>{perks(effectiveTableLevel(table)).map(label => <li key={label}>{label}</li>)}</ul></div><p className="chair-perk">{t('table.chairLevel', { n: chairLevel, mult: decimal(chairPatienceMult(c, chairLevel)) })}</p></>}{chairBuyBlock(table)}{effectLine(`table:${table.id}`)}<button {...lit(spot.target?.kind === 'goal' && goal?.kind === 'table' && goal.table.id === table.id)} disabled={!q.ok} aria-describedby={why ? `table-reason-${table.id}` : undefined} onClick={() => run({ type: 'upgradeTable', tableId: table.id })}>{q.next ? t('upgrade.buy', { cost: num(q.cost!) }) : t('upgrade.tableMax')}</button>{why && <p id={`table-reason-${table.id}`} className="buy-reason" role="status">{why}</p>}{chairLevelBlock(table)}</div>;
  }

  return <div className="game-shell" data-save-state={saveError ? 'error' : saving ? 'saving' : 'saved'} data-frame={frame}>
    {!remote && !w.active && !menuPaused && <div className="paused-overlay" role="status">{t('pause.hidden')}</div>}
    <div className="street-backdrop" aria-hidden="true"><Sprite id="bg-street" /></div>
    <main className={`game weather-${shift?.weather ?? 'sunny'}${!w.active || w.paused ? ' is-paused' : ''}`}>
      <header className="hud">
        <div className="money" {...lit(spot.target?.kind === 'wallet')}><Icon name="coin" /><div><span className="sr-only">{t('coins')}</span><strong>{num(w.coins)}</strong></div>{spot.target?.kind === 'wallet' && pointer}</div>
        {show.hud && <div className="energy"><div><Icon name="bolt" /><strong>{inShift && shift ? time(shift.endsAt - w.now) : `${Math.floor(energyMs / c.shift.durationMs * 100)}%`}</strong></div><span className="energy-track"><i style={{ width: `${energyMs / c.shift.durationMs * 100}%` }} /></span></div>}
        {show.hud && <button className="icon-button settings-button" onClick={() => open('settings')} aria-label={t('nav.settings')}><Icon name="settings" /></button>}
      </header>
      {next && <div className="goal-row"><GoalChip goal={next} coins={w.coins} t={t} num={num} decimal={decimal} onOpen={openGoal} /></div>}
      {show.hud && <div className="weather-row"><span className="weather-chip"><span aria-hidden="true">{shift?.weather === 'rain' ? '☂' : '☀'}</span>{t(`weather.${shift?.weather ?? 'sunny'}`)}</span>{restedMs > 0 && <span className="well-rested" role="timer" aria-label={t('wellRested.active', { time: time(restedMs), mult: c.shift.wellRested.mult })}><Icon name="star" /><time>{time(restedMs)}</time><b>×{c.shift.wellRested.mult}</b></span>}<span {...lit(hintLit('rush'))} className={`rush-label ${rush.active ? 'is-active' : rush.next?.warning ? 'is-warning' : ''}`} role="timer">{rush.active ? <><Icon name="bolt" /><span><b>{t(`rush.${rush.active.kind}`)}</b><time>{t('rush.ends', { time: time(rush.active.remainingMs) })}</time></span></> : rush.next ? <span><b>{t('rush.upcoming', { kind: t(`rush.${rush.next.kind}`) })}</b><time>{time(rush.next.remainingMs)}</time></span> : t('rush.none')}</span>{!rush.active && rush.next?.warning && <span className="sr-only" role="status">{t('rush.warning', { kind: t(`rush.${rush.next.kind}`) })}</span>}</div>}
      <section className={`stall-scene ${kitchen.level ? 'has-kitchen' : ''}`} aria-label={t('brand')}>
        {w.signStyle && <button className="sign-object" aria-label={t('sign.open', { style: t(`sign.${w.signStyle}`) })} aria-haspopup="dialog" onClick={() => open('signboard')}><Sprite id={`sign-${w.signStyle}`} /></button>}
        <div className="owner-station"><Sprite id="owner-idle" /><div className="serving-counter"><div className="counter-canopy" /><div className="counter-front"><h1>{t('brand')}</h1><div className="counter-bottles" aria-hidden="true"><i /><i /><i /><i /><i /></div></div></div></div>
        <div className="equipment-row">{(show.hud ? ['cooler', 'keg', 'washer'] : ['keg']).map(k => equipmentButton(k as Equipment))}{show.hud && kitchen.level > 0 && equipmentButton('kitchen')}</div>
        {show.hud && <div className="glass-counter"><Sprite id="glass-clean" /><span>{cleanGlasses}<small>/{w.glasses.length}</small></span><span className="sr-only">{t('glass.clean')}</span></div>}
        <div className="business-props">{BUSINESS_UNLOCKS.filter(item => w.unlocks.includes(item)).map(item => <button key={item} className={item === 'phone' && delivery ? `has-delivery ${deliveryUrgent ? 'is-urgent' : ''}` : ''} onClick={() => open(item === 'phone' ? 'delivery' : 'upgrades')} aria-label={t(item === 'phone' ? 'delivery.open' : `business.${item}`)} aria-describedby={item === 'phone' && delivery ? 'delivery-clock' : undefined}><Sprite id={item === 'qr' ? 'qr-payment' : item === 'phone' && delivery ? 'customer-shipper' : 'phone'} />{item === 'phone' && delivery && <span id="delivery-clock" className="delivery-clock"><span className="sr-only">{t(deliveryUrgent ? 'delivery.urgent' : 'delivery.deadline')}</span>{deliveryUrgent && <b aria-hidden="true">! </b>}{time(Math.ceil(delivery.remainingMs / 1000) * 1000)}</span>}</button>)}</div>
        {showDeferredRisk && w.dogLevel > 0 && <button className="dog-object" aria-label={t('dog.open', { n: w.dogLevel })} aria-haspopup="dialog" onClick={() => open('dog')}><Sprite id={`dog-idle-lv${w.dogLevel}`} /><span>{t('level', { n: w.dogLevel })}</span></button>}
      </section>
      {/* Founder 2026-10-22 (B2.3): the line repeats the keg badge, the stock strip and the glass counter of the yard, so it is for screen readers only. */}
      <p id="beer-supply-status" className="beer-pipeline sr-only">{t('beer.pipeline', { ready: beer.serveNow, n: w.inventory.bia, cap: stockCap(w, game.config), clean: cleanGlasses, total: w.glasses.length })}</p>
      {lowBeerStock && <section className="beer-stock-warning" aria-label={t('stock.quickBeerTitle')}>
        <p role="status">{t(w.inventory.bia === 0 ? 'stock.beerEmpty' : 'stock.beerLow')}</p>
        <button {...lit(spot.target?.kind === 'restock')} aria-describedby="beer-supply-status" disabled={!beerRestock.ok} onClick={() => run({ type: 'restock', dish: 'bia', mode: 'full' })}>{t('stock.quickBeer', { n: num(beerRestock.quantity), cost: num(beerRestock.cost) })}</button>
        {w.coins < beerRestock.cost && <small>{t('error.notEnoughCoins')}</small>}
      </section>}
      {quickChair && <section className="beer-stock-warning quick-chair" aria-label={t('upgrade.quickChairTitle')}>
        <button onClick={() => run({ type: 'buyChair', tableId: quickChair.tableId })}>{t('upgrade.quickChair', { n: quickChair.n, cost: num(quickChair.cost) })}</button>
      </section>}
      {remote && <div className={`network-status is-${remote.state}`} role="status" aria-live="polite"><span>{t(remote.accountBusy ? 'account.confirming' : `network.${remote.state}`)}</span>{remote.state === 'invalidSession' && <button onClick={onReauthenticate}>{t('account.reauthenticate')}</button>}{remote.pending > 0 && <strong>{t('network.pending', { n: remote.pending })}</strong>}</div>}
      <section className="yard" aria-label={t(`location.${w.location}`)} data-slots={slots}>
        {/* S6 review round 1 (P0(c)): the door is the first band of the yard, always above the fold, never under the eight places; the grid below keeps a free band for the order bubbles of its first row. */}
        <div className="yard-door"><DoorQueue world={w} config={game.config} turnedAway={turnedAway} t={t} /></div>
        <div className="yard-grid">
          {w.tables.map(renderTable)}
          {/* Founder 2026-10-22 (B2.4): an empty place is a button that opens the Upgrades sheet's buy card of the next table (it pauses like any sheet) once that sheet is revealed. */}
          {Array.from({ length: Math.max(0, slots - w.tables.length) }, (_, i) => show.upgrades
            ? <button key={`slot-${w.tables.length + i}`} {...lit(i === 0 && hintLit('slot'))} className={`table-space table-${w.tables.length + i} table-slot`} aria-label={t('yard.slot')} aria-haspopup="dialog" onClick={() => open('buyTable')}><span className="slot-mark" /></button>
            : <div key={`slot-${w.tables.length + i}`} className={`table-space table-${w.tables.length + i} table-slot`} role="img" aria-label={t('yard.slot')}><span className="slot-mark" /></div>)}
        </div>
        {/* Founder 2026-10-22 (A3): one "Mở ca" on screen. With the bottom nav shown the note points at the nav's button, named by its own label in bold (`{button}`
            stays in the text when no value is passed, so it splits there); a pin that still hides the nav keeps the note's own button. */}
        {!inShift && !shift && <div className="opening-note"><h2>{t('rest.title')}</h2><p>{t('rest.copy')}</p>{show.hud ? <p className="start-below">{t('rest.startBelow').split('{button}').flatMap((part, i) => i ? [<b key={i}>{t('nav.shift')}</b>, part] : [part])}</p> : <button className="primary" onClick={() => run({ type: 'startShift' })}><Icon name="bolt" />{t('nav.shift')}</button>}<small>{t('rest.free')}</small></div>}
      </section>
      {show.hud && <div className="stock-strip">{DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= w.equipment.kitchen).map(d => <button key={d} {...lit(d === 'bia' && hintLit('beerStock'))} className={d === 'bia' ? 'beer-stock' : undefined} onClick={() => open('stock')} aria-label={d === 'bia' ? beerInventory : `${t(`ingredient.${d}`)}: ${w.inventory[d]}/${stockCap(w, game.config)}`}><Sprite id={d === 'bia' ? 'keg-lv1' : menuAsset[d]} /><strong>{w.inventory[d]}<small>/{stockCap(w, game.config)}</small></strong></button>)}<button className={`flyer-stock ${flyers.remainingMs > 0 ? 'active' : ''}`} onClick={() => open('flyer')} aria-label={t('flyer.open', { n: flyers.stock })}><Sprite id="flyer-bundle" /><strong>{flyers.remainingMs > 0 ? time(flyers.remainingMs) : flyers.stock}</strong></button>{show.quests && <button className="quest-trigger" onClick={() => open('quests')} aria-label={t('quests.title')}><Icon name="book" /><strong>{w.daily?.rows.filter(r => r.progress >= r.target).length ?? 0}/{c.quests.daily.count}</strong></button>}<button className="reputation" onClick={() => open('journey')}><Icon name="star" />{num(w.reputation)}</button></div>}
      {w.phase === 'closing' && <p className="status-line">{t('closing')}</p>}
      {!inShift && shift && <div className="status-line rest-summary"><span>{mustRest ? c.shift.regenRate > 0 ? t('rest.regen', { time: time(Math.ceil((c.shift.durationMs - w.staminaMs) / c.shift.regenRate / 1000) * 1000) }) : t('rest.regenPaused') : w.staminaMs < c.shift.durationMs ? t('rest.ready') : t('rest.free')}</span><button onClick={() => open('book')}><Icon name="book" />{t('nav.book')}</button></div>}
      {showGuide && <div className="guide" role="status"><span className="guide-mark">!</span><p>{t(guide.waitFor === 'order_ready' ? `order.feedback.${orderPreparation(w, game.config, guideOrder)}` : guide.copyKey)}</p>{c.onboarding.stepGuide.skippable && <button onClick={() => setPrefs({ guideDone: true, guideIndex: null })}>{t('skip')}</button>}</div>}
      {hint && !hintBlocked && <div className="guide hint" role="status" data-hint={hint.id}><span className="guide-mark" aria-hidden="true">!</span><p>{t(`hint.${hint.id}`, { s: decimal(freshnessMs(w, game.config) / 1000), kind: t(`rush.${rush.next?.kind ?? rush.active?.kind ?? 'light'}`) })}</p>{hintRules(game.config).dismissOnTap && <button onClick={() => { dismissedHint.current = `${hint.id}:${hint.since}`; setHint(null); }}>{t('hint.ok')}</button>}</div>}
      {show.hud && <nav className="bottom-nav" aria-label={t('brand')}>
        <button className={!inShift ? 'primary' : ''} onClick={() => inShift ? open('book') : run({ type: 'startShift' })}><Icon name={inShift ? 'book' : 'bolt'} /><span>{t(inShift ? 'nav.book' : 'nav.shift')}</span></button>
        <button onClick={() => open('stock')}><Icon name="stock" /><span>{t('nav.stock')}</span></button>
        {show.upgrades && <button {...lit(spot.target?.kind === 'upgradesNav')} onClick={() => open('upgrades')}><Icon name="upgrade" /><span>{t('nav.upgrades')}</span></button>}
        {show.journey && <button onClick={() => open('journey')}><Icon name="star" /><span>{t('nav.journey')}</span>{claimCount > 0 && <b className="nav-badge" aria-hidden="true">{claimCount}</b>}</button>}
      </nav>}
      {toast?.loss ? <div className="toast toast-loss" role="status" data-reason={toast.reason} aria-label={leaveLabel}>
        {toast.reason && <strong className="loss-reason" aria-hidden="true">{t(`leave.${toast.reason}`)}</strong>}
        {!(leaveFree && toast.reason) && <><span className="loss-value" aria-hidden="true"><Icon name="coin" /><strong>{toast.loss.coins ? '−' : ''}{num(toast.loss.coins)}</strong></span>
        <span className="loss-value" aria-hidden="true"><Icon name="star" /><strong>{toast.loss.reputation ? '−' : ''}{num(toast.loss.reputation)}</strong></span></>}
      </div> : toast?.gain !== undefined ? <div key={toast.id} className={`toast toast-gain gain-${toast.kind}`} role="status" aria-label={toast.text}>
        <span className="gain-reaction" aria-hidden="true">{reactions[toast.kind]}</span><strong aria-hidden="true">+{num(toast.gain)}</strong><Icon name="coin" />
        {/* Founder 2026-10-22 (B2.1a): a serve that is not the best one says why on the pill itself; until then its words lived only in the aria-label. */}
        {['stale', 'late', 'grace'].includes(toast.kind) && <small className="gain-reason" aria-hidden="true">{toast.kind === 'stale' ? toast.text : t('outcome.slow')}</small>}
      </div> : toast && <button className={`toast toast-${toast.kind}`} role="status" onClick={() => setToast(null)}>{toast.text}<span aria-hidden="true">×</span></button>}
      {saveError && !remote && <button className="save-error" role="alert" onClick={() => download(encodeSave(game as Game), 'tbh-backup.json')}>{t(saveError === 'conflict' ? 'save.conflict' : 'save.error')}</button>}
    </main>
    <FlyingFeedback floaters={floaters} />


    {sheet && <SheetDialog pausedLabel={t('pause.menu')} view={sheet} title={sheet === 'rush' ? t('rushRecap.title', { kind: t(`rush.${recap?.kind ?? 'light'}`) }) : t(sheet === 'account' ? 'account.title' : sheet === 'quests' ? 'quests.title' : sheet === 'flyer' ? 'flyer.title' : sheet === 'signboard' ? 'sign.title' : sheet === 'delivery' ? 'delivery.title' : sheet === 'dog' ? 'dog.title' : sheet === 'close' ? 'close.title' : sheet === 'book' ? 'book.title' : sheet === 'journey' ? 'journey.title' : sheet === 'settings' ? 'settings.title' : sheet === 'config' ? 'config.title' : sheet === 'buyTable' ? 'goal.buyTable' : `nav.${sheet}`)} close={() => setSheet(null)}>
      {invitation && (sheet === 'book' && invitation === 'firstShift' || sheet === 'seasons' && invitation === 'leaderboard') && remote?.identity.provider === 'guest' && <LoginInvitation reason={invitation} t={t} signIn={() => open('account')} later={() => setInvitation(null)} />}
      {sheet === 'account' && <Account remote={remote} locale={locale} t={t} close={() => setSheet(null)} />}
      {sheet === 'quests' && show.quests && <Quests world={w} config={game.config} run={run} t={t} num={num} />}
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
      {showDeferredRisk && sheet === 'dog' && <div className="dog-panel">
        <div className="dog-summary"><Sprite id={`dog-idle-lv${w.dogLevel || dogQuote.next?.level}`} /><div><h3>{t(`dog.level${w.dogLevel}`)}</h3><p>{t(w.dogLevel ? 'dog.home' : 'dog.welcome')}</p></div></div>
        {dogQuote.next && dogQuote.cost !== null ? <>
          <h3>{t('dog.next', { name: t(`dog.level${dogQuote.next.level}`) })}</h3>
          <ul className="dog-requirements">
            <li className={w.coins >= dogQuote.cost ? 'is-ready' : ''}><Icon name="coin" /><strong>{num(dogQuote.cost)} {t('coins')}</strong><span>{t('dog.have', { n: num(w.coins) })}</span></li>
            {dogQuote.materials.map(m => <li key={m.dish} className={m.have >= m.quantity ? 'is-ready' : ''}><Sprite id={menuAsset[m.dish]} /><strong>{t(`ingredient.${m.dish}`)} × {m.quantity}</strong><span>{t('dog.have', { n: m.have })}</span></li>)}
          </ul>
          {dogQuote.materials.some(m => m.quantity > stockCap(w, game.config)) && <p>{t('dog.capacity')}</p>}
          <button className="primary full" disabled={!dogQuote.ok} onClick={() => run({ type: 'upgradeDog', level: dogQuote.next!.level })}>{t(w.dogLevel ? 'dog.upgrade' : 'dog.buy', { cost: num(dogQuote.cost) })}</button>
          <div className="dog-links"><button onClick={() => open('stock')}>{t('nav.stock')}</button><button onClick={() => open('upgrades')}>{t('dog.storage')}</button></div>
        </> : <p>{t('upgrade.max')}</p>}
      </div>}
      {sheet === 'close' && <div className="close-confirm"><p>{t('close.copy')}</p><p>{t('close.guests', { n: closeQuote.guests.length })}</p><div className="close-price"><Icon name="coin" /><strong>{num(closeQuote.cost)}</strong><span>{t('coins')}</span></div>{!closeQuote.ok && <p role="status">{t(closeQuote.deliveryBlocked ? 'error.deliveryPending' : 'error.notEnoughCoins')}</p>}<div className="button-stack"><button className="primary" disabled={!closeQuote.ok || closeShift !== shift?.id} onClick={() => run({ type: 'kickAll', shiftId: closeShift!, maxCost: closeQuote.cost })}>{t('close.confirm', { cost: num(closeQuote.cost) })}</button><button onClick={() => setSheet(null)}>{t('close.wait')}</button></div></div>}
      {sheet === 'stock' && <><p className="sheet-intro">{t('stock.copy')} <b>{num(w.coins)} {t('coins')}</b></p><div className="stock-list">{DISHES.map(dish => <div className="stock-row" key={dish}><Sprite id={dish === 'bia' ? 'keg-lv1' : menuAsset[dish]} /><div className="stock-info"><strong id={`stock-ingredient-${dish}`}>{t(`ingredient.${dish}`)}</strong><span>{dish === 'bia' ? beerInventory : `${w.inventory[dish]} / ${stockCap(w, game.config)}`}</span><progress value={w.inventory[dish]} max={stockCap(w, game.config)} />{c.menu[dish].unlock.kitchenLevel > 0 && c.menu[dish].unlock.kitchenLevel <= kitchen.level && <small>{t('stock.cookHint', { dish: t(`dish.${dish}`) })}</small>}</div>{c.menu[dish].unlock.kitchenLevel > w.equipment.kitchen ? <small>{t('stock.locked', { n: c.menu[dish].unlock.kitchenLevel })}</small> : <div className="stock-actions">{(['one', 'bulk', 'full'] as const).map(mode => { const q = restockQuote(w, game.config, dish, mode); return <button key={mode} aria-describedby={`stock-ingredient-${dish}`} disabled={!q.ok} onClick={() => run({ type: 'restock', dish, mode })}>{t('stock.buy', { action: dish === 'bia' ? `${t('beer.buy')} ${mode === 'one' ? t('stock.one') : mode === 'bulk' ? t('stock.bulk', { n: c.inventory.bulkSize }) : t('stock.full')}` : mode === 'one' ? t('stock.one') : mode === 'bulk' ? t('stock.bulk', { n: c.inventory.bulkSize }) : t('stock.full'), cost: num(q.cost) })}</button>; })}</div>}</div>)}</div>{showDeferredRisk && <><p>{Object.entries(c.crates[c.unlocks.emergencyPack.contents.slice('crate.'.length) as keyof typeof c.crates]).map(([dish, n]) => `${t(`ingredient.${dish}`)} × ${n}`).join(' · ')}</p><button className="secondary full" onClick={() => run({ type: 'emergencyPack' })}>{t('stock.emergency')}</button></>}</>}
      {!guestOnly && sheet === 'seasons' && <><Leaderboard key={`${remote?.identity.playerId ?? 'public'}:${remote?.identity.provider ?? 'local'}`} viewer={remote ? { playerId: remote.identity.playerId, provider: remote.identity.provider } : null} timeout={c.network.reconnectingUiDelayMs} timeZone={c.league.seasons.tz} t={t} locale={locale} num={num} /><details className="season-details"><summary>{t('shrine.title')}</summary><SeasonHistory timeout={c.network.reconnectingUiDelayMs} timeZone={c.league.seasons.tz} t={t} locale={locale} num={num} /></details>{remote?.identity.provider === 'google' ? <details className="season-details"><summary>{t('season.own')}</summary><Seasons world={w} config={game.config} t={t} locale={locale} num={num} /></details> : <button className="secondary full" onClick={() => open('account')}>{t('account.title')}</button>}</>}
      {sheet === 'rush' && recap && <div className="rush-recap"><dl className="ledger-money">{(['arrived', 'served', 'left', 'tips'] as const).map(key => <div key={key} data-recap={key}><dt>{t(`rushRecap.${key}`)}</dt><dd>{num(recap[key])}</dd></div>)}<div className="ledger-total" data-recap="net"><dt>{t('rushRecap.net')}</dt><dd>{num(recap.net)}</dd></div></dl>
        {recap.change !== null && <p className={`rush-change ${recap.change >= 0 ? 'is-up' : 'is-down'}`} data-change={recap.change}>{t(recap.change >= 0 ? 'rushRecap.up' : 'rushRecap.down', { n: num(Math.abs(recap.change)) })}</p>}
        <button className="primary full" onClick={() => setSheet(null)}>{t('rushRecap.ok')}</button></div>}
      {sheet === 'buyTable' && <div className="slot-buy"><Sprite id="table-lv1-empty" />{buyTableButton('buyTable', () => setSheet(null))}</div>}
      {sheet === 'locations' && <Locations world={w} config={game.config} run={run} t={t} locale={locale} />}
      {sheet === 'upgrades' && !show.upgradeList && <><p className="sheet-intro">{t('upgrade.copy')}</p><div className="upgrade-grid">{sheetGoal && renderCard(sheetGoal)}</div></>}
      {sheet === 'upgrades' && show.upgradeList && <>{upgradeHint}<button className="sign-entry full" onClick={() => open('locations')}><Icon name="star" /><span><strong>{t('nav.locations')}</strong><small>{t(`location.${w.location}`)}</small></span><span aria-hidden="true">›</span></button>{showDeferredRisk && <button className="dog-entry full" onClick={() => open('dog')}><Sprite id={`dog-idle-lv${w.dogLevel || 1}`} /><span><strong>{t('dog.title')}</strong><small>{t(`dog.level${w.dogLevel}`)}</small></span><span aria-hidden="true">›</span></button>}<section className="goal-lane" aria-labelledby="lane-capacity"><h3 id="lane-capacity">{t('lane.capacity')}</h3><h3 id="upgrade-tables" tabIndex={-1}>{t('upgrade.tables')}</h3><div className="upgrade-grid">{sheetGoals.filter(g => g.card.kind === 'table').map(renderCard)}</div>{sheetGoals.filter(g => g.card.kind === 'buyTable').map(renderCard)}</section><section className="goal-lane" aria-labelledby="lane-speed"><h3 id="lane-speed">{t('lane.speed')}</h3><button className="sign-entry full kitchen-entry" onClick={() => { setSheet(null); setSelectedEquipment('kitchen'); }}><Sprite id={`kitchen-lv${Math.max(1, kitchen.level)}`} /><span><strong>{t('kitchen.live')}</strong><small>{kitchen.level ? t('kitchen.slots', { busy: kitchen.busy, total: kitchen.slots }) : t('kitchen.locked')}</small></span><span aria-hidden="true">›</span></button><p className="sheet-intro">{t('upgrade.copy')}</p><div className="upgrade-grid">{sheetGoals.filter(g => g.lane === 'speed').map(renderCard)}</div></section><section className="goal-lane" aria-labelledby="lane-guests"><h3 id="lane-guests">{t('lane.guests')}</h3>{sheetGoals.filter(g => g.card.kind === 'signboard' || g.card.kind === 'flyer').map(renderCard)}<h3>{t('business.title')}</h3><div className="business-grid">{sheetGoals.filter(g => g.card.kind === 'business').map(renderCard)}</div></section></>}
      {/* Founder 2026-10-22 (B2.5): on top the net (big) and the one suggestion with its button, then served / left after sitting / could not get in (together
          they are the guests of "Vì sao khách đi"), then the actions; everything else under "Chi tiết", collapsed, with no row for a dish that is still locked. */}
      {sheet === 'book' && (shift ? <><div className="book-summary"><p className="book-net"><span>{t('book.net')}</span><strong>{num(shift.stats.credited - shift.stats.penalty - shift.stats.spent)}</strong></p>{upgradeHint}
        <dl className="ledger book-counts">{([['served', shift.stats.served], ['leftSeated', leftSeated], ['noEntry', noEntry], ...((shift.stats.deliveryCompleted ?? 0) > 0 ? [['deliveryCompleted', shift.stats.deliveryCompleted ?? 0]] : []), ...((shift.stats.deliveryMissed ?? 0) > 0 ? [['deliveryMissed', shift.stats.deliveryMissed ?? 0]] : [])] as [string, number][]).map(([key, n]) => <div key={key} data-count={key}><dt>{t(`book.${key}`)}</dt><dd>{num(n)}</dd></div>)}</dl></div>
        {inShift && <div className="button-stack"><button className="primary" onClick={() => run({ type: 'endShift' })}>{t('book.end')}</button>{show.kick /* "Mời tất cả về" is Mời về too: same reveal (founder 2026-10-22, A1; review A-r1 F2) */ && <button className="secondary" disabled={!c.shift.kickAllAllowed} onClick={() => { setCloseShift(shift.id); open('close'); }}>{t('book.kick', { cost: num(closeQuote.cost) })}</button>}</div>}
        {show.quests && <button className="secondary full book-quests" onClick={() => open('quests')}>{t('quests.title')}</button>}{/* one of the two quest entries (F27 reveal): stays in sight */}
        <details className="book-details"><summary>{t('book.details')}</summary><p className="sheet-intro">{t('shift')} · {time(Math.min(shift.closedAt ?? w.now, shift.endsAt) - shift.startedAt - shift.pausedMs)}<b>{t(`weather.${shift.weather}`)}</b></p><section aria-label={t('book.location')} className="shift-location"><h3>{t('book.location')}</h3>
            {shiftLocation ? <p>{shiftLocation.locations.map((row, i) => <span key={row.id}>{i > 0 && ' → '}<span data-shift-location={row.id}>{t(`location.${row.id}`)} ×{row.mult.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span></span>)}</p> : <p>{t('book.locationUnknown')}</p>}
            <p>{t('book.locationNote')}</p></section><dl className="ledger-money">{(['payment', 'tip', 'penalty', 'spent'] as const).map(key => <div key={key}><dt>{t(`book.${key}`)}</dt><dd>{num(shift.stats[key])}</dd></div>)}{(shift.stats.deliveryCompleted ?? 0) > 0 && <div><dt>{t('book.deliveryNet')}</dt><dd>{num(shift.stats.deliveryNet ?? 0)}</dd></div>}{shift.stats.wellRestedBonus > 0 && <div><dt>{t('book.wellRestedBonus')}</dt><dd>{num(shift.stats.wellRestedBonus)}</dd></div>}</dl>{report && <section className="leave-reasons" aria-label={t('book.reasons')}><h3>{t('book.reasons')}</h3>{leave.length ? <ol>{leave.map(row => <li key={row.reason} data-reason={row.reason}><span>{t(`leave.${row.reason}`)}</span><b>{num(row.count)}</b></li>)}</ol> : <p>{t('book.reasonsNone')}</p>}{pairs > 0 && <p className="leave-pairs" data-pairs={pairs}>{t('book.pairsNoSeat', { n: num(pairs) })}</p>}</section>}<MenuReport report={report && { ...report, rows: report.rows.filter(row => c.menu[row.dish].unlock.kitchenLevel <= w.equipment.kitchen || row.ordered + row.sold + row.wasted > 0) }} t={t} num={num} locale={locale} /><button className="secondary full" onClick={() => open('flyer')}>{t('flyer.title')}</button>{rushReports.length > 0 && <table className="rush-report"><caption>{t('book.rushes')}</caption><thead><tr><th scope="col">{t('book.rushKind')}</th><th scope="col">{t('book.rushServed')}</th><th scope="col">{t('book.rushLost')}</th><th scope="col">{t('book.rushRevenue')}</th></tr></thead><tbody>{rushReports.map(e => <tr key={e.id}><th scope="row">{t(`rush.${e.data.kind}`)}</th><td>{num(Number(e.data.served))}</td><td>{num(Number(e.data.lost))}</td><td>{num(Number(e.data.revenue))}</td></tr>)}</tbody></table>}</details></> : <p>{t('book.none')}</p>)}
      {sheet === 'journey' && <>
        {!guestOnly && show.league && <button className="sign-entry full" onClick={() => open('seasons')}><Icon name="star" /><strong>{t('nav.seasons')}</strong><span aria-hidden="true">›</span></button>}
        <div className="journey-summary"><span>{t('journey.current')}</span><h3>{levelName(w.lifePath)}</h3><p>{num(w.lifetimeEarned)} {t('journey.earned')}</p>{nextMilestone && <><progress aria-label={t('journey.next', { name: levelName(nextMilestone.index) })} max={nextMilestone.lifetimeBase} value={Math.min(w.lifetimeEarned, nextMilestone.lifetimeBase)} /><p>{t('journey.next', { name: levelName(nextMilestone.index) })}</p></>}</div>
        <div className="progress-wallet"><span>{t('reward.badgeShard')} <b>{w.badgeShards}</b></span><span>{t('reward.cosmeticToken')} <b>{w.cosmeticTokens}</b></span></div>
        <ol className="milestone-list">{path.rows.map(row => <li key={row.id} data-level={row.index} className={row.index === w.lifePath ? 'current' : ''}>
          <header><span className="milestone-number">{row.index}</span><h3>{levelName(row.index)}</h3><span className={`milestone-state ${row.claimable ? 'claimable' : ''}`}>{t(row.index === 0 ? 'journey.reached' : row.claimed ? 'journey.claimed' : row.claimable ? 'journey.claimable' : 'journey.locked')}</span></header>
          {row.index > 0 && <p className="milestone-rewards">{num(row.rewardCoinBase)} {t('coins')}{row.extra.map((reward, index) => <span key={index}> · {t(`reward.${reward}`)}</span>)}</p>}
          {!row.reached && requirementList(row.requirements)}
          {row.claimable && <button className="primary" onClick={() => run({ type: 'claimLifePath', level: row.index })}>{t('journey.claim', { name: levelName(row.index) })}</button>}
        </li>)}</ol><button className="secondary full" onClick={() => open('locations')}>{t('nav.locations')}</button><button className="secondary full" onClick={() => open('upgrades')}>{t('journey.upgrades')}</button>
      </>}
      {sheet === 'settings' && <div className="settings-list"><button className="setting-row" aria-haspopup="dialog" onClick={() => open('account')}><span>{t('account.title')}</span><b>{t(`account.${remote?.identity.provider ?? 'local'}`)}</b></button><label>{t('settings.language')}<select value={locale} onChange={e => setPrefs({ locale: e.target.value as 'vi' | 'en' })}><option value="vi">{t('language.vi')}</option><option value="en">{t('language.en')}</option></select></label><button className="setting-row" onClick={() => setPrefs({ muted: !settings.muted })}><span>{t('settings.sound')}</span><b>{t(settings.muted ? 'settings.soundOff' : 'settings.soundOn')}</b></button><button className="setting-row" onClick={() => setPrefs({ goalChip: !settings.goalChip })}><span>{t('settings.goal')}</span><b>{t(settings.goalChip ? 'settings.on' : 'settings.off')}</b></button><p>{t('settings.saved')}</p>{!remote && <button onClick={() => download(encodeSave(game as Game), 'tbh-backup.json')}>{t('settings.export')}</button>}{remote && <p>{t(remote.identity.provider === 'guest' ? 'account.guestCopy' : 'network.serverSaved')}</p>}<button onClick={() => { setPrefs({ guideDone: false, guideIndex: 0 }); setSheet(null); }}>{t('settings.guide')}</button><button onClick={() => open('config')}>{t('settings.config')}</button><p className="build-version">{t('settings.build')} <code title={__TBH_COMMIT__}>{__TBH_COMMIT__.slice(0, 12)}</code></p></div>}
      {sheet === 'config' && <><p>{t('config.pinned', { version: game.config.version })}</p><pre className="config-json">{JSON.stringify(game.config.raw, null, 2)}</pre></>}
    </SheetDialog>}
    {selectedEquipment && <SheetDialog pausedLabel={t('pause.menu')} title={t(`equipment.${selectedEquipment}`)} close={() => setSelectedEquipment(null)}><div className="equipment-detail">{(selectedEquipment === 'keg' || selectedEquipment === 'washer') && <section className="production-detail" aria-label={t('production.status')}><strong>{selectedEquipment === 'keg' ? pouredBeer : t('production.clean', { count: `${washer.clean}/${washer.capacity}` })}</strong>{selectedEquipment === 'keg' && <p>{beerInventory}</p>}{(() => { const p = selectedEquipment === 'keg' ? beer : washer; return p.busy ? <><p>{t('production.running', { n: p.busy, seconds: Math.ceil(p.remainingMs / 1000) })}</p><progress value={p.progress} max={1} aria-label={t('production.batchProgress', { n: p.busy })} /></> : <p>{t(selectedEquipment === 'keg' && !w.inventory.bia && beer.stored < beer.capacity ? 'production.noStock' : 'production.idle')}</p>; })()}{selectedEquipment === 'washer' && <><p>{t('production.washQueue', { n: washer.queued, capacity: washer.batchSize })}</p><div className="buy-glasses"><strong>{t('production.glassOwned', { n: w.glasses.length, max: Math.min(c.glasses.buyCap, c.glasses.storageCap) })}</strong>{[1, Math.max(0, Math.min(c.glasses.buyCap, c.glasses.storageCap) - w.glasses.length)].filter((count, i, counts) => counts.indexOf(count) === i && count > 0).map(count => { const q = buyGlassQuote(w, game.config, count); return <button key={count} disabled={!q.ok} onClick={() => run({ type: 'buyGlass', count })}>{t('production.buyGlass', { n: count, cost: num(q.cost) })}</button>; })}</div></>}{selectedEquipment === 'keg' && <>{!beer.instant && <p>{t('production.pouring', { busy: beer.pouring, total: beer.tapSlots })}</p>}<p>{t(beer.instant ? 'production.instantHint' : beer.enabled ? 'production.reserveHint' : 'production.legacy')}</p></>}</section>}{selectedEquipment === 'kitchen' && <Kitchen status={kitchen} t={t} onTable={tableId => { setSelectedEquipment(null); const button = document.querySelector<HTMLButtonElement>(`[data-table-id="${CSS.escape(tableId)}"] .table-object`); if (button) showTable(tableId, button); }} onStock={() => { setSelectedEquipment(null); open('stock'); }} />}{upgradeCard(selectedEquipment)}</div></SheetDialog>}
    {selectedTable && (() => {
      const table = w.tables.find(x => x.id === selectedTable)!; const o = table.order;
      const active = o && ['pending', 'grace'].includes(o.state);
      const ready = active && o.items.every(i => i.state === 'ready');
      const stale = active && o.items.some(i => i.glassId && i.readyAt !== null && w.now >= i.readyAt + freshnessMs(w, game.config));
      const guests = currentGuests(table);
      const type = guests.find(x => x.type === 'vip')?.type ?? guests.find(x => x.type !== 'thuong')?.type ?? 'thuong';
      const dishes = active ? orderDishes(o) : [];
      const preparation = orderPreparation(w, game.config, o);
      // Wave 3 "Mời về" (D3): a table with guests offers to send them home once they linger after their tray (kickTableQuote reads the command): its price in
      // coins and reputation, one tap; dimmed with the one reason while they have not finished their order or the wallet is short. Revealed by its own threshold
      // with the HUD (`show.kick`: after shift 1, founder 2026-10-22) and offered only while the shift is open: once it closes no guest arrives and the shift book's
      // "Mời tất cả về" is the cheaper way out.
      const kick = kickTableRule(c) && show.kick && w.phase === 'open' && guests.length ? kickTableQuote(w, game.config, table) : null;
      const kickWhy = kick && !kick.ok ? whyNot(kick.reason) : '', kickPrice = kick?.cost != null ? `kick-price-${table.id}` : '';
      return <section ref={orderPanelRef} id="active-table-order" className={`order-panel ${o?.state === 'grace' ? 'is-urgent' : ''}`} role="dialog" aria-label={t('table', { n: w.tables.indexOf(table) + 1 })}>
        <header><span className={`customer-tag type-${type}`}>{guests.length ? t(`customer.${type}`) : t('table.empty')}</span><span>{t('table', { n: w.tables.indexOf(table) + 1 })}</span><button className="icon-button" aria-label={t('close')} onClick={() => setSelectedTable(null)}><Icon name="close" /></button></header>
        {guests.length > 0 && <p className="customer-trait">{t(`customer.trait.${type}`)}</p>}{/* founder 2026-10-22 (B2.3): one trait line under the guest type */}
        {active ? <><div className="order-heading"><strong>{dishes.length === 1 ? t(`dish.${dishes[0].dish}`) : t('order.dishCount', { n: dishes.length })}</strong><span className={`order-clock ${tipWindow(o, guests, Boolean(stale)) ? 'is-tip' : ''}`}><b>{orderTime(o)}</b>{tipWindow(o, guests, Boolean(stale)) && <small>{t('order.tipOpen')}</small>}</span></div>
          <div className="order-dishes">{dishes.map(({ dish, items }) => <div key={dish} className={items.every(i => i.state === 'ready') ? 'dish-ready' : ''}><Sprite id={menuAsset[dish]} /><strong>{t(`dish.${dish}`)}</strong>{items.every(i => i.state === 'ready') && <Icon name="check" />}<span>{items.filter(i => i.state === 'ready').length}/{items.length}</span></div>)}</div>
          <p role="status" data-preparation={preparation}>{t(`order.feedback.${preparation}`)}</p>
          {['beerStock', 'foodStock'].includes(preparation) && <button className="secondary full" onClick={() => { setSelectedTable(null); open('stock'); }}>{t('nav.stock')}</button>}
          {kitchen.jobs.some(job => job.orderId === o.id && job.state !== 'ready') && <button className="secondary full kitchen-link" onClick={() => { setSelectedTable(null); setSelectedEquipment('kitchen'); }}>{t('kitchen.live')}</button>}
          {(stale || o.state === 'grace') && <p className="order-warning">{t(stale ? 'order.stale' : 'order.grace')}</p>}
          <button {...lit(spot.target?.kind === 'ready' && spot.target.tableId === table.id)} className="primary full" disabled={!ready} onClick={async () => { if ((await run({ type: 'serve', tableId: table.id, orderId: o.id })).ok) setSelectedTable(current => current === table.id ? null : current); }}><Icon name="check" />{t('order.serve')}</button>
        </> : <p className="idle-table-info">{t(`table.${table.state}`)} · {t('table.seats', { n: table.capacity })}</p>}
        {kick && <div className="kick-table" data-kick={kick.ok ? 'ready' : kick.reason ?? undefined}>
          {kickPrice && <p className="kick-price" id={kickPrice}>{t('kick.price', { cost: num(kick.cost!), rep: num(kick.reputation) })}</p>}
          <button className="secondary full" disabled={!kick.ok} aria-describedby={[kickPrice, kickWhy ? `kick-reason-${table.id}` : ''].filter(Boolean).join(' ') || undefined}
            onClick={async () => { if ((await run({ type: 'kickTable', tableId: table.id, maxCost: kick.cost! })).ok) setSelectedTable(current => current === table.id ? null : current); }}>{t('kick.button')}</button>
          {kickWhy && <p id={`kick-reason-${table.id}`} className="buy-reason" role="status">{kickWhy}</p>}
        </div>}
      </section>;
    })()}

  </div>;
}
