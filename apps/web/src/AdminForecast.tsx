import {useEffect,useRef,useState} from 'react';
import {request} from './admin-api';
import type {EconomicForecast} from '../../server/src/forecast';
export function AdminForecast({version,context,t,locale,fail}:{version:string;context:string;t:(key:string)=>string;locale:string;fail:(error:unknown)=>void}) {
  const [report,setReport]=useState<EconomicForecast|null>(null),[busy,setBusy]=useState(false),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const number=(n:number)=>new Intl.NumberFormat(locale).format(n), date=(at:number)=>new Date(at).toLocaleString(locale,{timeZone:'Asia/Ho_Chi_Minh'});
  async function generate() {
    if(controller.current)return;
    const job=new AbortController();controller.current=job;setBusy(true);setReport(null);
    const timer=setTimeout(()=>job.abort(),660000); // config-exempt: UI transport deadline exceeds the ten-minute worker bound
    try {const result=await request<EconomicForecast>('/forecast',{version},context,job.signal);if(!job.signal.aborted)setReport(result);}
    catch(error){if(!job.signal.aborted)fail(error);}
    finally {clearTimeout(timer);if(controller.current===job){controller.current=null;setBusy(false);}}
  }
  const metrics=['openingCoins','faucet','sink','penalties','depositRefunds','closingCoins'] as const;
  return <section className="admin-panel" aria-label={t('forecast.title')} aria-busy={busy}>
    <h2>{t('forecast.title')}</h2><p>{t('forecast.assumptions')}</p>
    <div className="admin-toolbar"><button disabled={busy} onClick={()=>void generate()}>{t('forecast.run')}</button>{busy&&<button onClick={()=>controller.current?.abort()}>{t('cancel')}</button>}</div>
    {busy&&<p role="status">{t('forecast.running')}</p>}
    {report&&<><p role="status">{t(report.status==='empty'?'forecast.empty':'forecast.complete')}</p>
      <dl><dt>{t('forecast.period')}</dt><dd>{date(report.computedAt)} → {date(report.through)}</dd><dt>{t('impact.changed')}</dt><dd>{number(report.changedPlayers)} / {number(report.audiencePlayers)}</dd><dt>{t('forecast.revision')}</dt><dd>{report.registryRevision}</dd></dl>
      <p>{t('forecast.vnd')}</p>
      {report.totals&&<div className="admin-table"><table><caption>{t('forecast.totals')}</caption><thead><tr><th>{t('forecast.metric')}</th>{['baseline','candidate','delta'].map(k=><th key={k}>{t('forecast.'+k)}</th>)}</tr></thead><tbody>{metrics.map(k=><tr key={k}><th>{t('forecast.'+k)}</th><td>{number(report.totals!.baseline[k])}</td><td>{number(report.totals!.candidate[k])}</td><td>{number(report.totals!.delta[k])}</td></tr>)}</tbody></table></div>}
      <details><summary>{t('forecast.daily')}</summary><div className="admin-table"><table><thead><tr><th>{t('forecast.day')}</th>{['baseline','candidate'].map(k=><th key={k}>{t('forecast.'+k)} · {t('forecast.faucet')} / {t('forecast.sink')}</th>)}</tr></thead><tbody>{report.daily.map(row=><tr key={row.date}><th>{row.date}</th><td>{number(row.baseline.faucet)} / {number(row.baseline.sink)}</td><td>{number(row.candidate.faucet)} / {number(row.candidate.sink)}</td></tr>)}</tbody></table></div></details>
      <details><summary>{t('forecast.keys')}</summary><ul>{report.keys.map(k=><li key={k.path}><code>{k.path}</code> · {k.players}</li>)}</ul></details>
    </>}
  </section>;
}
