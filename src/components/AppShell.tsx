import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompany, listAllCompanies } from "@/lib/repos/companies";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { userInitials, getOwnProfile } from "@/lib/repos/users";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ROLE_LABELS } from "@/lib/labels";
import { isCompanyIndependentRole } from "@/lib/types";

/**
 * Wraps every authenticated page: enforces login, renders the shared
 * sidebar/topbar shell, and resolves the "effective company" a consultant
 * is currently viewing (see src/lib/company-context.ts). Usage:
 *
 *   export default async function SomePage() {
 *     return <AppShell title="Issues"><IssuesContent /></AppShell>
 *   }
 */
export async function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const scope = scopeFromSession(session);
  const isConsultant = isCompanyIndependentRole(session.role); // Consultant or Super Admin — both companyId=null

  const companies = isConsultant ? await listAllCompanies(scope) : [];
  const viewingCompanyId = await effectiveViewingCompanyId(session);

  let companyLabel = "All Companies";
  if (!isConsultant && session.companyId) {
    const company = await getCompany(scope, session.companyId);
    companyLabel = company?.name ?? companyLabel;
  } else if (isConsultant && viewingCompanyId) {
    companyLabel = companies.find((c) => c.id === viewingCompanyId)?.name ?? companyLabel;
  }

  const me = await getOwnProfile(scope);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar
        userName={session.name}
        userRole={ROLE_LABELS[session.role]}
        userInitials={userInitials(session.name)}
        avatarUrl={me?.avatarUrl ?? null}
        showTeamLink={session.role === "DIVISION_MANAGER"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title={title}
          isConsultant={isConsultant}
          companyLabel={companyLabel}
          companies={companies}
          viewingCompanyId={viewingCompanyId}
          userName={session.name}
          userInitials={userInitials(session.name)}
          avatarUrl={me?.avatarUrl ?? null}
        />
        <div className="flex-1 overflow-auto p-7">{children}</div>
      </div>
    </div>
  );
}
