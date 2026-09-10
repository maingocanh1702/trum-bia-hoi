import { useEffect, useRef, useState } from 'react';
import { AdminError, HTTP_MS, request, type Actor } from './admin-api';
import type { Competition, CompetitionRequest } from '../../server/src/competition';
type Profile = ReturnType<Competition['state']>;
type History = ReturnType<Competition['history']>;
type Intent = { owner: string; request: CompetitionRequest };
const PREFIX = 'tbh.admin.competition.v1.';
function readIntent(key: string, owner: string) {
  try {
    const raw = sessionStorage.getItem(key); if (!raw) return { pending: null, corrupt: false };
    if (raw.length > 16384) throw Error(); // config-exempt: bounded local recovery record
    const saved = JSON.parse(raw), p = saved?.request;
    if (saved?.owner !== owner || Object.keys(saved).sort().join(',') !== 'owner,request' || !p ||
      ![p.key, p.playerId, p.reason].every(v => typeof v === 'string' && v.trim()) || p.key.length > 128 || p.playerId.length > 128 || p.reason.length > 1000 ||
      !Number.isSafeInteger(p.expectedSeq) || p.expectedSeq < 0 || (p.type === 'flag' ? typeof p.value !== 'boolean' || Object.keys(p).sort().join(',') !== 'expectedSeq,key,playerId,reason,type,value' :
        p.type !== 'import-review' || !['approved', 'rejected'].includes(p.value) || typeof p.digest !== 'string' || !/^[a-f0-9]{64}$/.test(p.digest) ||
        Object.keys(p).sort().join(',') !== 'digest,expectedSeq,key,playerId,reason,type,value')) throw Error(); // config-exempt: mirrors the bounded request protocol, not game rules
    return { pending: saved as Intent, corrupt: false };
  } catch { return { pending: null, corrupt: true }; }
}

