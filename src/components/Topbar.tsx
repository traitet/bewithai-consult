import { BuildingIcon } from "@/components/icons";
import { CompanySwitcher } from "@/components/CompanySwitcher";

export function Topbar({
  title,
  isConsultant,
  companyLabel,
  companies,
  viewingCompanyId,
  userInitials,
}: {
  title: string;
  isConsultant: boolean;
  companyLabel: string;
  companies: { id: string; name: string }[];
  viewingCompanyId: string | null;
  userInitials: string;
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue to-teal text-[12px] font-semibold text-white">
          {userInitials}
        </div>
      </div>
    </div>
  );
}
