"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/providers";
import type { AtelierAction, Design } from "@/lib/types";

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

type Status = "idle" | "connecting" | "listening" | "designing" | "error";

type ServerEvent =
  | { type: "ready" | "turn_complete" | "interrupted" }
  | { type: "transcript"; role: "user" | "model"; text: string }
  | { type: "designing"; request: string }
  | { type: "tool_start"; tool: string; request?: string }
  | { type: "design"; design: Design }
  | { type: "flats"; flats_url: string }
  | { type: "widget"; widget: AtelierAction; occasion?: string }
  | { type: "runway_started"; job: any }
  | { type: "error"; message: string };

export function LiveVoice({
  designId,
  onTranscript,
  onTurnComplete,
  onDesign,
  onError,
  onVoiceActivity,
  onFlats,
  onWidget,
  onRunwayStarted,
  onDesigning,
  onUserSpeech,
}: {
  designId: string | null;
  onTranscript: (role: "user" | "model", text: string) => void;
  onTurnComplete: () => void;
  onDesign: (design: Design) => void;
  onError: (message: string) => void;
  onVoiceActivity?: (active: boolean, volume: number) => void;
  onFlats?: (flatsUrl: string) => void;
  onWidget?: (widget: AtelierAction, occasion?: string) => void;
  onRunwayStarted?: (job: any) => void;
  onDesigning?: () => void;
  onUserSpeech?: () => void;
}) {
  const { auth, api } = useApp();
  const [status, setStatus] = useState<Status>("idle");
  const session = useRef<{ stop: () => void } | null>(null);
  const handlers = useRef({
    onTranscript,
    onTurnComplete,
    onDesign,
    onError,
    onVoiceActivity,
    onFlats,
    onWidget,
    onRunwayStarted,
    onDesigning,
    onUserSpeech,
  });
  handlers.current = {
    onTranscript,
    onTurnComplete,
    onDesign,
    onError,
    onVoiceActivity,
    onFlats,
    onWidget,
    onRunwayStarted,
    onDesigning,
    onUserSpeech,
  };

  useEffect(() => () => session.current?.stop(), []);

  async function start() {
    setStatus("connecting");
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setStatus("error");
      handlers.current.onError("Not signed in yet.");
      return;
    }

    const ws = new WebSocket(api.liveUrl());
    ws.binaryType = "arraybuffer";
    const playback = new AudioContext({ sampleRate: 24000 });
    const playing = new Set<AudioBufferSourceNode>();
    let nextTime = 0;
    let capture: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let stopped = false;
    let animFrame: number | null = null;

    const stopPlayback = () => {
      playing.forEach((s) => s.stop());
      playing.clear();
      nextTime = 0;
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (animFrame !== null) cancelAnimationFrame(animFrame);
      handlers.current.onVoiceActivity?.(false, 0);
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" }));
      ws.close();
      stream?.getTracks().forEach((t) => t.stop());
      capture?.close();
      playback.close();
      session.current = null;
      setStatus((s) => (s === "error" ? s : "idle"));
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
      src.connect(playback.destination);
      nextTime = Math.max(nextTime, playback.currentTime);
      src.start(nextTime);
      nextTime += buffer.duration;
      playing.add(src);
      src.onended = () => playing.delete(src);
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
      node.port.onmessage = (e) => ws.readyState === WebSocket.OPEN && ws.send(e.data as ArrayBuffer);

      // Volume analysis for subtle voice-reactive bottom bar animation
      const analyser = capture.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.45;
      const source = capture.createMediaStreamSource(stream);
      source.connect(node);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (stopped) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const vol = Math.min(1, Math.max(0, (avg - 8) / 55));
        handlers.current.onVoiceActivity?.(true, vol);
        animFrame = requestAnimationFrame(checkVolume);
      };
      animFrame = requestAnimationFrame(checkVolume);
    };

    ws.onopen = () => ws.send(JSON.stringify({ type: "start", token, design_id: designId }));
    ws.onclose = () => stop();
    ws.onerror = () => {
      setStatus("error");
      handlers.current.onError("Live voice connection failed.");
    };
    ws.onmessage = async (e) => {
      if (typeof e.data !== "string") return play(e.data as ArrayBuffer);
      const msg = JSON.parse(e.data) as ServerEvent;
      switch (msg.type) {
        case "ready":
          try {
            await startMic();
            setStatus("listening");
          } catch {
            setStatus("error");
            handlers.current.onError("Microphone permission is required for live voice.");
            stop();
          }
          break;
        case "transcript":
          if (msg.role === "user" && msg.text.trim()) {
            handlers.current.onUserSpeech?.();
          }
          handlers.current.onTranscript(msg.role, msg.text);
          break;
        case "turn_complete":
          handlers.current.onTurnComplete();
          break;
        case "interrupted":
          stopPlayback();
          break;
        case "tool_start":
          if (msg.tool === "update_design") {
            setStatus("designing");
            handlers.current.onDesigning?.();
          }
          break;
        case "designing":
          setStatus("designing");
          handlers.current.onDesigning?.();
          break;
        case "design":
          handlers.current.onDesign(msg.design);
          setStatus("listening");
          break;
        case "flats":
          handlers.current.onFlats?.(msg.flats_url);
          setStatus("listening");
          break;
        case "widget":
          handlers.current.onWidget?.(msg.widget, msg.occasion);
          setStatus("listening");
          break;
        case "runway_started":
          handlers.current.onRunwayStarted?.(msg.job);
          setStatus("listening");
          break;
        case "error":
          setStatus("error");
          handlers.current.onError(msg.message);
          break;
      }
    };
  }

  const active = status === "connecting" || status === "listening" || status === "designing";
  const label = {
    idle: "Talk live",
    error: "Talk live",
    connecting: "Connecting…",
    listening: "● Listening, tap to end",
    designing: "✎ Sketching…",
  }[status];

  return (
    <button
      type="button"
      className={`live-voice-btn ${active ? "active" : ""} ${status === "designing" ? "designing" : ""}`}
      onClick={() => (active ? session.current?.stop() : start())}
      title="Real-time voice conversation with the Master Couturier (Gemini Live)"
    >
      <span className="voice-wave" />
      <span>{label}</span>
    </button>
  );
}
