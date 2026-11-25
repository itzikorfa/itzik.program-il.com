/** Owner's calendar: post dates (YYYY-MM-DD) are days in Israel, while builds run in UTC. */
const TIME_ZONE = 'Asia/Jerusalem';
const dayIn = (d: Date, timeZone: string) => d.toLocaleDateString('en-CA', { timeZone }); // YYYY-MM-DD

/** A post is public when it isn't a draft and its date has arrived in Israel. */
export function isPublished(data: { draft: boolean; date: Date }, now: Date): boolean {
  return !data.draft && dayIn(data.date, 'UTC') <= dayIn(now, TIME_ZONE);
}
