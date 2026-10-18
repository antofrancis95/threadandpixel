"use client";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import { Chat } from "@/components/Chat";
import { CrossfadeImage } from "@/components/CrossfadeImage";
import { ErrorAlert } from "@/components/ErrorAlert";
import { JobChips } from "@/components/JobChips";
import { NextSteps } from "@/components/NextSteps";
import { SpecRibbon, diffSpec, type SpecKey } from "@/components/SpecRibbon";
import { VersionStrip, type DesignVersion } from "@/components/VersionStrip";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  ChatIcon,
  ClipboardIcon,
  CloseIcon,
  FilmIcon,
  GalleryIcon,
  GoogleIcon,
  ImageIcon,
  LockIcon,
  MenswearIcon,
  MenuIcon,
  MirrorIcon,
  PartyIcon,
  PlusIcon,
  RefreshIcon,
  RulerIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparkleIcon,
  WomenswearIcon,
} from "@/components/icons";
import { GarmentFlat } from "@/components/landing/GarmentArt";
import { DressForm, SalonMirror } from "@/components/StudioArt";
import { StaticDrape } from "@/components/landing/HeroCloth";
import { useLiveVoice } from "@/components/LiveVoice";
import { ChatSkeleton, ShowcaseSkeleton } from "@/components/skeletons";
import { VoiceHero } from "@/components/voice/VoiceHero";
import { CommissionCard } from "@/components/widgets/CommissionCard";
import { DesignUploadCard } from "@/components/widgets/DesignUploadCard";
import { FittingRoomCard } from "@/components/widgets/FittingRoomCard";
import { MeasurementCard } from "@/components/widgets/MeasurementCard";
import { OccasionStylistCard } from "@/components/widgets/OccasionStylistCard";
import { RunwayCard } from "@/components/widgets/RunwayCard";
import type { MessageInput } from "@/lib/api";
import { friendlyError } from "@/lib/friendlyError";
import { STAGES, nextStep, type Stage, type StepAction } from "@/lib/nextStep";
import { useStudioJobs, type StudioJob } from "@/lib/useJobs";
import { useApp } from "@/lib/providers";
import type {
  AtelierAction,
  ChatMessage,
  Design,
  DesignSummary,
  Measurements,
  QuoteResponse,
  Spec,
} from "@/lib/types";

const STORAGE_KEY = "tp.designId";

type ShowcaseTab = "editorial" | "flats" | "tryon" | "runway";
type MobilePane = "chat" | "showcase";

