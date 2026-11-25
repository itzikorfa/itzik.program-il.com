/** A post is public when it isn't a draft and its date has arrived. */
export function isPublished(data: { draft: boolean; date: Date }, now: Date): boolean {
  return !data.draft && data.date.getTime() <= now.getTime();
}
