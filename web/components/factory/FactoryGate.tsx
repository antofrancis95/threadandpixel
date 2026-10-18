"use client";

import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { AlertTriangleIcon, GoogleIcon, LockIcon } from "@/components/icons";
import { StaticDrape } from "@/components/landing/HeroCloth";
import { useApp } from "@/lib/providers";

/**
 * Sign-in for the Factory Portal, in the studio's auth gate design. Email and password matter here: the
 * evaluator account is an email account with both the studio allowlist and the factory role.
 */
export function FactoryGate({ state }: { state: "signed-out" | "checking" | "restricted" }) {
  const { auth, user } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
          ? "Incorrect email or password."
          : code === "auth/too-many-requests"
            ? "Too many unsuccessful attempts. Please try again later."
            : (err as Error).message || "Sign-in failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== "auth/popup-closed-by-user") {
        setError((err as Error).message || "Failed to sign in with Google.");
      }
    }
  }

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
            <span className="atelier-tag">Factory Portal</span>
          </Link>
        </div>
        <Link href="/" className="back-link">
          &larr; Back to the atelier
        </Link>
      </div>
      <div className="atelier-auth-body">
        <div className="atelier-auth-card">
          {state === "restricted" && user ? (
            <>
              <div className="atelier-auth-badge restricted">
                <AlertTriangleIcon size={13} />
                <span>Access restricted</span>
              </div>
              <h2 className="atelier-auth-title">
                Factory <span>accounts only</span>.
              </h2>
              <p className="atelier-auth-desc">You are signed in, but this account does not have the factory role.</p>
              <div className="atelier-restricted-box">
                <div className="atelier-restricted-header">
                  <LockIcon size={14} />
                  <span>No factory role</span>
                </div>
                <div className="atelier-restricted-email">{user.email || user.uid}</div>
                <div className="atelier-restricted-instruction">
                  An administrator can grant it with <code>python scripts/set_factory_role.py {user.uid}</code>, then
                  sign out and back in.
                </div>
              </div>
              <button type="button" className="google-signin-btn" onClick={() => signOut(auth)}>
                Sign out and switch account
              </button>
            </>
          ) : state === "checking" ? (
            <>
              <div className="atelier-auth-badge">
                <LockIcon size={13} />
                <span>Factory portal</span>
              </div>
              <p className="atelier-auth-desc" role="status">
                Checking factory access…
              </p>
            </>
          ) : (
            <>
              <div className="atelier-auth-badge">
                <LockIcon size={13} />
                <span>Factory portal</span>
              </div>
              <h2 className="atelier-auth-title">
                Orders, live from the <span>studio</span>.
              </h2>
              <p className="atelier-auth-desc">
                Sign in with a factory account to receive each commission with its spec, measurements, flats, costing
                and tech pack, and move it from new to cutting, sewing and shipped.
              </p>

              {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

              <form className="auth-form" onSubmit={handleEmail}>
                <div className="auth-field">
                  <label htmlFor="factory-email">Email Address</label>
                  <input
                    id="factory-email"
                    type="email"
                    className="auth-input"
                    placeholder="floor@threadandpixel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="factory-password">Password</label>
                  <input
                    id="factory-password"
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={submitting}>
                  {submitting ? "Verifying access…" : "Enter Factory Portal"}
                </button>
              </form>

              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <button type="button" className="google-signin-btn" onClick={handleGoogle}>
                <GoogleIcon size={18} />
                <span>Sign in with Google</span>
              </button>
            </>
          )}

          <div className="atelier-auth-footer">
            <span>Designers and clients</span>
            <Link href="/studio">Designer Studio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
