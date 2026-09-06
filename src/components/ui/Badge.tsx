const COLOR_MAP: Record<string, { bg: string; fg: string; border: string }> = {
  // issue statuses
  OPEN: { bg: "rgba(24,119,242,.12)", fg: "var(--blue)", border: "rgba(24,119,242,.3)" },
  IN_REVIEW: { bg: "rgba(194,118,12,.12)", fg: "var(--amber)", border: "rgba(194,118,12,.3)" },
  CONVERTED: { bg: "rgba(66,165,245,.15)", fg: "var(--teal)", border: "rgba(66,165,245,.35)" },
  CLOSED: { bg: "rgba(101,103,107,.12)", fg: "var(--text-faint)", border: "rgba(101,103,107,.25)" },
  // project / workflow statuses
  PENDING_APPROVAL: { bg: "rgba(194,118,12,.12)", fg: "var(--amber)", border: "rgba(194,118,12,.3)" },
  PENDING: { bg: "rgba(194,118,12,.12)", fg: "var(--amber)", border: "rgba(194,118,12,.3)" },
  APPROVED: { bg: "rgba(24,119,242,.12)", fg: "var(--blue)", border: "rgba(24,119,242,.3)" },
  REJECTED: { bg: "rgba(228,30,63,.12)", fg: "var(--red)", border: "rgba(228,30,63,.3)" },
  IN_PROGRESS: { bg: "rgba(66,165,245,.15)", fg: "var(--teal)", border: "rgba(66,165,245,.35)" },
  COMPLETED: { bg: "rgba(49,162,76,.12)", fg: "var(--green)", border: "rgba(49,162,76,.3)" },
  PUBLISHED: { bg: "rgba(49,162,76,.12)", fg: "var(--green)", border: "rgba(49,162,76,.3)" },
  // delivery-plan delay indicator
  DELAYED: { bg: "rgba(228,30,63,.12)", fg: "var(--red)", border: "rgba(228,30,63,.3)" },
  ON_TRACK: { bg: "rgba(49,162,76,.12)", fg: "var(--green)", border: "rgba(49,162,76,.3)" },
  // booking / priority
  CONFIRMED: { bg: "rgba(24,119,242,.12)", fg: "var(--blue)", border: "rgba(24,119,242,.3)" },
  CANCELLED: { bg: "rgba(101,103,107,.12)", fg: "var(--text-faint)", border: "rgba(101,103,107,.25)" },
  HIGH: { bg: "rgba(228,30,63,.10)", fg: "var(--red)", border: "transparent" },
  MEDIUM: { bg: "rgba(194,118,12,.10)", fg: "var(--amber)", border: "transparent" },
  LOW: { bg: "transparent", fg: "var(--text-dim)", border: "transparent" },
};

export function Badge({ value, label }: { value: string; label?: string }) {
  const c = COLOR_MAP[value] ?? { bg: "var(--surface-alt)", fg: "var(--text-dim)", border: "var(--border)" };
  return (
    <span
      className="inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}
