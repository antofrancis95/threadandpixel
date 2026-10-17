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
/*
 * Siri-style wave, after the iOS 9 curve in the open-source siriwave: each colour is a
 * band of two to five sub-curves, each with its own width, drift, speed and direction,
 * fading in, living for a moment, fading out, and respawning once the band has died
 * down. That lifecycle is what keeps the wave from ever looking like a fixed sine.
 * Colours are the brand tokens (canvas cannot read CSS variables cheaply) and the
 * bands are multiplied onto the ivory instead of added onto black.
 */
type Range = [number, number];
const rand = (r: Range) => r[0] + Math.random() * (r[1] - r[0]);

class SiriBand {
  private spawnAt = 0;
  private count = 0;
  private prevMaxY = 0;
  private phases: number[] = [];
  private amplitudes: number[] = [];
  private finals: number[] = [];
  private timeouts: number[] = [];
  private offsets: number[] = [];
  private speeds: number[] = [];
  private widths: number[] = [];
  private verses: number[] = [];

  // siriwave spreads 50 units across ~640px; our canvas is 130 to 240px, so fewer units
  // keep each bump 20 to 60px wide instead of a needle.
  static readonly GRAPH_X = 12;
  static readonly UNIT = 12 / 25;
  // siriwave assumes a tall canvas; at 36 to 64px the averaged sub-curves need gain to fill it.
  static readonly AMPLITUDE_FACTOR = 3.8;
  // siriwave keeps 6px clear above and below the tallest wave.
  static readonly MARGIN = 6;
  static readonly DEAD_PX = 2;
  static readonly ATT = 4;
  static readonly DESPAWN = 0.025;
  static readonly STEP = 0.08;

  private spawn() {
    this.spawnAt = performance.now();
    this.count = Math.floor(rand([3, 6]));
    this.phases = [];
    this.amplitudes = [];
    this.finals = [];
    this.timeouts = [];
    this.offsets = [];
    this.speeds = [];
    this.widths = [];
    this.verses = [];
    for (let ci = 0; ci < this.count; ci++) {
      this.phases[ci] = 0;
      this.amplitudes[ci] = 0;
      this.timeouts[ci] = rand([900, 3200]);
      this.offsets[ci] = rand([-3, 3]);
      this.speeds[ci] = rand([0.5, 1]);
      this.finals[ci] = rand([0.55, 1]);
      this.widths[ci] = rand([1, 3]);
      this.verses[ci] = rand([-1, 1]);
    }
  }

  private static att(x: number) {
    return Math.pow(SiriBand.ATT / (SiriBand.ATT + x * x), SiriBand.ATT);
  }

  /** Softer than att(): the whole band tapers towards the ends instead of pinching to the middle. */
  private static envelope(x: number) {
    return Math.pow(SiriBand.ATT / (SiriBand.ATT + x * x), 1.6);
  }

  private yRel(i: number) {
    let y = 0;
    for (let ci = 0; ci < this.count; ci++) {
      let t = 4 * (-1 + (ci / Math.max(1, this.count - 1)) * 2);
      t += this.offsets[ci];
      t *= SiriBand.UNIT;
      const x = i / this.widths[ci] - t;
      y += Math.abs(this.amplitudes[ci] * Math.sin(this.verses[ci] * x - this.phases[ci]) * SiriBand.att(x));
    }
    // siriwave divides by the count, which keeps peaks at a quarter height; the root keeps
    // overlaps bounded while letting a single bump stand tall.
    return y / Math.sqrt(this.count);
  }

  /** Draws the band mirrored about mid. `amplitude` 0..1, `speed` per frame. */
  draw(ctx: CanvasRenderingContext2D, width: number, mid: number, amplitude: number, speed: number, rgb: string, alpha: number) {
    if (this.spawnAt === 0) this.spawn();
    const now = performance.now();
    for (let ci = 0; ci < this.count; ci++) {
      this.amplitudes[ci] += this.spawnAt + this.timeouts[ci] <= now ? -SiriBand.DESPAWN : SiriBand.DESPAWN;
      this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finals[ci]);
      this.phases[ci] = (this.phases[ci] + speed * this.speeds[ci]) % (Math.PI * 2);
    }
    let maxY = -Infinity;
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = -SiriBand.GRAPH_X; i <= SiriBand.GRAPH_X; i += SiriBand.STEP) {
        const x = width * ((i + SiriBand.GRAPH_X) / (SiriBand.GRAPH_X * 2));
        const room = mid - SiriBand.MARGIN;
        const raw = SiriBand.AMPLITUDE_FACTOR * room * amplitude * this.yRel(i) * SiriBand.envelope((i / SiriBand.GRAPH_X) * 2);
        // Soft knee instead of a hard clamp, so loud peaks round off rather than flatten.
        const y = room * Math.tanh(raw / room);
        ctx.lineTo(x, mid - sign * y);
        maxY = Math.max(maxY, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    if (maxY < SiriBand.DEAD_PX && this.prevMaxY > maxY) this.spawnAt = 0;
    this.prevMaxY = maxY;
  }
}

