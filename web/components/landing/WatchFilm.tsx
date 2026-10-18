"use client";

import { useEffect, useRef, useState } from "react";

const FILM_SRC = "/landing/film.mp4";
const FILM_POSTER = "/landing/film-poster.jpg";

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5z" />
    </svg>
  );
}

/**
 * "Watch the film" button and the dialog that plays the 30 s product film.
 * The video element is only mounted while the dialog is open, so the file is
 * never fetched for visitors who do not ask for it.
 */
export function WatchFilm({ className = "lp-btn lp-btn-ghost" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button ref={triggerRef} type="button" className={className} onClick={() => setOpen(true)}>
        <PlayGlyph />
        Watch the film
      </button>
      <dialog
        ref={dialogRef}
        className="lp-film"
        aria-label="Thread & Pixel film"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="lp-film-inner">
          <button type="button" className="lp-film-close" onClick={close} aria-label="Close film">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {open && (
            <video
              src={FILM_SRC}
              poster={FILM_POSTER}
              controls
              autoPlay
              playsInline
              preload="auto"
              aria-label="Thread & Pixel: from a sentence to a garment"
            />
          )}
        </div>
      </dialog>
    </>
  );
}
