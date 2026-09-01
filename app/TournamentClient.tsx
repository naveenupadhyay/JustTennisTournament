'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BracketMatch,
  GroupId,
  Match,
  Tournament,
  defaultTournament,
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
        <div className="stats">
          <Stat value={tournament.players.length} label="players" />
          <Stat value={groups.length} label="groups" />
          <Stat value={`${playedCount}/${totalGroupCapacity}`} label={tournament.roundRobinLabel} />
          <Stat value={qualifierCount} label={tournament.qualifyLabel} />
        </div>
      </header>

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
                    <h2>Group {gid}</h2>
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

          <section className="matches-section">
            <div className="section-head">
              <h2>Group {group} · round robin</h2>
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
                <p className="empty-state">No Group {group} matches added yet.</p>
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
          <p>{match.group ? `Group ${match.group} · round robin` : match.slot}</p>
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
