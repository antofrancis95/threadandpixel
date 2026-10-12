"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { MessageInput } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { MicButton } from "./MicButton";

export function Chat({
  messages,
  busy,
  onSend,
  headerAction,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (msg: MessageInput) => void;
  headerAction?: ReactNode;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    onSend({ text: text.trim() });
    setText("");
  }

  return (
    <section className="panel chat">
      <div className="panel-head">
        <h2>AI Tailor</h2>
        {headerAction}
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <p className="hint">
            Describe your dream garment, or tap the mic. For example: “A flowy pastel blue maxi dress for a summer
            wedding, with floral embroidery on the hem.”
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="bubble model typing">Designing…</div>}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={submit}>
        <MicButton disabled={busy} onAudio={(audio_b64, audio_mime) => onSend({ audio_b64, audio_mime })} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe or refine your design…"
          maxLength={2000}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
