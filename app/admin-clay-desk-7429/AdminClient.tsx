'use client';

import { useEffect, useState } from 'react';
import {
  GroupId,
  Match,
  Tournament,
  defaultTournament,
  groupStageMatchCount,
  groupStagePairExists,
  playerName,
} from '@/lib/tournament';

const groups: GroupId[] = ['A', 'B', 'C', 'D'];
const stages: Match['stage'][] = ['round-robin', 'quarter-final', 'semi-final', 'final'];
type TournamentResponse = { tournament: Tournament };

const blankMatch = {
  stage: 'round-robin' as Match['stage'],
  group: 'A' as GroupId,
  a: '',
  b: '',
  finalScore: '',
  pointsA: '',
  pointsB: '',
  day: '',
  when: '',
  court: 'Centre Court',
};

export default function AdminClient() {
  const [tournament, setTournament] = useState<Tournament>(defaultTournament);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Loading saved tournament');
  const [newMatch, setNewMatch] = useState(blankMatch);

  useEffect(() => {
    fetch('/api/tournament')
      .then((response) => response.json())
      .then((data) => {
        setTournament((data as TournamentResponse).tournament);
        setMessage('Ready to edit');
      })
      .catch(() => setMessage('Using default data. Try saving after the page reconnects.'));
  }, []);

  function updateTournament(field: 'club' | 'event' | 'title' | 'roundRobinLabel' | 'qualifyLabel' | 'championLabel' | 'championMeta' | 'accentColor', value: string) {
    setTournament((current) => ({ ...current, [field]: value }));
  }

  function updatePlayer(id: string, field: 'name' | 'nationality' | 'flag' | 'seed' | 'group', value: string) {
    setTournament((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === id ? { ...player, [field]: field === 'seed' ? Number(value) : value } : player)),
    }));
  }

  function addPlayer(group: GroupId) {
    setTournament((current) => {
      const nextIndex = current.players.length + 1;
      const groupCount = current.players.filter((player) => player.group === group).length + 1;
      return {
        ...current,
        players: [
          ...current.players,
          {
            id: `${group}${groupCount}-${nextIndex}`,
            group,
            name: `New Player ${nextIndex}`,
            nationality: '',
            flag: '🏳️',
            seed: 1,
          },
        ],
      };
    });
  }

  function removePlayer(id: string) {
    setTournament((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== id),
      matches: current.matches.filter((match) => match.a !== id && match.b !== id),
    }));
  }

  function addMatch() {
    if (!newMatch.a || !newMatch.b || newMatch.a === newMatch.b) {
      setMessage('Choose two different players before adding the match.');
      return;
    }
    if (newMatch.stage === 'round-robin') {
      const playerA = tournament.players.find((player) => player.id === newMatch.a);
      const playerB = tournament.players.find((player) => player.id === newMatch.b);
      if (playerA?.group !== newMatch.group || playerB?.group !== newMatch.group) {
        setMessage(`Choose two players from Group ${newMatch.group}.`);
        return;
      }
      if (groupStagePairExists(tournament, newMatch.group, newMatch.a, newMatch.b)) {
        setMessage(`${playerName(tournament, newMatch.a)} and ${playerName(tournament, newMatch.b)} already have a Group ${newMatch.group} match. Each pair plays once.`);
        return;
      }
      const playerACount = groupStageMatchCount(tournament, newMatch.group, newMatch.a);
      const playerBCount = groupStageMatchCount(tournament, newMatch.group, newMatch.b);
      if (playerACount >= 5 || playerBCount >= 5) {
        const cappedPlayer = playerACount >= 5 ? newMatch.a : newMatch.b;
        setMessage(`${playerName(tournament, cappedPlayer)} already has 5 group-stage matches. A group player cannot play more than 5.`);
        return;
      }
    }
    const pointsA = newMatch.pointsA === '' ? null : Number(newMatch.pointsA);
    const pointsB = newMatch.pointsB === '' ? null : Number(newMatch.pointsB);
    const match: Match = {
      id: `M${Date.now()}`,
      group: newMatch.stage === 'round-robin' ? newMatch.group : undefined,
      stage: newMatch.stage,
      slot: newMatch.stage === 'round-robin' ? `Group ${newMatch.group}` : stageLabel(newMatch.stage),
      a: newMatch.a,
      b: newMatch.b,
      sets: [[null, null], [null, null], [null, null]],
      finalScore: newMatch.finalScore,
      pointsA,
      pointsB,
      winner: pointsA !== null && pointsB !== null && pointsA !== pointsB ? (pointsA > pointsB ? 0 : 1) : null,
      mins: null,
      court: newMatch.court,
      day: newMatch.day,
      when: newMatch.when,
      status: pointsA !== null && pointsB !== null ? 'played' : 'scheduled',
    };
    setTournament((current) => ({ ...current, matches: [...current.matches, match] }));
    setNewMatch(blankMatch);
    setMessage('Match added. Use Save all changes to update the public site.');
  }

  function groupRuleNotice() {
    if (newMatch.stage !== 'round-robin') return null;
    if (!newMatch.a || !newMatch.b || newMatch.a === newMatch.b) {
      return 'Group stage rule: each player can have 5 matches, one against every other player in the group.';
    }
    if (groupStagePairExists(tournament, newMatch.group, newMatch.a, newMatch.b)) {
      return `${playerName(tournament, newMatch.a)} and ${playerName(tournament, newMatch.b)} are already paired in Group ${newMatch.group}.`;
    }
    const playerACount = groupStageMatchCount(tournament, newMatch.group, newMatch.a);
    const playerBCount = groupStageMatchCount(tournament, newMatch.group, newMatch.b);
    if (playerACount >= 5 || playerBCount >= 5) {
      const cappedPlayer = playerACount >= 5 ? newMatch.a : newMatch.b;
      return `${playerName(tournament, cappedPlayer)} is already at 5 group matches.`;
    }
    return `${playerName(tournament, newMatch.a)}: ${playerACount}/5 group matches. ${playerName(tournament, newMatch.b)}: ${playerBCount}/5 group matches.`;
  }

  async function save() {
    setSaving(true);
    setMessage('Saving changes');
    const response = await fetch('/api/tournament', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament }),
    });
    const data = (await response.json()) as TournamentResponse;
    setTournament(data.tournament);
    setSaving(false);
    setMessage('Saved. The public site is updated.');
  }

  const activeGroupRuleNotice = groupRuleNotice();
  const activeGroupRuleWarning =
    newMatch.stage === 'round-robin' &&
    !!newMatch.a &&
    !!newMatch.b &&
    newMatch.a !== newMatch.b &&
    (groupStagePairExists(tournament, newMatch.group, newMatch.a, newMatch.b) ||
      groupStageMatchCount(tournament, newMatch.group, newMatch.a) >= 5 ||
      groupStageMatchCount(tournament, newMatch.group, newMatch.b) >= 5);

  return (
    <main className="admin-shell">
      <header>
        <div>
          <p>Private admin panel</p>
          <h1>Edit tournament fields</h1>
        </div>
        <div className="admin-actions">
          <a href="/" target="_blank">View public site</a>
          <button disabled={saving} onClick={save}>{saving ? 'Saving' : 'Save all changes'}</button>
        </div>
      </header>
      <p className="admin-status">{message}</p>

      <section className="admin-section">
        <h2>Tournament text</h2>
        <div className="admin-grid">
          <Field label="Club" value={tournament.club} onChange={(value) => updateTournament('club', value)} />
          <Field label="Event" value={tournament.event} onChange={(value) => updateTournament('event', value)} />
          <Field label="Page title" value={tournament.title} onChange={(value) => updateTournament('title', value)} />
          <Field label="Round-robin label" value={tournament.roundRobinLabel} onChange={(value) => updateTournament('roundRobinLabel', value)} />
          <Field label="Qualify label" value={tournament.qualifyLabel} onChange={(value) => updateTournament('qualifyLabel', value)} />
          <Field label="Champion label" value={tournament.championLabel} onChange={(value) => updateTournament('championLabel', value)} />
          <Field label="Champion meta" value={tournament.championMeta} onChange={(value) => updateTournament('championMeta', value)} />
          <Field label="Accent color" value={tournament.accentColor} onChange={(value) => updateTournament('accentColor', value)} />
        </div>
      </section>

      <section className="admin-section">
        <h2>Players</h2>
        {groups.map((group) => (
          <div className="admin-table-wrap" key={group}>
            <div className="admin-subhead">
              <h3>Group {group}</h3>
              <button onClick={() => addPlayer(group)}>Add player</button>
            </div>
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Flag</th><th>Nationality</th><th>Seed</th><th>Group</th><th></th></tr></thead>
              <tbody>
                {tournament.players.filter((player) => player.group === group).map((player) => (
                  <tr key={player.id}>
                    <td><input value={player.name} onChange={(event) => updatePlayer(player.id, 'name', event.target.value)} /></td>
                    <td><input value={player.flag} onChange={(event) => updatePlayer(player.id, 'flag', event.target.value)} /></td>
                    <td><input value={player.nationality} onChange={(event) => updatePlayer(player.id, 'nationality', event.target.value)} /></td>
                    <td><input type="number" min="1" max="99" value={player.seed} onChange={(event) => updatePlayer(player.id, 'seed', event.target.value)} /></td>
                    <td>
                      <select value={player.group} onChange={(event) => updatePlayer(player.id, 'group', event.target.value as GroupId)}>
                        {groups.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td><button className="text-button" onClick={() => removePlayer(player.id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Add match</h2>
        <div className="add-match-panel">
          <label><span>Stage</span><select value={newMatch.stage} onChange={(event) => setNewMatch((current) => ({ ...current, stage: event.target.value as Match['stage'], a: '', b: '' }))}>{stages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></label>
          {newMatch.stage === 'round-robin' ? <label><span>Group</span><select value={newMatch.group} onChange={(event) => setNewMatch((current) => ({ ...current, group: event.target.value as GroupId, a: '', b: '' }))}>{groups.map((group) => <option key={group}>{group}</option>)}</select></label> : null}
          <PlayerSelect label="Player A" value={newMatch.a} tournament={tournament} group={newMatch.stage === 'round-robin' ? newMatch.group : null} onChange={(value) => setNewMatch((current) => ({ ...current, a: value }))} />
          <PlayerSelect label="Player B" value={newMatch.b} tournament={tournament} group={newMatch.stage === 'round-robin' ? newMatch.group : null} onChange={(value) => setNewMatch((current) => ({ ...current, b: value }))} />
          {activeGroupRuleNotice ? <p className={activeGroupRuleWarning ? 'rule-warning' : 'rule-note'}>{activeGroupRuleNotice}</p> : null}
          <label><span>Final score</span><input placeholder="6-4  7-5" value={newMatch.finalScore} onChange={(event) => setNewMatch((current) => ({ ...current, finalScore: event.target.value }))} /></label>
          <label><span>Points A</span><input type="number" min="0" value={newMatch.pointsA} onChange={(event) => setNewMatch((current) => ({ ...current, pointsA: event.target.value }))} /></label>
          <label><span>Points B</span><input type="number" min="0" value={newMatch.pointsB} onChange={(event) => setNewMatch((current) => ({ ...current, pointsB: event.target.value }))} /></label>
          <label><span>Day</span><input value={newMatch.day} onChange={(event) => setNewMatch((current) => ({ ...current, day: event.target.value }))} /></label>
          <label><span>Time</span><input value={newMatch.when} onChange={(event) => setNewMatch((current) => ({ ...current, when: event.target.value }))} /></label>
          <label><span>Court</span><input value={newMatch.court} onChange={(event) => setNewMatch((current) => ({ ...current, court: event.target.value }))} /></label>
          <button onClick={addMatch}>Add match to schedule</button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Saved matches</h2>
        <div className="saved-matches">
          {tournament.matches.length > 0 ? (
            tournament.matches.map((match) => (
              <article key={match.id}>
                <strong>{match.slot}</strong>
                <span>{playerName(tournament, match.a)} v {playerName(tournament, match.b)}</span>
                <span>{match.finalScore || (match.pointsA !== null && match.pointsB !== null ? `${match.pointsA}-${match.pointsB}` : 'Scheduled')}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No matches added yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PlayerSelect({ label, value, tournament, group, onChange }: { label: string; value: string; tournament: Tournament; group: GroupId | null; onChange: (value: string) => void }) {
  const players = group ? tournament.players.filter((player) => player.group === group) : tournament.players;
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select player</option>
        {value && !players.some((player) => player.id === value) ? <option value={value}>{value}</option> : null}
        {players.map((player) => {
          const groupCount = group ? groupStageMatchCount(tournament, group, player.id) : null;
          const isFull = groupCount !== null && groupCount >= 5 && value !== player.id;
          return (
            <option disabled={isFull} key={player.id} value={player.id}>
              {player.flag} {player.name}{groupCount !== null ? ` (${groupCount}/5)` : ''}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function stageLabel(stage: Match['stage']) {
  if (stage === 'round-robin') return 'Group';
  if (stage === 'quarter-final') return 'Quarter-final';
  if (stage === 'semi-final') return 'Semi-final';
  return 'Final';
}
