import {
  GroupId,
  Match,
  Tournament,
  groupLabel,
  playerName,
  scoreText,
  standingsFor,
  totalRoundRobinCapacity,
} from './tournament';

const groups: GroupId[] = ['A', 'B', 'C', 'D'];

export function downloadTournamentCsv(tournament: Tournament) {
  const rows = exportRows(tournament);
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'just-tennis-us-open-data.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function openTournamentPdfSnapshot(tournament: Tournament) {
  const printWindow = window.open('', 'just-tennis-us-open-pdf');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildTournamentSnapshotHtml(tournament));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 350);
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function exportRows(tournament: Tournament) {
  const rows: string[][] = [
    ['Just Tennis US Open Export'],
    ['Generated', new Date().toLocaleString()],
    [],
    ['Group Standings'],
    ['Group', 'Rank', 'Player', 'Nationality', 'Played', 'Won', 'Lost', 'League Points', 'Points Against', 'Difference'],
  ];

  groups.forEach((gid) => {
    standingsFor(tournament, gid).forEach((row, index) => {
      rows.push([
        groupLabel(tournament, gid),
        String(index + 1),
        row.player.name,
        row.player.nationality,
        String(row.played),
        String(row.won),
        String(row.lost),
        String(row.points),
        String(row.pointsAgainst),
        String(row.diff),
      ]);
    });
  });

  rows.push(
    [],
    ['Group Stage Match Results'],
    ['Group', 'Match', 'Date', 'Court', 'Player A', 'Player B', 'Final Score', 'Points A', 'Points B', 'Winner', 'Status'],
  );

  const groupMatches = tournament.matches.filter((match) => match.stage === 'round-robin');
  if (groupMatches.length === 0) {
    rows.push(['No group-stage matches recorded yet.']);
  }

  groupMatches.forEach((match) => {
    const winner = match.winner === 0 ? playerName(tournament, match.a) : match.winner === 1 ? playerName(tournament, match.b) : '';
    rows.push([
      match.group ? groupLabel(tournament, match.group) : '',
      match.slot,
      [match.day, match.when].filter(Boolean).join(' '),
      match.court,
      playerName(tournament, match.a),
      playerName(tournament, match.b),
      scoreText(match),
      match.pointsA === null ? '' : String(match.pointsA),
      match.pointsB === null ? '' : String(match.pointsB),
      winner,
      match.status,
    ]);
  });

  return rows;
}

function buildTournamentSnapshotHtml(tournament: Tournament) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const playedCount = tournament.matches.filter((match) => match.group && match.status === 'played').length;
  const totalGroupCapacity = totalRoundRobinCapacity(tournament);
  const qualifierCount = groups.reduce((total, gid) => total + Math.min(2, tournament.players.filter((player) => player.group === gid).length), 0);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Just Tennis US Open Snapshot</title>
    <style>${snapshotCss(tournament.accentColor)}</style>
  </head>
  <body>
    <main>
      <header class="snapshot-header">
        <div>
          <div class="brand-logos">
            <img class="just-tennis-logo" src="${origin}/just-tennis-logo.png" alt="JUST Tennis" />
            <img class="us-open-logo" src="${origin}/us-open-logo.png" alt="US Open" />
          </div>
          <p class="eyebrow">${escapeHtml(tournament.club)}</p>
          <h1>${escapeHtml(tournament.title)}</h1>
          <p class="event-dates">Sep 1 to Oct 1, 2026</p>
        </div>
        <div class="stats">
          <div><strong>${tournament.players.length}</strong><span>players</span></div>
          <div><strong>${groups.length}</strong><span>groups</span></div>
          <div><strong>${playedCount}/${totalGroupCapacity}</strong><span>${escapeHtml(tournament.roundRobinLabel)}</span></div>
          <div><strong>${qualifierCount}</strong><span>${escapeHtml(tournament.qualifyLabel)}</span></div>
        </div>
      </header>
      <section class="groups">
        ${groups.map((gid) => snapshotGroup(tournament, gid)).join('')}
      </section>
    </main>
  </body>
