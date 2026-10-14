import Link from "next/link";
import { GarmentFlat, GarmentSketch } from "./GarmentArt";
import { WordmarkText } from "./LandingNav";
import { Reveal } from "./Reveal";

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Portals({ render }: { render?: string | null }) {
  return (
    <section className="lp-section" id="portals" aria-labelledby="portals-title">
      <div className="lp-wrap">
        <Reveal>
          <p className="lp-kicker">
            <span className="lp-anchor" data-thread-anchor />
            Two doors
          </p>
          <h2 className="lp-title" id="portals-title">
            One thread, two <em>portals</em>.
          </h2>
          <p className="lp-lede">
            Designers and clients work in the studio. Tailoring units and factories receive what they make in the
            Factory Portal. Both read from the same commission.
          </p>
        </Reveal>

        <div className="lp-portals-grid">
          <Reveal delay={1}>
            <Link href="/studio" className="lp-portal">
              <div>
                <p className="lp-kicker" style={{ marginBottom: "0.75rem" }}>
                  For designers and clients
                </p>
                <h3>Designer Studio</h3>
                <p>
                  Consult with the Master Couturier by voice or text, keep every version in your archive, and move
                  from editorial render to flats, fitting, runway and commission.
                </p>
              </div>
              <div className="lp-frame" aria-hidden="true">
                <div className="lp-frame-bar">
                  <WordmarkText />
                  <span className="lp-frame-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="lp-frame-body">
                  <div className="lp-frame-title">
                    Archive <span className="pill">3 commissions</span>
                  </div>
                  <div className="lp-archive" style={{ marginTop: "0.75rem" }}>
                    <div className="lp-archive-item is-active">
                      <span className="lp-archive-thumb">
                        {render ? <img src={render} alt="" /> : <GarmentSketch />}
                      </span>
                      <span>
                        <b>Midi dress, silk charmeuse</b>
                        <small>Long sleeve, pleats, lined</small>
                      </span>
                      <span className="v">v3</span>
                    </div>
                    <div className="lp-archive-item">
                      <span className="lp-archive-thumb">
                        <GarmentFlat compact />
                      </span>
                      <span>
                        <b>Wool suiting jacket</b>
                        <small>Hip length, buttons</small>
                      </span>
                      <span className="v">v1</span>
                    </div>
                    <div className="lp-archive-item">
                      <span className="lp-archive-thumb">
                        <GarmentSketch />
                      </span>
                      <span>
                        <b>Linen jumpsuit</b>
                        <small>Consultation</small>
                      </span>
                      <span className="v">—</span>
                    </div>
                  </div>
                </div>
              </div>
              <span className="lp-portal-cta">
                Enter the studio <Arrow />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={2}>
            <Link href="/factory" className="lp-portal">
              <div>
                <p className="lp-kicker" style={{ marginBottom: "0.75rem" }}>
                  For tailoring units and factories
                </p>
                <h3>Factory Portal</h3>
                <p>
                  Orders arrive live with the spec, measurements, flats, construction notes and quote attached.
                  Move each one from new to cutting, sewing and shipped.
                </p>
              </div>
              <div className="lp-frame" aria-hidden="true">
                <div className="lp-frame-bar">
                  <span className="lp-frame-title" style={{ fontSize: "0.95rem" }}>
                    Factory portal
                  </span>
                  <span className="lp-live-tag">
                    <i /> Live
                  </span>
                </div>
                <div className="lp-frame-body lp-orders-wrap">
                  <table className="lp-orders">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Garment</th>
                        <th>Size</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>#a41c</td>
                        <td>
                          <span className="lp-swatch" style={{ background: "#1F2A44" }} />
                          dress · silk-charmeuse
                        </td>
                        <td>M</td>
                        <td>
                          <span className="lp-status new">new</span>
                        </td>
                      </tr>
                      <tr>
                        <td>#9e07</td>
                        <td>
                          <span className="lp-swatch" style={{ background: "#4a4a52" }} />
                          jacket · wool-suiting
                        </td>
                        <td>L</td>
                        <td>
                          <span className="lp-status cutting">cutting</span>
                        </td>
                      </tr>
                      <tr>
                        <td>#7b32</td>
                        <td>
                          <span className="lp-swatch" style={{ background: "#d8cbb0" }} />
                          jumpsuit · linen
                        </td>
                        <td>S</td>
                        <td>
                          <span className="lp-status sewing">sewing</span>
                        </td>
                      </tr>
                      <tr>
                        <td>#5c90</td>
                        <td>
                          <span className="lp-swatch" style={{ background: "#5a1f33" }} />
                          skirt · velvet
                        </td>
                        <td>XS</td>
                        <td>
                          <span className="lp-status shipped">shipped</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <span className="lp-portal-cta">
                Open the portal <Arrow />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
