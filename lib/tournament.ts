export type Player = {
  id: string;
  group: GroupId;
  name: string;
  nationality: string;
  flag: string;
  seed: number;
};

export type GroupId = 'A' | 'B' | 'C' | 'D';

export type Match = {
  id: string;
  group?: GroupId;
  stage: 'round-robin' | 'quarter-final' | 'semi-final' | 'final';
  slot: string;
  a: string;
  b: string;
  sets: Array<[number | null, number | null]>;
  finalScore: string;
  pointsA: number | null;
  pointsB: number | null;
  winner: 0 | 1 | null;
  mins: number | null;
  court: string;
  day: string;
  when: string;
  status: 'scheduled' | 'played';
};

export type Tournament = {
  club: string;
  event: string;
  title: string;
  roundRobinLabel: string;
  qualifyLabel: string;
  championLabel: string;
  championMeta: string;
  accentColor: string;
  players: Player[];
  matches: Match[];
};

export type Standing = {
  player: Player;
  played: number;
  won: number;
  lost: number;
  gf: number;
  ga: number;
  diff: number;
};

export type BracketMatch = Match & {
  aResolved: string;
  bResolved: string;
  aPlaceholder: boolean;
  bPlaceholder: boolean;
};

const emptySets: Match['sets'] = [[null, null], [null, null], [null, null]];

const defaultGroupPlayers: Record<GroupId, Array<{ seed: number; name: string }>> = {
  A: [
    { seed: 1, name: 'Abhishek Arora' },
    { seed: 8, name: 'Mohamed Faraz' },
    { seed: 9, name: 'Abdalrahman Nasser' },
    { seed: 16, name: 'Rizwan Siddiqi' },
    { seed: 17, name: 'Rehan Saleh' },
    { seed: 24, name: 'Jake Cowling' },
    { seed: 25, name: 'Toni' },
  ],
  B: [
    { seed: 2, name: 'Chirag Patel' },
    { seed: 7, name: 'Asim Ali' },
    { seed: 10, name: 'Naveen Upadhyay' },
    { seed: 15, name: 'Niyaz Husain' },
    { seed: 18, name: 'Asif Khan Yousafzai' },
    { seed: 23, name: 'Vikas Vicky Bach' },
    { seed: 26, name: 'Saarim Alvi' },
  ],
  C: [
    { seed: 3, name: 'Lee Elliott' },
    { seed: 6, name: 'Vishal Wadhwa' },
    { seed: 11, name: 'Eslam Ibrahim' },
    { seed: 14, name: 'Rakesh Das' },
    { seed: 19, name: 'Saboor Alvi' },
    { seed: 22, name: 'Omar Hamieh' },
    { seed: 27, name: 'Tba' },
  ],
  D: [
    { seed: 4, name: 'Sukesh Raj Suvarna' },
    { seed: 5, name: 'Goldi Gupta' },
    { seed: 12, name: 'Syed Mohammad Alvi' },
    { seed: 13, name: 'Dominique Collin' },
    { seed: 20, name: 'Swapnil Satapathy' },
    { seed: 21, name: 'Clysses Jotrin' },
    { seed: 28, name: 'Tba' },
  ],
};

const playerCountries: Record<string, { nationality: string; flag: string }> = {
  'Abhishek Arora': { nationality: 'India', flag: '🇮🇳' },
  'Rizwan Siddiqi': { nationality: 'Pakistan', flag: '🇵🇰' },
  'Rehan Saleh': { nationality: 'Pakistan', flag: '🇵🇰' },
  'Chirag Patel': { nationality: 'India', flag: '🇮🇳' },
  'Niyaz Husain': { nationality: 'India', flag: '🇮🇳' },
  'Lee Elliott': { nationality: 'United Kingdom', flag: '🇬🇧' },
  'Vishal Wadhwa': { nationality: 'India', flag: '🇮🇳' },
  'Sukesh Raj Suvarna': { nationality: 'India', flag: '🇮🇳' },
  'Goldi Gupta': { nationality: 'India', flag: '🇮🇳' },
};

const courts = ['Court 1', 'Court 2', 'Court 3', 'Centre Court'];
const days = ['Sat 30 Aug', 'Sun 31 Aug', 'Sat 6 Sep', 'Sun 7 Sep'];

