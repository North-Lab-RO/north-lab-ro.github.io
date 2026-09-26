import { getCollection } from 'astro:content';

export async function getProjects() {
  const all = await getCollection('projects', ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export const accentVar = {
  ice: 'var(--color-ice)',
  aurora: 'var(--color-aurora)',
  ember: 'var(--color-ember)',
  violet: 'var(--color-violet)',
} as const;
