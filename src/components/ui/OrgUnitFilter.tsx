"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const LEVEL_INDENT: Record<string, string> = {
  DIVISION: "",
  DEPARTMENT: "— ",
  SECTION: "—— ",
};

export function OrgUnitFilter({
  orgUnits,
  selectedOrgUnitId,
}: {
  orgUnits: { id: string; name: string; level: string }[];
  selectedOrgUnitId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label="Filter by division / department / section"
      defaultValue={selectedOrgUnitId ?? "ALL"}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "ALL") params.delete("orgUnitId");
        else params.set("orgUnitId", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="input"
    >
      <option value="ALL">All divisions / departments / sections</option>
      {orgUnits.map((u) => (
        <option key={u.id} value={u.id}>
          {LEVEL_INDENT[u.level] ?? ""}
          {u.name}
        </option>
      ))}
    </select>
  );
}
