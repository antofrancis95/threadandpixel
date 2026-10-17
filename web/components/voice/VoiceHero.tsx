"use client";

import { CloseIcon, MicIcon, MicOffIcon, RefreshIcon } from "@/components/icons";
import type { VoiceController, VoiceTool } from "@/components/LiveVoice";
import { VoiceThread } from "./VoiceThread";

export const TOOL_LABELS: Record<VoiceTool, string> = {
  update_design: "Sketching the garment",
  draft_flats: "Drafting the technical flats",
  open_fitting: "Opening the fitting room",
  generate_runway: "Directing the runway film",
  get_quote: "Preparing your estimate",
  open_design_upload: "Opening the upload card",
  open_occasion_stylist: "Opening the occasion stylist",
};

export const EXAMPLE_UTTERANCES = [
  "A navy linen shirt dress with a relaxed drape",
  "A charcoal wool tuxedo with satin peak lapels",
  "Something for a summer wedding by the sea",
];

type StatusCopy = { primary: string; secondary?: string };

/** One sentence per state, so the client always knows what the Couturier is doing. */
export function voiceStatus(v: VoiceController, compact = false, hint?: string): StatusCopy {
  const toolLine = v.tool ? (compact ? `${TOOL_LABELS[v.tool]}…` : `${TOOL_LABELS[v.tool]}… you can keep talking`) : undefined;
  switch (v.phase) {
    case "idle":
      if (v.micPermission === "denied") {
        return { primary: "Talk live", secondary: "Your browser is blocking the microphone for this site." };
      }
      return compact
        ? { primary: "Talk live", secondary: hint ?? "Hands-free. Say what to change and the Couturier does it." }
        : { primary: "Tap the mic and describe the piece you have in mind." };
    case "connecting":
      return { primary: "Opening the salon…" };
    case "listening":
      if (v.muted) return { primary: "Microphone muted", secondary: toolLine ?? "Unmute to continue." };
      return { primary: "Listening", secondary: toolLine ?? (compact ? undefined : "Speak naturally. You can interrupt at any time.") };
    case "thinking":
      return { primary: "Considering…", secondary: toolLine };
    case "speaking":
      return { primary: "The Couturier is speaking", secondary: toolLine };
    case "dropped":
      return { primary: "The line went quiet", secondary: "The salon ended the call. Reconnect to carry on where you left off." };
    case "error": {
      const kind = v.error?.kind;
      const primary = kind === "mic" ? "Microphone blocked" : kind === "auth" ? "Not signed in" : "Couldn't reach the salon";
      return { primary, secondary: v.error?.message };
    }
  }
}

function MicButton({ voice, size }: { voice: VoiceController; size: "lg" | "sm" }) {
  const { phase, muted, active } = voice;
  const connecting = phase === "connecting";
  const label = active
    ? muted
      ? "Unmute the microphone"
      : "Mute the microphone"
    : "Talk live with the Couturier";
  return (
    <button
      type="button"
      className={`voice-mic voice-mic-${size}`}
      data-phase={phase}
      data-muted={muted || undefined}
      onClick={active ? voice.toggleMute : voice.start}
      disabled={connecting}
      aria-label={label}
      aria-pressed={active ? muted : undefined}
      title={label}
    >
      {active && muted ? <MicOffIcon size={size === "lg" ? 30 : 18} /> : <MicIcon size={size === "lg" ? 30 : 18} />}
    </button>
  );
}

function Captions({ voice, compact }: { voice: VoiceController; compact?: boolean }) {
  const { user, model, modelInterrupted } = voice.captions;
  if (!user && !model) return null;
  // The dock has one line of room: the Couturier's words win while they are arriving.
  if (compact) {
    const showModel = Boolean(model);
    return (
      <p className={`voice-caption ${showModel ? "model" : "user"} ${showModel && modelInterrupted ? "cut" : ""}`} aria-live="off">
        <span className="voice-caption-who">{showModel ? "Couturier" : "You"}</span>
        <span className="voice-caption-text">{showModel ? model : user}</span>
      </p>
    );
  }
  return (
    <div className="voice-captions" aria-live="off">
      {user && (
        <p className="voice-caption user">
          <span className="voice-caption-who">You</span>
          <span className="voice-caption-text">{user}</span>
        </p>
      )}
      {model && (
        <p className={`voice-caption model ${modelInterrupted ? "cut" : ""}`}>
          <span className="voice-caption-who">Couturier</span>
          <span className="voice-caption-text">{model}</span>
        </p>
      )}
    </div>
  );
}

function Announcer({ voice }: { voice: VoiceController }) {
  const status = voiceStatus(voice, true);
  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {status.primary}
        {voice.tool ? `. ${TOOL_LABELS[voice.tool]}` : ""}
      </span>
      <span className="sr-only" aria-live="polite">
        {voice.lastModelTurn}
      </span>
    </>
  );
}

