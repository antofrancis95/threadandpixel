# Thread & Pixel

**A voice-first AI atelier that turns a spoken idea into a garment a workshop can make.**

Built for the **AI Builder Cup 2026** (Hack2skill × Google Cloud) — theme *Retail & Commerce: Intelligent Customer and Business Experiences*. Team **PersistX**.

**Live prototype:** https://tp-web-1023298632546.asia-southeast1.run.app

---

## The problem

Made-to-measure clothing is the most personal form of retail and the least accessible. A shopper with an idea can only describe it in words a tailor must interpret, cannot see it on themselves before paying, and has no idea what it will cost. The workshop receives a vague brief and spends hours on sketches, sampling and quoting before a single order is confirmed — and the result is often returned because it did not match the picture in the customer's head. Mass fashion avoids this with overproduction: roughly a third of garments made are never sold.

## The solution

The customer *speaks* a garment into existence, and the workshop receives a tailor-ready pack.

| Step | What happens | Powered by |
| --- | --- | --- |
| **Converse** | Talk to the Master Couturier by voice (or type, upload a sketch, or name an occasion). It consults before it sketches, stays on topic, refuses brand copies and answers in the customer's language. | Gemini Live API with function calling |
| **Design** | One render, then *edits* rather than regeneration, so the garment stays consistent while sleeves, colour or length change. Every version is kept and restorable. | Gemini Flash (strict JSON spec) + Gemini image model |
| **Draft** | Front and back technical flats with size-graded measurement callouts (XS–XXL or custom cm). | Gemini image model |
| **Fit** | Virtual try-on on the customer's own photo, after a safety pre-check (single adult, full body). Photos are deleted after seven days. | Gemini Flash-Lite + Vertex Virtual Try-On |
| **Show** | An eight-second runway clip of the customer in the garment. | Veo |
| **Quote** | Gemini classifies fabric, closures, embellishments and lining; a deterministic engine prices yardage, waste, labour and trims. Gemini Pro adds construction notes, seam types and a manufacturability verdict. | Gemini Flash + Gemini Pro + `pricing.py` |
| **Commission** | One tap writes the order to Firestore. The Factory Portal shows it live and moves it through *new → cutting → sewing → shipped*. | Firestore live listeners |

Customers get certainty — see it, wear it, know the price — before they buy. Workshops get a complete brief and a quote they can trust before they cut. Made-to-order removes overproduction entirely.

---

## Architecture

```
  Browser (Next.js 15, React 19)  ── Cloud Run: tp-web
  │  /            public landing
  │  /studio      voice-first studio (mic, live captions, showcase board)
  │  /factory     factory portal (Firestore onSnapshot, status buttons)
  │
  │  Firebase Auth ──► ID token on every call (Google, email; factory custom claim)
  └──── REST + WebSocket (/live)
                               │
  Cloud Run: tp-api (FastAPI, Python 3.12, keyless runtime service account)
  ├─ auth.py        verifies Firebase ID tokens, allowlist, factory role
  ├─ live.py        WebSocket bridge ⇄ Gemini Live (16 kHz PCM in, audio out,
  │                 transcription, barge-in, push-to-talk, 7 function tools)
  ├─ ai/tailor.py   Gemini Flash with response_schema → design spec + reply
  ├─ ai/designer.py Gemini image model: generate · edit · technical flats
  ├─ ai/tryon.py    Flash-Lite photo check → Vertex Virtual Try-On
  ├─ ai/runway.py   studio still → Veo (long-running op, polled via /jobs)
  ├─ ai/techpack.py Gemini Pro critique (construction notes, seams, issues)
  ├─ pricing.py     deterministic yardage · labour · trims · margin
  ├─ guardrails.py  input scrub (brand names, injection), output validation, fabric catalog
  ├─ demo.py        record / fallback / replay cache for reliable live demos
  └─ service.py     Firestore writes: designs, versions, messages, quotes, jobs, orders
                               │
  Vertex AI                     Firestore (native)          Cloud Storage
  Gemini Flash · Flash-Lite     designs/{id}/versions       private bucket, V4 signed URLs
  Gemini Pro · image model      quotes · jobs · orders      uploads/ purged after 7 days
  Veo · Virtual Try-On          allowed_users
  Gemini Live (audio)           rules enforce ownership + factory role

  CI/CD: GitHub Actions → pytest + tsc + next build → gcloud run deploy (Workload Identity Federation)
```

### How each Google service is used

- **Gemini on Vertex AI** — the Live API for real-time voice with seven function tools (`update_design`, `draft_flats`, `open_fitting`, `get_quote`, `generate_runway`, `open_design_upload`, `open_occasion_stylist`); Flash with a strict response schema for the design spec; the image model for renders, consistent edits and technical flats; Flash-Lite for the photo safety check; Pro for the tech-pack critique. Veo and Virtual Try-On complete the visual chain.
- **Cloud Run** — two services, `tp-api` and `tp-web`, deployed from source by GitHub Actions with keyless Workload Identity Federation. A long request timeout keeps the voice WebSocket open; CORS is locked to the web origin.
- **Firestore** — `designs` (spec, prompt, versions sub-collection, messages), `quotes`, `jobs` (runway render stages), `orders` and `allowed_users`. Security rules let owners read their own designs and let the factory role read all orders and update only their `status`. All writes go through the API; the Factory Portal is a live `onSnapshot` listener.
- **Firebase Auth** — Google and email sign-in, a server-side allowlist, and a `role: factory` custom claim for the portal. The API verifies the ID token on every REST call and on the WebSocket start frame.
- **Cloud Storage** — private bucket with uniform access, V4 signed URLs minted by the runtime service account (no key files), and a lifecycle rule that deletes uploaded body photos after seven days.

### Responsible AI

- Brand names and prompt-injection attempts are scrubbed before they reach a model; model output is validated against a schema and a fabric catalog.
- Try-on photos are checked for a single adult and nothing unsafe before processing, and are purged automatically.
- Prices come from deterministic code, not from the model, so quotes are explainable and repeatable.

---

## Repository layout

```
api/            FastAPI backend
  app/          routes, live voice bridge, auth, pricing, guardrails, Firestore service
  app/ai/       Gemini, Veo and Virtual Try-On integrations
  scripts/      admin scripts (allowlist, factory role)
  tests/        pytest suite
web/            Next.js 15 frontend
  app/          landing, studio and factory routes
  components/   studio, voice, landing and factory UI
  lib/          API client, Firebase, live audio
infra/          Cloud Run, IAM and Workload Identity Federation setup scripts
.github/        CI (tests, type-check, build) and Cloud Run deploy workflows
firestore.rules Firestore security rules
```

## Running locally

Requirements: Python 3.12, Node 20, a Google Cloud project with Vertex AI, Firestore and Cloud Storage enabled, a Firebase web app, and `gcloud auth application-default login`.

```bash
cp api/.env.example api/.env          # set project, bucket and model IDs
cp web/.env.example web/.env.local    # set API_URL and FIREBASE_CONFIG
./start-dev.sh                        # API on :8080, web on :3000
```

Run the backend tests:

```bash
cd api && .venv/bin/python -m pytest
```

## Deploying

See [`infra/README.md`](infra/README.md) for the one-time Workload Identity Federation setup. After that, every push to `main` that touches `api/` or `web/` runs the tests and deploys to Cloud Run.
