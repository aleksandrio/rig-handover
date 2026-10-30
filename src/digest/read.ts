import type { ReadNight } from './types.js';

// PLACEHOLDER — another worker is implementing the real reader for #2 in parallel.
// This stub exists only so this branch typechecks on its own; it will be replaced at merge.
export const readNight: ReadNight = () => {
  throw new Error('not implemented: see #2');
};
