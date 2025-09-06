export type RepoItem = {
  name: string
  path: string
  type: "file" | "dir"
  download_url?: string | null
  url: string
};

export type DocNode = {
  name: string
  path: string
  type: "file" | "dir"
  children?: DocNode[]
};

const OWNER = "CAPlayground";
const REPO = "docs";

const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function githubHeaders(): HeadersInit | undefined {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    };
  }
  return { Accept: "application/vnd.github.v3+json" };
}

let BASE_PATH: string | null = null;

async function getBasePath(): Promise<string> {
  if (BASE_PATH !== null) return BASE_PATH;
  const root = await listRepoPathRaw("");
  const hasDocsDir = root.some((i) => i.type === "dir" && i.name.toLowerCase() === "docs");
  BASE_PATH = hasDocsDir ? "docs" : "";
  return BASE_PATH;
}

function withBase(path: string): string {
  if (!path) return BASE_PATH || "";
  if (!BASE_PATH) return path;
  return BASE_PATH ? [BASE_PATH, path].filter(Boolean).join("/") : path;
}

async function listRepoPath(path: string = ""): Promise<RepoItem[]> {
  const base = await getBasePath();
  const raw = await listRepoPathRaw(withBase(path));
  return raw.map((i) => ({ ...i, path: toRelative(i.path, base) }));
}

async function listRepoPathRaw(path: string = ""): Promise<RepoItem[]> {
  const url = path ? `${API_BASE}/${encodePath(path)}` : API_BASE;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`Failed to list repo path: ${path}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as RepoItem[]) : [data as RepoItem];
}

export async function fetchMarkdown(slugSegments?: string[]): Promise<{ content: string; resolvedPath: string }>{
  const base = await getBasePath();
  const rawPath = (slugSegments && slugSegments.length > 0) ? slugSegments.join("/") : "";
  const apiUrl = rawPath ? `${API_BASE}/${encodePath(withBase(rawPath))}` : (base ? `${API_BASE}/${encodePath(base)}` : API_BASE);
  let resMeta = await fetch(apiUrl, { headers: githubHeaders() });
  if (!resMeta.ok && rawPath) {
    const tryMd = `${API_BASE}/${encodePath(withBase(rawPath + ".md"))}`;
    const tryMdx = `${API_BASE}/${encodePath(withBase(rawPath + ".mdx"))}`;
    resMeta = await fetch(tryMd, { headers: githubHeaders() });
    if (!resMeta.ok) {
      resMeta = await fetch(tryMdx, { headers: githubHeaders() });
    }
  }
  if (!resMeta.ok) throw new Error(`Failed to resolve path: ${rawPath || "/"}`);
  const meta = await resMeta.json();
  if (Array.isArray(meta)) {
    const candidates = [
      (n: string) => /^readme\.(md|mdx)$/i.test(n),
      (n: string) => /^index\.(md|mdx)$/i.test(n),
      (n: string) => /^home\.(md|mdx)$/i.test(n),
    ];
    let chosen: any = null;
    for (const match of candidates) {
      chosen = meta.find((i: any) => i.type === "file" && match(i.name));
      if (chosen) break;
    }
    if (!chosen) {
      const anyMd = meta
        .filter((i: any) => i.type === "file" && /\.(md|mdx)$/i.test(i.name))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      if (anyMd.length) chosen = anyMd[0];
    }
    if (!chosen) throw new Error(`Directory has no default doc: ${rawPath || "/"}`);
    const res = await fetch(chosen.download_url, { headers: githubHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch markdown: ${chosen.path}`);
    const content = await res.text();
    return { content, resolvedPath: toRelative(chosen.path, base) };
  } else {
    if (meta.type !== "file" || !/\.(md|mdx)$/i.test(meta.name)) {
      const dir = ensureDirPath(meta.path);
      const names = ["README.md", "index.md", "home.md", "README.mdx", "index.mdx", "home.mdx"];
      for (const name of names) {
        const candidate = `${dir}${name}`;
        const url2 = `${API_BASE}/${encodePath(candidate)}`;
        const res2 = await fetch(url2, { headers: githubHeaders() });
        if (!res2.ok) continue;
        const m2 = await res2.json();
        const res3 = await fetch(m2.download_url, { headers: githubHeaders() });
        if (!res3.ok) continue;
        const content2 = await res3.text();
        return { content: content2, resolvedPath: toRelative(candidate, base) };
      }
      const urlList = `${API_BASE}/${encodePath(dir)}`;
      const resList = await fetch(urlList, { headers: githubHeaders() });
      if (resList.ok) {
        const list = await resList.json();
        const anyMd = Array.isArray(list)
          ? list
              .filter((i: any) => i.type === "file" && /\.(md|mdx)$/i.test(i.name))
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
          : [];
        if (anyMd.length) {
          const m2 = anyMd[0];
          const res3 = await fetch(m2.download_url, { headers: githubHeaders() });
          if (res3.ok) {
            const content2 = await res3.text();
            return { content: content2, resolvedPath: toRelative(m2.path, base) };
          }
        }
      }
      throw new Error(`Directory has no default doc: ${toRelative(meta.path, base)}`);
    }
    const res = await fetch(meta.download_url, { headers: githubHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch markdown: ${meta.path}`);
    const content = await res.text();
    return { content, resolvedPath: toRelative(meta.path, base) };
  }
}

function normalizeMarkdownPath(slugSegments?: string[]): string {
  let path = (slugSegments && slugSegments.length > 0) ? slugSegments.join("/") : "README.md";
  if (!path.endsWith(".md") && !path.endsWith(".mdx")) {
    path = path.replace(/\/$/, "");
    path = `${path}.md`;
  }
  return path;
}

function ensureDirPath(p: string): string {
  return p.endsWith("/") ? p : p.replace(/\.(md|mdx)$/i, "/");
}

export function isReadme(name: string): boolean {
  return /^readme\.(md|mdx)$/i.test(name);
}

export async function listDirectory(path: string = ""): Promise<RepoItem[]> {
  const items = await listRepoPath(path);
  return items.filter((i) => {
    if (i.type === "dir") return true;
    if (!/\.(md|mdx)$/i.test(i.name)) return false;
    if (isReadme(i.name)) return false;
    return true;
  });
}

function encodePath(p: string): string {
  return p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

async function resolveDownloadUrl(path: string): Promise<string | null> {
  const url = `${API_BASE}/${encodePath(path)}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.download_url) return data.download_url as string;
  }
  return null;
}

