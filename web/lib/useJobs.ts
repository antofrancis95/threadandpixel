"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Api } from "./api";

/**
 * Long-running atelier work (runway film, virtual fitting) tracked at page level,
 * so closing a card or switching designs never loses the result. Polling for a
 * runway job lives here, not in the card that started it.
 */
export type StudioJobKind = "runway" | "tryon";

export type StudioJob = {
  id: string;
  kind: StudioJobKind;
  designId: string;
  status: "running" | "done" | "error";
  startedAt: number;
  finishedAt?: number;
  resultUrl?: string;
  error?: string;
  /** From the server: rendering, finishing, done, failed. */
  stage?: string;
  /** How long this kind of job usually takes, in seconds. */
  typicalS?: number;
};

export const JOB_COPY: Record<StudioJobKind, { running: string; done: string; failed: string; usually: string }> = {
  runway: {
    running: "Filming the runway",
    done: "Runway film ready",
    failed: "The runway film could not be made",
    usually: "usually one to two minutes",
  },
  tryon: {
    running: "Draping on your portrait",
    done: "Fitting ready",
    failed: "The fitting could not be draped",
    usually: "usually under a minute",
  },
};

const POLL_MS = 4000;
const DONE_TTL_MS = 25_000;

export function useStudioJobs(api: Api, onSettled: (job: StudioJob) => void) {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const settled = useRef(onSettled);
  settled.current = onSettled;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Finished chips tidy themselves away.
  useEffect(() => {
    const finished = jobs.filter((j) => j.status !== "running" && j.finishedAt);
    if (finished.length === 0) return;
    const soonest = Math.min(...finished.map((j) => j.finishedAt! + DONE_TTL_MS));
    const t = window.setTimeout(() => {
      const now = Date.now();
      setJobs((js) => js.filter((j) => j.status === "running" || !j.finishedAt || j.finishedAt + DONE_TTL_MS > now));
    }, Math.max(0, soonest - Date.now()));
    return () => window.clearTimeout(t);
  }, [jobs]);

  /** Runs `work`, shows it as a job while it runs, and resolves with the result URL. `report` updates the chip. */
  const track = useCallback(
    (kind: StudioJobKind, designId: string, work: (report: (patch: Partial<StudioJob>) => void) => Promise<string>): Promise<string> => {
      const job: StudioJob = { id: `${kind}-${designId}-${Date.now()}`, kind, designId, status: "running", startedAt: Date.now(), typicalS: kind === "runway" ? 90 : 40 };
      const report = (patch: Partial<StudioJob>) => {
        if (alive.current) setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, ...patch } : j)));
      };
      // One job of a kind per design: a new run replaces a finished one.
      setJobs((js) => [...js.filter((j) => !(j.kind === kind && j.designId === designId)), job]);
      const finish = (patch: Partial<StudioJob>) => {
        const done = { ...job, ...patch, finishedAt: Date.now() };
        if (!alive.current) return done;
        setJobs((js) => js.map((j) => (j.id === job.id ? done : j)));
        settled.current(done);
        return done;
      };
      return work(report).then(
        (url) => {
          finish({ status: "done", resultUrl: url });
          return url;
        },
        (err) => {
          finish({ status: "error", error: (err as Error).message || "Something went wrong" });
          throw err;
        },
      );
    },
    [],
  );

  const pollRunway = useCallback(
    async (jobId: string, report?: (patch: Partial<StudioJob>) => void): Promise<string> => {
      let job = await api.getJob(jobId);
      report?.({ stage: job.stage, typicalS: job.typical_s });
      while (job.status === "running" && alive.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        job = await api.getJob(jobId);
        report?.({ stage: job.stage, typicalS: job.typical_s });
      }
      if (job.status === "error") throw new Error(job.error ?? "Video generation failed");
      if (!job.video_url) throw new Error("No film came back from the studio");
      return job.video_url;
    },
    [api],
  );

  /** Start a runway film for a design and follow it to the end. */
  const startRunway = useCallback(
    (designId: string) =>
      track("runway", designId, async (report) => {
        const started = await api.startRunway(designId);
        report({ stage: started.stage, typicalS: started.typical_s });
        if (started.status === "done" && started.video_url) return started.video_url;
        if (started.status === "error") throw new Error(started.error ?? "Video generation failed");
        return pollRunway(started.job_id, report);
      }).catch(() => undefined),
    [api, pollRunway, track],
  );

  /** Follow a runway job somebody else started (the live Couturier's generate_runway tool). */
  const adoptRunway = useCallback(
    (designId: string, jobId: string) => {
      void track("runway", designId, (report) => pollRunway(jobId, report)).catch(() => undefined);
    },
    [pollRunway, track],
  );

  const dismiss = useCallback((id: string) => setJobs((js) => js.filter((j) => j.id !== id)), []);

  return { jobs, track, startRunway, adoptRunway, dismiss };
}

export const STAGE_LABELS: Record<string, string> = {
  rendering: "Rendering",
  finishing: "Finishing",
  done: "Ready",
  failed: "Failed",
};

/** 0..1 against the typical duration, held under 1 until it is really done. */
export function jobProgress(job: StudioJob, now = Date.now()): number {
  if (job.status === "done") return 1;
  if (job.stage === "finishing") return 0.95;
  const typical = (job.typicalS ?? 90) * 1000;
  return Math.min(0.9, (now - job.startedAt) / typical);
}

export function formatElapsed(startedAt: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
