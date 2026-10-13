"use client";

import { useState } from "react";
import { CameraIcon, CheckIcon, CloseIcon, MirrorIcon } from "@/components/icons";

export function FittingRoomCard({
  onSubmit,
  onClose,
  busy = false,
}: {
  onSubmit: (file: File) => void;
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

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
        Upload a full-length, front-facing portrait to drape this garment directly onto yourself:
      </p>

      <div className="dropzone-atelier">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Tap to replace photo</span>
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
        onClick={() => setConsent(!consent)}
        style={{ cursor: "pointer", userSelect: "none" }}
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

