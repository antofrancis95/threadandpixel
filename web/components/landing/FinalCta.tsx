import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section className="lp-section lp-final" aria-labelledby="final-title">
      <div className="lp-wrap">
        <Reveal>
          <p className="lp-kicker" style={{ justifyContent: "center" }}>
            <span className="lp-anchor" data-thread-anchor />
            Begin
          </p>
          <h2 id="final-title">
            Start with a sentence.
            <br />
            Finish with a <em>garment</em>.
          </h2>
          <p>
            Sign in to the studio, say what you have in mind, and follow the thread from first sketch to a
            tailor-ready pack.
          </p>
          <div className="lp-hero-ctas">
            <Link href="/studio" className="lp-btn lp-btn-primary">
              Begin a Commission
            </Link>
            <Link href="/factory" className="lp-btn lp-btn-ghost">
              Open the Factory Portal
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
