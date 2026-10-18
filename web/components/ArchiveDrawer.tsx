"use client";

import { useEffect, useRef, useState } from "react";
import { ArchiveIcon, CloseIcon, SparkleIcon } from "@/components/icons";
import type { DesignSummary } from "@/lib/types";

export function ArchiveDrawer({
  isOpen,
  onClose,
  designs,
  activeDesignId,
  onSelectDesign,
  onNewCommission,
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  designs: DesignSummary[];
  activeDesignId: string | null;
  onSelectDesign: (id: string) => void;
  onNewCommission: () => void;
  loading?: boolean;
}) {
  // Stay mounted for the exit animation, then leave.
  const [shown, setShown] = useState(isOpen);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isOpen) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(false), 240);
    return () => window.clearTimeout(t);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!shown) return null;

  return (
    <div className={`drawer-overlay ${isOpen ? "" : "closing"}`} onClick={onClose}>
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--gold)" }}>
              <ArchiveIcon size={18} />
            </span>
            <h3 id="archive-title" style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 500 }}>
              Atelier Archive
            </h3>
            <span className="archive-count-badge">{designs.length}</span>
          </div>
          <button ref={closeRef} type="button" className="inline-widget-close" onClick={onClose} aria-label="Close archive">
            <CloseIcon size={16} />
          </button>
        </div>

        <p style={{ margin: "0.5rem 0 1rem", fontSize: "var(--text-sm)", color: "var(--muted)", lineHeight: 1.4 }}>
          Browse your bespoke consultations and past commissions. Switch between silhouettes anytime.
        </p>

        {/* New Commission Action */}
        <button
          type="button"
          className="new-commission-drawer-btn"
          onClick={() => {
            onNewCommission();
            onClose();
          }}
        >
          <SparkleIcon size={14} style={{ color: "var(--gold)" }} />
          <span>Start a New Commission</span>
        </button>

        {/* Designs List */}
        <div className="drawer-designs-list">
          {loading ? (
            <div style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="skeleton-card" style={{ height: "72px" }} />
              <div className="skeleton-card" style={{ height: "72px" }} />
              <div className="skeleton-card" style={{ height: "72px" }} />
            </div>
          ) : designs.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
              <ArchiveIcon size={32} style={{ color: "var(--cream)", marginBottom: "0.75rem" }} />
              <p style={{ fontSize: "var(--text-base)", margin: 0 }}>No past commissions in this salon yet.</p>
              <span style={{ fontSize: "var(--text-xs)" }}>Designs you create with the Couturier will be archived here.</span>
            </div>
          ) : (
            designs.map((d) => {
              const isActive = d.design_id === activeDesignId;
              const dateStr = d.created_at
                ? new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : "Recent";
              const title = d.spec
                ? `${d.spec.fabric_id} ${d.spec.garment_type}`
                : `Commission v${d.version}`;

              return (
                <button
                  key={d.design_id}
                  type="button"
                  className={`archive-item-card ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => {
                    onSelectDesign(d.design_id);
                    onClose();
                  }}
                >
                  <span className="archive-item-thumb">
                    {d.image_url ? (
                      <img src={d.image_url} alt="" />
                    ) : (
                      <span className="archive-thumb-placeholder">✦</span>
                    )}
                  </span>
                  <span className="archive-item-info">
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong className="archive-item-title">{title}</strong>
                      <span className="archive-item-date">{dateStr}</span>
                    </span>
                    <span className="archive-item-meta">
                      {d.order_id && <span className="archive-meta-chip commissioned">Commissioned</span>}
                      <span className="archive-meta-chip">v{d.version}</span>
                      {d.spec?.color_hex && (
                        <span className="archive-meta-chip">
                          <span
                            className="swatch-circle"
                            style={{ width: "9px", height: "9px", background: d.spec.color_hex }}
                          />
                          {d.spec.color_hex}
                        </span>
                      )}
                      {d.messages_count > 0 && (
                        <span className="archive-meta-chip">{d.messages_count} msgs</span>
                      )}
                    </span>
                  </span>
                  {isActive && <span className="archive-active-indicator">Current</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

