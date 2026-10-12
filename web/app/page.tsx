"use client";

import { signInAnonymously } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { LiveVoice } from "@/components/LiveVoice";
import { QuotePanel } from "@/components/QuotePanel";
import { Runway } from "@/components/Runway";
import { TryOn } from "@/components/TryOn";
import type { MessageInput } from "@/lib/api";
import { useApp } from "@/lib/providers";
import type { ChatMessage, Design } from "@/lib/types";

const STORAGE_KEY = "tp.designId";

export default function Studio() {
  const { auth, api, user, ready } = useApp();
  const [design, setDesign] = useState<Design | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<string>("off");

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demo_mode)).catch(() => {});
  }, [api]);

  function liveTranscript(role: "user" | "model", text: string) {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.live && last.role === role) return [...m.slice(0, -1), { ...last, text: last.text + text }];
      return [...m.map((x) => (x.live ? { ...x, live: false } : x)), { role, text, live: true }];
    });
  }

  function liveTurnComplete() {
    setMessages((m) => m.map((x) => (x.live ? { ...x, live: false } : x)));
  }

  function liveDesign(d: Design) {
    localStorage.setItem(STORAGE_KEY, d.design_id);
    setDesign(d);
  }

  useEffect(() => {
    if (ready && !user) signInAnonymously(auth).catch((e) => setError(e.message));
  }, [ready, user, auth]);

  useEffect(() => {
    const id = user && localStorage.getItem(STORAGE_KEY);
    if (!id) return;
    api
      .getDesign(id)
      .then((d) => {
        setDesign(d);
        setMessages(d.messages ?? []);
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
  }, [user, api]);

  async function send(msg: MessageInput) {
    setBusy(true);
    setError(null);
    if (msg.text) setMessages((m) => [...m, { role: "user", text: msg.text! }]);
    try {
      const d = design ? await api.sendMessage(design.design_id, msg) : await api.createDesign(msg);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setMessages((m) => [
        ...(msg.text ? m : [...m, { role: "user" as const, text: d.transcript || "🎙 (voice)" }]),
        { role: "model", text: d.reply ?? "" },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function flats() {
    if (!design) return;
    setBusy(true);
    setError(null);
    try {
      const { flats_url } = await api.createFlats(design.design_id);
      setDesign({ ...design, flats_url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
    setDesign(null);
    setMessages([]);
  }

  return (
    <main className="studio">
      <header className="topbar">
        <h1>
          Thread <span>&amp;</span> Pixel
        </h1>
        <nav>
          {demoMode !== "off" && <span className="demo-badge" title="API demo mode">demo: {demoMode}</span>}
          {design && <button onClick={startOver}>New design</button>}
          <Link href="/factory">Factory</Link>
        </nav>
      </header>

      {error && <p className="error banner">{error}</p>}

      <div className="grid">
        <Chat
          messages={messages}
          busy={busy}
          onSend={send}
          headerAction={
            <LiveVoice
              designId={design?.design_id ?? null}
              onTranscript={liveTranscript}
              onTurnComplete={liveTurnComplete}
              onDesign={liveDesign}
              onError={setError}
            />
          }
        />

        <section className="panel canvas">
          <h2>Design {design ? `· v${design.version}` : ""}</h2>
          {design ? (
            <>
              <img src={design.image_url} alt="Generated garment design" />
              <div className="chips">
                <span className="swatch" style={{ background: design.spec.color_hex }} />
                <span>{design.spec.garment_type}</span>
                <span>{design.spec.length}</span>
                <span>{design.spec.sleeve.replace("_", " ")} sleeve</span>
                <span>{design.spec.fabric_id}</span>
                {design.spec.embellishments.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
              <button onClick={flats} disabled={busy}>
                {design.flats_url ? "Regenerate technical flats" : "Generate technical flats"}
              </button>
              {design.flats_url && <img className="flats" src={design.flats_url} alt="Technical flat sketch" />}
            </>
          ) : (
            <div className="placeholder">Your design will appear here</div>
          )}
        </section>

        {design && (
          <div className="side">
            <TryOn
              designId={design.design_id}
              tryonUrl={design.tryon_url}
              onResult={(tryon_url) => setDesign({ ...design, tryon_url, runway_url: null })}
            />
            <Runway
              designId={design.design_id}
              runwayUrl={design.runway_url}
              onResult={(runway_url) => setDesign({ ...design, runway_url })}
            />
            <QuotePanel designId={design.design_id} version={design.version} />
          </div>
        )}
      </div>
    </main>
  );
}
