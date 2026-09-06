import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getOwnProfile, userInitials } from "@/lib/repos/users";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { updateProfileAction } from "./actions";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const me = await getOwnProfile(scope);
  if (!me) return null;

  return (
    <AppShell title="My Profile">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-4">
          {me.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied external URL, not a static asset
            <img src={me.avatarUrl} alt={me.name} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue to-teal text-[16px] font-semibold text-white">
              {userInitials(me.name)}
            </div>
          )}
          <div>
            <p className="font-heading text-[16px] font-semibold text-text">{me.name}</p>
            <p className="text-[12px] text-text-faint">{ROLE_LABELS[me.role as Role] ?? me.role}</p>
          </div>
        </div>

        <form action={updateProfileAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-dim">Name</span>
            <input name="name" defaultValue={me.name} required className="input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-dim">Photo URL</span>
            <input name="avatarUrl" defaultValue={me.avatarUrl ?? ""} placeholder="https://..." className="input" />
            <span className="text-[11px] text-text-faint">Direct photo upload isn&rsquo;t built yet — paste a link for now.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-dim">Email</span>
            <input value={me.email} disabled className="input opacity-60" />
          </label>

          <button type="submit" className="self-start rounded-lg bg-gradient-to-br from-blue to-teal px-5 py-2.5 text-[12.5px] font-semibold text-white">
            Save Changes
          </button>
        </form>
      </div>
    </AppShell>
  );
}
