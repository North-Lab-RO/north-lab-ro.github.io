import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n/ui';

export type Project = CollectionEntry<'projects'> & { slug: string };

/** Published projects for one language, ordered. `slug` is the id without its language folder. */
export async function getProjects(lang: Lang): Promise<Project[]> {
  const all = await getCollection('projects', ({ id, data }) => id.startsWith(`${lang}/`) && !data.draft);
  return all
    .map((e) => Object.assign(e, { slug: e.id.slice(lang.length + 1) }))
    .sort((a, b) => a.data.order - b.data.order);
}

export const accentVar = {
  ice: 'var(--color-ice)',
  aurora: 'var(--color-aurora)',
  ember: 'var(--color-ember)',
  violet: 'var(--color-violet)',
  indigo: 'var(--color-indigo)',
} as const;
