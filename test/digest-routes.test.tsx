import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const baseConfig = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

let runsDir: string;

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

function configFor(dir: string) {
  return { ...baseConfig, runsDir: dir };
}

describe('digest routes', () => {
  it('GET /digest/:night renders 200 with each job name and the lane banner', async () => {
    copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
    process.env.LANE_MARKER = 'TEST-MARKER';
    const app = createApp(configFor(runsDir));
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    for (const job of ['rig/rotate-logs', 'lane/sync', 'fixtures/refresh', 'notes/backup', 'digest/render']) {
      expect(html).toContain(job);
    }
  });

  it('GET /api/digest/:night returns 200 with rows and badLines', async () => {
    copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
    const app = createApp(configFor(runsDir));
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: DigestRow[]; badLines: number };
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('page and JSON agree: job names appear in the page in the same order as JSON rows', async () => {
    copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
    const app = createApp(configFor(runsDir));
    const jsonRes = await app.request('/api/digest/2026-10-28');
    expect(jsonRes.status).toBe(200);
    const body = (await jsonRes.json()) as { rows: DigestRow[] };
    const htmlRes = await app.request('/digest/2026-10-28');
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();

    const indices = body.rows.map((row) => html.indexOf(row.job));
    for (const index of indices) {
      expect(index).toBeGreaterThanOrEqual(0);
    }
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it('a night with no file answers 404 on both the page and the JSON', async () => {
    const app = createApp(configFor(runsDir));
    const pageRes = await app.request('/digest/2026-10-28');
    const jsonRes = await app.request('/api/digest/2026-10-28');
    expect(pageRes.status).toBe(404);
    expect(jsonRes.status).toBe(404);
  });

  it('an empty night renders "nothing ran" and the JSON has rows []', async () => {
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');
    const app = createApp(configFor(runsDir));
    const pageRes = await app.request('/digest/2026-10-28');
    const html = await pageRes.text();
    expect(pageRes.status).toBe(200);
    expect(html).toContain('nothing ran');

    const jsonRes = await app.request('/api/digest/2026-10-28');
    expect(jsonRes.status).toBe(200);
    const body = (await jsonRes.json()) as { rows: DigestRow[] };
    expect(body.rows).toEqual([]);
  });

  it('a night with a bad line still answers 200 on both, with badLines 1', async () => {
    const lines = [
      '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
      'not json at all',
    ];
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), lines.join('\n') + '\n');
    const app = createApp(configFor(runsDir));
    const pageRes = await app.request('/digest/2026-10-28');
    expect(pageRes.status).toBe(200);

    const jsonRes = await app.request('/api/digest/2026-10-28');
    expect(jsonRes.status).toBe(200);
    const body = (await jsonRes.json()) as { rows: DigestRow[]; badLines: number };
    expect(body.badLines).toBe(1);
  });

  it('owner null renders as "—" in the page (digest/render)', async () => {
    copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
    const app = createApp(configFor(runsDir));
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const jobIndex = html.indexOf('digest/render');
    expect(jobIndex).toBeGreaterThanOrEqual(0);
    const nearby = html.slice(jobIndex, jobIndex + 400);
    expect(nearby).toContain('—');
  });

  it('a row with retries >= 3 or fail is marked with class "warn"', async () => {
    copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
    const app = createApp(configFor(runsDir));
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const fixturesIndex = html.indexOf('fixtures/refresh');
    const notesIndex = html.indexOf('notes/backup');
    expect(fixturesIndex).toBeGreaterThanOrEqual(0);
    expect(notesIndex).toBeGreaterThanOrEqual(0);
    const window = 400;
    const fixturesNearby = html.slice(Math.max(0, fixturesIndex - window), fixturesIndex + window);
    const notesNearby = html.slice(Math.max(0, notesIndex - window), notesIndex + window);
    expect(fixturesNearby.includes('class="warn"') || notesNearby.includes('class="warn"')).toBe(true);
  });
});
