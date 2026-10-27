import { searchTmdb, tmdbDetails } from "./tmdb.functions";
import { emptyMeta, type Meta } from "./types";
import { enabledProviders } from './admin.functions';
import { searchOmdb } from './omdb.functions';

/** Metadata service: AniList + Jikan (anime, public) and TMDB (movies/TV, server-side key). */

export interface SearchResult { key: string; meta: Meta; label: string; sub: string; thumb: string; needsDetails?: { kind: string; id: string } }
export interface SearchOutcome { results: SearchResult[]; errors: string[]; tmdbConfigured: boolean }

type J = Record<string, any>;
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s_])\w/g, (m) => m.toUpperCase()).replace(/_/g, " ");
const pad = (n: number) => String(n).padStart(2, "0");
const plural = (n: number | null | undefined, w: string) => (n ? `${n} ${w}${n === 1 ? "" : "s"}` : "");
const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();

async function fetchJson(url: string, init?: RequestInit, timeout = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (r.status === 429) throw new Error("rate limited, please wait a moment");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as J;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("request timed out");
    throw e;
  } finally { clearTimeout(t); }
}

const ANILIST_Q = `query($q:String){Page(perPage:8){media(search:$q,type:ANIME,sort:SEARCH_MATCH){id title{romaji english native} synonyms startDate{year month day} season seasonYear episodes duration format status genres description(asHtml:false) studios(isMain:true){nodes{name}} averageScore isAdult coverImage{extraLarge large}}}}`;
const FORMAT: Record<string, string> = { TV: "Anime Series", TV_SHORT: "Anime Series (short)", MOVIE: "Anime Movie", OVA: "OVA", ONA: "ONA", SPECIAL: "Special", MUSIC: "Music video" };
const STATUS: Record<string, string> = { FINISHED: "Finished", RELEASING: "Airing", NOT_YET_RELEASED: "Upcoming", CANCELLED: "Cancelled", HIATUS: "On hiatus" };

async function anilist(q: string): Promise<SearchResult[]> {
  const j = await fetchJson("https://graphql.anilist.co", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_Q, variables: { q } }),
  });
  return ((j["data"]?.Page?.media ?? []) as J[]).map((m) => {
    const meta = emptyMeta();
    meta.title = m["title"]?.english || m["title"]?.romaji || "";
    meta.altTitle = [m["title"]?.romaji, m["title"]?.native].filter((t: string) => t && t !== meta.title)[0] ?? "";
    const sd = m["startDate"] ?? {};
    meta.year = sd.year ? String(sd.year) : "";
    meta.releaseDate = sd.year ? [sd.year, sd.month && pad(sd.month), sd.day && pad(sd.day)].filter(Boolean).join("-") : "";
    meta.season = m["season"] && m["seasonYear"] ? `${titleCase(m["season"])} ${m["seasonYear"]}` : "";
    meta.type = FORMAT[m["format"]] ?? (m["format"] ? titleCase(m["format"]) : "");
    meta.episodes = plural(m["episodes"], "episode");
    meta.runtime = m["duration"] ? `${m["duration"]} min${(m["episodes"] ?? 0) > 1 ? " / ep" : ""}` : "";
    meta.genres = (m["genres"] ?? []).join(", ");
    meta.status = STATUS[m["status"]] ?? "";
    meta.synopsis = m["description"] ? stripHtml(m["description"]) : "";
    meta.studio = (m["studios"]?.nodes ?? []).map((s: J) => s["name"]).join(", ");
    meta.rating = m["averageScore"] ? `${(m["averageScore"] / 10).toFixed(1)}/10 AniList` : "";
    meta.imageUrl = m["coverImage"]?.extraLarge || m["coverImage"]?.large || "";
    meta.source = "AniList"; meta.sourceId = String(m["id"]);
    return { key: `anilist-${m["id"]}`, meta, label: meta.title, sub: [meta.type, meta.year].filter(Boolean).join(" · "), thumb: m["coverImage"]?.large ?? "" };
  });
}

