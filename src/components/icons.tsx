// Inline icon set — matches the icons used in the design mockups (design/*.dc.html)
// so the real app looks identical to what was designed. Stroke-based, no icon
// library dependency.

type IconProps = { className?: string };

export function LogoMark({ className }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className={className}>
      <defs>
        <linearGradient id="bewithai-logo" x1="0" y1="0" x2="26" y2="26">
          <stop offset="0" stopColor="#1877f2" />
          <stop offset="1" stopColor="#42a5f5" />
        </linearGradient>
      </defs>
      <path
        d="M7 19 13 6 19 19"
        stroke="url(#bewithai-logo)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="6" r="2.4" fill="url(#bewithai-logo)" />
      <circle cx="7" cy="19" r="2.4" fill="url(#bewithai-logo)" />
      <circle cx="19" cy="19" r="2.4" fill="url(#bewithai-logo)" />
    </svg>
  );
}

const base = "fill-none stroke-current";
const strokeProps = { strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" />
    </svg>
  );
}

export function ProjectsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <path d="M10 2.5 2.5 6.5 10 10.5l7.5-4Z" />
      <path d="M2.5 10.5 10 14.5l7.5-4" />
      <path d="M2.5 14.5 10 18.5l7.5-4" />
    </svg>
  );
}

export function IssuesIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <path d="M4 17V3" />
      <path d="M4 3.5c1.4-.9 2.8-.9 4.2 0 1.4.9 2.8.9 4.2 0 1.4-.9 2.8-.9 4.2 0v7c-1.4-.9-2.8-.9-4.2 0-1.4.9-2.8.9-4.2 0-1.4-.9-2.8-.9-4.2 0" />
    </svg>
  );
}

export function BookingsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
      <path d="M2.5 8h15" />
      <path d="M6.5 2.5v3M13.5 2.5v3" />
    </svg>
  );
}

export function ELearningIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <path d="M2.5 7.5 10 4l7.5 3.5L10 11z" />
      <path d="M5.5 9v3.5c0 1 2 2 4.5 2s4.5-1 4.5-2V9" />
    </svg>
  );
}

export function SkillsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <circle cx="10" cy="8" r="5.5" />
      <path d="M7 12.5 5.8 18l4.2-2.3L14.2 18 13 12.5" />
    </svg>
  );
}

export function ReportsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <path d="M3 17V3M3 17h14" />
      <rect x="5.5" y="11" width="2.4" height="4" />
      <rect x="9.3" y="8" width="2.4" height="7" />
      <rect x="13.1" y="6" width="2.4" height="9" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M2.5 10h2M15.5 10h2M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />
    </svg>
  );
}

export function ApprovalsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <rect x="4" y="3" width="12" height="14" rx="1.5" />
      <path d="M7 9.5 9 11.5 13.5 7" />
    </svg>
  );
}

export function SuccessStoryIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <path d="M10 2.5 12.4 7.6 18 8.4 14 12.2 15 17.8 10 15.1 5 17.8 6 12.2 2 8.4 7.6 7.6Z" strokeLinejoin="round" />
    </svg>
  );
}

export function TeamIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} {...strokeProps}>
      <circle cx="7.5" cy="6.5" r="2.7" />
      <path d="M2.8 16c.5-2.6 2.4-4 4.7-4s4.2 1.4 4.7 4" />
      <circle cx="14.2" cy="7.3" r="2.1" />
      <path d="M13 12.4c1.9.2 3.3 1.5 3.7 3.6" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} strokeWidth="1.6">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <path d="M7 7h1M7 10.5h1M7 14h1M12 7h1M12 10.5h1M12 14h1" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg width="10" height="10" viewBox="0 0 20 20" className={`${base} ${className ?? ""}`} strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}
