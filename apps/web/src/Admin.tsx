import { useEffect, useMemo, useRef, useState } from 'react';
import { translate, type Locale } from './i18n';
import { AdminError, ADMIN_BYTES, DRAFT_KEY, atPath, configFields, googleScript, preview, readDraft, request, type Auth, type Details, type Draft, type Index } from './admin-api';
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
  const gis=useRef<HTMLDivElement>(null), dialog=useRef<HTMLDialogElement>(null), generation=useRef(0);
  function clearProtected() { generation.current++;setAuth({enabled:true,phase:'signedOut'});setIndex(null);setDetails(null);setBase(null);setDiff(null);setAudit(null);setConfirm(null); }
  function fail(e:unknown) {
    const code=e instanceof AdminError ? e.code : 'config';
    if(['admin:accountChanged','admin:invalidSession','invalidSession','registry:invalidActor'].includes(code)) {clearProtected();setError(t('error.session'));return;}
    const key=code==='network'?'network':code.includes('invalidFactor')?'factor':code.includes('rateLimited')?'limit':code.includes('forbidden')||code.includes('distinctApprover')?'forbidden':code.includes('staleBase')?'stale':code.includes('earlyActivation')||code.includes('scheduleConflict')?'activation':code.includes('google')||code==='googleScript'?'google':code==='bodyTooLarge'?'large':code.startsWith('config:')||code==='config'?'config':'generic';
    setError(t('error.'+key));
  }
  async function run(action:()=>Promise<void>) { if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setMessage('');try {await action();}catch(e){fail(e);}finally{busyRef.current=false;setBusy(false);} }
  function persist(d:Draft) { setDraft(d);setDiff(null);try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(d));setStored(true);return true;}catch{setStored(false);return false;} }
  function discard() {sessionStorage.removeItem(DRAFT_KEY);setDraft(null);setBase(null);setDiff(null);setCorrupt(false);setStored(true);}
  async function refresh(a=auth) { if(!a?.context)return; const next=await request<Index>('/registry',undefined,a.context);setIndex(next); }
  async function who() { const next=await request<Auth>('/auth');setAuth(next);if(next.phase==='authenticated'){
    await refresh(next);let saved:Draft|null=null;try{saved=readDraft();setDraft(saved);setCorrupt(false);}catch{setCorrupt(true);}
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
  async function show(v:string) { const d=await request<Details>('/config?version='+encodeURIComponent(v),undefined,auth!.context);setDetails(d);setVersion(v); }
  async function newDraft(snapshot?:Details['snapshot']) { if(corrupt||draft?.locked)return;
    if(draft&&!window.confirm(t('discardConfirm')))return;
    const latest=await request<Index>('/registry',undefined,auth!.context), b=await request<Details>('/config?version='+encodeURIComponent(latest.latest.version),undefined,auth!.context);
    setIndex(latest);setBase(b.snapshot);persist({owner:auth!.actor!.subject,baseVersion:latest.latest.version,text:json(snapshot??b.snapshot),reason:'',effective:'',key:crypto.randomUUID(),locked:false});
  }
  const own=draft?.owner===auth?.actor?.subject, canWrite=auth?.actor&&!['viewer','support'].includes(auth.actor.role);
  const fields=useMemo(()=>{try{return draft?configFields(JSON.parse(draft.text)):[];}catch{return[];}},[draft?.text]);
  const filtered=fields.filter(f=>f.path.toLowerCase().includes(search.toLowerCase()));
  function update(patch:Partial<Draft>) { if(draft&&!draft.locked)persist({...draft,...patch}); }
  function apply() { if(!draft||draft.locked)return;const raw=JSON.parse(draft.text), keys=field.split('.'), leaf=keys.pop()!;
    const parent=keys.length?atPath(raw,keys.join('.')):raw;if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,leaf))throw new AdminError('config');
    Object.defineProperty(parent,leaf,{value:JSON.parse(value),enumerable:true,writable:true,configurable:true});update({text:json(raw)});
  }
  async function submit() { if(!draft||!base||!own||corrupt||!stored)return;const candidate=preview(base,draft.text);if(!candidate.rows.length)return;
    const pending={...draft,locked:true};
    const payload={key:pending.key,baseVersion:pending.baseVersion,snapshot:candidate.config.raw,reason:pending.reason,...(pending.effective?{effective:pending.effective}:{})};
    if(new TextEncoder().encode(JSON.stringify(payload)).length>ADMIN_BYTES)throw new AdminError('bodyTooLarge');
    if(!persist(pending))return;
    try{ const response=await request<{version:string}>('/proposals',payload,auth!.context);
      discard();await show(response.version);await refresh();setMessage(t('done'));
    }catch(e){if(e instanceof AdminError&&e.status>=400&&e.status<500&&e.status!==429)persist({...pending,locked:false});throw e;}
  }
  async function mutate(action:'approve'|'publish',d:Details) {await request('/'+action,{version:d.snapshot._meta.version},auth!.context);setConfirm(null);await show(d.snapshot._meta.version);await refresh();setMessage(t('done'));}
  function Diff({data}:{data:ReturnType<typeof preview>}) {return <div className="admin-table" tabIndex={0} role="region" aria-label={t('changes')}><table><thead><tr><th>{t('key')}</th><th>{t('before')}</th><th>{t('after')}</th></tr></thead><tbody>{data.rows.map(r=><tr key={r.path}><th scope="row">{r.path}</th><td><pre>{json(r.before)}</pre>{JSON.stringify(r.before)!==JSON.stringify(r.beforeScaled)&&<p>{t('scaled')}: {json(r.beforeScaled)}</p>}</td><td><pre>{json(r.value)}</pre>{JSON.stringify(r.value)!==JSON.stringify(r.scaled)&&<p>{t('scaled')}: {json(r.scaled)}</p>}</td></tr>)}</tbody></table>{!data.rows.length&&<p>{t('empty')}</p>}</div>;}
  function Detail({d}:{d:Details}) {return <><p className="admin-version">{d.snapshot._meta.version}</p>{d.draft&&<dl><dt>{t('base')}</dt><dd>{d.draft.base_version}</dd><dt>{t('author')}</dt><dd>{d.draft.changed_by}</dd><dt>{t('reason')}</dt><dd>{d.draft.reason}</dd><dt>{t('tier')}</dt><dd>{d.policy?.tier}</dd><dt>{t('effective')}</dt><dd>{t(d.draft.effective)}</dd><dt>{t('approver')}</dt><dd>{d.approval?.approved_by??t('unapproved')}</dd></dl>}
    {d.policy?.tier==='A'&&<p>{t('dual')}</p>}<p>{d.publication?t('published'):t('unpublished')}{d.publication&&<> · {t('at')} {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d.publication.effective_at)} (UTC+07:00)</>}</p>
    {d.base&&<Diff data={preview(d.base,json(d.snapshot))}/>}</>;}
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
        <fieldset disabled={busy||draft.locked}><label>{t('search')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t('field')}<select value={field} onChange={e=>{setField(e.target.value);setValue(json(fields.find(f=>f.path===e.target.value)?.value));}}><option value="">—</option>{filtered.map(f=><option key={f.path} value={f.path}>{f.path}</option>)}</select></label>
          <label>{t('value')}<textarea rows={3} value={value} onChange={e=>setValue(e.target.value)} spellCheck={false}/></label><button type="button" disabled={!field} onClick={()=>void run(async()=>apply())}>{t('apply')}</button>
          <details><summary>{t('json')}</summary><label>{t('json')}<textarea className="admin-json" rows={12} value={draft.text} onChange={e=>update({text:e.target.value})} spellCheck={false}/></label></details>
          <label>{t('import')}<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>ADMIN_BYTES)throw new AdminError('bodyTooLarge');const text=await f.text();preview(base,text);update({text});});}}/></label>
          <label>{t('reason')}<textarea maxLength={1000} value={draft.reason} onChange={e=>update({reason:e.target.value})} required rows={2}/></label>
          <label>{t('effective')}<select value={draft.effective} onChange={e=>update({effective:e.target.value})}>{['','immediate','next_shift','next_day','next_season'].map(v=><option value={v} key={v}>{t(v||'auto')}</option>)}</select></label>
        </fieldset>
        <div className="admin-toolbar"><button disabled={busy} onClick={()=>download(draft.text,'tbh-config-draft.json')}>{t('export')}</button><button disabled={busy} onClick={()=>void run(async()=>{const result=preview(base,draft.text);if(!stored)persist(draft);setDiff(result);})}>{t('preview')}</button><button disabled={busy||draft.locked} onClick={()=>void run(async()=>{if(window.confirm(t('discardConfirm')))discard();})}>{t('discard')}</button></div>
        {diff&&<><h3>{t('changes')}</h3><Diff data={diff}/></>}
        <button className="primary" disabled={busy||!stored||!draft.reason.trim()||!draft.locked&&!diff?.rows.length} onClick={()=>void run(submit)}>{t('propose')}</button>
      </section>}
      <section className="admin-panel"><h2>{t('proposals')}</h2><ul className="admin-proposals">{index?.proposals.map(p=><li key={p.version}><button disabled={busy} onClick={()=>void run(()=>show(p.version))}><strong>{p.reason}</strong><span className="admin-version">{p.version}</span><span>{p.changed_by} · {t(p.effective)}</span></button></li>)}</ul>{index?.nextCursor&&<button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Index>('/registry?before='+index.nextCursor,undefined,auth.context);setIndex({...next,proposals:[...index.proposals,...next.proposals]});})}>{t('more')}</button>}
        <form className="admin-toolbar" onSubmit={e=>{e.preventDefault();void run(()=>show(version));}}><label>{t('version')}<input value={version} required maxLength={128} onChange={e=>setVersion(e.target.value)}/></label><button disabled={busy}>{t('open')}</button></form></section>
      {details&&<section className="admin-panel" aria-label={t('details')}><h2>{t('details')}</h2><Detail d={details}/><div className="admin-toolbar"><button onClick={()=>download(json(details.snapshot),'tbh-config.json')}>{t('export')}</button>{canWrite&&details.publication&&<button disabled={busy||!!draft?.locked||corrupt||!!draft&&!own} onClick={()=>void run(()=>newDraft(details.snapshot))}>{t('rollback')}</button>}{details.permissions.approve&&<button disabled={busy} onClick={()=>void run(()=>mutate('approve',details))}>{t('approve')}</button>}{details.permissions.publish&&<button className="primary" disabled={busy} onClick={()=>setConfirm(details)}>{t('publish')}</button>}</div></section>}
      <section className="admin-panel"><h2>{t('audit')}</h2><button disabled={busy} onClick={()=>void run(async()=>{const next=await request<Audit>('/audit?after='+(audit?.nextCursor??0),undefined,auth.context);setAudit({...next,events:[...(audit?.events??[]),...next.events]});})}>{t(audit?'more':'auditLoad')}</button>{audit&&<ol className="admin-audit">{audit.events.map(e=><li key={e.seq}><strong>{e.seq} · {e.type}</strong><pre>{json(e.data)}</pre></li>)}</ol>}</section>
    </>}
    <dialog ref={dialog} className="admin-dialog" onCancel={e=>{if(busy)e.preventDefault();else setConfirm(null);}} onClose={()=>setConfirm(null)} aria-labelledby="admin-confirm-title">{confirm&&<><h2 id="admin-confirm-title">{t('publishConfirm')}</h2><Detail d={confirm}/>{error&&<p className="admin-alert" role="alert">{error}</p>}<p>{t('pin')}</p><div className="admin-toolbar"><button data-cancel disabled={busy} onClick={()=>setConfirm(null)}>{t('cancel')}</button><button className="primary" disabled={busy} onClick={()=>void run(()=>mutate('publish',confirm))}>{t('confirm')}</button></div></>}</dialog>
  </main>;
}
