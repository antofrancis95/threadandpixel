"use client";

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";
import { ORDER_STATUSES, type OrderDetail } from "@/lib/types";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  size: string;
  spec: { garment_type: string; fabric_id: string; color_hex: string };
  created_at?: Timestamp;
};

export default function Factory() {
  const { auth, db, api, user, ready } = useApp();
  const [isFactory, setIsFactory] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setIsFactory(false);
      return;
    }
    user.getIdTokenResult(true).then((t) => setIsFactory(t.claims.role === "factory"));
  }, [user]);

  useEffect(() => {
    if (!isFactory) return;
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderRow, "id">) }))),
      (e) => setError(e.message),
    );
  }, [isFactory, db]);

  async function open(id: string) {
    setError(null);
    try {
      setSelected(await api.getOrder(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function setStatus(id: string, status: string) {
    await updateDoc(doc(db, "orders", id), { status }).catch((e) => setError(e.message));
    if (selected?.order_id === id) setSelected({ ...selected, status });
  }

  if (!ready) return null;

  if (!isFactory) {
    return (
      <main className="factory">
        <header className="topbar">
          <h1>
            Thread <span>&amp;</span> Pixel <span className="atelier-tag">Factory Portal</span>
          </h1>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/studio">Studio</Link>
          </nav>
        </header>
        <section className="panel factory-gate">
          <p className="atelier-kicker">Factory Portal</p>
          <h2>Orders, live from the studio.</h2>
          <p className="hint">
            Sign in with the factory account to receive commissions with their spec, measurements, flats and quote,
            and move each one from new to cutting, sewing and shipped.
          </p>
          {user && !user.isAnonymous ? (
            <>
              <p>
                Signed in as {user.email}, but this account is not a factory account. Ask an admin to run:
              </p>
              <code>python scripts/set_factory_role.py {user.uid}</code>
              <p>
                Then <button onClick={() => signOut(auth)}>sign out</button> and back in.
              </p>
            </>
          ) : (
            <button className="primary" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>
              Sign in with Google
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="factory">
      <header className="topbar">
        <h1>Factory portal</h1>
        <nav>
          <span className="live">● Live</span>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </nav>
      </header>
      {error && <p className="error banner">{error}</p>}
      <div className="grid factory-grid">
        <section className="panel">
          <h2>Orders</h2>
          <table className="orders">
            <thead>
              <tr>
                <th>Order</th>
                <th>Garment</th>
                <th>Size</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => open(o.id)} className={selected?.order_id === o.id ? "active" : ""}>
                  <td className="col-id">#{o.id.slice(0, 8)}</td>
                  <td className="col-garment">
                    <span className="swatch" style={{ background: o.spec.color_hex }} /> {o.spec.garment_type} ·{" "}
                    {o.spec.fabric_id}
                  </td>
                  <td className="col-size" data-label="Size">{o.size}</td>
                  <td className="col-total" data-label="Total">${o.total.toFixed(2)}</td>
                  <td className="col-status">
                    <span className={`status ${o.status}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="hint col-empty">
                    Waiting for orders…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {selected && (
          <section className="panel">
            <h2>Order #{selected.order_id.slice(0, 8)}</h2>
            <div className="row">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  className={selected.status === s ? "primary" : ""}
                  onClick={() => setStatus(selected.order_id, s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="gallery">
              {selected.image_url && <img src={selected.image_url} alt="Design" />}
              {selected.flats_url && <img src={selected.flats_url} alt="Technical flats" />}
              {selected.tryon_url && <img src={selected.tryon_url} alt="Try-on reference" />}
              {selected.runway_url && <video src={selected.runway_url} controls loop muted playsInline />}
            </div>
            <h3>Spec</h3>
            <p>
              {selected.spec.garment_type}, {selected.spec.length}, {selected.spec.sleeve} sleeve · {selected.quote.fabric.name}{" "}
              · {selected.quote.yardage} yd · lining: {selected.spec.lining ? "yes" : "no"} · closures:{" "}
              {selected.spec.closures.join(", ")} · embellishments: {selected.spec.embellishments.join(", ") || "none"}
            </p>
            <h3>Size {selected.size}</h3>
            {selected.measurements && (
              <p>
                {Object.entries(selected.measurements)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k.replace("_cm", "")}: ${v} cm`)
                  .join(" · ")}
              </p>
            )}
            <h3>Construction</h3>
            <ol>
              {selected.techpack.construction_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
            <p>
              <strong>Seams:</strong> {selected.techpack.seam_types.join(", ")}
            </p>
            {selected.techpack.issues.length > 0 && (
              <>
                <h3>Flagged issues</h3>
                <ul>
                  {selected.techpack.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
