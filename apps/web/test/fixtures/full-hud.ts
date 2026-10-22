/**
 * Fixtures that are not about onboarding keep the whole HUD from the first shift (the reveal thresholds are Tier C config),
 * so their specs keep driving the nav, stock strip and equipment they were written for. Onboarding's own reveal is proven in
 * first-shift-visual.spec.ts.
 */
export function fullHud<T extends { onboarding: { featureReveal: object } }>(raw: T): T {
  const reveal = raw.onboarding.featureReveal as Record<string, number>;
  Object.assign(reveal, { upgradeAfterShifts: 0, hudAfterShifts: 0, upgradeAllAfterShifts: 0, journeyAfterShifts: 0 });
  if ('kickAfterShifts' in reveal) reveal.kickAfterShifts = 0; // JSON 2.1.3 ("Mời về", "Mời tất cả về"): only contents from that label carry it, a capacity snapshot refuses the key
  return raw;
}
