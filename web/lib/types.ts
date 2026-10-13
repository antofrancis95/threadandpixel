export type Spec = {
  garment_type: string;
  length: string;
  sleeve: string;
  fabric_id: string;
  color_hex: string;
  closures: string[];
  embellishments: string[];
  lining: boolean;
};

export type Design = {
  design_id: string;
  version: number;
  spec: Spec;
  image_url: string;
  flats_url: string | null;
  tryon_url: string | null;
  runway_url: string | null;
  reply: string | null;
  transcript: string | null;
  suggested_action?: "none" | "fitting" | "measurements" | "runway" | "commission";
  messages?: ChatMessage[];
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

export type AtelierAction = "fitting" | "measurements" | "flats" | "runway" | "commission" | null;

export type ChatMessage = { role: "user" | "model"; text: string; live?: boolean };

export type Job = { job_id: string; status: "running" | "done" | "error"; video_url: string | null; error: string | null };

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
export const ORDER_STATUSES = ["new", "cutting", "sewing", "shipped"] as const;
