/** Shared member avatar: a photo if the person has set one, else their initials on a brand gradient. Used in the sidebar, topbar, and anywhere else a person is referenced. */
export function Avatar({
  name,
  initials,
  avatarUrl,
  size = 32,
}: {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-supplied external URL, not a static asset
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.375 }}
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue to-teal font-semibold text-white"
    >
      {initials}
    </div>
  );
}
