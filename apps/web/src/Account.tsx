import { useEffect, useRef, useState } from 'react';
import { googleScript } from './admin-api';
import { Sprite } from './assets';
import type { Locale } from './i18n';
import type { RemoteGame } from './remote';
import type { LoginTouchpoint } from './login-prompt';

function AccountBenefits({ t }: { t: (key: string) => string }) {
  return <ul className="account-benefits" aria-label={t('account.benefits')}>
    {['save', 'achievements', 'leaderboard'].map(key => <li key={key}>{t(`account.benefit.${key}`)}</li>)}
  </ul>;
}
export function LoginInvitation({ reason, t, signIn, later }: { reason: LoginTouchpoint; t: (key: string) => string; signIn: () => void; later: () => void }) {
  return <section className="account-panel login-invitation" aria-label={t('account.invitation')}>
    <h3>{t(`onboarding.login.${reason}`)}</h3><p>{t('account.guestCopy')}</p><AccountBenefits t={t} />
    <button className="primary full" onClick={signIn}>{t('account.signIn')}</button>
    <button className="secondary full" onClick={later}>{t('account.later')}</button>
  </section>;
}

export function Account({ remote, locale, t, close }: { remote: RemoteGame | null; locale: Locale; t: (key: string) => string; close: () => void }) {
  const [attempt, setAttempt] = useState(0), [phase, setPhase] = useState('loading'), [error, setError] = useState('');
  const button = useRef<HTMLDivElement>(null), generation = useRef(0);
  const provider = remote?.identity.provider ?? 'local';
  const busy = phase === 'linking' || Boolean(remote?.accountBusy);
  const authenticate = async (credential: string, current: number) => {
    setPhase('linking'); setError(''); button.current?.replaceChildren();
    try { await remote!.linkGoogle(credential, true); }
    catch (error) {
      if (generation.current === current) {
        const code = error instanceof Error ? error.message : 'network';
        setError(code);
      }
    } finally { if (generation.current === current) setPhase('finished'); }
  };
  useEffect(() => {
    const current = ++generation.current, live = () => current === generation.current;
    let consumed = false;
    if (!remote || provider === 'google' && !remote.reauthenticating || remote.state !== 'online') return;
    setPhase('loading'); setError(''); button.current?.replaceChildren();
    void (async () => {
      try {
        const challenge = await remote.googleChallenge();
        if (!live()) return;
        if (!challenge) { setPhase('finished'); return; }
        const api = await googleScript();
        if (!live() || !button.current) return;
        api.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, auto_select: false, callback: result => {
          if (!live() || !button.current?.isConnected || consumed || remote.identity.provider !== 'guest' && !remote.reauthenticating) return;
          consumed = true; void authenticate(result.credential, current);
        } });
        api.renderButton(button.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale, width: Math.min(320, button.current.parentElement!.clientWidth) }); // config-exempt: provider button layout pixels
        setPhase('ready');
      } catch (error) { if (live()) { setError(error instanceof Error ? error.message : 'network'); setPhase('finished'); } }
    })();
    return () => { generation.current++; button.current?.replaceChildren(); };
  }, [remote, provider, locale, attempt, remote?.state, remote?.reauthenticating]);
  const problem = error === 'googleUnavailable' ? 'account.unavailable' :
    error === 'googleScript' ? 'account.scriptError' : ['googleVerificationFailed', 'invalidGoogleChallenge'].includes(error) ? 'account.verifyError' :
    error === 'accountConflict' ? 'account.wrongAccount' : error === 'invalidSession' ? 'network.invalidSession' : error === 'conflict' || error === 'storage' ? `network.${error}` : 'account.networkError';
  return <div className="account-panel">
    <div className="account-profile"><Sprite id="owner-idle" /><div><h3>{t(remote?.reauthenticating ? 'account.reauthenticate' : `account.${provider}`)}</h3><p>{t(remote?.reauthenticating ? 'account.recoveryCopy' : provider === 'google' ? 'account.linked' : 'account.free')}</p></div></div>
    {provider === 'guest' && !remote?.reauthenticating && <p>{t('account.guestCopy')}</p>}
    {(provider !== 'google' || remote?.reauthenticating) && <AccountBenefits t={t} />}
    {provider === 'local' ? <p>{t('account.localCopy')}</p> : provider === 'google' && !remote?.reauthenticating ? <p className="account-confirmed" role="status"><span aria-hidden="true">✓ </span>{t('account.success')}</p> : <>
      {(busy || phase === 'loading') && <p role="status">{t(busy ? 'account.confirming' : 'account.loading')}</p>}
      {!busy && error && <p role="alert">{t(problem)}</p>}
      <div className="account-google" ref={button} inert={busy || remote?.state !== 'online'} />
      {!busy && phase === 'finished' && <button className="primary full" disabled={remote?.state !== 'online'} onClick={() => setAttempt(n => n + 1)}>{t('account.retry')}</button>}
      {remote?.state !== 'online' && !busy && <p role="status">{t(`network.${remote?.state}`)}</p>}
    </>}
    <button className="secondary full" disabled={busy} onClick={close}>{t(remote?.reauthenticating ? 'save.cancel' : provider === 'google' ? 'account.continue' : 'account.later')}</button>
  </div>;
}
