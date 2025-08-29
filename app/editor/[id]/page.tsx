"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorProvider } from "@/components/editor/editor-context";
import { MenuBar } from "@/components/editor/menu-bar";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Inspector } from "@/components/editor/inspector";
import { CanvasPreview } from "@/components/editor/canvas-preview";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;
  const [meta, setMeta] = useState<{ id: string; name: string; width: number; height: number; background?: string } | null>(null);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(340);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    try {
      const listRaw = localStorage.getItem("caplayground-projects");
      const list = listRaw ? JSON.parse(listRaw) as Array<{ id: string; name: string; width?: number; height?: number }> : [];
      const p = list.find((x) => x.id === projectId);
      if (!p) {
        router.replace("/projects");
        return;
      }
      setMeta({ id: p.id, name: p.name, width: p.width ?? 390, height: p.height ?? 844 });
    } catch {
      router.replace("/projects");
    }
  }, [projectId]);

  if (!projectId || !meta) return null;

  return (
    <EditorProvider projectId={projectId} initialMeta={meta}>
      <div className="flex flex-col h-[calc(100vh)]" ref={containerRef}>
        <MenuBar
          projectId={projectId}
          showLeft={showLeft}
          showRight={showRight}
          toggleLeft={() => setShowLeft((v) => !v)}
          toggleRight={() => setShowRight((v) => !v)}
        />
        <div className="flex-1 px-4 py-4 overflow-hidden">
          <div className="h-full w-full flex gap-0">
            {showLeft && (
              <>
                <div className="min-h-0 flex-shrink-0" style={{ width: leftWidth }}>
                  <LayersPanel />
                </div>
                <div
                  className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const start = leftWidth;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const next = Math.max(240, Math.min(560, start + dx));
                      setLeftWidth(next);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  aria-label="Resize left column"
                />
              </>
            )}

            <div className="min-h-0 flex-1">
              <CanvasPreview />
            </div>

            {showRight && (
              <>
                <div
                  className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const start = rightWidth;
                    const onMove = (ev: MouseEvent) => {
                      const dx = startX - ev.clientX;
                      const next = Math.max(260, Math.min(560, start + dx));
                      setRightWidth(next);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  aria-label="Resize right column"
                />

                <div className="min-h-0 flex-shrink-0" style={{ width: rightWidth }}>
                  <Inspector />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
