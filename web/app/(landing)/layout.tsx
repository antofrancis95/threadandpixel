import { Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import "./landing.css";

// The app declares Playfair Display in its tokens but never loads it. We load it
// here, scoped to the landing route, so the studio keeps rendering exactly as before.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return <div className={`landing-root ${playfair.variable}`}>{children}</div>;
}
