import type { Config, WorldView } from '../../../packages/engine/src';
import { Sprite } from './assets';
import { queuePatience } from './spotlight';

export interface TurnedAway { id: string; size: number }

const sprite = (type: string) => `customer-${type.replace('_', '-')}`;

/**
 * F27/P0(c): the door. Waiting groups carry a patience ring; a refused group shows what it lacked, then walks off.
 * S6 review round 2: only the NEWEST refused group is drawn. The door is a row and a bubble hangs to the right of its guest, so two refusals inside one
 * bubble lifetime (a heavy rush with a full queue, a flyer in a light rush, a batch of remote events) would stack the first bubble under the second guest:
 * the door says one reason at a time, like the loss toast (batch-toast.ts), and the newest refusal replaces the one before it.
 */
export function DoorQueue({ world: w, config: c, turnedAway, t }: { world: WorldView; config: Config; turnedAway: TurnedAway[]; t: (key: string, params?: Record<string, string | number>) => string }) {
  if (!w.queue.length && !turnedAway.length) return null;
  return <div className="door" role="group" aria-label={t('queue', { n: w.queue.length })}>
    {w.queue.map(group => {
      const left = queuePatience(group, w.now);
      return <span key={group.id} className={`door-guest ${left < c.values.tip.patienceThreshold ? 'is-low' : ''}`} data-patience={left.toFixed(3)}>
        <svg className="door-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" pathLength="100" strokeDasharray={`${left * 100} 100`} /></svg>
        <Sprite id={sprite(group.customers[0].type)} />
        {group.customers.length > 1 && <b aria-hidden="true">×{group.customers.length}</b>}
      </span>;
    })}
    {turnedAway.slice(-1).map(row => <span key={row.id} className="door-guest is-leaving" data-turned-away={row.size} data-refusal={row.id}>
      <Sprite id="customer-thuong" />
      <span className="door-bubble"><Sprite id="chair-plastic" />{t(row.size > 1 ? 'door.seats' : 'door.full', { n: row.size })}</span>
    </span>)}
  </div>;
}
