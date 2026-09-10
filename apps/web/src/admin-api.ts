import type { ConfigScope } from '../../server/src/registry';
export type { ConfigScope };
import { loadConfig, type Config } from '../../../packages/engine/src';
export type Actor = { subject: string; role: 'super'|'economy'|'game'|'support'|'viewer'; mfa: boolean; issuedAt: number; expiresAt: number };
export type Auth = { enabled: boolean; phase: 'signedOut'|'mfa'|'authenticated'; actor?: Actor; context?: string; expiresAt?: number };
export type Publication = { version: string; effective_at: number; published_at: number };
export type Proposal = { version: string; base_version: string; changed_by: string; keys: string; reason: string; effective: string; created_at: number; cursor: number; scope?:ConfigScope|null };
export type Index = { latest: Publication; activeVersion: string; proposals: Proposal[]; nextCursor: number|null };
export type Details = { scope?:ConfigScope|null; previous?:{scope:ConfigScope;snapshot:Config['raw'];base:Config['raw']}|null; snapshot: Config['raw']; base: Config['raw']|null; draft: Proposal|null;
  policy: {tier: string; effective: string}|null; approval: {approved_by:string; approved_at:number}|null; publication: Publication|null;
  permissions: {propose:boolean; approve:boolean; publish:boolean} };
export type Draft = { owner: string; baseVersion: string; text: string; reason: string; effective: string; key: string; locked: boolean; scope?:ConfigScope };
export const DRAFT_KEY = 'tbh.admin.draft.v1';
// config-exempt: HTTP and local draft limits, independent of gameplay time/tuning.
export const ADMIN_BYTES = 524288, HTTP_MS = 15000;
export class AdminError extends Error { constructor(readonly code: string, readonly status = 0) { super(code); } }
export async function request<T>(path: string, body?: unknown, context?: string, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch('/api/admin'+path, { method: body === undefined ? 'GET':'POST', credentials:'same-origin', cache:'no-store',
      headers: { ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(context ? {'X-TBH-Admin-Context':context}:{}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(HTTP_MS) });
    const data = await response.json();
    if (!response.ok) throw new AdminError(typeof data?.error === 'string' ? data.error : 'serverError', response.status);
    if (!data || typeof data !== 'object') throw new AdminError('serverError'); return data as T;
  } catch (error) { if (error instanceof AdminError) throw error; throw new AdminError('network'); }
}
export function readDraft(): Draft|null {
  const raw = sessionStorage.getItem(DRAFT_KEY); if (!raw) return null;
  const d = JSON.parse(raw);
  if (!d || Object.keys(d).filter(k=>k!=='scope').sort().join(',') !== 'baseVersion,effective,key,locked,owner,reason,text' ||
      ![d.owner,d.baseVersion,d.text,d.reason,d.effective,d.key].every(x => typeof x === 'string') || typeof d.locked !== 'boolean' || !d.owner || !d.key || !d.baseVersion || raw.length > ADMIN_BYTES*2) throw new AdminError('draftCorrupt'); // config-exempt:bounded local recovery input
  if(d.scope!==undefined) {
    const s=d.scope;
    if(!s || Object.keys(s).sort().join(',')!=='expiresAt,id,kind,playerIds,previousVersion,priority,ticketId' || !['segment','campaign','player'].includes(s.kind) ||
      typeof s.id!=='string' || !Array.isArray(s.playerIds) || !s.playerIds.every((id:unknown)=>typeof id==='string') || !Number.isSafeInteger(s.priority) ||
      s.expiresAt!==null&&!Number.isSafeInteger(s.expiresAt) || s.previousVersion!==null&&typeof s.previousVersion!=='string' || s.ticketId!==null&&typeof s.ticketId!=='string')throw new AdminError('draftCorrupt');
  }
  return d;
}
export function configFields(value: unknown, path = ''): {path:string; value:unknown}[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value)
    .filter(([key]) => path || !['_meta','prototypePhase0'].includes(key)).flatMap(([key,v]) => configFields(v, path ? path+'.'+key:key));
  return [{path,value}];
}
export function atPath(value: unknown, path: string): unknown {
  for(const key of path.split('.')) { if(!value || typeof value!=='object' || !Object.hasOwn(value,key))return undefined; value=(value as Record<string,unknown>)[key]; } return value;
}
export function preview(before: Config['raw'], text: string) {
  const a=loadConfig(before), b=loadConfig(JSON.parse(text));
  return {config:b, rows:configFields(b.raw).map(row=>({...row, before:atPath(a.raw,row.path), beforeScaled:atPath(a.values,row.path), scaled:atPath(b.values,row.path)}))
    .filter(r=>JSON.stringify(r.before)!==JSON.stringify(r.value) || JSON.stringify(r.beforeScaled)!==JSON.stringify(r.scaled))};
}
type GoogleApi = { initialize(options: {client_id:string; nonce:string; auto_select:false; callback:(result:{credential:string})=>void}):void;
  renderButton(element:HTMLElement, options:Record<string,unknown>):void; disableAutoSelect():void; cancel():void };
let googleLoad: Promise<GoogleApi>|undefined;
export function googleScript(): Promise<GoogleApi> {
  const existing=()=> (window as unknown as {google?:{accounts?:{id?:GoogleApi}}}).google?.accounts?.id;
  if(existing())return Promise.resolve(existing()!);
  return googleLoad ??= new Promise<GoogleApi>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    const fail=()=>{clearTimeout(timer);script.remove();googleLoad=undefined;reject(new AdminError('googleScript'));};
    const timer=setTimeout(fail,HTTP_MS);
    script.onload=()=>{if(!existing()){fail();return;}clearTimeout(timer);resolve(existing()!);};script.onerror=fail;document.head.append(script);
  });
}

export type DraftSource = {baseVersion:string;base:Config['raw'];snapshot:Config['raw'];scope:ConfigScope|null};
export type Impact = {version:string;token:string;computedAt:number;activatesAt:number;expiresAt:number|null;audiencePlayers:number;changedPlayers:number;pinnedShifts:number;keys:{path:string;players:number}[]};
export type Players = {players:{id:string}[];nextCursor:string|null};
export type Ticket = {id:string;request_key:string;player_id:string;reason:string;used_version:string|null};
export type Tickets = {tickets:Ticket[];nextCursor:number|null};
