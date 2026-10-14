"use client";

import Link from "next/link";
import { useRef } from "react";
import { HeroCloth } from "./HeroCloth";

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5z" />
    </svg>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} className="lp-hero" aria-labelledby="hero-title">
      <HeroCloth host={ref} />
      <div className="lp-wrap lp-hero-inner">
        <p className="lp-eyebrow">Thread &amp; Pixel · Haute Couture Atelier</p>
        <h1 id="hero-title">
          A garment begins
          <br />
          as a <em>sentence</em>
          <span className="lp-anchor" data-thread-anchor />.
        </h1>
        <p className="lp-hero-promise">
          Describe the piece you have in mind. The Master Couturier drapes it, fits it to you, and hands a
          tailor-ready pack to the atelier floor.
        </p>
        <div className="lp-hero-ctas">
          <Link href="/studio" className="lp-btn lp-btn-primary">
            Begin a Commission
          </Link>
          <a href="#runway" className="lp-btn lp-btn-ghost">
            <PlayGlyph />
            Watch the Runway
          </a>
        </div>
      </div>
      <div className="lp-scroll-cue" aria-hidden="true">
        <span>Follow the thread</span>
        <span />
      </div>
    </section>
  );
}
