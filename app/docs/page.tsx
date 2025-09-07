import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { getDocsTree, getTitlesMap } from "@/lib/docs"
import { DocsSidebar } from "@/components/docs/sidebar"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function DocsPage() {
  let tree: Awaited<ReturnType<typeof getDocsTree>> = []
  try {
    tree = await getDocsTree("")
  } catch {}
  const titles = await (async () => {
    try {
      const files = flattenFiles(tree)
      return await getTitlesMap(files)
    } catch {
      return {}
    }
  })()
  const allFiles = flattenFiles(tree)
  const recommended = pickRecommendations(allFiles, titles)
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
            <aside className="md:sticky md:top-20 h-fit md:max-h-[80vh] md:overflow-auto border rounded-md p-3">
              <DocsSidebar tree={tree} activePath={""} titles={titles} />
            </aside>
            <div className="prose dark:prose-invert max-w-none">
              <h1>Documentation</h1>
              <p className="text-muted-foreground">Choose a page from the sidebar to get started.</p>
              {recommended.length > 0 && (
                <div className="mt-8">
                  <h2 className="mt-0">Recommended to start</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommended.map((p) => {
                      const slug = p.replace(/\.(md|mdx)$/i, "")
                      const title = titles[p] || displayName(p)
                      const icon = getIconForTitle(title)
                      return (
                        <Link key={p} href={`/docs/${slug}`} className="block">
                          <Card className="hover:bg-accent/10 transition-colors">
                            <CardHeader className="flex-row items-start gap-3">
                              <div className="text-accent text-2xl leading-none">{icon}</div>
                              <div>
                                <CardTitle className="text-base md:text-lg">{title}</CardTitle>
                                <CardDescription className="line-clamp-2">{makeShortDescription(title)}</CardDescription>
                              </div>
                            </CardHeader>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function flattenFiles(tree: Awaited<ReturnType<typeof getDocsTree>>): string[] {
  const out: string[] = []
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === "file") out.push(n.path)
      if (n.type === "dir" && n.children) walk(n.children)
    }
  }
  walk(tree as any[])
  return out
}

function displayName(p: string): string {
  const name = p.split("/").pop() || p
  return name.replace(/\.(md|mdx)$/i, "")
}

function pickRecommendations(files: string[], titles: Record<string, string>): string[] {
  // Heuristic: prioritize common entry points, then top-level files, then first few remaining
  const scores = new Map<string, number>()
  const prefer = [
    /getting[-_ ]?started/i,
    /introduction|intro/i,
    /overview/i,
    /quick[-_ ]?start/i,
    /guide/i,
    /readme\.(md|mdx)$/i,
  ]
  for (const f of files) {
    let s = 0
    // Prefer files closer to the root
    const depth = (f.match(/\//g) || []).length
    s += Math.max(0, 5 - depth)
    // Prefer known entry names
    for (const rx of prefer) if (rx.test(f) || rx.test(titles[f] || "")) s += 10
    scores.set(f, s)
  }
  const sorted = [...files].sort((a, b) => (scores.get(b)! - scores.get(a)!))
  // Filter out README if there is a better default in that folder; keep unique by slug
  const seen = new Set<string>()
  const pick: string[] = []
  for (const f of sorted) {
    const slug = f.replace(/\.(md|mdx)$/i, "")
    if (seen.has(slug)) continue
    seen.add(slug)
    pick.push(f)
    if (pick.length >= 5) break
  }
  return pick
}

function getIconForTitle(title: string): string {
  const t = title.toLowerCase()
  if (/(getting started|quick start|start|onboarding)/i.test(t)) return "🚀"
  if (/(usage|how to|tutorial|guide)/i.test(t)) return "📘"
  if (/(terminal|cli|command line)/i.test(t)) return "⌨️"
  if (/(mcp|plugins|extensions)/i.test(t)) return "🧩"
  if (/(memory|memories|rules)/i.test(t)) return "🧠"
  if (/(context|awareness|codebase)/i.test(t)) return "🗂️"
  if (/(advanced|configuration|settings|options)/i.test(t)) return "⚙️"
  if (/(api|reference)/i.test(t)) return "📚"
  return "📄"
}

function makeShortDescription(title: string): string {
  const t = title.toLowerCase()
  if (/getting started|quick start|start|onboarding/.test(t)) return "Kick off with the basics and setup."
  if (/usage|how to|tutorial|guide/.test(t)) return "Step‑by‑step guidance and examples."
  if (/terminal|cli|command line/.test(t)) return "Operate from the command line."
  if (/mcp|plugins|extensions/.test(t)) return "Extend capabilities with integrations."
  if (/memory|memories|rules/.test(t)) return "Customize behavior and recall."
  if (/context|awareness|codebase/.test(t)) return "Instantly understand your project."
  if (/advanced|configuration|settings|options/.test(t)) return "Fine‑tune advanced options."
  if (/api|reference/.test(t)) return "Detailed API reference."
  return "Open this doc to learn more."
}
