"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/** Adds `is-visible` once the element enters the viewport. Pure CSS handles the motion. */
export function Reveal({
  as: Tag = "div",
  className = "",
  delay,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  delay?: 1 | 2 | 3;
  children: ReactNode;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`lp-reveal ${className}`} data-delay={delay} {...rest}>
      {children}
    </Tag>
  );
}