async function jikan(q: string): Promise<SearchResult[]> {
  const j = await fetchJson(`https://api.jikan.moe/v4/anime?limit=8&sfw=true&q=${encodeURIComponent(q)}`);
  return ((j["data"] ?? []) as J[]).map((a) => {
    const meta = emptyMeta();
    meta.title = a["title_english"] || a["title"] || "";
    meta.altTitle = [a["title"], a["title_japanese"]].filter((t: string) => t && t !== meta.title)[0] ?? "";
    const from = a["aired"]?.from ? String(a["aired"].from).slice(0, 10) : "";
    meta.releaseDate = from; meta.year = a["year"] ? String(a["year"]) : from.slice(0, 4);
    meta.season = a["season"] && a["year"] ? `${titleCase(a["season"])} ${a["year"]}` : "";
    meta.type = a["type"] === "TV" ? "Anime Series" : a["type"] === "Movie" ? "Anime Movie" : a["type"] ?? "";
    meta.episodes = plural(a["episodes"], "episode");
    meta.runtime = a["duration"] && a["duration"] !== "Unknown" ? String(a["duration"]).replace(" per ep", " / ep") : "";
    meta.genres = (a["genres"] ?? []).map((g: J) => g["name"]).join(", ");
    meta.status = a["status"] ?? "";
    meta.synopsis = (a["synopsis"] ?? "").replace(/\[Written by MAL Rewrite\]/g, "").trim();
    meta.studio = (a["studios"] ?? []).map((s: J) => s["name"]).join(", ");
    meta.ageRating = a["rating"] ? String(a["rating"]).split(" - ")[0] ?? "" : "";
    meta.rating = a["score"] ? `${a["score"]}/10 MyAnimeList` : "";
    meta.imageUrl = a["images"]?.jpg?.large_image_url ?? "";
    meta.source = "Jikan (MyAnimeList)"; meta.sourceId = String(a["mal_id"]);
    return { key: `jikan-${a["mal_id"]}`, meta, label: meta.title, sub: [meta.type, meta.year].filter(Boolean).join(" · "), thumb: a["images"]?.jpg?.image_url ?? "" };
  });
}

const IMG = "https://image.tmdb.org/t/p/";
let langNames: Intl.DisplayNames | null = null;
const langName = (c: string) => {
  try { langNames ??= new Intl.DisplayNames(["en"], { type: "language" }); return langNames.of(c) ?? c; } catch { return c; }
};

function mapTmdb(r: J): SearchResult {
  const tv = r["media_type"] === "tv";
  const meta = emptyMeta();
  meta.title = r["title"] || r["name"] || "";
  const orig = r["original_title"] || r["original_name"] || "";
  meta.altTitle = orig !== meta.title ? orig : "";
  meta.releaseDate = r["release_date"] || r["first_air_date"] || "";
  meta.year = meta.releaseDate.slice(0, 4);
  meta.type = tv ? "Series" : "Movie";
  meta.synopsis = r["overview"] ?? "";
  meta.language = r["original_language"] ? langName(r["original_language"]) : "";
  meta.rating = r["vote_count"] > 0 && r["vote_average"] ? `${Number(r["vote_average"]).toFixed(1)}/10 TMDB` : "";
  meta.imageUrl = r["poster_path"] ? `${IMG}w780${r["poster_path"]}` : "";
  meta.source = "TMDB"; meta.sourceId = `${r["media_type"]}-${r["id"]}`;
  return { key: `tmdb-${r["media_type"]}-${r["id"]}`, meta, label: meta.title, sub: [meta.type, meta.year].filter(Boolean).join(" · "), thumb: r["poster_path"] ? `${IMG}w185${r["poster_path"]}` : "", needsDetails: { kind: r["media_type"], id: String(r["id"]) } };
}

