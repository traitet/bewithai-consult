function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? "var(--amber)" : "none"} stroke="var(--amber)" strokeWidth="1.4">
      <path d="M10 2.5 12.4 7.6 18 8.4 14 12.2 15 17.8 10 15.1 5 17.8 6 12.2 2 8.4 7.6 7.6Z" strokeLinejoin="round" />
    </svg>
  );
}

/** Read-only star display, e.g. for an average rating. */
export function StarRating({ value, size = 14 }: { value: number; readOnly?: true; size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= Math.round(value)} size={size} />
        ))}
      </div>
      <span className="text-[11px] text-text-faint">{value > 0 ? value.toFixed(1) : "No ratings yet"}</span>
    </div>
  );
}
