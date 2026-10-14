"use client";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import { Chat } from "@/components/Chat";
import { ErrorAlert } from "@/components/ErrorAlert";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  ClipboardIcon,
  FilmIcon,
  GoogleIcon,
  ImageIcon,
  LockIcon,
  MannequinIcon,
  MenswearIcon,
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
import { StaticDrape } from "@/components/landing/HeroCloth";
import { LiveVoice } from "@/components/LiveVoice";
import { ChatSkeleton, ShowcaseSkeleton } from "@/components/skeletons";
import { CommissionCard } from "@/components/widgets/CommissionCard";
import { DesignUploadCard } from "@/components/widgets/DesignUploadCard";
import { FittingRoomCard } from "@/components/widgets/FittingRoomCard";
import { MeasurementCard } from "@/components/widgets/MeasurementCard";
import { OccasionStylistCard } from "@/components/widgets/OccasionStylistCard";
import { RunwayCard } from "@/components/widgets/RunwayCard";
import type { MessageInput } from "@/lib/api";
import { useApp } from "@/lib/providers";
import type {
  AtelierAction,
  ChatMessage,
  Design,
  DesignSummary,
  Measurements,
  QuoteResponse,
} from "@/lib/types";

const STORAGE_KEY = "tp.designId";

type ShowcaseTab = "editorial" | "flats" | "tryon" | "runway";