function rng(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playSet(r: () => number, favA: boolean): [number, number] {
  const aWins = r() < (favA ? 0.62 : 0.38);
  const loserGames = r() < 0.3 ? 4 + Math.floor(r() * 2) : Math.floor(r() * 5);
  if (loserGames >= 5) return aWins ? [7, 5 + Math.round(r())] : [5 + Math.round(r()), 7];
  return aWins ? [6, loserGames] : [loserGames, 6];
}

function playMatch(seed: number, strengthA: number, strengthB: number) {
  const r = rng(seed);
  const sets: Array<[number, number]> = [];
  let aw = 0;
  let bw = 0;
  while (aw < 2 && bw < 2) {
    const set = playSet(r, strengthA >= strengthB);
    sets.push(set);
    if (set[0] > set[1]) aw += 1;
    else bw += 1;
  }
  return { sets, winner: aw > bw ? 0 : 1, mins: 62 + Math.floor(r() * 68) };
}

export const defaultTournament: Tournament = (() => {
  const groups = Object.keys(defaultGroupPlayers) as GroupId[];
  const players = groups.flatMap((group) =>
    defaultGroupPlayers[group].map((player, index) => {
      const country = playerCountries[player.name];
      return {
      id: `${group}${index + 1}`,
      group,
      name: player.name,
      nationality: country?.nationality ?? '',
      flag: country?.flag ?? '🏳️',
      seed: player.seed,
      };
    }),
  );

  return {
    club: 'JUST Tennis League',
    event: 'US Open',
    title: 'US Open Edition',
    roundRobinLabel: 'RR matches',
    qualifyLabel: 'qualify',
    championLabel: 'Champion',
    championMeta: 'decided 3 October · Centre Court',
    accentColor: 'oklch(0.58 0.13 45)',
    players,
    matches: [],
  };
})();

export function playerName(tournament: Tournament, idOrName: string) {
  return tournament.players.find((player) => player.id === idOrName)?.name ?? idOrName;
}

export function playerFlag(tournament: Tournament, idOrName: string) {
  return tournament.players.find((player) => player.id === idOrName)?.flag ?? '';
}

export function scoreWinner(sets: Match['sets']): 0 | 1 | null {
  let aw = 0;
  let bw = 0;
  sets.forEach(([a, b]) => {
    if (a === null || b === null || a === b) return;
    if (a > b) aw += 1;
    else bw += 1;
  });
  if (aw >= 2) return 0;
  if (bw >= 2) return 1;
  return null;
}

export function matchWinner(match: Match): 0 | 1 | null {
  if (match.pointsA !== null && match.pointsB !== null && match.pointsA !== match.pointsB) {
    return match.pointsA > match.pointsB ? 0 : 1;
  }
  return scoreWinner(match.sets);
}

export function scoreText(match: Match) {
  if (match.status !== 'played') return '-';
  if ((match.finalScore ?? '').trim()) return match.finalScore;
  if (match.pointsA !== null && match.pointsB !== null) return `${match.pointsA}-${match.pointsB}`;
  return match.sets
    .filter(([a, b]) => a !== null && b !== null)
    .map(([a, b]) => `${a}-${b}`)
    .join('  ');
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

export function groupStageMatchesFor(tournament: Tournament, group: GroupId) {
  return tournament.matches.filter((match) => match.stage === 'round-robin' && match.group === group);
}

export function groupStageMatchCount(tournament: Tournament, group: GroupId, playerId: string) {
  return groupStageMatchesFor(tournament, group).filter((match) => match.a === playerId || match.b === playerId).length;
}

export function groupStagePairExists(tournament: Tournament, group: GroupId, a: string, b: string) {
  const target = pairKey(a, b);
  return groupStageMatchesFor(tournament, group).some((match) => pairKey(match.a, match.b) === target);
}

export function roundRobinMaxMatchesForPlayer(tournament: Tournament, group: GroupId) {
  return Math.max(0, tournament.players.filter((player) => player.group === group).length - 1);
}

export function roundRobinCapacityForGroup(tournament: Tournament, group: GroupId) {
  const playerCount = tournament.players.filter((player) => player.group === group).length;
  return (playerCount * (playerCount - 1)) / 2;
}

export function totalRoundRobinCapacity(tournament: Tournament) {
  const groups = ['A', 'B', 'C', 'D'] as GroupId[];
  return groups.reduce((total, group) => total + roundRobinCapacityForGroup(tournament, group), 0);
}

export function setTotals(match: Match) {
  if (match.pointsA !== null && match.pointsB !== null) {
    return [match.pointsA, match.pointsB] as [number, number];
  }
  return match.sets.reduce<[number, number]>(
    (total, [a, b]) => [total[0] + (a ?? 0), total[1] + (b ?? 0)],
    [0, 0],
  );
}

export function standingsFor(tournament: Tournament, group: GroupId): Standing[] {
  const rows = tournament.players
    .filter((player) => player.group === group)
    .map((player) => ({ player, played: 0, won: 0, lost: 0, gf: 0, ga: 0, diff: 0 }));

  const byId = new Map(rows.map((row) => [row.player.id, row]));
  tournament.matches
    .filter((match) => match.group === group && match.status === 'played')
    .forEach((match) => {
      const a = byId.get(match.a);
      const b = byId.get(match.b);
      if (!a || !b) return;
      const winner = match.winner ?? matchWinner(match);
      const [ag, bg] = setTotals(match);
      a.played += 1;
      b.played += 1;
      a.gf += ag;
      a.ga += bg;
      b.gf += bg;
      b.ga += ag;
      if (winner === 0) {
        a.won += 1;
        b.lost += 1;
      } else if (winner === 1) {
        b.won += 1;
        a.lost += 1;
      }
    });

  rows.forEach((row) => {
    row.diff = row.gf - row.ga;
  });

  return rows.sort((x, y) => y.won - x.won || y.diff - x.diff || y.player.seed - x.player.seed);
}

export function qualifier(tournament: Tournament, code: string) {
  const match = /^([ABCD])([12])$/.exec(code);
  if (!match) return null;
  const rows = standingsFor(tournament, match[1] as GroupId);
  return rows[Number(match[2]) - 1]?.player.name ?? code;
}

export function bracketWinner(tournament: Tournament, id: string) {
  const match = tournament.matches.find((item) => item.id === id);
  if (!match || match.status !== 'played' || match.winner === null) return null;
  const resolved = resolveBracketMatch(tournament, match);
  return match.winner === 0 ? resolved.aResolved : resolved.bResolved;
}

export function resolveSlot(tournament: Tournament, slot: string) {
  if (/^[ABCD][12]$/.test(slot)) return { name: qualifier(tournament, slot) ?? slot, placeholder: false };
  const winnerId = /^Winner (QF[1-4]|SF[12])$/.exec(slot)?.[1];
  if (winnerId) {
    const winner = bracketWinner(tournament, winnerId);
    return { name: winner ?? slot, placeholder: !winner };
  }
  return { name: playerName(tournament, slot), placeholder: slot.startsWith('Winner ') };
}

export function resolveBracketMatch(tournament: Tournament, match: Match): BracketMatch {
  const a = resolveSlot(tournament, match.a);
  const b = resolveSlot(tournament, match.b);
  return {
    ...match,
    aResolved: a.name,
    bResolved: b.name,
    aPlaceholder: a.placeholder,
    bPlaceholder: b.placeholder,
  };
}

export function sanitizeTournament(input: Tournament): Tournament {
  return {
    ...defaultTournament,
    ...input,
    players: Array.isArray(input.players)
      ? input.players.map((player) => {
          const fallback = defaultTournament.players.find((item) => item.id === player.id);
          return {
            ...player,
            nationality: player.nationality || fallback?.nationality || '',
            flag: player.flag || fallback?.flag || '',
          };
        })
      : defaultTournament.players,
    matches: Array.isArray(input.matches)
      ? input.matches.map((match) => {
          const sets: Match['sets'] = Array.isArray(match.sets) ? match.sets : emptySets;
          const next = {
            ...match,
            sets,
            finalScore: match.finalScore || '',
            pointsA: match.pointsA ?? null,
            pointsB: match.pointsB ?? null,
          };
          const winner = matchWinner(next);
          return { ...next, winner, status: winner === null ? next.status : 'played' };
        })
      : defaultTournament.matches,
  };
}
