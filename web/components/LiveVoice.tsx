"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useApp } from "@/lib/providers";
import type { AtelierAction, Design, QuoteResponse } from "@/lib/types";

// Captures mic audio as 16 kHz mono PCM16 in ~100 ms chunks.
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.chunks = []; this.size = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const pcm = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.chunks.push(pcm);
      this.size += pcm.length;
      if (this.size >= 1600) {
        const out = new Int16Array(this.size);
        let o = 0;
        for (const c of this.chunks) { out.set(c, o); o += c.length; }
        this.port.postMessage(out.buffer, [out.buffer]);
        this.chunks = []; this.size = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

/**
 * Voice session state machine.
 *
 *   idle ─▶ connecting ─▶ listening ◀─▶ thinking ◀─▶ speaking
 *                             │
 *                             ├─▶ dropped   (the server closed the line)
 *                             └─▶ error     (mic refused, auth, or the socket failed)
 *
 * A running tool (sketching, drafting flats…) is tracked beside the phase, because
 * the Couturier keeps talking while the atelier works in the background.
 *
 * The WebSocket protocol with api/app/live.py is unchanged.
 */
export type VoicePhase = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "dropped" | "error";

export type VoiceTool =
  | "update_design"
  | "draft_flats"
  | "open_fitting"
  | "generate_runway"
  | "get_quote"
  | "open_design_upload"
  | "open_occasion_stylist";

export type VoiceErrorKind = "mic" | "auth" | "connection";

export type VoiceCaptions = {
  /** What the client said in the current turn (streamed in). */
  user: string;
  /** What the Couturier is saying in reply (streamed in). */
  model: string;
  /** The client spoke over the Couturier; the model text above was cut short. */
  modelInterrupted: boolean;
};

export type VoiceLevels = { mic: number; out: number };

export type MicPermission = "unknown" | "prompt" | "granted" | "denied";

export type VoiceState = {
  phase: VoicePhase;
  tool: VoiceTool | null;
  muted: boolean;
  /** A non-fatal problem reported by the server; the session continues. */
  notice: string | null;
  /** Why the session ended (phase "error"). */
  error: { kind: VoiceErrorKind; message: string } | null;
  captions: VoiceCaptions;
  /** The Couturier's last finished sentence; announced to assistive tech. */
  lastModelTurn: string;
  micPermission: MicPermission;
};

export type VoiceController = VoiceState & {
  /** True from connecting through to a live conversation. */
  active: boolean;
  /** Mic and playback loudness (0..1), updated per animation frame for the visuals. */
  levels: MutableRefObject<VoiceLevels>;
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
  sendMessage: (text: string) => void;
  setDesignId: (id: string) => void;
  dismissNotice: () => void;
};

export interface LiveVoiceOptions {
  designId: string | null;
  onTranscript: (role: "user" | "model", text: string) => void;
  onTurnComplete: () => void;
  onInterrupted?: () => void;
  onDesign: (design: Design) => void;
  onFlats?: (flatsUrl: string) => void;
  onWidget?: (widget: AtelierAction, occasion?: string, gender?: string) => void;
  onRunwayStarted?: (job: unknown) => void;
  onQuote?: (quote: QuoteResponse) => void;
  /** Recent conversation, sent on connect so a re-established line resumes instead of starting cold. */
  getHistory?: () => { role: "user" | "model"; text: string }[];
  onToolStart?: (tool: VoiceTool) => void;
  onUserSpeech?: () => void;
}

type ServerEvent =
  | { type: "ready" | "turn_complete" | "interrupted" }
  | { type: "transcript"; role: "user" | "model"; text: string }
  | { type: "designing"; request: string }
  | { type: "tool_start"; tool: string; request?: string }
  | { type: "design"; design: Design }
  | { type: "flats"; flats_url: string }
  | { type: "widget"; widget: AtelierAction; occasion?: string; gender?: string }
  | { type: "runway_started"; job: unknown }
  | { type: "quote"; quote: QuoteResponse }
  | { type: "error"; message: string };

const KNOWN_TOOLS: VoiceTool[] = [
  "update_design",
  "draft_flats",
  "open_fitting",
  "generate_runway",
  "get_quote",
  "open_design_upload",
  "open_occasion_stylist",
];

const ACTIVE_PHASES: VoicePhase[] = ["connecting", "listening", "thinking", "speaking"];

// If nothing comes back after the client stops speaking, fall back to listening
// so the hero never shows "Considering…" forever.
const THINKING_TIMEOUT_MS = 15_000;
// Playback chunks arrive with small gaps; wait this long before saying the Couturier stopped.
const SPEAKING_GRACE_MS = 320;
const NOTICE_TTL_MS = 9_000;

const EMPTY_CAPTIONS: VoiceCaptions = { user: "", model: "", modelInterrupted: false };

const INITIAL: VoiceState = {
  phase: "idle",
  tool: null,
  muted: false,
  notice: null,
  error: null,
  captions: EMPTY_CAPTIONS,
  lastModelTurn: "",
  micPermission: "unknown",
};

export function useLiveVoice(options: LiveVoiceOptions): VoiceController {
  const { auth, api } = useApp();
  const [state, setState] = useState<VoiceState>(INITIAL);

  const opts = useRef(options);
  opts.current = options;

  const stateRef = useRef<VoiceState>(INITIAL);
  const levels = useRef<VoiceLevels>({ mic: 0, out: 0 });
  const mutedRef = useRef(false);
  const session = useRef<{ stop: (finalPhase: VoicePhase) => void } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const noticeTimer = useRef<number | null>(null);

  // Synchronous: the socket handlers read stateRef right after patching, before React re-renders.
  const patch = useCallback((p: Partial<VoiceState> | ((s: VoiceState) => Partial<VoiceState>)) => {
    const prev = stateRef.current;
    const next = { ...prev, ...(typeof p === "function" ? p(prev) : p) };
    stateRef.current = next;
    setState(next);
  }, []);

  // Ask the browser about the mic up front so the hero can warn before the first tap.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const nav = navigator as Navigator & { permissions?: Permissions };
    nav.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((s) => {
        status = s;
        patch({ micPermission: s.state as MicPermission });
        s.onchange = () => patch({ micPermission: s.state as MicPermission });
      })
      .catch(() => patch({ micPermission: "unknown" }));
    return () => {
      if (status) status.onchange = null;
    };
  }, [patch]);

  useEffect(() => () => session.current?.stop("idle"), []);

  const showNotice = useCallback(
    (message: string) => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      patch({ notice: message });
      noticeTimer.current = window.setTimeout(() => patch({ notice: null }), NOTICE_TTL_MS);
    },
    [patch],
  );

  const start = useCallback(async () => {
    if (ACTIVE_PHASES.includes(stateRef.current.phase)) return;
    mutedRef.current = false;
    patch({ phase: "connecting", error: null, notice: null, tool: null, muted: false, captions: EMPTY_CAPTIONS });

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      patch({ phase: "error", error: { kind: "auth", message: "You are not signed in yet." } });
      return;
    }

    const ws = new WebSocket(api.liveUrl());
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    // Both contexts are created inside the user's tap so autoplay policy is satisfied.
    const playback = new AudioContext({ sampleRate: 24000 });
    const outAnalyser = playback.createAnalyser();
    outAnalyser.fftSize = 64;
    outAnalyser.smoothingTimeConstant = 0.55;
    outAnalyser.connect(playback.destination);
    const outData = new Uint8Array(new ArrayBuffer(outAnalyser.frequencyBinCount));

    const playing = new Set<AudioBufferSourceNode>();
    let nextTime = 0;
    let lastChunkAt = 0;
    let capture: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let micAnalyser: AnalyserNode | null = null;
    let micData: Uint8Array<ArrayBuffer> | null = null;
    let stopped = false;
    let frame: number | null = null;
    let thinkingTimer: number | null = null;

    // Caption bookkeeping for the current turn.
    let lastRole: "user" | "model" | null = null;
    let turnDone = true;

    const setPhase = (phase: VoicePhase) => {
      if (stopped) return;
      if (stateRef.current.phase === phase) return;
      patch({ phase });
    };

    const clearThinking = () => {
      if (thinkingTimer !== null) {
        window.clearTimeout(thinkingTimer);
        thinkingTimer = null;
      }
    };

    const enterThinking = () => {
      clearThinking();
      setPhase("thinking");
      thinkingTimer = window.setTimeout(() => {
        thinkingTimer = null;
        if (stateRef.current.phase === "thinking") setPhase("listening");
      }, THINKING_TIMEOUT_MS);
    };

    const stopPlayback = () => {
      playing.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already ended */
        }
      });
      playing.clear();
      nextTime = 0;
    };

    const stop = (finalPhase: VoicePhase) => {
      if (stopped) return;
      stopped = true;
      wsRef.current = null;
      clearThinking();
      if (frame !== null) cancelAnimationFrame(frame);
      levels.current = { mic: 0, out: 0 };
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "stop" }));
        } catch {
          /* closing anyway */
        }
      }
      ws.close();
      stopPlayback();
      stream?.getTracks().forEach((t) => t.stop());
      capture?.close().catch(() => {});
      playback.close().catch(() => {});
      session.current = null;
      patch({ phase: finalPhase, tool: null, muted: false });
    };
    session.current = { stop };

    const play = (data: ArrayBuffer) => {
      const pcm = new Int16Array(data);
      const samples = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
      const buffer = playback.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(samples, 0);
      const src = playback.createBufferSource();
      src.buffer = buffer;
      src.connect(outAnalyser);
      nextTime = Math.max(nextTime, playback.currentTime);
      src.start(nextTime);
      nextTime += buffer.duration;
      playing.add(src);
      src.onended = () => playing.delete(src);
      lastChunkAt = performance.now();
      clearThinking();
      setPhase("speaking");
    };

    // One loop drives both loudness meters and the end-of-speech detection.
    const tick = () => {
      if (stopped) return;
      let mic = 0;
      if (micAnalyser && micData && !mutedRef.current) {
        micAnalyser.getByteFrequencyData(micData);
        let sum = 0;
        for (let i = 0; i < micData.length; i++) sum += micData[i];
        mic = Math.min(1, Math.max(0, (sum / micData.length - 8) / 55));
      }
      outAnalyser.getByteFrequencyData(outData);
      let osum = 0;
      for (let i = 0; i < outData.length; i++) osum += outData[i];
      const out = Math.min(1, Math.max(0, (osum / outData.length - 6) / 70));
      levels.current = { mic, out };

      if (stateRef.current.phase === "speaking") {
        const drained = playback.currentTime >= nextTime;
        if (drained && performance.now() - lastChunkAt > SPEAKING_GRACE_MS) setPhase("listening");
      }
      frame = requestAnimationFrame(tick);
    };

    const startMic = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      capture = new AudioContext({ sampleRate: 16000 });
      const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" }));
      await capture.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(capture, "pcm-capture");
      node.port.onmessage = (e) => {
        if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
        ws.send(e.data as ArrayBuffer);
      };
      micAnalyser = capture.createAnalyser();
      micAnalyser.fftSize = 64;
      micAnalyser.smoothingTimeConstant = 0.45;
      micData = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
      const source = capture.createMediaStreamSource(stream);
      source.connect(node);
      source.connect(micAnalyser);
      frame = requestAnimationFrame(tick);
    };

    const setTool = (tool: VoiceTool | null) => patch({ tool });

    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          type: "start",
          token,
          design_id: opts.current.designId,
          history: opts.current.getHistory?.().slice(-30),
        }),
      );
    ws.onerror = () => {
      if (stopped) return;
      patch({ error: { kind: "connection", message: "The salon could not be reached. Check your connection and try again." } });
      stop("error");
    };
    ws.onclose = () => {
      if (stopped) return;
      // The server (or the model's session limit) hung up on us.
      stop("dropped");
    };
    ws.onmessage = async (e) => {
      if (stopped) return;
      if (typeof e.data !== "string") return play(e.data as ArrayBuffer);
      const msg = JSON.parse(e.data) as ServerEvent;
      switch (msg.type) {
        case "ready":
          try {
            await startMic();
            setPhase("listening");
          } catch (err) {
            const name = (err as { name?: string }).name;
            const denied = name === "NotAllowedError" || name === "PermissionDeniedError";
            patch({
              error: {
                kind: "mic",
                message: denied
                  ? "The microphone is blocked for this site. Allow it in your browser's address bar, then try again."
                  : "No microphone could be opened. Check that one is connected and not in use by another app.",
              },
              micPermission: denied ? "denied" : stateRef.current.micPermission,
            });
            stop("error");
          }
          break;
        case "transcript": {
          const text = msg.text;
          if (msg.role === "user") {
            if (text.trim()) {
              opts.current.onUserSpeech?.();
              if (stateRef.current.phase === "listening") enterThinking();
            }
            patch((s) => ({
              captions:
                turnDone || lastRole !== "user"
                  ? { user: text, model: "", modelInterrupted: false }
                  : { ...s.captions, user: s.captions.user + text },
            }));
            lastRole = "user";
            turnDone = false;
          } else {
            patch((s) => ({
              captions: s.captions.modelInterrupted
                ? { ...s.captions, model: text, modelInterrupted: false }
                : { ...s.captions, model: s.captions.model + text },
            }));
            lastRole = "model";
            turnDone = false;
          }
          opts.current.onTranscript(msg.role, text);
          break;
        }
        case "turn_complete":
          turnDone = true;
          clearThinking();
          patch((s) => ({ lastModelTurn: s.captions.model.trim() || s.lastModelTurn }));
          if (stateRef.current.phase === "thinking") setPhase("listening");
          opts.current.onTurnComplete();
          break;
        case "interrupted":
          stopPlayback();
          clearThinking();
          patch((s) => ({
            captions: s.captions.model ? { ...s.captions, modelInterrupted: true } : s.captions,
          }));
          setPhase("listening");
          opts.current.onInterrupted?.();
          break;
        case "tool_start": {
          const tool = KNOWN_TOOLS.includes(msg.tool as VoiceTool) ? (msg.tool as VoiceTool) : null;
          if (tool) {
            setTool(tool);
            opts.current.onToolStart?.(tool);
          }
          break;
        }
        case "designing":
          setTool("update_design");
          break;
        case "design":
          setTool(null);
          opts.current.onDesign(msg.design);
          break;
        case "flats":
          setTool(null);
          opts.current.onFlats?.(msg.flats_url);
          break;
        case "widget":
          setTool(null);
          opts.current.onWidget?.(msg.widget, msg.occasion, msg.gender);
          break;
        case "quote":
          setTool(null);
          opts.current.onQuote?.(msg.quote);
          break;
        case "runway_started":
          setTool(null);
          opts.current.onRunwayStarted?.(msg.job);
          break;
        case "error":
          // Server-side problems (a sketch that failed, a tool that threw) do not end the
          // line; the Couturier is told to apologise and the hero shows a notice.
          setTool(null);
          clearThinking();
          if (stateRef.current.phase === "thinking") setPhase("listening");
          showNotice(friendlyNotice(msg.message));
          break;
      }
    };
  }, [api, auth, patch, showNotice]);

  const stop = useCallback(() => {
    if (session.current) session.current.stop("idle");
    else patch({ phase: "idle", error: null, tool: null, muted: false });
  }, [patch]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) levels.current = { ...levels.current, mic: 0 };
    patch({ muted: mutedRef.current });
  }, [patch]);

  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "text", text }));
  }, []);

  const setDesignId = useCallback((id: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "set_design_id", design_id: id }));
  }, []);

  const dismissNotice = useCallback(() => patch({ notice: null }), [patch]);

  return {
    ...state,
    active: ACTIVE_PHASES.includes(state.phase),
    levels,
    start: () => {
      void start();
    },
    stop,
    toggleMute,
    sendMessage,
    setDesignId,
    dismissNotice,
  };
}

/** Backend error strings are written for logs; soften them for the salon. */
function friendlyNotice(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("sketch could not be completed") || m.includes("design generation failed")) {
    return "That sketch did not come out. Tell the Couturier the colour, fabric and fit again and it will try once more.";
  }
  if (m.includes("flats generation failed")) return "The technical flats could not be drafted this time. Ask again in a moment.";
  if (m.includes("generate_runway") || m.includes("runway")) return "The runway film could not be started. Ask again in a moment.";
  if (m.includes("live session error")) return "The salon hit a snag. If the Couturier goes quiet, end the call and start again.";
  return "Something went wrong on the atelier side. The Couturier is still on the line.";
}
