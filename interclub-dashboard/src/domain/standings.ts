import { DivisionFrbe } from '../modelsFRBE';

export interface TeamMatchHistory {
  round: number;
  opponentTeamName: string;
  opponentPairingNumber: number;
  isHome: boolean;
  teamScore: number;
  oppScore: number;
  matchOutcome: 'win' | 'draw' | 'loss';
  matchPoints: number;
  teamAvgElo: number;
  oppAvgElo: number;
}

export interface TeamStanding {
  rank: number;
  previousRank?: number;
  rankDiff?: number;
  clubId: number;
  teamName: string;
  pairingNumber: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  matchPoints: number;
  boardPoints: number;
  isOurClub: boolean;
  matchHistory: TeamMatchHistory[];
  seasonAvgElo: number;
  seasonOppAvgElo: number;
}

export interface DivisionStandingTable {
  division: number;
  index: string;
  divisionLabel: string;
  teams: TeamStanding[];
  ourTeam?: TeamStanding;
}

/**
 * Returns distinct styling for each national division badge
 */
export function getDivisionBadgeStyle(division: number): string {
  switch (division) {
    case 1:
      return 'bg-amber-500 text-white border border-amber-600 shadow-xs'; // Div 1: Gold / Amber
    case 2:
      return 'bg-indigo-600 text-white border border-indigo-700 shadow-xs'; // Div 2: Royal Indigo
    case 3:
      return 'bg-emerald-600 text-white border border-emerald-700 shadow-xs'; // Div 3: Forest Green
    case 4:
      return 'bg-orange-600 text-white border border-orange-700 shadow-xs'; // Div 4: Terracotta / Orange
    case 5:
      return 'bg-teal-600 text-white border border-teal-700 shadow-xs'; // Div 5: Teal
    case 6:
      return 'bg-rose-700 text-white border border-rose-800 shadow-xs'; // Div 6: Burgundy
    default:
      return 'bg-slate-800 text-white border border-slate-900 shadow-xs';
  }
}

/**
 * Calculates standings table for a specific division with full match-by-match history & Elos
 */