</html>`;
}

function snapshotGroup(tournament: Tournament, gid: GroupId) {
  const table = standingsFor(tournament, gid);
  const playedMatches = tournament.matches.filter((match) => match.stage === 'round-robin' && match.group === gid && match.status === 'played');

  return `<section class="group-card">
    <div class="group-head">
      <h2>${escapeHtml(groupLabel(tournament, gid))}</h2>
      <span>${playedMatches.length} played</span>
    </div>
    <table>
      <thead>
        <tr><th>#</th><th>Player</th><th>Nat.</th><th>Played</th><th>W-L</th><th>Pts</th></tr>
      </thead>
      <tbody>
        ${table.map((row, index) => `<tr class="${index < 2 && row.played > 0 ? 'qualified' : ''}">
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(row.player.name)}</strong>${index < 2 && row.played > 0 ? '<span class="q">Q</span>' : ''}</td>
          <td><span class="flag">${escapeHtml(row.player.flag)}</span>${escapeHtml(row.player.nationality || 'TBD')}</td>
          <td>${row.played}</td>
          <td>${row.won}-${row.lost}</td>
          <td>${row.points}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="match-list">
      <h3>Played matches</h3>
      ${playedMatches.length ? playedMatches.map((match) => snapshotMatch(tournament, match)).join('') : '<p class="empty">No completed matches recorded yet.</p>'}
    </div>
  </section>`;
}

function snapshotMatch(tournament: Tournament, match: Match) {
  const winner = match.winner === 0 ? playerName(tournament, match.a) : match.winner === 1 ? playerName(tournament, match.b) : 'Winner TBD';
  const loser = match.winner === 0 ? playerName(tournament, match.b) : match.winner === 1 ? playerName(tournament, match.a) : '';
  const points = match.pointsA !== null && match.pointsB !== null ? `${match.pointsA}-${match.pointsB} pts` : 'points not entered';
  const date = [match.day, match.when].filter(Boolean).join(' ');

  return `<article class="match-item">
    <div>
      <strong>${escapeHtml(winner)}${loser ? ` def. ${escapeHtml(loser)}` : ''}</strong>
      <span>${escapeHtml(scoreText(match))}</span>
    </div>
    <p>${escapeHtml([match.slot, match.court, date, points].filter(Boolean).join(' · '))}</p>
  </article>`;
}

function snapshotCss(accentColor: string) {
  return `
    :root {
      --page: oklch(0.965 0.012 80);
      --surface: oklch(0.995 0.004 80);
      --highlight: oklch(0.975 0.012 80);
      --ink: oklch(0.26 0.015 60);
      --muted: oklch(0.5 0.03 60);
      --line: oklch(0.88 0.02 70);
      --line-soft: oklch(0.94 0.01 70);
      --accent: ${escapeHtml(accentColor)};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--page);
      color: var(--ink);
      font-family: Inter, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    main { max-width: 1120px; margin: 0 auto; padding: 30px; }
    .snapshot-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 28px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    .brand-logos { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .brand-logos img { display: block; object-fit: contain; }
    .just-tennis-logo { width: 72px; height: 72px; mix-blend-mode: multiply; }
    .us-open-logo { width: 154px; height: auto; border-radius: 2px; }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1, h2 {
      margin: 0;
      font-family: Georgia, serif;
      font-weight: 400;
      line-height: 1;
    }
    h1 { font-size: 42px; }
    .event-dates {
      margin: 6px 0 0;
      color: var(--muted);
      font-family: Georgia, serif;
      font-size: 24px;
      line-height: 1.1;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(92px, 1fr));
      gap: 12px 18px;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      text-transform: uppercase;
    }
    .stats strong { display: block; color: var(--ink); font-size: 22px; font-weight: 400; text-transform: none; }
    .stats span { display: block; }
    .groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      padding-top: 24px;
    }
    .group-card {
      break-inside: avoid;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--surface);
      overflow: hidden;
    }
    .group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--highlight);
    }
    .group-head h2 { font-size: 22px; line-height: 1.12; }
    .group-head span {
      flex: 0 0 auto;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line-soft);
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    td strong { font-weight: 650; }
    td:nth-child(1), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: right; }
    .qualified td { background: color-mix(in srgb, var(--accent) 10%, white); }
    .q {
      display: inline-flex;
      margin-left: 6px;
      padding: 2px 5px;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      font-size: 9px;
      font-weight: 700;
    }
    .flag { margin-right: 6px; }
    .match-list { padding: 14px 18px 16px; }
    .match-list h3 {
      margin: 0 0 10px;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .match-item {
      padding: 10px 0;
      border-top: 1px solid var(--line-soft);
    }
    .match-item:first-of-type { border-top: 0; }
    .match-item div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
    }
    .match-item span { color: var(--accent); font-weight: 700; }
    .match-item p, .empty {
      margin: 4px 0 0;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      line-height: 1.45;
    }
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      main { max-width: none; padding: 0; }
      .group-card { break-inside: avoid; }
    }
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
