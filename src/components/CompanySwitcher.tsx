"use client";

import { useTransition } from "react";
import { BuildingIcon, ChevronDownIcon } from "@/components/icons";
import { setViewingCompany } from "@/lib/company-context";

export function CompanySwitcher({
  companies,
  viewingCompanyId,
}: {
  companies: { id: string; name: string }[];
  viewingCompanyId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2">
      <BuildingIcon className="text-teal" />
      <select
        aria-label="Viewing company"
        disabled={pending}
        defaultValue={viewingCompanyId ?? "ALL"}
        onChange={(e) => {
          const formData = new FormData();
          formData.set("companyId", e.target.value);
          startTransition(() => {
            setViewingCompany(formData);
          });
        }}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-[12.5px] font-semibold text-text outline-none"
      >
        <option value="ALL">All Companies</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 text-text-faint" />
    </div>
  );
}