export function calculateDivisionStandings(
  division: DivisionFrbe,
  ourClubId: number,
  playerDirectory?: Map<number, { name: string; rating: number; clubName?: string }>
): DivisionStandingTable {
  const teamMap = new Map<number, TeamStanding>();

  // Initialize from division teams
  division.teams.forEach((t) => {
    teamMap.set(t.pairingnumber, {
      rank: 0,
      clubId: t.idclub,
      teamName: t.name,
      pairingNumber: t.pairingnumber,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      matchPoints: 0,
      boardPoints: 0,
      isOurClub: t.idclub === ourClubId,
      matchHistory: [],
      seasonAvgElo: 0,
      seasonOppAvgElo: 0,
    });
  });

  // Calculate results from played rounds
  division.rounds.forEach((round) => {
    round.encounters.forEach((enc) => {
      if (!enc.played) return;

      const home = teamMap.get(enc.pairingnr_home);
      const visit = teamMap.get(enc.pairingnr_visit);
      if (!home || !visit) return;

      const homeScore = (enc.boardpoint2_home || 0) / 2;
      const visitScore = (enc.boardpoint2_visit || 0) / 2;

      home.played += 1;
      visit.played += 1;

      home.boardPoints += homeScore;
      visit.boardPoints += visitScore;

      home.matchPoints += enc.matchpoint_home;
      visit.matchPoints += enc.matchpoint_visit;

      const homeOutcome: 'win' | 'draw' | 'loss' =
        homeScore > visitScore ? 'win' : homeScore === visitScore ? 'draw' : 'loss';
      const visitOutcome: 'win' | 'draw' | 'loss' =
        visitScore > homeScore ? 'win' : homeScore === visitScore ? 'draw' : 'loss';

      if (homeOutcome === 'win') {
        home.won += 1;
        visit.lost += 1;
      } else if (homeOutcome === 'draw') {
        home.drawn += 1;
        visit.drawn += 1;
      } else {
        home.lost += 1;
        visit.won += 1;
      }

      // Calculate team average Elo for this encounter
      let homeAvgElo = 0;
      let visitAvgElo = 0;

      if (enc.games && enc.games.length > 0 && playerDirectory) {
        const homeRatings: number[] = [];
        const visitRatings: number[] = [];

        enc.games.forEach((g) => {
          const homePid = Number(g.idnumber_home);
          const visitPid = Number(g.idnumber_visit);

          if (homePid) {
            const rating = playerDirectory.get(homePid)?.rating || 0;
            if (rating > 0) homeRatings.push(rating);
          }

          if (visitPid) {
            const rating = playerDirectory.get(visitPid)?.rating || 0;
            if (rating > 0) visitRatings.push(rating);
          }
        });

        if (homeRatings.length > 0) {
          homeAvgElo = Math.round(homeRatings.reduce((a, b) => a + b, 0) / homeRatings.length);
        }
        if (visitRatings.length > 0) {
          visitAvgElo = Math.round(visitRatings.reduce((a, b) => a + b, 0) / visitRatings.length);
        }
      }

      home.matchHistory.push({
        round: round.round,
        opponentTeamName: visit.teamName,
        opponentPairingNumber: visit.pairingNumber,
        isHome: true,
        teamScore: homeScore,
        oppScore: visitScore,
        matchOutcome: homeOutcome,
        matchPoints: enc.matchpoint_home,
        teamAvgElo: homeAvgElo,
        oppAvgElo: visitAvgElo,
      });

      visit.matchHistory.push({
        round: round.round,
        opponentTeamName: home.teamName,
        opponentPairingNumber: home.pairingNumber,
        isHome: false,
        teamScore: visitScore,
        oppScore: homeScore,
        matchOutcome: visitOutcome,
        matchPoints: enc.matchpoint_visit,
        teamAvgElo: visitAvgElo,
        oppAvgElo: homeAvgElo,
      });
    });
  });

  // Calculate season average Elos for each team and sort history
  teamMap.forEach((team) => {
    team.matchHistory.sort((a, b) => a.round - b.round);

    const validTeamElos = team.matchHistory
      .map((m) => m.teamAvgElo)
      .filter((elo) => elo > 0);
    const validOppElos = team.matchHistory
      .map((m) => m.oppAvgElo)
      .filter((elo) => elo > 0);

    team.seasonAvgElo =
      validTeamElos.length > 0
        ? Math.round(validTeamElos.reduce((a, b) => a + b, 0) / validTeamElos.length)
        : 0;

    team.seasonOppAvgElo =
      validOppElos.length > 0
        ? Math.round(validOppElos.reduce((a, b) => a + b, 0) / validOppElos.length)
        : 0;
  });

  // Sort by match points (desc), then board points (desc)
  const sortedTeams = Array.from(teamMap.values()).sort(
    (a, b) => b.matchPoints - a.matchPoints || b.boardPoints - a.boardPoints
  );

  // Assign ranks
  sortedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  // Calculate previous rank and rank progression (if at least round 2 has been reached)
  const maxRoundPlayed = Math.max(
    0,
    ...sortedTeams.flatMap((t) => t.matchHistory.map((m) => m.round))
  );

  if (maxRoundPlayed >= 2) {
    const teamsWithPrevScores = sortedTeams.map((team) => {
      const lastMatch = team.matchHistory.find((m) => m.round === maxRoundPlayed);
      const prevMatchPoints = team.matchPoints - (lastMatch ? lastMatch.matchPoints : 0);
      const prevBoardPoints = team.boardPoints - (lastMatch ? lastMatch.teamScore : 0);
      return { team, prevMatchPoints, prevBoardPoints };
    });

    teamsWithPrevScores.sort(
      (a, b) => b.prevMatchPoints - a.prevMatchPoints || b.prevBoardPoints - a.prevBoardPoints
    );

    teamsWithPrevScores.forEach((item, index) => {
      const prevRank = index + 1;
      item.team.previousRank = prevRank;
      // Positive diff means gained positions (e.g. was 4, now 2 => diff is +2)
      item.team.rankDiff = prevRank - item.team.rank;
    });
  } else {
    sortedTeams.forEach((team) => {
      team.previousRank = team.rank;
      team.rankDiff = 0;
    });
  }

  const ourTeam = sortedTeams.find((t) => t.isOurClub);

  return {
    division: division.division,
    index: division.index,
    divisionLabel: `Division ${division.division}${division.index}`,
    teams: sortedTeams,
    ourTeam,
  };
}
