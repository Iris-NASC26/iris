import type { ReactNode } from "react";

export type IconName =
  | "activity"
  | "alert"
  | "arrow"
  | "book"
  | "box"
  | "check"
  | "chevron"
  | "download"
  | "external"
  | "file"
  | "github"
  | "globe"
  | "info"
  | "layers"
  | "moon"
  | "search"
  | "sparkles"
  | "sun"
  | "thermometer"
  | "trash";

const iconPaths: Record<IconName, ReactNode> = {
  activity: (
    <>
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 2.8 1.9 17a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 2.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  arrow: (
    <>
      <path d="m7 17 10-10M7 7h10v10" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  box: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 3v18M3 8h5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  chevron: (
    <>
      <path d="m8 10 4 4 4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
    </>
  ),
  external: (
    <>
      <path d="M15 3h6v6M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  github: (
    <>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.5 5.5 0 0 0 19.3 4 5.1 5.1 0 0 0 19.2.5S18 0 15 1.8a13.4 13.4 0 0 0-7 0C5 0 3.8.5 3.8.5A5.1 5.1 0 0 0 3.7 4a5.5 5.5 0 0 0-1.5 3.8c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 8 18v4" />
      <path d="M8 19c-3 .9-3-1.5-4-2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  moon: (
    <>
      <path d="M20.6 14.4A8.5 8.5 0 0 1 9.6 3.4 9 9 0 1 0 20.6 14.4Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.2 3.1a2 2 0 0 1-1.1 1.1L6.5 8.5l3.2 1.3a2 2 0 0 1 1.1 1.1L12 14l1.2-3.1a2 2 0 0 1 1.1-1.1l3.2-1.3-3.2-1.3a2 2 0 0 1-1.1-1.1L12 3ZM5 14l-.7 1.8a1 1 0 0 1-.6.6L2 17l1.7.7a1 1 0 0 1 .6.6L5 20l.7-1.7a1 1 0 0 1 .6-.6L8 17l-1.7-.6a1 1 0 0 1-.6-.6L5 14ZM19 2l-.5 1.3-.5.5-1.3.5 1.3.5.5.5L19 6.6l.5-1.3.5-.5 1.3-.5-1.3-.5-.5-.5L19 2Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" />
      <path d="M10 11v6" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}
