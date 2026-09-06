import Link from "next/link";
import { BuildingIcon } from "@/components/icons";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar({
  title,
  isConsultant,
  companyLabel,
  companies,
  viewingCompanyId,
  userName,
  userInitials,
  avatarUrl,
}: {
  title: string;
  isConsultant: boolean;
  companyLabel: string;
  companies: { id: string; name: string }[];
  viewingCompanyId: string | null;
  userName: string;
  userInitials: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-7">
      <span className="font-heading text-[19px] font-semibold text-text">{title}</span>
      <div className="flex items-center gap-3">
        {isConsultant ? (
          <CompanySwitcher companies={companies} viewingCompanyId={viewingCompanyId} />
        ) : (
          <div
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 opacity-75"
            title="Scoped to your company"
          >
            <BuildingIcon className="text-teal" />
            <span className="text-[12.5px] font-semibold text-text-dim">{companyLabel}</span>
          </div>
        )}
        <Link href="/profile">
          <Avatar name={userName} initials={userInitials} avatarUrl={avatarUrl} size={32} />
        </Link>
      </div>
    </div>
  );
}
