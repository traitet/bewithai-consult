const DIAL_COLOR = "#2b3a55"; // matches the sidebar's dark navy, used consistently for "filled" skill levels

/** A 4-quarter pie dial: each quarter fills solid as `level` (0-4) climbs, empty quarters stay outlined. */
export function SkillLevelDial({ level, size = 26 }: { level: number; size?: number }) {
  const clamped = Math.max(0, Math.min(4, level));
  const pct = (clamped / 4) * 100;

  return (
    <span
      title={`Level ${clamped}/4`}
      className="inline-block flex-shrink-0 rounded-full border border-border"
      style={{
        width: size,
        height: size,
        background: pct === 0 ? "var(--surface)" : `conic-gradient(${DIAL_COLOR} ${pct}%, var(--surface) ${pct}% 100%)`,
      }}
    />
  );
}
