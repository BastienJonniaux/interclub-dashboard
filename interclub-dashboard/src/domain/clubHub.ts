import { PlayerStats, PlayerGameDetail } from './performance';
import { LatestTeamMatch } from './matches';

export interface GiantKillerExploit {
  playerId: number;
  playerName: string;
  playerRating: number;
  opponentName: string;
  opponentRating: number;
  ratingDiff: number; // opponentRating - playerRating
  score: number; // 1 = Win, 0.5 = Draw
  isWin: boolean;
  round: number;
  division: string;
  board: number;
  color: 'white' | 'black';
  resultString: string;
}

export interface ClubRoundSummary {
  round: number;
  wins: number;
  draws: number;
  losses: number;
  boardPointsWon: number;
  totalBoardPointsPossible: number;
  teamsCount: number;
}

/**
 * Format numeric score with chess half symbol (e.g., 3.5 -> "3½", 0.5 -> "½")
 */
export function formatChessScore(score: number): string {
  if (score % 1 === 0.5) {
    const whole = Math.floor(score);
    return whole === 0 ? '½' : `${whole}½`;
  }
  return score.toString();
}

/**
 * Find all matches where a club player beat or drew a significantly stronger opponent.
 * Sorted by biggest rating difference first.
 */
export function extractGiantKillers(players: PlayerStats[]): GiantKillerExploit[] {
  const exploits: GiantKillerExploit[] = [];

  players.forEach((p) => {
    p.games.forEach((g: PlayerGameDetail) => {
      // Must have known opponent rating and player rating
      if (!g.opponentRating || !p.rating) return;

      const diff = g.opponentRating - p.rating;

      // Victory against a higher rated opponent
      if (g.score === 1 && diff > 0) {
        exploits.push({
          playerId: p.id,
          playerName: p.fullName,
          playerRating: p.rating,
          opponentName: g.opponentName || 'Adversaire',
          opponentRating: g.opponentRating,
          ratingDiff: diff,
          score: 1,
          isWin: true,
          round: g.round,
          division: g.division,
          board: g.board,
          color: g.color || 'white',
          resultString: g.resultString || '1-0',
        });
      }
      // Or an impressive draw against an opponent rated at least 150 points higher
      else if (g.score === 0.5 && diff >= 150) {
        exploits.push({
          playerId: p.id,
          playerName: p.fullName,
          playerRating: p.rating,
          opponentName: g.opponentName || 'Adversaire',
          opponentRating: g.opponentRating,
          ratingDiff: diff,
          score: 0.5,
          isWin: false,
          round: g.round,
          division: g.division,
          board: g.board,
          color: g.color || 'black',
          resultString: g.resultString || '½-½',
        });
      }
    });
  });

  // Sort by rating difference descending
  return exploits.sort((a, b) => b.ratingDiff - a.ratingDiff);
}

/**
 * Find top point scorers for the club (absolute points brought to the club)
 */
export function extractTopScorers(players: PlayerStats[]): PlayerStats[] {
  return [...players]
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => b.score - a.score || (b.score / b.gamesPlayed) - (a.score / a.gamesPlayed))
    .slice(0, 5);
}

/**
 * Find top tournament performance performers (players outperforming their rating)
 */
export function extractTopPerformers(players: PlayerStats[]): PlayerStats[] {
  return [...players]
    .filter((p) => p.gamesPlayed >= 2 && p.tpr > 0 && p.diff > 0)
    .sort((a, b) => b.diff - a.diff || b.tpr - a.tpr)
    .slice(0, 5);
}

/**
 * Summarize latest round club results across all teams
 */
export function extractClubRoundSummary(latestMatches: LatestTeamMatch[]): ClubRoundSummary | null {
  if (!latestMatches || latestMatches.length === 0) return null;

  const latestRound = Math.max(...latestMatches.map((m) => m.roundNumber));
  const roundMatches = latestMatches.filter((m) => m.roundNumber === latestRound);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let boardPointsWon = 0;
  let totalBoardPointsPossible = 0;

  roundMatches.forEach((m) => {
    boardPointsWon += m.ourScore;
    totalBoardPointsPossible += m.boardCount;

    if (m.matchOutcome === 'win') {
      wins++;
    } else if (m.matchOutcome === 'draw') {
      draws++;
    } else {
      losses++;
    }
  });

  return {
    round: latestRound,
    wins,
    draws,
    losses,
    boardPointsWon,
    totalBoardPointsPossible,
    teamsCount: roundMatches.length,
  };
}
