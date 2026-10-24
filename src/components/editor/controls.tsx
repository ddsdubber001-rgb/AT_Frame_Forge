import type { ReactNode } from "react";
import { resolveColor } from "@/lib/renderer";
import type { Palette } from "@/lib/types";

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-foreground">{title}</h3>
        {right}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Slider({ label, value, min, max, step = 0.01, onChange, onCommit, fmt }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange(v: number): void; onCommit?(): void; fmt?(v: number): string;
}) {
  return (
    <label className="block">
      <span className="label-sm flex justify-between"><span>{label}</span><span className="normal-case tracking-normal">{fmt ? fmt(value) : value}</span></span>
      <input type="range" className="w-full accent-primary" min={min} max={max} step={step} value={value}
        onPointerDown={onCommit} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

const ROLES: (keyof Palette)[] = ["bg", "surface", "accent", "text", "muted"];

export function ColorField({ label, value, palette, onChange, allowNone }: {
  label: string; value: string | null | undefined; palette: Palette; onChange(v: string | null): void; allowNone?: boolean;
}) {
  const resolved = value ? resolveColor(value.split("/")[0], palette) : "#000000";
  return (
    <div>
      <span className="label-sm">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <input type="color" aria-label={`${label} custom colour`} value={/^#[0-9a-f]{6}$/i.test(resolved) ? resolved : "#000000"}
          onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent" />
        {ROLES.map((r) => (
          <button key={r} type="button" title={`Palette: ${r}`} onClick={() => onChange(`@${r}`)}
            className={`h-6 w-6 rounded-full border-2 ${value?.split("/")[0] === `@${r}` ? "border-primary" : "border-border"}`}
            style={{ background: palette[r] }} aria-label={`Use palette ${r}`} />
        ))}
        {allowNone && <button type="button" className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => onChange(null)}>None</button>}
      </div>
    </div>
  );
}
