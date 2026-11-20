export interface RuleViolation {
  teamNumber?: number;
  board?: number;
  type: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  violations: RuleViolation[];
}

export const RESERVE_ELO_LIMITS: Record<number, number> = {
  1: 2350,
  2: 2200,
  3: 2050,
  4: 1950,
  5: 1800,
  6: 1700,
};

export function parseDivisionFromLabel(label?: string | null): number {
  if (!label) return 4;
  const match = label.match(/(\d+)/);
  if (match) {
    const div = parseInt(match[1], 10);
    if (div >= 1 && div <= 6) return div;
  }
  return 4;
}

export function getRequiredBoardCount(division: number): number {
  if (division === 1 || division === 2) return 8;
  if (division === 3) return 6;
  return 4; // Div 4, 5, 6
}

export interface TeamDraftPayload {
  divisionLabel?: string;
  boards: Array<{
    board: number;
    playerId: number;
    playerName?: string;
    playerRating?: number;
    titular?: string;
  }>;
}

/**
 * Validates FRBE regulations across all teams of a round
 */
export function validateRoundDrafts(
  drafts: Record<number | string, TeamDraftPayload>
): ValidationSummary {
  const violations: RuleViolation[] = [];
  const teamAverages = new Map<number, { avg: number; div: number }>();

  // 1. Team-by-team validation
  for (const [teamKey, teamData] of Object.entries(drafts)) {
    const teamNumber = parseInt(teamKey, 10);
    if (isNaN(teamNumber)) continue;

    const divNumber = parseDivisionFromLabel(teamData.divisionLabel);
    const requiredBoards = getRequiredBoardCount(divNumber);
    const boards = teamData.boards || [];

    // Completeness Check
    if (boards.length < requiredBoards) {
      violations.push({
        teamNumber,
        type: 'warning',
        rule: 'COMPOSITION_INCOMPLETE',
        message: `Équipe ${teamNumber} (Div ${divNumber}) incomplète : ${boards.length}/${requiredBoards} échiquiers assignés.`,
      });
    }

    // Check board numbers within range
    for (const b of boards) {
      if (b.board > requiredBoards) {
        violations.push({
          teamNumber,
          board: b.board,
          type: 'error',
          rule: 'BOARD_OUT_OF_RANGE',
          message: `Équipe ${teamNumber} (Div ${divNumber}) : l'échiquier ${b.board} dépasse la limite de la division (${requiredBoards}).`,
        });
      }

      // Titular playing down check (if player.titular is provided)
      if (b.titular) {
        const match = b.titular.match(/(\d+)/);
        if (match) {
          const titularTeam = parseInt(match[1], 10);
          if (titularTeam < teamNumber) {
            violations.push({
              teamNumber,
              board: b.board,
              type: 'error',
              rule: 'TITULAR_PLAYING_DOWN',
              message: `Règlement FRBE : le joueur ${b.playerName || b.playerId} est titulaire en équipe ${titularTeam} et ne peut pas descendre en équipe ${teamNumber}.`,
            });
          }
        }
      }

      // Reserve Elo limit check
      const rating = b.playerRating || 0;
      if (rating > 0) {
        const maxElo = RESERVE_ELO_LIMITS[divNumber] || 9999;
        // Check if player is titular of this team
        const isTitularOfThisTeam = b.titular ? parseInt(b.titular.match(/(\d+)/)?.[1] || '0', 10) === teamNumber : false;
        if (!isTitularOfThisTeam && rating > maxElo) {
          violations.push({
            teamNumber,
            board: b.board,
            type: 'error',
            rule: 'RESERVE_ELO_LIMIT',
            message: `Règlement FRBE : en division ${divNumber}, un réserviste ne peut pas dépasser ${maxElo} Elo (${b.playerName || b.playerId} a ${rating} Elo).`,
          });
        }
      }

      // Division 1 specific constraints
      if (divNumber === 1 && rating > 0) {
        if (rating < 1800) {
          violations.push({
            teamNumber,
            board: b.board,
            type: 'error',
            rule: 'DIV1_MIN_ELO',
            message: `Règlement FRBE Div 1 : joueur sous 1800 Elo non autorisé (${b.playerName || b.playerId} a ${rating} Elo).`,
          });
        }
        if (b.board <= 4 && rating < 2000) {
          violations.push({
            teamNumber,
            board: b.board,
            type: 'error',
            rule: 'DIV1_TOP4_MIN_ELO',
            message: `Règlement FRBE Div 1 : les 4 premiers échiquiers doivent avoir au moins 2000 Elo (${b.playerName || b.playerId} a ${rating} Elo).`,
          });
        }
      }
    }

    // Board Order Constraint
    if (boards.length > 1) {
      const sortedByRating = [...boards].sort((a, b) => (b.playerRating || 0) - (a.playerRating || 0));
      let maxDiff = 1;
      if (divNumber === 1 || divNumber === 2) maxDiff = 3;
      if (divNumber === 3) maxDiff = 2;

      boards.forEach((b, currentIndex) => {
        const theoreticalIndex = sortedByRating.findIndex((s) => s.playerId === b.playerId);
        if (theoreticalIndex !== -1) {
          const diff = Math.abs(currentIndex - theoreticalIndex);
          if (diff > maxDiff) {
            violations.push({
              teamNumber,
              board: b.board,
              type: 'error',
              rule: 'BOARD_ORDER_VIOLATION',
              message: `Équipe ${teamNumber} : ${b.playerName || b.playerId} (${b.playerRating || 0} Elo) est décalé de ${diff} places par rapport à son classement dans l'équipe (Tolérance max : ${maxDiff}).`,
            });
          }
        }
      });
    }

    // Track team average
    if (boards.length > 0) {
      const totalRating = boards.reduce((sum, b) => sum + (b.playerRating || 0), 0);
      const avg = Math.round(totalRating / boards.length);
      teamAverages.set(teamNumber, { avg, div: divNumber });
    }
  }

  // 2. Cross-team averages comparison
  const teamNumbers = Array.from(teamAverages.keys()).sort((a, b) => a - b);
  for (let i = 0; i < teamNumbers.length; i++) {
    for (let j = i + 1; j < teamNumbers.length; j++) {
      const t1Num = teamNumbers[i];
      const t2Num = teamNumbers[j];
      const t1 = teamAverages.get(t1Num)!;
      const t2 = teamAverages.get(t2Num)!;

      // Exempt: both teams in Div >= 4
      if (t1.div >= 4 && t2.div >= 4) {
        continue;
      }

      if (t1.avg < t2.avg) {
        violations.push({
          teamNumber: t1Num,
          type: 'error',
          rule: 'CROSS_TEAM_AVG',
          message: `Règle de moyenne FRBE : l'équipe ${t1Num} (moy. ${t1.avg}) a une moyenne inférieure à l'équipe ${t2Num} (moy. ${t2.avg}).`,
        });
      }
    }
  }

  const hasErrors = violations.some((v) => v.type === 'error');
  const hasWarnings = violations.some((v) => v.type === 'warning');

  return {
    isValid: !hasErrors,
    hasErrors,
    hasWarnings,
    violations,
  };
}
