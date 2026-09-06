// Week-ending (Mon–Sun) math for the project weekly progress report. No DB
// import — pure date logic, safe on client and server.

const MS_PER_DAY = 86_400_000;

function atMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The Sunday that closes the Mon–Sun week containing `date` (a Sunday maps to itself). */
export function getWeekEndingSunday(date: Date): Date {
  const d = atMidnight(date);
  const day = d.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d;
}

/** Every week-ending Sunday from the week containing `from` through the week containing `to`, inclusive. */
export function listWeekEndings(from: Date, to: Date, maxWeeks = 104): Date[] {
  const start = getWeekEndingSunday(from);
  const end = getWeekEndingSunday(to);
  const weeks: Date[] = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime() && weeks.length < maxWeeks) {
    weeks.push(cursor);
    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
  }
  return weeks;
}

/** A week only counts as missed once the Monday after its Sunday deadline has arrived. */
export function isWeekPastDue(weekEnding: Date, now: Date): boolean {
  return now.getTime() >= weekEnding.getTime() + MS_PER_DAY;
}
