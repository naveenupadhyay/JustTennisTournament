'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BracketMatch,
  GroupId,
  Match,
  Tournament,
  defaultTournament,
  groupLabel,
  playerFlag,
  playerName,
  resolveBracketMatch,
  roundRobinCapacityForGroup,
  scoreText,
  setTotals,
  standingsFor,
  totalRoundRobinCapacity,
} from '@/lib/tournament';

const groups: GroupId[] = ['A', 'B', 'C', 'D'];

type DetailMatch = (Match | BracketMatch) & { isBracket?: boolean };
type TournamentResponse = { tournament: Tournament };

export default function TournamentClient() {
  const [tournament, setTournament] = useState<Tournament>(defaultTournament);
  const [tab, setTab] = useState<'groups' | 'bracket'>('groups');
  const [group, setGroup] = useState<GroupId>('A');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetch('/api/tournament')
      .then((response) => response.json())
      .then((data) => setTournament((data as TournamentResponse).tournament))
      .catch(() => setTournament(defaultTournament));
  }, []);

  const groupMatches = tournament.matches.filter((match) => match.group === group);
  const bracketMatches = tournament.matches.filter((match) => !match.group);
  const playedCount = tournament.matches.filter((match) => match.group && match.status === 'played').length;
  const groupMatchCount = groupMatches.length;
  const groupCapacity = roundRobinCapacityForGroup(tournament, group);
  const totalGroupCapacity = totalRoundRobinCapacity(tournament);
  const qualifierCount = groups.reduce((total, gid) => total + Math.min(2, tournament.players.filter((player) => player.group === gid).length), 0);
  const detail = useMemo<DetailMatch | null>(() => {
    if (!detailId) return null;
    const match = tournament.matches.find((item) => item.id === detailId);
    if (!match) return null;
    return match.group ? match : { ...resolveBracketMatch(tournament, match), isBracket: true };
  }, [detailId, tournament]);

  function openTab(next: 'groups' | 'bracket') {
    setTab(next);
    setDetailId(null);
  }

  function toggleVideoSound() {
    const nextMuted = !videoMuted;
    setVideoMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) videoRef.current.play().catch(() => undefined);
    }
  }

  function downloadTournamentData() {
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

  function downloadTournamentPdf() {
    const printWindow = window.open('', 'just-tennis-us-open-pdf');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildTournamentSnapshotHtml(tournament));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 350);
  }

  return (
    <main className="site-shell" style={{ ['--accent' as string]: tournament.accentColor }}>
      <header className="site-header">
        <div className="brand-title">
          <div className="brand-logos" aria-label="Tournament branding">
            <img className="just-tennis-logo" src="/just-tennis-logo.png" alt="JUST Tennis" />
            <img className="us-open-logo" src="/us-open-logo.png" alt="US Open" />
          </div>
          <div className="eyebrow">{tournament.club}</div>
          <h1>{tournament.title}</h1>
        </div>
        <div className="header-tools">
          <div className="stats">
            <Stat value={tournament.players.length} label="players" />
            <Stat value={groups.length} label="groups" />
            <Stat value={`${playedCount}/${totalGroupCapacity}`} label={tournament.roundRobinLabel} />
            <Stat value={qualifierCount} label={tournament.qualifyLabel} />
          </div>
          <div className="download-actions">
            <button className="download-button" onClick={downloadTournamentData}>Download CSV</button>
            <button className="download-button" onClick={downloadTournamentPdf}>Download PDF</button>
          </div>
        </div>
      </header>

      <section className="tournament-video" aria-label="JUST Tennis US Open video">
        <video ref={videoRef} autoPlay loop muted={videoMuted} playsInline preload="metadata">
          <source src="/just-tennis-us-open.mp4" type="video/mp4" />
        </video>
        <button aria-label={videoMuted ? 'Turn video sound on' : 'Turn video sound off'} onClick={toggleVideoSound}>
          {videoMuted ? '🔇' : '🔊'}
        </button>
      </section>

      <nav className="tabs" aria-label="Tournament views">
        <button className={tab === 'groups' ? 'active' : ''} onClick={() => openTab('groups')}>Groups</button>
        <button className={tab === 'bracket' ? 'active' : ''} onClick={() => openTab('bracket')}>Knockout bracket</button>
      </nav>

      {tab === 'groups' ? (
        <section className="page-section">
          <div className="standings-grid">
            {groups.map((gid) => {
              const table = standingsFor(tournament, gid);
              return (
                <section className="group-card" key={gid}>
                  <div className="group-head">
                    <h2>{groupLabel(tournament, gid)}</h2>
                    <button className={group === gid ? 'showing' : ''} onClick={() => setGroup(gid)}>
                      {group === gid ? 'showing results' : 'view results'}
                    </button>
                  </div>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Player</th><th>Nat.</th><th>Played</th><th>W-L</th><th>Pts</th></tr>
                    </thead>
                    <tbody>
                      {table.map((row, index) => (
                        <tr className={index < 2 && row.played > 0 ? 'qualified' : ''} key={row.player.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{row.player.name}</strong>
                            {index < 2 && row.played > 0 ? <span>Q</span> : null}
                          </td>
                          <td><span className="flag" title={row.player.nationality}>{row.player.flag}</span></td>
                          <td>{row.played}</td>
                          <td>{row.won}-{row.lost}</td>
                          <td>{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>

          <section className="points-system" aria-label="Points system">
            <div>
              <h2>Points system</h2>
              <p>Group matches may be played as either one set or best of 3 sets. The third set may be a tie-break game instead.</p>
            </div>
            <ul>
              <li><strong>2</strong><span>points for every set won</span></li>
              <li><strong>5</strong><span>points for winning the match</span></li>
            </ul>
          </section>

          <section className="matches-section">
            <div className="section-head">
              <h2>{groupLabel(tournament, group)} · round robin</h2>
              <span>{groupMatchCount}/{groupCapacity} matches added · tap a match for the score sheet</span>
            </div>
            <div className="match-list">
              {groupMatches.length > 0 ? (
                groupMatches.map((match) => (
                  <button className={detailId === match.id ? 'match-row selected' : 'match-row'} key={match.id} onClick={() => setDetailId(match.id)}>
                    <span>{match.slot}</span>
                    <span>
                      <strong className={match.winner === 0 ? 'winner' : ''}><span>{playerFlag(tournament, match.a)}</span>{playerName(tournament, match.a)}</strong>
                      <strong className={match.winner === 1 ? 'winner' : ''}><span>{playerFlag(tournament, match.b)}</span>{playerName(tournament, match.b)}</strong>
                    </span>
                    <span>{scoreText(match)}</span>
                  </button>
                ))
              ) : (
                <p className="empty-state">No matches added for {groupLabel(tournament, group)} yet.</p>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="page-section bracket-section">
          <div className="bracket-grid">
            <Round title="Quarter-finals" when="21 September" pad="0" matches={bracketMatches.filter((match) => match.stage === 'quarter-final').map((match) => resolveBracketMatch(tournament, match))} detailId={detailId} open={setDetailId} />
            <Round title="Semi-finals" when="28 September" pad="56px" matches={bracketMatches.filter((match) => match.stage === 'semi-final').map((match) => resolveBracketMatch(tournament, match))} detailId={detailId} open={setDetailId} />
            <Round title="Final" when="3 October" pad="148px" matches={bracketMatches.filter((match) => match.stage === 'final').map((match) => resolveBracketMatch(tournament, match))} detailId={detailId} open={setDetailId} />
          </div>
          <div className="champion-strip">
            <h2>{tournament.championLabel}</h2>
            <span>{tournament.championMeta}</span>
          </div>
        </section>
      )}

      {detail ? <Detail tournament={tournament} match={detail} close={() => setDetailId(null)} /> : null}
    </main>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return <div><strong>{value}</strong>{label}</div>;
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

function Round({ title, when, pad, matches, detailId, open }: { title: string; when: string; pad: string; matches: BracketMatch[]; detailId: string | null; open: (id: string) => void }) {
  return (
    <section>
      <div className="round-head"><span>{title}</span><span>{when}</span></div>
      <div className="round-matches" style={{ paddingTop: pad }}>
        {matches.length > 0 ? (
          matches.map((match) => (
            <button className={detailId === match.id ? 'bracket-card selected' : 'bracket-card'} key={match.id} onClick={() => open(match.id)}>
              <div><strong className={match.aPlaceholder ? 'placeholder' : ''}>{match.aResolved}</strong><span>{match.status === 'played' ? setTotals(match)[0] : '-'}</span></div>
              <hr />
              <div><strong className={match.bPlaceholder ? 'placeholder' : ''}>{match.bResolved}</strong><span>{match.status === 'played' ? setTotals(match)[1] : '-'}</span></div>
              <p>{match.day} {match.when} · {match.court}</p>
            </button>
          ))
        ) : (
          <p className="empty-state compact">No matches added.</p>
        )}
      </div>
    </section>
  );
}

function Detail({ tournament, match, close }: { tournament: Tournament; match: DetailMatch; close: () => void }) {
  const names = 'aResolved' in match ? [match.aResolved, match.bResolved] : [playerName(tournament, match.a), playerName(tournament, match.b)];
  const title = match.status === 'played'
    ? `${names[0].split(' ').at(-1)} v ${names[1].split(' ').at(-1)}`
    : `${names[0]} v ${names[1]}`;
  const totals = setTotals(match);
  const setWins = match.sets.reduce<[number, number]>((wins, [a, b]) => {
    if (a !== null && b !== null && a !== b) wins[a > b ? 0 : 1] += 1;
    return wins;
  }, [0, 0]);

  return (
    <aside className="detail-panel">
      <div className="detail-top">
        <div>
          <p>{match.group ? `${groupLabel(tournament, match.group)} · round robin` : match.slot}</p>
          <h2>{title}</h2>
        </div>
        <button aria-label="Close score sheet" onClick={close}>×</button>
      </div>
      <div className="detail-meta"><span>{match.day}</span><span>{match.court}</span><span>{match.mins ? `${match.mins}m` : 'not played'}</span></div>
      <table className="score-table">
        <thead><tr><th>Player</th><th>S1</th><th>S2</th><th>S3</th></tr></thead>
        <tbody>
          {[0, 1].map((index) => (
            <tr key={names[index]}>
              <td><strong className={match.winner === index ? 'winner' : ''}>{names[index]}</strong>{match.winner === index ? <span>def.</span> : null}</td>
              {match.sets.map(([a, b], setIndex) => <td key={setIndex}>{(index === 0 ? a : b) ?? '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="detail-lines">
        {match.status === 'played' ? <><p><span>Final score</span><strong>{scoreText(match)}</strong></p><p><span>Sets</span><strong>{setWins[0]}-{setWins[1]}</strong></p><p><span>Points</span><strong>{totals[0]}-{totals[1]}</strong></p><p><span>Result</span><strong>recorded by Desk</strong></p></> : <><p><span>Format</span><strong>Best of 3</strong></p><p><span>Status</span><strong>Scheduled</strong></p><p><span>Umpire</span><strong>To be assigned</strong></p></>}
      </div>
      <p className="detail-note">{match.status === 'played' ? 'Score sheet is the source of truth for standings. Edit at the desk and group tables recalculate.' : 'Slots fill automatically as previous rounds complete. Group winners are seeded against runners-up from another group.'}</p>
    </aside>
  );
}
