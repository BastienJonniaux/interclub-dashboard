import React, { useState, useMemo, useEffect } from 'react';
import { ClubFrbe, DivisionFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import {
  generatePostRoundEmail,
  generateMatchDaySheetText,
  TeamMatchResultSummary,
} from '../../domain/exporters';
import { AssignedBoard } from '../../domain/rules/frbeValidator';
import { NextMatchScout, getBoardCountForDivision } from '../../domain/scouting';
import { formatBoardResult } from '../../domain/performance';
import { CompositionEmail } from './CompositionEmail';
import { Copy, Check, Printer, Mail, FileText } from 'lucide-react';
import { ROUND_DATES } from '../../season';
import { getPlayerScoreFromFrbeResult } from '../../domain/performance';

interface Props {
  club: ClubFrbe;
  divisions: DivisionFrbe[];
  playerDirectory: Map<number, { name: string; rating: number; clubName?: string }>;
  scouting?: NextMatchScout[];
}

export const ExportsTab: React.FC<Props> = ({ club, divisions, playerDirectory, scouting }) => {
  const { draftCompositions } = useSimulator();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  const teams = club.teams || [];
  const activeTeam = teams[selectedTeamIndex] || teams[0];
  const teamNumber = selectedTeamIndex + 1;
  const boardCount = activeTeam ? getBoardCountForDivision(activeTeam.division) : 6;

  // Find all played round numbers for our club
  const playedRoundNumbers = useMemo(() => {
    const rSet = new Set<number>();
    divisions.forEach((div) => {
      (div.rounds || []).forEach((rd) => {
        const hasOurMatch = (rd.encounters || []).some(
          (e) =>
            e.played &&
            (e.icclub_home === club.idclub || e.icclub_visit === club.idclub)
        );
        if (hasOurMatch) {
          rSet.add(rd.round);
        }
      });
    });
    const arr = Array.from(rSet).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1];
  }, [divisions, club.idclub]);

  const latestPlayedRound = playedRoundNumbers[playedRoundNumbers.length - 1] || 1;
  const [selectedRecapRound, setSelectedRecapRound] = useState<number>(latestPlayedRound);

  // Sync to latest round when data loads
  useEffect(() => {
    if (playedRoundNumbers.length > 0) {
      setSelectedRecapRound(playedRoundNumbers[playedRoundNumbers.length - 1]);
    }
  }, [playedRoundNumbers]);

  // Build match results for selected recap round
  const roundResultsSummaries: TeamMatchResultSummary[] = [];

  teams.forEach((team) => {
    const matchingDiv = divisions.find(
      (d) => d.division === team.division && (d.index || 'A') === (team.index || 'A')
    );
    if (!matchingDiv) return;

    matchingDiv.rounds.forEach((rd) => {
      if (rd.round !== selectedRecapRound) return;

      const encounter = rd.encounters.find(
        (e) =>
          e.played &&
          (e.icclub_home === club.idclub || e.icclub_visit === club.idclub) &&
          (e.pairingnr_home === team.pairingnumber || e.pairingnr_visit === team.pairingnumber)
      );
      if (!encounter) return;

      const isHome = encounter.icclub_home === club.idclub;
      const ourScore = isHome ? encounter.boardpoint2_home / 2 : encounter.boardpoint2_visit / 2;
      const oppScore = isHome ? encounter.boardpoint2_visit / 2 : encounter.boardpoint2_home / 2;
      const oppClubId = isHome ? encounter.icclub_visit : encounter.icclub_home;
      const oppTeam = matchingDiv.teams.find((t) => t.idclub === oppClubId);

      const boardResults = (encounter.games || []).map((g, idx) => {
        const ourPlayerId = isHome ? g.idnumber_home : g.idnumber_visit;
        const oppPlayerId = isHome ? g.idnumber_visit : g.idnumber_home;
        const ourPlayer = club.players?.find((p) => p.idnumber === ourPlayerId);
        const oppPlayer = playerDirectory.get(oppPlayerId || 0);
        const score = getPlayerScoreFromFrbeResult(g.result, isHome);
        const isFF = (g.result || '').includes('FF');
        const boardResult = score === 1 ? (isFF ? '1-0 FF' : '1-0') : score === 0.5 ? '½-½' : (isFF ? '0-1 FF' : '0-1');

        return {
          board: idx + 1,
          playerName: ourPlayer ? `${ourPlayer.last_name} ${ourPlayer.first_name}` : `Matr. ${ourPlayerId}`,
          playerRating: ourPlayer?.assignedrating || 0,
          result: formatBoardResult(g.result, isHome),
          opponentName: oppPlayer ? oppPlayer.name : `Matr. ${oppPlayerId}`,
          opponentRating: oppPlayer ? oppPlayer.rating : 0,
        };
      });

      roundResultsSummaries.push({
        teamName: team.name,
        divisionLabel: `Div ${team.division}${team.index}`,
        opponentName: oppTeam?.name || `Club #${oppClubId}`,
        ourScore,
        opponentScore: oppScore,
        isWin: ourScore > oppScore,
        isDraw: ourScore === oppScore,
        boardResults,
      });
    });
  });

  const nextRoundNumber = selectedRecapRound + 1;
  const nextRoundDateStr = ROUND_DATES[nextRoundNumber - 1];
  let formattedNextDate: string | undefined = undefined;
  if (nextRoundDateStr) {
    const d = new Date(nextRoundDateStr);
    formattedNextDate = d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const emailText = generatePostRoundEmail(
    club.name,
    selectedRecapRound,
    roundResultsSummaries,
    formattedNextDate
  );

  // Generate Match Day Sheet for selected team
  const currentDraft = draftCompositions[teamNumber] || {};
  const assignedBoards: AssignedBoard[] = [];
  for (let b = 1; b <= boardCount; b++) {
    const playerId = currentDraft[b];
    const player = playerId ? club.players?.find((p) => p.idnumber === playerId) || null : null;
    assignedBoards.push({ board: b, player });
  }

  const matchSheetText = generateMatchDaySheetText(
    club.name,
    activeTeam?.name || `Équipe ${teamNumber}`,
    `Division ${activeTeam?.division}${activeTeam?.index}`,
    2, // Next round
    assignedBoards
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCopySheet = () => {
    navigator.clipboard.writeText(matchSheetText);
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const [activeSubTab, setActiveSubTab] = useState<'post-round' | 'pre-round'>('pre-round');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Exports & Mails — {club.name}
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
            Générez en un clic les e-mails de débriefing pour vos membres et imprimez les feuilles de composition officielles.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit shadow-xs">
        <button
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'pre-round'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          onClick={() => setActiveSubTab('pre-round')}
        >
          Email de compo pré-ronde
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'post-round'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          onClick={() => setActiveSubTab('post-round')}
        >
          Email récapitulatif
        </button>
      </div>

      {activeSubTab === 'post-round' && (
        <div className="flex flex-col justify-between bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
          <div>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-xs">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg tracking-tight">
                  Email Récapitulatif (Ronde {selectedRecapRound})
                </h3>
              </div>
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 px-4 py-2 text-xs font-bold font-mono rounded-lg shadow-xs transition-all cursor-pointer"
              >
                {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedEmail ? 'Copié !' : 'Copier le texte'}</span>
              </button>
            </div>

            {playedRoundNumbers.length > 1 && (
              <div className="flex items-center gap-3 mt-4 pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Ronde à récapituler :
                </span>
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {playedRoundNumbers.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRecapRound(r)}
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer tabular-nums ${
                        selectedRecapRound === r
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      Ronde {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs font-mono text-slate-500">
              Texte formaté prêt à être collé dans votre messagerie (Outlook, Gmail, WhatsApp).
            </p>

            <pre className="mt-3 max-h-[500px] overflow-y-auto bg-slate-50 p-4 text-xs leading-relaxed font-mono text-slate-800 border border-slate-200 rounded-xl whitespace-pre-wrap select-text custom-scrollbar">
              {emailText}
            </pre>
          </div>
        </div>
      )}

      {activeSubTab === 'pre-round' && (
        <CompositionEmail
          club={club}
          scouting={scouting || []}
          draftCompositions={draftCompositions}
        />
      )}
    </div>
  );
};

