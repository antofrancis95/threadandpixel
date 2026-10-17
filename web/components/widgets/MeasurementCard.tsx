"use client";

import { useState } from "react";
import { CloseIcon, ScissorsIcon } from "@/components/icons";
import { SIZES, bodyPreset, type Measurements, type Size } from "@/lib/types";

export function MeasurementCard({
  initialSize = "M",
  initialMeasurements,
  gender,
  garmentType,
  onSubmit,
  onClose,
  busy = false,
}: {
  initialSize?: Size;
  initialMeasurements?: Measurements;
  gender?: string | null;
  garmentType?: string | null;
  onSubmit: (size: string, measurements?: Measurements) => void;
  onClose?: () => void;
  busy?: boolean;
}) {
  const [size, setSize] = useState<Size>(initialSize);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [measurements, setMeasurements] = useState<Measurements>(
    () => initialMeasurements ?? bodyPreset(initialSize, gender, garmentType),
  );

  const factor = unit === "in" ? 2.54 : 1;

  function updateField(key: keyof Measurements, val: string) {
    const num = Number(val);
    if (!val || isNaN(num)) {
      setMeasurements((m) => ({ ...m, [key]: undefined }));
    } else {
      setMeasurements((m) => ({ ...m, [key]: Math.round(num * factor) }));
    }
  }

  function getDisplay(key: keyof Measurements): string {
    const val = measurements[key];
    if (val === undefined) return "";
    return unit === "in" ? (val / 2.54).toFixed(1) : String(val);
  }

  // Each standard size carries its own tape, so switching size reloads the fields with that size's measurements.
  function chooseSize(s: Size) {
    setSize(s);
    setMeasurements(bodyPreset(s, gender, garmentType));
  }

  function handleConfirm() {
    const hasValues = Object.values(measurements).some((v) => v !== undefined);
    onSubmit(size, hasValues ? measurements : undefined);
  }

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <ScissorsIcon size={16} style={{ color: "var(--gold)" }} />
          <span>Bespoke Measurement &amp; Fit</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p className="inline-widget-lede">
        Select standard couture sizing or enter your bespoke measurements for pattern-making:
      </p>

      {/* Standard Size Selector */}
      <div className="size-selector">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={`size-pill ${size === s ? "active" : ""}`}
            onClick={() => chooseSize(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Custom Tape Mode Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0.8rem 0 0.4rem" }}>
        <button
          type="button"
          onClick={() => setCustomMode(!customMode)}
          style={{
            background: "none",
            border: "none",
            color: "var(--gold-dark)",
            fontSize: "var(--text-sm)",
            padding: 0,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {customMode ? "▲ Hide custom tape" : "▼ Add custom tape measurements"}
        </button>

        {customMode && (
          <div style={{ display: "flex", gap: "0.3rem", fontSize: "var(--text-xs)" }}>
            <button
              type="button"
              className={`size-pill ${unit === "cm" ? "active" : ""}`}
              style={{ padding: "0.2rem 0.5rem" }}
              onClick={() => setUnit("cm")}
            >
              cm
            </button>
            <button
              type="button"
              className={`size-pill ${unit === "in" ? "active" : ""}`}
              style={{ padding: "0.2rem 0.5rem" }}
              onClick={() => setUnit("in")}
            >
              in
            </button>
          </div>
        )}
      </div>

      {/* Custom Measurements Grid */}
      {customMode && (
        <div className="measurements-grid">
          <div className="measurement-field">
            <label>Bust ({unit})</label>
            <input
              type="number"
              placeholder={unit === "cm" ? "88" : "34.5"}
              value={getDisplay("bust_cm")}
              onChange={(e) => updateField("bust_cm", e.target.value)}
            />
          </div>
          <div className="measurement-field">
            <label>Waist ({unit})</label>
            <input
              type="number"
              placeholder={unit === "cm" ? "70" : "27.5"}
              value={getDisplay("waist_cm")}
              onChange={(e) => updateField("waist_cm", e.target.value)}
            />
          </div>
          <div className="measurement-field">
            <label>Hip ({unit})</label>
            <input
              type="number"
              placeholder={unit === "cm" ? "96" : "37.8"}
              value={getDisplay("hip_cm")}
              onChange={(e) => updateField("hip_cm", e.target.value)}
            />
          </div>
          <div className="measurement-field">
            <label>Height ({unit})</label>
            <input
              type="number"
              placeholder={unit === "cm" ? "172" : "67.7"}
              value={getDisplay("height_cm")}
              onChange={(e) => updateField("height_cm", e.target.value)}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="primary" onClick={handleConfirm} disabled={busy}>
          {busy ? "Calibrating flats & tech pack…" : `Apply Fit & Size ${size}`}
        </button>
      </div>
    </div>
  );
}

