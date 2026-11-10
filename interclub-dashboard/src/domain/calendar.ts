import { DivisionFrbe } from '../modelsFRBE';
import { DivisionStandingTable } from './standings';
import {
  ROUND_DATES,
  DIVISION_SIX_DATES,
  PAIRINGS_12,
  PAIRINGS_10,
  PAIRINGS_6J,
} from '../season';
import { getBoardCountForDivision } from './scouting';

export interface FrenchClashInfo {
  hasClash: boolean;
  frenchRound?: number;
  description?: string;
}

/**
 * French Interclub Dates (N1 to N4 FFE) for season 2026-2027
 */
export const FRENCH_INTERCLUB_DATES: Record<string, number> = {
  '2026-10-11': 1, // Ronde 1 FFE
  '2026-11-08': 2, // Ronde 2 FFE
  '2026-11-29': 3, // Ronde 3 FFE
  '2026-12-13': 4, // Ronde 4 FFE
  '2027-01-17': 5, // Ronde 5 FFE
  '2027-01-31': 6, // Ronde 6 FFE
};

export function getFrenchClash(dateStr: string): FrenchClashInfo {
  const frenchRound = FRENCH_INTERCLUB_DATES[dateStr];
  if (frenchRound !== undefined) {
    return {
      hasClash: true,
      frenchRound,
      description: `Conflit avec la Ronde ${frenchRound} des Interclubs Français (N1 à N4). Risque d'absence des joueurs binationaux / frontaliers.`,
    };
  }
  return { hasClash: false };
}

/**
 * Returns the round number of the upcoming (or current unplayed) round based on today's date.
 */
export function getUpcomingRoundNumber(now: Date = new Date()): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(now);
  for (let r = 1; r <= ROUND_DATES.length; r++) {
    const date = ROUND_DATES[r - 1];
    if (date >= today) {
      return r;
    }
  }
  return ROUND_DATES.length;
}

export interface OpponentRecentMatch {
  round: number;
  opponentName: string;
  ourScore: number;
  oppScore: number;
  outcome: 'win' | 'draw' | 'loss';
}

export interface TeamRoundMatchup {
  teamName: string;
  divisionNumber: number;
  divisionIndex: string;
  divisionLabel: string;
  pairingNumber: number;
  opponentPairingNumber: number;
  opponentTeamName: string;
  opponentClubId: number;
  isHome: boolean;
  boardCount: number;
  isBye: boolean;
  played: boolean;
  ourScore?: number;
  oppScore?: number;
  matchOutcome?: 'win' | 'draw' | 'loss';
  // Opponent scouting preview on hover
  opponentStats?: {
    rank?: number;
    totalTeams?: number;
    matchPoints?: number;
    boardPoints?: number;
    averageElo?: number;
    recentResults?: OpponentRecentMatch[];
  };
}

export interface InterclubRoundSchedule {
  roundNumber: number;
  dateStr: string;
  formattedDate: string;
  shortDate: string;
  status: 'past' | 'current' | 'future';
  frenchClash: FrenchClashInfo;
  matchups: TeamRoundMatchup[];
}

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const DAY_NAMES_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

