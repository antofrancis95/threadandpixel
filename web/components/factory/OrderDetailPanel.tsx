"use client";

import type { Ref } from "react";
import {
  AlertTriangleIcon,
  HourglassIcon,
  RecycleIcon,
  RulerIcon,
  ThreadIcon,
} from "@/components/icons";
import { humanize, humanList, money, shortId } from "@/lib/factory/format";
import { ORDER_STATUSES, type OrderDetail } from "@/lib/types";

const MEDIA = [
  ["image_url", "Render"],
  ["flats_url", "Flats"],
  ["tryon_url", "Try-on"],
  ["runway_url", "Runway"],
] as const;

/** One order as the floor needs it: status, the quote's figures, costing, spec and tech pack. */
export function OrderDetailPanel({
  order,
  status,
  onStatus,
  headingRef,
}: {
  order: OrderDetail & { sample?: boolean };
  status: string;
  onStatus: (status: string) => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const { spec, quote, techpack, measurements } = order;
  const flagged = !techpack.manufacturable || techpack.issues.length > 0;
  const media = MEDIA.filter(([key]) => order[key]);
  const tape = measurements
    ? Object.entries(measurements)
        .filter(([, v]) => v)
        .map(([k, v]) => `${humanize(k.replace("_cm", ""))} ${v}`)
        .join(" · ") + " cm"
    : null;

  return (
    <section className="panel factory-detail" id="order-detail" aria-labelledby="order-detail-title">
      <div className="panel-head">
        <h2 id="order-detail-title" tabIndex={-1} ref={headingRef}>
          Order #{shortId(order.order_id)}
        </h2>
        {order.sample && <span className="factory-sample-tag">Sample</span>}
      </div>

      <div className="factory-status-row" role="group" aria-label="Order status">
        {ORDER_STATUSES.map((s) => (
          <button
            type="button"
            key={s}
            className={status === s ? "primary" : ""}
            aria-pressed={status === s}
            onClick={() => onStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="receipt-stats">
        <span>
          <ThreadIcon size={13} style={{ color: "var(--gold)" }} /> <strong>{quote.fabric.name}</strong>
        </span>
        <span>
          <RulerIcon size={13} style={{ color: "var(--gold)" }} /> {quote.yardage} yd
        </span>
        <span>
          <HourglassIcon size={13} style={{ color: "var(--gold)" }} /> {quote.labour_hours} h
        </span>
        <span className={`complexity-badge ${quote.complexity.toLowerCase()}`}>{quote.complexity}</span>
        <span style={{ color: "var(--emerald)" }} title="Cutting allowance, included in the yardage">
          <RecycleIcon size={13} /> {quote.waste_yards} yd allowance
        </span>
      </div>

      {flagged && (
        <div className="factory-issues" role="note">
          <p className="factory-issues-head">
            <AlertTriangleIcon size={15} />
            <span>{techpack.manufacturable ? "Flagged by the pattern maker" : "Not manufacturable as drawn"}</span>
          </p>
          {techpack.issues.length > 0 && (
            <ul>
              {techpack.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {media.length > 0 ? (
        <div className="gallery">
          {media.map(([key, label]) => (
            <figure key={key}>
              {key === "runway_url" ? (
                <video src={order[key]!} controls loop muted playsInline aria-label={label} />
              ) : (
                <img src={order[key]!} alt={label} />
              )}
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="factory-swatch-card">
          <span className="factory-swatch-chip" style={{ background: spec.color_hex }} aria-hidden="true" />
          <span>
            <b>
              {quote.fabric.name}, {spec.color_hex.toUpperCase()}
            </b>
            <small>{order.sample ? "Sample order: no renders attached." : "No renders attached to this order."}</small>
          </span>
        </div>
      )}

      <div className="factory-block">
        <h3>Specification</h3>
        <dl className="factory-spec">
          <div>
            <dt>Garment</dt>
            <dd>{humanize(spec.garment_type)}</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>{humanize(spec.length)}</dd>
          </div>
          <div>
            <dt>Sleeve</dt>
            <dd>{humanize(spec.sleeve)}</dd>
          </div>
          <div>
            <dt>Fabric</dt>
            <dd>{quote.fabric.name}</dd>
          </div>
          <div>
            <dt>Colour</dt>
            <dd>
              <span className="swatch" style={{ background: spec.color_hex }} aria-hidden="true" />{" "}
              {spec.color_hex.toUpperCase()}
            </dd>
          </div>
          <div>
            <dt>Lining</dt>
            <dd>{spec.lining ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Closures</dt>
            <dd>{humanList(spec.closures)}</dd>
          </div>
          <div>
            <dt>Embellishments</dt>
            <dd>{humanList(spec.embellishments)}</dd>
          </div>
          <div className="wide">
            <dt>Size {order.size}</dt>
            <dd>{tape ?? "Standard size chart"}</dd>
          </div>
        </dl>
      </div>

      <div className="factory-block">
        <h3>Costing</h3>
        <table className="receipt-lines">
          <tbody>
            {quote.lines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td>{money(l.amount)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total commission</td>
              <td style={{ color: "var(--gold-dark)" }}>{money(quote.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="factory-block">
        <h3>Construction</h3>
        <ol className="factory-steps">
          {techpack.construction_notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
        <p className="factory-seams">
          <span className="factory-label">Seams</span>
          {techpack.seam_types.map((s) => (
            <span key={s} className="spec-chip">
              {s}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
