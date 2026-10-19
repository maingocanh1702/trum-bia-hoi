import type { CSSProperties } from 'react';
import { Icon } from './Icon';

export interface Floater { id: number; kind: 'coin' | 'rep'; x: number; y: number; dx: number; dy: number; delay: number; text: string }

/** F27/P0(b): a changed number travels from where it came from. Decorative: the toast and the wallet carry the accessible text. */
export function FlyingFeedback({ floaters }: { floaters: Floater[] }) {
  return <div className="fly-layer" aria-hidden="true">{floaters.map(f =>
    <span key={f.id} className={`fly fly-${f.kind}`} data-fly={f.kind} style={{ left: f.x, top: f.y, '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, '--delay': `${f.delay}ms` } as CSSProperties}>
      <Icon name={f.kind === 'coin' ? 'coin' : 'star'} />{f.text && <b>{f.text}</b>}
    </span>)}
  </div>;
}
