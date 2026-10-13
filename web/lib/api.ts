import type { Auth } from "firebase/auth";
import type { Design, DesignSummary, Job, Measurements, OrderDetail, QuoteResponse } from "./types";

export type MessageInput = { text?: string; audio_b64?: string; audio_mime?: string };

export function createApi(baseUrl: string, auth: Auth) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not signed in yet. Check that Anonymous sign-in is enabled in Firebase Authentication.");
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
    listDesigns: () => request<DesignSummary[]>("/designs"),
    getDesign: (id: string) => request<Design>(`/designs/${encodeURIComponent(id)}`),
    sendMessage: (id: string, msg: MessageInput) => post<Design>(`/designs/${encodeURIComponent(id)}/messages`, msg),
    createFlats: (id: string) => post<{ flats_url: string }>(`/designs/${encodeURIComponent(id)}/flats`),
    uploadPerson: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("consent", "true");
      return request<{ upload_id: string }>("/uploads/person", { method: "POST", body: form });
    },
    tryOn: (id: string, uploadId: string) =>
      post<{ tryon_url: string }>(`/designs/${encodeURIComponent(id)}/tryon`, { upload_id: uploadId }),
    techpack: (id: string, size: string, measurements?: Measurements) =>
      post<QuoteResponse>(`/designs/${encodeURIComponent(id)}/techpack`, { size, measurements }),
    order: (id: string, quoteId: string) =>
      post<{ order_id: string }>(`/designs/${encodeURIComponent(id)}/order`, { quote_id: quoteId }),
    getOrder: (orderId: string) => request<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`),
    startRunway: (id: string) => post<Job>(`/designs/${encodeURIComponent(id)}/runway`),
    getJob: (jobId: string) => request<Job>(`/jobs/${encodeURIComponent(jobId)}`),
    health: () =>
      fetch(`${baseUrl}/healthz`).then((r) => r.json() as Promise<{ ok: boolean; demo_mode: string }>),
    liveUrl: () => `${baseUrl.replace(/^http/, "ws")}/live`,
  };
}

export type Api = ReturnType<typeof createApi>;
