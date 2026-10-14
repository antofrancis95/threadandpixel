"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, CloseIcon } from "./icons";

export function ErrorAlert({
  message,
  onClose,
  duration = 6000,
}: {
  message: string | null;
  onClose: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <div className="error-banner-content">
        <span className="error-banner-icon">
          <AlertTriangleIcon size={16} />
        </span>
        <span className="error-banner-text">{message}</span>
      </div>
      <button
        type="button"
        className="error-banner-close"
        onClick={() => {
          setVisible(false);
          onClose();
        }}
        aria-label="Dismiss error"
        title="Dismiss error"
      >
        <CloseIcon size={13} />
      </button>
      <div
        className="error-banner-timer"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}
