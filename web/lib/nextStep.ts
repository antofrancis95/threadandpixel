import type { AtelierAction, Design } from "./types";

/**
 * The commission has five stops. The studio always knows which one the client
 * is at and what to say (or tap) to reach the next, so nobody has to guess.
 */
export type Stage = "design" | "flats" | "fitting" | "runway" | "techpack";
export type StageStatus = "done" | "current" | "todo";
export type ShowcaseTab = "editorial" | "flats" | "tryon" | "runway";

export type StepAction =
  /** Words for the Couturier, sent exactly as if the client had said them. */
  | { kind: "say"; text: string }
  | { kind: "widget"; widget: Exclude<AtelierAction, null> }
  | { kind: "flats"; size?: string }
  | { kind: "tab"; tab: ShowcaseTab }
  | { kind: "techpack" }
  | { kind: "talk" }
  /** Leave a sealed commission and start the next piece. */
  | { kind: "new" };

export type StepChip = { label: string; action: StepAction; primary?: boolean };

export type NextStep = {
  statuses: Record<Stage, StageStatus>;
  /** The stop the client is at; null once every stop is done. */
  stage: Stage | null;
  /** The piece is commissioned: nothing on it changes any more. */
  sealed: boolean;
  /** One sentence for the rail: what happens next. */
  sentence: string;
  /** The same step as something you can say aloud. */
  say: string;
  action: StepAction;
  /** Sentence chips for the chat, primary first. */
  chips: StepChip[];
};

export const STAGES: { id: Stage; label: string; tab?: ShowcaseTab }[] = [
  { id: "design", label: "Design", tab: "editorial" },
  { id: "flats", label: "Flats", tab: "flats" },
  { id: "fitting", label: "Fitting", tab: "tryon" },
  { id: "runway", label: "Runway", tab: "runway" },
  { id: "techpack", label: "Tech pack" },
];

const CHOOSE_FOR_ME = "Please choose the colour, fabric, fit and size for me and sketch it.";

export function stageStatuses(design: Design | null, hasQuote: boolean): Record<Stage, StageStatus> {
  const done: Record<Stage, boolean> = {
    design: Boolean(design?.image_url),
    flats: Boolean(design?.flats_url),
    fitting: Boolean(design?.tryon_url),
    runway: Boolean(design?.runway_url),
    techpack: hasQuote,
  };
  const current = STAGES.find((s) => !done[s.id])?.id ?? null;
  const out = {} as Record<Stage, StageStatus>;
  for (const s of STAGES) out[s.id] = done[s.id] ? "done" : s.id === current ? "current" : "todo";
  return out;
}

export function nextStep(
  design: Design | null,
  opts: { hasQuote: boolean; suggestedAction: AtelierAction },
): NextStep {
  if (design?.order_id) return sealedStep(design);
  const statuses = stageStatuses(design, opts.hasQuote);
  const stage = (Object.keys(statuses) as Stage[]).find((s) => statuses[s] === "current") ?? null;
  const consulting = Boolean(design) && !design?.image_url;
  const size = design?.spec.size;

  let sentence: string;
  let say: string;
  let action: StepAction;

  if (!design) {
    sentence = "Describe the piece you have in mind.";
    say = "A navy linen shirt dress with a relaxed drape";
    action = { kind: "talk" };
  } else if (consulting) {
    sentence = "The Couturier is asking for a few details before sketching.";
    say = "Choose the details for me";
    action = { kind: "say", text: CHOOSE_FOR_ME };
  } else if (stage === "flats") {
    sentence = size ? `Draft the technical flats in size ${size}.` : "Draft the technical flats, with your size.";
    say = size ? `Draft the flats in size ${size}` : "Draft the flats";
    action = { kind: "flats", size };
  } else if (stage === "fitting") {
    sentence = "See it on you in the fitting room.";
    say = "Open the fitting room";
    action = { kind: "widget", widget: "fitting" };
  } else if (stage === "runway") {
    sentence = "Film an eight-second runway walk.";
    say = "Film the runway";
    action = { kind: "widget", widget: "runway" };
  } else if (stage === "techpack") {
    sentence = "Prepare the tech pack and estimate for the atelier.";
    say = "Prepare the tech pack";
    action = { kind: "techpack" };
  } else {
    sentence = "Every stop is done. Refine the piece, or place the order.";
    say = "Open the tech pack";
    action = { kind: "widget", widget: "commission" };
  }

  // Chat chips: what the Couturier just asked for comes first, then the road ahead.
  const chips: StepChip[] = [];
  if (opts.suggestedAction === "gender") {
    chips.push(
      { label: "Tailor it for a gentleman", action: { kind: "say", text: "Tailor this piece for a gentleman (menswear)." }, primary: true },
      { label: "Tailor it for a lady", action: { kind: "say", text: "Tailor this piece for a lady (womenswear)." }, primary: true },
    );
  } else if (opts.suggestedAction === "consultation" || consulting) {
    chips.push(
      { label: "Choose the details for me", action: { kind: "say", text: CHOOSE_FOR_ME }, primary: true },
      { label: "Upload a sketch instead", action: { kind: "widget", widget: "design_upload" } },
    );
  } else if (design) {
    if (opts.suggestedAction === "measurements") {
      chips.push({ label: "Take my measurements", action: { kind: "widget", widget: "measurements" }, primary: true });
    }
    chips.push({ label: say, action, primary: chips.length === 0 });
    for (const s of STAGES) {
      if (chips.length >= 3) break;
      if (statuses[s.id] !== "todo" || s.id === stage) continue;
      const step = stepFor(s.id, size);
      if (step && !chips.some((c) => c.label === step.label)) chips.push(step);
    }
  }

  return { statuses, stage, sentence, say, action, chips, sealed: false };
}

/** A commissioned piece: the stops it reached stay done, the rest were skipped, and the only way on is a new commission. */
function sealedStep(design: Design): NextStep {
  const reached = stageStatuses(design, true);
  const statuses = {} as Record<Stage, StageStatus>;
  for (const s of STAGES) statuses[s.id] = reached[s.id] === "done" ? "done" : "todo";
  return {
    statuses,
    stage: null,
    sealed: true,
    sentence: "Sent to the atelier. This piece is sealed.",
    say: "Start a new commission",
    action: { kind: "new" },
    chips: [],
  };
}

function stepFor(stage: Stage, size?: string): StepChip | null {
  switch (stage) {
    case "flats":
      return { label: size ? `Draft the flats in size ${size}` : "Draft the flats", action: { kind: "flats", size } };
    case "fitting":
      return { label: "Open the fitting room", action: { kind: "widget", widget: "fitting" } };
    case "runway":
      return { label: "Film the runway", action: { kind: "widget", widget: "runway" } };
    case "techpack":
      return { label: "Prepare the tech pack", action: { kind: "techpack" } };
    default:
      return null;
  }
}
