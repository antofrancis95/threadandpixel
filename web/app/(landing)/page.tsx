import type { Metadata } from "next";
import { AtelierFloor } from "@/components/landing/AtelierFloor";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { GarmentStory } from "@/components/landing/GarmentStory";
import { Hero } from "@/components/landing/Hero";
import { LandingNav } from "@/components/landing/LandingNav";
import { Portals } from "@/components/landing/Portals";
import { Showcase } from "@/components/landing/Showcase";
import { ThreadLine } from "@/components/landing/ThreadLine";
import { getLandingMedia } from "@/lib/landingMedia";

export const metadata: Metadata = {
  title: "Thread & Pixel — Haute Couture Atelier",
  description:
    "Describe the piece you have in mind. The Master Couturier drapes it, fits it to you, and hands a tailor-ready pack to the atelier floor.",
};

export default function LandingPage() {
  const media = getLandingMedia();
  return (
    <>
      <a className="lp-skip" href="#main">
        Skip to content
      </a>
      <LandingNav />
      <ThreadLine />
      <main id="main" className="lp-main" tabIndex={-1}>
        <Hero />
        <GarmentStory media={{ flats: media.flats, tryon: media.tryon }} />
        <Showcase media={media} />
        <AtelierFloor />
        <Portals render={media.render} />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
