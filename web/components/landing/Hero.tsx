"use client";

import Link from "next/link";
import { useRef } from "react";
import { HeroCloth } from "./HeroCloth";
import { WatchFilm } from "./WatchFilm";

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
          <WatchFilm />
        </div>
      </div>
      <div className="lp-scroll-cue" aria-hidden="true">
        <span>Follow the thread</span>
        <span />
      </div>
    </section>
  );
}
