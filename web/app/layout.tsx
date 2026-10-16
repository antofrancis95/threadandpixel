import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/lib/providers";
import "./globals.css";

// Read env at request time so one image serves any environment.
export const dynamic = "force-dynamic";

// The serif the tokens declare. Loaded once here so the landing page, studio
// and factory portal share the same face.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Thread & Pixel",
  description: "Speak a garment into existence, try it on, and have it made.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Let the on-screen keyboard shrink the layout so the chat composer stays
  // visible above it instead of being covered.
  interactiveWidget: "resizes-content",
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
  const apiUrl = process.env.API_URL ?? "http://localhost:8080";

  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <Providers firebaseConfig={firebaseConfig} apiUrl={apiUrl}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
