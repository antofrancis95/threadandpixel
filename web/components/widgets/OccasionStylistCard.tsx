"use client";

import { useEffect, useState } from "react";
import { CameraIcon, CheckIcon, CloseIcon, MannequinIcon, MenswearIcon, MirrorIcon, PartyIcon, SparkleIcon, WomenswearIcon } from "@/components/icons";
import { SIZES } from "@/lib/types";

const OCCASION_SUGGESTIONS = [
  "Black-Tie Gala",
  "Summer Wedding Guest",
  "Cocktail Soirée",
  "Red Carpet Premiere",
  "Resort / Cruise Vacation",
  "Executive Keynote",
] as const;

export function OccasionStylistCard({
  initialOccasion = "",
  initialGender = null,
  hasExistingPortrait = false,
  onSubmit,
  onClose,
  busy = false,
}: {
  initialOccasion?: string;
  initialGender?: "womenswear" | "menswear" | null;
  hasExistingPortrait?: boolean;
  onSubmit: (params: {
    occasion: string;
    file?: File | null;
    preferences?: string;
    gender?: string;
    size?: string;
    consent?: boolean;
  }) => void;
  onClose?: () => void;
  busy?: boolean;
}) {
  const [occasion, setOccasion] = useState<string>(initialOccasion);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean>(true);
  const [preferences, setPreferences] = useState<string>("");
  const [gender, setGender] = useState<"womenswear" | "menswear" | null>(initialGender || null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [useSavedPortrait, setUseSavedPortrait] = useState<boolean>(hasExistingPortrait);

  useEffect(() => {
    if (initialOccasion) {
      setOccasion(initialOccasion);
    }
  }, [initialOccasion]);

  useEffect(() => {
    if (initialGender) {
      setGender(initialGender);
    }
  }, [initialGender]);

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setUseSavedPortrait(false);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  function handleConfirm() {
    if (!occasion.trim() || busy) return;
    if (!useSavedPortrait && (!file || !consent)) return;
    onSubmit({
      occasion: occasion.trim(),
      file: useSavedPortrait ? null : file,
      preferences: preferences.trim() || undefined,
      gender: gender || undefined,
      size: selectedSize,
      consent,
    });
  }

  const canSubmit =
    Boolean(occasion.trim()) &&
    (useSavedPortrait || (Boolean(file) && consent)) &&
    !busy;

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <PartyIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Occasion Stylist &amp; Bespoke Drape</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close" disabled={busy}>
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.85rem", lineHeight: 1.45 }}>
        Tell the Couturier about your upcoming event and share your photo. We will design an exclusive bespoke silhouette curated for your frame and occasion, and drape it directly onto you:
      </p>

      {/* Occasion Input with Suggestions */}
      <div style={{ marginBottom: "0.85rem" }}>
        <label htmlFor="occasion-text-input" style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
          The Occasion / Dress Code
        </label>
        <input
          id="occasion-text-input"
          type="text"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="e.g. Black-Tie Charity Gala at the Opera, Beach Wedding Guest..."
          maxLength={150}
          disabled={busy}
          style={{
            width: "100%",
            padding: "0.55rem 0.75rem",
            fontSize: "0.88rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            outline: "none",
            marginBottom: "0.45rem",
          }}
        />
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {OCCASION_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              type="button"
              className={`chip-btn ${occasion.toLowerCase() === sug.toLowerCase() ? "highlight" : ""}`}
              style={{ fontSize: "0.74rem", padding: "0.22rem 0.55rem" }}
              onClick={() => setOccasion(sug)}
              disabled={busy}
            >
              <span>✦ {sug}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Portrait Photo Section */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Your Portrait Photo
          </label>
          <span style={{ fontSize: "0.75rem", color: "var(--gold-dark)", fontWeight: 500 }}>
            For personalized tailoring &amp; virtual drape
          </span>
        </div>

        {hasExistingPortrait && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 0.75rem",
              background: useSavedPortrait ? "var(--ivory)" : "var(--surface)",
              border: `1px solid ${useSavedPortrait ? "var(--gold)" : "var(--line)"}`,
              borderRadius: "var(--radius-md)",
              marginBottom: "0.65rem",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <MirrorIcon size={14} style={{ color: "var(--gold)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--ink)", fontWeight: 500 }}>
                Saved portrait on file active
              </span>
            </div>
            <button
              type="button"
              className={`chip-btn ${useSavedPortrait ? "highlight" : ""}`}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
              onClick={() => {
                setUseSavedPortrait(!useSavedPortrait);
                if (!useSavedPortrait) {
                  setFile(null);
                  setPreviewUrl(null);
                }
              }}
              disabled={busy}
            >
              {useSavedPortrait ? "✓ Using saved photo" : "Use saved photo"}
            </button>
          </div>
        )}

        {(!hasExistingPortrait || !useSavedPortrait) && (
          <>
            <div className="dropzone-atelier" style={{ marginBottom: "0.65rem" }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={busy}
                aria-label="Upload your portrait photo"
              />
              {previewUrl ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.9rem" }}>
                  <img
                    src={previewUrl}
                    alt="Selected portrait preview"
                    style={{ width: "60px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--gold)" }}
                  />
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ fontSize: "0.85rem", display: "block", color: "var(--ink)" }}>{file?.name}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--gold-dark)" }}>✦ Photo selected · Tap to replace</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="dropzone-icon">
                    <CameraIcon size={30} style={{ color: "var(--gold)" }} />
                  </div>
                  <strong style={{ fontSize: "0.86rem", display: "block", color: "var(--ink)" }}>
                    Upload or snap your photo
                  </strong>
                  <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                    Full-length or portrait · Plain background recommended
                  </span>
                </div>
              )}
            </div>

            <div
              className="consent-row"
              onClick={() => setConsent(!consent)}
              style={{ cursor: "pointer", userSelect: "none", marginBottom: "0.75rem" }}
            >
              <span
                className={`atelier-checkbox ${consent ? "checked" : ""}`}
                role="checkbox"
                aria-checked={consent}
              >
                {consent && <CheckIcon size={11} />}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                I consent to my photo being processed for custom tailoring &amp; virtual try-on. Body photos remain private and encrypted.
              </span>
            </div>
          </>
        )}
      </div>

      {/* Target Silhouette Gender */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Target Wardrobe
          </label>
          {!gender && (
            <span style={{ fontSize: "0.72rem", color: "var(--gold-dark)", fontWeight: 500 }}>
              ✦ Auto-detect from portrait or select
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.45rem" }}>
          <button
            type="button"
            className={`chip-btn ${gender === "womenswear" ? "highlight" : ""}`}
            onClick={() => setGender(gender === "womenswear" ? null : "womenswear")}
            disabled={busy}
            style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
          >
            <WomenswearIcon size={13} />
            <span>Lady · Womenswear</span>
          </button>
          <button
            type="button"
            className={`chip-btn ${gender === "menswear" ? "highlight" : ""}`}
            onClick={() => setGender(gender === "menswear" ? null : "menswear")}
            disabled={busy}
            style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
          >
            <MenswearIcon size={13} />
            <span>Gentleman · Menswear</span>
          </button>
        </div>
      </div>

      {/* Size Selection */}
      <div style={{ marginBottom: "0.85rem" }}>
        <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
          Proportion Size
        </label>
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

      {/* Optional Styling Preferences */}
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="occasion-pref-input" style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
          Personal Preferences (Optional)
        </label>
        <input
          id="occasion-pref-input"
          type="text"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g. Jewel tones (emerald, sapphire), floor length, elegant neckline..."
          maxLength={300}
          disabled={busy}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            fontSize: "0.84rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--ivory)",
            color: "var(--ink)",
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
          disabled={!canSubmit}
          style={{ fontSize: "0.84rem", padding: "0.5rem 1.15rem" }}
        >
          {busy ? (
            <>
              <span className="spin-silk"><SparkleIcon size={13} /></span>
              <span>Styling occasion silhouette &amp; draping on you…</span>
            </>
          ) : (
            <>
              <SparkleIcon size={13} />
              <span>Design My Occasion Outfit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
