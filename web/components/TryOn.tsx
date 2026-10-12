"use client";

import { useState } from "react";
import { useApp } from "@/lib/providers";

export function TryOn({
  designId,
  tryonUrl,
  onResult,
}: {
  designId: string;
  tryonUrl: string | null;
  onResult: (url: string) => void;
}) {
  const { api } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file || !consent) return;
    setBusy(true);
    setError(null);
    try {
      const { upload_id } = await api.uploadPerson(file);
      const { tryon_url } = await api.tryOn(designId, upload_id);
      onResult(tryon_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Virtual try-on</h2>
      <p className="hint">Full-body, front-facing photo with a plain background works best.</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I consent to my photo
        being processed by AI for this try-on. It is deleted automatically after 7 days.
      </label>
      <button onClick={run} disabled={!file || !consent || busy}>
        {busy ? "Fitting…" : "Try it on"}
      </button>
      {error && <p className="error">{error}</p>}
      {tryonUrl && <img className="result" src={tryonUrl} alt="You wearing the design" />}
    </section>
  );
}
