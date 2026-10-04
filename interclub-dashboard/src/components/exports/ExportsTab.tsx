import React, { useState } from 'react';
import { ClubFrbe, DivisionFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import {
  generatePostRoundEmail,
  generateMatchDaySheetText,
  TeamMatchResultSummary,
} from '../../domain/exporters';
import { AssignedBoard } from '../../domain/rules/frbeValidator';
import { getBoardCountForDivision } from '../../domain/scouting';
import { Copy, Check, Printer, Mail, FileText } from 'lucide-react';

interface Props {
  club: ClubFrbe;
  divisions: DivisionFrbe[];
  playerDirectory: Map<number, { name: string; rating: number; clubName?: string }>;
}

export const ExportsTab: React.FC<Props> = ({ club, divisions, playerDirectory }) => {
  const { draftCompositions } = useSimulator();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  const teams = club.teams || [];
  const activeTeam = teams[selectedTeamIndex] || teams[0];
  const teamNumber = selectedTeamIndex + 1;
  const boardCount = activeTeam ? getBoardCountForDivision(activeTeam.division) : 6;

  // Build match results for round 1
  const roundResultsSummaries: TeamMatchResultSummary[] = [];

  teams.forEach((team) => {
    const matchingDiv = divisions.find(
      (d) => d.division === team.division && (d.index || 'A') === (team.index || 'A')
    );
    if (!matchingDiv) return;

    matchingDiv.rounds.forEach((rd) => {
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

        return {
          board: idx + 1,
          playerName: ourPlayer ? `${ourPlayer.last_name} ${ourPlayer.first_name}` : `Matr. ${ourPlayerId}`,
          playerRating: ourPlayer?.assignedrating || 0,
          result: g.result,
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

  const emailText = generatePostRoundEmail(
    club.name,
    1,
    roundResultsSummaries
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Exports & Mails — {club.name}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Générez en un clic les e-mails de débriefing pour vos membres et imprimez les feuilles de composition officielles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Email Generator Card */}
        <div className="flex flex-col justify-between glass-panel p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/20 shadow-inner">
                  <Mail className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-100 text-lg">
                  Email Récapitulatif
                </h3>
              </div>
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:bg-indigo-500/30 hover:text-indigo-200 transition-all duration-300"
              >
                {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedEmail ? 'Copié !' : 'Copier le texte'}</span>
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Texte formaté prêt à être collé dans votre messagerie (Outlook, Gmail, WhatsApp).
            </p>

            <pre className="mt-4 max-h-[500px] overflow-y-auto rounded-xl bg-black/30 p-5 text-[11px] leading-relaxed font-mono text-slate-300 border border-white/10 whitespace-pre-wrap select-text shadow-inner custom-scrollbar">
              {emailText}
            </pre>
          </div>
        </div>

        {/* Printable Match Day Sheet Card */}
        <div className="flex flex-col justify-between glass-panel p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20 shadow-inner">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-slate-100 text-lg">
                  Feuille de Match (Jour J)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySheet}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
                >
                  {copiedSheet ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span className="hidden sm:inline">{copiedSheet ? 'Copié !' : 'Copier'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:bg-white transition-all duration-300"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
              </div>
            </div>

            {/* Team Picker */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {teams.map((t, idx) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTeamIndex(idx)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-300 border ${
                    selectedTeamIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <pre className="mt-4 max-h-[450px] overflow-y-auto rounded-xl bg-black/30 p-5 text-[11px] leading-relaxed font-mono text-slate-300 border border-white/10 whitespace-pre-wrap select-text shadow-inner custom-scrollbar">
              {matchSheetText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

