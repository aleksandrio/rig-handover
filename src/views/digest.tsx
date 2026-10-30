import type { Night } from '../digest/types.js';

// Plan morning-digest § 2a. One table, sorted by job (rows already sorted by the reader).
export function DigestPage({ night }: { night: Night }) {
  if (night.rows.length === 0) {
    return (
      <>
        <h1>digest · {night.night}</h1>
        <p class="mute">nothing ran</p>
        {night.badLines > 0 && <p class="warn">{badLineText(night.badLines)}</p>}
      </>
    );
  }

  return (
    <>
      <h1>digest · {night.night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {night.rows.map((row) => {
            const bad = row.retries >= 3 || row.lastStatus === 'fail';
            return (
              <tr class={bad ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {night.badLines > 0 && <p class="warn">{badLineText(night.badLines)}</p>}
    </>
  );
}

export function NoRunLog({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">no run log for {night}</p>
    </>
  );
}

function badLineText(n: number): string {
  return `${n} line${n === 1 ? '' : 's'} could not be read`;
}
