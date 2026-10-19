const icons: Record<string, string> = {
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',
  bolt: 'M13 2 5 13h6l-1 9 9-13h-6l1-7Z',
  stock: 'M3 8h18v13H3V8Zm-1 0 3-5h14l3 5M9 12h6',
  upgrade: 'm12 3 8 8h-5v10H9V11H4l8-8Z',
  book: 'M4 3h13a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Zm0 14h15M8 7h7M8 11h5',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  close: 'm6 6 12 12M6 18 18 6',
  sound: 'M4 9h4l5-5v16l-5-5H4V9Zm12-2a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16',
  check: 'm5 12 4 4L19 6',
  glass: 'M6 3h12l-1 18H7L6 3Zm1 5h10M10 11v6m4-6v6',
};
export function Icon({ name }: { name: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name] ?? icons.star} /></svg>; }
