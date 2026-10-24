import { Link } from "@tanstack/react-router";

/** White double-A monogram: two symmetrical, sharp A glyphs sharing a centre spine. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <rect width="48" height="48" rx="11" className="fill-stage" />
      <g fill="#ffffff">
        <path d="M6 39 L16 9 L20 9 L26.5 29 L23.3 29 L18 12.5 L10.4 39 Z" />
        <path d="M42 39 L32 9 L28 9 L21.5 29 L24.7 29 L30 12.5 L37.6 39 Z" />
        <rect x="11.5" y="29.5" width="9" height="2.6" />
        <rect x="27.5" y="29.5" width="9" height="2.6" />
      </g>
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="AT Frame Forge home">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
          AT Frame <span className="text-muted-foreground font-semibold">Forge</span>
        </span>
      )}
    </Link>
  );
}
