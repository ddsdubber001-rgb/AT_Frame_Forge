import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, Library, Loader2, Redo2, Undo2 } from "lucide-react";
import { Brand } from "@/components/Logo";
import { PosterCanvas } from "@/components/editor/PosterCanvas";
import { ArtworkSection, MetadataSection } from "@/components/editor/LeftPanels";
import { ExportSection, InspectorSection, LayersSection, PaletteSection, TemplateSection } from "@/components/editor/RightPanels";
import { loadImage, renderThumbnail } from "@/lib/exporter";
import { buildPalettes, extractColors, type NamedPalette } from "@/lib/palette";
import { getLayers } from "@/lib/project";
import { getProject, saveProject } from "@/lib/storage";
import type { Layer, Project } from "@/lib/types";
import { useHistory } from "@/lib/useHistory";

export const Route = createFileRoute("/editor/$id")({
  head: () => ({
    meta: [
      { title: "Poster Editor — AT Frame Forge" },
      { name: "description", content: "Edit layers, typography, colours and export high-resolution anime and movie posters." },
      { property: "og:title", content: "Poster Editor — AT Frame Forge" },
      { property: "og:description", content: "Edit and export cinematic anime and movie posters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Editor,
});

type Tab = "setup" | "canvas" | "design";

function Editor() {
  const { id } = Route.useParams();
  const h = useHistory<Project>();
  const project = h.state;
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const [saveErr, setSaveErr] = useState("");
  const [palettes, setPalettes] = useState<NamedPalette[]>([]);
  const [tab, setTab] = useState<Tab>("canvas");
  const loaded = useRef(false);

  useEffect(() => {
    getProject(id).then((p) => { if (p) { h.reset(p); loaded.current = true; } else setLoadErr("Project not found. It may have been deleted."); })
      .catch((e: Error) => setLoadErr(e.message));
  }, [id, h.reset]);

  useEffect(() => {
    if (!project?.image) { setArt(null); setPalettes(buildPalettes([])); return; }
    let alive = true;
    loadImage(project.image).then((i) => { if (alive) { setArt(i); setPalettes(buildPalettes(extractColors(i))); } }).catch(() => alive && setArt(null));
    return () => { alive = false; };
  }, [project?.image]);

  // Auto-save (debounced) with thumbnail
  useEffect(() => {
    if (!project || !loaded.current) return;
    setSave("saving");
    const t = setTimeout(async () => {
      try {
        const thumbnail = await renderThumbnail(project, 320).catch(() => project.thumbnail);
        await saveProject({ ...project, thumbnail, updatedAt: Date.now() });
        setSave("saved");
      } catch (e) { setSave("error"); setSaveErr((e as Error).message); }
    }, 900);
    return () => clearTimeout(t);
  }, [project]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? h.redo() : h.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); h.redo(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [h.undo, h.redo]);

  const onLayerChange = useCallback((lid: string, pt: Partial<Layer>, transient: boolean) => {
    h.set((p) => ({ ...p, layersByTemplate: { ...p.layersByTemplate, [p.templateId]: getLayers(p).map((l) => (l.id === lid ? { ...l, ...pt } : l)) } }), transient);
  }, [h.set]);

  const applyAutoPalette = useCallback(() => {
    // after a new upload, switch to artwork palette once colours are extracted
    setTimeout(() => h.state && null, 0);
  }, [h.state]);

  if (loadErr) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><p className="text-destructive">{loadErr}</p><Link to="/" className="btn btn-primary">Back to library</Link></div>;
  if (!project) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const layers = getLayers(project);
  const show = (t: Tab) => (tab === t ? "flex" : "hidden lg:flex");

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-4">
        <Brand compact />
        <input className="field max-w-56 border-transparent bg-transparent font-display font-semibold" value={project.name}
          onChange={(e) => h.set((p) => ({ ...p, name: e.target.value }))} aria-label="Project name" />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex" role="status" title={saveErr}>
          {save === "saving" ? <><Loader2 className="h-3 w-3 animate-spin" />Saving</> : save === "saved" ? <><Check className="h-3 w-3 text-success" />Saved</> : <><CloudOff className="h-3 w-3 text-destructive" /><span className="text-destructive">Save failed: {saveErr}</span></>}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn btn-ghost btn-icon" onClick={h.undo} disabled={!h.canUndo} aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
          <button className="btn btn-ghost btn-icon" onClick={h.redo} disabled={!h.canRedo} aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
          <Link to="/" className="btn"><Library className="h-4 w-4" /><span className="hidden sm:inline">Library</span></Link>
        </div>
      </header>
      {save === "error" && <p className="bg-destructive/15 px-4 py-1.5 text-xs text-destructive sm:hidden">Save failed: {saveErr}</p>}

      <nav className="grid grid-cols-3 border-b border-border lg:hidden" aria-label="Editor sections">
        {(["setup", "canvas", "design"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`py-2.5 text-xs font-bold uppercase tracking-wider ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
            {t === "setup" ? "Image & Info" : t === "canvas" ? "Preview" : "Design & Export"}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        <aside className={`${show("setup")} w-full flex-col overflow-y-auto border-r border-border bg-panel lg:w-80 lg:shrink-0`}>
          <ArtworkSection project={project} set={h.set} onPalette={applyAutoPalette} />
          <MetadataSection project={project} set={h.set} />
        </aside>
        <main className={`${show("canvas")} min-w-0 flex-1 flex-col p-2 sm:p-4`}>
          <div className="min-h-0 flex-1">
            <PosterCanvas project={project} layers={layers} art={art} selectedId={selected} onSelect={setSelected} onChange={onLayerChange} onCheckpoint={h.checkpoint} />
          </div>
          <p className="pt-2 text-center text-[11px] text-muted-foreground">Click to select · drag to move · drag the corner square to resize · Ctrl/⌘+Z to undo</p>
        </main>
        <aside className={`${show("design")} w-full flex-col overflow-y-auto border-l border-border bg-panel lg:w-[22rem] lg:shrink-0`}>
          <TemplateSection project={project} set={h.set} />
          <LayersSection project={project} set={h.set} selectedId={selected} onSelect={setSelected} />
          <InspectorSection project={project} set={h.set} selectedId={selected} checkpoint={h.checkpoint} />
          <PaletteSection project={project} set={h.set} palettes={palettes} />
          <ExportSection project={project} set={h.set} />
        </aside>
      </div>
    </div>
  );
}
