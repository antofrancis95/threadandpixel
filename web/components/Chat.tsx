"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CameraIcon,
  ClipboardIcon,
  FilmIcon,
  ImageIcon,
  MannequinIcon,
  MenswearIcon,
  MirrorIcon,
  PartyIcon,
  ScissorsIcon,
  SendIcon,
  SparkleIcon,
  WomenswearIcon,
} from "@/components/icons";
import type { MessageInput } from "@/lib/api";
import type { AtelierAction, ChatMessage } from "@/lib/types";
import { MicButton } from "./MicButton";

export function Chat({
  messages,
  busy,
  onSend,
  headerAction,
  hasDesign,
  suggestedAction = null,
  activeWidget,
  onSelectWidget,
  widgetContent,
  voiceActive = false,
  voiceVolume = 0,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (msg: MessageInput) => void;
  headerAction?: ReactNode;
  hasDesign: boolean;
  suggestedAction?: AtelierAction;
  activeWidget: AtelierAction;
  onSelectWidget: (widget: AtelierAction) => void;
  widgetContent?: ReactNode;
  voiceActive?: boolean;
  voiceVolume?: number;
}) {
  const [text, setText] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTo({
        top: streamRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, activeWidget]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    onSelectWidget(null);
    onSend({ text: text.trim() });
    setText("");
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <div>
          <h2>The Couturier</h2>
          <span className="panel-subtitle" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Bespoke Couture Consultation</span>
        </div>
        {headerAction}
      </div>

      <div className="messages-stream" ref={streamRef}>
        {messages.length === 0 && (
          <div className="message-row model">
            <div className="bubble model">
              <span className="couturier-badge">
                <SparkleIcon size={12} style={{ color: "var(--gold)" }} /> Master Couturier
              </span>
              <p style={{ margin: 0 }}>
                Welcome to the Thread &amp; Pixel atelier. What would you like to design today, or do you have a design in mind? You can upload a design sketch to generate an outfit from it, tell me your occasion and share your photo for a bespoke creation, or describe your dream silhouette:
              </p>
              <div className="action-chips" style={{ marginTop: "0.85rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="chip-btn highlight"
                  onClick={() => onSelectWidget("design_upload")}
                >
                  <ImageIcon size={13} style={{ color: "var(--gold)" }} />
                  <span>“Upload Design Image”</span>
                </button>
                <button
                  type="button"
                  className="chip-btn highlight"
                  onClick={() => onSelectWidget("occasion_stylist")}
                >
                  <PartyIcon size={13} style={{ color: "var(--gold)" }} />
                  <span>“Design for an Occasion”</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    onSelectWidget(null);
                    onSend({ text: "A bespoke midnight navy wool-suiting tuxedo with satin peak lapels for a gentleman." });
                  }}
                >
                  <MannequinIcon size={12} />
                  <span>“Gentleman's evening tuxedo”</span>
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    onSelectWidget(null);
                    onSend({ text: "A pastel blue chiffon maxi dress for an evening gala with sheer flutter sleeves for a lady." });
                  }}
                >
                  <SparkleIcon size={12} />
                  <span>“Lady's pastel blue gown”</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isLatestModel = m.role === "model" && i === messages.length - 1;
          return (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`bubble ${m.role} ${m.live ? "live-indicator" : ""}`}>
                {m.role === "model" && (
                  <span className="couturier-badge">
                    <SparkleIcon size={12} style={{ color: "var(--gold)" }} /> Master Couturier
                  </span>
                )}
                {m.text}

                {/* Proactive Gender Selection Banner when Couturier prompts for gender in chat */}
                {isLatestModel && (suggestedAction === "gender" || /gentleman|lady|menswear|womenswear/i.test(m.text)) && (
                  <div
                    className="gender-prompt-banner"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      marginTop: "0.75rem",
                      padding: "0.6rem 0.8rem",
                      background: "var(--ivory)",
                      border: "1px solid var(--gold-light)",
                      borderRadius: "var(--radius-md)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gold-dark)" }}>
                      Tailoring Target:
                    </span>
                    <button
                      type="button"
                      className="chip-btn highlight"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.8rem",
                        background: "var(--surface)",
                        borderColor: "var(--gold)",
                      }}
                      onClick={() => {
                        onSelectWidget(null);
                        onSend({ text: "Tailor this piece for a gentleman (menswear)." });
                      }}
                    >
                      <MenswearIcon size={13} />
                      <span>Gentleman · Menswear</span>
                    </button>
                    <button
                      type="button"
                      className="chip-btn highlight"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.8rem",
                        background: "var(--surface)",
                        borderColor: "var(--gold)",
                      }}
                      onClick={() => {
                        onSelectWidget(null);
                        onSend({ text: "Tailor this piece for a lady (womenswear)." });
                      }}
                    >
                      <WomenswearIcon size={13} />
                      <span>Lady · Womenswear</span>
                    </button>
                  </div>
                )}

                {/* Proactive Consultation Specs Banner when Couturier asks for color, fit, fabric, size */}
                {isLatestModel && (suggestedAction === "consultation" || (/color|fit|fabric|size/i.test(m.text) && suggestedAction !== "measurements" && suggestedAction !== "fitting")) && (
                  <div
                    className="consultation-prompt-banner"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.55rem",
                      marginTop: "0.75rem",
                      padding: "0.7rem 0.85rem",
                      background: "var(--ivory)",
                      border: "1px solid var(--gold-light)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <SparkleIcon size={12} style={{ color: "var(--gold)" }} />
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gold-dark)" }}>
                        Bespoke Consultation Specs:
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="chip-btn highlight"
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          background: "var(--surface)",
                          borderColor: "var(--gold)",
                        }}
                        onClick={() => {
                          onSelectWidget(null);
                          onSend({ text: "Midnight navy, slim athletic fit, pique cotton, size Large." });
                        }}
                      >
                        <span>Navy · Slim Fit · Pique Cotton · L</span>
                      </button>
                      <button
                        type="button"
                        className="chip-btn highlight"
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          background: "var(--surface)",
                          borderColor: "var(--gold)",
                        }}
                        onClick={() => {
                          onSelectWidget(null);
                          onSend({ text: "Crisp white, tailored fit, cotton jersey, size Medium." });
                        }}
                      >
                        <span>White · Tailored · Cotton · M</span>
                      </button>
                      <button
                        type="button"
                        className="chip-btn highlight"
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          background: "var(--surface)",
                          borderColor: "var(--gold)",
                        }}
                        onClick={() => {
                          onSelectWidget(null);
                          onSend({ text: "Forest green, relaxed drape, linen, size XL." });
                        }}
                      >
                        <span>Forest Green · Relaxed · Linen · XL</span>
                      </button>
                      <button
                        type="button"
                        className="chip-btn"
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          background: "var(--surface)",
                        }}
                        onClick={() => {
                          onSelectWidget(null);
                          onSend({ text: "Please go ahead and sketch your recommended design for this piece in size Medium." });
                        }}
                      >
                        <span>“Sketch recommended design (Size M)”</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Proactive Action Chips below latest Couturier message */}
                {isLatestModel && suggestedAction !== "consultation" && (
                  <div className="action-chips">
                    {suggestedAction === "design_upload" && (
                      <button
                        type="button"
                        className="chip-btn highlight"
                        onClick={() => onSelectWidget(activeWidget === "design_upload" ? null : "design_upload")}
                      >
                        <ImageIcon size={13} />
                        <span>Upload Design Image</span>
                      </button>
                    )}
                    {suggestedAction === "occasion_stylist" && (
                      <button
                        type="button"
                        className="chip-btn highlight"
                        onClick={() => onSelectWidget(activeWidget === "occasion_stylist" ? null : "occasion_stylist")}
                      >
                        <PartyIcon size={13} />
                        <span>Design for Occasion</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={`chip-btn ${suggestedAction === "measurements" ? "highlight" : ""}`}
                      onClick={() => onSelectWidget(activeWidget === "measurements" ? null : "measurements")}
                    >
                      <ScissorsIcon size={13} />
                      <span>Bespoke Measurements</span>
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${suggestedAction === "fitting" ? "highlight" : ""}`}
                      onClick={() => onSelectWidget(activeWidget === "fitting" ? null : "fitting")}
                    >
                      <MirrorIcon size={13} />
                      <span>Virtual Fitting Room</span>
                    </button>
                    {!hasDesign && (
                      <>
                        <button
                          type="button"
                          className={`chip-btn ${suggestedAction === "design_upload" ? "highlight" : ""}`}
                          onClick={() => onSelectWidget(activeWidget === "design_upload" ? null : "design_upload")}
                        >
                          <ImageIcon size={13} />
                          <span>Upload Design Image</span>
                        </button>
                        <button
                          type="button"
                          className={`chip-btn ${suggestedAction === "occasion_stylist" ? "highlight" : ""}`}
                          onClick={() => onSelectWidget(activeWidget === "occasion_stylist" ? null : "occasion_stylist")}
                        >
                          <PartyIcon size={13} />
                          <span>Design for Occasion</span>
                        </button>
                      </>
                    )}
                    {hasDesign && (
                      <>
                        <button
                          type="button"
                          className={`chip-btn ${suggestedAction === "runway" ? "highlight" : ""}`}
                          onClick={() => onSelectWidget(activeWidget === "runway" ? null : "runway")}
                        >
                          <FilmIcon size={13} />
                          <span>Film Runway</span>
                        </button>
                        <button
                          type="button"
                          className={`chip-btn ${suggestedAction === "commission" ? "highlight" : ""}`}
                          onClick={() => onSelectWidget(activeWidget === "commission" ? null : "commission")}
                        >
                          <ClipboardIcon size={13} />
                          <span>Tech Pack &amp; Quote</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="message-row model">
            <div className="bubble model" style={{ fontStyle: "italic", color: "var(--gold-dark)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span className="spin-silk"><SparkleIcon size={13} /></span> Draping silhouette &amp; weaving fabrics…
            </div>
          </div>
        )}

        {/* Dynamic In-Stream Interactive Widget */}
        {activeWidget && widgetContent && (
          <div className="message-row model" style={{ width: "100%" }}>
            {widgetContent}
          </div>
        )}
      </div>

      {voiceActive && (
        <div className="voice-spectrum-bar" role="status" aria-live="polite">
          <div className="voice-spectrum-label">
            <span className="voice-pulse-dot" />
            <span>Live Voice active · Couturier listening</span>
          </div>
          <div className="voice-spectrum-bars" aria-hidden="true">
            {[0.4, 0.7, 1.0, 0.85, 0.5, 0.95, 0.65, 0.35].map((multiplier, idx) => {
              const dynamicScale = Math.max(0.18, Math.min(1.0, voiceVolume * multiplier * 1.5 + 0.12));
              return (
                <span
                  key={idx}
                  className="voice-bar"
                  style={{
                    transform: `scaleY(${dynamicScale})`,
                    opacity: voiceVolume > 0.05 ? 0.95 : 0.45,
                  }}
                />
              );
            })}
          </div>
          <span className="voice-spectrum-hint">Speak naturally</span>
        </div>
      )}

      <form
        className={`composer-atelier ${voiceActive ? "voice-active" : ""}`}
        onSubmit={submit}
        style={
          voiceActive
            ? ({
                "--voice-vol": voiceVolume,
              } as React.CSSProperties)
            : undefined
        }
      >
        <MicButton
          disabled={busy}
          onAudio={(audio_b64, audio_mime) => {
            onSelectWidget(null);
            onSend({ audio_b64, audio_mime });
          }}
        />
        <button
          type="button"
          className={`composer-icon-btn ${activeWidget === "design_upload" ? "active" : ""}`}
          onClick={() => onSelectWidget(activeWidget === "design_upload" ? null : "design_upload")}
          title="Upload a design image or sketch"
          aria-label="Upload a design image"
          disabled={busy}
        >
          <ImageIcon size={17} />
        </button>
        <button
          type="button"
          className={`composer-icon-btn ${activeWidget === "occasion_stylist" ? "active" : ""}`}
          onClick={() => onSelectWidget(activeWidget === "occasion_stylist" ? null : "occasion_stylist")}
          title="Design an outfit for your occasion"
          aria-label="Design an outfit for your occasion"
          disabled={busy}
        >
          <PartyIcon size={17} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            voiceActive
              ? "Listening… speak freely to Couturier or refine here..."
              : "Describe or refine your silhouette (e.g., 'make the sleeves sheer')..."
          }
          maxLength={2000}
          disabled={busy}
        />
        <button type="submit" className="primary composer-send-btn" disabled={busy || !text.trim()} aria-label="Send">
          <SendIcon size={17} className="composer-send-icon" />
          <span className="composer-send-label">Send</span>
        </button>
      </form>
    </section>
  );
}
