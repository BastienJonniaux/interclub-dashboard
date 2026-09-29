import { DivisionFrbe } from '../modelsFRBE';

export interface TeamStanding {
  rank: number;
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
}

export interface DivisionStandingTable {
  division: number;
  index: string;
  divisionLabel: string;
  teams: TeamStanding[];
  ourTeam?: TeamStanding;
}

/**
 * Calculates standings table for a specific division
 */
export function calculateDivisionStandings(
  division: DivisionFrbe,
  ourClubId: number
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
    });
  });

  // Calculate results from played rounds
  division.rounds.forEach((round) => {
    round.encounters.forEach((enc) => {
      if (!enc.played) return;

      const home = teamMap.get(enc.pairingnr_home);
      const visit = teamMap.get(enc.pairingnr_visit);
      if (!home || !visit) return;

      home.played += 1;
      visit.played += 1;

      home.boardPoints += enc.boardpoint2_home / 2;
      visit.boardPoints += enc.boardpoint2_visit / 2;

      home.matchPoints += enc.matchpoint_home;
      visit.matchPoints += enc.matchpoint_visit;

      if (enc.matchpoint_home === 2) {
        home.won += 1;
        visit.lost += 1;
      } else if (enc.matchpoint_home === 1 && enc.matchpoint_visit === 1) {
        home.drawn += 1;
        visit.drawn += 1;
      } else {
        home.lost += 1;
        visit.won += 1;
      }
    });
  });

  // Sort by match points (desc), then board points (desc)
  const sortedTeams = Array.from(teamMap.values()).sort(
    (a, b) => b.matchPoints - a.matchPoints || b.boardPoints - a.boardPoints
  );

  // Assign ranks
  sortedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  const ourTeam = sortedTeams.find((t) => t.isOurClub);

  return {
    division: division.division,
    index: division.index,
    divisionLabel: `Division ${division.division}${division.index}`,
    teams: sortedTeams,
    ourTeam,
  };
}
