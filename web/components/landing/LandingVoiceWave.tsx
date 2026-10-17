"use client";

import { useEffect, useRef } from "react";
import type { VoiceLevels } from "@/components/LiveVoice";
import { VoiceThread } from "@/components/voice/VoiceThread";

/**
 * The studio's Siri-style wave, for the landing page. There is no live mic here, so a
 * slow synthetic level stands in for a voice: swelling and settling like a sentence.
 * Under prefers-reduced-motion VoiceThread draws one still frame and ignores the levels.
 */
export function LandingVoiceWave({ width, height }: { width: number; height: number }) {
  const levels = useRef<VoiceLevels>({ mic: 0.3, out: 0 });
  const muted = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = now / 1000;
      const phrase = 0.5 + 0.5 * Math.sin(t * 0.9);
      const syllable = 0.5 + 0.5 * Math.sin(t * 5.3 + Math.sin(t * 1.7) * 2);
      levels.current.mic = 0.12 + 0.5 * phrase * (0.55 + 0.45 * syllable);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <VoiceThread phase="listening" tool={null} muted={muted.current} levels={levels} shape="siri" size={width} barHeight={height} />
  );
}
