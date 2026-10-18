"use client";

import { CheckIcon, MicIcon, PlusIcon } from "@/components/icons";
import { STAGES, type NextStep, type Stage } from "@/lib/nextStep";

/**
 * The commission rail: five stops on one thread, the current one in gold, and
 * a single sentence saying what to say or tap next. Done stops jump back to
 * their tab; stops ahead wait their turn. Once commissioned the rail is sealed
 * and only offers the next commission.
 */
export function NextSteps({
  step,
  voiceActive,
  onAction,
  onJump,
}: {
  step: NextStep;
  voiceActive: boolean;
  onAction: (action: NextStep["action"]) => void;
  onJump: (stage: Stage) => void;
}) {
  return (
    <nav className={`next-steps ${step.sealed ? "sealed" : ""}`} aria-label="Commission progress">
      <ol className="next-steps-track">
        {STAGES.map((s, i) => {
          const status = step.statuses[s.id];
          return (
            <li key={s.id} className={`next-step ${status}`}>
              <button
                type="button"
                className="next-step-btn"
                onClick={() => (status === "current" ? onAction(step.action) : onJump(s.id))}
                disabled={status === "todo"}
                aria-current={status === "current" ? "step" : undefined}
                aria-label={`${s.label}: ${status === "done" ? "done" : status === "current" ? "next" : "later"}`}
              >
                <span className="next-step-dot" aria-hidden="true">
                  {status === "done" ? <CheckIcon size={10} /> : i + 1}
                </span>
                <span className="next-step-label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="next-steps-cta">
        <p className="next-steps-sentence">
          <span className="next-steps-kicker">{step.sealed ? "Commissioned" : step.stage ? "Next" : "Done"}</span>
          <span>{step.sentence}</span>
        </p>
        {step.sealed ? (
          <button type="button" className="primary small next-steps-btn" onClick={() => onAction(step.action)}>
            <PlusIcon size={13} />
            <span>{step.say}</span>
          </button>
        ) : (
          <>
            <button type="button" className="primary small say next-steps-btn" onClick={() => onAction(step.action)}>
              {step.action.kind === "talk" ? <MicIcon size={13} /> : <span className="next-steps-quote" aria-hidden="true">“</span>}
              <span>{step.action.kind === "talk" ? "Talk live" : step.say}</span>
              {step.action.kind !== "talk" && <span className="next-steps-quote" aria-hidden="true">”</span>}
            </button>
            <span className="next-steps-hint">{voiceActive ? "Say it, or tap." : "Tap it, or say it live."}</span>
          </>
        )}
      </div>
    </nav>
  );
}
