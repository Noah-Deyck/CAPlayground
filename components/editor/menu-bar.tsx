"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Trash2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEditor } from "./editor-context";
import { packCA } from "@/lib/ca/ca-file";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useEffect, useState } from "react";

export function MenuBar({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { doc } = useEditor();
  type ProjectMeta = {
    id: string;
    name: string;
  };
  const [projects, setProjects] = useLocalStorage<ProjectMeta[]>("caplayground-projects", []);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (doc?.meta.name) setName(doc.meta.name);
  }, [doc?.meta.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const performRename = () => {
    if (!name.trim()) return;
    const next = (projects ?? []).map((p) => (p.id === projectId ? { ...p, name: name.trim() } : p));
    setProjects(next);
    const key = `caplayground-project:${projectId}`;
    try {
      const current = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (current) {
        const parsed = JSON.parse(current);
        parsed.meta.name = name.trim();
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {}
    setRenameOpen(false);
  };

  const performDelete = () => {
    const next = (projects ?? []).filter((p) => p.id !== projectId);
    setProjects(next);
    try { localStorage.removeItem(`caplayground-project:${projectId}`); } catch {}
    router.push("/projects");
  };

  return (
    <div className="w-full h-12 flex items-center justify-between px-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 border border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {doc?.meta.name ?? "Project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/projects">
              <DropdownMenuItem className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full h-8 w-8 p-0"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              if (!doc) return;
              const nameSafe = (doc.meta.name || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
              const root: GroupLayer = {
                id: doc.meta.id,
                name: doc.meta.name || 'Project',
                type: 'group',
                position: { x: Math.round((doc.meta.width || 0) / 2), y: Math.round((doc.meta.height || 0) / 2) },
                size: { w: doc.meta.width || 0, h: doc.meta.height || 0 },
                backgroundColor: doc.meta.background,
                children: (doc.layers as AnyLayer[]) || [],
              };

              const blob = await packCA({
                project: {
                  id: doc.meta.id,
                  name: doc.meta.name,
                  width: doc.meta.width,
                  height: doc.meta.height,
                  background: doc.meta.background,
                },
                root,
                assets: {},
              });

              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${nameSafe}.ca`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Export failed', e);
            }
          }}
          disabled={!doc}
        >
          Export CA
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              if (!doc) return;
              const nameSafe = (doc.meta.name || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
              const root: GroupLayer = {
                id: doc.meta.id,
                name: doc.meta.name || 'Project',
                type: 'group',
                position: { x: Math.round((doc.meta.width || 0) / 2), y: Math.round((doc.meta.height || 0) / 2) },
                size: { w: doc.meta.width || 0, h: doc.meta.height || 0 },
                backgroundColor: doc.meta.background,
                children: (doc.layers as AnyLayer[]) || [],
              };

              const caBlob = await packCA({
                project: {
                  id: doc.meta.id,
                  name: doc.meta.name,
                  width: doc.meta.width,
                  height: doc.meta.height,
                  background: doc.meta.background,
                },
                root,
                assets: {},
              });

              const caFileName = `${nameSafe}.ca`;
              const res = await fetch(`/api/build-tendies?filename=${encodeURIComponent(caFileName)}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                },
                body: caBlob,
              });
              if (!res.ok) throw new Error('Failed to build zip');
              const outBlob = await res.blob();
              const url = URL.createObjectURL(outBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${nameSafe}.tendies`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Build tendies failed', e);
            }
          }}
          disabled={!doc}
        >
          Export Tendies
        </Button>
      </div>

      {/* Rename dialog */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setRenameOpen(false)}>
          <div className="bg-background rounded-md shadow p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2">Rename Project</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e)=>{ if(e.key==='Enter') performRename(); if(e.key==='Escape') setRenameOpen(false); }} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={performRename} disabled={!name.trim()}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and its editor data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={performDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
