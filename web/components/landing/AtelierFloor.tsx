"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

/**
 * Cut-plan illustration. Pattern pieces for the example dress laid on a
 * fabric strip two ways: one order cut on its own (as the quote allows for
 * today), and pieces nested across orders (the direction for the floor).
 * Positions are illustrative; the yardage figures come from the pricing engine.
 */
type Piece = { id: string; label: string; w: number; h: number; loose: [number, number]; nested: [number, number] };

const PIECES: Piece[] = [
  { id: "bf", label: "BODICE F", w: 70, h: 56, loose: [40, 56], nested: [36, 50] },
  { id: "bb", label: "BODICE B", w: 70, h: 56, loose: [130, 60], nested: [36, 110] },
  { id: "sl", label: "SLEEVE", w: 46, h: 100, loose: [226, 52], nested: [112, 50] },
  { id: "sr", label: "SLEEVE", w: 46, h: 100, loose: [292, 60], nested: [162, 50] },
  { id: "sf", label: "SKIRT F", w: 120, h: 92, loose: [360, 54], nested: [214, 50] },
  { id: "sb", label: "SKIRT B", w: 120, h: 92, loose: [40, 136], nested: [214, 146] },
  { id: "fc", label: "FACING", w: 60, h: 24, loose: [184, 176], nested: [112, 158] },
  { id: "cf", label: "CUFF ×2", w: 60, h: 24, loose: [266, 182], nested: [112, 188] },
];

const FABRIC = { x: 20, y: 40, w: 560, h: 180 };
const USED = { loose: 500, nested: 340 };

