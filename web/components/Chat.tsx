"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckIcon,
  ImageIcon,
  PartyIcon,
  PlusIcon,
  SendIcon,
  SparkleIcon,
} from "@/components/icons";
import type { MessageInput } from "@/lib/api";
import type { StepAction, StepChip } from "@/lib/nextStep";
import type { AtelierAction, ChatMessage } from "@/lib/types";
import type { VoiceController } from "./LiveVoice";
import { VoiceHero } from "./voice/VoiceHero";

export function Chat({
  messages,
  busy,
  onSend,
  headerAction,
  activeWidget,
  onSelectWidget,
  widgetContent,
  voice,
  chips,
  onChip,
  dockHint,
  sealed,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (msg: MessageInput) => void;
  headerAction?: ReactNode;
  activeWidget: AtelierAction;
  onSelectWidget: (widget: AtelierAction) => void;
  widgetContent?: ReactNode;
  voice: VoiceController;
  /** Sentence chips under the Couturier's latest message, from lib/nextStep. */
  chips: StepChip[];
  onChip: (action: StepAction) => void;
  /** What comes next, shown beside the idle mic in the dock. */
  dockHint?: string;
  /** The piece is commissioned: the conversation is closed and only a new commission goes on. */
  sealed?: { orderId: string; onNewCommission: () => void };
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

  function say(utterance: string) {
    onSelectWidget(null);
    onSend({ text: utterance });
  }

  return (
    <section className="panel chat-panel" aria-label="Conversation with the Couturier">
      <div className="panel-head">
        <div>
          <h2>The Couturier</h2>
          <span className="panel-subtitle" style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Bespoke Couture Consultation</span>
        </div>
        {headerAction}
      </div>

      <div className="messages-stream" ref={streamRef}>
        {messages.length === 0 && !voice.active && !activeWidget && (
          <>
            <VoiceHero voice={voice} variant="hero" onSay={say} />
            <div className="voice-hero-alt">
              <span className="voice-examples-label">Or start from</span>
              <button type="button" className="chip-btn" onClick={() => onSelectWidget("design_upload")}>
                <ImageIcon size={13} />
                <span>A sketch or photo</span>
              </button>
              <button type="button" className="chip-btn" onClick={() => onSelectWidget("occasion_stylist")}>
                <PartyIcon size={13} />
                <span>An occasion</span>
              </button>
            </div>
          </>
        )}

        {messages.map((m, i) => {
          const isLatestModel = m.role === "model" && i === messages.length - 1;
          if (m.kind === "note") {
            return (
              <div key={i} className="message-row note" role="status">
                <span className="chat-note">{m.text}</span>
              </div>
            );
          }
          return (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`bubble ${m.role} ${m.live ? "live-indicator" : ""} ${m.interrupted ? "cut" : ""}`}>
                {m.role === "model" && (
                  <span className="couturier-badge">
                    <SparkleIcon size={12} style={{ color: "var(--gold)" }} /> Master Couturier
                  </span>
                )}
                {m.text}
                {m.interrupted && <span className="bubble-cut" title="You spoke over this"> —</span>}

                {isLatestModel && chips.length > 0 && (
                  <div className="action-chips" role="group" aria-label="Suggested next steps">
                    {chips.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        className={`chip-btn say-chip ${c.primary ? "highlight" : ""}`}
                        onClick={() => onChip(c.action)}
                      >
                        <span aria-hidden="true">“</span>
                        {c.label}
                        <span aria-hidden="true">”</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && !voice.active && (
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

      {sealed ? (
        <div className="composer-sealed" role="status">
          <span className="composer-sealed-mark" aria-hidden="true">
            <CheckIcon size={15} />
          </span>
          <span className="composer-sealed-text">
            <strong>Commissioned · #{sealed.orderId.slice(0, 8)}</strong>
            <span>Sent to the atelier, so this piece is sealed. Your next idea starts a new commission.</span>
          </span>
          <button type="button" className="primary" onClick={sealed.onNewCommission}>
            <PlusIcon size={14} />
            <span>Start a new commission</span>
          </button>
        </div>
      ) : (
        <>
          {(messages.length > 0 || voice.active || activeWidget) && <VoiceHero voice={voice} variant="dock" hint={dockHint} />}

          <form className="composer-atelier" onSubmit={submit}>
            <button
              type="button"
              className="secondary icon"
              onClick={() => onSelectWidget(activeWidget === "design_upload" ? null : "design_upload")}
              title="Upload a design image or sketch"
              aria-label="Upload a design image"
              aria-pressed={activeWidget === "design_upload"}
            >
              <ImageIcon size={17} />
            </button>
            <button
              type="button"
              className="secondary icon"
              onClick={() => onSelectWidget(activeWidget === "occasion_stylist" ? null : "occasion_stylist")}
              title="Design an outfit for your occasion"
              aria-label="Design an outfit for your occasion"
              aria-pressed={activeWidget === "occasion_stylist"}
            >
              <PartyIcon size={17} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                voice.active
                  ? "Type to the Couturier, or just say it…"
                  : "Describe or refine your silhouette, e.g. “make the sleeves sheer”"
              }
              maxLength={2000}
              aria-label="Message the Couturier"
            />
            <button type="submit" className="primary composer-send-btn" disabled={busy || !text.trim()} aria-label="Send">
              <SendIcon size={17} className="composer-send-icon" />
              <span className="composer-send-label">Send</span>
            </button>
          </form>
        </>
      )}
    </section>
  );
}
