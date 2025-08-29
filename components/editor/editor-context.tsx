"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnyLayer, CAProject, GroupLayer, ImageLayer, LayerBase, ShapeLayer, TextLayer, TimelineState, LayerPropertyAnimation, AnimatableScalarProp } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type ProjectDocument = {
  meta: Pick<CAProject, "id" | "name" | "width" | "height" | "background">;
  layers: AnyLayer[];
  selectedId?: string | null;
  timeline: TimelineState;
  animations: LayerPropertyAnimation[];
};

const STORAGE_PREFIX = "caplayground-project:";
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type EditorContextValue = {
  doc: ProjectDocument | null;
  setDoc: React.Dispatch<React.SetStateAction<ProjectDocument | null>>;
  addTextLayer: () => void;
  addImageLayer: (src?: string) => void;
  addShapeLayer: (shape?: ShapeLayer["shape"]) => void;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
  updateLayerTransient: (id: string, patch: Partial<AnyLayer>) => void;
  selectLayer: (id: string | null) => void;
  deleteLayer: (id: string) => void;
  persist: () => void;
  undo: () => void;
  redo: () => void;
  // timeline & animation
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setTime: (t: number, transient?: boolean) => void;
  setDuration: (d: number) => void;
  addKeyframe: (layerId: string, prop: AnimatableScalarProp, value: number) => void;
  removeKeyframe: (layerId: string, prop: AnimatableScalarProp, time: number) => void;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({
  projectId,
  initialMeta,
  children,
}: {
  projectId: string;
  initialMeta: Pick<CAProject, "id" | "name" | "width" | "height"> & { background?: string };
  children: React.ReactNode;
}) {
  const storageKey = STORAGE_PREFIX + projectId;
  const [storedDoc, setStoredDoc] = useLocalStorage<ProjectDocument | null>(storageKey, null);
  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const pastRef = useRef<ProjectDocument[]>([]);
  const futureRef = useRef<ProjectDocument[]>([]);
  const skipPersistRef = useRef(false);
  const initializedRef = useRef(false);

  const pushHistory = useCallback((prev: ProjectDocument) => {
    pastRef.current.push(JSON.parse(JSON.stringify(prev)) as ProjectDocument);
    futureRef.current = [];
  }, []);

  // Initialize doc once on mount to avoid a feedback loop with the persist effect
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (storedDoc) {
      // backfill defaults for timeline/animations
      setDoc({
        ...storedDoc,
        timeline: storedDoc.timeline || { duration: 5, fps: 60, currentTime: 0, playing: false, loop: true },
        animations: storedDoc.animations || [],
      });
      return;
    }
    setDoc({
      meta: {
        id: initialMeta.id,
        name: initialMeta.name,
        width: initialMeta.width,
        height: initialMeta.height,
        background: initialMeta.background ?? "#e5e7eb",
      },
      layers: [],
      selectedId: null,
      timeline: { duration: 5, fps: 60, currentTime: 0, playing: false, loop: true },
      animations: [],
    });
  }, [initialMeta.id]);

  const persist = useCallback(() => {
    if (doc) setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  useEffect(() => {
    if (!doc) return;
    if (skipPersistRef.current) {
     
      skipPersistRef.current = false;
      return;
    }
    setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  const selectLayer = useCallback((id: string | null) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      return { ...prev, selectedId: id };
    });
  }, []);

  const addBase = useCallback((name: string): LayerBase => ({
    id: genId(),
    name,
    position: { x: 50, y: 50 },
    size: { w: 120, h: 40 },
    rotation: 0,
    visible: true,
  }), []);

  const addTextLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: TextLayer = {
        ...addBase("Text Layer"),
        type: "text",
        text: "Text Layer",
        color: "#111827",
        fontSize: 16,
        align: "left",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addImageLayer = useCallback((src?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase("Image Layer"),
        type: "image",
        size: { w: 200, h: 120 },
        src: src ?? "https://placehold.co/200x120/png",
        fit: "cover",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addShapeLayer = useCallback((shape: ShapeLayer["shape"] = "rect") => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ShapeLayer = {
        ...addBase("Shape Layer"),
        type: "shape",
        size: { w: 120, h: 120 },
        shape,
        fill: "#60a5fa",
        radius: shape === "rounded-rect" ? 8 : undefined,
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const updateInTree = useCallback((layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] => {
    return layers.map((l) => {
      if (l.id === id) return { ...l, ...patch } as AnyLayer;
      if (l.type === "group") {
        const g = l as GroupLayer;
        return { ...g, children: updateInTree(g.children, id, patch) } as AnyLayer;
      }
      return l;
    });
  }, []);

  const deleteInTree = useCallback((layers: AnyLayer[], id: string): AnyLayer[] => {
    const next: AnyLayer[] = [];
    for (const l of layers) {
      if (l.id === id) continue;
      if (l.type === "group") {
        const g = l as GroupLayer;
        next.push({ ...g, children: deleteInTree(g.children, id) } as AnyLayer);
      } else {
        next.push(l);
      }
    }
    return next;
  }, []);

  const containsId = useCallback((layers: AnyLayer[], id: string): boolean => {
    for (const l of layers) {
      if (l.id === id) return true;
      if (l.type === "group" && containsId((l as GroupLayer).children, id)) return true;
    }
    return false;
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<AnyLayer>) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const updateLayerTransient = useCallback((id: string, patch: Partial<AnyLayer>) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const deleteLayer = useCallback((id: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const nextLayers = deleteInTree(prev.layers, id);
      const nextSelected = prev.selectedId === id || (prev.selectedId ? !containsId(nextLayers, prev.selectedId) : false) ? null : prev.selectedId;
      return { ...prev, layers: nextLayers, selectedId: nextSelected };
    });
  }, [deleteInTree, containsId]);

  const undo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const past = pastRef.current;
      if (past.length === 0) return current;
      const previous = past.pop() as ProjectDocument;
      futureRef.current.push(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const future = futureRef.current;
      if (future.length === 0) return current;
      const next = future.pop() as ProjectDocument;
      pastRef.current.push(current);
      return next;
    });
  }, []);

  // Timeline & playback
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const setTime = useCallback((t: number, transient = false) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const clamped = Math.max(0, Math.min(prev.timeline.duration, t));
      // No-op if time hasn't changed to avoid render loops with controlled Slider
      if (Math.abs(prev.timeline.currentTime - clamped) < 1e-6) return prev;
      if (transient) skipPersistRef.current = true;
      return { ...prev, timeline: { ...prev.timeline, currentTime: clamped } };
    });
  }, []);

  const setDuration = useCallback((d: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const duration = Math.max(0.1, d);
      return { ...prev, timeline: { ...prev.timeline, duration, currentTime: Math.min(prev.timeline.currentTime, duration) } };
    });
  }, []);

  const tick = useCallback((now: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      if (!prev.timeline.playing) return prev;
      const last = lastTickRef.current ?? now;
      const dt = (now - last) / 1000;
      const nextTime = prev.timeline.currentTime + dt;
      let t = nextTime;
      let playing = prev.timeline.playing;
      if (t >= prev.timeline.duration) {
        if (prev.timeline.loop) {
          t = t % prev.timeline.duration;
        } else {
          t = prev.timeline.duration;
          playing = false;
        }
      }
      lastTickRef.current = now;
      skipPersistRef.current = true;
      return { ...prev, timeline: { ...prev.timeline, currentTime: t, playing } };
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, timeline: { ...prev.timeline, playing: true } };
    });
  }, []);

  const pause = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, timeline: { ...prev.timeline, playing: false } };
    });
  }, []);

  const togglePlay = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, timeline: { ...prev.timeline, playing: !prev.timeline.playing } };
    });
  }, []);

  useEffect(() => {
    if (!doc?.timeline.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [doc?.timeline.playing, tick]);

  const addKeyframe = useCallback((layerId: string, prop: AnimatableScalarProp, value: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const time = prev.timeline.currentTime;
      const existing = prev.animations.find((a) => a.layerId === layerId && a.property === prop);
      let animations = prev.animations.slice();
      if (!existing) {
        const anim: LayerPropertyAnimation = { id: genId(), layerId, property: prop, keyframes: [{ time, value }] };
        animations.push(anim);
      } else {
        const kfs = existing.keyframes.slice();
        const idx = kfs.findIndex((k) => Math.abs(k.time - time) < 1e-3);
        if (idx >= 0) {
          kfs[idx] = { ...kfs[idx], value };
        } else {
          kfs.push({ time, value });
          kfs.sort((a, b) => a.time - b.time);
        }
        animations = animations.map((a) => (a === existing ? { ...a, keyframes: kfs } : a));
      }
      pushHistory(prev);
      return { ...prev, animations };
    });
  }, [pushHistory]);

  const removeKeyframe = useCallback((layerId: string, prop: AnimatableScalarProp, time: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const animations = prev.animations.map((a) => {
        if (a.layerId !== layerId || a.property !== prop) return a;
        return { ...a, keyframes: a.keyframes.filter((k) => Math.abs(k.time - time) >= 1e-3) };
      });
      pushHistory(prev);
      return { ...prev, animations };
    });
  }, [pushHistory]);

  const value = useMemo<EditorContextValue>(() => ({
    doc,
    setDoc,
    addTextLayer,
    addImageLayer,
    addShapeLayer,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    deleteLayer,
    persist,
    undo,
    redo,
    play,
    pause,
    togglePlay,
    setTime,
    setDuration,
    addKeyframe,
    removeKeyframe,
  }), [doc, addTextLayer, addImageLayer, addShapeLayer, updateLayer, updateLayerTransient, selectLayer, deleteLayer, persist, undo, redo, play, pause, togglePlay, setTime, setDuration, addKeyframe, removeKeyframe]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
