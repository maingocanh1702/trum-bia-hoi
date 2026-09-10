import { useEffect, useMemo, useRef, useState } from 'react';
import { translate, type Locale } from './i18n';
import { AdminError, ADMIN_BYTES, DRAFT_KEY, atPath, configFields, googleScript, preview, readDraft, request, type Auth, type Details, type Draft, type Index, type DraftSource, type Impact, type Players, type Tickets, type Ticket } from './admin-api';
import { emptyScope, ScopeEditor, ScopeView, ImpactView } from './AdminScope';
import { AdminForecast } from './AdminForecast';
import { AdminCompetition } from './AdminCompetition';
import './admin.css';
type Audit = {events:{seq:number;type:string;data:unknown}[];nextCursor:number};
const json = (v:unknown) => JSON.stringify(v, null, 2) ?? '—';
function download(text:string, filename:string) { const url=URL.createObjectURL(new Blob([text],{type:'application/json'})); const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),0); }
export default function Admin() {
  const [locale,setLocale]=useState<Locale>('vi'), t=(key:string)=>translate(locale,'admin.'+key);
  const [auth,setAuth]=useState<Auth|null>(null), [index,setIndex]=useState<Index|null>(null), [details,setDetails]=useState<Details|null>(null);
  const [draft,setDraft]=useState<Draft|null>(null), [base,setBase]=useState<Details['snapshot']|null>(null), [stored,setStored]=useState(true), [corrupt,setCorrupt]=useState(false);
  const [error,setError]=useState(''), [message,setMessage]=useState(''), [busy,setBusy]=useState(false), busyRef=useRef(false);
  const [code,setCode]=useState(''), [search,setSearch]=useState(''), [field,setField]=useState(''), [value,setValue]=useState(''), [version,setVersion]=useState('');
  const [diff,setDiff]=useState<ReturnType<typeof preview>|null>(null), [audit,setAudit]=useState<Audit|null>(null), [confirm,setConfirm]=useState<Details|null>(null);
  const [impact,setImpact]=useState<Impact|null>(null), [players,setPlayers]=useState<Players|null>(null), [tickets,setTickets]=useState<Tickets|null>(null);
  const [caseKey,setCaseKey]=useState(''), [casePlayer,setCasePlayer]=useState(''), [caseReason,setCaseReason]=useState('');
  const gis=useRef<HTMLDivElement>(null), dialog=useRef<HTMLDialogElement>(null), generation=useRef(0);
  function clearProtected() { generation.current++;setCaseKey('');setCasePlayer('');setCaseReason('');setImpact(null);setPlayers(null);setTickets(null);setAuth({enabled:true,phase:'signedOut'});setIndex(null);setDetails(null);setBase(null);setDiff(null);setAudit(null);setConfirm(null);setField('');setValue(''); }
  function fail(e:unknown) {
    const code=e instanceof AdminError ? e.code : 'config';
    if(['admin:accountChanged','admin:invalidSession','invalidSession','registry:invalidActor'].includes(code)) {clearProtected();setError(t('error.session'));return;}
    const key=code==='network'?'network':code.includes('invalidFactor')?'factor':code.includes('rateLimited')?'limit':code.includes('forbidden')||code.includes('distinctApprover')?'forbidden':code.includes('staleBase')?'stale':code.includes('earlyActivation')||code.includes('scheduleConflict')?'activation':code.includes('google')||code==='googleScript'?'google':code==='registry:missingScope'?'scopeMissing':code==='registry:invalidScope'?'scope':code==='registry:invalidExpiry'?'expiry':code==='registry:scopeConflict'?'conflict':code==='registry:invalidTicket'?'ticket':code==='registry:keyConflict'?'keyConflict':code==='registry:staleForecast'?'staleForecast':code==='registry:staleImpact'?'staleImpact':code==='bodyTooLarge'?'large':code.startsWith('config:')||code==='config'?'config':'generic';
    setError(t('error.'+key));
  }
  async function run(action:()=>Promise<void>) { if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setMessage('');try {await action();}catch(e){fail(e);}finally{busyRef.current=false;setBusy(false);} }
  function persist(d:Draft) { setDraft(d);setDiff(null);try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(d));setStored(true);return true;}catch{setStored(false);return false;} }
  function syncValue(text:string,path=field) {try{setValue(path?json(atPath(JSON.parse(text),path)):'');}catch{setValue('');}}
  function replaceDraft(d:Draft) {persist(d);syncValue(d.text);}
  function discard() {sessionStorage.removeItem(DRAFT_KEY);setDraft(null);setBase(null);setDiff(null);setCorrupt(false);setStored(true);setField('');setValue('');}
  async function refresh(a=auth) { if(!a?.context)return; const next=await request<Index>('/registry',undefined,a.context);setIndex(next); }
  async function who() { const next=await request<Auth>('/auth');setAuth(next);if(next.phase==='authenticated'){
    await refresh(next);let saved:Draft|null=null;try{saved=readDraft();setDraft(saved);syncValue(saved?.text??'');setCorrupt(false);}catch{setCorrupt(true);}
    if(saved && saved.owner===next.actor?.subject){const d=await request<Details>('/config?version='+encodeURIComponent(saved.baseVersion),undefined,next.context);setBase(d.snapshot);}
  } }
  useEffect(()=>{void run(who);return()=>{generation.current++;};},[]);
  useEffect(()=>{if(stored)return;const protect=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[stored]);
  useEffect(()=>{if(confirm){dialog.current?.showModal();dialog.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();}else dialog.current?.close();},[confirm]);
  // Check on return to this tab, but never adopt a different identity into an open editor.
  useEffect(()=>{if(auth?.phase!=='authenticated')return;const check=()=>{if(!document.hidden&&!busyRef.current)void run(async()=>{const next=await request<Auth>('/auth');if(next.context!==auth.context)throw new AdminError('admin:accountChanged');});};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};},[auth?.context]);
  async function startGoogle() { const g=++generation.current; const c=await request<{clientId:string;nonce:string}>('/auth/challenge',{});const api=await googleScript();if(g!==generation.current||!gis.current)return;
    api.initialize({client_id:c.clientId,nonce:c.nonce,auto_select:false,callback:result=>{if(g!==generation.current)return;void run(async()=>{await request('/auth/google',{credential:result.credential});if(g!==generation.current)return;gis.current?.replaceChildren();await who();});}});
    gis.current.replaceChildren();api.renderButton(gis.current,{type:'standard',theme:'filled_blue',size:'large',text:'signin_with',locale,width:280});
  }
  async function show(v:string) { setImpact(null);const d=await request<Details>('/config?version='+encodeURIComponent(v),undefined,auth!.context);setDetails(d);setVersion(v);
    if(d.scope&&d.draft&&!d.publication)setImpact(await request<Impact>('/impact',{version:v},auth!.context));
  }
  async function newDraft(sourceVersion?:string, scopePath?:string) { if(corrupt||draft?.locked)return;
    if(draft&&!window.confirm(t('discardConfirm')))return;
    const source=await request<DraftSource>(scopePath??('/draft-source'+(sourceVersion?'?version='+encodeURIComponent(sourceVersion):'')),undefined,auth!.context);
    setBase(source.base);replaceDraft({owner:auth!.actor!.subject,baseVersion:source.baseVersion,text:json(source.snapshot),reason:'',effective:'',key:crypto.randomUUID(),locked:false,...(source.scope?{scope:source.scope}:{})});await refresh();
  }
  async function loadScope() {if(draft?.scope)await newDraft(undefined,'/scope?kind='+draft.scope.kind+'&id='+encodeURIComponent(draft.scope.id));}
  function useTicket(ticket:Ticket) {if(!draft||draft.locked||!own)return;const current=draft.scope?.kind==='player'&&draft.scope.id===ticket.player_id?draft.scope:emptyScope('player');
    update({scope:{...current,id:ticket.player_id,playerIds:[ticket.player_id],ticketId:ticket.id}});
  }
  const own=draft?.owner===auth?.actor?.subject, canWrite=auth?.actor&&!['viewer','support'].includes(auth.actor.role);
  const fields=useMemo(()=>{try{return draft?configFields(JSON.parse(draft.text)):[];}catch{return[];}},[draft?.text]);
  const filtered=fields.filter(f=>f.path.toLowerCase().includes(search.toLowerCase()));
  function update(patch:Partial<Draft>) { if(draft&&!draft.locked){const next={...draft,...patch};if(Object.hasOwn(patch,'text'))replaceDraft(next);else persist(next);} }
  function apply() { if(!draft||draft.locked)return;const raw=JSON.parse(draft.text), keys=field.split('.'), leaf=keys.pop()!;
    const parent=keys.length?atPath(raw,keys.join('.')):raw;if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,leaf))throw new AdminError('config');
    Object.defineProperty(parent,leaf,{value:JSON.parse(value),enumerable:true,writable:true,configurable:true});update({text:json(raw)});
  }
  async function submit() { if(!draft||!base||!own||corrupt||!stored)return;const candidate=preview(base,draft.text);if(!candidate.rows.length&&!draft.scope?.previousVersion)return;
    const pending={...draft,locked:true,...(draft.scope?{scope:{...draft.scope,playerIds:draft.scope.playerIds.filter(id=>id!=='')}}:{})};
    const payload={key:pending.key,baseVersion:pending.baseVersion,snapshot:candidate.config.raw,reason:pending.reason,...(pending.effective?{effective:pending.effective}:{}),...(pending.scope?{scope:pending.scope}:{})};
    if(new TextEncoder().encode(JSON.stringify(payload)).length>ADMIN_BYTES)throw new AdminError('bodyTooLarge');
    if(!persist(pending))return;
    let response:{version:string};
    try{ response=await request<{version:string}>('/proposals',payload,auth!.context); }
    catch(e){if(e instanceof AdminError&&e.status>=400&&e.status<500&&e.status!==429)persist({...pending,locked:false});throw e;}
    // The write receipt resolves the intent even if a later protected read fails.
    discard();await show(response.version);await refresh();setMessage(t('done'));
  }
  async function mutate(action:'approve'|'publish',d:Details) {
    try {await request('/'+action,{version:d.snapshot._meta.version,...(action==='publish'&&d.scope?{impactToken:impact?.token}:{})},auth!.context);}
    catch(e) {if(e instanceof AdminError&&e.code==='registry:staleImpact'){setConfirm(null);await show(d.snapshot._meta.version);}throw e;}
    setConfirm(null);await show(d.snapshot._meta.version);await refresh();setMessage(t('done'));
  }
  function Diff({data}:{data:ReturnType<typeof preview>}) {return <div className="admin-table" tabIndex={0} role="region" aria-label={t('changes')}><table><thead><tr><th>{t('key')}</th><th>{t('before')}</th><th>{t('after')}</th></tr></thead><tbody>{data.rows.map(r=><tr key={r.path}><th scope="row">{r.path}</th><td><pre>{json(r.before)}</pre>{JSON.stringify(r.before)!==JSON.stringify(r.beforeScaled)&&<p>{t('scaled')}: {json(r.beforeScaled)}</p>}</td><td><pre>{json(r.value)}</pre>{JSON.stringify(r.value)!==JSON.stringify(r.scaled)&&<p>{t('scaled')}: {json(r.scaled)}</p>}</td></tr>)}</tbody></table>{!data.rows.length&&<p>{t('empty')}</p>}</div>;}
  function Detail({d}:{d:Details}) {return <><ScopeView scope={d.scope} t={t} locale={locale}/>{d.previous&&<details><summary>{t('scope.previous')}</summary><ScopeView scope={d.previous.scope} t={t} locale={locale}/><Diff data={preview(d.previous.base,json(d.previous.snapshot))}/></details>}<p className="admin-version">{d.snapshot._meta.version}</p>{d.draft&&<dl><dt>{t('base')}</dt><dd>{d.draft.base_version}</dd><dt>{t('author')}</dt><dd>{d.draft.changed_by}</dd><dt>{t('reason')}</dt><dd>{d.draft.reason}</dd><dt>{t('tier')}</dt><dd>{d.policy?.tier}</dd><dt>{t('effective')}</dt><dd>{t(d.draft.effective)}</dd><dt>{t('approver')}</dt><dd>{d.approval?.approved_by??t('unapproved')}</dd></dl>}
    {d.policy?.tier==='A'&&<p>{t('dual')}</p>}<p>{d.publication?t('published'):t('unpublished')}{d.publication&&<> · {t('at')} {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d.publication.effective_at)} (UTC+07:00)</>}</p>
    {d.previous&&d.draft?.keys==='[]'&&<p>{t('scope.withdraw')}</p>}{d.base&&<Diff data={preview(d.base,json(d.snapshot))}/>} {impact?.version===d.snapshot._meta.version&&<ImpactView data={impact} t={t} locale={locale}/>}</>;}
  return <main className="admin-page" lang={locale}><header className="admin-header"><div><p className="admin-brand">TRÙM BIA HƠI</p><h1>{t('title')}</h1><p>{t('subtitle')}</p></div><label>{t('language')}<select value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label></header>
    {error&&<p className="admin-alert" role="alert">{error}</p>}{message&&<p className="admin-success" role="status">{message}</p>}{busy&&<p className="admin-busy" role="status">{t('loading')}</p>}
    {!auth&&<button disabled={busy} onClick={()=>void run(who)}>{t('refresh')}</button>}
    {auth?.phase!=='authenticated'&&auth&&<section className="admin-panel admin-login"><h2>{t(auth.phase==='mfa'?'mfa':'login')}</h2><p>{t(auth.enabled?'access':'unavailable')}</p>{auth.enabled&&<>
      {auth.phase==='mfa'&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{await request('/auth/factor',{code});setCode('');await who();});}}><label>{t('otp')}<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></label><button className="primary" disabled={busy}>{t('verify')}</button></form>}
      <button disabled={busy} onClick={()=>void run(startGoogle)}>{t(auth.phase==='mfa'?'restart':'google')}</button><div ref={gis} className="admin-gis"/></>}</section>}
    {auth?.phase==='authenticated'&&<>
      <section className="admin-toolbar"><span className="admin-role">{auth.actor!.role} · {auth.actor!.subject}</span><button disabled={busy} onClick={()=>void run(async()=>{await refresh();if(details)await show(details.snapshot._meta.version);})}>{t('refresh')}</button><button disabled={busy} onClick={()=>void run(async()=>{await request('/auth/logout',{});clearProtected();try{discard();}catch{setCorrupt(true);}setCode('');})}>{t('logout')}</button></section>
      {index&&<section className="admin-panel"><div className="admin-summary"><div><p>{t('active')}</p><strong className="admin-version">{index.activeVersion}</strong></div><div><p>{t('latest')}</p><button className="admin-version" disabled={busy} onClick={()=>void run(()=>show(index.latest.version))}>{index.latest.version}</button></div></div><p>{t('pin')}</p>{canWrite?<button disabled={busy||corrupt||!!draft?.locked||!!draft&&!own} onClick={()=>void run(()=>newDraft())}>{t('new')}</button>:<p>{t('readonly')}</p>}</section>}
      {corrupt&&<section className="admin-panel"><p role="alert">{t('corrupt')}</p><button onClick={()=>void run(async()=>download(sessionStorage.getItem(DRAFT_KEY)??'', 'admin-draft-recovery.json'))}>{t('recover')}</button><button disabled={busy} onClick={()=>void run(async()=>{if(window.confirm(t('discardConfirm')))discard();})}>{t('discard')}</button></section>}
      {draft&&!own&&<p className="admin-alert">{t('otherOwner')}</p>}
      {draft&&own&&base&&canWrite&&<section className="admin-panel"><div className="admin-toolbar"><h2>{t('draft')}</h2><span>{t(stored?'saved':'storage')}</span></div><p className="admin-version">{t('base')} {draft.baseVersion}</p>{draft.locked&&<p role="status">{t('pending')}</p>}
        <fieldset disabled={busy||draft.locked}><ScopeEditor scope={draft.scope} change={scope=>update({scope})} load={()=>void run(loadScope)} t={t} superAdmin={auth.actor!.role==='super'}/>{draft.scope?.previousVersion&&<button type="button" onClick={()=>update({text:json(base)})}>{t('scope.withdraw')}</button>}<label>{t('search')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t('field')}<select value={field} onChange={e=>{setField(e.target.value);syncValue(draft.text,e.target.value);}}><option value="">—</option>{filtered.map(f=><option key={f.path} value={f.path}>{f.path}</option>)}</select></label>
          <label>{t('value')}<textarea rows={3} value={value} onChange={e=>setValue(e.target.value)} spellCheck={false}/></label><button type="button" disabled={!field} onClick={()=>void run(async()=>apply())}>{t('apply')}</button>
          <details><summary>{t('json')}</summary><label>{t('json')}<textarea className="admin-json" rows={12} value={draft.text} onChange={e=>update({text:e.target.value})} spellCheck={false}/></label></details>
          <label>{t('import')}<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>ADMIN_BYTES)throw new AdminError('bodyTooLarge');const text=await f.text();preview(base,text);update({text});});}}/></label>
          <label>{t('reason')}<textarea maxLength={1000} value={draft.reason} onChange={e=>update({reason:e.target.value})} required rows={2}/></label>
          <label>{t('effective')}<select value={draft.effective} onChange={e=>update({effective:e.target.value})}>{['','immediate','next_shift','next_day','next_season'].map(v=><option value={v} key={v}>{t(v||'auto')}</option>)}</select></label>
        </fieldset>
        <div className="admin-toolbar"><button disabled={busy} onClick={()=>download(draft.text,'tbh-config-draft.json')}>{t('export')}</button><button disabled={busy} onClick={()=>void run(async()=>{const result=preview(base,draft.text);if(!stored)persist(draft);setDiff(result);})}>{t('preview')}</button><button disabled={busy||draft.locked} onClick={()=>void run(async()=>{if(window.confirm(t('discardConfirm')))discard();})}>{t('discard')}</button></div>
        {diff&&<><h3>{t('changes')}</h3><Diff data={diff}/></>}
        <button className="primary" disabled={busy||!stored||!draft.reason.trim()||!draft.locked&&(!diff||!diff.rows.length&&!draft.scope?.previousVersion)} onClick={()=>void run(submit)}>{t('propose')}</button>
      </section>}
      <section className="admin-panel"><h2>{t('proposals')}</h2><ul className="admin-proposals">{index?.proposals.map(p=><li key={p.version}><button disabled={busy} onClick={()=>void run(()=>show(p.version))}><strong>{p.reason}</strong><span className="admin-version">{p.version}</span><span>{t('scope.'+(p.scope?.kind??'default'))}{p.scope?' · '+p.scope.id:''} · {p.changed_by} · {t(p.effective)}</span></button></li>)}</ul>{index?.nextCursor&&<button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Index>('/registry?before='+index.nextCursor,undefined,auth.context);setIndex({...next,proposals:[...index.proposals,...next.proposals]});})}>{t('more')}</button>}
        <form className="admin-toolbar" onSubmit={e=>{e.preventDefault();void run(()=>show(version));}}><label>{t('version')}<input value={version} required maxLength={128} onChange={e=>setVersion(e.target.value)}/></label><button disabled={busy}>{t('open')}</button></form></section>
      {details&&<section className="admin-panel" aria-label={t('details')}><h2>{t('details')}</h2><Detail d={details}/><div className="admin-toolbar"><button onClick={()=>download(json(details.snapshot),'tbh-config.json')}>{t('export')}</button>{canWrite&&details.publication&&<button disabled={busy||!!draft?.locked||corrupt||!!draft&&!own} onClick={()=>void run(()=>newDraft(details.snapshot._meta.version))}>{t('rollback')}</button>}{details.permissions.approve&&<button disabled={busy||!!details.scope&&impact?.version!==details.snapshot._meta.version} onClick={()=>void run(()=>mutate('approve',details))}>{t('approve')}</button>}{details.permissions.publish&&<button className="primary" disabled={busy||!!details.scope&&impact?.version!==details.snapshot._meta.version} onClick={()=>setConfirm(details)}>{t('publish')}</button>}</div></section>}
      {details?.draft&&!details.publication&&<AdminForecast key={details.snapshot._meta.version+auth.context} version={details.snapshot._meta.version} context={auth.context!} t={t} locale={locale} fail={fail}/>}
      <section className="admin-panel"><details><summary>{t('scope.players')}</summary><p>{t('scope.idsOnly')}</p><button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Players>('/players'+(players?.nextCursor?'?after='+encodeURIComponent(players.nextCursor):''),undefined,auth.context);setPlayers({...next,players:players?.nextCursor?[...players.players,...next.players]:next.players});})}>{t(players?.nextCursor?'more':'refresh')}</button>{players&&<ul>{players.players.map(p=><li key={p.id}><code>{p.id}</code></li>)}</ul>}</details></section>
      {['super','game','support'].includes(auth.actor!.role)&&<AdminCompetition key={auth.context} actor={auth.actor!} context={auth.context!} t={t} locale={locale} fail={fail} download={download}/>}
      {['super','game','support'].includes(auth.actor!.role)&&<section className="admin-panel"><h2>{t('support.title')}</h2><p>{t('support.idempotency')}</p><form onSubmit={e=>{e.preventDefault();void run(async()=>{const result=await request<{ticketId:string}>('/support',{key:caseKey,playerId:casePlayer,reason:caseReason},auth.context);setMessage(t('support.saved')+' '+result.ticketId);setTickets(await request<Tickets>('/support',undefined,auth.context));});}}><fieldset disabled={busy}>
        <label>{t('support.case')}<input required maxLength={128} value={caseKey} onChange={e=>setCaseKey(e.target.value)}/></label><label>{t('support.player')}<input required maxLength={128} value={casePlayer} onChange={e=>setCasePlayer(e.target.value)}/></label><label>{t('support.reason')}<textarea required maxLength={1000} rows={2} value={caseReason} onChange={e=>setCaseReason(e.target.value)}/></label><button>{t('support.create')}</button></fieldset></form>
        <button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Tickets>('/support'+(tickets?.nextCursor?'?after='+tickets.nextCursor:''),undefined,auth.context);setTickets({...next,tickets:tickets?.nextCursor?[...tickets.tickets,...next.tickets]:next.tickets});})}>{t(tickets?.nextCursor?'more':'support.load')}</button>
        {tickets&&<ul className="admin-tickets">{tickets.tickets.map(ticket=><li key={ticket.id}><strong>{ticket.request_key}</strong><p className="admin-version">{ticket.id}</p><p>{ticket.player_id} · {ticket.reason}</p><p>{t(ticket.used_version?'support.used':'support.unused')}{ticket.used_version&&' · '+ticket.used_version}</p>{auth.actor!.role==='super'&&!ticket.used_version&&draft&&own&&<button disabled={busy||draft.locked} onClick={()=>useTicket(ticket)}>{t('support.use')}</button>}</li>)}</ul>}
      </section>}
      <section className="admin-panel"><h2>{t('audit')}</h2><button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Audit>('/audit?after='+(audit?.nextCursor??0),undefined,auth.context);setAudit({...next,events:[...(audit?.events??[]),...next.events]});})}>{t(audit?'more':'auditLoad')}</button>{audit&&<ol className="admin-audit">{audit.events.map(e=><li key={e.seq}><strong>{e.seq} · {e.type}</strong><pre>{json(e.data)}</pre></li>)}</ol>}</section>
    </>}
    <dialog ref={dialog} className="admin-dialog" onCancel={e=>{if(busy)e.preventDefault();else setConfirm(null);}} onClose={()=>setConfirm(null)} aria-labelledby="admin-confirm-title">{confirm&&<><h2 id="admin-confirm-title">{t('publishConfirm')}</h2><Detail d={confirm}/>{error&&<p className="admin-alert" role="alert">{error}</p>}<p>{t('pin')}</p><div className="admin-toolbar"><button data-cancel disabled={busy} onClick={()=>setConfirm(null)}>{t('cancel')}</button><button className="primary" disabled={busy} onClick={()=>void run(()=>mutate('publish',confirm))}>{t('confirm')}</button></div></>}</dialog>
  </main>;
}