function toRelative(p: string, base: string): string {
  if (!base) return p;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
}

export async function getDocsTree(path: string = ""): Promise<DocNode[]> {
  const entries = await listRepoPath(path);
  const dirs = entries.filter((e) => e.type === "dir");
  const files = entries.filter((e) => e.type === "file" && /\.(md|mdx)$/i.test(e.name));
  const fileNodes: DocNode[] = files
    .filter((f) => !isReadme(f.name))
    .map((f) => ({ name: stripExt(f.name), path: f.path, type: "file" as const }));
  const dirNodes: DocNode[] = [];
  for (const d of dirs) {
    const children = await getDocsTree(d.path);
    dirNodes.push({ name: d.name, path: d.path, type: "dir", children });
  }
  return [...dirNodes, ...fileNodes];
}

export async function getFirstDocPath(tree?: DocNode[] | null): Promise<string | null> {
  const t = tree ?? (await getDocsTree(""));
  for (const node of t) {
    if (node.type === "file") return toSlug(node.path);
    if (node.children && node.children.length) {
      const deep = await getFirstDocPath(node.children);
      if (deep) return deep;
    }
    const defaultPath = await getDefaultDocForDir(node.path);
    if (defaultPath) return toSlug(defaultPath);
  }
  return null;
}

export async function getDefaultDocForDir(dir: string): Promise<string | null> {
  const base = await getBasePath();
  const url = `${API_BASE}/${encodePath(withBase(dir))}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) return null;
  const items = await res.json();
  if (!Array.isArray(items)) return null;
  const names = ["README.md", "index.md", "home.md", "README.mdx", "index.mdx", "home.mdx"];
  for (const name of names) {
    const hit = items.find((i: any) => i.type === "file" && i.name.toLowerCase() === name.toLowerCase());
    if (hit) return toRelative(hit.path, base);
  }
  return null;
}

function stripExt(n: string): string {
  return n.replace(/\.(md|mdx)$/i, "");
}

function toSlug(p: string): string {
  return p.replace(/\.(md|mdx)$/i, "");
}
