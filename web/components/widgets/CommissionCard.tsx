"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CheckIcon,
  ClipboardIcon,
  CloseIcon,
  HourglassIcon,
  RecycleIcon,
  RulerIcon,
  ThreadIcon,
} from "@/components/icons";
import { useApp } from "@/lib/providers";
import type { QuoteResponse } from "@/lib/types";

export function CommissionCard({
  designId,
  data,
  onOrderPlaced,
  onClose,
}: {
  designId: string;
  data: QuoteResponse;
  onOrderPlaced: (orderId: string) => void;
  onClose?: () => void;
}) {
  const { api } = useApp();
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.order(designId, data.quote_id);
      setOrderId(res.order_id);
      onOrderPlaced(res.order_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-widget receipt-card">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <ClipboardIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Bespoke Tech Pack &amp; Quotation</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <div className="receipt-stats">
        <span>
          <ThreadIcon size={13} style={{ color: "var(--gold)" }} /> <strong>{data.quote.fabric.name}</strong>
        </span>
        <span>
          <RulerIcon size={13} style={{ color: "var(--gold)" }} /> {data.quote.yardage} yd
        </span>
        <span>
          <HourglassIcon size={13} style={{ color: "var(--gold)" }} /> {data.quote.labour_hours} h
        </span>
        <span className={`complexity-badge ${data.quote.complexity.toLowerCase()}`}>
          {data.quote.complexity}
        </span>
        <span style={{ color: "var(--emerald)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          <RecycleIcon size={13} /> {data.quote.waste_yards} yd waste
        </span>
      </div>

      <table className="receipt-lines">
        <tbody>
          {data.quote.lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td>${l.amount.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total Commission</td>
            <td style={{ color: "var(--gold-dark)" }}>${data.quote.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {!data.techpack.manufacturable && (
        <p className="error" style={{ margin: "0.5rem 0", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <AlertTriangleIcon size={15} />
          <span>Pattern maker flagged construction complexities.</span>
        </p>
      )}

      <details style={{ fontSize: "0.82rem", margin: "0.6rem 0", color: "var(--ink-secondary)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500, color: "var(--muted)" }}>
          View construction notes &amp; seam specifications ({data.techpack.construction_notes.length} steps)
        </summary>
        <ol style={{ paddingLeft: "1.2rem", margin: "0.4rem 0" }}>
          {data.techpack.construction_notes.map((n) => (
            <li key={n} style={{ margin: "0.2rem 0" }}>{n}</li>
          ))}
        </ol>
        <p style={{ margin: "0.3rem 0" }}>
          <strong>Seams:</strong> {data.techpack.seam_types.join(", ")}
        </p>
      </details>

      {error && <p className="error">{error}</p>}

      {orderId ? (
        <div style={{ padding: "0.75rem", background: "var(--emerald-light)", borderRadius: "var(--radius-sm)", color: "var(--emerald)", fontWeight: 600, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          <CheckIcon size={16} /> Commission Confirmed: #{orderId.slice(0, 8)}. Handed off to atelier maker.
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <button type="button" className="primary" onClick={handleOrder} disabled={busy}>
            {busy ? "Authorizing commission…" : `Commission Piece · $${data.quote.total.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}

