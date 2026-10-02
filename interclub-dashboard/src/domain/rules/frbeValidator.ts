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

const RESERVE_ELO_LIMITS: Record<number, number> = {
  1: 2350,
  2: 2200,
  3: 2050,
  4: 1950,
  5: 1800,
  6: 1700,
};

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

  // 2. Duplicate Player & Titular Playing Down Check
  const seenPlayerIds = new Set<number>();
  
  boards.forEach((b) => {
    if (!b.player) return;
    
    // Duplicates
    if (seenPlayerIds.has(b.player.idnumber)) {
      violations.push({
        board: b.board,
        type: 'error',
        rule: 'DUPLICATE_PLAYER',
        message: `Le joueur ${b.player.first_name} ${b.player.last_name} est assigné sur plusieurs échiquiers.`,
      });
    }
    seenPlayerIds.add(b.player.idnumber);

    // Titular playing down
    const titularStr = b.player.titular || '';
    const titularMatch = titularStr.match(/(\d+)/); // Extracts "1", "2" from "1", "2A", etc.
    let titularTeam = 0;
    
    if (titularMatch) {
      titularTeam = parseInt(titularMatch[1], 10);
      if (titularTeam < teamNumber) {
        violations.push({
          board: b.board,
          type: 'error',
          rule: 'TITULAR_PLAYING_DOWN',
          message: `Règlement FRBE : ${b.player.first_name} ${b.player.last_name} est titulaire en équipe ${titularTeam} et ne peut pas descendre en équipe ${teamNumber}.`,
        });
      }
    }

    // Reserve Elo Limit Check
    const isReserve = titularTeam !== teamNumber;
    if (isReserve) {
      const maxElo = RESERVE_ELO_LIMITS[divisionNumber] || 9999;
      if ((b.player.assignedrating || 0) > maxElo) {
        violations.push({
          board: b.board,
          type: 'error',
          rule: 'RESERVE_ELO_LIMIT',
          message: `Règlement FRBE : En division ${divisionNumber}, un réserviste ne peut pas dépasser ${maxElo} Elo (${b.player.first_name} a ${b.player.assignedrating}).`,
        });
      }
    }

    // Div 1 Specific Rules
    if (divisionNumber === 1) {
      if ((b.player.assignedrating || 0) < 1800) {
        violations.push({
          board: b.board,
          type: 'error',
          rule: 'DIV1_MIN_ELO',
          message: `Règlement FRBE Div 1 : Impossible d'aligner un joueur sous 1800 Elo (${b.player.first_name} a ${b.player.assignedrating || 'NC'}).`,
        });
      }
      if (b.board <= 4 && (b.player.assignedrating || 0) < 2000) {
        violations.push({
          board: b.board,
          type: 'error',
          rule: 'DIV1_TOP4_MIN_ELO',
          message: `Règlement FRBE Div 1 : Les 4 premiers échiquiers doivent avoir au moins 2000 Elo (${b.player.first_name} a ${b.player.assignedrating || 'NC'}).`,
        });
      }
    }
  });

  // 3. Board Order Constraint (Elo List Order)
  // Get all assigned players and sort them theoretically by rating descending
  if (assigned.length > 0) {
    const theoreticalOrder = [...assigned].sort((a, b) => {
      const ratingA = a.player?.assignedrating || 0;
      const ratingB = b.player?.assignedrating || 0;
      // In case of tie, we use alphabetical order to be deterministic, 
      // but strictly speaking, FRBE index is predefined. We approximate via rating.
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (a.player?.last_name || '').localeCompare(b.player?.last_name || '');
    });

    let maxDiff = 1; // Div 4, 5, 6
    if (divisionNumber === 1 || divisionNumber === 2) maxDiff = 3;
    if (divisionNumber === 3) maxDiff = 2;

    assigned.forEach((actualBoard, currentLineupIndex) => {
      if (!actualBoard.player) return;
      
      // Find where this player SHOULD be in the theoretical lineup
      const theoreticalIndex = theoreticalOrder.findIndex((t) => t.player?.idnumber === actualBoard.player?.idnumber);
      
      if (theoreticalIndex !== -1) {
        // Compare the relative positions within the assigned players array
        // (Index in the array is effectively their board number among present players)
        const diff = Math.abs(currentLineupIndex - theoreticalIndex);
        
        if (diff > maxDiff) {
          violations.push({
            board: actualBoard.board,
            type: 'error',
            rule: 'BOARD_ORDER_VIOLATION',
            message: `Ordre invalide : ${actualBoard.player.first_name} ${actualBoard.player.last_name} (${actualBoard.player.assignedrating} Elo) est décalé de ${diff} places par rapport à son classement dans l'équipe (Max toléré: ${maxDiff}).`,
          });
        }
      }
    });
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
