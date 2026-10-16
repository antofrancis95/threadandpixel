"use client";

import { useEffect, useRef } from "react";

/**
 * The gold thread. One SVG path routed through every [data-thread-anchor] on
 * the page, drawn by scroll position so the stitch always sits just below the
 * reader's eye line. Under prefers-reduced-motion the whole thread is shown.
 */
export function ThreadLine() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ghostRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const ghost = ghostRef.current;
    const needle = needleRef.current;
    if (!svg || !path || !ghost || !needle) return;
    const root = svg.closest(".landing-root") as HTMLElement | null;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let total = 0;
    // Monotonic in y (anchors are sorted), so a binary search finds the stitch point.
    let samples: { len: number; x: number; y: number }[] = [];
    let raf = 0;
    let buildRaf = 0;

    function build() {
      if (!svg || !path || !ghost || !root) return;
      const rootRect = root.getBoundingClientRect();
      const anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-thread-anchor]"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - rootRect.left + r.width / 2, y: r.top - rootRect.top + r.height / 2 };
        })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .sort((a, b) => a.y - b.y);

      const width = root.clientWidth;
      const height = root.scrollHeight;
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      if (anchors.length < 2) {
        path.setAttribute("d", "");
        ghost.setAttribute("d", "");
        return;
      }

      // Start at the first anchor (the full stop of the headline), then S-curve between anchors.
      const first = anchors[0];
      let d = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;
      for (let i = 1; i < anchors.length; i++) {
        const a = anchors[i - 1];
        const b = anchors[i];
        const dy = b.y - a.y;
        const bend = Math.min(Math.abs(dy) * 0.55, 420);
        d += ` C${a.x.toFixed(1)},${(a.y + bend).toFixed(1)} ${b.x.toFixed(1)},${(b.y - bend).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      }
      path.setAttribute("d", d);
      ghost.setAttribute("d", d);

      total = path.getTotalLength();
      path.style.strokeDasharray = `${total}`;
      const n = 700;
      samples = [];
      for (let i = 0; i <= n; i++) {
        const len = (total * i) / n;
        const pt = path.getPointAtLength(len);
        samples.push({ len, x: pt.x, y: pt.y });
      }
      update();
    }

    function update() {
      if (!path || !needle) return;
      if (reduced) {
        path.style.strokeDashoffset = "0";
        needle.style.display = "none";
        return;
      }
      const target = window.scrollY + window.innerHeight * 0.62;
      let lo = 0;
      let hi = samples.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].y >= target) hi = mid;
        else lo = mid + 1;
      }
      const hit = samples.length && samples[lo].y >= target ? samples[lo] : null;
      const len = hit ? hit.len : total;
      path.style.strokeDashoffset = `${Math.max(0, total - len)}`;
      if (hit && len > 0 && len < total) {
        needle.setAttribute("cx", hit.x.toFixed(1));
        needle.setAttribute("cy", hit.y.toFixed(1));
        needle.style.display = "";
      } else {
        needle.style.display = "none";
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    }

    // Layout changes (fonts settling, media loading) arrive in bursts; rebuild once per frame.
    function scheduleBuild() {
      if (buildRaf) return;
      buildRaf = requestAnimationFrame(() => {
        buildRaf = 0;
        build();
      });
    }

    const ro = new ResizeObserver(scheduleBuild);
    ro.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleBuild);
    build();
    if (document.fonts?.ready) document.fonts.ready.then(scheduleBuild).catch(() => {});
    const t = setTimeout(scheduleBuild, 600);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleBuild);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(buildRaf);
      clearTimeout(t);
    };
  }, []);

  return (
    <svg ref={svgRef} className="lp-thread" aria-hidden="true" focusable="false">
      <path ref={ghostRef} className="lp-thread-ghost" />
      <path ref={pathRef} />
      <circle ref={needleRef} className="lp-thread-needle" r="3.2" />
    </svg>
  );
}
