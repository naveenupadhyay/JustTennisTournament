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
    const pdf = buildTournamentPdf(tournament);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'just-tennis-us-open-data.pdf';
    link.click();
    URL.revokeObjectURL(url);
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
                      <tr><th>#</th><th>Player</th><th>Nat.</th><th>P</th><th>W–L</th><th>Diff</th></tr>
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
                          <td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
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
    ['Group', 'Rank', 'Player', 'Nationality', 'Played', 'Won', 'Lost', 'Points For', 'Points Against', 'Difference'],
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
        String(row.gf),
        String(row.ga),
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

function buildTournamentPdf(tournament: Tournament) {
  const lines = exportRows(tournament).flatMap((row) => {
    if (row.length === 0) return [''];
    if (row.length === 1) return wrapPdfLine(row[0], 94);
    return wrapPdfLine(row.join(' | '), 94);
  });
  return createSimplePdf(lines);
}

function createSimplePdf(lines: string[]) {
  const width = 595;
  const height = 842;
  const margin = 42;
  const lineHeight = 14;
  const linesPerPage = Math.floor((height - margin * 2) / lineHeight);
  const pages = chunk(lines, linesPerPage);
  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];

  pages.forEach((pageLines, index) => {
    const content = [
      'BT',
      `/F1 ${index === 0 ? 12 : 10} Tf`,
      `${margin} ${height - margin} Td`,
      `${lineHeight} TL`,
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ].join('\n');
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function wrapPdfLine(line: string, maxLength: number) {
  const clean = toPdfText(line);
  if (clean.length <= maxLength) return [clean];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function toPdfText(value: string) {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').trim();
}

function escapePdfText(value: string) {
  return toPdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks.length ? chunks : [[]];
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
