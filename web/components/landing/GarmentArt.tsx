/**
 * Hand-authored SVG garment art. These stand in for the repo's missing media:
 * the sketch and flats are legitimate illustrations; the render and on-model
 * figures are PLACEHOLDERS for a real Nano Banana render and a real
 * Virtual Try-On result. Replace by dropping files in web/public/landing/ and
 * swapping the components in GarmentStory.tsx and Showcase.tsx.
 */

const FRONT =
  "M72,40 Q100,52 128,40 L138,46 L162,200 L144,200 L128,96 L124,140 L160,300 Q100,312 40,300 L76,140 L72,96 L56,200 L38,200 L62,46 Z";
const BACK =
  "M70,34 Q100,42 130,34 L138,46 L162,200 L144,200 L128,96 L124,140 L160,300 Q100,312 40,300 L76,140 L72,96 L56,200 L38,200 L62,46 Z";
const PLEATS = ["M88,142 L74,298", "M94,142 L86,299", "M100,142 L100,300", "M106,142 L114,299", "M112,142 L126,298"];

export function SilkDefs() {
  return (
    <defs>
      <linearGradient id="lpSilk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2B3A5C" />
        <stop offset="0.35" stopColor="#1F2A44" />
        <stop offset="0.55" stopColor="#3A4C73" />
        <stop offset="0.75" stopColor="#1C2640" />
        <stop offset="1" stopColor="#111827" />
      </linearGradient>
    </defs>
  );
}

/** Loose pencil sketch of the dress (draws itself when its parent gets .is-active). */
export function GarmentSketch({ className = "" }: { className?: string }) {
  return (
    <svg className={`lp-garment ${className}`} viewBox="0 0 200 320" role="img" aria-label="Pencil sketch of a long-sleeved midi dress">
      <path className="sketch draw" d={FRONT} />
      <path className="ink-soft draw" d="M76,140 L124,140" />
      {PLEATS.map((d) => (
        <path key={d} className="ink-soft draw" d={d} />
      ))}
      <path className="ink-soft draw" d="M66,60 C70,120 60,160 54,196" opacity="0.5" />
      <path className="ink-soft draw" d="M134,60 C130,120 140,160 146,196" opacity="0.5" />
    </svg>
  );
}

/** Technical flat, front and back, with the measurement lines the studio adds. */
export function GarmentFlat({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <svg className="lp-garment" viewBox="0 0 200 320" role="img" aria-label="Technical flat of a jacket">
        <path className="ink" d="M64,40 L136,40 L150,52 L160,190 L146,190 L138,100 L140,230 L60,230 L62,100 L54,190 L40,190 L50,52 Z" />
        <path className="ink-soft" d="M100,44 L100,230" />
        <path className="ink-soft" d="M72,60 L128,60" />
      </svg>
    );
  }
  return (
    <svg className="lp-garment" viewBox="0 0 460 330" role="img" aria-label="Technical flats, front and back, with bust, waist, hip and length measurements">
      {/* Front */}
      <g transform="translate(20 0)">
        <path className="ink" d={FRONT} />
        <path className="ink-soft" d="M76,140 L124,140" />
        {PLEATS.map((d) => (
          <path key={d} className="ink-soft" d={d} />
        ))}
        {/* measurement lines */}
        <g className="gold">
          <path d="M72,96 L128,96" />
          <path d="M72,91 L72,101 M128,91 L128,101" />
          <path d="M76,140 L124,140" />
          <path d="M76,135 L76,145 M124,135 L124,145" />
          <path d="M60,190 L140,190" strokeDasharray="2 3" />
          <path d="M60,185 L60,195 M140,185 L140,195" />
          <path d="M176,40 L176,300" />
          <path d="M171,40 L181,40 M171,300 L181,300" />
        </g>
        <text className="gold-text" x="100" y="88" textAnchor="middle">
          bust 92 cm
        </text>
        <text className="gold-text" x="100" y="132" textAnchor="middle">
          waist 74 cm
        </text>
        <text className="gold-text" x="100" y="204" textAnchor="middle">
          hip 98 cm
        </text>
        <text className="gold-text" x="186" y="172" transform="rotate(90 186 172)" textAnchor="middle">
          length 112 cm
        </text>
        <text className="gold-text" x="100" y="320" textAnchor="middle" style={{ fill: "var(--muted)" }}>
          FRONT
        </text>
      </g>
      {/* Back */}
      <g transform="translate(240 0)">
        <path className="ink" d={BACK} />
        <path className="ink-soft" d="M76,140 L124,140" />
        <path className="ink-soft" d="M100,42 L100,138" strokeDasharray="3 3" />
        <path className="ink-soft" d="M88,142 L80,298 M112,142 L120,298" />
        <text className="gold-text" x="100" y="320" textAnchor="middle" style={{ fill: "var(--muted)" }}>
          BACK · invisible zip CB
        </text>
      </g>
    </svg>
  );
}

/** PLACEHOLDER: editorial render. Swap for a real Nano Banana render (web/public/landing/render.jpg). */
export function GarmentRender() {
  return (
    <svg className="lp-garment" viewBox="0 0 200 320" role="img" aria-label="Placeholder for the editorial render of the dress">
      <SilkDefs />
      <path className="silk" d={FRONT} />
      <path d="M90,142 C86,200 82,250 78,298" stroke="rgba(255,255,255,0.18)" fill="none" strokeWidth="3" />
      <path d="M110,142 C114,200 118,250 122,298" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="3" />
      <path d="M100,44 C100,100 100,200 100,300" stroke="rgba(255,255,255,0.08)" fill="none" strokeWidth="6" />
      <path d="M62,46 C70,120 62,180 50,196" stroke="rgba(255,255,255,0.14)" fill="none" strokeWidth="2.5" />
    </svg>
  );
}

/** PLACEHOLDER: virtual try-on. Swap for a real Vertex VTO result (web/public/landing/tryon.jpg). */
export function GarmentOnModel() {
  return (
    <svg className="lp-garment" viewBox="0 0 200 360" role="img" aria-label="Placeholder for the virtual try-on photo">
      <SilkDefs />
      {/* mannequin */}
      <g className="skin">
        <ellipse cx="100" cy="22" rx="15" ry="18" />
        <rect x="94" y="38" width="12" height="12" rx="4" />
        <path d="M78,50 Q100,44 122,50 L120,62 L80,62 Z" />
        <rect x="78" y="326" width="12" height="30" rx="5" />
        <rect x="110" y="326" width="12" height="30" rx="5" />
      </g>
      <g transform="translate(0 20) scale(1 1.02)">
        <path className="silk" d={FRONT} />
        <path d="M90,142 C86,200 82,250 78,298" stroke="rgba(255,255,255,0.18)" fill="none" strokeWidth="3" />
        <path d="M110,142 C114,200 118,250 122,298" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="3" />
      </g>
    </svg>
  );
}

/** The Speak stage: a voice waveform resolving into the first outline. */
export function VoiceToSilhouette() {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: "1.25rem", height: "100%", width: "100%", gridTemplateRows: "auto minmax(0, 1fr)" }}>
      <div className="lp-wave" aria-hidden="true" style={{ height: 40, gap: 4 }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <i key={i} style={{ animationDuration: `${1.1 + (i % 5) * 0.12}s` }} />
        ))}
      </div>
      <svg className="lp-garment" viewBox="0 0 200 320" role="img" aria-label="Faint first outline of the dress emerging" style={{ opacity: 0.55, height: "100%", minHeight: 0 }}>
        <path className="ink-soft draw" d={FRONT} strokeDasharray="4 6" />
      </svg>
    </div>
  );
}
