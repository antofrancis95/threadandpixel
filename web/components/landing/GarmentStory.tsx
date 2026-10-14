"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GarmentFlat, GarmentOnModel, VoiceToSilhouette } from "./GarmentArt";
import { Reveal } from "./Reveal";

/**
 * How it works. Each step carries its own framed illustration that scrolls
 * with the copy. Real media (flats, try-on) is used when present in
 * web/public/landing/; the SVG art is the fallback.
 */

export type StoryMedia = {
  flats?: string | null;
  tryon?: string | null;
};

const STEPS = [
  {
    numeral: "I",
    title: "Speak",
    heading: "Tell the Master Couturier what you see.",
    body: "A sentence or a conversation, by voice or text. The Couturier listens for the occasion, the fabric and the cut, and asks only what it needs before it sketches.",
    tools: ["Gemini Live", "update_design"],
    caption: ["Couturier consultation", "Live voice"],
    version: "Consultation",
  },
  {
    numeral: "II",
    title: "Design",
    heading: "Watch the sketch become a specification.",
    body: "Every render is tied to a bounded spec: garment, length, sleeve, a fabric from the atelier catalogue, colour, closures, embellishments, lining. An edit changes the garment, not the whole picture.",
    tools: ["Editorial render", "draft_flats"],
    caption: ["Technical flats", "Front and back, size M"],
    version: "v2",
  },
  {
    numeral: "III",
    title: "Fit",
    heading: "Fit it to you before a single cut.",
    body: "Choose a size or enter your measurements. Drape the piece onto your own photo in the Fitting Room, then watch it move in an eight-second runway clip.",
    tools: ["open_fitting", "generate_runway"],
    caption: ["Fitting room", "Virtual try-on"],
    version: "v3",
  },
  {
    numeral: "IV",
    title: "Produce",
    heading: "Hand the atelier a pack it can cut from.",
    body: "A garment technologist's critique, construction notes and seam types, and a quote computed from yardage, labour hours and trims. Commission it and it appears live in the Factory Portal.",
    tools: ["Tech pack", "Quote", "Commission"],
    caption: ["Tech pack and quote", "Deterministic pricing"],
    version: "Commissioned",
  },
];

function ReceiptMini() {
  return (
    <div className="lp-receipt" style={{ width: "min(100%, 320px)" }}>
      <div className="lp-receipt-stats">
        <span>Silk Charmeuse</span>
        <span>4.14 yd</span>
        <span>7.0 h</span>
        <span className="lp-complexity">Medium</span>
      </div>
      <table>
        <tbody>
          <tr>
            <td>Silk Charmeuse × 4.14 yd</td>
            <td>$157.32</td>
          </tr>
          <tr>
            <td>Labour 7.0 h</td>
            <td>$84.00</td>
          </tr>
          <tr>
            <td>Lining × 2.88 yd</td>
            <td>$17.28</td>
          </tr>
          <tr>
            <td>Trim: zipper</td>
            <td>$3.00</td>
          </tr>
          <tr>
            <td>Platform &amp; maker margin</td>
            <td>$65.40</td>
          </tr>
          <tr className="total">
            <td>Total</td>
            <td>$327.00</td>
          </tr>
        </tbody>
      </table>
      <p className="lp-note">Computed by the studio&rsquo;s pricing engine for a lined silk charmeuse midi dress, size M.</p>
    </div>
  );
}

export function GarmentStory({ media = {} }: { media?: StoryMedia }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const visuals: ReactNode[] = [
    <VoiceToSilhouette key="speak" />,
    media.flats ? (
      <img key="flats" src={media.flats} alt="Technical flats of the dress, front and back, with size M measurements" />
    ) : (
      <GarmentFlat key="flats" />
    ),
    media.tryon ? (
      <img key="tryon" src={media.tryon} alt="The dress draped onto a model in the virtual fitting room" />
    ) : (
      <GarmentOnModel key="tryon" />
    ),
    <ReceiptMini key="produce" />,
  ];

  return (
    <section className="lp-section lp-story" id="how" aria-labelledby="how-title">
      <div className="lp-wrap">
        <Reveal className="lp-story-head">
          <p className="lp-kicker">
            <span className="lp-anchor" data-thread-anchor />
            How it works
          </p>
          <h2 className="lp-title" id="how-title">
            Four steps, one <em>thread</em>.
          </h2>
          <p className="lp-lede">
            The same commission moves from your first words to the cutting table without being redrawn by hand.
          </p>
        </Reveal>

        <ol className="lp-steps" data-active={active}>
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-index={i}
              className={`lp-step ${active === i ? "is-active" : ""}`}
            >
              <span className="lp-step-num" aria-hidden="true">
                {s.numeral}
                <span className="lp-anchor" data-thread-anchor />
              </span>
              <div className="lp-step-text">
                <h3>
                  <span className="lp-serif" style={{ color: "var(--muted)", fontStyle: "italic" }}>
                    {s.title}.{" "}
                  </span>
                  {s.heading}
                </h3>
                <p>{s.body}</p>
                <div className="lp-step-tool">
                  {s.tools.map((t) => (
                    <code key={t}>{t}</code>
                  ))}
                </div>
              </div>
              <Reveal className={`lp-stage lp-step-frame ${i === 2 && !media.tryon ? "lp-placeholder" : ""}`} delay={1}>
                <div className="lp-stage-head">
                  <span>Showcase</span>
                  <span className="lp-version">{s.version}</span>
                </div>
                <div className="lp-stage-layer is-active">{visuals[i]}</div>
                {i === 2 && !media.tryon && <span className="lp-placeholder-tag">Try-on placeholder</span>}
                <div className="lp-stage-caption">
                  <span>{s.caption[0]}</span>
                  <span>{s.caption[1]}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
