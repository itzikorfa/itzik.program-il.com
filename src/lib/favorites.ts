import { getCollection, type CollectionEntry } from 'astro:content';

export type Favorite = CollectionEntry<'favorites'>;

/** Newest first (LIFO): by confirmation time, then by file id so the order is stable. */
export function sortFavorites<T extends { id: string; data: { date: Date } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id));
}

export async function getFavorites(): Promise<Favorite[]> {
  return sortFavorites(await getCollection('favorites'));
}
