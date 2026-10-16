"use client";

import { useState } from "react";
import { CameraIcon, CheckIcon, CloseIcon, MirrorIcon, SparkleIcon } from "@/components/icons";

export function FittingRoomCard({
  onSubmit,
  onDrapeExisting,
  hasExistingPortrait = false,
  onClose,
  busy = false,
}: {
  onSubmit: (file: File) => void;
  onDrapeExisting?: () => void;
  hasExistingPortrait?: boolean;
  onClose?: () => void;
  busy?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  function handleConfirm() {
    if (!file || !consent) return;
    onSubmit(file);
  }

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <MirrorIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Virtual Fitting Room</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {hasExistingPortrait && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0.9rem",
            background: "var(--ivory)",
            border: "1px solid var(--gold-light)",
            borderRadius: "var(--radius-md)",
            marginBottom: "0.85rem",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <SparkleIcon size={16} style={{ color: "var(--gold)" }} />
            <div>
              <strong style={{ fontSize: "0.84rem", display: "block", color: "var(--ink)" }}>
                Saved Fitting Portrait Active
              </strong>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Your portrait is preserved on file. Drape this updated piece directly onto it.
              </span>
            </div>
          </div>
          {onDrapeExisting && (
            <button
              type="button"
              className="primary"
              onClick={onDrapeExisting}
              disabled={busy}
              style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", whiteSpace: "nowrap" }}
            >
              {busy ? "Draping…" : "Drape on Saved Portrait"}
            </button>
          )}
        </div>
      )}

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
        {hasExistingPortrait
          ? "Or upload a different portrait to replace your saved fitting photo:"
          : "Upload a full-length, front-facing portrait to drape this garment directly onto yourself:"}
      </p>

      <div className={`dropzone-atelier ${busy ? "locked" : ""}`} aria-disabled={busy}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem" }}>
            <img
              src={previewUrl}
              alt="Selected portrait"
              style={{ width: "60px", height: "80px", objectFit: "cover", borderRadius: "6px" }}
            />
            <div style={{ textAlign: "left" }}>
              <strong style={{ fontSize: "0.85rem", display: "block" }}>{file?.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {busy ? "Draping in progress…" : "Tap to replace photo"}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div className="dropzone-icon">
              <CameraIcon size={32} style={{ color: "var(--gold)" }} />
            </div>
            <strong style={{ fontSize: "0.88rem", display: "block", color: "var(--ink)" }}>
              Upload or snap a portrait
            </strong>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              JPEG, PNG or WebP · Plain background works best
            </span>
          </div>
        )}
      </div>

      <div
        className="consent-row"
        onClick={() => !busy && setConsent(!consent)}
        style={{ cursor: busy ? "default" : "pointer", userSelect: "none" }}
      >
        <span
          className={`atelier-checkbox ${consent ? "checked" : ""}`}
          role="checkbox"
          aria-checked={consent}
        >
          {consent && <CheckIcon size={11} />}
        </span>
        <span>
          I consent to my photo being processed by Vertex AI for virtual try-on. Body photos are private, never shared, and automatically purged after 7 days.
        </span>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="primary"
          onClick={handleConfirm}
          disabled={!file || !consent || busy}
        >
          {busy ? "Tailoring & draping on you…" : "Drape Garment on Me"}
        </button>
      </div>
    </div>
  );
}

