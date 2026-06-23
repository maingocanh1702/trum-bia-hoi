import type { SVGProps } from 'react'

export type IconName =
  | 'ai'
  | 'bell'
  | 'beer'
  | 'close'
  | 'coin'
  | 'copy'
  | 'cup'
  | 'glass'
  | 'location'
  | 'pause'
  | 'play'
  | 'quest'
  | 'rush'
  | 'shop'
  | 'stats'
  | 'table'
  | 'tap'
  | 'ticket'
  | 'trophy'
  | 'upgrade'
  | 'washer'
  | 'weather'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  title?: string
}

export function Icon({ name, title, ...props }: IconProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  )
}

const paths: Record<IconName, JSX.Element> = {
  ai: (
    <>
      <path d="M6 13.5h12" />
      <path d="M8 17h8" />
      <path d="M7 8.5c0-2.2 2-4 5-4s5 1.8 5 4v9.2c0 .7-.6 1.3-1.3 1.3H8.3c-.7 0-1.3-.6-1.3-1.3Z" />
      <path d="M9.2 8.9h.1M14.7 8.9h.1" />
      <path d="M4 11.5H2.5M21.5 11.5H20" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 5.7 2 7H4c0-1.3 2-2 2-7Z" />
      <path d="M10 19a2.4 2.4 0 0 0 4 0" />
    </>
  ),
  beer: (
    <>
      <path d="M7 7h9v10.5A2.5 2.5 0 0 1 13.5 20h-4A2.5 2.5 0 0 1 7 17.5Z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 10.5h9" />
      <path d="M9.5 7V4.5M12 7V4M14.5 7V4.5" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  coin: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="3" />
      <path d="M5.5 6.5v6.8c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V6.5" />
      <path d="M5.5 10c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="10" height="12" rx="2" />
      <path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
    </>
  ),
  cup: (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0Z" />
      <path d="M16 6h2a2 2 0 0 1 0 4h-2" />
      <path d="M8 6H6a2 2 0 0 0 0 4h2" />
      <path d="M12 12v5" />
      <path d="M8 20h8" />
      <path d="M9.5 17h5" />
    </>
  ),
  glass: (
    <>
      <path d="M8 4h8l-1 16H9Z" />
      <path d="M8.5 8h7" />
      <path d="M9.2 13h5.6" />
      <path d="M11 5.5v12M13 5.5v12" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </>
  ),
  play: <path d="M8 5v14l11-7Z" />,
  quest: (
    <>
      <path d="M7 5h10v14H7Z" />
      <path d="M10 9h4" />
      <path d="M10 13h4" />
      <path d="M10 17h2" />
    </>
  ),
  rush: (
    <>
      <path d="M13 2 5 13h6l-1 9 8-12h-6Z" />
    </>
  ),
  shop: (
    <>
      <path d="M4 10h16l-1.2-5H5.2Z" />
      <path d="M6 10v9h12v-9" />
      <path d="M9 19v-5h6v5" />
    </>
  ),
  stats: (
    <>
      <path d="M5 20V9" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  table: (
    <>
      <ellipse cx="12" cy="9" rx="7" ry="3.5" />
      <path d="M7 11.2v5.5M17 11.2v5.5" />
      <path d="M9 17h6" />
    </>
  ),
  tap: (
    <>
      <path d="M7 5h8a3 3 0 0 1 3 3v2" />
      <path d="M10 5V3" />
      <path d="M6 10h9" />
      <path d="M15 10v4" />
      <path d="M13 18c0-1.2 2-3.5 2-3.5s2 2.3 2 3.5a2 2 0 0 1-4 0Z" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4Z" />
      <path d="M9 5v14" />
      <path d="M13 8h3" />
      <path d="M13 12h3" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0Z" />
      <path d="M8 6H5a2 2 0 0 0 2 3h1" />
      <path d="M16 6h3a2 2 0 0 1-2 3h-1" />
      <path d="M12 12v4" />
      <path d="M8.5 20h7" />
      <path d="M10 16h4" />
    </>
  ),
  upgrade: (
    <>
      <path d="M12 20V5" />
      <path d="m6 11 6-6 6 6" />
      <path d="M5 20h14" />
    </>
  ),
  washer: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <circle cx="12" cy="13" r="4" />
      <path d="M9 13c1.5 1 3.5-1 6 0" />
      <path d="M8 7h2" />
      <path d="M14 7h2" />
    </>
  ),
  weather: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M9 1.8v2M9 14v2M1.8 9h2M14.2 9h2M4 4l1.4 1.4M12.6 12.6 14 14M14 4l-1.4 1.4M4 14l1.4-1.4" />
      <path d="M14 18h4a3 3 0 0 0 .4-6 4 4 0 0 0-7.3 2" />
    </>
  ),
}
