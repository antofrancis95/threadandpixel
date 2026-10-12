"use client";

import { useState } from "react";
import { useApp } from "@/lib/providers";
import { SIZES, type Measurements, type QuoteResponse } from "@/lib/types";

const FIELDS: { key: keyof Measurements; label: string }[] = [
  { key: "bust_cm", label: "Bust" },
  { key: "waist_cm", label: "Waist" },
  { key: "hip_cm", label: "Hip" },
  { key: "height_cm", label: "Height" },
];

export function QuotePanel({ designId, version }: { designId: string; version: number }) {
  const { api } = useApp();
  const [size, setSize] = useState<string>("M");
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [result, setResult] = useState<(QuoteResponse & { version: number }) | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stale = result && result.version !== version;

  async function getQuote() {
    setBusy(true);
    setError(null);
    setOrderId(null);
    try {
      const hasMeasurements = Object.values(measurements).some((v) => v);
      const r = await api.techpack(designId, size, hasMeasurements ? measurements : undefined);
      setResult({ ...r, version });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      setOrderId((await api.order(designId, result.quote_id)).order_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Tech pack & quote</h2>
      <div className="row">
        <label>
          Size
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {FIELDS.map((f) => (
          <label key={f.key}>
            {f.label} (cm)
            <input
              type="number"
              min={40}
              max={230}
              value={measurements[f.key] ?? ""}
              onChange={(e) =>
                setMeasurements((m) => ({ ...m, [f.key]: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </label>
        ))}
      </div>
      <button onClick={getQuote} disabled={busy}>
        {busy && !result ? "Analysing…" : "Generate tech pack"}
      </button>
      {error && <p className="error">{error}</p>}

      {result && (
        <div className={stale ? "stale" : ""}>
          {stale && <p className="error">Design changed. Regenerate the quote.</p>}
          <div className="stats">
            <span>{result.quote.fabric.name}</span>
            <span>{result.quote.yardage} yd</span>
            <span>{result.quote.labour_hours} h</span>
            <span className={`badge ${result.quote.complexity.toLowerCase()}`}>{result.quote.complexity}</span>
            <span title="Estimated cutting waste">♻ {result.quote.waste_yards} yd waste</span>
          </div>
          <table className="lines">
            <tbody>
              {result.quote.lines.map((l) => (
                <tr key={l.label}>
                  <td>{l.label}</td>
                  <td>${l.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td>${result.quote.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          {!result.techpack.manufacturable && <p className="error">⚠ Manufacturability issues found. See below.</p>}
          <details>
            <summary>Construction notes</summary>
            <ol>
              {result.techpack.construction_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
            <p>
              <strong>Seams:</strong> {result.techpack.seam_types.join(", ")}
            </p>
            {result.techpack.issues.length > 0 && (
              <ul>
                {result.techpack.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </details>
          {orderId ? (
            <p className="success">Order placed: #{orderId.slice(0, 8)}. Your maker has been notified.</p>
          ) : (
            <button className="primary" onClick={placeOrder} disabled={busy || !!stale}>
              Order for ${result.quote.total.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