export function formatDateFrench(dateStr: string): { full: string; short: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = DAY_NAMES_FR[date.getDay()];
  const monthName = MONTH_NAMES_FR[month - 1];

  const full = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${monthName} ${year}`;
  const short = `${day} ${monthName.slice(0, 4)}.`;

  return { full, short };
}

/**
 * Extracts complete 11-round schedule for all club teams,
 * cross-referenced with French FFE dates and opponent scouts.
 */
export function extractFullSeasonSchedule(
  allDivisions: DivisionFrbe[],
  clubId: number,
  standingsList: DivisionStandingTable[] = [],
  playerDirectory?: Map<number, { name: string; rating: number; clubName?: string }>
): InterclubRoundSchedule[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());

  // Determine current next unplayed round
  const currentNextRound = getUpcomingRoundNumber();

  const schedule: InterclubRoundSchedule[] = [];

  for (let r = 1; r <= ROUND_DATES.length; r++) {
    const dateStr = ROUND_DATES[r - 1];
    const { full: formattedDate, short: shortDate } = formatDateFrench(dateStr);
    const frenchClash = getFrenchClash(dateStr);

    let status: 'past' | 'current' | 'future' = 'future';
    if (r < currentNextRound || dateStr < today) {
      status = 'past';
    } else if (r === currentNextRound) {
      status = 'current';
    }

    const matchups: TeamRoundMatchup[] = [];

    // Find all our club teams in all divisions
    allDivisions.forEach((division) => {
      const ourTeam = division.teams.find((t) => t.idclub === clubId);
      if (!ourTeam) return;

      const boardCount = getBoardCountForDivision(division.division);
      const pairings =
        division.division === 6
          ? division.index === 'J'
            ? PAIRINGS_6J
            : PAIRINGS_10
          : PAIRINGS_12;

      // Division 6 might have different rounds/dates
      const divisionRoundNumber = division.division === 6 && division.index !== 'J' ? r : r;
      const roundMatchups = pairings[divisionRoundNumber - 1] || [];

      let opponentPairingNr: number | null = null;
      let isHome = true;

      for (const matchup of roundMatchups) {
        const [homeNr, awayNr] = matchup.split('-').map(Number);
        if (homeNr === ourTeam.pairingnumber) {
          opponentPairingNr = awayNr;
          isHome = true;
          break;
        } else if (awayNr === ourTeam.pairingnumber) {
          opponentPairingNr = homeNr;
          isHome = false;
          break;
        }
      }

      if (opponentPairingNr === null) return;

      const opponentTeam = division.teams.find((t) => t.pairingnumber === opponentPairingNr);
      const opponentClubId = opponentTeam?.idclub || 0;
      const opponentTeamName = opponentTeam?.name || `Équipe #${opponentPairingNr}`;
      const isBye = opponentClubId === 0 || opponentTeamName.toUpperCase().includes('BYE');

      // Check if match was already played
      const roundData = division.rounds?.find((rd) => rd.round === r);
      const encounter = roundData?.encounters.find(
        (e) =>
          e.pairingnr_home === ourTeam.pairingnumber || e.pairingnr_visit === ourTeam.pairingnumber
      );

      let played = false;
      let ourScore: number | undefined;
      let oppScore: number | undefined;
      let matchOutcome: 'win' | 'draw' | 'loss' | undefined;

      if (encounter && encounter.played) {
        played = true;
        const weAreHome = encounter.pairingnr_home === ourTeam.pairingnumber;
        ourScore = (weAreHome ? encounter.boardpoint2_home : encounter.boardpoint2_visit) / 2;
        oppScore = (weAreHome ? encounter.boardpoint2_visit : encounter.boardpoint2_home) / 2;

        if (ourScore > oppScore) matchOutcome = 'win';
        else if (ourScore === oppScore) matchOutcome = 'draw';
        else matchOutcome = 'loss';
      }

      // Find opponent standing & stats in this division
      const divStanding = standingsList.find(
        (s) => s.division === division.division && (s.index || 'A') === (division.index || 'A')
      );
      const oppStandingRow = divStanding?.teams.find((t) => t.clubId === opponentClubId);

      // Collect opponent's recent matches in played rounds of this division
      const recentResults: OpponentRecentMatch[] = [];
      let totalOppElo = 0;
      let eloCount = 0;

      if (division.rounds) {
        division.rounds.forEach((rd) => {
          const oppEnc = rd.encounters.find(
            (e) =>
              e.played &&
              (e.pairingnr_home === opponentPairingNr || e.pairingnr_visit === opponentPairingNr)
          );

          if (oppEnc && oppEnc.games && oppEnc.games.length > 0) {
            const oppIsHome = oppEnc.pairingnr_home === opponentPairingNr;
            const otherPairing = oppIsHome ? oppEnc.pairingnr_visit : oppEnc.pairingnr_home;
            const otherTeam = division.teams.find((t) => t.pairingnumber === otherPairing);

            const teamScore = (oppIsHome ? oppEnc.boardpoint2_home : oppEnc.boardpoint2_visit) / 2;
            const otherScore = (oppIsHome ? oppEnc.boardpoint2_visit : oppEnc.boardpoint2_home) / 2;

            let outcome: 'win' | 'draw' | 'loss' = 'draw';
            if (teamScore > otherScore) outcome = 'win';
            else if (teamScore < otherScore) outcome = 'loss';

            recentResults.push({
              round: rd.round,
              opponentName: otherTeam?.name || `Équipe #${otherPairing}`,
              ourScore: teamScore,
              oppScore: otherScore,
              outcome,
            });

            // Sample opponent players ratings
            oppEnc.games.forEach((g) => {
              const pid = oppIsHome ? g.idnumber_home : g.idnumber_visit;
              if (pid && playerDirectory?.has(Number(pid))) {
                const pInfo = playerDirectory.get(Number(pid));
                if (pInfo?.rating) {
                  totalOppElo += pInfo.rating;
                  eloCount++;
                }
              }
            });
          }
        });
      }

      const averageElo = eloCount > 0 ? Math.round(totalOppElo / eloCount) : undefined;

      matchups.push({
        teamName: ourTeam.name,
        divisionNumber: division.division,
        divisionIndex: division.index || 'A',
        divisionLabel: `Division ${division.division}${division.index || ''}`,
        pairingNumber: ourTeam.pairingnumber,
        opponentPairingNumber: opponentPairingNr,
        opponentTeamName,
        opponentClubId,
        isHome,
        boardCount,
        isBye,
        played,
        ourScore,
        oppScore,
        matchOutcome,
        opponentStats: {
          rank: oppStandingRow?.rank,
          totalTeams: divStanding?.teams.length,
          matchPoints: oppStandingRow?.matchPoints,
          boardPoints: oppStandingRow?.boardPoints,
          averageElo,
          recentResults: recentResults.sort((a, b) => b.round - a.round),
        },
      });
    });

    schedule.push({
      roundNumber: r,
      dateStr,
      formattedDate,
      shortDate,
      status,
      frenchClash,
      matchups: matchups.sort((a, b) => a.divisionNumber - b.divisionNumber),
    });
  }

  return schedule;
}
