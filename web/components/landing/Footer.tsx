import Link from "next/link";
import { Wordmark } from "./LandingNav";

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer-row">
          {/* The gold thread ends inside this ampersand. */}
          <Wordmark ampId="lp-thread-end" />
          <nav aria-label="Footer">
            <Link href="/studio">Designer Studio</Link>
            <Link href="/factory">Factory Portal</Link>
            <a href="#how">How it works</a>
          </nav>
        </div>
        <div className="lp-footer-fine">
          <span>Private atelier. Access is by invitation.</span>
          <span>Photos used for fitting are deleted automatically after seven days.</span>
          <span>&copy; {new Date().getFullYear()} Thread &amp; Pixel</span>
        </div>
      </div>
    </footer>
  );
}
