import { AssignedBoard } from './rules/frbeValidator';
import { DivisionStandingTable } from './standings';
import { PlayerStats } from './performance';

export interface TeamMatchResultSummary {
  teamName: string;
  divisionLabel: string;
  opponentName: string;
  ourScore: number;
  opponentScore: number;
  isWin: boolean;
  isDraw: boolean;
  boardResults: {
    board: number;
    playerName: string;
    playerRating: number;
    result: string; // "1-0", "½-½", "0-1"
    opponentName: string;
    opponentRating: number;
  }[];
}

/**
 * Generates a clean, ready-to-send email summary for club members after an interclub round
 */
export function generatePostRoundEmail(
  clubName: string,
  roundNumber: number,
  results: TeamMatchResultSummary[]
): string {
  const lines: string[] = [];

  lines.push(`Bonjour à tous,`);
  lines.push(``);
  lines.push(`Voici le récapitulatif des résultats de la Ronde ${roundNumber} des Interclubs Nationaux pour ${clubName} :`);
  lines.push(`----------------------------------------------------------------------`);

  let totalWins = 0;
  let totalDraws = 0;
  let totalLosses = 0;

  results.forEach((res) => {
    if (res.isWin) totalWins++;
    else if (res.isDraw) totalDraws++;
    else totalLosses++;

    const outcomeEmoji = res.isWin ? '🟢 VICTOIRE' : res.isDraw ? '🟡 NUL' : '🔴 DÉFAITE';
    lines.push(``);
    lines.push(`▶️ ${res.teamName} (${res.divisionLabel}) : ${outcomeEmoji} (${res.ourScore} - ${res.opponentScore}) vs ${res.opponentName}`);

    res.boardResults.forEach((b) => {
      lines.push(`   Éch. ${b.board}: ${b.playerName} (${b.playerRating || 'NC'}) [${b.result}] ${b.opponentName} (${b.opponentRating || 'NC'})`);
    });
  });

  lines.push(``);
  lines.push(`----------------------------------------------------------------------`);
  lines.push(`Bilan global de la ronde : ${totalWins} Victoire(s), ${totalDraws} Nul(s), ${totalLosses} Défaite(s).`);
  lines.push(``);
  lines.push(`Bravo à tous pour vos parties et rendez-vous à la prochaine ronde !`);
  lines.push(``);
  lines.push(`Le Directeur des Interclubs`);

  return lines.join('\n');
}

/**
 * Generates plain text printable match sheet for match day
 */
export function generateMatchDaySheetText(
  clubName: string,
  teamName: string,
  divisionLabel: string,
  roundNumber: number,
  boards: AssignedBoard[]
): string {
  const lines: string[] = [];
  lines.push(`======================================================================`);
  lines.push(`   FEUILLE DE COMPOSITION D'ÉQUIPE - INTERCLUBS FRBE`);
  lines.push(`   ${clubName.toUpperCase()} - ${teamName} (${divisionLabel})`);
  lines.push(`   Ronde : ${roundNumber} | Date : ${new Date().toLocaleDateString('fr-BE')}`);
  lines.push(`======================================================================`);
  lines.push(` Ech | Matricule | Nom & Prénom                  | Elo   | Signature`);
  lines.push(`-----+-----------+-------------------------------+-------+------------`);

  boards.forEach((b) => {
    const p = b.player;
    const boardNum = b.board.toString().padStart(3, ' ');
    const id = (p?.idnumber?.toString() || '     ').padEnd(9, ' ');
    const name = (p ? `${p.last_name} ${p.first_name}` : 'A désigner').padEnd(29, ' ').substring(0, 29);
    const elo = (p?.assignedrating?.toString() || 'NC ').padStart(5, ' ');
    lines.push(` ${boardNum} | ${id} | ${name} | ${elo} | `);
  });

  lines.push(`======================================================================`);
  const assigned = boards.filter((b) => b.player !== null);
  const avg = assigned.length > 0
    ? Math.round(assigned.reduce((s, b) => s + (b.player?.assignedrating || 0), 0) / assigned.length)
    : 0;
  lines.push(` Moyenne Elo équipe : ${avg}`);
  lines.push(` Capitaine : _______________________      Signature : _______________`);

  return lines.join('\n');
}
