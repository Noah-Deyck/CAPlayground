import { redirect } from "next/navigation"
import { getDocsTree, getFirstDocPath } from "@/lib/docs"

export default async function DocsPage() {
  const tree = await getDocsTree("")
  const first = await getFirstDocPath(tree)
  if (first) {
    redirect(`/docs/${first}`)
  }
  redirect("/")
}