export function AtelierFloor() {
  const [mode, setMode] = useState<"loose" | "nested">("loose");
  const seen = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // First time the plan scrolls into view, play loose → nested once.
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          t = setTimeout(() => setMode("nested"), reduced ? 0 : 1400);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (t) clearTimeout(t);
    };
  }, []);

  const used = USED[mode];
  const wasteX = FABRIC.x + used;
  const wasteW = FABRIC.w - used;

  return (
    <section className="lp-section lp-floor" id="atelier-floor" aria-labelledby="floor-title">
      <div className="lp-wrap">
        <Reveal>
          <p className="lp-kicker">
            <span className="lp-anchor" data-thread-anchor />
            For the atelier floor
          </p>
          <h2 className="lp-title" id="floor-title">
            Less cloth on the floor. <em>Fuller</em> hours on the machines.
          </h2>
          <p className="lp-lede">
            Every commission arrives with its yardage, cutting allowance and labour hours computed rather than
            guessed. The next step on the floor is to nest pieces across orders and schedule cutters and machines
            around them.
          </p>
        </Reveal>

        <div className="lp-floor-grid">
          <Reveal className="lp-floor-card" delay={1}>
            <div className="lp-floor-card-head">
              <div>
                <h3>Fabric optimisation</h3>
                <p>Pattern pieces for one lined silk charmeuse midi dress, size M, laid on a 60-inch strip.</p>
              </div>
              <span className="lp-tag">In development</span>
            </div>

            <div className="lp-toggle" role="group" aria-label="Cut plan view">
              <button type="button" aria-pressed={mode === "loose"} onClick={() => setMode("loose")}>
                Single order
              </button>
              <button type="button" aria-pressed={mode === "nested"} onClick={() => setMode("nested")}>
                Nested
              </button>
            </div>

            <svg
              ref={svgRef}
              className="lp-cutplan"
              viewBox="0 0 600 250"
              role="img"
              aria-label={
                mode === "loose"
                  ? "Cut plan with pieces laid loosely, leaving a wide strip of waste at the end of the fabric"
                  : "Cut plan with pieces nested tightly, leaving a narrow strip of waste"
              }
              style={{ marginTop: "1rem" }}
            >
              <defs>
                <pattern id="lpHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="8" height="8" fill="rgba(168,88,88,0.08)" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(168,88,88,0.6)" strokeWidth="1.2" />
                </pattern>
              </defs>
              <rect className="fabric" x={FABRIC.x} y={FABRIC.y} width={FABRIC.w} height={FABRIC.h} rx="3" />
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={i}
                  className="grain"
                  x1={FABRIC.x}
                  y1={FABRIC.y + 14 + i * 13}
                  x2={FABRIC.x + FABRIC.w}
                  y2={FABRIC.y + 14 + i * 13}
                />
              ))}
              <rect className="waste" x={wasteX} y={FABRIC.y} width={wasteW} height={FABRIC.h} />
              <line className="cutline" x1={wasteX} y1={FABRIC.y - 8} x2={wasteX} y2={FABRIC.y + FABRIC.h + 8} />
              {PIECES.map((p) => {
                const [x, y] = p[mode];
                return (
                  <g key={p.id} className="piece" style={{ transform: `translate(${x}px, ${y}px)` }}>
                    <rect width={p.w} height={p.h} rx="2" />
                    <text x={p.w / 2} y={p.h / 2 + 2.5} textAnchor="middle">
                      {p.label}
                    </text>
                  </g>
                );
              })}
              <text className="label" x={FABRIC.x} y="26">
                SELVEDGE · 60 IN
              </text>
              <text className="label gold" x={FABRIC.x + FABRIC.w} y="26" textAnchor="end">
                {mode === "loose" ? "CUT · ONE ORDER" : "CUT · NESTED ACROSS ORDERS"}
              </text>
              <text className="label" x={wasteX + wasteW / 2} y={FABRIC.y + FABRIC.h + 22} textAnchor="middle">
                OFFCUT
              </text>
            </svg>

            <div className="lp-floor-stats" aria-label="Figures from the quote">
              <div>
                Yardage quoted
                <b>
                  4.14 <em>yd</em>
                </b>
              </div>
              <div>
                Cutting allowance
                <b>
                  0.54 <em>yd</em>
                </b>
              </div>
              <div>
                Lining
                <b>
                  2.88 <em>yd</em>
                </b>
              </div>
            </div>
            <p style={{ marginTop: "1rem", fontSize: "0.72rem" }}>
              Figures are the pricing engine&rsquo;s output for this spec. The nested layout shows the target, not a
              measured result.
            </p>
          </Reveal>

          <Reveal className="lp-floor-card" delay={2}>
            <div className="lp-floor-card-head">
              <div>
                <h3>Labour and machine scheduling</h3>
                <p>Labour hours from each quote, laid across the stations of a small workshop.</p>
              </div>
              <span className="lp-tag">In development</span>
            </div>
            <div className="lp-lanes" aria-hidden="true">
              {[
                { name: "Cutting", bars: [{ l: 0, w: 14, gold: true }, { l: 16, w: 10 }] },
                { name: "Sewing", bars: [{ l: 14, w: 50, gold: true }, { l: 66, w: 28 }] },
                { name: "Lining", bars: [{ l: 40, w: 14, gold: true }] },
                { name: "Finishing", bars: [{ l: 64, w: 22, gold: true }, { l: 88, w: 10 }] },
              ].map((lane) => (
                <div className="lp-lane" key={lane.name}>
                  <span>{lane.name}</span>
                  <span className="lp-lane-track">
                    {lane.bars.map((b, i) => (
                      <span
                        key={i}
                        className={`lp-lane-bar ${b.gold ? "gold" : ""}`}
                        style={{ left: `${b.l}%`, width: `${b.w}%`, transitionDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="lp-lane-scale" aria-hidden="true">
              <span>0 h</span>
              <span>3.5 h</span>
              <span>7.0 h</span>
            </div>
            <div className="lp-floor-stats">
              <div>
                Labour quoted
                <b>
                  7.0 <em>h</em>
                </b>
              </div>
              <div>
                Complexity
                <b>Medium</b>
              </div>
            </div>
            <p style={{ marginTop: "1rem", fontSize: "0.72rem" }}>
              Gold is this commission. The second order shown is illustrative. Scheduling is on the roadmap and not
              yet part of the quote.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
