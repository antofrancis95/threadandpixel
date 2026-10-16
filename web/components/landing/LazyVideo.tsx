"use client";

import { useEffect, useRef } from "react";

/**
 * The runway clip sits well below the fold. Instead of letting `autoplay`
 * pull the whole file during initial load, the poster is shown and the video
 * source is attached only when the panel comes within a screen of the
 * viewport; playback then starts muted, exactly as before.
 */
export function LazyVideo({
  src,
  poster,
  width,
  height,
  label,
}: {
  src: string;
  poster?: string;
  width: number;
  height: number;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      video.src = src;
      video.load();
      video.play().catch(() => {
        /* autoplay refused: the poster and controls remain */
      });
    };
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      width={width}
      height={height}
      muted
      loop
      playsInline
      controls
      preload="none"
      aria-label={label}
    />
  );
}
