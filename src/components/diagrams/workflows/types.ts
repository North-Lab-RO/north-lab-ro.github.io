/** Who does a step. Shown as a coloured chip on every step of a workflow. */
export type Actor = 'you' | 'app' | 'ai' | 'store' | 'ext' | 'sim';
export type Tone = 'ok' | 'bad' | 'warn' | 'neutral';

export interface WBranch {
  when: string;
  then: string;
  tone?: Tone;
  /** Id of another workflow this branch continues in. */
  goto?: string;
}

export interface WStep {
  /** step (default), decision (diamond with side-exits), loop (repeats or retries), schedule (runs on a clock). */
  kind?: 'step' | 'decision' | 'loop' | 'schedule';
  actor?: Actor;
  label: string;
  detail?: string;
  /** Label of the path that carries on down the spine after a decision. */
  yes?: string;
  branches?: WBranch[];
  /** Id of another workflow the flow continues in after this step. */
  goto?: string;
  /** Designed but not built yet. */
  planned?: boolean;
}

export interface Workflow {
  id: string;
  title: string;
  /** What starts it: a schedule, an action of yours, or another workflow. */
  trigger: string;
  summary: string;
  steps: WStep[];
  outputs?: string[];
  /** Ids of the workflows this one hands its results to. */
  feeds?: string[];
}

export interface WorkflowSet {
  intro: string;
  workflows: Workflow[];
}
