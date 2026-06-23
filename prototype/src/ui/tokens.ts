// Runtime mirror of docs/design-tokens.md v1.0.
// Keep names semantic so Pixi and React read the same visual language.

export const colors = {
  beerAmber: '#eaa31a',
  beerAmberDeep: '#c07a12',
  beerAmberLight: '#ffc24d',
  beerFoam: '#fff3d2',
  stoolRed: '#de4126',
  stoolRedDeep: '#b32f1a',
  inox: '#c4cecb',
  inoxMid: '#97a3a0',
  inoxDark: '#69736f',
  streetBg: '#f1d585',
  streetBgShade: '#e0bd6c',
  panel: '#3a2a1c',
  panelDeep: '#241810',
  panelRaised: '#4c3826',
  panelBorder: '#5d452f',
  ink: '#2a1d12',
  cream: '#fbeedc',
  creamMuted: '#cab39b',
  success: '#3fa564',
  reputation: '#5bbf74',
  coinGold: '#ffd15a',
  warning: '#f4c23f',
  danger: '#d23a2a',
  info: '#3f7fcf',
  glassClean: '#c2e6f1',
  glassBeer: '#eaa31a',
  glassWarn: '#f4c23f',
  glassStale: '#8f8579',
  glassDirty: '#8a6b55',
  glassWashing: '#7ec8e3',
  outline: '#3a2730',
  shadow: '#2a1824',
} as const

export const weatherTint = {
  sunny: { label: 'Nắng', color: '#fff0c2', alpha: 0.1 },
  hot: { label: 'Nóng', color: '#ff8a2c', alpha: 0.22 },
  humid: { label: 'Oi', color: '#a6bda9', alpha: 0.24 },
  rain: { label: 'Mưa', color: '#54678a', alpha: 0.34 },
  cold: { label: 'Lạnh', color: '#bcd2e0', alpha: 0.22 },
  evening: { label: 'Tan tầm', color: '#e6712a', alpha: 0.3 },
} as const

export type WeatherKey = keyof typeof weatherTint

export const type = {
  body: "'Be Vietnam Pro', -apple-system, 'Segoe UI', Roboto, sans-serif",
  hud: "'Chakra Petch', 'Trebuchet MS', sans-serif",
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const radius = { card: 8, sheet: 14 } as const

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16)
}

export const pixiColors = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [key, hexToNumber(value)]),
) as Record<keyof typeof colors, number>
