import { createRoot } from 'react-dom/client';
import { translate } from './i18n';
import './style.css';
import './reference-layout.css';
const root = createRoot(document.getElementById('root')!);
const t = (key: string) => translate(navigator.language.toLowerCase().split('-')[0] === 'en' ? 'en' : 'vi', key);
root.render(<p role="status">{t('save.loading')}</p>);
// One page per load: native imports retain code splitting without a Suspense reveal timer.
const screen = import.meta.env.VITE_TBH_GUEST_ONLY !== '1' && location.pathname.replace(/\/$/, '') === '/admin'
  ? import('./Admin').then(m => m.default)
  : import('./App').then(m => m.App);
void screen.then(Screen => root.render(<Screen />), () => root.render(<main className="recovery"><p role="alert">{t('entry.loadError')}</p><button onClick={() => location.reload()}>{t('save.retry')}</button></main>));
