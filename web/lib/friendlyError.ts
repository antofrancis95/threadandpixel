/**
 * Backend errors are written for logs. This turns them into something the client
 * can act on, and never shows a stack trace or a status code on its own.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = raw.toLowerCase();

  if (!raw || m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "The atelier could not be reached. Check your connection and try again.";
  }
  if (m.includes("not signed in") || m.includes("(401)") || m.includes("(403)")) {
    return "Your session has expired. Sign in again to continue.";
  }
  if (m.includes("(429)")) return "The atelier is busy right now. Give it a moment and try again.";
  if (/\(5\d\d\)/.test(m) || m.includes("internal server")) {
    return "The atelier hit a snag. Please try again in a moment.";
  }
  if (m.startsWith("photo not suitable for try-on")) {
    const reason = raw.split(":").slice(1).join(":").trim();
    return `That photo will not work for the fitting${reason ? `: ${reason}` : ""}. A clear, full-length, front-facing portrait works best.`;
  }
  if (m.includes("design generation failed") || m.includes("sketch could not be completed")) {
    return "The sketch did not come out. Try again, or restate the colour, fabric and fit.";
  }
  if (m.includes("flats generation failed")) return "The technical flats could not be drafted this time. Try again in a moment.";
  if (m.includes("video generation failed") || m.includes("runway")) {
    return "The runway film could not be made this time. Try again in a moment.";
  }
  // Short, sentence-like backend messages are written for people; pass them through.
  if (raw.length <= 160 && !/traceback|exception|error:/i.test(raw)) return raw;
  return "Something went wrong on the atelier side. Please try again.";
}
