"use client";

import { ImageIcon, MenswearIcon, PartyIcon, SparkleIcon, WomenswearIcon } from "@/components/icons";
import type { Spec } from "@/lib/types";

export const SPEC_KEYS = ["color_hex", "gender", "size", "fit", "garment_type", "length", "sleeve", "fabric_id", "lining", "embellishments"] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

/** Which fields differ between two specs, so the ribbon can show what a request changed. */
export function diffSpec(a: Spec | null | undefined, b: Spec): Set<SpecKey> {
  const changed = new Set<SpecKey>();
  if (!a) return changed;
  for (const k of SPEC_KEYS) {
    const va = a[k];
    const vb = b[k];
    const same = Array.isArray(va) && Array.isArray(vb) ? va.join("|") === vb.join("|") : va === vb;
    if (!same) changed.add(k);
  }
  return changed;
}

/** The garment's specification as chips; chips whose value just changed flash gold. */
export function SpecRibbon({
  spec,
  occasion,
  referenced,
  changed,
}: {
  spec: Spec;
  occasion?: string | null;
  referenced?: boolean;
  changed: Set<SpecKey>;
}) {
  const cls = (k: SpecKey, extra = "") => `spec-chip ${changed.has(k) ? "changed" : ""} ${extra}`.trim();
  return (
    <div className="spec-ribbon" aria-label="Garment specification">
      <span className={cls("color_hex")}>
        <span className="swatch-circle" style={{ background: spec.color_hex }} />
        {spec.color_hex}
      </span>
      {occasion && (
        <span className="spec-chip accent">
          <PartyIcon size={11} /> {occasion}
        </span>
      )}
      {referenced && (
        <span className="spec-chip accent">
          <ImageIcon size={11} /> Reference-inspired
        </span>
      )}
      {spec.gender && (
        <span className={cls("gender", "accent")}>
          {spec.gender === "menswear" ? <MenswearIcon size={12} /> : <WomenswearIcon size={12} />}
          <span>{spec.gender === "menswear" ? "Menswear" : spec.gender === "womenswear" ? "Womenswear" : "Unisex"}</span>
        </span>
      )}
      {spec.size && <span className={cls("size", "accent strong")}>Size {spec.size}</span>}
      {spec.fit && <span className={cls("fit")}>{spec.fit}</span>}
      <span className={cls("garment_type")}>{spec.garment_type}</span>
      <span className={cls("length")}>{spec.length}</span>
      <span className={cls("sleeve")}>{spec.sleeve.replace("_", " ")} sleeve</span>
      <span className={cls("fabric_id")}>fabric: {spec.fabric_id}</span>
      {spec.lining && <span className={cls("lining")}>silk lining</span>}
      {spec.embellishments.map((e) => (
        <span key={e} className={cls("embellishments")}>
          <SparkleIcon size={10} style={{ color: "var(--gold)" }} /> {e}
        </span>
      ))}
    </div>
  );
}
