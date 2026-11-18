import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlayerFrbe, TeamFrbe, VenueFrbe } from '../../modelsFRBE';
import { InterclubRoundSchedule } from '../../domain/calendar';
import { getBoardCountForDivision } from '../../domain/scouting';
import { fetchVenues } from '../../api/frbeClient';
import { ROUND_DATES } from '../../season';
import {
  Printer,
  X,
  Layers,
  Info,
  MapPin,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedRound: number;
  clubId: number;
  clubName: string;
  teams: TeamFrbe[];
  players: PlayerFrbe[];
  draftCompositions?: { [teamNumber: number]: { [board: number]: number | null } };
  draftCompositionsByRound?: {
    [round: number]: { [teamNumber: number]: { [board: number]: number | null } };
  };
  schedule?: InterclubRoundSchedule[];
  venues?: VenueFrbe[];
}

export const MatchSheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedRound,
  clubId,
  clubName,
  teams,
  players,
  draftCompositions,
  draftCompositionsByRound,
  schedule = [],
  venues = [],
}) => {
  // 0 means "All teams (preview all)", 1..N means preview a specific team on screen
  const [previewTeamIndex, setPreviewTeamIndex] = useState<number>(0);
  // Holds the active print job filter (0 = all, 1..N = specific team) and timestamp
  const [printJob, setPrintJob] = useState<{ filter: number; timestamp: number } | null>(null);

  // Venues map by club ID (our club + opponent clubs)
  const [venuesMap, setVenuesMap] = useState<Record<number, VenueFrbe[]>>({
    [clubId]: venues,
  });
  // Selected home venue index (if our club has multiple venues)
  const [selectedHomeVenueIdx, setSelectedHomeVenueIdx] = useState<number>(0);
  // Selected venue index per team (overrides if specific team has multiple venues)
  const [selectedVenuesByTeam, setSelectedVenuesByTeam] = useState<Record<number, number>>({});

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

  // Load venues for all clubs in this round (home and away opponents)
  useEffect(() => {
    const clubIds = new Set<number>();
    clubIds.add(clubId);
    roundSchedule?.matchups.forEach((m) => {
      if (m.opponentClubId && m.opponentClubId > 0) {
        clubIds.add(m.opponentClubId);
      }
    });

    const loadAllVenues = async () => {
      const newMap: Record<number, VenueFrbe[]> = {
        [clubId]: venues && venues.length > 0 ? venues : (venuesMap[clubId] || []),
      };
      for (const cid of clubIds) {
        if (!newMap[cid] || newMap[cid].length === 0) {
          try {
            const v = await fetchVenues(cid);
            if (v && v.length > 0) {
              newMap[cid] = v;
            }
          } catch {
            // Ignore error
          }
        }
      }
      setVenuesMap((prev) => ({ ...prev, ...newMap }));
    };

    if (isOpen) {
      loadAllVenues();
    }
  }, [clubId, roundSchedule, venues, isOpen]);

  // Trigger print dialog when printJob is updated
  useEffect(() => {
    if (printJob) {
      const timer = setTimeout(() => {
        window.print();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [printJob]);

  const homeVenuesList = venuesMap[clubId] || venues || [];

  // Prepare data for each team sheet
  const sheetsData = useMemo(() => {
    return teams.map((team, idx) => {
      const teamNumber = idx + 1;
      const divisionLabel = `Division ${team.division}${team.index || ''}`;
      const boardCount = getBoardCountForDivision(team.division);

      // Look up matchup in the round schedule
      const matchup =
        roundSchedule?.matchups.find(
          (m) =>
            (m.divisionNumber === team.division &&
              (!team.index || m.divisionIndex === team.index || m.divisionLabel.includes(team.index))) ||
            m.teamName.toLowerCase().includes(team.name.toLowerCase()) ||
            m.teamName.toLowerCase().includes(`${clubName.toLowerCase()} ${teamNumber}`.toLowerCase())
        ) ||
        (roundSchedule?.matchups && idx < roundSchedule.matchups.length ? roundSchedule.matchups[idx] : undefined);

      const isHome = matchup ? matchup.isHome : teamNumber % 2 !== 0;
      const opponentTeamName = matchup?.opponentTeamName || 'Équipe adverse';
      const opponentClubId = matchup?.opponentClubId;

      // Determine venue
      const locationClubId = isHome ? clubId : (opponentClubId || 0);
      const availableVenues = venuesMap[locationClubId] || (isHome ? homeVenuesList : []) || [];
      const venueIdx =
        selectedVenuesByTeam[teamNumber] !== undefined
          ? selectedVenuesByTeam[teamNumber]
          : isHome
          ? selectedHomeVenueIdx
          : 0;

      const currentVenue = availableVenues[venueIdx] || availableVenues[0] || null;

      let venueAddressFormatted = '';
      if (currentVenue) {
        const parts = [
          currentVenue.address,
          [currentVenue.postalcode, currentVenue.city].filter(Boolean).join(' '),
        ].filter(Boolean);
        venueAddressFormatted = parts.join(', ');
        if (currentVenue.comment) {
          venueAddressFormatted = `${currentVenue.comment} - ${venueAddressFormatted}`;
        }
      } else {
        venueAddressFormatted = isHome ? `${clubName} (Local du club)` : opponentTeamName;
      }

      // Get assigned players for this round & team:
      // Priority 1: draftCompositionsByRound for selectedRound
      // Priority 2: draftCompositions from SimulatorContext
      const roundDrafts =
        draftCompositionsByRound?.[selectedRound] &&
        Object.keys(draftCompositionsByRound[selectedRound]).length > 0
          ? draftCompositionsByRound[selectedRound]
          : draftCompositions || {};

      const teamDraft = roundDrafts[teamNumber] || draftCompositions?.[teamNumber] || {};

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
        teamName: team.name || `${clubName} ${teamNumber}`,
        divisionLabel,
        divisionNumber: team.division,
        boardCount,
        isHome,
        opponentTeamName,
        opponentClubId,
        availableVenues,
        currentVenue,
        venueAddressFormatted,
        boards,
      };
    });
  }, [
    teams,
    roundSchedule,
    clubName,
    clubId,
    venuesMap,
    homeVenuesList,
    selectedHomeVenueIdx,
    selectedVenuesByTeam,
    selectedRound,
    draftCompositionsByRound,
    draftCompositions,
    players,
  ]);

  if (!isOpen) return null;

  const handlePrintAll = () => {
    setPrintJob({ filter: 0, timestamp: Date.now() });
  };

  const handlePrintSingle = (teamNumber: number) => {
    setPrintJob({ filter: teamNumber, timestamp: Date.now() });
  };

  const sheetsToPreview =
    previewTeamIndex === 0
      ? sheetsData
      : sheetsData.filter((s) => s.teamNumber === previewTeamIndex);

  const activePrintFilter = printJob !== null ? printJob.filter : previewTeamIndex;
  const sheetsToPrint =
    activePrintFilter === 0
      ? sheetsData
      : sheetsData.filter((s) => s.teamNumber === activePrintFilter);

  // Active team in preview mode (if viewing 1 team)
  const activePreviewSheet = sheetsData.find((s) => s.teamNumber === previewTeamIndex);

  return (
    <>
      {/* Global Print & Isolation Styles */}
      <style>{`
        @media screen {
          #printable-match-sheets {
            display: none !important;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            background-image: none !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide EVERYTHING in body except the printable portal */
          body > *:not(#printable-match-sheets) {
            display: none !important;
          }

          /* Render portal printable container only */
          #printable-match-sheets {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .match-sheet-page {
            display: block !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }

          /* Page break strictly between consecutive team sheets (never trailing after the last or only page) */
          .match-sheet-page + .match-sheet-page {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      {/* Screen Modal Dialog Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto no-print">
        <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-6xl my-auto max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Feuilles de Match FRBE</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold">
                    Ronde {selectedRound}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  1 page A4 Paysage par équipe avec compositions pré-remplies, lieu de la rencontre et lignes adverses manuscrites.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Imprimer toutes les équipes (1 page par équipe)"
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

          {/* Subheader Toolbar: Team selector tabs + Venue selection */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setPreviewTeamIndex(0)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  previewTeamIndex === 0
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Toutes ({teams.length})</span>
              </button>

              {sheetsData.map((s) => (
                <button
                  key={s.teamNumber}
                  onClick={() => setPreviewTeamIndex(s.teamNumber)}
                  className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                    previewTeamIndex === s.teamNumber
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Éq. {s.teamNumber} ({s.divisionLabel})
                </button>
              ))}
            </div>

            {/* Venue Selector when multiple venues exist */}
            <div className="flex items-center gap-2 shrink-0">
              {/* If previewing all teams and our club has multiple venues: global home venue picker */}
              {previewTeamIndex === 0 && homeVenuesList.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-600 shrink-0 text-[11px]">Salle Domicile :</span>
                  <select
                    className="bg-transparent text-xs font-semibold text-slate-900 border-none focus:outline-hidden cursor-pointer max-w-[220px] truncate"
                    value={selectedHomeVenueIdx}
                    onChange={(e) => setSelectedHomeVenueIdx(Number(e.target.value))}
                  >
                    {homeVenuesList.map((v, i) => (
                      <option key={i} value={i}>
                        {v.comment ? `${v.comment} - ` : ''}{v.address}, {v.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If previewing a specific team: picker for that specific team's venue if >1 available */}
              {previewTeamIndex > 0 && activePreviewSheet && (activePreviewSheet.availableVenues.length > 1) && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-600 shrink-0 text-[11px]">
                    {activePreviewSheet.isHome ? 'Salle Domicile :' : 'Salle Visiteur :'}
                  </span>
                  <select
                    className="bg-transparent text-xs font-semibold text-slate-900 border-none focus:outline-hidden cursor-pointer max-w-[220px] truncate"
                    value={selectedVenuesByTeam[previewTeamIndex] ?? (activePreviewSheet.isHome ? selectedHomeVenueIdx : 0)}
                    onChange={(e) =>
                      setSelectedVenuesByTeam((prev) => ({
                        ...prev,
                        [previewTeamIndex]: Number(e.target.value),
                      }))
                    }
                  >
                    {activePreviewSheet.availableVenues.map((v, i) => (
                      <option key={i} value={i}>
                        {v.comment ? `${v.comment} - ` : ''}{v.address}, {v.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {previewTeamIndex > 0 && (
                <button
                  onClick={() => handlePrintSingle(previewTeamIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs cursor-pointer shrink-0"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Imprimer cette équipe (1 page)</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Scrollable Preview Area */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 space-y-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {sheetsToPreview.map((sheet) => (
                <div
                  key={sheet.teamNumber}
                  className="bg-white border-2 border-slate-900 rounded-lg p-5 shadow-lg relative"
                >
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

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-emerald-600 shrink-0" />
              Astuce : Dans la boîte d'impression, choisissez <strong>Destination : Enregistrer au format PDF</strong> pour créer un PDF propre.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Printable Container rendered via Portal directly in document.body (completely isolated from root and modals) */}
      {createPortal(
        <div id="printable-match-sheets">
          {sheetsToPrint.map((sheet) => (
            <div key={sheet.teamNumber} className="match-sheet-page">
              <MatchSheetContent
                sheet={sheet}
                clubId={clubId}
                roundDateFormatted={roundDateFormatted}
                roundNumber={selectedRound}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
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
    venueAddressFormatted: string;
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
  const { isHome, boards, teamName, opponentTeamName, divisionLabel, venueAddressFormatted } = sheet;

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

        {/* Top Meta Details Grid: 4 columns including Lieu / Salle de jeu */}
        <div className="flex border-b-2 border-x-2 border-slate-900 text-xs font-mono">
          <div className="w-[23%] p-1.5 border-r border-slate-900 shrink-0">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Date</span>
            <strong className="text-slate-900 font-bold whitespace-nowrap block">{roundDateFormatted}</strong>
          </div>
          <div className="flex-1 p-1.5 border-r border-slate-900 min-w-0">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Lieu de la rencontre</span>
            <strong className="text-slate-900 font-bold truncate block" title={venueAddressFormatted}>
              {venueAddressFormatted}
            </strong>
          </div>
          <div className="w-[14%] p-1.5 border-r border-slate-900 shrink-0">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Division</span>
            <strong className="text-slate-900 font-bold block">{divisionLabel}</strong>
          </div>
          <div className="w-[11%] p-1.5 shrink-0 text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Ronde</span>
            <strong className="text-slate-900 font-bold block">Ronde {roundNumber}</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Roster Table (Domicile vs Visiteur) */}
      <div className="grid grid-cols-2 gap-3 my-2.5">
        {/* Left Column: CLUB DOMICILE (blancs aux échiquiers impairs) */}
        <div className="border-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 p-2 border-b-2 border-slate-900 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 block">
                  Club Domicile
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
                  <th className="py-1 px-1 text-center w-8 border-r border-slate-400">Éch.</th>
                  <th className="py-1 px-1 text-center w-7 border-r border-slate-400">C.</th>
                  <th className="py-1 px-2 text-left border-r border-slate-400">Nom et Prénom</th>
                  <th className="py-1 px-1.5 text-center w-18 border-r border-slate-400">Matricule</th>
                  <th className="py-1 px-1.5 text-center w-14 border-r border-slate-400">Elo</th>
                  <th className="py-1 px-2 text-center w-12">R.</th>
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
                      <td className="px-2 font-sans font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[190px]">
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
                      <td className="text-center font-bold">
                        <span className="inline-block w-6 h-5 border border-slate-400 rounded-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: CLUB VISITEUR (blancs aux échiquiers pairs) */}
        <div className="border-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 p-2 border-b-2 border-slate-900 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 block">
                  Club Visiteur
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
                  <th className="py-1 px-1 text-center w-8 border-r border-slate-400">Éch.</th>
                  <th className="py-1 px-1 text-center w-7 border-r border-slate-400">C.</th>
                  <th className="py-1 px-2 text-left border-r border-slate-400">Nom et Prénom</th>
                  <th className="py-1 px-1.5 text-center w-18 border-r border-slate-400">Matricule</th>
                  <th className="py-1 px-1.5 text-center w-14 border-r border-slate-400">Elo</th>
                  <th className="py-1 px-2 text-center w-12">R.</th>
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
                      <td className="px-2 font-sans font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[190px]">
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
                      <td className="text-center font-bold">
                        <span className="inline-block w-6 h-5 border border-slate-400 rounded-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Footer Section */}
      <div className="border-2 border-slate-900 font-mono text-[10px]">
        {/* Score Final en grand au milieu */}
        <div className="flex items-center justify-center py-2 border-b-2 border-slate-900 bg-slate-50">
          <div className="inline-flex items-center gap-3 px-5 py-1.5 border-2 border-slate-900 bg-white shadow-xs">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-800">
              Score Final :
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-widest font-mono">
              [&nbsp;&nbsp;____&nbsp;&nbsp;&minus;&nbsp;&nbsp;____&nbsp;&nbsp;]
            </span>
          </div>
        </div>

        {/* 2 Captain Blocks avec séparation verticale symétrique */}
        <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
          {/* Capitaine Équipe Domicile */}
          <div className="p-2.5 sm:p-3">
            <span className="text-slate-600 block text-[9px] uppercase font-bold tracking-wider mb-2">
              Capitaine Équipe Domicile
            </span>
            <div className="flex items-center justify-between gap-4 text-[10px]">
              <span className="font-semibold text-slate-900">Nom : _________________________</span>
              <span className="font-semibold text-slate-900">Signature : __________________</span>
            </div>
          </div>

          {/* Capitaine Équipe Visiteuse */}
          <div className="p-2.5 sm:p-3">
            <span className="text-slate-600 block text-[9px] uppercase font-bold tracking-wider mb-2">
              Capitaine Équipe Visiteuse
            </span>
            <div className="flex items-center justify-between gap-4 text-[10px]">
              <span className="font-semibold text-slate-900">Nom : _________________________</span>
              <span className="font-semibold text-slate-900">Signature : __________________</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata bar */}
        <div className="border-t border-slate-300 px-3 py-1 text-[8px] text-slate-500 flex justify-between bg-slate-50">
          <span>Interclubs Nationaux FRBE &bull; Édition officielle générée le {new Intl.DateTimeFormat('fr-BE').format(new Date())}</span>
          <span>Feuille de match officielle &bull; Echiquier Leuzois</span>
        </div>
      </div>
    </div>
  );
};
