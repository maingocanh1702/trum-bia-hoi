import manifest from '../../../assets/manifest.json';
import type { Dish } from '../../../packages/engine/src';
const urls = import.meta.glob('../../../assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const menuAsset: Record<Dish, string> = { bia: 'menu-beer', lac: 'menu-peanut', nem: 'menu-nemchua', dau: 'menu-friedbean', topmo: 'menu-crackle', long: 'menu-intestine' };
export function Sprite({ id, className = '' }: { id: string; className?: string }) {
  const asset = manifest.assets.find(a => a.type === 'sprite' && a.id === id);
  const src = asset?.path ? urls[`../../../${asset.path}`] : null;
  return src ? <img src={src} className={`sprite ${className}`} alt="" draggable={false} /> : <span aria-hidden="true" className={`sprite placeholder ${className}`}><span>{id}</span></span>;
}
