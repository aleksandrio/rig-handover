import type { Night } from './types.js';

export type Counts = { ok: number; retry: number; fail: number };

/**
 * Derives per-night status counts from a Night's rows, for the status board link line.
 *
 * `DigestRow` only carries an exact *line* count for retries (`retries`, lines with status
 * "retry"). It does not carry exact line counts for "ok" and "fail": `runs - retries` conflates
 * them whenever a job both failed and later recovered (or vice versa) within the same night, so
 * that split cannot be recovered from the row shape. `ok` and `fail` here therefore count *jobs*
 * by `lastStatus` instead of lines: `ok` is the number of jobs whose last line was ok, `fail` the
 * number whose last line was fail. `retry` stays an exact line count: the sum of every row's
 * `retries`.
 */
export function countStatuses(night: Night): Counts {
  let ok = 0;
  let fail = 0;
  let retry = 0;
  for (const row of night.rows) {
    retry += row.retries;
    if (row.lastStatus === 'ok') ok += 1;
    else if (row.lastStatus === 'fail') fail += 1;
  }
  return { ok, retry, fail };
}
