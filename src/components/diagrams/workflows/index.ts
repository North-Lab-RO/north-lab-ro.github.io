import type { Lang } from '../../../i18n/ui';
import type { WorkflowSet } from './types';

export type { Actor, Tone, WBranch, WStep, Workflow, WorkflowSet } from './types';

// One data file per product, named after its slug; each exports { en, ro }.
type WorkflowModule = { default: Record<Lang, WorkflowSet> };
const modules = import.meta.glob<WorkflowModule>(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true });

export function getWorkflows(slug: string, lang: Lang): WorkflowSet | null {
  const mod = modules[`./${slug}.ts`];
  return mod ? mod.default[lang] : null;
}