export default function AtelierStudio() {
  const { auth, api, user, ready } = useApp();
  const [design, setDesign] = useState<Design | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Read by the voice hook on (re)connect so the Couturier remembers what was already said.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<string>("off");

  // Private Atelier Access Control State
  const [authChecking, setAuthChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authDeniedReason, setAuthDeniedReason] = useState<string | null>(null);

  // Email / Password Form State
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Loading & Consultation History State
  const [initialLoading, setInitialLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [pastDesigns, setPastDesigns] = useState<DesignSummary[]>([]);

  // Interactive View States
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("editorial");
  const [activeWidget, setActiveWidget] = useState<AtelierAction>(null);
  const [prefilledOccasion, setPrefilledOccasion] = useState<string>("");
  const [prefilledGender, setPrefilledGender] = useState<"womenswear" | "menswear" | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);

  // Long-running work is tracked here, not in the cards, so closing a card or switching
  // designs never loses a film or a fitting. Callbacks may fire after the client moved on.
  const designRef = useRef<Design | null>(null);
  designRef.current = design;
  const studioJobs = useStudioJobs(api, onJobSettled);
  const runwayJob = studioJobs.jobs.find((j) => j.kind === "runway" && j.designId === design?.design_id) ?? null;
  const tryonBusy = studioJobs.jobs.some((j) => j.kind === "tryon" && j.status === "running" && j.designId === design?.design_id);
  const jobRunning = studioJobs.jobs.some((j) => j.status === "running");

  // Design-change feedback: which spec chips a request just changed, and every drape seen this session.
  const [changedSpec, setChangedSpec] = useState<Set<SpecKey>>(() => new Set());
  const prevSpecRef = useRef<{ id: string; spec: Spec } | null>(null);
  const [history, setHistory] = useState<Record<string, DesignVersion[]>>({});
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  // What the showcase shows: the current design, or the snapshot of an earlier version
  // (every asset that version had). Actions always work on the current design.
  const snapshot = design && viewingVersion !== null ? history[design.design_id]?.find((v) => v.version === viewingVersion) : undefined;
  const viewed: Design | null = design && snapshot && snapshot.version !== design.version ? { ...design, ...snapshot } : design;
  const lookingBack = Boolean(design && snapshot && snapshot.version !== design.version);

  useEffect(() => {
    if (!design?.image_url) {
      prevSpecRef.current = null;
      return;
    }
    const prev = prevSpecRef.current;
    prevSpecRef.current = { id: design.design_id, spec: design.spec };
    if (!prev || prev.id !== design.design_id) return;
    const diff = diffSpec(prev.spec, design.spec);
    if (diff.size === 0) return;
    setChangedSpec(diff);
    const t = window.setTimeout(() => setChangedSpec(new Set()), 2800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.design_id, design?.version]);

  useEffect(() => {
    if (!design?.image_url) return;
    const { design_id, version, image_url, flats_url, tryon_url, runway_url } = design;
    const snap: DesignVersion = { version, image_url, flats_url, tryon_url, runway_url };
    setHistory((h) => {
      const list = h[design_id] ?? [];
      const existing = list.find((v) => v.version === version);
      if (existing && JSON.stringify(existing) === JSON.stringify(snap)) return h;
      const next = existing ? list.map((v) => (v.version === version ? snap : v)) : [...list, snap];
      return { ...h, [design_id]: next.sort((a, b) => a.version - b.version) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.design_id, design?.version, design?.image_url, design?.flats_url, design?.tryon_url, design?.runway_url]);

  // A new version always brings the board back to the present.
  useEffect(() => {
    setViewingVersion(null);
  }, [design?.design_id, design?.version]);
  const [assetErrors, setAssetErrors] = useState<Record<string, boolean>>({});

  // The live Couturier. Callbacks are plain function declarations below (hoisted);
  // the hook reads them through a ref each render.
  const voice = useLiveVoice({
    designId: design?.design_id ?? null,
    onTranscript: liveTranscript,
    onTurnComplete: liveTurnComplete,
    onInterrupted: liveInterrupted,
    onDesign: liveDesign,
    onUserSpeech: () => setActiveWidget(null),
    onToolStart: (tool) => {
      if (tool === "update_design") setActiveWidget(null);
    },
    onFlats: (flatsUrl) => {
      setDesign((prev) => (prev ? { ...prev, flats_url: flatsUrl } : null));
      setActiveTab("flats");
      setActiveWidget(null);
    },
    onWidget: (widget, occasion, gender) => {
      setActiveWidget(widget);
      if (occasion) setPrefilledOccasion(occasion);
      if (gender === "menswear" || gender === "womenswear") setPrefilledGender(gender);
    },
    onRunwayStarted: (job) => {
      // The live Couturier started the film server-side; follow it here so it lands without a reload.
      const started = job as { job_id?: string } | null;
      const id = designRef.current?.design_id;
      if (started?.job_id && id) studioJobs.adoptRunway(id, started.job_id);
      setActiveTab("runway");
      setActiveWidget("runway");
    },
    onQuote: (quote) => {
      setQuoteData(quote);
      setActiveWidget("commission");
    },
    getHistory: () => messagesRef.current.filter((m) => m.text.trim()).map((m) => ({ role: m.role, text: m.text })),
  });
  const voiceDesigning = voice.tool === "update_design";

  // Where the commission stands and what to say next; drives the rail and the chat chips.
  const step = nextStep(design, {
    hasQuote: Boolean(quoteData),
    suggestedAction: (design?.suggested_action as AtelierAction) ?? null,
  });

  // Once commissioned the piece is sealed: the atelier makes what was ordered, so nothing on it
  // changes. Only the receipt can open, and an empty tab says it was never made instead of offering to make it.
  const commissioned = Boolean(design?.order_id);
  const shownWidget: AtelierAction = commissioned && activeWidget !== "commission" ? null : activeWidget;
  const sealedWithout =
    commissioned && activeTab !== "editorial" && !design?.[`${activeTab}_url` as "flats_url" | "tryon_url" | "runway_url"];

  // A live call must not go on editing a sealed piece.
  useEffect(() => {
    if (commissioned && voice.active) voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissioned, voice.active]);

  // Mobile shell: on phones the chat and the showcase are two full-height
  // panes behind a segmented switcher (see globals.css, max-width 767px).
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const assetSignatureRef = useRef<string | null>(null);

  // Widgets render inside the conversation stream, so opening one from the
  // showcase (or from a voice command) must bring the chat pane forward.
  useEffect(() => {
    if (activeWidget) setMobilePane("chat");
  }, [activeWidget]);

  // A freshly rendered asset brings the showcase forward. The signature is
  // seeded once the salon history is restored so a reload does not jump.
  useEffect(() => {
    const signature = design
      ? [design.image_url, design.flats_url, design.tryon_url, design.runway_url].join("|")
      : "";
    if (initialLoading) return;
    if (assetSignatureRef.current === null) {
      assetSignatureRef.current = signature;
      return;
    }
    if (signature !== assetSignatureRef.current) {
      assetSignatureRef.current = signature;
      if (design?.image_url) setMobilePane("showcase");
    }
  }, [design, initialLoading]);

  // Close the mobile menu sheet when the viewport grows back to desktop.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [menuOpen]);

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demo_mode)).catch(() => {});
  }, [api]);

  // Authenticate user against Atelier allowlist
  useEffect(() => {
    if (!ready) return;
    if (!user || user.isAnonymous) {
      setIsAllowed(false);
      setUserRole(null);
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    api
      .checkAuth()
      .then((res) => {
        setIsAllowed(res.allowed);
        setUserRole(res.role ?? null);
        if (!res.allowed) {
          setAuthDeniedReason(res.reason || "Your account is not on the Atelier allowlist.");
        } else {
          setAuthDeniedReason(null);
        }
      })
      .catch((err) => {
        setIsAllowed(false);
        const msg = (err as Error).message || "";
        if (msg.includes("Failed to fetch")) {
          setAuthDeniedReason(
            "Connection error connecting to Atelier services. Please check your network or try again.",
          );
        } else {
          setAuthDeniedReason(msg);
        }
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [ready, user, api]);

  async function loadArchive() {
    setArchiveLoading(true);
    try {
      const list = await api.listDesigns();
      setPastDesigns(list);
    } catch {
      // graceful fallback if offline
    } finally {
      setArchiveLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !user || user.isAnonymous || !isAllowed) return;
    loadArchive();
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setInitialLoading(false);
      return;
    }
    api
      .getDesign(id)
      .then((d) => {
        setDesign(d);
        setMessages(d.messages ?? []);
        setQuoteData(d.latest_quote ?? null);
        void seedVersions(d.design_id);
        if (d.suggested_action && d.suggested_action !== "none") {
          setActiveWidget(d.suggested_action as AtelierAction);
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [ready, user, isAllowed, api]);

  function liveTranscript(role: "user" | "model", text: string) {
    if (role === "user" && text.trim()) {
      setActiveWidget(null);
    }
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.live && last.role === role) return [...m.slice(0, -1), { ...last, text: last.text + text }];
      return [...m.map((x) => (x.live ? { ...x, live: false } : x)), { role, text, live: true }];
    });
  }

  function liveTurnComplete() {
    setMessages((m) => m.map((x) => (x.live ? { ...x, live: false } : x)));
  }

  // The client spoke over the Couturier: close the cut-short bubble so the next
  // words start a fresh one instead of being glued onto the interrupted sentence.
  function liveInterrupted() {
    setMessages((m) =>
      m.map((x) => (x.live && x.role === "model" ? { ...x, live: false, interrupted: true } : x)),
    );
  }

  function liveDesign(d: Design) {
    localStorage.setItem(STORAGE_KEY, d.design_id);
    setDesign(d);
    setAssetErrors({});
    setActiveTab("editorial");
    // In live voice mode, keep the flow conversational without forcing open popups
    setActiveWidget(null);
    loadArchive();
  }

  async function send(msg: MessageInput) {
    setActiveWidget(null);
    // While the live Couturier is on the line, typed words join the same conversation
    // instead of starting a parallel one over REST.
    if (voice.active && msg.text) {
      setMessages((m) => [...m.map((x) => (x.live ? { ...x, live: false } : x)), { role: "user", text: msg.text! }]);
      voice.sendMessage(msg.text);
      return;
    }
    setBusy(true);
    setError(null);
    if (msg.text) setMessages((m) => [...m, { role: "user", text: msg.text! }]);
    try {
      const d = design ? await api.sendMessage(design.design_id, msg) : await api.createDesign(msg);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setAssetErrors({});
      setActiveTab("editorial");
      setMessages((m) => [
        ...(msg.text ? m : [...m, { role: "user" as const, text: d.transcript || "(voice prompt)" }]),
        { role: "model", text: d.reply ?? "" },
      ]);
      // Open suggested widget if recommended by the Couturier
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      } else {
        setActiveWidget(null);
      }
      loadArchive();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function selectDesignFromArchive(id: string) {
    if (design?.design_id === id) return;
    setInitialLoading(true);
    setError(null);
    try {
      const d = await api.getDesign(id);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setMessages(d.messages ?? []);
      setQuoteData(d.latest_quote ?? null);
      void seedVersions(d.design_id);
      setActiveTab("editorial");
      setAssetErrors({});
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      } else {
        setActiveWidget(null);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setInitialLoading(false);
    }
  }

  // Voice mode: tell the live Couturier about something the client did with clicks so it can speak about it.
  function tellVoice(text: string) {
    if (voice.active) voice.sendMessage(text);
  }

  async function generateFlats(chosenSize?: string) {
    if (!design) return;
    setBusy(true);
    setError(null);
    setActiveWidget(null);
    setAssetErrors((e) => ({ ...e, flats: false }));
    const effectiveSize = chosenSize || design.spec.size || undefined;
    try {
      const res = await api.createFlats(design.design_id, effectiveSize);
      setDesign({
        ...design,
        flats_url: res.flats_url,
        spec: res.size ? { ...design.spec, size: res.size } : design.spec,
      });
      setActiveTab("flats");
      tellVoice(
        `[ATELIER UPDATE]: The technical flats${effectiveSize ? ` for size ${effectiveSize}` : ""} are now ready on the showcase board. ` +
          `Speak 1 short, warm sentence inviting the client to inspect them.`,
      );
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: Drafting the flats failed and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and offering to try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyMeasurements(size: string, measurements?: Measurements) {
    if (!design || quoteBusy) return;
    setQuoteBusy(true);
    setBusy(true);
    setError(null);
    setActiveTab("flats");
    setAssetErrors((e) => ({ ...e, flats: false }));
    tellVoice(
      `[ATELIER EVENT]: The client just applied size ${size} with their bespoke tape measurements. ` +
        `Speak 1 short, warm sentence confirming you are recalibrating the technical flats and tech pack to those exact measurements.`,
    );
    try {
      // The flats must carry the same numbers the client confirmed, so both are calibrated from one tape.
      const [flats, quote] = await Promise.all([
        api.createFlats(design.design_id, size, measurements),
        api.techpack(design.design_id, size, measurements),
      ]);
      setDesign({ ...design, flats_url: flats.flats_url, spec: { ...design.spec, size: size as typeof design.spec.size } });
      setQuoteData(quote);
      setActiveWidget("commission");
      tellVoice(
        `[ATELIER UPDATE]: The technical flats for size ${size} have been redrafted to the client's measurements and the tech pack and quote are ready on the showcase board. ` +
          `Speak 1 short, warm sentence telling the client so.`,
      );
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: Recalibrating the flats failed and nothing changed on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and offering to try again.`,
      );
    } finally {
      setQuoteBusy(false);
      setBusy(false);
    }
  }

  async function handleTryonUpload(file: File) {
    if (!design || tryonBusy) return;
    setError(null);
    setAssetErrors((e) => ({ ...e, tryon: false }));
    setActiveTab("tryon");
    setMessages((m) => [
      ...m,
      { role: "model", kind: "note", text: "Portrait received. Draping it in the salon mirror…" },
    ]);
    tellVoice(
      `[ATELIER EVENT]: The client just uploaded their portrait ('${file.name}') for the virtual fitting room. ` +
        `Speak 1 short, warm sentence acknowledging receipt and telling them you are draping the garment onto them in the salon mirror now, and it will take a moment.`,
    );
    try {
      const { upload_id } = await api.uploadPerson(file);
      const tryon_url = await studioJobs.track("tryon", design.design_id, () =>
        api.tryOn(design.design_id, upload_id).then((r) => r.tryon_url),
      );
      setDesign({ ...design, tryon_url, runway_url: null, has_vto_portrait: true });
      setActiveTab("tryon");
      setActiveWidget(null);
      setMessages((m) => [
        ...m,
        { role: "model", kind: "note", text: "Fitting ready on the Fitting tab." },
      ]);
      tellVoice(
        `[ATELIER UPDATE]: The garment has been draped onto the client's portrait and is now ready in the Fitting tab of the showcase board. ` +
          `Speak 1 short, warm sentence inviting the client to inspect the fit.`,
      );
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: The virtual fitting failed (${(e as Error).message}) and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and inviting the client to upload a clear, full-length, front-facing portrait to try again.`,
      );
    }
  }

  async function handleDrapeExisting() {
    if (!design || tryonBusy) return;
    setError(null);
    setAssetErrors((e) => ({ ...e, tryon: false }));
    setActiveTab("tryon");
    tellVoice(
      `[ATELIER EVENT]: The client asked to drape the current design onto their saved portrait. ` +
        `Speak 1 short, warm sentence telling them you are draping it in the salon mirror now.`,
    );
    try {
      const tryon_url = await studioJobs.track("tryon", design.design_id, () =>
        api.tryOn(design.design_id).then((r) => r.tryon_url),
      );
      setDesign({ ...design, tryon_url, runway_url: null, has_vto_portrait: true });
      setActiveTab("tryon");
      setActiveWidget(null);
      setMessages((m) => [
        ...m,
        { role: "model", kind: "note", text: "Draped onto your saved portrait. See the Fitting tab." },
      ]);
      tellVoice(
        `[ATELIER UPDATE]: The garment has been draped onto the client's saved portrait and is ready in the Fitting tab. ` +
          `Speak 1 short, warm sentence inviting the client to inspect the fit.`,
      );
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: The virtual fitting failed and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and offering to try again.`,
      );
    }
  }

  async function handleDesignUploadSubmit(
    file: File,
    notes?: string,
    gender?: string,
    size?: string,
  ) {
    setBusy(true);
    setError(null);
    setActiveWidget(null);
    const userText = notes?.trim()
      ? `[Uploaded Design Reference: ${file.name}] ${notes}`
      : `[Uploaded Design Reference: ${file.name}] Please tailor an haute couture outfit inspired by this design.`;
    const ackText = `Splendid reference! I have received "${file.name}" and am analyzing its silhouette, lines, and tailoring structure now. Allow me to formulate the certified atelier textiles and begin sculpting the drape on your showcase board.`;
    setMessages((m) => [
      ...m,
      { role: "user", text: userText },
      { role: "model", text: ackText },
    ]);

    if (voice.active) {
      voice.sendMessage(
        `[ATELIER EVENT]: The VIP client has just uploaded their design reference image ('${file.name}'). ` +
        `Speak 1 short, warm, elegant verbal sentence in your spoken voice acknowledging receipt of their reference and letting them know ` +
        `you are analyzing its lines and beginning to sculpt their bespoke silhouette on the showcase board right now.`
      );
    }

    try {
      const d = await api.createDesignFromImage(file, notes, gender, size);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setAssetErrors({});
      setActiveTab("editorial");
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text:
            d.reply ||
            "I have translated your uploaded sketch into an haute couture silhouette capturing its lines, texture, and spirit.",
        },
      ]);
      if (voice.active) {
        voice.setDesignId(d.design_id);
        voice.sendMessage(
          `[ATELIER UPDATE]: The bespoke design inspired by the client's reference has finished draping on the showcase board, along with technical flats and measurements. ` +
          `Speak 1 short, warm spoken sentence informing the client that their bespoke drape and architectural technical flats are ready on the showcase board.`
        );
      }
      loadArchive();
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: The design could not be completed and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and inviting the client to try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOccasionSubmit(params: {
    occasion: string;
    file?: File | null;
    preferences?: string;
    gender?: string;
    size?: string;
    consent?: boolean;
  }) {
    setBusy(true);
    setError(null);
    setActiveWidget(null);
    const userText = params.file
      ? `[Occasion: ${params.occasion} + Portrait Provided] ${params.preferences || "Please design the ideal outfit and drape it onto my photo."}`
      : `[Occasion: ${params.occasion}] ${params.preferences || "Please curate an outfit tailored for this event."}`;
    const ackText = `Delightful! I am formulating an exquisite bespoke couture silhouette tailored for ${params.occasion}. Let me begin draping the textiles and preparing the cut for your showcase board.`;
    setMessages((m) => [
      ...m,
      { role: "user", text: userText },
      { role: "model", text: ackText },
    ]);

    if (voice.active) {
      voice.sendMessage(
        `[ATELIER EVENT]: The VIP client has specified their upcoming occasion: '${params.occasion}'. ` +
        `Speak 1 short, warm, elegant verbal sentence in your spoken voice acknowledging their event and confirming you are beginning to concoct the ideal bespoke silhouette for them now.`
      );
    }

    try {
      const d = await api.createDesignForOccasion(params);
      localStorage.setItem(STORAGE_KEY, d.design_id);
      setDesign(d);
      setAssetErrors({});
      if (d.tryon_url) {
        setActiveTab("tryon");
      } else {
        setActiveTab("editorial");
      }
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text:
            d.reply ||
            (d.tryon_url
              ? `I have crafted a bespoke silhouette curated exclusively for ${params.occasion} and draped it onto your portrait in the salon mirror.`
              : `I have curated a bespoke silhouette designed for ${params.occasion}.`),
        },
      ]);
      if (voice.active) {
        voice.setDesignId(d.design_id);
        voice.sendMessage(
          `[ATELIER UPDATE]: The bespoke outfit designed for ${params.occasion} has finished draping on the showcase board. ` +
          `Speak 1 short spoken sentence inviting the client to view the drape and architectural technical flats.`
        );
      }
      loadArchive();
    } catch (e) {
      setError(friendlyError(e));
      tellVoice(
        `[ATELIER UPDATE]: The design could not be completed and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and inviting the client to try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  // One place turns a next-step into something that happens: a sentence to the Couturier,
  // a card, a tab, or the flats. Chips, the rail and the toolbar all go through here.
  function runStep(action: StepAction) {
    switch (action.kind) {
      case "say":
        send({ text: action.text });
        break;
      case "widget":
        setActiveWidget(activeWidget === action.widget ? null : action.widget);
        break;
      case "flats":
        setActiveTab("flats");
        setMobilePane("showcase");
        if (design && !design.flats_url && action.size) generateFlats(action.size);
        break;
      case "tab":
        setActiveTab(action.tab);
        setMobilePane("showcase");
        break;
      case "techpack":
        // Ask for the size (and tape) before pricing anything; the card drafts flats and quote together.
        setActiveWidget(quoteData ? "commission" : "measurements");
        break;
      case "talk":
        voice.start();
        break;
      case "new":
        startOver();
        break;
    }
  }

  function jumpToStage(stage: Stage) {
    if (stage === "techpack") {
      setActiveWidget(quoteData ? "commission" : "measurements");
      return;
    }
    const tab = STAGES.find((s) => s.id === stage)?.tab;
    if (tab) runStep({ kind: "tab", tab });
  }

  // A film or fitting finished, possibly after the client moved on to another design.
  function onJobSettled(job: StudioJob) {
    if (job.kind !== "runway") return;
    if (job.status === "done" && job.resultUrl) {
      const url = job.resultUrl;
      setDesign((d) => (d && d.design_id === job.designId ? { ...d, runway_url: url } : d));
      setAssetErrors((e) => ({ ...e, runway: false }));
      tellVoice(
        `[ATELIER UPDATE]: The runway film is ready on the Runway tab of the showcase board. ` +
          `Speak 1 short, warm sentence inviting the client to watch it.`,
      );
    } else if (job.status === "error") {
      tellVoice(
        `[ATELIER UPDATE]: The runway film failed (${job.error}) and nothing new is on the showcase board. Do NOT say it is ready. ` +
          `Speak 1 short sentence apologising and offering to try again.`,
      );
    }
  }

  // Earlier drapes come from the server so looking back works after a reload; the session's
  // richer snapshots (flats, fitting, runway) are kept where they exist.
  async function seedVersions(designId: string) {
    try {
      const list = await api.listVersions(designId);
      setHistory((h) => {
        const have = h[designId] ?? [];
        const merged = [...have];
        for (const v of list) {
          if (!v.image_url || merged.some((x) => x.version === v.version)) continue;
          merged.push({ version: v.version, image_url: v.image_url, flats_url: null, tryon_url: null, runway_url: null, note: v.instruction ?? undefined });
        }
        return { ...h, [designId]: merged.sort((a, b) => a.version - b.version) };
      });
    } catch {
      // the strip simply shows what this session has seen
    }
  }

  const [restoring, setRestoring] = useState(false);

  async function restoreVersion(version: number) {
    if (!design || restoring) return;
    setRestoring(true);
    setError(null);
    try {
      const d = await api.restoreVersion(design.design_id, version);
      setDesign(d);
      if (d.messages?.length) setMessages(d.messages);
      setQuoteData(null);
      setActiveWidget(null);
      setActiveTab("editorial");
      setAssetErrors({});
      setViewingVersion(null);
      void seedVersions(d.design_id);
      loadArchive();
      tellVoice(
        `[ATELIER UPDATE]: The client brought back version ${version}; it is now version ${d.version} on the showcase board, without flats, fitting or runway. ` +
          `Speak 1 short, warm sentence confirming it and offering to redraft the flats.`,
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRestoring(false);
    }
  }

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
    setViewingVersion(null);
    setDesign(null);
    setMessages([]);
    setQuoteData(null);
    setActiveWidget(null);
    setPrefilledOccasion("");
    setPrefilledGender(null);
    setActiveTab("editorial");
    setAssetErrors({});
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setAuthSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      switch (e.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Incorrect email or password. Please verify your credentials or contact an administrator.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many unsuccessful login attempts. Please try again later.");
          break;
        default:
          setError(e.message || "Authentication failed. Please verify your credentials.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code !== "auth/popup-closed-by-user") {
        if (e.code === "auth/unauthorized-domain") {
          setError(
            "Google Sign-In: Unauthorized domain. Please sign in with Email & Password above while domain authorization propagates in Firebase.",
          );
        } else {
          setError(e.message || "Failed to sign in with Google.");
        }
      }
    }
  }

  async function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY);
    await signOut(auth);
  }

  if (!ready || (user && !user.isAnonymous && authChecking)) {
    return (
      <div className="atelier-auth-gate">
        <div className="atelier-auth-drape" aria-hidden="true">
          <StaticDrape />
        </div>
        <div className="atelier-auth-top">
          <div className="brand">
            <Link href="/">
              <h1>
                Thread <span>&amp;</span> Pixel
              </h1>
              <span className="atelier-tag">Haute Couture Atelier</span>
            </Link>
          </div>
          <Link href="/" className="back-link">
            &larr; Back to the atelier
          </Link>
        </div>
        <div className="atelier-auth-body">
        <div className="atelier-auth-card">
          <div className="atelier-auth-badge">
            <SparkleIcon size={13} />
            <span>Private salon</span>
          </div>
          <h2 className="atelier-auth-title">
            One <span>moment</span>.
          </h2>
          <p className="atelier-auth-desc">Verifying your atelier credentials.</p>
        </div>
        </div>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="atelier-auth-gate">
        <div className="atelier-auth-drape" aria-hidden="true">
          <StaticDrape />
        </div>
        <div className="atelier-auth-top">
          <div className="brand">
            <Link href="/">
              <h1>
                Thread <span>&amp;</span> Pixel
              </h1>
              <span className="atelier-tag">Haute Couture Atelier</span>
            </Link>
          </div>
          <Link href="/" className="back-link">
            &larr; Back to the atelier
          </Link>
        </div>
        <div className="atelier-auth-body">
        <div className="atelier-auth-card">
          <div className="atelier-auth-badge">
            <LockIcon size={13} />
            <span>Designer studio</span>
          </div>
          <h2 className="atelier-auth-title">
            Enter the <span>studio</span>.
          </h2>
          <p className="atelier-auth-desc">
            Sign in with your atelier credentials or Google to consult the Master Couturier, draft flats, fit and
            commission a piece. Access is by invitation.
          </p>

          {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

          {/* Email / Password Form */}
          <form className="auth-form" onSubmit={handleEmailAuth}>
            <div className="auth-field">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="designer@threadandpixel.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={authSubmitting}
            >
              {authSubmitting ? "Verifying Atelier Access..." : "Enter Atelier Studio"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon size={18} />
            <span>Sign in with Google</span>
          </button>

          <div className="atelier-auth-footer">
            <span>Tailoring units and factories</span>
            <Link href="/factory">Factory Portal</Link>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="atelier-auth-gate">
        <div className="atelier-auth-drape" aria-hidden="true">
          <StaticDrape />
        </div>
        <div className="atelier-auth-top">
          <div className="brand">
            <Link href="/">
              <h1>
                Thread <span>&amp;</span> Pixel
              </h1>
              <span className="atelier-tag">Haute Couture Atelier</span>
            </Link>
          </div>
          <Link href="/" className="back-link">
            &larr; Back to the atelier
          </Link>
        </div>
        <div className="atelier-auth-body">
        <div className="atelier-auth-card">
          <div className="atelier-auth-badge restricted">
            <AlertTriangleIcon size={13} />
            <span>Access Restricted</span>
          </div>
          <h2 className="atelier-auth-title">
            Atelier <span>Access Restricted</span>
          </h2>
          <p className="atelier-auth-desc">
            Your account is authenticated, but not enrolled on the Thread &amp; Pixel studio allowlist.
          </p>

          <div className="atelier-restricted-box">
            <div className="atelier-restricted-header">
              <LockIcon size={14} />
              <span>Unauthorized Account</span>
            </div>
            <div className="atelier-restricted-email">{user.email || user.uid}</div>
            <div className="atelier-restricted-instruction">
              {authDeniedReason || "This account does not have active designer or administrator privileges."}
              <br />
              Please contact an atelier administrator to request access for this account.
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              className="google-signin-btn"
              style={{ width: "auto" }}
              onClick={handleGoogleSignIn}
              title="Sign in with a different Google account"
            >
              Switch Account
            </button>
            <button
              type="button"
              className="signout-nav-btn"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>

          <div className="atelier-auth-footer">
            <span>Tailoring units and factories</span>
            <Link href="/factory">Factory Portal</Link>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="atelier-app">
      <a className="skip-link" href="#studio-main">
        Skip to the studio
      </a>
      <header className="topbar">
        <div className="brand">
          <Link href="/" title="Thread & Pixel home">
            <h1>
              Thread <span>&amp;</span> Pixel
            </h1>
            <span className="atelier-tag">Haute Couture Atelier</span>
          </Link>
        </div>
        <nav className="topbar-nav">
          {demoMode !== "off" && <span className="demo-badge">demo mode: {demoMode}</span>}
          {design && (
            <button type="button" className="secondary new-commission-btn" onClick={startOver}>
              <PlusIcon size={13} />
              <span>New Commission</span>
            </button>
          )}
          <button
            type="button"
            className="archive-trigger-btn"
            onClick={() => {
              setArchiveOpen(true);
              loadArchive();
            }}
          >
            <ArchiveIcon size={14} />
            <span>Archive{pastDesigns.length > 0 ? ` (${pastDesigns.length})` : ""}</span>
          </button>
          <Link href="/factory">Factory Portal</Link>
          <div className="topbar-divider" />
          <div className="atelier-user-profile" title={`Signed in as ${user.email}`}>
            <div className="user-avatar-circle">
              {(user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="user-profile-info">
              <span className="user-profile-name">{user.email?.split("@")[0]}</span>
              {userRole && <span className={`auth-user-role ${userRole}`}>{userRole}</span>}
            </div>
            <button
              type="button"
              className="signout-nav-btn"
              onClick={handleSignOut}
              title="Sign out of Atelier Studio"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Phone topbar: archive + menu sheet instead of the full nav */}
        <div className="topbar-mobile">
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => {
              setMenuOpen(false);
              setArchiveOpen(true);
              loadArchive();
            }}
            aria-label="Open the archive"
            title="Archive"
          >
            <ArchiveIcon size={17} />
            {pastDesigns.length > 0 && <span className="topbar-icon-count">{pastDesigns.length}</span>}
          </button>
          <button
            type="button"
            className={`topbar-icon-btn ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="topbar-sheet"
          >
            {menuOpen ? <CloseIcon size={16} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="topbar-sheet-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="topbar-sheet" id="topbar-sheet" role="menu">
            <div className="topbar-sheet-user">
              <div className="user-avatar-circle">{(user.email?.[0] || "U").toUpperCase()}</div>
              <div className="topbar-sheet-user-info">
                <span className="user-profile-name">{user.email?.split("@")[0]}</span>
                <span className="topbar-sheet-email">{user.email}</span>
              </div>
              {userRole && <span className={`auth-user-role ${userRole}`}>{userRole}</span>}
            </div>
            {demoMode !== "off" && <span className="demo-badge">demo mode: {demoMode}</span>}
            {design && (
              <button
                type="button"
                className="sheet-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  startOver();
                }}
              >
                <PlusIcon size={15} />
                <span>New Commission</span>
              </button>
            )}
            <button
              type="button"
              className="sheet-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setArchiveOpen(true);
                loadArchive();
              }}
            >
              <ArchiveIcon size={15} />
              <span>Archive{pastDesigns.length > 0 ? ` (${pastDesigns.length})` : ""}</span>
            </button>
            <Link href="/factory" className="sheet-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <ClipboardIcon size={15} />
              <span>Factory Portal</span>
            </Link>
            <button
              type="button"
              className="sheet-item danger"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                handleSignOut();
              }}
            >
              <LockIcon size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {/* Phone pane switcher: the chat and the showcase take turns filling the screen */}
      <div className="mobile-pane-switch" role="tablist" aria-label="Studio panes">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "chat"}
          className={`mobile-pane-btn ${mobilePane === "chat" ? "active" : ""}`}
          onClick={() => setMobilePane("chat")}
        >
          <ChatIcon size={15} />
          <span>Couturier</span>
          {(busy || voiceDesigning || jobRunning) && mobilePane !== "chat" && <span className="mobile-pane-dot busy" aria-hidden="true" />}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "showcase"}
          className={`mobile-pane-btn ${mobilePane === "showcase" ? "active" : ""}`}
          onClick={() => setMobilePane("showcase")}
        >
          <GalleryIcon size={15} />
          <span>Showcase</span>
          {design && design.version > 0 && <span className="mobile-pane-version">v{design.version}</span>}
        </button>
      </div>

      <main className="studio" id="studio-main" tabIndex={-1}>
        {initialLoading ? (
          <div className="grid" data-pane={mobilePane}>
            <section className="panel chat-panel">
              <div className="panel-head">
                <h2>Couturier Consultation</h2>
                <span className="mannequin-badge">✦ Restoring Salon History</span>
              </div>
              <ChatSkeleton />
            </section>
            <section className="panel showcase-panel">
              <div className="panel-head">
                <h2 className="showcase-title">
                  <span>Couture Showcase</span>
                </h2>
              </div>
              <ShowcaseSkeleton />
            </section>
          </div>
        ) : (
          <div className="grid" data-pane={mobilePane}>
        {/* Left Column: Conversational Atelier Stream */}
        <Chat
          messages={messages}
          busy={busy}
          onSend={send}
          activeWidget={shownWidget}
          onSelectWidget={setActiveWidget}
          voice={voice}
          chips={step.chips}
          onChip={runStep}
          dockHint={design && step.stage ? `Next: say “${step.say}”` : undefined}
          sealed={design?.order_id ? { orderId: design.order_id, onNewCommission: startOver } : undefined}
          widgetContent={
            activeWidget === "design_upload" ? (
              <DesignUploadCard
                onSubmit={handleDesignUploadSubmit}
                onClose={() => setActiveWidget(null)}
                busy={busy}
              />
            ) : activeWidget === "occasion_stylist" ? (
              <OccasionStylistCard
                initialOccasion={prefilledOccasion}
                initialGender={prefilledGender || (design?.spec.gender === "menswear" || design?.spec.gender === "womenswear" ? design.spec.gender : null)}
                hasExistingPortrait={Boolean(design?.has_vto_portrait || design?.tryon_url)}
                onSubmit={handleOccasionSubmit}
                onClose={() => {
                  setActiveWidget(null);
                  setPrefilledOccasion("");
                  setPrefilledGender(null);
                }}
                busy={busy}
              />
            ) : activeWidget === "measurements" ? (
              <MeasurementCard
                initialSize={design?.spec.size ?? "M"}
                gender={design?.spec.gender}
                garmentType={design?.spec.garment_type}
                onSubmit={handleApplyMeasurements}
                onClose={() => setActiveWidget(null)}
                busy={quoteBusy}
              />
            ) : activeWidget === "fitting" ? (
              <FittingRoomCard
                onSubmit={handleTryonUpload}
                onDrapeExisting={handleDrapeExisting}
                hasExistingPortrait={Boolean(design?.has_vto_portrait || design?.tryon_url)}
                onClose={() => setActiveWidget(null)}
                busy={tryonBusy}
              />
            ) : activeWidget === "runway" && design ? (
              <RunwayCard
                runwayUrl={design.runway_url}
                job={runwayJob}
                onStart={() => {
                  void studioJobs.startRunway(design.design_id);
                  setActiveTab("runway");
                }}
                onClose={() => setActiveWidget(null)}
              />
            ) : activeWidget === "commission" && design && quoteData ? (
              <CommissionCard
                key={design.design_id}
                designId={design.design_id}
                data={quoteData}
                placedOrderId={design.order_id}
                onOrderPlaced={(orderId) => {
                  // The receipt stays open; the design is sealed from here on.
                  const id = design.design_id;
                  setDesign((d) => (d && d.design_id === id ? { ...d, order_id: orderId } : d));
                  loadArchive();
                }}
                onClose={() => setActiveWidget(null)}
              />
            ) : null
          }
        />

        {/* Right Column: Couture Showcase & Moodboard */}
        <section className="panel showcase-panel" aria-label="Couture showcase">
          <div className="panel-head">
            <h2 className="showcase-title">
              <span>Couture Showcase</span>
              {design && (
                <span className="version-pill">
                  {design.version > 0 ? `v${design.version}` : "Consultation"}
                </span>
              )}
              {design?.occasion && (
                <span className="occasion-pill" title={`Curated for: ${design.occasion}`}>
                  <PartyIcon size={11} />
                  <span>{design.occasion}</span>
                </span>
              )}
              {design?.reference_image_url && (
                <span className="reference-pill" title="Inspired by uploaded design reference">
                  <ImageIcon size={11} />
                  <span>Custom Reference</span>
                </span>
              )}
            </h2>
            <JobChips
              jobs={studioJobs.jobs}
              onOpen={(job) => {
                setActiveTab(job.kind === "runway" ? "runway" : "tryon");
                setMobilePane("showcase");
              }}
              onRetry={(job) => {
                if (job.kind === "runway") void studioJobs.startRunway(job.designId);
                else setActiveWidget("fitting");
              }}
              onDismiss={studioJobs.dismiss}
            />
            <div
              className="view-tabs"
              role="tablist"
              aria-label="Showcase views"
              onKeyDown={(e) => {
                const order: ShowcaseTab[] = ["editorial", "flats", "tryon", "runway"];
                const i = order.indexOf(activeTab);
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const next = order[(i + (e.key === "ArrowRight" ? 1 : order.length - 1)) % order.length];
                  setActiveTab(next);
                  (e.currentTarget.querySelector(`[data-tab="${next}"]`) as HTMLButtonElement | null)?.focus();
                }
              }}
            >
              <button
                type="button"
                className={`view-tab ${activeTab === "editorial" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "editorial"}
                tabIndex={activeTab === "editorial" ? 0 : -1}
                data-tab="editorial"
                onClick={() => setActiveTab("editorial")}
              >
                <SparkleIcon size={12} />
                <span>Editorial</span>
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "flats" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "flats"}
                tabIndex={activeTab === "flats" ? 0 : -1}
                data-tab="flats"
                onClick={() => setActiveTab("flats")}
              >
                <RulerIcon size={12} />
                <span>Flats</span>
                {viewed?.flats_url && <span className="tab-pill ready">{viewed.spec.size ? `size ${viewed.spec.size}` : "ready"}</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "tryon" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "tryon"}
                tabIndex={activeTab === "tryon" ? 0 : -1}
                data-tab="tryon"
                onClick={() => setActiveTab("tryon")}
              >
                <MirrorIcon size={12} />
                <span>Fitting</span>
                {viewed?.tryon_url && <span className="tab-pill ready">ready</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "runway" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "runway"}
                tabIndex={activeTab === "runway" ? 0 : -1}
                data-tab="runway"
                onClick={() => setActiveTab("runway")}
              >
                <FilmIcon size={12} />
                <span>Runway</span>
                {viewed?.runway_url && <span className="tab-pill ready">ready</span>}
              </button>
            </div>
          </div>

          {/* High-Resolution Frame */}
          <div className="canvas-frame">
            {(busy || voiceDesigning) && (!viewed || !viewed.image_url) ? (
              <div className="silk-shimmer-full">
                <div className="shimmer-aura">
                  <span className="shimmer-icon">
                    <SparkleIcon size={24} />
                  </span>
                </div>
                <h3 className="shimmer-title">Draping Haute Couture Silhouette</h3>
                <span className="shimmer-subtitle">Weaving bespoke textiles &amp; formulating tailoring specs…</span>
              </div>
            ) : viewed && viewed.image_url ? (
              <>
                {(busy || voiceDesigning || (tryonBusy && !!viewed.tryon_url)) && (
                  <div className="silk-shimmer-overlay">
                    <span className="spin-silk">
                      <SparkleIcon size={13} />
                    </span>{" "}
                    {tryonBusy ? "Draping on Your Portrait…" : activeTab === "flats" ? "Calibrating Technical Flats…" : "Updating Couture Drape…"}
                  </div>
                )}

                {/* Error Fallback when asset preview fails to load */}
                <div key={activeTab} className="canvas-view">
                {lookingBack && activeTab !== "editorial" && !viewed[`${activeTab === "tryon" ? "tryon" : activeTab}_url` as "flats_url" | "tryon_url" | "runway_url"] ? (
                  <div className="asset-empty-state">
                    <span className="mannequin-badge">✦ Version {viewingVersion}</span>
                    <h3 className="asset-empty-title">
                      {activeTab === "flats" ? "No flats were drafted for this version" : activeTab === "tryon" ? "This version was never fitted" : "No runway film for this version"}
                    </h3>
                    <p className="asset-empty-desc">Go back to the current version to {activeTab === "flats" ? "draft the flats" : activeTab === "tryon" ? "step into the fitting room" : "film the runway"}.</p>
                    <button type="button" className="secondary small" onClick={() => setViewingVersion(null)}>
                      Back to current
                    </button>
                  </div>
                ) : sealedWithout ? (
                  <div className="asset-empty-state">
                    <span className="mannequin-badge">✦ Commissioned</span>
                    <h3 className="asset-empty-title">
                      {activeTab === "flats" ? "Commissioned without technical flats" : activeTab === "tryon" ? "Commissioned without a fitting" : "Commissioned without a runway film"}
                    </h3>
                    <p className="asset-empty-desc">The piece is sealed as it was sent to the atelier.</p>
                  </div>
                ) : assetErrors[activeTab] ? (
                  <div className="asset-empty-state">
                    <div className="asset-empty-icon-ring error">
                      <AlertTriangleIcon size={24} />
                    </div>
                    <span className="mannequin-badge error">✦ Display Error</span>
                    <h3 className="asset-empty-title">Asset Preview Unavailable</h3>
                    <p className="asset-empty-desc">
                      The media preview for this {activeTab} asset could not be loaded or has expired.
                    </p>
                    {activeTab === "flats" && !commissioned ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, flats: false }));
                          generateFlats();
                        }}
                        disabled={busy}
                      >
                        <RefreshIcon size={14} /> <span>Re-draft Technical Flats</span>
                      </button>
                    ) : activeTab === "tryon" && !commissioned ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, tryon: false }));
                          setActiveWidget("fitting");
                        }}
                      >
                        <MirrorIcon size={14} /> <span>Re-open Fitting Room</span>
                      </button>
                    ) : activeTab === "runway" && !commissioned ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setAssetErrors((e) => ({ ...e, runway: false }));
                          setActiveWidget("runway");
                        }}
                      >
                        <FilmIcon size={14} /> <span>Re-open Runway Studio</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setAssetErrors((e) => ({ ...e, editorial: false }))}
                      >
                        <RefreshIcon size={14} /> <span>Retry Loading</span>
                      </button>
                    )}
                  </div>
                ) : activeTab === "flats" ? (
                  viewed.flats_url ? (
                    <div className="flats-view">
                      <img
                        src={viewed.flats_url}
                        alt="Technical flat sketch"
                        onError={() => setAssetErrors((e) => ({ ...e, flats: true }))}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.8rem",
                          background: "var(--cream)",
                          borderRadius: "var(--radius-sm)",
                          marginTop: "0.6rem",
                          border: "1px solid var(--line-light)",
                          flexWrap: "wrap",
                          gap: "0.4rem",
                        }}
                      >
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-secondary)" }}>
                          Calibrated: <strong style={{ color: "var(--gold-dark)" }}>{viewed.spec.size ? `Size ${viewed.spec.size}` : "Proportional Draft"}</strong>
                        </span>
                        {!commissioned && (
                          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginRight: "0.2rem" }}>Re-calibrate:</span>
                            {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                className={`chip-btn ${viewed.spec.size === sz ? "highlight" : ""}`}
                                style={{ padding: "0.2rem 0.45rem", fontSize: "var(--text-xs)" }}
                                onClick={() => generateFlats(sz)}
                                disabled={busy}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="asset-empty-state">
                      <div className="canvas-art flat" aria-hidden="true">
                        <GarmentFlat compact />
                      </div>
                      <span className="mannequin-badge">✦ Technical Drawing &amp; CAD Measurements</span>
                      <h3 className="asset-empty-title">Draft Architectural Technical Flats</h3>
                      <p className="asset-empty-desc">
                        Select your size to calibrate precision CAD dimension lines and tailoring measurements:
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.45rem",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          margin: "0.8rem 0 1.2rem",
                        }}
                      >
                        {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`chip-btn ${viewed.spec.size === sz ? "highlight" : ""}`}
                            style={{ padding: "0.45rem 0.85rem", fontSize: "var(--text-sm)", fontWeight: 600 }}
                            onClick={() => generateFlats(sz)}
                            disabled={busy}
                          >
                            Size {sz}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: "0.8rem", color: "var(--ink-secondary)" }}
                        onClick={() => generateFlats()}
                        disabled={busy}
                      >
                        I&apos;m not sure about my size · Draft with standard proportions
                      </button>
                    </div>
                  )
                ) : activeTab === "tryon" ? (
                  tryonBusy && !viewed.tryon_url ? (
                    <div className="silk-shimmer-full" role="status" aria-live="polite">
                      <div className="shimmer-aura">
                        <span className="shimmer-icon">
                          <MirrorIcon size={24} />
                        </span>
                      </div>
                      <h3 className="shimmer-title">Draping You in the Salon Mirror</h3>
                      <span className="shimmer-subtitle">Fitting the garment to your portrait. This takes a moment…</span>
                    </div>
                  ) : viewed.tryon_url ? (
                    <CrossfadeImage
                      src={viewed.tryon_url}
                      alt="Virtual try-on drape"
                      onError={() => setAssetErrors((e) => ({ ...e, tryon: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="canvas-art" aria-hidden="true">
                        <SalonMirror />
                      </div>
                      <span className="mannequin-badge">✦ Salon Mirror</span>
                      <h3 className="asset-empty-title">
                        {viewed.has_vto_portrait ? "Saved Portrait Ready" : "Virtual Fitting Not Yet Draped"}
                      </h3>
                      <p className="asset-empty-desc">
                        {viewed.has_vto_portrait
                          ? "Your portrait is safely saved in the atelier. Drape this updated piece onto your portrait, or open the fitting room to upload a new one."
                          : "Upload your full-length portrait to step into the virtual salon mirror and drape this bespoke creation directly onto your frame."}
                      </p>
                      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
                        {viewed.has_vto_portrait && (
                          <button
                            type="button"
                            className="primary"
                            onClick={handleDrapeExisting}
                            disabled={tryonBusy}
                          >
                            <SparkleIcon size={14} />
                            <span>{tryonBusy ? "Draping on You…" : "Drape on Saved Portrait"}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className={viewed.has_vto_portrait ? "secondary" : "primary"}
                          onClick={() => setActiveWidget("fitting")}
                          disabled={tryonBusy}
                        >
                          <MirrorIcon size={14} />
                          <span>{viewed.has_vto_portrait ? "Re-upload Portrait" : "Enter Virtual Fitting Room"}</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : activeTab === "runway" ? (
                  runwayJob?.status === "running" && !viewed.runway_url ? (
                    <div className="silk-shimmer-full" role="status" aria-live="polite">
                      <div className="shimmer-aura">
                        <span className="shimmer-icon">
                          <FilmIcon size={24} />
                        </span>
                      </div>
                      <h3 className="shimmer-title">Filming the runway</h3>
                      <span className="shimmer-subtitle">Usually one to two minutes. Keep designing; the film will appear here.</span>
                    </div>
                  ) : viewed.runway_url ? (
                    <video
                      src={viewed.runway_url}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={() => setAssetErrors((e) => ({ ...e, runway: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <FilmIcon size={26} />
                      </div>
                      <span className="mannequin-badge">✦ Haute Couture Runway</span>
                      <h3 className="asset-empty-title">Runway Motion Film Not Yet Rendered</h3>
                      <p className="asset-empty-desc">
                        Direct an 8-second cinematic runway showcase powered by Google Veo to experience the movement, drapery fluidity, and salon lighting.
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setActiveWidget("runway")}
                      >
                        <FilmIcon size={14} />
                        <span>Direct Runway Film</span>
                      </button>
                    </div>
                  )
                ) : (
                  <CrossfadeImage
                    src={viewed.image_url}
                    alt="High-resolution couture garment render"
                    onError={() => setAssetErrors((e) => ({ ...e, editorial: true }))}
                  />
                )}
                </div>
              </>
            ) : (
              <div className="canvas-placeholder">
                <span className="mannequin-badge">
                  <SparkleIcon size={10} /> {design && design.version === 0 ? "✦ Consultation in Progress" : "Bespoke Canvas"}
                </span>
                <div className="canvas-art" aria-hidden="true">
                  <DressForm />
                </div>
                <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", color: "var(--ink)" }}>
                  The Atelier Mannequin
                </strong>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", maxWidth: "320px", color: "var(--muted)", lineHeight: 1.5 }}>
                  {design && design.version === 0
                    ? "Consulting on your bespoke color, fit, fabric, and size. Draping will commence as soon as specifications are chosen."
                    : "Your bespoke design will be draped here as you speak or describe your silhouette to the Couturier."}
                </p>
              </div>
            )}
            {design && (
              <VersionStrip
                versions={history[design.design_id] ?? []}
                current={design.version}
                viewing={lookingBack ? viewingVersion : null}
                onView={setViewingVersion}
                onRestore={commissioned ? undefined : restoreVersion}
                restoring={restoring}
              />
            )}
          </div>
          <NextSteps step={step} voiceActive={voice.active} onAction={runStep} onJump={jumpToStage} />

          {/* Garment Details & Spec Ribbon */}
          {design && design.version > 0 && (
            <>
              <SpecRibbon
                spec={design.spec}
                occasion={design.occasion}
                referenced={Boolean(design.reference_image_url)}
                changed={changedSpec}
              />

              {/* One row of secondary actions; upload and occasion live in the composer, the next step in the rail */}
              <div className="showcase-actions">
                {commissioned ? (
                  // Sealed: look at what was commissioned, make nothing new.
                  <>
                    {design.flats_url && (
                      <button type="button" className="secondary small" onClick={() => runStep({ kind: "tab", tab: "flats" })}>
                        <RulerIcon size={13} />
                        <span>View flats</span>
                      </button>
                    )}
                    {design.tryon_url && (
                      <button type="button" className="secondary small" onClick={() => runStep({ kind: "tab", tab: "tryon" })}>
                        <MirrorIcon size={13} />
                        <span>Fitting</span>
                      </button>
                    )}
                    {design.runway_url && (
                      <button type="button" className="secondary small" onClick={() => runStep({ kind: "tab", tab: "runway" })}>
                        <FilmIcon size={13} />
                        <span>Runway</span>
                      </button>
                    )}
                    {quoteData && (
                      <button
                        type="button"
                        className="secondary small"
                        aria-pressed={activeWidget === "commission"}
                        onClick={() => setActiveWidget(activeWidget === "commission" ? null : "commission")}
                      >
                        <ClipboardIcon size={13} />
                        <span>Tech pack</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary small"
                      aria-pressed={activeWidget === "measurements"}
                      onClick={() => setActiveWidget(activeWidget === "measurements" ? null : "measurements")}
                    >
                      <ScissorsIcon size={13} />
                      <span>Measurements</span>
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      aria-pressed={activeWidget === "fitting"}
                      onClick={() => setActiveWidget(activeWidget === "fitting" ? null : "fitting")}
                    >
                      <MirrorIcon size={13} />
                      <span>Fitting room</span>
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => runStep({ kind: "flats", size: design.spec.size })}
                      disabled={busy}
                    >
                      <RulerIcon size={13} />
                      <span>{design.flats_url ? "View flats" : "Draft flats"}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      aria-pressed={activeWidget === "runway"}
                      onClick={() => {
                        setActiveWidget("runway");
                        if (design.runway_url) setActiveTab("runway");
                      }}
                    >
                      <FilmIcon size={13} />
                      <span>{design.runway_url ? "Runway" : "Film runway"}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      aria-pressed={activeWidget === "commission"}
                      onClick={() => runStep({ kind: "techpack" })}
                    >
                      <ClipboardIcon size={13} />
                      <span>Tech pack</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    )}
      </main>

      {/* Phone: the showcase pane hides the chat, so the live line floats over it */}
      {voice.active && mobilePane === "showcase" && <VoiceHero voice={voice} variant="floating" />}

      <ArchiveDrawer
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        designs={pastDesigns}
        activeDesignId={design?.design_id ?? null}
        onSelectDesign={selectDesignFromArchive}
        onNewCommission={startOver}
        loading={archiveLoading}
      />
    </div>
  );
}
