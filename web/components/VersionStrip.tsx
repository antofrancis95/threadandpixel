"use client";

/** Everything a version had on the board when it was current. */
export type DesignVersion = {
  version: number;
  image_url: string;
  flats_url: string | null;
  tryon_url: string | null;
  runway_url: string | null;
  note?: string;
};

/**
 * Every drape this session has seen of the current design, oldest first.
 * Viewing an earlier one is a look back, not a restore: the board says so, and
 * one tap returns to the current version.
 */
export function VersionStrip({
  versions,
  current,
  viewing,
  onView,
}: {
  versions: DesignVersion[];
  current: number;
  viewing: number | null;
  onView: (version: number | null) => void;
}) {
  if (versions.length < 2) return null;
  return (
    <div className="version-strip" role="group" aria-label="Versions of this design">
      <ol className="version-strip-list">
        {versions.map((v) => {
          const active = viewing === null ? v.version === current : v.version === viewing;
          return (
            <li key={v.version}>
              <button
                type="button"
                className={`version-thumb ${active ? "active" : ""}`}
                onClick={() => onView(v.version === current ? null : v.version)}
                aria-pressed={active}
                aria-label={`Version ${v.version}${v.version === current ? ", current" : ""}`}
                title={`Version ${v.version}${[v.flats_url && "flats", v.tryon_url && "fitting", v.runway_url && "runway"].filter(Boolean).length ? ` · ${[v.flats_url && "flats", v.tryon_url && "fitting", v.runway_url && "runway"].filter(Boolean).join(", ")}` : ""}`}
              >
                <img src={v.image_url} alt="" />
                <span className="version-thumb-num">v{v.version}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {viewing !== null && viewing !== current && (
        <span className="version-strip-note" role="status">
          Looking at v{viewing} of v{current}.
          <button type="button" className="version-strip-back" onClick={() => onView(null)}>
            Back to current
          </button>
        </span>
      )}
    </div>
  );
}
