"use client";

import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent, CSSProperties } from "react";
import { useEditor } from "./editor-context";
import type { AnyLayer, GroupLayer, LayerBase, ShapeLayer, LayerPropertyAnimation } from "@/lib/ca/types";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { doc, updateLayer, updateLayerTransient, selectLayer, addKeyframe } = useEditor();
  const [size, setSize] = useState({ w: 600, h: 400 });
  const draggingRef = useRef<{ id: string; startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scale, offsetX, offsetY } = useMemo(() => {
    const w = doc?.meta.width ?? 390;
    const h = doc?.meta.height ?? 844;
    const pad = 16;
    const maxW = size.w - pad * 2;
    const maxH = size.h - pad * 2;
    const s = Math.min(maxW / w, maxH / h);
    const ox = (size.w - w * s) / 2;
    const oy = (size.h - h * s) / 2;
    return { scale: s > 0 && Number.isFinite(s) ? s : 1, offsetX: ox, offsetY: oy };
  }, [size.w, size.h, doc?.meta.width, doc?.meta.height]);

  const layers = doc?.layers ?? [];

  
  const getAnimatedValue = (layerId: string, prop: string, base: number): number => {
    const animations: LayerPropertyAnimation[] = doc?.animations ?? [];
    const anim = animations.find((a: LayerPropertyAnimation) => a.layerId === layerId && (a.property as string) === (prop as any));
    if (!anim || anim.keyframes.length === 0 || !doc) return base;
    const t = doc.timeline.currentTime;
    const kfs = anim.keyframes;
    // before first
    if (t <= kfs[0].time) return kfs[0].value;
    // after last
    if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
  
    let i = 0;
    while (i + 1 < kfs.length && !(t >= kfs[i].time && t <= kfs[i + 1].time)) i++;
    const a = kfs[i];
    const b = kfs[i + 1];
    const u = (t - a.time) / Math.max(1e-6, b.time - a.time);
    return a.value + (b.value - a.value) * u; // linear only
  };

  const applyAnimated = (l: AnyLayer): AnyLayer => {
    const base = l as AnyLayer;
    const px = getAnimatedValue(base.id, 'position.x', base.position.x);
    const py = getAnimatedValue(base.id, 'position.y', base.position.y);
    const w = getAnimatedValue(base.id, 'size.w', base.size.w);
    const h = getAnimatedValue(base.id, 'size.h', base.size.h);
    const rot = getAnimatedValue(base.id, 'rotation', base.rotation ?? 0);
    const op = getAnimatedValue(base.id, 'opacity', base.opacity ?? 1);
    const common: LayerBase = {
      ...base,
      position: { x: px, y: py },
      size: { w, h },
      rotation: rot,
      opacity: op,
    } as any;
    if (base.type === 'group') {
      const g = base as GroupLayer;
      return { ...(common as any), type: 'group', children: g.children.map(applyAnimated) } as AnyLayer;
    }
    return { ...(common as any), type: base.type } as AnyLayer;
  };

  const animatedLayers = useMemo(() => layers.map(applyAnimated), [layers, doc?.timeline.currentTime, doc?.animations]);

  const startDrag = (l: AnyLayer, e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    // Record starting keyframe at current timeline time before moving
    addKeyframe(l.id, 'position.x' as any, l.position.x);
    addKeyframe(l.id, 'position.y' as any, l.position.y);
    draggingRef.current = {
      id: l.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: l.position.x,
      startY: l.position.y,
    };
   
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startClientX) / scale;
      const dy = (ev.clientY - d.startClientY) / scale;
      updateLayerTransient(d.id, { position: { x: d.startX + dx, y: d.startY + dy } as any });
    };
    const onUp = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (d) {
        const dx = (ev.clientX - d.startClientX) / scale;
        const dy = (ev.clientY - d.startClientY) / scale;
        // Record keyframes for position at the current timeline time (Blender-style)
        const nx = d.startX + dx;
        const ny = d.startY + dy;
        addKeyframe(d.id, 'position.x' as any, nx);
        addKeyframe(d.id, 'position.y' as any, ny);
      }
      draggingRef.current = null;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderLayer = (l: AnyLayer): ReactNode => {    const common: CSSProperties = {
      position: "absolute",
      left: l.position.x,
      top: l.position.y,
      width: l.size.w,
      height: l.size.h,
      transform: `rotate(${l.rotation ?? 0}deg)`,
      opacity: l.opacity ?? 1,
      display: l.visible === false ? "none" : undefined,
      cursor: "move",
    };

    if (l.type === "text") {
      return (
        <div
          key={l.id}
          style={{ ...common, color: l.color, fontSize: l.fontSize, textAlign: l.align ?? "left" }}
          onMouseDown={(e) => startDrag(l, e)}
        >
          {l.text}
        </div>
      );
    }
    if (l.type === "image") {
      return (
        <img
          key={l.id}
          src={l.src}
          alt={l.name}
          style={{ ...common, objectFit: (l as any).fit ?? ("cover" as any) }}
          draggable={false}
          onMouseDown={(e) => startDrag(l, e)}
        />
      );
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      const borderRadius = s.shape === "circle" ? 9999 : (s.shape === "rounded-rect" ? (s.radius ?? 8) : 0);
      return (
        <div key={l.id} style={{ ...common, background: s.fill, borderRadius }} onMouseDown={(e) => startDrag(l, e)} />
      );
    }
    // group
    const g = l as GroupLayer;
    return (
      <div key={g.id} style={{ ...common, background: g.backgroundColor }} onMouseDown={(e) => startDrag(g, e)}>
        {g.children.map((c) => renderLayer(c))}
      </div>
    );
  };

  return (
    <Card ref={ref} className="relative w-full h-full overflow-hidden p-0">
      <div
        className="absolute inset-0 dark:hidden"
        style={{ background: "repeating-conic-gradient(#f8fafc 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: "repeating-conic-gradient(#0b1220 0% 25%, #1f2937 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute"
        style={{
          width: doc?.meta.width,
          height: doc?.meta.height,
          background: doc?.meta.background ?? "#f3f4f6",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {animatedLayers.map((l) => renderLayer(l))}
      </div>
    </Card>
  );
}