export function AdminCompetition({ actor, context, t, locale, fail, download }: { actor: Actor; context: string; t: (key: string) => string; locale: string; fail: (e: unknown) => void; download: (text: string, filename: string) => void }) {
  const storageKey = PREFIX + encodeURIComponent(actor.subject);
  const [saved, setSaved] = useState(() => readIntent(storageKey, actor.subject)), { pending, corrupt } = saved;
  const [player, setPlayer] = useState(pending?.request.playerId ?? ''), [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<History | null>(null), [reason, setReason] = useState(''), [confirm, setConfirm] = useState<CompetitionRequest | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const job = useRef<AbortController | null>(null), live = useRef(true), dialog = useRef<HTMLDialogElement>(null);
  const writable = ['super', 'game'].includes(actor.role), date = (at: number) => new Date(at).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' });
  useEffect(() => { live.current = true; return () => { live.current = false; job.current?.abort(); }; }, []);
  useEffect(() => { if (confirm) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus(); } else dialog.current?.close(); }, [confirm]);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (job.current) return; const controller = new AbortController(); job.current = controller; setBusy(true); setError(''); setMessage('');
    const timer = setTimeout(() => controller.abort(), HTTP_MS);
    try { await action(controller.signal); } catch (e) {
      if (live.current) {
        if (e instanceof AdminError && e.code.startsWith('competition:')) setError('review.conflict');
        else if (e instanceof AdminError && e.code === 'reviewStorage') setError('review.storage');
        else { setError('review.failed'); fail(e); }
      }
    } finally { clearTimeout(timer); if (live.current) setBusy(false); job.current = null; }
  }
  async function page(p: Profile, kind: History['kind'], after: number, signal: AbortSignal) {
    const query = new URLSearchParams({ playerId: p.playerId, digest: p.localImport!.digest, kind, after: String(after) });
    const result = await request<History>('/competition/history?' + query, undefined, context, signal);
    if (live.current && !signal.aborted) setHistory(result);
  }
  async function inspect(id: string, signal: AbortSignal) {
    setProfile(null); setHistory(null); setConfirm(null); setReason('');
    const result = await request<Profile>('/competition?playerId=' + encodeURIComponent(id), undefined, context, signal);
    if (!live.current || signal.aborted) return;
    setProfile(result); setPlayer(result.playerId);
    if (result.localImport) await page(result, 'events', 0, signal);
  }
  function prepare(type: 'flag' | 'import-review', value: boolean | 'approved' | 'rejected') {
    if (!profile || pending || corrupt || busy || !writable || !reason.trim()) return;
    const common = { key: crypto.randomUUID(), playerId: profile.playerId, reason: reason.trim() };
    if (type === 'flag') setConfirm({ ...common, type, value: value as boolean, expectedSeq: profile.flag.seq });
    else if (profile.localImport && history?.digest === profile.localImport.digest) setConfirm({ ...common, type, value: value as 'approved' | 'rejected', digest: profile.localImport.digest, expectedSeq: profile.localImport.review.seq });
  }
  function clearIntent() { sessionStorage.removeItem(storageKey); setSaved({ pending: null, corrupt: false }); }
  async function send(p: CompetitionRequest, signal: AbortSignal) {
    const intent = { owner: actor.subject, request: p };
    try { sessionStorage.setItem(storageKey, JSON.stringify(intent)); } catch { throw new AdminError('reviewStorage'); }
    setSaved({ pending: intent, corrupt: false }); setConfirm(null);
    let receipt: ReturnType<Competition['decide']>;
    try { receipt = await request<ReturnType<Competition['decide']>>('/competition', p, context, signal); }
    catch (e) {
      if (live.current && e instanceof AdminError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status)) { clearIntent(); setProfile(null); setHistory(null); }
      throw e;
    }
    if (!live.current || signal.aborted) return;
    if (receipt.actor !== actor.subject || Object.keys(receipt.request).length !== Object.keys(p).length || Object.entries(p).some(([key, value]) => (receipt.request as unknown as Record<string, unknown>)[key] !== value)) throw new AdminError('network');
    clearIntent(); setReason(''); setMessage('review.saved');
    await inspect(p.playerId, signal);
  }
  const label = (p: CompetitionRequest) => t('review.' + (p.type === 'flag' ? p.value ? 'flag' : 'clear' : p.value === 'approved' ? 'approve' : 'reject'));
  const summary = (p: CompetitionRequest) => <dl><dt>{t('review.action')}</dt><dd>{label(p)}</dd><dt>{t('review.player')}</dt><dd>{p.playerId}</dd>{p.type === 'import-review' && <><dt>{t('review.digest')}</dt><dd className="admin-version">{p.digest}</dd></>}<dt>{t('review.reason')}</dt><dd>{p.reason}</dd></dl>;
  return <section className="admin-panel admin-review" aria-label={t('review.title')} aria-busy={busy}>
    <h2>{t('review.title')}</h2><p>{t('review.note')}</p>
    {error && <p role="alert" className="admin-alert">{t(error)}</p>}{message && <p role="status" className="admin-success">{t(message)}</p>}
    {corrupt && <><p role="alert">{t('review.corrupt')}</p><button disabled={busy} onClick={() => void run(async () => download(sessionStorage.getItem(storageKey) ?? '', 'admin-review-recovery.json'))}>{t('review.recover')}</button><button disabled={busy} onClick={() => { if (window.confirm(t('review.discardConfirm'))) void run(async () => clearIntent()); }}>{t('review.discard')}</button></>}
    {pending && <div className="admin-alert"><p>{t('review.uncertain')}</p>{summary(pending.request)}<button disabled={busy || !writable} onClick={() => void run(signal => send(pending.request, signal))}>{t('review.retry')}</button></div>}
    <form onSubmit={e => { e.preventDefault(); void run(signal => inspect(player.trim(), signal)); }}><fieldset disabled={busy || !!pending || corrupt}>
      <label>{t('review.player')}<input required maxLength={128} value={player} onChange={e => { setPlayer(e.target.value); setProfile(null); setHistory(null); setReason(''); }} /></label><button>{t('review.inspect')}</button>
    </fieldset></form>
    {profile && <><h3>{profile.playerId}</h3><p>{t('review.' + profile.provider)} · {t(profile.flag.value ? 'review.flagged' : 'review.clearStatus')}</p>
      {profile.flag.decision && <p>{profile.flag.decision.actor} · {date(profile.flag.decision.at)} · {profile.flag.decision.request.reason}</p>}
      {profile.localImport ? <><dl><dt>{t('review.status')}</dt><dd>{t('review.' + profile.localImport.review.value)}</dd><dt>{t('review.digest')}</dt><dd className="admin-version">{profile.localImport.digest}</dd><dt>{t('review.cutoff')}</dt><dd>{date(profile.localImport.sourceNow)}</dd></dl>
        {profile.localImport.review.decision && <p>{profile.localImport.review.decision.actor} · {date(profile.localImport.review.decision.at)} · {profile.localImport.review.decision.request.reason}</p>}
        <div className="admin-toolbar">{(['events', 'commands'] as const).map(kind => <button key={kind} disabled={busy || !!pending} onClick={() => void run(signal => page(profile, kind, 0, signal))}>{t('review.' + kind)}</button>)}</div>
        {history && <><p>{t('review.' + history.kind)} · {history.entries.length ? history.after + 1 : 0}–{history.after + history.entries.length} / {history.through}</p>
          <ol className="admin-audit admin-history" tabIndex={0} aria-label={t('review.' + history.kind)}>{history.entries.map(row => <li key={history.kind + row.seq}><strong>{row.seq} · {'command' in row.record ? row.record.command.type : row.record.type}</strong><p>{date(row.record.at)}</p><details><summary>{t('review.record')}</summary><pre>{JSON.stringify(row.record, null, 2)}</pre></details></li>)}</ol>
          {history.nextCursor !== null && <button disabled={busy || !!pending} onClick={() => void run(signal => page(profile, history.kind, history.nextCursor!, signal))}>{t('review.more')}</button>}
        </>}
      </> : <p>{t('review.noImport')}</p>}
      {writable ? <fieldset disabled={busy || !!pending || corrupt}><label>{t('review.reason')}<textarea required maxLength={1000} rows={2} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="admin-toolbar">
        {profile.localImport && (['approved', 'rejected'] as const).map(value => <button key={value} disabled={!reason.trim() || !history || profile.localImport!.review.value === value} onClick={() => prepare('import-review', value)}>{t(value === 'approved' ? 'review.approve' : 'review.reject')}</button>)}
        <button disabled={!reason.trim()} onClick={() => prepare('flag', !profile.flag.value)}>{t(profile.flag.value ? 'review.clear' : 'review.flag')}</button>
      </div></fieldset> : <p>{t('review.readOnly')}</p>}
    </>}
    <dialog ref={dialog} className="admin-dialog" aria-labelledby="review-confirm-title" onCancel={e => { if (busy) e.preventDefault(); else setConfirm(null); }} onClose={() => setConfirm(null)}>
      {confirm && <><h2 id="review-confirm-title">{t('review.confirm')}</h2>{summary(confirm)}<p>{t('review.note')}</p>{error && <p role="alert">{t(error)}</p>}<div className="admin-toolbar"><button data-cancel disabled={busy} onClick={() => setConfirm(null)}>{t('cancel')}</button><button className="primary" disabled={busy} onClick={() => void run(signal => send(confirm, signal))}>{t('review.submit')}</button></div></>}
    </dialog>
  </section>;
}
