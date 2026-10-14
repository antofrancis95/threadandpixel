"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Wordmark({ withTag = false, ampId }: { withTag?: boolean; ampId?: string }) {
  return (
    <Link href="/" className="lp-wordmark" aria-label="Thread & Pixel, home">
      <span>Thread</span>
      <span className="lp-amp" aria-hidden="true">
        &amp;
        {ampId && <span className="lp-anchor" data-thread-anchor id={ampId} />}
      </span>
      <span>Pixel</span>
      {withTag && <small>Haute Couture Atelier</small>}
    </Link>
  );
}

/** Non-link wordmark for use inside framed UI panels (frames may sit inside links). */
export function WordmarkText() {
  return (
    <span className="lp-wordmark" aria-hidden="true">
      <span>Thread</span>
      <span className="lp-amp">&amp;</span>
      <span>Pixel</span>
    </span>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="lp-wrap">
        <Wordmark withTag />
        <nav className="lp-nav-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#atelier-floor">Atelier floor</a>
          <Link href="/factory">Factory Portal</Link>
          <Link href="/studio" className="lp-btn lp-btn-primary">
            Begin a Commission
          </Link>
        </nav>
      </div>
    </header>
  );
}
