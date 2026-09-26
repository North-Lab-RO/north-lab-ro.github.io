import type { Lang } from '../../i18n/ui';
import type { TourStep } from './TourFrame.astro';

export interface Tour {
  label: string;
  url: string;
  /** Language of the real interface shown in the screenshots. */
  uiLang: Lang;
  steps: TourStep[];
}

type TourModule = { tour: (lang: Lang) => Tour };

// Each product's tour lives in its own file (e.g. counselor.ts) and is picked up automatically.
const modules = import.meta.glob<TourModule>(['./*.ts', '!./index.ts'], { eager: true });

export function getTour(slug: string, lang: Lang): Tour | null {
  const mod = modules[`./${slug}.ts`];
  return mod ? mod.tour(lang) : null;
}
