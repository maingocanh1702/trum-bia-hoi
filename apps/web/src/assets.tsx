import './art.css';
import manifest from '../../../assets/manifest.json';
import type { Customer, Dish } from '../../../packages/engine/src';
const urls = import.meta.glob('../../../assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const menuAsset: Record<Dish, string> = { bia: 'menu-beer', lac: 'menu-peanut', nem: 'menu-nemchua', dau: 'menu-friedbean', topmo: 'menu-crackle', long: 'menu-intestine' };
export function Sprite({ id, className = '' }: { id: string; className?: string }) {
  const asset = manifest.assets.find(a => a.type === 'sprite' && a.id === id);
  const src = asset?.path ? urls[`../../../${asset.path}`] : null;
  return src ? <img src={src} className={`sprite ${asset?.source === 'imagegen_builtin' ? 'illustrated' : ''} ${className}`} alt="" draggable={false} /> : <span aria-hidden="true" className={`sprite placeholder ${className}`}></span>;
}

export const reactions: Record<string, string> = { early: '🤩', earlyNoTip: '🙂', late: '😐', grace: '😥', stale: '😖' };
export function TableSeats({ capacity, customers = [], feedback = [] }: { capacity: number; customers?: Customer[]; feedback?: { customerId: string; kind: string }[] }) {
  return <div className="stools" aria-hidden="true">{Array.from({ length: capacity }, (_, i) => {
    const angle = i * Math.PI * 2 / capacity + Math.PI;
    const customer = customers[i];
    const reaction = feedback.find(s => s.customerId === customer?.id);
    return <span className={`seat ${customer ? 'seat-customer' : 'seat-empty'}`} key={customer?.id ?? i} style={{ left: `${50 + 45 * Math.cos(angle)}%`, top: `${70 + 30 * Math.sin(angle)}%` }}><Sprite id={customer ? `customer-${customer.type.replace('_', '-')}` : 'chair-plastic'} />{reaction && <span className={`customer-reaction reaction-${reaction.kind}`}>{reactions[reaction.kind]}</span>}</span>;
  })}</div>;
}
