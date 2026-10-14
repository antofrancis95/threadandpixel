import { ClipboardIcon, FilmIcon, HourglassIcon, MicIcon, MirrorIcon, RecycleIcon, RulerIcon, ScissorsIcon, SparkleIcon } from "@/components/icons";
import { GarmentFlat, GarmentOnModel, GarmentRender } from "./GarmentArt";
import { WordmarkText } from "./LandingNav";
import { Reveal } from "./Reveal";
import type { LandingMedia } from "@/lib/landingMedia";

function FrameBar({ title }: { title?: string }) {
  return (
    <div className="lp-frame-bar">
      {title ? <span className="lp-frame-title">{title}</span> : <WordmarkText />}
      <span className="lp-frame-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function Tabs({ active }: { active: "editorial" | "flats" | "tryon" | "runway" }) {
  return (
    <div className="lp-tabs" role="presentation">
      <span className={`lp-tab ${active === "editorial" ? "is-active" : ""}`}>
        <SparkleIcon size={11} /> Editorial
      </span>
      <span className={`lp-tab ${active === "flats" ? "is-active" : ""}`}>
        <RulerIcon size={11} /> Flats <span className="pill">with measurements</span>
      </span>
      <span className={`lp-tab ${active === "tryon" ? "is-active" : ""}`}>
        <MirrorIcon size={11} /> Fitting
      </span>
      <span className={`lp-tab ${active === "runway" ? "is-active" : ""}`}>
        <FilmIcon size={11} /> Runway <span className="pill">veo</span>
      </span>
    </div>
  );
}

export function Showcase({ media }: { media: LandingMedia }) {
  return (
    <section className="lp-section lp-showcase" id="features" aria-labelledby="features-title">
      <div className="lp-wrap">
        <Reveal>
          <p className="lp-kicker">
            <span className="lp-anchor" data-thread-anchor />
            The studio
          </p>
          <h2 className="lp-title" id="features-title">
            What the <em>atelier</em> does.
          </h2>
          <p className="lp-lede">
            {media.render
              ? "Panels below mirror the studio as it is today. The dress, flats, fitting and runway clip were produced by the same models the studio runs, from one example commission."
              : "Panels below mirror the studio as it is today. Renders and try-on photos are generated per commission, so the frames hold illustrations until you sign in."}
          </p>
        </Reveal>

        {/* 1. Voice-led design */}
        <article className="lp-feature">
          <span className="lp-anchor lp-anchor-gutter" data-thread-anchor aria-hidden="true" />
          <Reveal className="lp-feature-text">
            <p className="lp-kicker">
              Voice-led design
            </p>
            <h3>A conversation, not a prompt box.</h3>
            <p>
              The Master Couturier holds a real-time voice session. It hears the occasion and the mood, proposes
              fabric and silhouette from the atelier catalogue, and drapes the first render while you are still
              talking.
            </p>
            <ul>
              <li>Voice or text, with the full transcript kept in your archive.</li>
              <li>Edits are applied to the garment you already have, so sleeves change and the dress stays.</li>
              <li>Upload a sketch or a reference photo, or describe the occasion and let the Couturier style it.</li>
            </ul>
          </Reveal>
          <Reveal delay={1}>
            <div className="lp-frame" aria-label="Illustration of the Couturier Consultation panel">
              <FrameBar />
              <div className="lp-frame-body">
                <div className="lp-frame-title">
                  Couturier Consultation <span className="lp-live-tag"><i /> Live</span>
                </div>
                <div className="lp-stream" style={{ marginTop: "0.85rem" }}>
                  <div className="lp-bubble user">Something for a winter gala. Deep navy, long sleeves, nothing stiff.</div>
                  <div className="lp-bubble model">
                    <span className="badge">Master Couturier</span>
                    A midi dress in silk charmeuse, deep navy, long sleeves, soft pleats falling from the waist. Shall I
                    drape it?
                  </div>
                  <div className="lp-bubble user">Yes. Line it, please.</div>
                  <div className="lp-bubble model">
                    <span className="badge">Master Couturier</span>
                    Lined, and the pleats kept soft so the charmeuse falls cleanly. Would you like the technical flats or
                    the fitting room next?
                  </div>
                </div>
                <div className="lp-chips" aria-hidden="true">
                  <span className="lp-chip highlight">
                    <RulerIcon size={11} /> Flats
                  </span>
                  <span className="lp-chip">
                    <MirrorIcon size={11} /> Fitting Room
                  </span>
                  <span className="lp-chip">
                    <FilmIcon size={11} /> Runway
                  </span>
                  <span className="lp-chip">
                    <ScissorsIcon size={11} /> Commission
                  </span>
                </div>
                <div className="lp-composer" aria-hidden="true">
                  <span>Listening…</span>
                  <span className="lp-wave">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <i key={i} style={{ animationDuration: `${1 + (i % 4) * 0.15}s` }} />
                    ))}
                  </span>
                  <span className="live">
                    <MicIcon size={15} />
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </article>

        {/* 2. Flats with measurements */}
        <article className="lp-feature reverse">
          <span className="lp-anchor lp-anchor-gutter" data-thread-anchor aria-hidden="true" />
          <Reveal className="lp-feature-text">
            <p className="lp-kicker">
              Flats with measurements
            </p>
            <h3>Front and back, drawn to your body.</h3>
            <p>
              Technical flats are drafted from the same spec as the render, then annotated with the size or the
              bust, waist, hip and height you enter. The tailor sees what you saw.
            </p>
            <ul>
              <li>Sizes XS to XXL, or custom measurements in centimetres.</li>
              <li>Closures, embellishments and lining called out on the drawing.</li>
            </ul>
          </Reveal>
          <Reveal delay={1}>
            <div className="lp-frame" aria-label="Illustration of the Flats tab with the measurement card">
              <FrameBar />
              <div className="lp-frame-body">
                <div className="lp-frame-title">
                  Showcase <span className="pill">v2</span>
                </div>
                <Tabs active="flats" />
                <div className="lp-canvas">
                  {media.flats ? (
                    <img className="contain" src={media.flats} alt="Technical flats of the dress, front and back, annotated with size M measurements" />
                  ) : (
                    <GarmentFlat />
                  )}
                </div>
                <div className="lp-measure" aria-hidden="true">
                  <div className="lp-measure-head">
                    <span>Measurements</span>
                    <span>cm</span>
                  </div>
                  <div className="lp-sizes">
                    {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                      <span key={s} className={s === "M" ? "is-active" : ""}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="lp-fields">
                    <div className="lp-field">
                      Bust <b>92</b>
                    </div>
                    <div className="lp-field">
                      Waist <b>74</b>
                    </div>
                    <div className="lp-field">
                      Hip <b>98</b>
                    </div>
                    <div className="lp-field">
                      Height <b>170</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </article>

        {/* 3. Fitting room + runway */}
        <article className="lp-feature" id="runway">
          <span className="lp-anchor lp-anchor-gutter" data-thread-anchor aria-hidden="true" />
          <Reveal className="lp-feature-text">
            <p className="lp-kicker">
              Fitting room and runway
            </p>
            <h3>See it on you. Then see it move.</h3>
            <p>
              Upload one full-length photo and the piece is draped onto you. From there, an eight-second runway
              clip shows how the fabric behaves when you walk.
            </p>
            <ul>
              <li>Your photo is used for this fitting only and deleted automatically after seven days.</li>
              <li>Photos are screened before use. Anything that appears to show a minor is refused.</li>
            </ul>
          </Reveal>
          <Reveal delay={1}>
            <div className="lp-pair">
              <div className="lp-frame" aria-label="Illustration of the Fitting Room">
                <FrameBar title="Fitting Room" />
                <div className="lp-frame-body">
                  <div className={`lp-canvas portrait ${media.tryon ? "" : "lp-placeholder"}`}>
                    {media.tryon ? (
                      <img src={media.tryon} alt="Virtual try-on: the navy silk dress draped onto a model" />
                    ) : (
                      <>
                        {/* PLACEHOLDER until api/scripts/landing_assets.py has produced web/public/landing/tryon.jpg */}
                        <GarmentOnModel />
                        <span className="lp-placeholder-tag">Try-on placeholder</span>
                      </>
                    )}
                  </div>
                  <div className="lp-consent" aria-hidden="true">
                    <i>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </i>
                    I consent to my photo being processed for this fitting. It is deleted after 7 days.
                  </div>
                </div>
              </div>
              <div className="lp-frame" aria-label="Illustration of the Runway tab">
                <FrameBar title="Runway" />
                <div className="lp-frame-body">
                  <div className={`lp-canvas portrait ${media.runway ? "" : "lp-placeholder"}`}>
                    {media.runway ? (
                      <video
                        src={media.runway}
                        poster={media.runwayStill ?? undefined}
                        autoPlay
                        muted
                        loop
                        playsInline
                        controls
                        aria-label="Eight-second runway clip of the dress"
                      />
                    ) : (
                      <>
                        {/* PLACEHOLDER until api/scripts/landing_assets.py has produced web/public/landing/runway.mp4 */}
                        <GarmentRender />
                        <div className="lp-play" aria-hidden="true">
                          <span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5.5v13l10-6.5z" />
                            </svg>
                          </span>
                        </div>
                        <span className="lp-placeholder-tag">Runway placeholder</span>
                      </>
                    )}
                    <div className="lp-runway-meta" aria-hidden="true">
                      <span>Veo</span>
                      <span>8 s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </article>

        {/* 4. Tech pack and quote */}
        <article className="lp-feature reverse">
          <span className="lp-anchor lp-anchor-gutter" data-thread-anchor aria-hidden="true" />
          <Reveal className="lp-feature-text">
            <p className="lp-kicker">
              Tech pack and quote
            </p>
            <h3>Numbers the atelier can trust.</h3>
            <p>
              The model classifies. Code calculates. Yardage, cutting allowance, labour hours and trims come from
              fixed tables, so the quote is itemised and repeatable. A garment technologist&rsquo;s critique flags
              anything that cannot be sewn before you commission.
            </p>
            <ul>
              <li>Construction notes and seam types written for a made-to-measure workshop.</li>
              <li>Manufacturability check with issues listed, not hidden.</li>
              <li>Commission in one step. The order appears live in the Factory Portal.</li>
            </ul>
          </Reveal>
          <Reveal delay={1}>
            <div className="lp-frame" aria-label="Illustration of the tech pack and quote">
              <FrameBar />
              <div className="lp-frame-body">
                <div className="lp-frame-title">
                  <ClipboardIcon size={14} /> Tech pack &amp; quote
                </div>
                <div className="lp-receipt" style={{ marginTop: "0.85rem" }}>
                  <div className="lp-receipt-stats">
                    <span>Silk Charmeuse · M</span>
                    <span>
                      <ScissorsIcon size={12} /> 4.14 yd
                    </span>
                    <span>
                      <HourglassIcon size={12} /> 7.0 h
                    </span>
                    <span>
                      <RecycleIcon size={12} /> 0.54 yd allowance
                    </span>
                    <span className="lp-complexity">Medium</span>
                  </div>
                  <table>
                    <tbody>
                      <tr>
                        <td>Silk Charmeuse × 4.14 yd</td>
                        <td>$157.32</td>
                      </tr>
                      <tr>
                        <td>Labour 7.0 h @ $12/h</td>
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
                </div>
                <div className="lp-techpack">
                  <span className="lp-manufacturable">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    Manufacturable
                  </span>
                  <h4>Construction notes</h4>
                  <ol>
                    <li>Cut charmeuse on the bias for the skirt panels; stay-stitch the neckline before assembly.</li>
                    <li>Set soft knife pleats at the waist seam, press lightly, do not edge-stitch.</li>
                    <li>Invisible zip at centre back, lining attached at neck and cuffs.</li>
                  </ol>
                  <p className="lp-note">
                    Quote computed by the studio&rsquo;s pricing engine for this spec. Notes are an example of the
                    critique format.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </article>
      </div>
    </section>
  );
}
