"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogoMark,
  DashboardIcon,
  ProjectsIcon,
  IssuesIcon,
  BookingsIcon,
  ELearningIcon,
  SkillsIcon,
  ReportsIcon,
  SettingsIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/projects", label: "Projects", Icon: ProjectsIcon },
  { href: "/issues", label: "Issues", Icon: IssuesIcon },
  { href: "/bookings", label: "Bookings", Icon: BookingsIcon },
  { href: "/elearning", label: "E-Learning", Icon: ELearningIcon },
  { href: "/skills", label: "Skills", Icon: SkillsIcon },
  { href: "/reports", label: "Reports", Icon: ReportsIcon },
] as const;

export function Sidebar({
  userName,
  userRole,
  userInitials,
}: {
  userName: string;
  userRole: string;
  userInitials: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <LogoMark />
        <div className="flex flex-col">
          <span className="font-heading text-[17px] font-semibold leading-none tracking-tight text-text">
            bewithai
          </span>
          <span className="mt-1 text-[10.5px] uppercase tracking-wide text-text-faint">
            AI Consulting Ops
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] ${
                active
                  ? "bg-gradient-to-br from-blue/15 to-teal/10 font-semibold text-text"
                  : "font-medium text-text-dim hover:bg-surface-alt"
              }`}
            >
              <Icon className={active ? "text-teal" : ""} />
              <span>{label}</span>
            </Link>
          );
        })}

        <div className="mx-1 my-2 h-px bg-border-soft" />

        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] ${
            pathname.startsWith("/settings")
              ? "bg-gradient-to-br from-blue/15 to-teal/10 font-semibold text-text"
              : "font-medium text-text-dim hover:bg-surface-alt"
          }`}
        >
          <SettingsIcon className={pathname.startsWith("/settings") ? "text-teal" : ""} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border-soft p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue to-teal text-[12px] font-semibold text-white">
          {userInitials}
        </div>
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold text-text">{userName}</span>
          <span className="text-[11px] text-text-faint">{userRole}</span>
        </div>
      </div>
    </div>
  );
}
