"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/providers";

export function Runway({
  designId,
  runwayUrl,
  onResult,
}: {
  designId: string;
  runwayUrl: string | null;
  onResult: (url: string) => void;
}) {
  const { api } = useApp();
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    setElapsed(0);
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      let job = await api.startRunway(designId);
      while (job.status === "running" && alive.current) {
        await new Promise((r) => setTimeout(r, 5000));
        job = await api.getJob(job.job_id);
      }
      if (job.status === "error") throw new Error(job.error ?? "Video generation failed");
      if (job.video_url) onResult(job.video_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Runway video</h2>
      <p className="hint">An 8-second Veo runway clip of the design, using your try-on photo if available.</p>
      <button onClick={run} disabled={busy}>
        {busy ? `Filming… ${elapsed}s` : runwayUrl ? "Regenerate runway video" : "Generate runway video"}
      </button>
      {error && <p className="error">{error}</p>}
      {runwayUrl && <video className="result" src={runwayUrl} controls autoPlay loop muted playsInline />}
    </section>
  );
}
