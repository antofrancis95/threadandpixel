"use client";

import { useEffect, useState } from "react";

type Layer = { src: string; key: number; loaded: boolean };

/**
 * An <img> whose new source fades in over the old one instead of snapping.
 * The previous image stays underneath until the new one has loaded and faded in.
 */
export function CrossfadeImage({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) {
  const [layers, setLayers] = useState<Layer[]>([{ src, key: 0, loaded: false }]);

  useEffect(() => {
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (top.src === src) return ls;
      return [...ls.slice(-1), { src, key: top.key + 1, loaded: false }];
    });
  }, [src]);

  function loaded(key: number) {
    setLayers((ls) => ls.map((l) => (l.key === key ? { ...l, loaded: true } : l)));
    // Once the new one is in, let the old one go after the fade.
    window.setTimeout(() => setLayers((ls) => (ls.length > 1 && ls[ls.length - 1].key === key ? ls.slice(-1) : ls)), 650);
  }

  return (
    <div className="xfade">
      {layers.map((l, i) => (
        <img
          key={l.key}
          src={l.src}
          alt={i === layers.length - 1 ? alt : ""}
          aria-hidden={i !== layers.length - 1 || undefined}
          className={`xfade-img ${l.loaded || i < layers.length - 1 ? "is-in" : ""}`}
          onLoad={() => loaded(l.key)}
          onError={i === layers.length - 1 ? onError : undefined}
        />
      ))}
    </div>
  );
}