export async function searchAll(query: string, sources: ("anilist" | "jikan" | "tmdb" | "omdb")[] = ["anilist", "jikan", "tmdb", "omdb"]): Promise<SearchOutcome> {
  const q = query.trim();
  if (!q) return { results: [], errors: ["Enter a title to search"], tmdbConfigured: true };
  if (q.length > 200) return { results: [], errors: ['Title must be 200 characters or fewer.'], tmdbConfigured: true };
  try { const enabled = await enabledProviders(); sources = sources.filter(s => enabled.includes(s)); }
  catch { return { results: [], errors: ['Integration settings could not be loaded. Try again shortly.'], tmdbConfigured: false }; }
  const errors: string[] = [];
  let tmdbConfigured = true;
  const jobs = sources.map(async (s) => {
    try {
      if (s === "anilist") return await anilist(q);
      if (s === "jikan") return await jikan(q);
      if (s === 'omdb') {
        const r = await searchOmdb({ data: { query: q } });
        if (r.error) throw new Error(r.error);
        return (JSON.parse(r.json) as J[]).map(d => {
          const meta = emptyMeta();
          const value = (key: string) => d[key] && d[key] !== 'N/A' ? String(d[key]) : '';
          meta.title = value('Title'); meta.year = value('Year'); meta.releaseDate = value('Released');
          meta.type = value('Type'); meta.runtime = value('Runtime'); meta.genres = value('Genre');
          meta.synopsis = value('Plot'); meta.language = value('Language'); meta.ageRating = value('Rated');
          meta.imdbId = value('imdbID'); meta.rating = value('imdbRating') ? `${value('imdbRating')}/10 IMDb (via OMDb)` : '';
          meta.source = 'OMDb'; meta.sourceId = meta.imdbId; meta.imageUrl = value('Poster');
          return { key: `omdb-${meta.imdbId}`, meta, label: meta.title, sub: [meta.type, meta.year].filter(Boolean).join(' · '), thumb: meta.imageUrl };
        });
      }
      const r = await searchTmdb({ data: { query: q } });
      tmdbConfigured = r.configured;
      if (r.error) throw new Error(r.error);
      return (JSON.parse(r.json) as J[]).map(mapTmdb);
    } catch (e) {
      errors.push(`${s === "anilist" ? "AniList" : s === "jikan" ? "Jikan" : "TMDB"}: ${(e as Error).message || "unavailable"}`);
      return [];
    }
  });
  const lists = await Promise.all(jobs);
  // interleave so each source's best match appears near the top
  const results: SearchResult[] = [];
  for (let i = 0; i < 8; i++) for (const l of lists) { const result = l[i]; if (result) results.push(result); }
  return { results, errors, tmdbConfigured };
}

/** Completes a TMDB result with details (genres, runtime, studio, seasons, certification). */
export async function resolveResult(r: SearchResult): Promise<Meta> {
  if (!r.needsDetails) return r.meta;
  const res = await tmdbDetails({ data: r.needsDetails });
  if (!res.json) throw new Error(res.error ?? "Could not load TMDB details");
  const d = JSON.parse(res.json) as J;
  const m = { ...r.meta };
  m.imdbId = d['imdb_id'] || d['external_ids']?.imdb_id || '';
  const tv = r.needsDetails.kind === "tv";
  m.genres = (d["genres"] ?? []).map((g: J) => g["name"]).join(", ");
  m.status = d["status"] ?? "";
  m.studio = (d["production_companies"] ?? []).slice(0, 2).map((c: J) => c["name"]).join(", ");
  if (tv) {
    const rt = (d["episode_run_time"] ?? [])[0];
    m.runtime = rt ? `${rt} min / ep` : "";
    m.seasons = plural(d["number_of_seasons"], "season");
    m.episodes = plural(d["number_of_episodes"], "episode");
    const cr = (d["content_ratings"]?.results ?? []) as J[];
    m.ageRating = (cr.find((c) => c["iso_3166_1"] === "US") ?? cr[0])?.["rating"] ?? "";
  } else {
    m.runtime = d["runtime"] ? `${Math.floor(d["runtime"] / 60)}h ${d["runtime"] % 60}m` : "";
    const rd = (d["release_dates"]?.results ?? []) as J[];
    const us = rd.find((c) => c["iso_3166_1"] === "US");
    m.ageRating = ((us?.["release_dates"] ?? []) as J[]).map((x) => x["certification"]).find(Boolean) ?? "";
  }
  return m;
}
