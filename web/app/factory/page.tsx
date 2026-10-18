"use client";

import { signOut } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { FactoryGate } from "@/components/factory/FactoryGate";
import { OrderDetailPanel } from "@/components/factory/OrderDetailPanel";
import { AlertTriangleIcon } from "@/components/icons";
import { humanize, money, shortId } from "@/lib/factory/format";
import { SAMPLE_ORDERS } from "@/lib/factory/sampleOrders";
import { useApp } from "@/lib/providers";
import { ORDER_STATUSES, type OrderDetail, type Quote, type Spec, type TechPack } from "@/lib/types";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  size: string;
  spec: Spec;
  quote?: Quote;
  techpack?: TechPack;
  created_at?: Timestamp;
  sample?: boolean;
};

type Selected = OrderDetail & { sample?: boolean };

const SAMPLES_KEY = "tp.factory.samples";
const OPEN_STATUSES = new Set(["new", "cutting", "sewing"]);

const isFlagged = (o: OrderRow) => !!o.techpack && (!o.techpack.manufacturable || o.techpack.issues.length > 0);
const sum = (rows: OrderRow[], pick: (q: Quote) => number) => rows.reduce((t, r) => t + (r.quote ? pick(r.quote) : 0), 0);

export default function Factory() {
  const { auth, db, api, user, ready } = useApp();
  const [isFactory, setIsFactory] = useState<boolean | null>(null);
  const [liveOrders, setLiveOrders] = useState<OrderRow[]>([]);
  const [showSamples, setShowSamples] = useState(true);
  const [sampleStatus, setSampleStatus] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Selected | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setIsFactory(false);
      return;
    }
    setIsFactory(null);
    user.getIdTokenResult(true).then((t) => setIsFactory(t.claims.role === "factory"));
  }, [user]);

  useEffect(() => {
    try {
      if (localStorage.getItem(SAMPLES_KEY) === "off") setShowSamples(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isFactory) return;
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderRow, "id">) }));
        const prev = seen.current;
        seen.current = new Set(rows.map((r) => r.id));
        const arrived = prev ? rows.filter((r) => !prev.has(r.id)) : [];
        if (arrived.length) {
          const ids = arrived.map((r) => r.id);
          setFresh((f) => new Set([...f, ...ids]));
          setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !ids.includes(id)))), 6000);
          const [first] = arrived;
          setAnnouncement(
            arrived.length === 1
              ? `New order #${shortId(first.id)}: ${first.spec.garment_type} in ${first.quote?.fabric.name ?? first.spec.fabric_id}.`
              : `${arrived.length} new orders.`,
          );
        }
        setLiveOrders(rows);
      },
      (e) => setError(e.message),
    );
  }, [isFactory, db]);

  const sampleRows = useMemo<OrderRow[]>(
    () =>
      SAMPLE_ORDERS.map((o) => ({
        id: o.order_id,
        status: sampleStatus[o.order_id] ?? o.status,
        total: o.quote.total,
        size: o.size,
        spec: o.spec,
        quote: o.quote,
        techpack: o.techpack,
        sample: true,
      })),
    [sampleStatus],
  );
  const rows = useMemo(() => (showSamples ? [...liveOrders, ...sampleRows] : liveOrders), [showSamples, liveOrders, sampleRows]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => OPEN_STATUSES.has(r.status));
    const toCut = rows.filter((r) => r.status === "new");
    return {
      counts: ORDER_STATUSES.filter((s) => OPEN_STATUSES.has(s)).map((s) => [s, rows.filter((r) => r.status === s).length] as const),
      open: open.length,
      yards: sum(toCut, (q) => q.yardage),
      allowance: sum(toCut, (q) => q.waste_yards),
      hours: sum(open, (q) => q.labour_hours),
      flagged: open.filter(isFlagged).length,
    };
  }, [rows]);

  function toggleSamples() {
    const next = !showSamples;
    setShowSamples(next);
    if (!next && selected?.sample) setSelected(null);
    try {
      localStorage.setItem(SAMPLES_KEY, next ? "on" : "off");
    } catch {}
  }

  async function open(row: OrderRow) {
    setError(null);
    if (row.sample) {
      const sample = SAMPLE_ORDERS.find((o) => o.order_id === row.id);
      if (sample) setSelected({ ...sample, status: row.status });
    } else {
      setLoadingId(row.id);
      try {
        setSelected(await api.getOrder(row.id));
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setLoadingId(null);
      }
    }
    requestAnimationFrame(() => detailHeading.current?.focus());
  }

  async function setStatus(order: Selected, status: string) {
    if (order.sample) {
      setSampleStatus((s) => ({ ...s, [order.order_id]: status }));
    } else {
      try {
        await updateDoc(doc(db, "orders", order.order_id), { status });
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    setSelected((sel) => (sel?.order_id === order.order_id ? { ...sel, status } : sel));
    setAnnouncement(`Order #${shortId(order.order_id)} moved to ${status}.`);
  }

  if (!ready) return null;
  if (!user || user.isAnonymous) return <FactoryGate state="signed-out" />;
  if (isFactory === null) return <FactoryGate state="checking" />;
  if (!isFactory) return <FactoryGate state="restricted" />;

  // Another factory user may move a real order while it is open here; the live row wins.
  const selectedStatus = selected ? (rows.find((r) => r.id === selected.order_id)?.status ?? selected.status) : "";

  function renderRow(o: OrderRow) {
    const active = selected?.order_id === o.id;
    const flagged = isFlagged(o);
    const className = [active && "active", fresh.has(o.id) && "is-fresh"].filter(Boolean).join(" ");
    return (
      <tr key={o.id} onClick={() => open(o)} className={className || undefined}>
        <td className="col-id">
          <button
            type="button"
            className="order-open"
            aria-pressed={active}
            aria-controls="order-detail"
            aria-busy={loadingId === o.id}
            onClick={(e) => {
              e.stopPropagation();
              open(o);
            }}
          >
            #{shortId(o.id)}
          </button>
        </td>
        <td className="col-garment">
          <span className="garment-cell">
            <span className="swatch" style={{ background: o.spec.color_hex }} aria-hidden="true" />
            <span className="garment-name">
              <b>{humanize(o.spec.garment_type)}</b>
              <small>{o.quote?.fabric.name ?? o.spec.fabric_id}</small>
            </span>
          </span>
        </td>
        <td className="col-size" data-label="Size">
          {o.size}
        </td>
        <td className="col-yd num" data-label="Fabric">
          {o.quote ? `${o.quote.yardage.toFixed(2)} yd` : "—"}
        </td>
        <td className="col-hours num" data-label="Labour">
          {o.quote ? `${o.quote.labour_hours.toFixed(1)} h` : "—"}
        </td>
        <td className="col-total num" data-label="Total">
          {money(o.total)}
        </td>
        <td className="col-status">
          <span className={`status ${o.status}`}>{o.status}</span>
          {flagged && (
            <span className="factory-flag" title="Flagged by the pattern maker">
              <AlertTriangleIcon size={13} />
              <span className="sr-only">Flagged</span>
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <main className="factory">
      <header className="topbar">
        <div className="brand">
          <Link href="/">
            <h1>
              Thread <span>&amp;</span> Pixel
            </h1>
            <span className="atelier-tag">Factory Portal</span>
          </Link>
        </div>
        <nav>
          <span className="factory-live">
            <i aria-hidden="true" /> Live
          </span>
          <Link href="/studio">Studio</Link>
          <button type="button" className="signout-nav-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </nav>
      </header>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <div className="factory-grid">
        <section className="panel factory-orders" aria-labelledby="orders-title">
          <div className="panel-head">
            <h2 id="orders-title">Orders</h2>
            <button type="button" className="secondary small" aria-pressed={showSamples} onClick={toggleSamples}>
              Sample orders
            </button>
          </div>

          <dl className="factory-stats">
            <div>
              <dt>Open orders</dt>
              <dd>{stats.open}</dd>
              <small>
                {stats.counts.map(([s, n], i) => (
                  <span key={s}>
                    {i > 0 && " · "}
                    {n} {s}
                  </span>
                ))}
              </small>
            </div>
            <div>
              <dt>Fabric to cut</dt>
              <dd>
                {stats.yards.toFixed(2)} <em>yd</em>
              </dd>
              <small>incl. {stats.allowance.toFixed(2)} yd cutting allowance</small>
            </div>
            <div>
              <dt>Labour booked</dt>
              <dd>
                {stats.hours.toFixed(1)} <em>h</em>
              </dd>
              <small>open orders, from each quote</small>
            </div>
            <div className={stats.flagged ? "is-alert" : undefined}>
              <dt>Flagged</dt>
              <dd>{stats.flagged}</dd>
              <small>{stats.flagged ? "check before cutting" : "nothing held"}</small>
            </div>
          </dl>

          <table className="orders">
            <thead>
              <tr>
                <th>Order</th>
                <th>Garment</th>
                <th>Size</th>
                <th className="num">Fabric</th>
                <th className="num">Labour</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.map(renderRow)}
              {liveOrders.length === 0 && (
                <tr className="factory-empty">
                  <td colSpan={7} className="hint col-empty">
                    Waiting for live orders. Commission a piece in the studio and it appears here.
                  </td>
                </tr>
              )}
            </tbody>
            {showSamples && (
              <tbody>
                <tr className="factory-group">
                  <th colSpan={7} scope="rowgroup">
                    Sample orders <span>for demonstration; status changes stay in this browser</span>
                  </th>
                </tr>
                {sampleRows.map(renderRow)}
              </tbody>
            )}
          </table>
        </section>

        {selected ? (
          <OrderDetailPanel
            order={selected}
            status={selectedStatus}
            onStatus={(s) => setStatus(selected, s)}
            headingRef={detailHeading}
          />
        ) : (
          <section className="panel factory-detail factory-detail-empty" aria-label="Order detail">
            <p className="atelier-kicker">Order detail</p>
            <p>Select an order to see its costing, specification and tech pack.</p>
          </section>
        )}
      </div>
    </main>
  );
}
