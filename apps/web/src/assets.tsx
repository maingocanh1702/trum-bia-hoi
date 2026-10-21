import './art.css';
import { preload } from 'react-dom';
import manifest from '../../../assets/manifest.json';
import type { Customer, Dish } from '../../../packages/engine/src';
const urls = import.meta.glob('../../../assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const menuAsset: Record<Dish, string> = { bia: 'menu-beer', lac: 'menu-peanut', nem: 'menu-nemchua', dau: 'menu-friedbean', topmo: 'menu-crackle', long: 'menu-intestine' };
// Warm the first stock/upgrade visit using the same manifest paths as Sprite.
for (const id of [menuAsset.dau, 'phone', 'sign-wood']) {
  const path = manifest.assets.find(asset => asset.id === id && asset.type === 'sprite')?.path;
  const src = path && urls[`../../../${path}`];
  if (src) preload(src, { as: 'image' });
}
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
/** S6 (D15): the chair art of a chair level — the plastic stool, then "ghế tựa nhựa" (a plastic chair with a backrest), then "ghế gỗ đệm" (a cushioned wooden chair); a level above the art keeps the last sprite. */
const CHAIR_ART = ['chair-plastic', 'chair-backrest', 'chair-cushion'] as const;
export const chairAsset = (chairLevel: number): string => CHAIR_ART[Math.min(CHAIR_ART.length, Math.max(1, chairLevel)) - 1];
/** S6 (D14): the tray drawn on a table, one sprite per dish its level allows (`trayDishes`): the beer, the snack, the second snack of a Lv3+ pair. */
export const trayAsset = ['glass-full', menuAsset.lac, menuAsset.nem] as const;
export function TableSeats({ capacity, chairLevel = 1, customers = [], feedback = [] }: { capacity: number; chairLevel?: number; customers?: Customer[]; feedback?: { customerId: string; kind: string }[] }) {
  return <div className="stools" aria-hidden="true">{Array.from({ length: capacity }, (_, i) => {
    const angle = i * Math.PI * 2 / capacity + Math.PI;
    const customer = customers[i];
    const reaction = feedback.find(s => s.customerId === customer?.id);
    return <span className={`seat ${customer ? 'seat-customer' : 'seat-empty'}`} key={customer?.id ?? i} data-customer-id={customer?.id} style={{ left: `${50 + 45 * Math.cos(angle)}%`, top: `${70 + 30 * Math.sin(angle)}%` }}><Sprite id={customer ? `customer-${customer.type.replace('_', '-')}` : chairAsset(chairLevel)} />{reaction && <span className={`customer-reaction reaction-${reaction.kind}`}>{reactions[reaction.kind]}</span>}</span>;
  })}</div>;
}
