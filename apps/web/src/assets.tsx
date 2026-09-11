import './art.css';
import manifest from '../../../assets/manifest.json';
import type { Customer, Dish } from '../../../packages/engine/src';
const urls = import.meta.glob('../../../assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const menuAsset: Record<Dish, string> = { bia: 'menu-beer', lac: 'menu-peanut', nem: 'menu-nemchua', dau: 'menu-friedbean', topmo: 'menu-crackle', long: 'menu-intestine' };
export const hasSpriteArt = (id: string) => manifest.assets.some(a => a.id === id && a.type === 'sprite' && a.status !== 'placeholder' && !!a.path);
export function Sprite({ id, className = '' }: { id: string; className?: string }) {
  let asset = manifest.assets.find(a => a.type === 'sprite' && a.id === id);
  const equipment = /^(keg|washer|cooler)-lv(\d+)$/.exec(id);
  // ponytail: keep equipment recognizable with the nearest finished sprite until its level art arrives.
  if (!asset?.path && equipment) asset = manifest.assets.filter(a => a.path && a.id.startsWith(`${equipment[1]}-lv`) && Number(a.id.split('-lv')[1]) <= Number(equipment[2])).at(-1);
  // Two imagegen attempts returned a baked checkerboard; use a registered table until counter alpha is available.
  if (!asset?.path && /^stall-lv\d+$/.test(id)) asset = manifest.assets.find(a => a.id === 'table-lv1-empty');
  const src = asset?.path ? urls[`../../../${asset.path}`] : null;
  return src ? <img src={src} className={`sprite ${asset?.source === 'imagegen_builtin' ? 'illustrated' : ''} ${className}`} alt="" draggable={false} /> : <span aria-hidden="true" className={`sprite placeholder ${className}`}></span>;
}

export const reactions: Record<string, string> = { early: '🤩', earlyNoTip: '🙂', late: '😐', grace: '😥', stale: '😖' };
export function TableSeats({ capacity, customers = [], feedback = [] }: { capacity: number; customers?: Customer[]; feedback?: { customerId: string; kind: string }[] }) {
  return <div className="stools" aria-hidden="true">{Array.from({ length: capacity }, (_, i) => {
    const angle = i * Math.PI * 2 / capacity + Math.PI;
    const customer = customers[i];
    const reaction = feedback.find(s => s.customerId === customer?.id);
    return <span className={`seat ${customer ? 'seat-customer' : 'seat-empty'}`} key={customer?.id ?? i} data-customer-id={customer?.id} style={{ left: `${50 + 45 * Math.cos(angle)}%`, top: `${70 + 30 * Math.sin(angle)}%` }}><Sprite id={customer ? `customer-${customer.type.replace('_', '-')}` : 'chair-plastic'} />{reaction && <span className={`customer-reaction reaction-${reaction.kind}`}>{reactions[reaction.kind]}</span>}</span>;
  })}</div>;
}
