import type { SVGProps } from "react";

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = SVGProps<SVGSVGElement>;

export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);
export const MapPinIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 6 9 12l6 6" />
  </svg>
);
export const ImageIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-5-5L5 21" />
  </svg>
);
export const XIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3Z" />
  </svg>
);
export const LogoutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M10 4H5v16h5" />
    <path d="M15 8l4 4-4 4" />
    <path d="M19 12H9" />
  </svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);