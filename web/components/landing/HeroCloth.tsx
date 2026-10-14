"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";

const ClothCanvas = dynamic(() => import("./ClothCanvas"), { ssr: false });

/** Static drape used before the 3D loads, on phones, and under prefers-reduced-motion. */
function StaticDrape() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lpDrapeBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F1E8" />
          <stop offset="1" stopColor="#EDE5D8" />
        </linearGradient>
        <linearGradient id="lpFold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#DCCFBB" stopOpacity="0" />
          <stop offset="0.5" stopColor="#D9CBB6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#DCCFBB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lpSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#lpDrapeBase)" />
      {[260, 470, 690, 900, 1110, 1310].map((x, i) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <path
            d={`M-${70 + i * 6},0 C-${20 + i * 10},300 ${40 + i * 8},520 -${10 + i * 4},900 L${90 + i * 6},900 C${110},560 ${30 + i * 6},300 ${60 + i * 8},0 Z`}
            fill="url(#lpFold)"
          />
          <path
            d={`M${10 + i * 3},0 C${30 + i * 6},300 ${70 + i * 4},540 ${26 + i * 3},900 L${40 + i * 3},900 C${86 + i * 4},540 ${46 + i * 6},300 ${24 + i * 3},0 Z`}
            fill="url(#lpSheen)"
          />
        </g>
      ))}
      <path d="M0,0 L1440,0 L1440,80 C1100,40 700,140 0,60 Z" fill="#F7F1E8" opacity="0.9" />
    </svg>
  );
}

export function HeroCloth({ host }: { host: RefObject<HTMLElement | null> }) {
  const [use3d, setUse3d] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const saveData = Boolean(nav.connection?.saveData);
    const hasWebGL = (() => {
      try {
        const c = document.createElement("canvas");
        return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!reduced && wide && !saveData && hasWebGL) {
      // Defer until the browser is idle so the headline paints first.
      const start = () => setUse3d(true);
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(
          start,
          { timeout: 1200 },
        );
      } else {
        setTimeout(start, 300);
      }
    }
  }, []);

  return (
    <div className="lp-hero-cloth">
      <StaticDrape />
      {use3d && <ClothCanvas host={host} />}
    </div>
  );
}
