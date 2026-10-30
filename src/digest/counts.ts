import type { Night, RunStatus } from './types.js';

export type Counts = Record<RunStatus, number>;

/** ok / retry / fail line counts for one night, for the status board. Bad lines are not counted. */
export function countStatuses(night: Night): Counts {
  return { ...night.lines };
}
