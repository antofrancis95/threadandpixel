import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/lib/providers";
import "./globals.css";

// Read env at request time so one image serves any environment.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thread & Pixel",
  description: "Speak a garment into existence, try it on, and have it made.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
  const apiUrl = process.env.API_URL ?? "http://localhost:8080";

  return (
    <html lang="en">
      <body>
        <Providers firebaseConfig={firebaseConfig} apiUrl={apiUrl}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
