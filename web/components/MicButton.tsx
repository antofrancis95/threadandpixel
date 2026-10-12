"use client";

import { useRef, useState } from "react";

const ALLOWED = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function MicButton({
  disabled,
  onAudio,
}: {
  disabled?: boolean;
  onAudio: (audioB64: string, mime: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType });
      const mime = rec.mimeType.split(";")[0];
      if (blob.size && ALLOWED.includes(mime)) onAudio(await blobToBase64(blob), mime);
    };
    rec.start();
    recorder.current = rec;
    setRecording(true);
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  return (
    <button
      type="button"
      className={`mic ${recording ? "recording" : ""}`}
      disabled={disabled && !recording}
      onClick={recording ? stop : start}
      aria-label={recording ? "Stop recording" : "Speak your idea"}
      title={recording ? "Stop recording" : "Speak your idea"}
    >
      {recording ? "■" : "🎙"}
    </button>
  );
}
