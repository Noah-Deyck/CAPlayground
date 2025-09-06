import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Link from "next/link";
import React from "react";
import { fetchMarkdown } from "@/lib/docs";
import { getDocsTree } from "@/lib/docs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocsSidebar } from "@/components/docs/sidebar";

export default async function DocPage({ params }: { params: { slug: string[] } }) {
  const slug = params?.slug;

  try {
    const { content, resolvedPath } = await fetchMarkdown(slug);
    const tree = await getDocsTree("");

    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
              <aside className="md:sticky md:top-20 h-fit md:max-h-[80vh] md:overflow-auto border rounded-md p-3">
                <DocsSidebar tree={tree} activePath={resolvedPath} />
              </aside>
              <article className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  } catch (e) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="font-heading text-3xl font-bold">Not Found</h1>
              <p className="text-muted-foreground">We couldn't find that doc.</p>
              <div className="pt-4">
                <Link href="/docs" className="text-accent hover:underline">← Back to Docs</Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

function toDirPath(resolvedPath: string): string {
  return resolvedPath.replace(/[^/]+$/, "");
}

function toSlugPath(repoPath: string): string {
  return repoPath.replace(/\.(md|mdx)$/i, "");
}

function displayName(p: string): string {
  const name = p.split("/").pop() || p;
  return name.replace(/\.(md|mdx)$/i, "");
}

function isActive(itemPath: string, resolvedPath: string): boolean {
  const a = itemPath.replace(/\.(md|mdx)$/i, "");
  const b = resolvedPath.replace(/\.(md|mdx)$/i, "");
  return a === b;
}
