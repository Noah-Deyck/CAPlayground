"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Pause, Play } from "lucide-react";
import { useEditor } from "./editor-context";
import type { AnyLayer } from "@/lib/ca/types";
import { useEffect, useState } from "react";

function useSelectedLayer(doc: { layers: AnyLayer[]; selectedId?: string | null }) {
  const findById = (layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if (l.type === "group") {
        // @ts-ignore children exists on group
        const found = findById((l as any).children, id);
        if (found) return found;
      }
    }
    return undefined;
  };
  return findById(doc.layers, doc.selectedId ?? null);
}

export function Timeline() {
  const { doc, setDoc, togglePlay, setTime, setDuration, addKeyframe } = useEditor();
  // Derive timeline values with safe fallbacks so hooks are always called
  const t = doc?.timeline.currentTime ?? 0;
  const dur = doc?.timeline.duration ?? 5;
  const playing = doc?.timeline.playing ?? false;
  const loop = doc?.timeline.loop ?? true;
  const selected = doc ? useSelectedLayer(doc) : undefined;

  // Local dragging state to avoid tight render loops from controlled Slider updates
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number>(t);
  // keep dragValue in sync when not dragging
  useEffect(() => {
    if (!isDragging) setDragValue(t);
  }, [t, isDragging]);

  const setLoop = (v: boolean) => {
    setDoc((prev) => (prev ? { ...prev, timeline: { ...prev.timeline, loop: v } } : prev));
  };

  const timeLabel = `${(isDragging ? dragValue : t).toFixed(2)}s / ${dur.toFixed(2)}s`;

  const addKF = (prop: "position.x" | "position.y" | "size.w" | "size.h" | "rotation" | "opacity") => {
    if (!selected) return;
    let value = 0;
    if (prop === "position.x") value = selected.position.x;
    else if (prop === "position.y") value = selected.position.y;
    else if (prop === "size.w") value = selected.size.w;
    else if (prop === "size.h") value = selected.size.h;
    else if (prop === "rotation") value = (selected.rotation ?? 0) as number;
    else if (prop === "opacity") value = (selected.opacity ?? 1) as number;
    addKeyframe(selected.id, prop, Number(value));
  };

  if (!doc) return null;

  return (
    <Card className="mt-3 p-3">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => togglePlay()} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <Slider
            min={0}
            max={Math.max(0.1, dur)}
            step={0.01}
            value={[Math.min(dur, Math.max(0, isDragging ? dragValue : t))]}
            onPointerDown={() => setIsDragging(true)}
            onValueChange={(v) => {
              const nv = Math.min(dur, Math.max(0, v[0] ?? 0));
              setDragValue(nv);
            }}
            onValueCommit={(v) => {
              const nv = Math.min(dur, Math.max(0, v[0] ?? 0));
              setIsDragging(false);
              setTime(nv, false);
            }}
          />
          <div className="w-28 text-right text-sm text-muted-foreground select-none">{timeLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="duration" className="text-sm">Dur</Label>
          <Input
            id="duration"
            className="h-8 w-20"
            type="number"
            step={0.1}
            value={dur}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setDuration(v);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="text-sm text-muted-foreground mr-2">Keyframe:</div>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("position.x")}>X</Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("position.y")}>Y</Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("size.w")}>W</Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("size.h")}>H</Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("rotation")}>Rot</Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => addKF("opacity")}>Opacity</Button>
        {!selected && <div className="text-xs text-muted-foreground">Select a layer to add keyframes</div>}
      </div>
    </Card>
  );
}
