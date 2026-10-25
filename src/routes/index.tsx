import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Layers, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Brand } from "@/components/Logo";
import { newProject } from "@/lib/project";
import { deleteProject, listProjects, saveProject } from "@/lib/storage";
import { uid } from "@/lib/templates";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AT Frame Forge — Anime & Movie Poster Studio" },
      { name: "description", content: "Upload artwork, fetch anime and movie details, style cinematic overlays and export 4K posters." },
      { property: "og:title", content: "AT Frame Forge — Anime & Movie Poster Studio" },
      { property: "og:description", content: "Cinematic poster studio with templates, layers, smart palettes and 4K export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);

  const refresh = () => listProjects().then(setProjects).catch((e: Error) => { setErr(e.message); setProjects([]); });
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    const p = newProject();
    try { await saveProject(p); nav({ to: "/editor/$id", params: { id: p.id } }); } catch (e) { setErr((e as Error).message); }
  };
  const act = async (fn: () => Promise<void>) => { try { await fn(); await refresh(); } catch (e) { setErr((e as Error).message); } };

  const shown = (projects ?? []).filter((p) => `${p.name} ${p.meta.title}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="hero-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand />
        <Link to="/batch" className="btn"><Layers className="h-4 w-4" />Batch</Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-10 sm:py-16">
          <p className="label-sm text-primary">Poster studio</p>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Forge cinematic anime & movie posters.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Upload your artwork, pull verified details from AniList, Jikan or TMDB, choose a layout, and export up to 4K.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn btn-primary px-5 py-2.5 text-sm" onClick={create}><Plus className="h-4 w-4" />New poster</button>
            <Link to="/batch" className="btn px-5 py-2.5 text-sm"><Layers className="h-4 w-4" />Batch create</Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Project library</h2>
            <label className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input className="field pl-8" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          {err && <p className="mb-3 text-sm text-destructive" role="alert">{err}</p>}
          {projects === null ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : shown.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted-foreground">{projects.length ? "No projects match your search." : "No projects yet — create your first poster."}</div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((p) => (
                <li key={p.id} className="panel overflow-hidden">
                  <Link to="/editor/$id" params={{ id: p.id }} className="flex aspect-[3/4] items-center justify-center bg-stage">
                    {p.thumbnail ? <img src={p.thumbnail} alt={p.name} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No preview</span>}
                  </Link>
                  <div className="p-3">
                    {renaming === p.id ? (
                      <input autoFocus className="field" defaultValue={p.name}
                        onBlur={(e) => { const name = e.target.value.trim() || p.name; setRenaming(null); act(() => saveProject({ ...p, name, updatedAt: Date.now() })); }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                    ) : <p className="truncate text-sm font-semibold">{p.name}</p>}
                    <p className="text-[11px] text-muted-foreground">Edited {new Date(p.updatedAt).toLocaleString()}</p>
                    <div className="mt-2 flex gap-1">
                      <button className="btn btn-ghost btn-icon" aria-label="Rename" onClick={() => setRenaming(p.id)}><Pencil className="h-3.5 w-3.5" /></button>
                      <button className="btn btn-ghost btn-icon" aria-label="Duplicate" onClick={() => act(() => saveProject({ ...structuredClone(p), id: uid(), name: `${p.name} copy`, createdAt: Date.now(), updatedAt: Date.now() }))}><Copy className="h-3.5 w-3.5" /></button>
                      <button className="btn btn-ghost btn-icon btn-danger ml-auto" aria-label="Delete" onClick={() => confirm(`Delete “${p.name}”? This cannot be undone.`) && act(() => deleteProject(p.id))}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-muted-foreground">Projects are saved in this browser. Clearing site data removes them.</p>
        </section>
      </main>
    </div>
  );
}
