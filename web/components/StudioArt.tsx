/**
 * Line art for the studio's empty states. Atelier objects rather than a figure,
 * so nothing on the board presumes who the garment is for. Styled by the
 * .lp-garment rules in globals.css (ink, ink-soft, gold, skin).
 */

/** A tailor's dress form on its stand. */
function FormBody({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* neck cap */}
      <ellipse className="skin" cx="100" cy="46" rx="11" ry="6" />
      <path className="ink-soft" d="M89,46 L89,60 M111,46 L111,60" />
      {/* torso: shoulders, waist, hip, rounded hem */}
      <path
        className="skin"
        stroke="var(--gold)"
        strokeWidth="1.2"
        d="M60,66 C76,60 124,60 140,66 C146,100 142,130 134,160 C126,180 132,210 138,232 C128,250 72,250 62,232 C68,210 74,180 66,160 C58,130 54,100 60,66 Z"
      />
      <path className="ink-soft" d="M100,66 L100,246" />
      <path className="ink-soft" d="M70,158 C85,164 115,164 130,158" />
      <path className="ink-soft" d="M72,118 C84,112 116,112 128,118" strokeDasharray="2 4" />
      {/* stand */}
      <path className="ink" d="M100,250 L100,292" />
      <path className="ink" d="M100,292 L70,310 M100,292 L130,310 M100,292 L100,312" />
      <ellipse className="ink-soft" cx="100" cy="310" rx="34" ry="4" />
    </g>
  );
}

export function DressForm() {
  return (
    <svg className="lp-garment" viewBox="0 0 200 320" role="img" aria-label="A tailor's dress form on its stand">
      <FormBody />
    </svg>
  );
}

/** A standing salon mirror with the dress form reflected in it. */
export function SalonMirror() {
  return (
    <svg className="lp-garment" viewBox="0 0 200 320" role="img" aria-label="A salon mirror">
      <rect className="skin" x="38" y="14" width="124" height="268" rx="62" stroke="var(--gold)" strokeWidth="1.2" />
      <rect x="48" y="24" width="104" height="248" rx="52" fill="#FFFFFF" stroke="var(--line)" strokeWidth="1" />
      <path d="M62,60 C70,40 90,30 110,30" stroke="rgba(255,255,255,0.9)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g opacity="0.55">
        <FormBody x={28} y={34} scale={0.72} />
      </g>
      <path className="ink" d="M78,282 L66,300 M122,282 L134,300" />
    </svg>
  );
}
