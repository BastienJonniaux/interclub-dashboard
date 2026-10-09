import React, { useState } from 'react';
import { ClubFrbe, DivisionFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import {
  generatePostRoundEmail,
  generateMatchDaySheetText,
  TeamMatchResultSummary,
} from '../../domain/exporters';
import { AssignedBoard } from '../../domain/rules/frbeValidator';
import { NextMatchScout, getBoardCountForDivision } from '../../domain/scouting';
import { CompositionEmail } from './CompositionEmail';
import { Copy, Check, Printer, Mail, FileText } from 'lucide-react';

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

  const [activeSubTab, setActiveSubTab] = useState<'post-round' | 'pre-round'>('pre-round');

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1918] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2DFD8]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-white tracking-tight">
            Exports & Mails — {club.name}
          </h2>
          <p className="text-sm text-[#E2DFD8] mt-2 max-w-3xl leading-relaxed">
            Générez en un clic les e-mails de débriefing pour vos membres et imprimez les feuilles de composition officielles.
          </p>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-[#E2DFD8] pb-4">
        <button
          className={`pb-2 text-sm font-bold font-mono uppercase tracking-wider transition-colors ${
            activeSubTab === 'pre-round' ? 'text-[#1A1918] border-b-2 border-[#1A1918]' : 'text-[#6E6A64] hover:text-[#1A1918]'
          }`}
          onClick={() => setActiveSubTab('pre-round')}
        >
          Email de compo pré-ronde
        </button>
        <button
          className={`pb-2 text-sm font-bold font-mono uppercase tracking-wider transition-colors ${
            activeSubTab === 'post-round' ? 'text-[#1A1918] border-b-2 border-[#1A1918]' : 'text-[#6E6A64] hover:text-[#1A1918]'
          }`}
          onClick={() => setActiveSubTab('post-round')}
        >
          Email récapitulatif
        </button>
      </div>

      {activeSubTab === 'post-round' && (
        <div className="flex flex-col justify-between chess-panel p-6 bg-white border border-[#E2DFD8]">
          <div>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-[#E2DFD8] gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#1A1918] bg-[#F9F8F6]">
                  <Mail className="h-5 w-5 text-[#1A1918]" />
                </div>
                <h3 className="font-bold font-serif text-[#1A1918] text-lg">
                  Email Récapitulatif
                </h3>
              </div>
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center justify-center gap-2 bg-[#1E5E3A]/10 border border-[#1E5E3A]/30 px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider text-[#1E5E3A] hover:bg-[#1E5E3A] hover:text-white transition-all duration-300"
              >
                {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedEmail ? 'Copié !' : 'Copier le texte'}</span>
              </button>
            </div>

            <p className="mt-4 text-xs font-mono text-[#6E6A64]">
              Texte formaté prêt à être collé dans votre messagerie (Outlook, Gmail, WhatsApp).
            </p>

            <pre className="mt-4 max-h-[500px] overflow-y-auto bg-[#F9F8F6] p-5 text-[11px] leading-relaxed font-mono text-[#1A1918] border border-[#E2DFD8] whitespace-pre-wrap select-text custom-scrollbar">
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

