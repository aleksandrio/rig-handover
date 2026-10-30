import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { countStatuses, type Counts } from './digest/counts.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightSummary = {
  night: string;
  // null when the night's log can't be read (no readNight yet, a throw, or no file) — the
  // board renders "—" for each count rather than dropping the row (styleguide: missing data).
  counts: Counts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => ({
      night,
      counts: countsFor(config.runsDir, night),
    })),
  };
}

// readNight is worked in parallel (issue #2) and may still be a placeholder that throws, or may
// return null for a night it can't read. Either way the board renders "—" for counts, never
// a thrown request.
function countsFor(runsDir: string, night: string): Counts | null {
  try {
    const parsed = readNight(runsDir, night);
    return parsed ? countStatuses(parsed) : null;
  } catch {
    return null;
  }
}
