import { PlayerFrbe } from '../../modelsFRBE';
import { getBoardCountForDivision } from '../scouting';

export interface AssignedBoard {
  board: number;
  player: PlayerFrbe | null;
}

export interface RuleViolation {
  board?: number;
  type: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface TeamCompositionValidation {
  isValid: boolean;
  hasWarnings: boolean;
  violations: RuleViolation[];
  averageElo: number;
  totalBoards: number;
  assignedCount: number;
}

/**
 * Validates a team composition against official FRBE regulations
 * @param teamNumber Number of the team (1 for Team 1, 2 for Team 2, etc.)
 * @param divisionNumber Division number (1 to 6)
 * @param boards Array of board assignments
 */
export function validateTeamComposition(
  teamNumber: number,
  divisionNumber: number,
  boards: AssignedBoard[]
): TeamCompositionValidation {
  const violations: RuleViolation[] = [];
  const requiredBoards = getBoardCountForDivision(divisionNumber);

  // Filter filled boards
  const assigned = boards.filter((b) => b.player !== null);
  const totalRating = assigned.reduce((sum, b) => sum + (b.player?.assignedrating || 0), 0);
  const averageElo = assigned.length > 0 ? Math.round(totalRating / assigned.length) : 0;

  // 1. Completeness Check
  if (assigned.length < requiredBoards) {
    violations.push({
      type: 'warning',
      rule: 'COMPOSITION_INCOMPLETE',
      message: `Composition incomplète : ${assigned.length}/${requiredBoards} échiquiers assignés.`,
    });
  }

  // 2. No duplicate players in the same team
  const seenPlayerIds = new Set<number>();
  boards.forEach((b) => {
    if (!b.player) return;
    if (seenPlayerIds.has(b.player.idnumber)) {
      violations.push({
        board: b.board,
        type: 'error',
        rule: 'DUPLICATE_PLAYER',
        message: `Le joueur ${b.player.first_name} ${b.player.last_name} est assigné sur plusieurs échiquiers.`,
      });
    }
    seenPlayerIds.add(b.player.idnumber);
  });

  // 3. Titular Rule (Playing down is forbidden)
  boards.forEach((b) => {
    if (!b.player) return;
    const titularStr = b.player.titular || '';
    const titularMatch = titularStr.match(/(\d+)$/);
    if (titularMatch) {
      const titularTeamNumber = parseInt(titularMatch[1], 10);
      if (titularTeamNumber < teamNumber) {
        violations.push({
          board: b.board,
          type: 'error',
          rule: 'TITULAR_PLAYING_DOWN',
          message: `Interdit FRBE : ${b.player.first_name} ${b.player.last_name} est titulaire en équipe ${titularTeamNumber} et ne peut pas jouer en équipe ${teamNumber}.`,
        });
      }
    }
  });

  // 4. Elo Order Rule (Descending rating with allowed inversion tolerance)
  // FRBE allows an Elo difference margin (generally max 100 Elo points inversion)
  const MAX_INVERSION_TOLERANCE = 100;

  for (let i = 0; i < boards.length - 1; i++) {
    const higherBoard = boards[i];
    const lowerBoard = boards[i + 1];

    if (!higherBoard.player || !lowerBoard.player) continue;

    const higherElo = higherBoard.player.assignedrating || 0;
    const lowerElo = lowerBoard.player.assignedrating || 0;

    if (lowerElo > higherElo) {
      const diff = lowerElo - higherElo;
      if (diff > MAX_INVERSION_TOLERANCE) {
        violations.push({
          board: lowerBoard.board,
          type: 'error',
          rule: 'ELO_ORDER_VIOLATION',
          message: `Ordre Elo invalide : Éch. ${lowerBoard.board} (${lowerElo}) dépasse Éch. ${higherBoard.board} (${higherElo}) de ${diff} Elo (> ${MAX_INVERSION_TOLERANCE} pts).`,
        });
      } else {
        violations.push({
          board: lowerBoard.board,
          type: 'warning',
          rule: 'ELO_INVERSION_TOLERATED',
          message: `Inversion Elo tolérée : Éch. ${lowerBoard.board} (${lowerElo}) > Éch. ${higherBoard.board} (${higherElo}) (+${diff} pts).`,
        });
      }
    }
  }

  const hasErrors = violations.some((v) => v.type === 'error');
  const hasWarnings = violations.some((v) => v.type === 'warning');

  return {
    isValid: !hasErrors,
    hasWarnings,
    violations,
    averageElo,
    totalBoards: requiredBoards,
    assignedCount: assigned.length,
  };
}
