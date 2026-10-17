"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { VoiceLevels, VoicePhase, VoiceTool } from "@/components/LiveVoice";

/**
 * The thread. One gold line, the same stitch that runs down the landing page,
 * wrapped around the mic (ring) or laid across the dock (line). It breathes
 * while idle, ripples with the client's voice, runs a stitch while the
 * Couturier thinks or the atelier works, and flows with the Couturier's voice.
 *
 * Colour and dash pattern come from CSS via data-* attributes; only the path
 * geometry is computed here, written straight to the DOM so nothing re-renders
 * per frame. Under prefers-reduced-motion the line is drawn once and left still.
 */
// The landing page's lp-wave: 2px bars, 4px apart, breathing in staggered 1.1 to 1.6s cycles.
const BAR_W = 2;
const BAR_GAP = 4;
const barDuration = (i: number) => 1.1 + (i % 5) * 0.12;
const barDelay = (i: number) => ((i + 1) % 5 === 0 ? 0.45 : (i + 1) % 3 === 0 ? 0.3 : (i + 1) % 2 === 0 ? 0.15 : 0);

export function VoiceThread({
  phase,
  tool,
  muted,
  levels,
  shape = "ring",
  size = 180,
  barHeight = 32,
}: {
  phase: VoicePhase;
  tool: VoiceTool | null;
  muted: boolean;
  levels: MutableRefObject<VoiceLevels>;
  shape?: "ring" | "line" | "bars";
  size?: number;
  /** Bars only: the tallest bar, in px (the landing page uses 40). */
  barHeight?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const barsRef = useRef<SVGGElement>(null);
  const live = useRef({ phase, tool, muted });
  live.current = { phase, tool, muted };

  const width = size;
  const height = shape === "ring" ? size : shape === "bars" ? barHeight : 28;

  // Bars: the landing page's lp-wave (2px bars, 3px gap), here driven by the real levels.
  const barCount = shape === "bars" ? Math.max(6, Math.floor((width + BAR_GAP) / (BAR_W + BAR_GAP))) : 0;

  useEffect(() => {
    if (shape === "bars") return;
    const path = pathRef.current;
    if (!path) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let ph = 0;
    let dash = 0;
    let mic = 0;
    let out = 0;
    let amp = 0;

    const render = (now: number) => {
      const { phase, tool, muted } = live.current;
      const t = now / 1000;
      const lv = levels.current;
      mic += (lv.mic - mic) * 0.3;
      out += (lv.out - out) * 0.3;

      // Target amplitude and travel speed per state.
      let target = 0;
      let speed = 0;
      let freq = 3;
      if (phase === "idle") {
        target = 1.4 + 0.9 * Math.sin(t * 1.1);
        speed = 0.5;
      } else if (phase === "connecting") {
        target = 1.6;
        speed = 1.8;
        freq = 4;
      } else if (phase === "listening") {
        target = muted ? 0.5 : 1.6 + mic * 9;
        speed = muted ? 0.3 : 3 + mic * 3;
        freq = 7;
      } else if (phase === "thinking") {
        target = 2.4;
        speed = 2.6;
        freq = 4;
      } else if (phase === "speaking") {
        target = 2 + out * 10;
        speed = 4.5 + out * 4;
        freq = 9;
      }
      if (tool && phase !== "speaking") {
        target = Math.max(target, 2.2);
        freq = 5;
      }
      amp += (target - amp) * 0.18;
      ph += speed * 0.016;
      dash -= phase === "thinking" || tool ? 0.9 : 0;

      const pts: string[] = [];
      if (shape === "ring") {
        const c = size / 2;
        const r0 = c - 16;
        const n = 120;
        for (let i = 0; i <= n; i++) {
          const th = (i / n) * Math.PI * 2;
          const r =
            r0 +
            amp * (0.7 * Math.sin(th * freq + ph) + 0.3 * Math.sin(th * (freq * 2 + 1) - ph * 1.3));
          pts.push(`${(c + r * Math.cos(th)).toFixed(1)},${(c + r * Math.sin(th)).toFixed(1)}`);
        }
        path.setAttribute("d", `M${pts.join("L")}Z`);
      } else {
        const n = 72;
        const mid = height / 2;
        for (let i = 0; i <= n; i++) {
          const x = (i / n) * width;
          const env = Math.sin((i / n) * Math.PI);
          const y =
            mid +
            amp * 0.75 * env * (0.7 * Math.sin((i / n) * freq * Math.PI * 2 + ph) + 0.3 * Math.sin((i / n) * (freq * 2 + 1) * Math.PI * 2 - ph * 1.3));
          pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        path.setAttribute("d", `M${pts.join("L")}`);
      }
      path.style.strokeDashoffset = `${dash.toFixed(1)}`;
    };

    if (reduced) {
      amp = 1.2;
      render(0);
      return;
    }
    const loop = (now: number) => {
      render(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levels, shape, size, width, height]);

  useEffect(() => {
    if (shape !== "bars") return;
    const group = barsRef.current;
    if (!group) return;
    const rects = Array.from(group.querySelectorAll("rect"));
    const n = rects.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Static envelope: taller towards the middle, like a held note.
    const envelope = rects.map((_, i) => 0.55 + 0.45 * Math.sin((i / Math.max(1, n - 1)) * Math.PI));
    const heights = new Array(n).fill(0.25);
    let raf = 0;
    let mic = 0;
    let out = 0;

    const render = (now: number) => {
      const { phase, tool, muted } = live.current;
      const t = now / 1000;
      const lv = levels.current;
      mic += (lv.mic - mic) * 0.35;
      out += (lv.out - out) * 0.35;
      for (let i = 0; i < n; i++) {
        let target = 0.25;
        let alpha: number | null = null;
        if (phase === "idle") {
          // lpWave: 25% → 100% and back, opacity 0.6 → 1, each bar on its own clock.
          const k = 0.5 - 0.5 * Math.cos(((t - barDelay(i)) / barDuration(i)) * Math.PI * 2);
          target = 0.25 + 0.75 * k;
          alpha = 0.6 + 0.4 * k;
        } else if (phase === "connecting" || (tool && phase !== "speaking")) {
          target = 0.18 + 0.55 * Math.max(0, Math.sin(t * 3.2 - i * 0.42)) ** 2;
        } else if (phase === "listening") {
          target = muted ? 0.14 : 0.16 + mic * envelope[i] * (0.55 + 0.45 * Math.sin(t * 7 + i * 1.3)) * 0.95;
        } else if (phase === "thinking") {
          target = 0.18 + 0.45 * Math.max(0, Math.sin(t * 2.6 - i * 0.35)) ** 2;
        } else if (phase === "speaking") {
          target = 0.18 + out * envelope[i] * (0.55 + 0.45 * Math.sin(t * 8.5 - i * 1.1)) * 0.95;
        } else {
          target = 0.14;
        }
        heights[i] += (target - heights[i]) * (reduced ? 1 : 0.3);
        const h = Math.max(2, heights[i] * height);
        rects[i].setAttribute("height", h.toFixed(1));
        rects[i].setAttribute("y", ((height - h) / 2).toFixed(1));
        rects[i].style.opacity = alpha === null ? "" : alpha.toFixed(2);
      }
    };

    if (reduced) {
      // Still, at the landing page's resting height.
      for (const r of rects) {
        r.setAttribute("height", (height * 0.55).toFixed(1));
        r.setAttribute("y", (height * 0.225).toFixed(1));
      }
      return;
    }
    const loop = (now: number) => {
      render(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levels, shape, height, barCount]);

  return (
    <svg
      className={`voice-thread voice-thread-${shape}`}
      data-phase={phase}
      data-tool={tool ?? undefined}
      data-muted={muted || undefined}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      {shape === "ring" && <circle className="voice-thread-ghost" cx={size / 2} cy={size / 2} r={size / 2 - 16} />}
      {shape === "line" && <line className="voice-thread-ghost" x1="0" y1={height / 2} x2={width} y2={height / 2} />}
      {shape === "bars" ? (
        <g ref={barsRef} className="voice-thread-bars-group">
          {Array.from({ length: barCount }).map((_, i) => (
            <rect key={i} className="voice-thread-bar" x={i * (BAR_W + BAR_GAP)} y={height / 2 - 3} width={BAR_W} height={6} rx={BAR_W / 2} />
          ))}
        </g>
      ) : (
        <path ref={pathRef} className="voice-thread-path" />
      )}
    </svg>
  );
}
