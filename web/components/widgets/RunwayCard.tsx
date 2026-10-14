"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { CloseIcon, FilmIcon, SparkleIcon } from "@/components/icons";
import { useApp } from "@/lib/providers";

export function RunwayCard({
  designId,
  runwayUrl,
  onResult,
  onClose,
}: {
  designId: string;
  runwayUrl: string | null;
  onResult: (url: string) => void;
  onClose?: () => void;
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

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setElapsed(0);
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      let job = await api.startRunway(designId);
      while (job.status === "running" && alive.current) {
        await new Promise((r) => setTimeout(r, 4000));
        job = await api.getJob(job.job_id);
      }
      if (job.status === "error") throw new Error(job.error ?? "Cinematic generation failed");
      if (job.video_url) onResult(job.video_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  }

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <FilmIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Haute Couture Runway Clip</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
        Generate an 8-second cinematic Veo motion clip of a model walking the Paris runway in this exact piece.
      </p>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {runwayUrl ? (
        <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
          <video src={runwayUrl} controls autoPlay loop muted playsInline style={{ width: "100%", display: "block" }} />
          <div style={{ padding: "0.6rem", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={handleGenerate} disabled={busy} style={{ fontSize: "0.8rem" }}>
              {busy ? `Filming… ${elapsed}s` : "Regenerate runway clip"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "1.2rem", background: "var(--ivory)", borderRadius: "var(--radius-md)" }}>
          <div style={{ color: "var(--gold)", marginBottom: "0.4rem" }}>
            <SparkleIcon size={30} />
          </div>
          <p style={{ fontSize: "0.85rem", margin: "0 0 0.8rem", color: "var(--ink-secondary)" }}>
            Powered by Google Veo (9:16 vertical motion capture)
          </p>
          <button type="button" className="primary" onClick={handleGenerate} disabled={busy}>
            {busy ? `Filming on runway… (${elapsed}s)` : "Film Runway Clip"}
          </button>
        </div>
      )}
    </div>
  );
}

