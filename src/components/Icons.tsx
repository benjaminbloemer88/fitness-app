/** Kleine Inline-Icons (SVG), damit wir keine Icon-Bibliothek brauchen. */
import type { SVGProps } from 'react';

const basis = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const IconHeute = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />
  </svg>
);
export const IconWoche = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
  </svg>
);
export const IconVerlauf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M3 20h18M5 16l4-5 4 3 6-8" />
  </svg>
);
export const IconEinstellungen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const IconZurueck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconWeiter = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const IconHaken = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconMehr = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" />
  </svg>
);
export const IconSync = (p: SVGProps<SVGSVGElement>) => (
  <svg {...basis(p)}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16M4 4v4h4M20 20v-4h-4" />
  </svg>
);