function Notice({ voice }: { voice: VoiceController }) {
  if (!voice.notice) return null;
  return (
    <p className="voice-notice" role="status">
      <span>{voice.notice}</span>
      <button type="button" className="voice-notice-close" onClick={voice.dismissNotice} aria-label="Dismiss">
        <CloseIcon size={12} />
      </button>
    </p>
  );
}

export function VoiceHero({
  voice,
  variant,
  onSay,
  hint,
}: {
  voice: VoiceController;
  variant: "hero" | "dock" | "floating";
  /** Dock, idle: what the client could do next. */
  hint?: string;
  /** The client picked an example sentence; send it as if typed. */
  onSay?: (text: string) => void;
}) {
  const ended = voice.phase === "error" || voice.phase === "dropped";
  const status = voiceStatus(voice, variant !== "hero", hint);

  if (variant === "hero") {
    return (
      <section className="voice-hero" data-phase={voice.phase} data-tool={voice.tool ?? undefined} aria-labelledby="voice-hero-title">
        <h3 className="voice-title" id="voice-hero-title">
          Speak a garment <em>into being</em>.
        </h3>
        <p className="voice-lede">Tell the Couturier what you have in mind. It listens, sketches, and answers out loud.</p>

        <div className="voice-stage">
          <MicButton voice={voice} size="lg" />
          <VoiceThread phase={voice.phase} tool={voice.tool} muted={voice.muted} levels={voice.levels} shape="siri" size={240} barHeight={64} />
        </div>

        <div className="voice-status">
          <p className="voice-status-primary">{status.primary}</p>
          {status.secondary && <p className="voice-status-secondary">{status.secondary}</p>}
        </div>

        <Captions voice={voice} />
        <Notice voice={voice} />

        {voice.active && (
          <div className="voice-controls">
            <button type="button" className="voice-ctl" onClick={voice.toggleMute} aria-pressed={voice.muted}>
              {voice.muted ? <MicOffIcon size={14} /> : <MicIcon size={14} />}
              <span>{voice.muted ? "Unmute" : "Mute"}</span>
            </button>
            <button type="button" className="voice-ctl end" onClick={voice.stop}>
              <CloseIcon size={13} />
              <span>End</span>
            </button>
          </div>
        )}

        {ended && (
          <div className="voice-controls">
            <button type="button" className="voice-ctl primary" onClick={voice.start}>
              <RefreshIcon size={14} />
              <span>{voice.phase === "dropped" ? "Reconnect" : "Try again"}</span>
            </button>
            <button type="button" className="voice-ctl" onClick={voice.stop}>
              <span>Not now</span>
            </button>
          </div>
        )}

        {voice.phase === "idle" && onSay && (
          <div className="voice-examples">
            <span className="voice-examples-label">Try saying</span>
            <div className="voice-example-chips">
              {EXAMPLE_UTTERANCES.map((text) => (
                <button key={text} type="button" className="voice-example" onClick={() => onSay(text)}>
                  “{text}”
                </button>
              ))}
            </div>
            <span className="voice-examples-hint">Or type below. Everything you can say, you can also write.</span>
          </div>
        )}

        <Announcer voice={voice} />
      </section>
    );
  }

  return (
    <div className={`voice-dock ${variant === "floating" ? "floating" : ""}`} data-phase={voice.phase} data-tool={voice.tool ?? undefined}>
      {voice.active ? (
        <>
          <MicButton voice={voice} size="sm" />
          <div className="voice-dock-text">
            <p className="voice-status-primary">
              {status.primary}
              {status.secondary && <span className="voice-status-secondary"> · {status.secondary}</span>}
            </p>
            <Captions voice={voice} compact />
          </div>
          <VoiceThread phase={voice.phase} tool={voice.tool} muted={voice.muted} levels={voice.levels} shape="siri" size={132} barHeight={40} />
          <button type="button" className="voice-ctl end" onClick={voice.stop} aria-label="End the conversation" title="End the conversation">
            <CloseIcon size={13} />
            <span>End</span>
          </button>
          <Notice voice={voice} />
        </>
      ) : ended ? (
        <>
          <div className="voice-dock-text">
            <p className="voice-status-primary">{status.primary}</p>
            {status.secondary && <p className="voice-status-secondary">{status.secondary}</p>}
          </div>
          <button type="button" className="voice-ctl primary" onClick={voice.start}>
            <RefreshIcon size={14} />
            <span>{voice.phase === "dropped" ? "Reconnect" : "Try again"}</span>
          </button>
          <button type="button" className="voice-ctl" onClick={voice.stop} aria-label="Dismiss">
            <CloseIcon size={13} />
          </button>
        </>
      ) : (
        <>
          <MicButton voice={voice} size="sm" />
          <div className="voice-dock-text">
            <p className="voice-status-primary">{status.primary}</p>
            {status.secondary && <p className="voice-status-secondary">{status.secondary}</p>}
          </div>
        </>
      )}
      <Announcer voice={voice} />
    </div>
  );
}
