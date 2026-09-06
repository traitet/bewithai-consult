import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies, orgUnits, users } from "@/lib/db/schema";
import type { Role } from "@/lib/types";

let counter = 0;
/** Unique-per-call suffix so parallel tests never collide on unique columns (e.g. email). */
function uniq(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}`;
}

export async function createTestCompany(name = "Test Co") {
  const [company] = await db.insert(companies).values({ name: uniq(name), status: "ACTIVE" }).returning();
  return company;
}

export async function createTestUser(input: {
  companyId: string | null;
  orgUnitId?: string | null;
  role: Role;
  name?: string;
}) {
  const passwordHash = await bcrypt.hash("password123", 4); // low cost factor: tests only
  const [user] = await db
    .insert(users)
    .values({
      companyId: input.companyId,
      orgUnitId: input.orgUnitId ?? null,
      name: input.name ?? uniq(input.role),
      email: `${uniq(input.role.toLowerCase())}@test.dev`,
      passwordHash,
      role: input.role,
    })
    .returning();
  return user;
}

/**
 * Builds a full Division -> Department -> Section chain for a company, with
 * a manager assigned at every level and one plain member in the section —
 * i.e. a company where a project is immediately submittable for approval.
 */
export async function seedTestCompanyWithApprovalChain(companyName = "Test Co") {
  const company = await createTestCompany(companyName);

  const [division] = await db
    .insert(orgUnits)
    .values({ companyId: company.id, level: "DIVISION", name: uniq("Division") })
    .returning();
  const [department] = await db
    .insert(orgUnits)
    .values({ companyId: company.id, parentId: division.id, level: "DEPARTMENT", name: uniq("Department") })
    .returning();
  const [section] = await db
    .insert(orgUnits)
    .values({ companyId: company.id, parentId: department.id, level: "SECTION", name: uniq("Section") })
    .returning();

  const divisionManager = await createTestUser({ companyId: company.id, orgUnitId: division.id, role: "DIVISION_MANAGER" });
  const departmentManager = await createTestUser({ companyId: company.id, orgUnitId: department.id, role: "DEPARTMENT_MANAGER" });
  const sectionManager = await createTestUser({ companyId: company.id, orgUnitId: section.id, role: "SECTION_MANAGER" });
  const member = await createTestUser({ companyId: company.id, orgUnitId: section.id, role: "MEMBER" });

  await db.update(orgUnits).set({ managerUserId: divisionManager.id }).where(eq(orgUnits.id, division.id));
  await db.update(orgUnits).set({ managerUserId: departmentManager.id }).where(eq(orgUnits.id, department.id));
  await db.update(orgUnits).set({ managerUserId: sectionManager.id }).where(eq(orgUnits.id, section.id));

  return { company, division, department, section, divisionManager, departmentManager, sectionManager, member };
}
