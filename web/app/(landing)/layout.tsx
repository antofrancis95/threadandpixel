import type { ReactNode } from "react";
import "./landing.css";

// Playfair Display is loaded once in the root layout (--font-playfair).
export default function LandingLayout({ children }: { children: ReactNode }) {
  return <div className="landing-root">{children}</div>;
}
