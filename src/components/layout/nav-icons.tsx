// MOBILE-02: small inline SVG icon set shared by the bottom tab bar and the
// side menu (one place, RULE 1). Inline SVG = no dependency on icon-library
// version names.

import type { ReactNode } from "react";

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-6 w-6"}
      aria-hidden
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const HomeIcon = ({ className }: P) => (
  <Svg className={className}><path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" /></Svg>
);
export const HotelIcon = ({ className }: P) => (
  <Svg className={className}><path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h8A1.5 1.5 0 0 1 16 4.5V21M16 9h2.5a1.5 1.5 0 0 1 1.5 1.5V21M3 21h18M8.5 7.5h4M8.5 11h4M8.5 14.5h4" /></Svg>
);
export const PackageIcon = ({ className }: P) => (
  <Svg className={className}><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M4.5 7h15A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7ZM3 12.5h18" /></Svg>
);
export const BookingsIcon = ({ className }: P) => (
  <Svg className={className}><path d="M7 3v3M17 3v3M4.5 5.5h15A1.5 1.5 0 0 1 21 7v12.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5V7a1.5 1.5 0 0 1 1.5-1.5ZM3 10h18M8 14.5l2.5 2.5L16 12" /></Svg>
);
export const AccountIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0" /></Svg>
);
export const SearchIcon = ({ className }: P) => (
  <Svg className={className}><path d="M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.4-4.4" /></Svg>
);
export const ChevronRightIcon = ({ className }: P) => (
  <Svg className={className ?? "h-4 w-4"}><path d="m9 6 6 6-6 6" /></Svg>
);
export const GlobeIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" /></Svg>
);
export const DashboardIcon = ({ className }: P) => (
  <Svg className={className}><path d="M4 4h6.5v8H4zM13.5 4H20v4.5h-6.5zM13.5 11.5H20V20h-6.5zM4 15.5h6.5V20H4z" /></Svg>
);
export const LockIcon = ({ className }: P) => (
  <Svg className={className}><path d="M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11ZM8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
export const DocIcon = ({ className }: P) => (
  <Svg className={className}><path d="M7.5 3H14l5 5v12.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-17a.5.5 0 0 1 .5-.5ZM14 3v5h5M9.5 13h5M9.5 16.5h5" /></Svg>
);
export const DownloadIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14" /></Svg>
);
export const ShareIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 15V4M8 7.5l4-4 4 4M6 11.5h-.5A1.5 1.5 0 0 0 4 13v6.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V13a1.5 1.5 0 0 0-1.5-1.5H18" /></Svg>
);
export const LogoutIcon = ({ className }: P) => (
  <Svg className={className}><path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9M16 16.5 21 12l-5-4.5M21 12H9" /></Svg>
);
export const CompassIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5Z" /></Svg>
);
export const TagIcon = ({ className }: P) => (
  <Svg className={className}><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0ZM8 8.2v.01" /></Svg>
);
export const PlusCircleIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v8M8 12h8" /></Svg>
);
export const GiftIcon = ({ className }: P) => (
  <Svg className={className}><path d="M4.5 11.5h15V20a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1ZM3.5 8h17v3.5h-17ZM12 8v13M12 8C9.5 8 8 6.8 8 5.6 8 4.6 8.8 4 9.6 4 11 4 12 6 12 8ZM12 8c2.5 0 4-1.2 4-2.4 0-1-.8-1.6-1.6-1.6C13 4 12 6 12 8Z" /></Svg>
);
export const StoreIcon = ({ className }: P) => (
  <Svg className={className}><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" /></Svg>
);
export const ShieldIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 3 5 6v5.5c0 4.3 2.9 7.9 7 9.5 4.1-1.6 7-5.2 7-9.5V6ZM9 12l2.2 2.2L15.5 10" /></Svg>
);
export const InfoIcon = ({ className }: P) => (
  <Svg className={className}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.8v.01" /></Svg>
);
export const PhoneIcon = ({ className }: P) => (
  <Svg className={className}><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2Z" /></Svg>
);
export const MailIcon = ({ className }: P) => (
  <Svg className={className}><path d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5ZM3.5 7.5 12 13l8.5-5.5" /></Svg>
);
export const ReceiptIcon = ({ className }: P) => (
  <Svg className={className}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h6" /></Svg>
);
export const HeadsetIcon = ({ className }: P) => (
  <Svg className={className}><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 17.5ZM20 14h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1A1.5 1.5 0 0 0 20 17.5Z" /></Svg>
);
export const CloseIcon = ({ className }: P) => (
  <Svg className={className}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
