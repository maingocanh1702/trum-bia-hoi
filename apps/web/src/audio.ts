import manifest from '../../../assets/manifest.json';
import type { Config, DomainEvent } from '../../../packages/engine/src';
const urls = import.meta.glob('../../../assets/audio/**/*.{ogg,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function createSound(config: Config, muted: boolean) {
  const recent = new Map<string, number>();
  const playing = new Map<string, HTMLAudioElement>();
  let quiet = muted;
  const audioAssets = () => manifest.assets.filter(a => a.type === 'audio');
  const play = (event: string, owner = event) => {
    if (quiet || !config.values.audio.enabled) return;
    const now = performance.now();
    if (now - (recent.get(event) ?? -Infinity) < config.values.audio.dedupeWindowMs) return;
    recent.set(event, now);
    const audio = new Audio();
    const format = audio.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
    const entry = audioAssets().find(a => a.usage.includes(event) && a.path?.endsWith(`.${format}`));
    if (!entry || !entry.path) return;
    const group = entry.path.split('/')[2] as keyof typeof config.values.audio.groupsEnabled;
    if (!config.values.audio.groupsEnabled[group]) return;
    audio.src = urls[`../../../${entry.path}`];
    audio.volume = config.values.audio.masterGainDefault;
    playing.get(owner)?.pause(); playing.set(owner, audio);
    audio.onended = () => { if (playing.get(owner) === audio) playing.delete(owner); };
    void audio.play().catch(() => { playing.delete(owner); });
  };
  return {
    play,
    mute(value: boolean) { quiet = value; if (quiet) { playing.forEach(a => a.pause()); playing.clear(); } },
    event(e: DomainEvent) {
      if (e.type === 'beer_poured') { playing.get(String(e.data.itemId))?.pause(); playing.delete(String(e.data.itemId)); }
      play(e.type, String(e.data.itemId ?? e.data.glassId ?? e.type));
      if (e.type === 'order_served') play(`order_served:${e.data.outcome === 'late' || e.data.outcome === 'stale' ? 'early' : e.data.outcome}`);
      if (e.type === 'customer_served' && Number(e.data.tip) > 0) play('serve_tip');
    },
  };
}
