export type Spec = {
  garment_type: string;
  length: string;
  sleeve: string;
  fabric_id: string;
  color_hex: string;
  closures: string[];
  embellishments: string[];
  lining: boolean;
  gender?: "womenswear" | "menswear" | "unisex";
  size?: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  fit?: string;
};

export type Design = {
  design_id: string;
  version: number;
  spec: Spec;
  image_url: string | null;
  flats_url: string | null;
  tryon_url: string | null;
  runway_url: string | null;
  reference_image_url?: string | null;
  occasion?: string | null;
  has_vto_portrait?: boolean;
  reply: string | null;
  transcript: string | null;
  suggested_action?: "none" | "fitting" | "measurements" | "runway" | "commission" | "gender" | "consultation" | "design_upload" | "occasion_stylist";
  messages?: ChatMessage[];
  is_off_topic?: boolean;
  /** The most recent quote, when it still describes this version. */
  latest_quote?: QuoteResponse | null;
};

export type DesignSummary = {
  design_id: string;
  version: number;
  spec: Spec;
  image_url: string | null;
  messages_count: number;
  updated_at: string;
  created_at: string;
};

export type AtelierAction =
  | "fitting"
  | "measurements"
  | "flats"
  | "runway"
  | "commission"
  | "gender"
  | "consultation"
  | "design_upload"
  | "occasion_stylist"
  | null;

export type ChatMessage = {
  role: "user" | "model";
  text: string;
  /** Still streaming in from the live Couturier. */
  live?: boolean;
  /** The client spoke over this sentence before it was finished. */
  interrupted?: boolean;
  /** A short studio note (not something the Couturier said); never persisted. */
  kind?: "note";
};

export type Job = {
  job_id: string;
  status: "running" | "done" | "error";
  /** rendering | finishing | done | failed */
  stage?: string;
  elapsed_s?: number | null;
  typical_s?: number;
  video_url: string | null;
  error: string | null;
};

export type DesignVersionInfo = {
  version: number;
  image_url: string | null;
  instruction?: string | null;
  created_at?: string | null;
  spec?: Spec | null;
  is_current: boolean;
};

export type QuoteLine = { label: string; amount: number };

export type Quote = {
  currency: string;
  size: string;
  fabric: { id: string; name: string };
  yardage: number;
  waste_yards: number;
  labour_hours: number;
  complexity: "Low" | "Medium" | "High";
  lines: QuoteLine[];
  total: number;
};

export type TechPack = {
  construction_notes: string[];
  seam_types: string[];
  manufacturable: boolean;
  issues: string[];
};

export type QuoteResponse = { quote_id: string; techpack: TechPack; quote: Quote };

export type Measurements = Partial<Record<"bust_cm" | "waist_cm" | "hip_cm" | "height_cm", number>>;

export type OrderDetail = {
  order_id: string;
  spec: Spec;
  size: string;
  measurements: Measurements | null;
  techpack: TechPack;
  quote: Quote;
  status: string;
  image_url: string | null;
  flats_url: string | null;
  tryon_url: string | null;
  runway_url: string | null;
};

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

type BodyPreset = Required<Measurements>;

// Body measurements (cm) behind each standard size; they pre-fill the custom tape and are what the flats are scaled from.
// Keep in sync with BODY_PRESETS in api/app/ai/designer.py.
export const BODY_PRESETS: Record<"menswear" | "womenswear", Record<Size, BodyPreset>> = {
  menswear: {
    XS: { bust_cm: 86, waist_cm: 72, hip_cm: 90, height_cm: 168 },
    S: { bust_cm: 92, waist_cm: 78, hip_cm: 95, height_cm: 172 },
    M: { bust_cm: 98, waist_cm: 84, hip_cm: 100, height_cm: 176 },
    L: { bust_cm: 104, waist_cm: 90, hip_cm: 105, height_cm: 180 },
    XL: { bust_cm: 110, waist_cm: 96, hip_cm: 110, height_cm: 183 },
    XXL: { bust_cm: 116, waist_cm: 102, hip_cm: 115, height_cm: 186 },
  },
  womenswear: {
    XS: { bust_cm: 80, waist_cm: 62, hip_cm: 86, height_cm: 160 },
    S: { bust_cm: 84, waist_cm: 66, hip_cm: 90, height_cm: 164 },
    M: { bust_cm: 88, waist_cm: 70, hip_cm: 96, height_cm: 168 },
    L: { bust_cm: 94, waist_cm: 76, hip_cm: 102, height_cm: 172 },
    XL: { bust_cm: 100, waist_cm: 82, hip_cm: 108, height_cm: 175 },
    XXL: { bust_cm: 106, waist_cm: 88, hip_cm: 114, height_cm: 178 },
  },
};

export function bodyPreset(size: Size, gender?: string | null, garmentType?: string | null): BodyPreset {
  const womenswear =
    gender === "womenswear" ||
    (gender !== "menswear" && ["dress", "skirt", "jumpsuit"].includes(garmentType ?? ""));
  return BODY_PRESETS[womenswear ? "womenswear" : "menswear"][size];
}
export const ORDER_STATUSES = ["new", "cutting", "sewing", "shipped"] as const;
