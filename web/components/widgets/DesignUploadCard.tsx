"use client";

import { useState } from "react";
import { CameraIcon, CloseIcon, ImageIcon, MannequinIcon, SparkleIcon } from "@/components/icons";
import { SIZES } from "@/lib/types";

export function DesignUploadCard({
  onSubmit,
  onClose,
  busy = false,
}: {
  onSubmit: (file: File, notes?: string, gender?: string, size?: string) => void;
  onClose?: () => void;
  busy?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [gender, setGender] = useState<"womenswear" | "menswear" | "unisex">("womenswear");
  const [selectedSize, setSelectedSize] = useState<string>("M");

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  function handleConfirm() {
    if (!file || busy) return;
    onSubmit(file, notes.trim() || undefined, gender, selectedSize);
  }

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <ImageIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Upload Design Inspiration</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close" disabled={busy}>
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.85rem", lineHeight: 1.45 }}>
        Upload a sketch, garment reference photo, or design concept. The Master Couturier will analyze its silhouette and lines, curate certified atelier fabrics, and sculpt your outfit based on it:
      </p>

      {/* Image Dropzone */}
      <div className="dropzone-atelier" style={{ marginBottom: "0.9rem" }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          disabled={busy}
          aria-label="Upload design reference image"
        />
        {previewUrl ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.9rem" }}>
            <img
              src={previewUrl}
              alt="Design reference preview"
              style={{ width: "65px", height: "85px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--gold)" }}
            />
            <div style={{ textAlign: "left" }}>
              <strong style={{ fontSize: "0.86rem", display: "block", color: "var(--ink)" }}>{file?.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--gold-dark)" }}>✦ Design image loaded · Tap to replace</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="dropzone-icon">
              <CameraIcon size={32} style={{ color: "var(--gold)" }} />
            </div>
            <strong style={{ fontSize: "0.88rem", display: "block", color: "var(--ink)" }}>
              Upload your design sketch or photo
            </strong>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              JPEG, PNG or WebP · Hand sketches, runway concepts, or fashion photos
            </span>
          </div>
        )}
      </div>

      {/* Target Tailoring Silhouette */}
      <div style={{ marginBottom: "0.85rem" }}>
        <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
          Tailoring Silhouette
        </label>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`chip-btn ${gender === "womenswear" ? "highlight" : ""}`}
            onClick={() => setGender("womenswear")}
            disabled={busy}
            style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
          >
            <SparkleIcon size={12} />
            <span>Lady · Womenswear</span>
          </button>
          <button
            type="button"
            className={`chip-btn ${gender === "menswear" ? "highlight" : ""}`}
            onClick={() => setGender("menswear")}
            disabled={busy}
            style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
          >
            <MannequinIcon size={12} />
            <span>Gentleman · Menswear</span>
          </button>
          <button
            type="button"
            className={`chip-btn ${gender === "unisex" ? "highlight" : ""}`}
            onClick={() => setGender("unisex")}
            disabled={busy}
            style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
          >
            <span>Unisex / Architectural</span>
          </button>
        </div>
      </div>

      {/* Size Selection */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Proportion Size (Flats &amp; Measurements)
          </label>
          <span style={{ fontSize: "0.75rem", color: "var(--gold-dark)", fontWeight: 500 }}>
            Includes 2D technical specs
          </span>
        </div>
        <div className="size-selector">
          {SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              className={`size-pill ${selectedSize === sz ? "active" : ""}`}
              onClick={() => setSelectedSize(sz)}
              disabled={busy}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Design Notes */}
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="design-notes-input" style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
          Bespoke Customization Notes (Optional)
        </label>
        <textarea
          id="design-notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Recreate this neckline and drape, but craft in midnight navy silk with satin lapels..."
          rows={2}
          maxLength={1000}
          disabled={busy}
          style={{
            width: "100%",
            padding: "0.55rem 0.75rem",
            fontSize: "0.84rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--ivory)",
            color: "var(--ink)",
            resize: "none",
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />
      </div>

      {/* Submit Action */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
        {onClose && (
          <button type="button" onClick={onClose} disabled={busy} style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="primary"
          onClick={handleConfirm}
          disabled={!file || busy}
          style={{ fontSize: "0.84rem", padding: "0.5rem 1.1rem" }}
        >
          {busy ? (
            <>
              <span className="spin-silk"><SparkleIcon size={13} /></span>
              <span>Analyzing design &amp; weaving silhouette…</span>
            </>
          ) : (
            <>
              <SparkleIcon size={13} />
              <span>Generate Outfit from Design</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
