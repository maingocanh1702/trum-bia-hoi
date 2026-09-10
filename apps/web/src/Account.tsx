import { useEffect, useRef, useState } from 'react';
import { googleScript } from './admin-api';
import { Sprite } from './assets';
import type { Locale } from './i18n';
import type { RemoteGame } from './remote';

export function Account({ remote, locale, t, close }: { remote: RemoteGame | null; locale: Locale; t: (key: string) => string; close: () => void }) {
  const [attempt, setAttempt] = useState(0), [phase, setPhase] = useState('loading'), [error, setError] = useState('');
  const button = useRef<HTMLDivElement>(null), generation = useRef(0), choice = useRef<string | null>(null);
  const provider = remote?.identity.provider ?? 'local';
  const busy = phase === 'linking' || Boolean(remote?.accountBusy);
  const authenticate = async (credential: string, keepAccount: boolean, current: number) => {
    choice.current = null; setPhase('linking'); setError(''); button.current?.replaceChildren();
    try { await remote!.linkGoogle(credential, keepAccount); }
    catch (error) {
      if (generation.current === current) {
        const code = error instanceof Error ? error.message : 'network';
        if (code === 'accountConflict' && !keepAccount) choice.current = credential;
        setError(code);
      }
    } finally { if (generation.current === current) setPhase('finished'); }
  };
  useEffect(() => {
    const current = ++generation.current, live = () => current === generation.current;
    let consumed = false;
    if (!remote || provider === 'google') return;
    setPhase('loading'); setError(''); choice.current = null; button.current?.replaceChildren();
    void (async () => {
      try {
        const challenge = await remote.googleChallenge();
        if (!live()) return;
        const api = await googleScript();
        if (!live() || !button.current) return;
        api.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, auto_select: false, callback: result => {
          if (!live() || !button.current?.isConnected || consumed || remote.identity.provider !== 'guest') return;
          consumed = true; void authenticate(result.credential, false, current);
        } });
        api.renderButton(button.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale, width: Math.min(320, button.current.parentElement!.clientWidth) }); // config-exempt: provider button layout pixels
        setPhase('ready');
      } catch (error) { if (live()) { setError(error instanceof Error ? error.message : 'network'); setPhase('finished'); } }
    })();
    return () => { generation.current++; choice.current = null; button.current?.replaceChildren(); };
  }, [remote, provider, locale, attempt]);
  const problem = error === 'accountConflict' ? 'account.conflict' : error === 'googleUnavailable' ? 'account.unavailable' :
    error === 'googleScript' ? 'account.scriptError' : ['googleVerificationFailed', 'invalidGoogleChallenge'].includes(error) ? 'account.verifyError' :
    error === 'invalidSession' ? 'network.invalidSession' : error === 'conflict' || error === 'storage' ? `network.${error}` : 'account.networkError';
  return <div className="account-panel">
    <div className="account-profile"><Sprite id="owner-idle" /><div><h3>{t(`account.${provider}`)}</h3><p>{t(provider === 'google' ? 'account.linked' : 'account.free')}</p></div></div>
    {provider !== 'google' && <ul className="account-benefits" aria-label={t('account.benefits')}>
      {['save', 'achievements', 'leaderboard'].map(key => <li key={key}>{t(`account.benefit.${key}`)}</li>)}
    </ul>}
    {provider === 'local' ? <p>{t('account.localCopy')}</p> : provider === 'google' ? <p className="account-confirmed" role="status"><span aria-hidden="true">✓ </span>{t('account.success')}</p> : <>
      {(busy || phase === 'loading') && <p role="status">{t(busy ? 'account.confirming' : 'account.loading')}</p>}
      {!busy && error && <p role="alert">{t(problem)}</p>}
      <div className="account-google" ref={button} inert={busy || remote?.state !== 'online'} />
      {!busy && choice.current && <button className="primary full" disabled={remote?.state !== 'online'} onClick={() => { const credential = choice.current; if (credential) void authenticate(credential, true, generation.current); }}>{t('account.useGoogle')}</button>}
      {!busy && phase === 'finished' && !choice.current && <button className="primary full" disabled={remote?.state !== 'online'} onClick={() => setAttempt(n => n + 1)}>{t('account.retry')}</button>}
      {remote?.state !== 'online' && !busy && <p role="status">{t(`network.${remote?.state}`)}</p>}
    </>}
    <button className="secondary full" onClick={close}>{t(provider === 'google' ? 'account.continue' : choice.current ? 'account.keepCurrent' : 'account.later')}</button>
  </div>;
}
