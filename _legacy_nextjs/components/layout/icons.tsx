type IconProps = { size?: number; className?: string };
const p = (size = 20): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});

export const HomeIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>
);
export const BookIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
);
export const CalendarIcon  = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
);
export const ChartIcon     = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>
);
export const CardIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
);
export const CheckIcon     = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
);
export const AwardIcon     = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
);
export const UsersIcon     = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
);
export const ClipboardIcon = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
);
export const FileIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
);
export const BellIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
);
export const CogIcon       = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
);
export const MenuIcon      = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
);
export const XIcon         = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M18 6L6 18M6 6l12 12"/></svg>
);
export const DollarIcon    = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
);
export const ShieldIcon    = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
export const VideoIcon     = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/></svg>
);

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
);

export const ClockIcon = ({ size, className }: IconProps) => (
  <svg {...p(size)} className={className}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
