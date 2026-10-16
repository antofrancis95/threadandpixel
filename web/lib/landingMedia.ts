import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Media for the landing page, produced by `api/scripts/landing_assets.py`
 * into web/public/landing/ together with a manifest.json that lists the
 * intrinsic size of each file and its responsive WebP variants. Every entry
 * is null when the file is missing so the page falls back to its SVG art.
 *
 * The lookup touches the filesystem once per server process: the files only
 * change when the script runs, and the app is redeployed afterwards.
 */
export type LandingImage = {
  src: string;
  width: number;
  height: number;
  /** `srcset` of WebP renditions, e.g. "/landing/x-480.webp 480w, …" */
  webpSrcSet: string | null;
};

export type LandingVideo = { src: string; width: number; height: number };

export type LandingMedia = {
  render: LandingImage | null;
  flats: LandingImage | null;
  tryon: LandingImage | null;
  runwayStill: LandingImage | null;
  runway: LandingVideo | null;
};

type ManifestImage = { src: string; width: number; height: number; webp?: { src: string; width: number }[] };
type Manifest = Partial<Record<"render" | "flats" | "tryon" | "runway-still" | "runway", ManifestImage>>;

const EMPTY: LandingMedia = { render: null, flats: null, tryon: null, runwayStill: null, runway: null };
const FALLBACK_FILES: Record<Exclude<keyof LandingMedia, "runway">, string[]> = {
  render: ["render.jpg", "render.png"],
  flats: ["flats.jpg", "flats.png"],
  tryon: ["tryon.jpg", "tryon.png"],
  runwayStill: ["runway-still.jpg", "runway-still.png"],
};

let cached: LandingMedia | null = null;

function toImage(dir: string, entry: ManifestImage | undefined): LandingImage | null {
  if (!entry || !existsSync(path.join(dir, path.basename(entry.src)))) return null;
  const variants = (entry.webp ?? []).filter((v) => existsSync(path.join(dir, path.basename(v.src))));
  return {
    src: entry.src,
    width: entry.width,
    height: entry.height,
    webpSrcSet: variants.length ? variants.map((v) => `${v.src} ${v.width}w`).join(", ") : null,
  };
}

function fromManifest(dir: string, manifest: Manifest): LandingMedia {
  const runway = manifest.runway;
  return {
    render: toImage(dir, manifest.render),
    flats: toImage(dir, manifest.flats),
    tryon: toImage(dir, manifest.tryon),
    runwayStill: toImage(dir, manifest["runway-still"]),
    runway:
      runway && existsSync(path.join(dir, path.basename(runway.src)))
        ? { src: runway.src, width: runway.width, height: runway.height }
        : null,
  };
}

/** Older asset folders without a manifest: plain files, no responsive variants. */
function fromFiles(dir: string): LandingMedia {
  const out: LandingMedia = { ...EMPTY };
  for (const key of Object.keys(FALLBACK_FILES) as (keyof typeof FALLBACK_FILES)[]) {
    const found = FALLBACK_FILES[key].find((name) => existsSync(path.join(dir, name)));
    // Intrinsic size unknown; a 3:4 box matches how the panels crop these images.
    out[key] = found ? { src: `/landing/${found}`, width: 900, height: 1200, webpSrcSet: null } : null;
  }
  out.runway = existsSync(path.join(dir, "runway.mp4")) ? { src: "/landing/runway.mp4", width: 720, height: 1280 } : null;
  return out;
}

export function getLandingMedia(): LandingMedia {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const dir = path.join(process.cwd(), "public", "landing");
  const manifestPath = path.join(dir, "manifest.json");
  let result: LandingMedia;
  if (existsSync(manifestPath)) {
    try {
      result = fromManifest(dir, JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest);
    } catch {
      result = fromFiles(dir);
    }
  } else {
    result = fromFiles(dir);
  }
  cached = result;
  return result;
}