/* Four warm hues a few degrees apart so multiplied overlaps deepen into richer warm
   tones instead of grey. All sit between the brand's gold and rose. */
const BANDS = [
  { rgb: "214,178,112", alpha: 0.42 }, // honey
  { rgb: "212,146,104", alpha: 0.34 }, // apricot
  { rgb: "198,118,124", alpha: 0.26 }, // blush
  { rgb: "154,114,74", alpha: 0.24 }, // bronze
];
const INK = "26,24,23";
const GOLD = "197,168,128";
const ROSE = "168,88,88";
const MUTED = "168,158,148";

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
  shape?: "ring" | "line" | "bars" | "siri";
  size?: number;
  /** Bars and siri: the height in px (the landing page's bars use 40). */
  barHeight?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const barsRef = useRef<SVGGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ phase, tool, muted });
  live.current = { phase, tool, muted };

  const width = size;
  const height = shape === "ring" ? size : shape === "bars" || shape === "siri" ? barHeight : 28;

  // Bars: the landing page's lp-wave (2px bars, 3px gap), here driven by the real levels.
  const barCount = shape === "bars" ? Math.max(6, Math.floor((width + BAR_GAP) / (BAR_W + BAR_GAP))) : 0;

  useEffect(() => {
    if (shape === "bars" || shape === "siri") return;
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
    if (shape !== "siri") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    const mid = height / 2;
    const bands = BANDS.map(() => new SiriBand());
    let mic = 0;
    let out = 0;
    let amp = 0;
    let raf = 0;

    const thread = (rgb: string, alpha: number) => {
      const g = ctx.createLinearGradient(0, 0, width, 0);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(0.12, `rgba(${rgb},${alpha})`);
      g.addColorStop(0.88, `rgba(${rgb},${alpha})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, mid - 0.5, width, 1);
    };

    const render = (now: number) => {
      const { phase, tool, muted } = live.current;
      const t = now / 1000;
      const lv = levels.current;
      mic += (lv.mic - mic) * 0.3;
      out += (lv.out - out) * 0.3;

      // How much of the height the bands may fill, and how fast they travel per frame.
      let target = 0.3;
      let speed = 0.08;
      let threadRgb = GOLD;
      let threadAlpha = 0.55;
      let tint: string | null = null;
      if (phase === "idle") {
        target = 0.3 + 0.1 * Math.sin(t * 0.7);
        speed = 0.045;
      } else if (phase === "connecting") {
        target = 0.38;
        speed = 0.1;
      } else if (phase === "listening") {
        target = muted ? 0.08 : 0.32 + Math.min(0.68, mic * 1.15);
        speed = muted ? 0.03 : 0.075 + mic * 0.07;
        threadRgb = muted ? MUTED : INK;
        threadAlpha = muted ? 0.5 : 0.8;
      } else if (phase === "thinking") {
        target = 0.5;
        speed = 0.14;
      } else if (phase === "speaking") {
        target = 0.4 + Math.min(0.6, out * 1.1);
        speed = 0.1 + out * 0.08;
        threadAlpha = 0.85;
      } else {
        target = 0.12;
        speed = 0.03;
        threadRgb = ROSE;
        tint = ROSE;
      }
      if (tool && phase !== "speaking") {
        // The status line names the tool; the wave just works harder. A single tint
        // multiplied four times goes muddy, so the hues stay.
        target = Math.max(target, 0.45);
        speed = Math.max(speed, 0.12);
      }
      amp += (target - amp) * 0.12;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      // Multiply so overlapping bands deepen on the ivory the way they glow on Siri's black.
      ctx.globalCompositeOperation = "multiply";
      bands.forEach((band, k) => band.draw(ctx, width, mid, amp, speed, tint ?? BANDS[k].rgb, tint ? BANDS[k].alpha * 0.6 : BANDS[k].alpha));
      ctx.restore();
      thread(threadRgb, threadAlpha);
    };

    if (reduced) {
      amp = 0.35;
      render(0);
      return;
    }
    const loop = (now: number) => {
      render(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levels, shape, width, height]);

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

  if (shape === "siri") {
    return (
      <canvas
        ref={canvasRef}
        className="voice-thread voice-thread-siri"
        data-phase={phase}
        data-tool={tool ?? undefined}
        data-muted={muted || undefined}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

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
