import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, ExternalLink, Loader2, Package, Play, Trash2 } from "lucide-react";
import { Brand } from "@/components/Logo";
import { Dropzone } from "@/components/editor/LeftPanels";
import { downloadBlob, exportPoster, fileName, loadImage, renderThumbnail } from "@/lib/exporter";
import { readImageFile } from "@/lib/image";
import { resolveResult, searchAll, type SearchResult } from "@/lib/metadata";
import { buildPalettes, extractColors } from "@/lib/palette";
import { newProject, withCanvas, withTemplate } from "@/lib/project";
import { saveProject } from "@/lib/storage";
import { TEMPLATES } from "@/lib/templates";
import type { ExportFormat, Project } from "@/lib/types";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Poster Creation — AT Frame Forge" },
      { name: "description", content: "Create many anime and movie posters at once with automatic metadata and ZIP export." },
      { property: "og:title", content: "Batch Poster Creation — AT Frame Forge" },
      { property: "og:description", content: "Batch-create posters with metadata lookup and ZIP download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Batch,
});

type Status = "pending" | "searching" | "ready" | "failed";
interface Item { id: string; project: Project; title: string; status: Status; error?: string; results: SearchResult[]; thumb?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Batch() {
  const nav = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [templateId, setTemplateId] = useState("classic");
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const [autoPalette, setAutoPalette] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [busy, setBusy] = useState<string | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const stop = useRef(false);

