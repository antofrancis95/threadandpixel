import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function ScissorsIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12m4.88 4.88L20 20M8.12 15.88 20 4M12 12l-3.88 3.88" />
      <circle cx="6" cy="18" r="3" />
    </svg>
  );
}

export function MirrorIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 21h14" />
      <path d="M6 21V9a6 6 0 0 1 12 0v12" />
      <path d="M9 9a3 3 0 0 1 6 0v7" />
      <circle cx="12" cy="18" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RulerIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21.2 19.8 4.2 2.8a1 1 0 0 0-1.4 0l-1 1a1 1 0 0 0 0 1.4l17 17a1 1 0 0 0 1.4 0l1-1a1 1 0 0 0 0-1.4Z" />
      <path d="m7 7 2-2M10 10l3-3M13 13l2-2M16 16l3-3" />
    </svg>
  );
}

export function FilmIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="20" height="15" x="2" y="6" rx="2" />
      <path d="m2 6 3-3h14l3 3" />
      <path d="m7 3 2 3M12 3l2 3M17 3l2 3" />
      <polygon points="10 10.5 15 13.5 10 16.5 10 10.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ClipboardIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="16" height="18" x="4" y="4" rx="2" />
      <path d="M8 4V2.5A1.5 1.5 0 0 1 9.5 1h5A1.5 1.5 0 0 1 16 2.5V4" />
      <path d="M8 9h8M8 13h6M8 17h4" />
    </svg>
  );
}

export function CameraIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="14" r="4" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MicIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="6" height="11" x="9" y="2" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
    </svg>
  );
}

export function StopIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      {...props}
    >
      <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
  );
}

export function SparkleIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      {...props}
    >
      <path d="m12 1 2.8 7.2L22 11l-7.2 2.8L12 21l-2.8-7.2L2 11l7.2-2.8L12 1z" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ThreadIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <ellipse cx="12" cy="5" rx="6" ry="2" />
      <path d="M6 5v14c0 1.1 2.69 2 6 2s6-.9 6-2V5" />
      <path d="M6 10c0 1.1 2.69 2 6 2s6-.9 6-2M6 15c0 1.1 2.69 2 6 2s6-.9 6-2" />
    </svg>
  );
}

export function HourglassIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 22h14M5 2h14M17 22v-4.17a3 3 0 0 0-.88-2.12L13.5 13.1a2.12 2.12 0 0 1 0-2.2l2.62-2.61a3 3 0 0 0 .88-2.12V2M7 2v4.17a3 3 0 0 0 .88 2.12L10.5 10.9a2.12 2.12 0 0 1 0 2.2l-2.62 2.61A3 3 0 0 0 7 17.83V22" />
    </svg>
  );
}

export function RecycleIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7l3.9-6.8" />
      <path d="m14 19 3 3 3-3" />
      <path d="M17 22V9.5a1.5 1.5 0 0 0-1.5-1.5H7.5" />
      <path d="m20 10-3-3-3 3" />
      <path d="m11 4.5 1.5-2.5 1.5 2.5" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

export function MannequinIcon({ size = 32, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size * 1.45}
      viewBox="0 0 24 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="4" r="2.5" />
      <path d="M12 6.5v2M8 8.5h8M7 10c0 4 2 6 3 8-2 4-3 9-3 15h10c0-6-1-11-3-15 1-2 3-4 3-8H7z" />
      <line x1="12" y1="25" x2="12" y2="33" />
      <line x1="8" y1="33" x2="16" y2="33" />
    </svg>
  );
}

export function ArchiveIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 3a3 3 0 0 0-3 3c0 1.2.7 2.2 1.8 2.7L2.4 15.6A2 2 0 0 0 3.6 19h16.8a2 2 0 0 0 1.2-3.4L13.2 8.7A3 3 0 0 0 12 3z" />
      <path d="M2 19h20" />
    </svg>
  );
}

export function PlusIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function LockIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function GoogleIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function ImageIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export function PartyIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 12" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.66-.7 1.12-1.37 1.04l-.86-.1" />
    </svg>
  );
}

export function MenswearIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M8 3h8l2 5-2 13H8L6 8l2-5z" />
      <path d="M8 3l4 8 4-8" />
      <path d="M12 11v10" />
      <path d="m6.5 8.5 3.5 1" />
      <path d="m17.5 8.5-3.5 1" />
      <line x1="14.5" y1="12" x2="17.5" y2="12" />
      <circle cx="12" cy="14" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WomenswearIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M8 3h8l1.5 5-2.5 4v1l4 8H5l4-8v-1L6.5 8 8 3z" />
      <path d="M9.5 3c0 2 1.2 3.5 2.5 3.5s2.5-1.5 2.5-3.5" />
      <path d="M7 13h10" />
    </svg>
  );
}
