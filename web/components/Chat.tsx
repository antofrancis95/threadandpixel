"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ClipboardIcon,
  FilmIcon,
  MirrorIcon,
  ScissorsIcon,
  SparkleIcon,
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
    onSend({ text: text.trim() });
    setText("");
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <div>
          <h2>The Couturier</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Bespoke Couture Consultation</span>
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
                Welcome to the Thread &amp; Pixel atelier. Describe your dream silhouette, occasion, or fabrics, or tap <strong>Talk live</strong> to speak directly with me.
              </p>
              <div className="action-chips" style={{ marginTop: "0.8rem" }}>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onSend({ text: "A pastel blue chiffon maxi dress for an evening gala with sheer flutter sleeves." })}
                >
                  “Pastel blue evening gown”
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onSend({ text: "An ivory linen tailored jumpsuit with architectural lapels." })}
                >
                  “Ivory tailored jumpsuit”
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

                {/* Proactive Action Chips below latest Couturier message */}
                {isLatestModel && (
                  <div className="action-chips">
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

      <form className="composer-atelier" onSubmit={submit}>
        <MicButton disabled={busy} onAudio={(audio_b64, audio_mime) => onSend({ audio_b64, audio_mime })} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe or refine your silhouette (e.g., 'make the sleeves sheer')..."
          maxLength={2000}
          disabled={busy}
        />
        <button type="submit" className="primary" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
