import type { Auth } from "firebase/auth";
import type { Design, DesignSummary, DesignVersionInfo, Job, Measurements, OrderDetail, QuoteResponse, Size } from "./types";

export type MessageInput = {
  text?: string;
  audio_b64?: string;
  audio_mime?: string;
  gender?: "womenswear" | "menswear" | "unisex";
};

export function createApi(baseUrl: string, auth: Auth) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not signed in. Please sign in with your authorized Google account.");
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  const post = <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

  return {
    createDesign: (msg: MessageInput) => post<Design>("/designs", msg),
    createDesignFromImage: (file: File, text?: string, gender?: string, size?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (text) form.append("text", text);
      if (gender) form.append("gender", gender);
      if (size) form.append("size", size);
      return request<Design>("/designs/from-image", { method: "POST", body: form });
    },
    createDesignForOccasion: (params: {
      occasion: string;
      file?: File | null;
      uploadId?: string | null;
      preferences?: string;
      gender?: string;
      size?: string;
      consent?: boolean;
    }) => {
      const form = new FormData();
      form.append("occasion", params.occasion);
      form.append("consent", params.consent !== false ? "true" : "false");
      if (params.file) form.append("file", params.file);
      if (params.uploadId) form.append("upload_id", params.uploadId);
      if (params.preferences) form.append("preferences", params.preferences);
      if (params.gender) form.append("gender", params.gender);
      if (params.size) form.append("size", params.size);
      return request<Design>("/designs/for-occasion", { method: "POST", body: form });
    },
    listDesigns: () => request<DesignSummary[]>("/designs"),
    getDesign: (id: string) => request<Design>(`/designs/${encodeURIComponent(id)}`),
    listVersions: (id: string) => request<DesignVersionInfo[]>(`/designs/${encodeURIComponent(id)}/versions`),
    restoreVersion: (id: string, version: number) =>
      post<Design>(`/designs/${encodeURIComponent(id)}/versions/${version}/restore`),
    sendMessage: (id: string, msg: MessageInput) => post<Design>(`/designs/${encodeURIComponent(id)}/messages`, msg),
    createFlats: (id: string, size?: Size | string, measurements?: Measurements) =>
      post<{ flats_url: string; size?: Size }>(
        `/designs/${encodeURIComponent(id)}/flats${size ? `?size=${encodeURIComponent(size)}` : ""}`,
        measurements ? { measurements } : undefined,
      ),
    uploadPerson: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("consent", "true");
      return request<{ upload_id: string }>("/uploads/person", { method: "POST", body: form });
    },
    tryOn: (id: string, uploadId?: string | null) =>
      post<{ tryon_url: string }>(
        `/designs/${encodeURIComponent(id)}/tryon`,
        uploadId ? { upload_id: uploadId } : {}
      ),
    techpack: (id: string, size: string, measurements?: Measurements) =>
      post<QuoteResponse>(`/designs/${encodeURIComponent(id)}/techpack`, { size, measurements }),
    order: (id: string, quoteId: string) =>
      post<{ order_id: string }>(`/designs/${encodeURIComponent(id)}/order`, { quote_id: quoteId }),
    getOrder: (orderId: string) => request<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`),
    startRunway: (id: string) => post<Job>(`/designs/${encodeURIComponent(id)}/runway`),
    getJob: (jobId: string) => request<Job>(`/jobs/${encodeURIComponent(jobId)}`),
    health: () =>
      fetch(`${baseUrl}/healthz`).then((r) => r.json() as Promise<{ ok: boolean; demo_mode: string }>),
    checkAuth: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return { allowed: false, authenticated: false, reason: "Not signed in" };
      const res = await fetch(`${baseUrl}/auth/check`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { allowed: false, authenticated: true, reason: `Server error (${res.status})` };
      }
      return res.json() as Promise<{
        allowed: boolean;
        email?: string | null;
        role?: string | null;
        authenticated: boolean;
        reason?: string | null;
      }>;
    },
    liveUrl: () => `${baseUrl.replace(/^http/, "ws")}/live`,
  };
}

export type Api = ReturnType<typeof createApi>;
