"use client";

import { signInAnonymously } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import { Chat } from "@/components/Chat";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  ClipboardIcon,
  FilmIcon,
  MannequinIcon,
  MirrorIcon,
  PlusIcon,
  RefreshIcon,
  RulerIcon,
  ScissorsIcon,
  SparkleIcon,
} from "@/components/icons";
import { LiveVoice } from "@/components/LiveVoice";
import { ChatSkeleton, ShowcaseSkeleton } from "@/components/skeletons";
import { CommissionCard } from "@/components/widgets/CommissionCard";
import { FittingRoomCard } from "@/components/widgets/FittingRoomCard";
import { MeasurementCard } from "@/components/widgets/MeasurementCard";
import { RunwayCard } from "@/components/widgets/RunwayCard";
import type { MessageInput } from "@/lib/api";
import { useApp } from "@/lib/providers";
import type {
  AtelierAction,
  ChatMessage,
  Design,
  DesignSummary,
  Measurements,
  QuoteResponse,
} from "@/lib/types";

const STORAGE_KEY = "tp.designId";

type ShowcaseTab = "editorial" | "flats" | "tryon" | "runway";

export default function AtelierStudio() {
  const { auth, api, user, ready } = useApp();
  const [design, setDesign] = useState<Design | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<string>("off");

  // Loading & Consultation History State
  const [initialLoading, setInitialLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [pastDesigns, setPastDesigns] = useState<DesignSummary[]>([]);

  // Interactive View States
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("editorial");
  const [activeWidget, setActiveWidget] = useState<AtelierAction>(null);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [tryonBusy, setTryonBusy] = useState(false);
  const [assetErrors, setAssetErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demo_mode)).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (ready && !user) signInAnonymously(auth).catch((e) => setError(e.message));
  }, [ready, user, auth]);

  async function loadArchive() {
    setArchiveLoading(true);
    try {
      const list = await api.listDesigns();
      setPastDesigns(list);
    } catch {
      // graceful fallback if offline
    } finally {
      setArchiveLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !user) return;
    loadArchive();
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setInitialLoading(false);
      return;
    }
    api
      .getDesign(id)
      .then((d) => {
        setDesign(d);
        setMessages(d.messages ?? []);
        if (d.suggested_action && d.suggested_action !== "none") {
          setActiveWidget(d.suggested_action as AtelierAction);
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [ready, user, api]);

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
    setAssetErrors({});
    setActiveTab("editorial");
    if (d.suggested_action && d.suggested_action !== "none") {
      setActiveWidget(d.suggested_action as AtelierAction);
    }
    loadArchive();
  }

  async function send(msg: MessageInput) {
    setBusy(true);
    setError(null);
    if (msg.text) setMessages((m) => [...m, { role: "user", text: msg.text! }]);
    try {
      const d = design ? await api.sendMessage(design.design_id, msg) : await api.createDesign(msg);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setAssetErrors({});
      setActiveTab("editorial");
      setMessages((m) => [
        ...(msg.text ? m : [...m, { role: "user" as const, text: d.transcript || "(voice prompt)" }]),
        { role: "model", text: d.reply ?? "" },
      ]);
      // Open suggested widget if recommended by the Couturier
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      }
      loadArchive();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function selectDesignFromArchive(id: string) {
    if (design?.design_id === id) return;
    setInitialLoading(true);
    setError(null);
    try {
      const d = await api.getDesign(id);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setMessages(d.messages ?? []);
      setActiveTab("editorial");
      setAssetErrors({});
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      } else {
        setActiveWidget(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInitialLoading(false);
    }
  }

  async function generateFlats() {
    if (!design) return;
    setBusy(true);
    setError(null);
    setAssetErrors((e) => ({ ...e, flats: false }));
    try {
      const { flats_url } = await api.createFlats(design.design_id);
      setDesign({ ...design, flats_url });
      setActiveTab("flats");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyMeasurements(size: string, measurements?: Measurements) {
    if (!design) return;
    setQuoteBusy(true);
    setError(null);
    try {
      const res = await api.techpack(design.design_id, size, measurements);
      setQuoteData(res);
      setActiveWidget("commission");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuoteBusy(false);
    }
  }

  async function handleTryonUpload(file: File) {
    if (!design) return;
    setTryonBusy(true);
    setError(null);
    setAssetErrors((e) => ({ ...e, tryon: false }));
    try {
      const { upload_id } = await api.uploadPerson(file);
      const { tryon_url } = await api.tryOn(design.design_id, upload_id);
      setDesign({ ...design, tryon_url, runway_url: null });
      setActiveTab("tryon");
      setActiveWidget(null);
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text: "I have draped this bespoke creation onto your portrait in the salon mirror. You may inspect the fit on the showcase board.",
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTryonBusy(false);
    }
  }

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
    setDesign(null);
    setMessages([]);
    setQuoteData(null);
    setActiveWidget(null);
    setActiveTab("editorial");
    setAssetErrors({});
  }

  return (
    <div className="atelier-app">
      <header className="topbar">
        <div className="brand">
          <h1>
            Thread <span>&amp;</span> Pixel
          </h1>
          <span className="atelier-tag">Haute Couture Atelier</span>
        </div>
        <nav>
          {demoMode !== "off" && <span className="demo-badge">demo mode: {demoMode}</span>}
          <button
            type="button"
            className="archive-trigger-btn"
            onClick={() => {
              setArchiveOpen(true);
              loadArchive();
            }}
          >
            <ArchiveIcon size={14} />
            <span>Archive{pastDesigns.length > 0 ? ` (${pastDesigns.length})` : ""}</span>
          </button>
          {design && (
            <button type="button" className="secondary" onClick={startOver}>
              New Commission
              <PlusIcon size={13} />
              <span>New Commission</span>
            </button>
          )}
          <Link href="/factory">Factory Portal</Link>
        </nav>
      </header>

      {error && <p className="error banner">{error}</p>}

      <main className="studio">
        {initialLoading ? (
          <div className="grid">
            <section className="panel chat-panel">
              <div className="panel-head">
                <h2>Couturier Consultation</h2>
                <span className="mannequin-badge">✦ Restoring Salon History</span>
              </div>
              <ChatSkeleton />
            </section>
            <section className="panel showcase-panel">
              <div className="panel-head">
                <h2>Couture Showcase</h2>
              </div>
              <ShowcaseSkeleton />
            </section>
          </div>
        ) : (
          <div className="grid">
        {/* Left Column: Conversational Atelier Stream */}
        <Chat
          messages={messages}
          busy={busy}
          onSend={send}
          hasDesign={Boolean(design)}
          suggestedAction={(design?.suggested_action as AtelierAction) ?? null}
          activeWidget={activeWidget}
          onSelectWidget={setActiveWidget}
          headerAction={
            <LiveVoice
              designId={design?.design_id ?? null}
              onTranscript={liveTranscript}
              onTurnComplete={liveTurnComplete}
              onDesign={liveDesign}
              onError={setError}
            />
          }
          widgetContent={
            activeWidget === "measurements" ? (
              <MeasurementCard
                onSubmit={handleApplyMeasurements}
                onClose={() => setActiveWidget(null)}
                busy={quoteBusy}
              />
            ) : activeWidget === "fitting" ? (
              <FittingRoomCard
                onSubmit={handleTryonUpload}
                onClose={() => setActiveWidget(null)}
                busy={tryonBusy}
              />
            ) : activeWidget === "runway" && design ? (
              <RunwayCard
                designId={design.design_id}
                runwayUrl={design.runway_url}
                onResult={(url) => {
                  setDesign({ ...design, runway_url: url });
                  setActiveTab("runway");
                }}
                onClose={() => setActiveWidget(null)}
              />
            ) : activeWidget === "commission" && design && quoteData ? (
              <CommissionCard
                designId={design.design_id}
                data={quoteData}
                onOrderPlaced={() => setActiveWidget(null)}
                onClose={() => setActiveWidget(null)}
              />
            ) : null
          }
        />

        {/* Right Column: Couture Showcase & Moodboard */}
        <section className="panel showcase-panel">
          <div className="panel-head">
            <h2>Couture Showcase {design ? `· v${design.version}` : ""}</h2>
            <div className="view-tabs">
              <button
                type="button"
                className={`view-tab ${activeTab === "editorial" ? "active" : ""}`}
                onClick={() => setActiveTab("editorial")}
              >
                <SparkleIcon size={12} />
                <span>Editorial</span>
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "flats" ? "active" : ""}`}
                onClick={() => setActiveTab("flats")}
              >
                <RulerIcon size={12} />
                <span>Flats</span>
                {design && !design.flats_url && <span className="tab-pill">draft</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "tryon" ? "active" : ""}`}
                onClick={() => setActiveTab("tryon")}
              >
                <MirrorIcon size={12} />
                <span>Fitting</span>
                {design && !design.tryon_url && <span className="tab-pill">try-on</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "runway" ? "active" : ""}`}
                onClick={() => setActiveTab("runway")}
              >
                <FilmIcon size={12} />
                <span>Runway</span>
                {design && !design.runway_url && <span className="tab-pill">veo</span>}
              </button>
            </div>
          </div>

          {/* High-Resolution Frame */}
          <div className="canvas-frame">
            {busy && !design ? (
              <div className="silk-shimmer-full">
                <div className="shimmer-aura">
                  <span className="shimmer-icon">
                    <SparkleIcon size={24} />
                  </span>
                </div>
                <h3 className="shimmer-title">Draping Haute Couture Silhouette</h3>
                <span className="shimmer-subtitle">Weaving bespoke textiles &amp; formulating tailoring specs…</span>
              </div>
            ) : design ? (
              <>
                {busy && (
                  <div className="silk-shimmer-overlay">
                    <span className="spin-silk">
                      <SparkleIcon size={13} />
                    </span>{" "}
                    Updating Couture Drape…
                  </div>
                )}

                {/* Error Fallback when asset preview fails to load */}
                {assetErrors[activeTab] ? (
                  <div className="asset-empty-state">
                    <div className="asset-empty-icon-ring error">
                      <AlertTriangleIcon size={24} />
                    </div>
                    <span className="mannequin-badge error">✦ Display Error</span>
                    <h3 className="asset-empty-title">Asset Preview Unavailable</h3>
                    <p className="asset-empty-desc">
                      The media preview for this {activeTab} asset could not be loaded or has expired.
                    </p>
                    {activeTab === "flats" ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, flats: false }));
                          generateFlats();
                        }}
                        disabled={busy}
                      >
                        <RefreshIcon size={14} /> <span>Re-draft Technical Flats</span>
                      </button>
                    ) : activeTab === "tryon" ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, tryon: false }));
                          setActiveWidget("fitting");
                        }}
                      >
                        <MirrorIcon size={14} /> <span>Re-open Fitting Room</span>
                      </button>
                    ) : activeTab === "runway" ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, runway: false }));
                          setActiveWidget("runway");
                        }}
                      >
                        <FilmIcon size={14} /> <span>Re-open Runway Studio</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setAssetErrors((e) => ({ ...e, editorial: false }))}
                      >
                        <RefreshIcon size={14} /> <span>Retry Loading</span>
                      </button>
                    )}
                  </div>
                ) : activeTab === "flats" ? (
                  design.flats_url ? (
                    <img
                      src={design.flats_url}
                      alt="Technical flat sketch"
                      onError={() => setAssetErrors((e) => ({ ...e, flats: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <RulerIcon size={26} />
                      </div>
                      <span className="mannequin-badge">✦ Technical Drawing</span>
                      <h3 className="asset-empty-title">Technical Flats Not Yet Drafted</h3>
                      <p className="asset-empty-desc">
                        Generate 2D architectural flat sketches displaying precise seam lines, hem proportions, pocket placements, and construction stitching.
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={generateFlats}
                        disabled={busy}
                      >
                        <RulerIcon size={14} />
                        <span>{busy ? "Drafting Technical Flats…" : "Draft Technical Flats"}</span>
                      </button>
                    </div>
                  )
                ) : activeTab === "tryon" ? (
                  design.tryon_url ? (
                    <img
                      src={design.tryon_url}
                      alt="Virtual try-on drape"
                      onError={() => setAssetErrors((e) => ({ ...e, tryon: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <MirrorIcon size={26} />
                      </div>
                      <span className="mannequin-badge">✦ Salon Mirror</span>
                      <h3 className="asset-empty-title">Virtual Fitting Not Yet Draped</h3>
                      <p className="asset-empty-desc">
                        Upload your full-length portrait to step into the virtual salon mirror and drape this bespoke creation directly onto your frame.
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setActiveWidget("fitting")}
                      >
                        <MirrorIcon size={14} />
                        <span>Enter Virtual Fitting Room</span>
                      </button>
                    </div>
                  )
                ) : activeTab === "runway" ? (
                  design.runway_url ? (
                    <video
                      src={design.runway_url}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={() => setAssetErrors((e) => ({ ...e, runway: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <FilmIcon size={26} />
                      </div>
                      <span className="mannequin-badge">✦ Haute Couture Runway</span>
                      <h3 className="asset-empty-title">Runway Motion Film Not Yet Rendered</h3>
                      <p className="asset-empty-desc">
                        Direct an 8-second cinematic runway showcase powered by Google Veo to experience the movement, drapery fluidity, and salon lighting.
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setActiveWidget("runway")}
                      >
                        <FilmIcon size={14} />
                        <span>Direct Runway Film</span>
                      </button>
                    </div>
                  )
                ) : (
                  <img
                    src={design.image_url}
                    alt="High-resolution couture garment render"
                    onError={() => setAssetErrors((e) => ({ ...e, editorial: true }))}
                  />
                )}
              </>
            ) : (
              <div className="canvas-placeholder">
                <span className="mannequin-badge">
                  <SparkleIcon size={10} /> Bespoke Canvas
                </span>
                <div className="mannequin-silhouette">
                  <MannequinIcon size={34} />
                </div>
                <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", color: "var(--ink)" }}>
                  The Atelier Mannequin
                </strong>
                <p style={{ margin: 0, fontSize: "0.82rem", maxWidth: "280px", color: "var(--muted)", lineHeight: 1.5 }}>
                  Your bespoke design will be draped here as you speak or describe your silhouette to the Couturier.
                </p>
              </div>
            )}
          </div>

          {/* Garment Details & Spec Ribbon */}
          {design && (
            <>
              <div className="spec-ribbon">
                <span className="spec-chip">
                  <span className="swatch-circle" style={{ background: design.spec.color_hex }} />
                  {design.spec.color_hex}
                </span>
                <span className="spec-chip">{design.spec.garment_type}</span>
                <span className="spec-chip">{design.spec.length}</span>
                <span className="spec-chip">{design.spec.sleeve.replace("_", " ")} sleeve</span>
                <span className="spec-chip">fabric: {design.spec.fabric_id}</span>
                {design.spec.lining && <span className="spec-chip">silk lining</span>}
                {design.spec.embellishments.map((e) => (
                  <span key={e} className="spec-chip">
                    <SparkleIcon size={10} style={{ color: "var(--gold)" }} /> {e}
                  </span>
                ))}
              </div>

              {/* Quick Atelier Actions Toolbar */}
              <div className="showcase-actions">
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "measurements" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "measurements" ? null : "measurements")}
                >
                  <ScissorsIcon size={14} />
                  <span>Measure &amp; Fit</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "fitting" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "fitting" ? null : "fitting")}
                >
                  <MirrorIcon size={14} />
                  <span>Try On Mirror</span>
                </button>
                <button
                  type="button"
                  className="showcase-action-btn"
                  onClick={() => (design.flats_url ? setActiveTab("flats") : generateFlats())}
                  disabled={busy}
                >
                  <RulerIcon size={14} />
                  <span>{design.flats_url ? "View Flats" : "Draft Flats"}</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "runway" ? "active" : ""}`}
                  onClick={() => {
                    setActiveWidget("runway");
                    if (design.runway_url) setActiveTab("runway");
                  }}
                >
                  <FilmIcon size={14} />
                  <span>Film Runway</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "commission" ? "active" : ""}`}
                  onClick={() => {
                    if (quoteData) {
                      setActiveWidget("commission");
                    } else {
                      handleApplyMeasurements("M");
                    }
                  }}
                >
                  <ClipboardIcon size={14} />
                  <span>Tech Pack</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )}
      </main>

      <ArchiveDrawer
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        designs={pastDesigns}
        activeDesignId={design?.design_id ?? null}
        onSelectDesign={selectDesignFromArchive}
        onNewCommission={startOver}
        loading={archiveLoading}
      />
    </div>
  );
}
