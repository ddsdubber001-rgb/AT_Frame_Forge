import type { Project } from "./types";

const DB = "at-frame-forge";
const STORE = "projects";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("Browser storage is unavailable"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error("Could not open storage"));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req.result);
    t.onerror = t.onabort = () => {
      const e = t.error ?? req.error;
      rej(new Error(e?.name === "QuotaExceededError" ? "Storage is full — delete old projects or use a smaller image" : e?.message ?? "Storage error"));
    };
  });
}

export const saveProject = (p: Project) => tx("readwrite", (s) => s.put(p)).then(() => undefined);
export const getProject = (id: string) => tx<Project | undefined>("readonly", (s) => s.get(id));
export const deleteProject = (id: string) => tx("readwrite", (s) => s.delete(id)).then(() => undefined);
export async function listProjects(): Promise<Project[]> {
  const all = await tx<Project[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
