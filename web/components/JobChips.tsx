"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CloseIcon, RefreshIcon, SparkleIcon } from "@/components/icons";
import { JOB_COPY, STAGE_LABELS, formatElapsed, jobProgress, type StudioJob } from "@/lib/useJobs";

/** Status chips for atelier work in progress: what is running, for how long, and what is ready. */
export function JobChips({
  jobs,
  onOpen,
  onRetry,
  onDismiss,
}: {
  jobs: StudioJob[];
  onOpen: (job: StudioJob) => void;
  onRetry: (job: StudioJob) => void;
  onDismiss: (id: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const running = jobs.some((j) => j.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  if (jobs.length === 0) return null;
  return (
    <div className="job-chips" role="status" aria-live="polite">
      {jobs.map((job) => {
        const copy = JOB_COPY[job.kind];
        if (job.status === "running") {
          return (
            <span key={job.id} className="job-chip running" title={`${copy.running}, ${copy.usually}. You can keep designing.`}>
              <span className="spin-silk">
                <SparkleIcon size={11} />
              </span>
              <span>{job.stage && STAGE_LABELS[job.stage] ? `${copy.running} · ${STAGE_LABELS[job.stage].toLowerCase()}` : copy.running}</span>
              <span className="job-chip-time">{formatElapsed(job.startedAt, now)}</span>
              <span className="job-chip-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${jobProgress(job, now).toFixed(3)})` }} />
              </span>
            </span>
          );
        }
        if (job.status === "done") {
          return (
            <button key={job.id} type="button" className="job-chip done" onClick={() => onOpen(job)} title="Show it">
              <CheckIcon size={11} />
              <span>{copy.done}</span>
            </button>
          );
        }
        return (
          <span key={job.id} className="job-chip failed" title={job.error}>
            <span>{copy.failed}</span>
            <button type="button" className="job-chip-btn" onClick={() => onRetry(job)} aria-label="Try again">
              <RefreshIcon size={11} />
            </button>
            <button type="button" className="job-chip-btn" onClick={() => onDismiss(job.id)} aria-label="Dismiss">
              <CloseIcon size={11} />
            </button>
          </span>
        );
      })}
    </div>
  );
}