export default function AtelierStudio() {
  const { auth, api, user, ready } = useApp();
  const [design, setDesign] = useState<Design | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const [tryonBusy, setTryonBusy] = useState(false);
  const [assetErrors, setAssetErrors] = useState<Record<string, boolean>>({});
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceDesigning, setVoiceDesigning] = useState(false);

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

  function liveDesign(d: Design) {
    localStorage.setItem(STORAGE_KEY, d.design_id);
    setVoiceDesigning(false);
    setDesign(d);
    setAssetErrors({});
    setActiveTab("editorial");
    // In live voice mode, keep the flow conversational without forcing open popups
    setActiveWidget(null);
    loadArchive();
  }

  async function send(msg: MessageInput) {
    setBusy(true);
    setError(null);
    setActiveWidget(null);
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
      setError((e as Error).message);
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
      setActiveTab("editorial");
      setAssetErrors({});
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      } else {
        setActiveWidget(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInitialLoading(false);
    }
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyMeasurements(size: string, measurements?: Measurements) {
    if (!design) return;
    setQuoteBusy(true);
    setError(null);
    try {
      const res = await api.techpack(design.design_id, size, measurements);
      setQuoteData(res);
      setActiveWidget("commission");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuoteBusy(false);
    }
  }

  async function handleTryonUpload(file: File) {
    if (!design) return;
    setTryonBusy(true);
    setError(null);
    setAssetErrors((e) => ({ ...e, tryon: false }));
    try {
      const { upload_id } = await api.uploadPerson(file);
      const { tryon_url } = await api.tryOn(design.design_id, upload_id);
      setDesign({ ...design, tryon_url, runway_url: null, has_vto_portrait: true });
      setActiveTab("tryon");
      setActiveWidget(null);
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text: "I have draped this bespoke creation onto your portrait in the salon mirror. You may inspect the fit on the showcase board.",
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTryonBusy(false);
    }
  }

  async function handleDrapeExisting() {
    if (!design) return;
    setTryonBusy(true);
    setError(null);
    setAssetErrors((e) => ({ ...e, tryon: false }));
    try {
      const { tryon_url } = await api.tryOn(design.design_id);
      setDesign({ ...design, tryon_url, runway_url: null, has_vto_portrait: true });
      setActiveTab("tryon");
      setActiveWidget(null);
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text: "I have draped this updated silhouette onto your saved portrait in the salon mirror.",
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTryonBusy(false);
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
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text: notes?.trim()
          ? `[Uploaded Design Reference: ${file.name}] ${notes}`
          : `[Uploaded Design Reference: ${file.name}] Please tailor an haute couture outfit inspired by this design.`,
      },
    ]);
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
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      }
      loadArchive();
    } catch (e) {
      setError((e as Error).message);
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
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text: params.file
          ? `[Occasion: ${params.occasion} + Portrait Provided] ${params.preferences || "Please design the ideal outfit and drape it onto my photo."}`
          : `[Occasion: ${params.occasion}] ${params.preferences || "Please curate an outfit tailored for this event."}`,
      },
    ]);
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
      if (d.suggested_action && d.suggested_action !== "none") {
        setActiveWidget(d.suggested_action as AtelierAction);
      }
      loadArchive();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
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
      <header className="topbar">
        <div className="brand">
          <Link href="/" title="Thread & Pixel home">
            <h1>
              Thread <span>&amp;</span> Pixel
            </h1>
            <span className="atelier-tag">Haute Couture Atelier</span>
          </Link>
        </div>
        <nav>
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
      </header>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <main className="studio">
        {initialLoading ? (
          <div className="grid">
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
          <div className="grid">
        {/* Left Column: Conversational Atelier Stream */}
        <Chat
          messages={messages}
          busy={busy || voiceDesigning}
          onSend={send}
          hasDesign={Boolean(design)}
          suggestedAction={(design?.suggested_action as AtelierAction) ?? null}
          activeWidget={activeWidget}
          onSelectWidget={setActiveWidget}
          voiceActive={voiceActive}
          voiceVolume={voiceVolume}
          headerAction={
            <LiveVoice
              designId={design?.design_id ?? null}
              onTranscript={liveTranscript}
              onTurnComplete={liveTurnComplete}
              onDesign={liveDesign}
              onError={(err) => {
                setVoiceDesigning(false);
                setError(err);
              }}
              onUserSpeech={() => {
                setActiveWidget(null);
              }}
              onDesigning={() => {
                setActiveWidget(null);
                setVoiceDesigning(true);
              }}
              onVoiceActivity={(active, vol) => {
                setVoiceActive(active);
                setVoiceVolume(vol);
              }}
              onFlats={(flatsUrl) => {
                setDesign((prev) => (prev ? { ...prev, flats_url: flatsUrl } : null));
                setActiveTab("flats");
                setActiveWidget(null);
              }}
              onWidget={(widget, occasion, gender) => {
                setActiveWidget(widget);
                if (occasion) setPrefilledOccasion(occasion);
                if (gender === "menswear" || gender === "womenswear") setPrefilledGender(gender);
              }}
              onRunwayStarted={() => {
                setActiveTab("runway");
                setActiveWidget("runway");
              }}
            />
          }
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
                designId={design.design_id}
                runwayUrl={design.runway_url}
                onResult={(url) => {
                  setDesign({ ...design, runway_url: url });
                  setActiveTab("runway");
                }}
                onClose={() => setActiveWidget(null)}
              />
            ) : activeWidget === "commission" && design && quoteData ? (
              <CommissionCard
                designId={design.design_id}
                data={quoteData}
                onOrderPlaced={() => setActiveWidget(null)}
                onClose={() => setActiveWidget(null)}
              />
            ) : null
          }
        />

        {/* Right Column: Couture Showcase & Moodboard */}
        <section className="panel showcase-panel">
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
            <div className="view-tabs">
              <button
                type="button"
                className={`view-tab ${activeTab === "editorial" ? "active" : ""}`}
                onClick={() => setActiveTab("editorial")}
              >
                <SparkleIcon size={12} />
                <span>Editorial</span>
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "flats" ? "active" : ""}`}
                onClick={() => setActiveTab("flats")}
              >
                <RulerIcon size={12} />
                <span>Flats</span>
                {design && design.flats_url && (
                  <span className="tab-pill" style={{ background: "var(--gold)", color: "white", fontWeight: 600 }}>
                    with measurements
                  </span>
                )}
                {design && !design.flats_url && design.version > 0 && <span className="tab-pill">draft</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "tryon" ? "active" : ""}`}
                onClick={() => setActiveTab("tryon")}
              >
                <MirrorIcon size={12} />
                <span>Fitting</span>
                {design && !design.tryon_url && <span className="tab-pill">try-on</span>}
              </button>
              <button
                type="button"
                className={`view-tab ${activeTab === "runway" ? "active" : ""}`}
                onClick={() => setActiveTab("runway")}
              >
                <FilmIcon size={12} />
                <span>Runway</span>
                {design && !design.runway_url && <span className="tab-pill">veo</span>}
              </button>
            </div>
          </div>

          {/* High-Resolution Frame */}
          <div className="canvas-frame">
            {(busy || voiceDesigning) && (!design || !design.image_url) ? (
              <div className="silk-shimmer-full">
                <div className="shimmer-aura">
                  <span className="shimmer-icon">
                    <SparkleIcon size={24} />
                  </span>
                </div>
                <h3 className="shimmer-title">Draping Haute Couture Silhouette</h3>
                <span className="shimmer-subtitle">Weaving bespoke textiles &amp; formulating tailoring specs…</span>
              </div>
            ) : design && design.image_url ? (
              <>
                {(busy || voiceDesigning) && (
                  <div className="silk-shimmer-overlay">
                    <span className="spin-silk">
                      <SparkleIcon size={13} />
                    </span>{" "}
                    Updating Couture Drape…
                  </div>
                )}

                {/* Error Fallback when asset preview fails to load */}
                {assetErrors[activeTab] ? (
                  <div className="asset-empty-state">
                    <div className="asset-empty-icon-ring error">
                      <AlertTriangleIcon size={24} />
                    </div>
                    <span className="mannequin-badge error">✦ Display Error</span>
                    <h3 className="asset-empty-title">Asset Preview Unavailable</h3>
                    <p className="asset-empty-desc">
                      The media preview for this {activeTab} asset could not be loaded or has expired.
                    </p>
                    {activeTab === "flats" ? (
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
                    ) : activeTab === "tryon" ? (
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
                    ) : activeTab === "runway" ? (
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
                  design.flats_url ? (
                    <div>
                      <img
                        src={design.flats_url}
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
                        <span style={{ fontSize: "0.78rem", color: "var(--ink-secondary)" }}>
                          Calibrated: <strong style={{ color: "var(--gold-dark)" }}>{design.spec.size ? `Size ${design.spec.size}` : "Proportional Draft"}</strong>
                        </span>
                        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginRight: "0.2rem" }}>Re-calibrate:</span>
                          {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              className={`chip-btn ${design.spec.size === sz ? "highlight" : ""}`}
                              style={{ padding: "0.2rem 0.45rem", fontSize: "0.72rem" }}
                              onClick={() => generateFlats(sz)}
                              disabled={busy}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <RulerIcon size={26} />
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
                            className={`chip-btn ${design.spec.size === sz ? "highlight" : ""}`}
                            style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", fontWeight: 600 }}
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
                  design.tryon_url ? (
                    <img
                      src={design.tryon_url}
                      alt="Virtual try-on drape"
                      onError={() => setAssetErrors((e) => ({ ...e, tryon: true }))}
                    />
                  ) : (
                    <div className="asset-empty-state">
                      <div className="asset-empty-icon-ring">
                        <MirrorIcon size={26} />
                      </div>
                      <span className="mannequin-badge">✦ Salon Mirror</span>
                      <h3 className="asset-empty-title">
                        {design.has_vto_portrait ? "Saved Portrait Ready" : "Virtual Fitting Not Yet Draped"}
                      </h3>
                      <p className="asset-empty-desc">
                        {design.has_vto_portrait
                          ? "Your portrait is safely saved in the atelier. Drape this updated piece onto your portrait, or open the fitting room to upload a new one."
                          : "Upload your full-length portrait to step into the virtual salon mirror and drape this bespoke creation directly onto your frame."}
                      </p>
                      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
                        {design.has_vto_portrait && (
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
                          className={design.has_vto_portrait ? "secondary" : "primary"}
                          onClick={() => setActiveWidget("fitting")}
                        >
                          <MirrorIcon size={14} />
                          <span>{design.has_vto_portrait ? "Re-upload Portrait" : "Enter Virtual Fitting Room"}</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : activeTab === "runway" ? (
                  design.runway_url ? (
                    <video
                      src={design.runway_url}
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
                  <img
                    src={design.image_url}
                    alt="High-resolution couture garment render"
                    onError={() => setAssetErrors((e) => ({ ...e, editorial: true }))}
                  />
                )}
              </>
            ) : (
              <div className="canvas-placeholder">
                <span className="mannequin-badge">
                  <SparkleIcon size={10} /> {design && design.version === 0 ? "✦ Consultation in Progress" : "Bespoke Canvas"}
                </span>
                <div className="mannequin-silhouette">
                  <MannequinIcon size={34} />
                </div>
                <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", color: "var(--ink)" }}>
                  The Atelier Mannequin
                </strong>
                <p style={{ margin: 0, fontSize: "0.82rem", maxWidth: "320px", color: "var(--muted)", lineHeight: 1.5 }}>
                  {design && design.version === 0
                    ? "Consulting on your bespoke color, fit, fabric, and size. Draping will commence as soon as specifications are chosen."
                    : "Your bespoke design will be draped here as you speak or describe your silhouette to the Couturier."}
                </p>
              </div>
            )}
          </div>

          {/* Garment Details & Spec Ribbon */}
          {design && design.version > 0 && (
            <>
              <div className="spec-ribbon">
                <span className="spec-chip">
                  <span className="swatch-circle" style={{ background: design.spec.color_hex }} />
                  {design.spec.color_hex}
                </span>
                {design.occasion && (
                  <span className="spec-chip" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>
                    <PartyIcon size={11} /> {design.occasion}
                  </span>
                )}
                {design.reference_image_url && (
                  <span className="spec-chip" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>
                    <ImageIcon size={11} /> Reference-Inspired
                  </span>
                )}
                {design.spec.gender && (
                  <span className="spec-chip" style={{ color: "var(--gold-dark)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    {design.spec.gender === "menswear" ? (
                      <>
                        <MenswearIcon size={12} />
                        <span>Menswear</span>
                      </>
                    ) : (
                      <>
                        <WomenswearIcon size={12} />
                        <span>Womenswear</span>
                      </>
                    )}
                  </span>
                )}
                {design.spec.size && (
                  <span className="spec-chip" style={{ color: "var(--gold-dark)", fontWeight: 700 }}>
                    Size {design.spec.size}
                  </span>
                )}
                {design.spec.fit && (
                  <span className="spec-chip">
                    {design.spec.fit}
                  </span>
                )}
                <span className="spec-chip">{design.spec.garment_type}</span>
                <span className="spec-chip">{design.spec.length}</span>
                <span className="spec-chip">{design.spec.sleeve.replace("_", " ")} sleeve</span>
                <span className="spec-chip">fabric: {design.spec.fabric_id}</span>
                {design.spec.lining && <span className="spec-chip">silk lining</span>}
                {design.spec.embellishments.map((e) => (
                  <span key={e} className="spec-chip">
                    <SparkleIcon size={10} style={{ color: "var(--gold)" }} /> {e}
                  </span>
                ))}
              </div>

              {/* Quick Atelier Actions Toolbar */}
              <div className="showcase-actions">
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "design_upload" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "design_upload" ? null : "design_upload")}
                  title="Upload a design or sketch"
                >
                  <ImageIcon size={14} />
                  <span>Upload Design</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "occasion_stylist" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "occasion_stylist" ? null : "occasion_stylist")}
                  title="Design for an occasion and photo"
                >
                  <PartyIcon size={14} />
                  <span>Occasion Stylist</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "measurements" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "measurements" ? null : "measurements")}
                >
                  <ScissorsIcon size={14} />
                  <span>Measure &amp; Fit</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "fitting" ? "active" : ""}`}
                  onClick={() => setActiveWidget(activeWidget === "fitting" ? null : "fitting")}
                >
                  <MirrorIcon size={14} />
                  <span>Try On Mirror</span>
                </button>
                <button
                  type="button"
                  className="showcase-action-btn"
                  onClick={() => {
                    setActiveTab("flats");
                    if (!design.flats_url && design.spec.size) {
                      generateFlats(design.spec.size);
                    }
                  }}
                  disabled={busy}
                >
                  <RulerIcon size={14} />
                  <span>{design.flats_url ? "View Flats" : "Draft Flats"}</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "runway" ? "active" : ""}`}
                  onClick={() => {
                    setActiveWidget("runway");
                    if (design.runway_url) setActiveTab("runway");
                  }}
                >
                  <FilmIcon size={14} />
                  <span>Film Runway</span>
                </button>
                <button
                  type="button"
                  className={`showcase-action-btn ${activeWidget === "commission" ? "active" : ""}`}
                  onClick={() => {
                    if (quoteData) {
                      setActiveWidget("commission");
                    } else {
                      handleApplyMeasurements("M");
                    }
                  }}
                >
                  <ClipboardIcon size={14} />
                  <span>Tech Pack</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )}
      </main>

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
