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
  SuccessStoryIcon,
  TeamIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", Icon: DashboardIcon },
  { href: "/projects", label: "โปรเจกต์", Icon: ProjectsIcon },
  { href: "/issues", label: "ปัญหา (Issues)", Icon: IssuesIcon },
  { href: "/bookings", label: "นัดหมาย", Icon: BookingsIcon },
  { href: "/elearning", label: "E-Learning", Icon: ELearningIcon },
  { href: "/skills", label: "ทักษะ (Skills)", Icon: SkillsIcon },
  { href: "/performance", label: "ผลงานพนักงาน", Icon: TeamIcon },
  { href: "/success-stories", label: "เรื่องราวความสำเร็จ", Icon: SuccessStoryIcon },
  { href: "/reports", label: "รายงาน", Icon: ReportsIcon },
] as const;

export function Sidebar({
  userName,
  userRole,
  userInitials,
  avatarUrl,
  showTeamLink,
}: {
  userName: string;
  userRole: string;
  userInitials: string;
  avatarUrl?: string | null;
  showTeamLink: boolean;
}) {
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] border ${
      active
        ? "border-white/10 bg-white/[0.08] font-semibold text-white"
        : "border-transparent font-medium text-[#aebbd6] hover:bg-white/[0.04] hover:text-white"
    }`;
  const iconClass = (active: boolean) => (active ? "text-[#7fb3ff]" : "");

  return (
    <div className="flex h-full w-60 flex-shrink-0 flex-col bg-gradient-to-b from-[#0e1b34] to-[#152a52]">
      <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <LogoMark className="[&_path]:stroke-white [&_circle]:fill-white" />
        <div className="flex flex-col">
          <span className="font-heading text-[17px] font-semibold leading-none tracking-tight text-white">
            bewithai
          </span>
          <span className="mt-1 text-[10.5px] uppercase tracking-wide text-[#8fa0c4]">
            AI Consulting Ops
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={itemClass(active)}>
              <Icon className={iconClass(active)} />
              <span>{label}</span>
            </Link>
          );
        })}

        {showTeamLink && (
          <Link href="/team" className={itemClass(pathname.startsWith("/team"))}>
            <TeamIcon className={iconClass(pathname.startsWith("/team"))} />
            <span>ทีมของฉัน</span>
          </Link>
        )}

        <div className="mx-1 my-2 h-px bg-white/10" />

        <Link href="/settings" className={itemClass(pathname.startsWith("/settings"))}>
          <SettingsIcon className={iconClass(pathname.startsWith("/settings"))} />
          <span>ตั้งค่า</span>
        </Link>
      </nav>

      <Link href="/profile" className="flex items-center gap-2.5 border-t border-white/10 p-4 hover:bg-white/[0.04]">
        <Avatar name={userName} initials={userInitials} avatarUrl={avatarUrl} size={32} />
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold text-white">{userName}</span>
          <span className="text-[11px] text-[#8fa0c4]">{userRole}</span>
        </div>
      </Link>
    </div>
  );
}
