import React, { useState, useMemo } from 'react';
import { PlayerFrbe, TeamFrbe } from '../../modelsFRBE';
import { InterclubRoundSchedule } from '../../domain/calendar';
import { getBoardCountForDivision } from '../../domain/scouting';
import { ROUND_DATES } from '../../season';
import {
  Printer,
  X,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedRound: number;
  clubId: number;
  clubName: string;
  teams: TeamFrbe[];
  players: PlayerFrbe[];
  draftCompositionsByRound: {
    [round: number]: { [teamNumber: number]: { [board: number]: number | null } };
  };
  schedule?: InterclubRoundSchedule[];
}

export const MatchSheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedRound,
  clubId,
  clubName,
  teams,
  players,
  draftCompositionsByRound,
  schedule = [],
}) => {
  // 0 means "All teams (all pages)", 1..N means preview / print a specific team
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number>(0);

  const roundSchedule = useMemo(() => {
    return schedule.find((s) => s.roundNumber === selectedRound);
  }, [schedule, selectedRound]);

  const roundDateFormatted = useMemo(() => {
    if (roundSchedule?.formattedDate) return roundSchedule.formattedDate;
    const raw = ROUND_DATES[selectedRound - 1];
    if (!raw) return `Ronde ${selectedRound}`;
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }, [roundSchedule, selectedRound]);

  if (!isOpen) return null;

  // Prepare data for each team sheet
  const sheetsData = teams.map((team, idx) => {
    const teamNumber = idx + 1;
    const divisionLabel = `Division ${team.division}${team.index || ''}`;
    const boardCount = getBoardCountForDivision(team.division);

    // Look up matchup in the round schedule
    const matchup = roundSchedule?.matchups.find(
      (m) =>
        m.teamName.toLowerCase().includes(team.name.toLowerCase()) ||
        m.teamName.toLowerCase().includes(`${clubName.toLowerCase()} ${team.index || teamNumber}`.toLowerCase()) ||
        (m.divisionNumber === team.division && m.divisionLabel.includes(team.index || ''))
    );

    const isHome = matchup ? matchup.isHome : teamNumber % 2 !== 0;
    const opponentTeamName = matchup?.opponentTeamName || 'Équipe adverse';
    const opponentClubId = matchup?.opponentClubId;

    // Get assigned players for this round & team
    const teamDraft = draftCompositionsByRound[selectedRound]?.[teamNumber] || {};

    const boards = [];
    for (let b = 1; b <= boardCount; b++) {
      const pid = teamDraft[b];
      const player = pid ? players.find((p) => p.idnumber === pid) : null;
      boards.push({
        boardNumber: b,
        player,
      });
    }

    return {
      teamNumber,
      teamName: `${clubName} ${team.index || teamNumber}`,
      divisionLabel,
      divisionNumber: team.division,
      boardCount,
      isHome,
      opponentTeamName,
      opponentClubId,
      boards,
    };
  });

  const handlePrint = (filterIndex: number) => {
    setSelectedTeamFilter(filterIndex);
    // Give state a brief tick to re-render, then invoke native print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const displayedSheets =
    selectedTeamFilter === 0
      ? sheetsData
      : sheetsData.filter((s) => s.teamNumber === selectedTeamFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Print Styles injected in page */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-match-sheets, #printable-match-sheets * {
            visibility: visible;
          }
          #printable-match-sheets {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .match-sheet-page {
            page-break-after: always;
            break-after: page;
            height: 98vh;
            max-height: 98vh;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 8px 12px;
            background: white !important;
            color: black !important;
          }
          .match-sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-6xl my-auto max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in duration-150 no-print">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Feuilles de Match Officielles FRBE</span>
                <span className="font-mono text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold">
                  Ronde {selectedRound}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                1 page A4 Paysage par équipe avec vos joueurs pré-remplis et lignes vierges pour l'adversaire.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(0)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Ouvrir la boîte d'impression pour toutes les équipes"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer toutes ({teams.length} pages)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Team Selector Tabs in Modal */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedTeamFilter(0)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedTeamFilter === 0
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Toutes les équipes ({teams.length})</span>
            </button>

            {sheetsData.map((s) => (
              <button
                key={s.teamNumber}
                onClick={() => setSelectedTeamFilter(s.teamNumber)}
                className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedTeamFilter === s.teamNumber
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Équipe {s.teamNumber} ({s.divisionLabel})
              </button>
            ))}
          </div>

          {selectedTeamFilter > 0 && (
            <button
              onClick={() => handlePrint(selectedTeamFilter)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs cursor-pointer shrink-0"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Imprimer cette équipe (1 page)</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Preview Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 space-y-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {displayedSheets.map((sheet) => (
              <div
                key={sheet.teamNumber}
                className="bg-white border-2 border-slate-900 rounded-lg p-5 shadow-lg relative"
              >
                {/* Visual Sheet Preview */}
                <MatchSheetContent sheet={sheet} clubId={clubId} roundDateFormatted={roundDateFormatted} roundNumber={selectedRound} />
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-emerald-600 shrink-0" />
            Astuce : Dans la boîte d'impression, choisissez <strong>Destination : Enregistrer au format PDF</strong> pour générer un fichier numérique.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Printable Container (hidden on screen, visible during window.print()) */}
      <div id="printable-match-sheets">
        {displayedSheets.map((sheet) => (
          <div key={sheet.teamNumber} className="match-sheet-page">
            <MatchSheetContent
              sheet={sheet}
              clubId={clubId}
              roundDateFormatted={roundDateFormatted}
              roundNumber={selectedRound}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface MatchSheetContentProps {
  sheet: {
    teamNumber: number;
    teamName: string;
    divisionLabel: string;
    divisionNumber: number;
    boardCount: number;
    isHome: boolean;
    opponentTeamName: string;
    opponentClubId?: number;
    boards: {
      boardNumber: number;
      player: PlayerFrbe | null | undefined;
    }[];
  };
  clubId: number;
  roundDateFormatted: string;
  roundNumber: number;
}

const MatchSheetContent: React.FC<MatchSheetContentProps> = ({
  sheet,
  clubId,
  roundDateFormatted,
  roundNumber,
}) => {
  const { isHome, boardCount, boards, teamName, opponentTeamName, divisionLabel } = sheet;

  // Club Home (odd boards = White) vs Club Away (odd boards = Black)
  const homeClubName = isHome ? teamName : opponentTeamName;
  const homeClubMatricule = isHome ? clubId : sheet.opponentClubId || 'Adverse';

  const awayClubName = isHome ? opponentTeamName : teamName;
  const awayClubMatricule = isHome ? sheet.opponentClubId || 'Adverse' : clubId;

  return (
    <div className="w-full flex flex-col justify-between text-slate-900 select-none">
      {/* 1. Header Box */}
      <div>
        <div className="text-center pb-2 border-b-2 border-slate-900">
          <div className="text-[10px] tracking-widest uppercase font-bold text-slate-600 font-mono">
            Fédération Royale Belge des Échecs &bull; Koninklijke Belgische Schaakbond
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900 font-serif">
            Feuille de Match Officielle
          </h1>
        </div>

        {/* Top Meta Details Grid */}
        <div className="grid grid-cols-4 border-b-2 border-x-2 border-slate-900 text-xs font-mono">
          <div className="p-1.5 border-r border-slate-900">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Date</span>
            <strong className="text-slate-900 font-bold">{roundDateFormatted}</strong>
          </div>
          <div className="p-1.5 border-r border-slate-900">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Compétition / Division</span>
            <strong className="text-slate-900 font-bold">{divisionLabel}</strong>
          </div>
          <div className="p-1.5 border-r border-slate-900">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Ronde</span>
            <strong className="text-slate-900 font-bold">Ronde {roundNumber}</strong>
          </div>
          <div className="p-1.5">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Format</span>
            <strong className="text-slate-900 font-bold">{boardCount} échiquiers</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Roster Table (Domicile vs Visiteur) */}
      <div className="grid grid-cols-2 gap-3 my-2.5">
        {/* Left Column: CLUB AYANT LES BLANCS SUR LES ECHIQUIERS IMPAIRS (DOMICILE) */}
        <div className="border-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 p-2 border-b-2 border-slate-900 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 block">
                  Club ayant les blancs aux échiquiers impairs (Domicile)
                </span>
                <strong className="text-sm font-bold text-slate-900 uppercase">
                  {homeClubName}
                </strong>
                <span className="text-[11px] font-mono text-slate-600 ml-2">
                  (Matr. {homeClubMatricule})
                </span>
              </div>
              <div className="border border-slate-900 bg-white px-3 py-1 font-mono font-bold text-xs text-center">
                Score : ____
              </div>
            </div>

            {/* Table of boards */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-50 font-mono text-[10px] text-slate-600">
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-400">Éch.</th>
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-400">C.</th>
                  <th className="py-1 px-2 text-left border-r border-slate-400">Nom et Prénom</th>
                  <th className="py-1 px-1.5 text-center w-16 border-r border-slate-400">Matricule</th>
                  <th className="py-1 px-1.5 text-center w-12 border-r border-slate-400">Elo</th>
                  <th className="py-1 px-1 text-center w-6 border-r border-slate-400">C*</th>
                  <th className="py-1 px-2 text-center w-10">R.</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((b) => {
                  const isWhite = b.boardNumber % 2 !== 0; // odd is White for Home
                  const colorStr = isWhite ? 'B' : 'N';
                  const player = isHome ? b.player : null;

                  return (
                    <tr
                      key={b.boardNumber}
                      className="border-b border-slate-300 h-7 text-xs font-mono"
                    >
                      <td className="text-center font-bold border-r border-slate-300">
                        {b.boardNumber}
                      </td>
                      <td className="text-center font-bold border-r border-slate-300">
                        {colorStr}
                      </td>
                      <td className="px-2 font-sans font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[170px]">
                        {player ? (
                          `${player.last_name} ${player.first_name}`
                        ) : (
                          <span className="inline-block w-full border-b border-dotted border-slate-300 h-4" />
                        )}
                      </td>
                      <td className="text-center text-slate-700 border-r border-slate-300">
                        {player ? player.idnumber : ''}
                      </td>
                      <td className="text-center font-bold text-slate-900 border-r border-slate-300">
                        {player ? player.assignedrating || player.fiderating || '' : ''}
                      </td>
                      <td className="text-center border-r border-slate-300">
                        <span className="inline-block w-3 h-3 border border-slate-400 rounded-2xs" />
                      </td>
                      <td className="text-center font-bold">
                        <span className="inline-block w-6 h-5 border border-slate-400 rounded-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-slate-900 bg-slate-50 text-[10px] font-mono flex justify-between items-center">
            <span>Capitaine : _______________________</span>
            <span>Signature : _______________________</span>
          </div>
        </div>

        {/* Right Column: CLUB AYANT LES BLANCS SUR LES ECHIQUIERS PAIRS (VISITEUR) */}
        <div className="border-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 p-2 border-b-2 border-slate-900 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 block">
                  Club ayant les blancs aux échiquiers pairs (Visiteur)
                </span>
                <strong className="text-sm font-bold text-slate-900 uppercase">
                  {awayClubName}
                </strong>
                <span className="text-[11px] font-mono text-slate-600 ml-2">
                  (Matr. {awayClubMatricule})
                </span>
              </div>
              <div className="border border-slate-900 bg-white px-3 py-1 font-mono font-bold text-xs text-center">
                Score : ____
              </div>
            </div>

            {/* Table of boards */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-50 font-mono text-[10px] text-slate-600">
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-400">Éch.</th>
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-400">C.</th>
                  <th className="py-1 px-2 text-left border-r border-slate-400">Nom et Prénom</th>
                  <th className="py-1 px-1.5 text-center w-16 border-r border-slate-400">Matricule</th>
                  <th className="py-1 px-1.5 text-center w-12 border-r border-slate-400">Elo</th>
                  <th className="py-1 px-1 text-center w-6 border-r border-slate-400">C*</th>
                  <th className="py-1 px-2 text-center w-10">R.</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((b) => {
                  const isWhite = b.boardNumber % 2 === 0; // even is White for Away
                  const colorStr = isWhite ? 'B' : 'N';
                  const player = !isHome ? b.player : null;

                  return (
                    <tr
                      key={b.boardNumber}
                      className="border-b border-slate-300 h-7 text-xs font-mono"
                    >
                      <td className="text-center font-bold border-r border-slate-300">
                        {b.boardNumber}
                      </td>
                      <td className="text-center font-bold border-r border-slate-300">
                        {colorStr}
                      </td>
                      <td className="px-2 font-sans font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[170px]">
                        {player ? (
                          `${player.last_name} ${player.first_name}`
                        ) : (
                          <span className="inline-block w-full border-b border-dotted border-slate-300 h-4" />
                        )}
                      </td>
                      <td className="text-center text-slate-700 border-r border-slate-300">
                        {player ? player.idnumber : ''}
                      </td>
                      <td className="text-center font-bold text-slate-900 border-r border-slate-300">
                        {player ? player.assignedrating || player.fiderating || '' : ''}
                      </td>
                      <td className="text-center border-r border-slate-300">
                        <span className="inline-block w-3 h-3 border border-slate-400 rounded-2xs" />
                      </td>
                      <td className="text-center font-bold">
                        <span className="inline-block w-6 h-5 border border-slate-400 rounded-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-slate-900 bg-slate-50 text-[10px] font-mono flex justify-between items-center">
            <span>Capitaine : _______________________</span>
            <span>Signature : _______________________</span>
          </div>
        </div>
      </div>

      {/* 3. Footer Section */}
      <div className="border-2 border-slate-900 p-2 text-[10px] font-mono space-y-2">
        <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
          <span className="text-slate-600">
            Guide des résultats : <strong>1</strong> = Gain &bull; <strong>½</strong> = Nulle &bull; <strong>0</strong> = Perte &bull; <strong>1F / 0F</strong> = Forfait
          </span>
          <span className="text-slate-600">
            C* = Contrôle des licences & affiliations
          </span>
          <span className="font-bold text-slate-900">
            Score Final : Échiquiers : [ ____ - ____ ] &bull; Match : [ ____ - ____ ]
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">Capitaine Équipe Domicile</span>
            <div className="mt-1">Nom : _____________________________</div>
            <div className="mt-1">Signature : ________________________</div>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">Arbitre de la rencontre</span>
            <div className="mt-1">Nom : _____________________________</div>
            <div className="mt-1">Signature : ________________________</div>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">Capitaine Équipe Visiteuse</span>
            <div className="mt-1">Nom : _____________________________</div>
            <div className="mt-1">Signature : ________________________</div>
          </div>
        </div>

        <div className="border-t border-slate-300 pt-1 text-[8px] text-slate-500 flex justify-between">
          <span>Interclubs Nationaux FRBE 2026–2027 &bull; Édition officielle générée le {new Intl.DateTimeFormat('fr-BE').format(new Date())}</span>
          <span>Feuille de match officielle &bull; À renvoyer au responsable de division après la rencontre</span>
        </div>
      </div>
    </div>
  );
};