  const upd = (id: string, fn: (i: Item) => Item) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));
  const configured = (p: Project) => {
    const [w, h] = shape === "portrait" ? [1080, 1920] : [1920, 1080];
    let q = p.canvas.w === w && p.canvas.h === h ? p : withCanvas(p, w, h);
    q = withTemplate(q, templateId);
    q.exportPrefs = { ...q.exportPrefs, format };
    return q;
  };
  const thumb = async (p: Project) => renderThumbnail(p, 220).catch(() => undefined);

  const addFiles = async (files: File[]) => {
    const e: string[] = [];
    for (const f of files) {
      try {
        const img = await readImageFile(f);
        let p = newProject(f.name.replace(/\.[^.]+$/, ""));
        p = { ...p, image: img.dataUrl, imageW: img.w, imageH: img.h };
        if (autoPalette) {
          const el = await loadImage(img.dataUrl);
          const pal = buildPalettes(extractColors(el))[0]!;
          p = { ...p, palette: pal.palette, paletteName: pal.name };
        }
        p = configured(p);
        const title = p.name.replace(/[_\-.]+/g, " ").trim();
        const item: Item = { id: p.id, project: p, title, status: "pending", results: [], thumb: await thumb(p) };
        setItems((xs) => [...xs, item]);
      } catch (err) { e.push((err as Error).message); }
    }
    setErrs(e);
  };

  const applyResult = async (it: Item, r: SearchResult) => {
    const meta = await resolveResult(r);
    const project = { ...it.project, meta, name: meta.title || it.project.name };
    return { ...it, project, status: "ready" as Status, error: undefined, thumb: await thumb(project) };
  };

  const fetchOne = async (it: Item) => {
    upd(it.id, (x) => ({ ...x, status: "searching", error: undefined }));
    const out = await searchAll(it.title);
    if (!out.results.length) {
      upd(it.id, (x) => ({ ...x, status: "failed", results: [], error: out.errors.join("; ") || "No match found" }));
      return;
    }
    try {
      const next = await applyResult({ ...it, results: out.results }, out.results[0]!);
      upd(it.id, () => next);
    } catch (e) { upd(it.id, (x) => ({ ...x, status: "failed", error: (e as Error).message })); }
  };

  const fetchAll = async () => {
    stop.current = false; setBusy("fetch");
    for (const it of items) {
      if (stop.current) break;
      if (it.status === "ready") continue;
      await fetchOne(it);
      await sleep(900); // gentle on public API rate limits
    }
    setBusy(null);
  };

  const reapply = () => setItems((xs) => xs.map((x) => ({ ...x, project: configured(x.project) })));

  const exportOne = async (it: Item) => {
    const p = configured(it.project);
    const { w, h } = p.exportPrefs;
    const blob = await exportPoster(p, w, h, format, 0.92);
    return { blob, name: fileName(p, format, w, h) };
  };

  const exportAll = async () => {
    setBusy("zip"); setErrs([]);
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const e: string[] = [];
    const used = new Set<string>();
    for (const it of items.filter((x) => x.status === "ready")) {
      try {
        let { blob, name } = await exportOne(it);
        let n = 2; const base = name;
        while (used.has(name)) name = base.replace(/(\.\w+)$/, `-${n++}$1`);
        used.add(name);
        zip.file(name, blob);
      } catch (err) { e.push(`${it.title}: ${(err as Error).message}`); }
    }
    if (Object.keys(zip.files).length) downloadBlob(await zip.generateAsync({ type: "blob" }), "at-frame-forge-posters.zip");
    else e.push("Nothing to export — fetch metadata first.");
    setErrs(e); setBusy(null);
  };

  const openInEditor = async (it: Item) => {
    try { await saveProject(configured(it.project)); nav({ to: "/editor/$id", params: { id: it.id } }); }
    catch (e) { setErrs([(e as Error).message]); }
  };

  const ready = items.filter((x) => x.status === "ready").length;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Brand /></header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Batch creation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add images, check each title, fetch details, then download all posters as a ZIP.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Dropzone multiple onFiles={addFiles} />
          <div className="panel space-y-3 p-4">
            <label className="block"><span className="label-sm">Template for all</span>
              <select className="field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="block"><span className="label-sm">Canvas</span>
              <select className="field" value={shape} onChange={(e) => setShape(e.target.value as "portrait" | "landscape")}><option value="portrait">Portrait — exports 2160×3840</option><option value="landscape">Landscape — exports 3840×2160</option></select></label>
            <label className="block"><span className="label-sm">Format</span>
              <select className="field" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WEBP</option></select></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-primary" checked={autoPalette} onChange={(e) => setAutoPalette(e.target.checked)} />Smart palette from each new image</label>
            <button className="btn w-full" onClick={reapply} disabled={!items.length}>Apply settings to all</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {busy === "fetch" ? <button className="btn" onClick={() => (stop.current = true)}><Loader2 className="h-4 w-4 animate-spin" />Stop</button>
            : <button className="btn btn-primary" onClick={fetchAll} disabled={!items.length || !!busy}><Play className="h-4 w-4" />Fetch all metadata</button>}
          <button className="btn" onClick={exportAll} disabled={!ready || !!busy}>{busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}Download all ({ready}) as ZIP</button>
        </div>
        {errs.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}

        {items.length === 0 ? <div className="panel p-10 text-center text-sm text-muted-foreground">No images yet.</div> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <li key={it.id} className="panel flex gap-3 p-3">
                <div className="flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-stage">
                  {it.thumb ? <img src={it.thumb} alt={it.title} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input className="field" value={it.title} onChange={(e) => upd(it.id, (x) => ({ ...x, title: e.target.value, status: x.status === "ready" ? "ready" : "pending" }))} aria-label="Title" />
                  <p className={`text-xs ${it.status === "failed" ? "text-destructive" : it.status === "ready" ? "text-success" : "text-muted-foreground"}`}>
                    {it.status === "searching" ? "Searching…" : it.status === "ready" ? `✓ ${it.project.meta.source}` : it.status === "failed" ? it.error : "Waiting"}
                  </p>
                  {it.results.length > 1 && (
                    <select className="field text-xs" value={it.results.find((r) => r.meta.sourceId === it.project.meta.sourceId)?.key ?? ""}
                      onChange={async (e) => { const r = it.results.find((x) => x.key === e.target.value); if (r) { try { const n = await applyResult(it, r); upd(it.id, () => n); } catch (er) { setErrs([(er as Error).message]); } } }}>
                      {it.results.map((r) => <option key={r.key} value={r.key}>{r.label} ({r.sub}, {r.meta.source.split(" ")[0]})</option>)}
                    </select>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <button className="btn px-2 py-1 text-[11px]" disabled={!!busy || it.status === "searching"} onClick={() => fetchOne(it)}>Fetch</button>
                    <button className="btn px-2 py-1 text-[11px]" onClick={() => openInEditor(it)}><ExternalLink className="h-3 w-3" />Edit</button>
                    <button className="btn px-2 py-1 text-[11px]" disabled={it.status !== "ready"} onClick={async () => { try { const { blob, name } = await exportOne(it); downloadBlob(blob, name); } catch (e) { setErrs([(e as Error).message]); } }}><Download className="h-3 w-3" /></button>
                    <button className="btn btn-danger btn-icon ml-auto" aria-label="Remove" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
