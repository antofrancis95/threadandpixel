"use client";

import { useEffect, useState } from "react";
import { CloseIcon, FilmIcon, RefreshIcon, SparkleIcon } from "@/components/icons";
import { JOB_COPY, formatElapsed, type StudioJob } from "@/lib/useJobs";

/**
 * The runway card asks for the film and shows how it is going. The job itself is
 * tracked by the page, so closing this card does not lose the result.
 */
export function RunwayCard({
  runwayUrl,
  job,
  onStart,
  onClose,
}: {
  runwayUrl: string | null;
  job: StudioJob | null;
  onStart: () => void;
  onClose?: () => void;
}) {
  const running = job?.status === "running";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  return (
    <div className="inline-widget">
      <div className="inline-widget-head">
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <FilmIcon size={17} style={{ color: "var(--gold)" }} />
          <span>Runway film</span>
        </h4>
        {onClose && (
          <button type="button" className="inline-widget-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p className="inline-widget-lede">
        An eight-second walk in this exact piece, using your fitting portrait when there is one.
      </p>

      {running && job ? (
        <div className="job-progress" role="status" aria-live="polite">
          <span className="spin-silk">
            <SparkleIcon size={14} />
          </span>
          <div className="job-progress-text">
            <strong>
              {JOB_COPY.runway.running} · {formatElapsed(job.startedAt, now)}
            </strong>
            <span>
              This {JOB_COPY.runway.usually}. Keep designing; the film goes to the Runway tab when it is ready.
            </span>
          </div>
        </div>
      ) : job?.status === "error" ? (
        <div className="job-progress failed" role="alert">
          <div className="job-progress-text">
            <strong>{JOB_COPY.runway.failed}</strong>
            <span>{job.error}</span>
          </div>
          <button type="button" className="secondary" onClick={onStart}>
            <RefreshIcon size={13} />
            <span>Try again</span>
          </button>
        </div>
      ) : runwayUrl ? (
        <div className="runway-preview">
          <video src={runwayUrl} controls autoPlay loop muted playsInline />
          <div className="runway-preview-actions">
            <button type="button" className="secondary" onClick={onStart}>
              <RefreshIcon size={13} />
              <span>Film again</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="runway-cta">
          <FilmIcon size={28} style={{ color: "var(--gold)" }} />
          <p>Vertical, eight seconds, salon lighting. Usually one to two minutes to make.</p>
          <button type="button" className="primary" onClick={onStart}>
            <FilmIcon size={14} />
            <span>Film the runway</span>
          </button>
        </div>
      )}
    </div>
  );
}
