import { attendanceRewardQuote, planDailyQuests, questRewardQuote, zeroLossWindow, type WorldView, type Config, type Command } from '../../../packages/engine/src';
import { Sprite } from './assets';
export function Quests({ world: w, config: c, run, t, num }: { world: WorldView; config: Config; run: (command: Command) => unknown; t: (key: string, params?: Record<string, string | number>) => string; num: (n: number) => string }) {
  const daily = w.daily && w.now < w.daily.expiresAt ? w.daily : planDailyQuests(w, c);
  const attendance = attendanceRewardQuote(w, c, daily.day), track = attendance.track;
  const completed = daily.rows.filter(r => r.progress >= r.target).length, bonus = questRewardQuote(w, c, daily.day, null);
  return <div className="quest-panel">
    <header className="quest-summary"><div><strong>{daily.day}</strong><p>{t('quests.reset')}</p></div><b>{completed} / {daily.rows.length}</b></header>
    <section className="attendance-panel" aria-label={t('attendance.title', { n: c.values.quests.loginTrackRepBase.length })}>
      <h3>{t('attendance.title', { n: c.values.quests.loginTrackRepBase.length })}</h3>
      <ol className="attendance-track">{c.values.quests.loginTrackRepBase.map((reputation, index) => {
        const n = index + 1, state = track.claimedDays.includes(n) ? 'claimed' : n === track.cycleDay ? 'today' : n < track.cycleDay ? 'passed' : 'next';
        return <li key={n} data-state={state} aria-current={n === track.cycleDay ? 'step' : undefined}><span>{t('attendance.day', { n })}</span><b>+{num(reputation)} <span aria-hidden="true">★</span><span className="sr-only">{t('reputation')}</span></b><small>{t(`attendance.${state}`)}</small></li>;
      })}</ol>
      <p>{t('attendance.copy')} {c.values.quests.loginMissResets && t('attendance.reset')}</p>
      <button className="primary full" disabled={!!attendance.reason} onClick={() => run({ type: 'claimAttendance', day: daily.day })}>{attendance.reason === 'attendanceClaimed' ? t('attendance.claimedToday') : t('attendance.claim', { n: num(attendance.reputation) })}</button>
      {attendance.reason === 'rewardOverflow' && <small>{t('error.rewardOverflow')}</small>}
    </section>
    {!w.daily && <p>{t('quests.start')}</p>}
    <ol className="quest-list">{daily.rows.map(row => {
      const q = questRewardQuote(w, c, daily.day, row.id);
      return <li key={row.id} data-quest={row.kind}><div className="quest-heading"><h3>{t(`quests.kind.${row.kind}`, { minutes: zeroLossWindow(c) / 60000 })}</h3><b>{num(row.progress)} / {num(row.target)}</b></div><progress aria-label={t(`quests.kind.${row.kind}`, { minutes: zeroLossWindow(c) / 60000 })} value={row.progress} max={row.target} /><p>{t('quests.reward', { coin: num(row.coin), rep: num(row.reputation) })}</p>{row.kind === 'gift_3' && <small>{t('quests.giftUnavailable')}</small>}<button className={q.reason ? 'secondary' : 'primary'} disabled={!!q.reason} onClick={() => run({ type: 'claimQuest', day: daily.day, questId: row.id })}>{t(row.claimed ? 'quests.claimed' : 'quests.claim')}</button>{q.reason === 'rewardOverflow' && <small>{t('error.rewardOverflow')}</small>}</li>;
    })}</ol>
    <section className="quest-bonus" aria-label={t('quests.bonus')}><Sprite id="flyer-bundle" /><div><h3>{t('quests.bonus')}</h3><p>{t('quests.bonusCopy', { n: c.values.quests.daily.bonusAll5.flyer, shards: c.values.quests.daily.bonusAll5.badgeShard })}</p><button className="primary" disabled={!!bonus.reason} onClick={() => run({ type: 'claimDailyBonus', day: daily.day })}>{t(daily.bonusClaimed ? 'quests.claimed' : 'quests.claimBonus', { n: completed, total: daily.rows.length })}</button>{bonus.reason === 'flyerStockFull' && <small>{t('error.flyerStockFull')}</small>}</div></section>
  </div>;
}
