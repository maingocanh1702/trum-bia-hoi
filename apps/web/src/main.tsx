import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { translate } from './i18n';
const Screen = location.pathname.replace(/\/$/, '') === '/admin'
  ? lazy(() => import('./Admin'))
  : lazy(() => import('./App').then(m => ({ default: m.App })));
import './style.css';
import './reference-layout.css';
createRoot(document.getElementById('root')!).render(<Suspense fallback={<p role="status">{translate('vi','admin.loading')}</p>}><Screen /></Suspense>);
