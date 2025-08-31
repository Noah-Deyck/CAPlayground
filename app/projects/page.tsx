"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit3, Plus, Folder, ArrowLeft, Check, Upload } from "lucide-react";
import { unpackCA } from "@/lib/ca/ca-file";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>("caplayground-projects", []);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rootWidth, setRootWidth] = useState<number>(390);
  const [rootHeight, setRootHeight] = useState<number>(844);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "date-new" | "date-old">("date-new");

  const projectsArray = Array.isArray(projects) ? projects : [];

  const createProject = () => {
    if (newProjectName.trim() === "") return;
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
    };
    setProjects([...projectsArray, newProject]);
    setNewProjectName("");
  };

  const createProjectFromDialog = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const w = Number(rootWidth);
    const h = Number(rootHeight);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      width: Math.round(w),
      height: Math.round(h),
    };
    setProjects([...projectsArray, newProject]);
    setNewProjectName("");
    setRootWidth(390);
    setRootHeight(844);
    setIsCreateOpen(false);
  };

  const startEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const saveEdit = () => {
    if (editingProjectId === null || editingName.trim() === "") return;
    
    setProjects(
      projectsArray.map((project) =>
        project.id === editingProjectId
          ? { ...project, name: editingName.trim() }
          : project
      )
    );
    
    setEditingProjectId(null);
    setEditingName("");
  };

  const deleteProject = (id: string) => {
    setProjects(projectsArray.filter((project) => project.id !== id));
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setIsDeleteOpen(true);
  };

  const toggleSelectMode = () => {
    setIsSelectMode((v) => {
      const next = !v;
      if (!next) setSelectedIds([]);
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const bundle = await unpackCA(file);
      const id = Date.now().toString();
      const name = bundle.project.name || "Imported Project";
      const width = Math.round(bundle.project.width || (bundle.root?.size?.w ?? 0));
      const height = Math.round(bundle.project.height || (bundle.root?.size?.h ?? 0));

      const newProj: Project = {
        id,
        name,
        createdAt: new Date().toISOString(),
        width,
        height,
      };
      setProjects([...(projectsArray || []), newProj]);

      const root = bundle.root as any;
      const layers = root?.type === 'group' && Array.isArray(root.children)
        ? root.children
        : root
          ? [root]
          : [];
      const doc = {
        meta: { id, name, width, height, background: root?.backgroundColor ?? '#e5e7eb' },
        layers,
        selectedId: null,
      };
      try {
        localStorage.setItem(`caplayground-project:${id}`, JSON.stringify(doc));
      } catch {}

      router.push(`/editor/${id}`);
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const openBulkDelete = () => setIsBulkDeleteOpen(true);
  const performBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setProjects(projectsArray.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setIsSelectMode(false);
    setIsBulkDeleteOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      createProjectFromDialog();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingProjectId(null);
      setEditingName("");
    }
  };

  // Filter and sort projects for display
  const filteredProjects = projectsArray.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const visibleProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "date-old":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "date-new":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-6">
          <div className="flex-1">
            <div className="mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
            </div>
            <h1 className="font-sfpro text-3xl md:text-4xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground">Create and manage your CoreAnimation projects</p>
          </div>
          <div className="w-full md:w-auto flex gap-2">
            <Button variant={isSelectMode ? "secondary" : "outline"} onClick={toggleSelectMode}>
              {isSelectMode ? "Done" : "Select"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".ca,application/zip"
              onChange={handleImportChange}
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" /> Import .ca
            </Button>
            {isSelectMode && (
              <Button
                variant="destructive"
                onClick={openBulkDelete}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected ({selectedIds.length})
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
        </div>

        {/* Create Project Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="project-name">Project name</label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="My Animation"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="root-width">Width (px)</label>
                  <Input
                    id="root-width"
                    type="number"
                    min={1}
                    value={rootWidth}
                    onChange={(e) => setRootWidth(Number(e.target.value))}
                    onKeyDown={handleKeyPress}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="root-height">Height (px)</label>
                  <Input
                    id="root-height"
                    type="number"
                    min={1}
                    value={rootHeight}
                    onChange={(e) => setRootHeight(Number(e.target.value))}
                    onKeyDown={handleKeyPress}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={createProjectFromDialog}
                disabled={!newProjectName.trim() || !Number.isFinite(rootWidth) || !Number.isFinite(rootHeight) || rootWidth <= 0 || rootHeight <= 0}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Projects ({visibleProjects.length}{projectsArray.length !== visibleProjects.length ? ` of ${projectsArray.length}` : ""})</h2>

          {/* Search + Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="sm:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(value: "name-asc" | "name-desc" | "date-new" | "date-old") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z → A)</SelectItem>
                  <SelectItem value="date-new">Date created (Newest)</SelectItem>
                  <SelectItem value="date-old">Date created (Oldest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {projectsArray.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects yet. Create your first project to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id);
                return (
                  <Card 
                    key={project.id} 
                    className={`relative ${isSelectMode && isSelected ? 'border-accent ring-2 ring-accent/30' : ''}`}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelection(project.id);
                      } else {
                        router.push(`/editor/${project.id}`);
                      }
                    }}
                  >
                    <CardContent className="px-4 py-3">
                      {/* Selection checkmark */}
                      {isSelectMode && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full border flex items-center justify-center bg-background/70">
                          {isSelected && <Check className="h-4 w-4 text-accent" />}
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                      {editingProjectId === project.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={handleEditKeyPress}
                          onBlur={saveEdit}
                          className="flex-1 mr-2"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="flex-1 cursor-pointer select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectMode) toggleSelection(project.id);
                            else router.push(`/editor/${project.id}`);
                          }}
                        >
                          <h3 className="font-medium block overflow-hidden text-ellipsis whitespace-nowrap" title={project.name}>
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      </div>

                      {/* Under-card actions */}
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        {editingProjectId === project.id ? (
                          <Button size="sm" variant="secondary" className="h-7 px-2" onClick={saveEdit}>
                            Save
                          </Button>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2"
                              onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                            >
                              <Edit3 className="h-4 w-4 mr-1" /> Rename
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); confirmDelete(project.id); }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>


        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const p = projectsArray.find(p => p.id === pendingDeleteId);
                  return (
                    <span>
                      This action cannot be undone. This will permanently delete
                      {" "}
                      <span className="font-medium">{p?.name ?? "this project"}</span>.
                    </span>
                  );
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (pendingDeleteId) {
                    deleteProject(pendingDeleteId);
                  }
                  setPendingDeleteId(null);
                  setIsDeleteOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Selected Delete Confirmation */}
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} selected?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. These projects will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsBulkDeleteOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={performBulkDelete}
                disabled={selectedIds.length === 0}
              >
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
