import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { Section } from "./controls";
import { importRemoteImage, readImageFile, type LoadedImage } from "@/lib/image";
import { resolveResult, searchAll, type SearchResult } from "@/lib/metadata";
import { CANVAS_PRESETS, withCanvas } from "@/lib/project";
import { META_FIELDS, META_LABELS, type Project } from "@/lib/types";

type Setter = (fn: (p: Project) => Project, transient?: boolean) => void;

export function Dropzone({ onImage, compact, multiple, onFiles }: { onImage?(img: LoadedImage): void; compact?: boolean; multiple?: boolean; onFiles?(f: File[]): void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    if (onFiles) { onFiles([...files]); return; }
    setBusy(true);
    try { onImage?.(await readImageFile(files[0]!)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div>
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition ${compact ? "p-4" : "p-8"} ${over ? "border-primary bg-accent" : "border-border bg-stage hover:border-primary/60"}`}>
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImagePlus className="h-6 w-6 text-primary" />}
        <span className="text-sm font-semibold">{multiple ? "Drop images or browse" : "Drop artwork or browse"}</span>
        <span className="text-xs text-muted-foreground">JPG, PNG, WEBP · up to 30 MB</span>
      </button>
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple={multiple}
        onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      {err && <p className="mt-2 text-xs text-destructive" role="alert">{err}</p>}
    </div>
  );
}

export function ArtworkSection({ project, set, onPalette }: { project: Project; set: Setter; onPalette(): void }) {
  const apply = (img: LoadedImage) => { set((p) => ({ ...p, image: img.dataUrl, imageW: img.w, imageH: img.h })); onPalette(); };
  return (
    <Section title="Artwork" right={project.image ? <button className="btn btn-ghost btn-icon btn-danger" aria-label="Remove artwork" onClick={() => set((p) => ({ ...p, image: null, imageW: 0, imageH: 0 }))}><Trash2 className="h-4 w-4" /></button> : null}>
      {project.image && (
        <div className="flex items-center gap-3">
          <img src={project.image} alt="Uploaded artwork" className="h-20 w-auto max-w-24 rounded-md object-contain bg-stage" />
          <div className="text-xs text-muted-foreground">{project.imageW} × {project.imageH}px<br />{project.imageH > project.imageW ? "Portrait" : "Landscape"} artwork</div>
        </div>
      )}
      <Dropzone compact={!!project.image} onImage={apply} />
      <div>
        <span className="label-sm">Canvas shape</span>
        <select className="field" value={`${project.canvas.w}x${project.canvas.h}`}
          onChange={(e) => {
            const pr = CANVAS_PRESETS.find((c) => `${c.w}x${c.h}` === e.target.value)!;
            if (confirm("Changing the canvas shape resets layer positions to the template defaults. Continue?")) set((p) => withCanvas(p, pr.w, pr.h));
          }}>
          {CANVAS_PRESETS.map((c) => <option key={c.id} value={`${c.w}x${c.h}`}>{c.label}</option>)}
        </select>
      </div>
    </Section>
  );
}

export function MetadataSection({ project, set }: { project: Project; set: Setter }) {
  const [q, setQ] = useState(project.meta.title);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [posterErr, setPosterErr] = useState<string | null>(null);

  const search = async () => {
    setBusy(true); setErrors([]); setNote(null);
    const out = await searchAll(q);
    setResults(out.results); setErrors(out.errors);
    if (!out.tmdbConfigured) setNote("Movies & TV search needs a TMDB key (see README). Anime search works without one.");
    if (!out.results.length && !out.errors.length) setNote("No matches found. Try another spelling or enter details manually.");
    setBusy(false);
  };
  const pick = async (r: SearchResult) => {
    setBusy(true);
    try {
      const meta = await resolveResult(r);
      set((p) => ({ ...p, meta, name: p.name === "Untitled poster" ? meta.title || p.name : p.name }));
      setResults([]);
    } catch (e) { setErrors([(e as Error).message]); } finally { setBusy(false); }
  };
  const usePoster = async () => {
    setPosterErr(null);
    try { const img = await importRemoteImage(project.meta.imageUrl); set((p) => ({ ...p, image: img.dataUrl, imageW: img.w, imageH: img.h })); }
    catch { setPosterErr("The source blocked downloading this poster. Upload your own artwork instead."); }
  };

  return (
    <>
      <Section title="Title search">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Anime, movie or series title" aria-label="Title" />
          <button className="btn btn-primary" disabled={busy || !q.trim()} aria-label="Search">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
        </form>
        {errors.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {results.length > 0 && (
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {results.map((r) => (
              <li key={r.key}>
                <button type="button" onClick={() => pick(r)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-accent">
                  {r.thumb ? <img src={r.thumb} alt="" className="h-12 w-8 rounded object-cover" loading="lazy" /> : <div className="h-12 w-8 rounded bg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{r.meta.source.split(" ")[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Metadata" right={<span className="text-[10px] text-muted-foreground">{project.meta.source ? `Source: ${project.meta.source}` : "Manual"}</span>}>
        {project.meta.imageUrl && !project.image && (
          <div>
            <button className="btn w-full" onClick={usePoster}><RefreshCw className="h-3.5 w-3.5" />Use source poster as artwork</button>
            {posterErr && <p className="mt-1 text-xs text-destructive">{posterErr}</p>}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">Empty fields are hidden on the poster. Edit anything that is wrong.</p>
        {META_FIELDS.map((f) => (
          <label key={f} className="block">
            <span className="label-sm">{META_LABELS[f]}</span>
            {f === "synopsis" ? (
              <textarea className="field min-h-24" value={project.meta[f]} onChange={(e) => set((p) => ({ ...p, meta: { ...p.meta, [f]: e.target.value } }))} />
            ) : (
              <input className="field" value={project.meta[f]} onChange={(e) => set((p) => ({ ...p, meta: { ...p.meta, [f]: e.target.value } }))} />
            )}
          </label>
        ))}
      </Section>
    </>
  );
}
