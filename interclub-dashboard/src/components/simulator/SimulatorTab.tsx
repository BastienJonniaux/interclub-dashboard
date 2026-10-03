import React, { useState, useMemo, useEffect } from 'react';
import { PlayerFrbe, TeamFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import {
  validateTeamComposition,
  AssignedBoard,
  RESERVE_ELO_LIMITS
} from '../../domain/rules/frbeValidator';
import { getBoardCountForDivision, NextMatchScout } from '../../domain/scouting';
import { PlayerSettingsModal } from './PlayerSettingsModal';
import {
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  UserPlus,
  Swords,
  Wand2,
  EyeOff,
  UserCog,
  Eye,
  Settings
} from 'lucide-react';

interface Props {
  players: PlayerFrbe[];
  teams: TeamFrbe[];
  clubName: string;
  scouting?: NextMatchScout[];
}

export const SimulatorTab: React.FC<Props> = ({ players, teams, clubName, scouting = [] }) => {
  const {
    availability,
    setPlayerAvailability,
    playerSettings,
    draftCompositions,
    assignPlayerToBoard,
    clearDraft,
    autoFillTeam
  } = useSimulator();

  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [selectedDeckPlayerId, setSelectedDeckPlayerId] = useState<number | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const activeTeam = teams[selectedTeamIndex] || teams[0];
  const teamNumber = selectedTeamIndex + 1;
  const boardCount = activeTeam ? getBoardCountForDivision(activeTeam.division) : 6;

  const teamScout = scouting.find((s) => s.ourTeamName === activeTeam?.name);

  const currentDraft = draftCompositions[teamNumber] || {};
  const assignedBoards: AssignedBoard[] = [];
  for (let b = 1; b <= boardCount; b++) {
    const playerId = currentDraft[b];
    const player = playerId ? players.find((p) => p.idnumber === playerId) || null : null;
    assignedBoards.push({ board: b, player });
  }

  const validation = validateTeamComposition(
    teamNumber,
    activeTeam?.division || 3,
    assignedBoards
  );

  const sortedClubPlayers = useMemo(() => {
    return [...players].sort(
      (a, b) =>
        (b.assignedrating || 0) - (a.assignedrating || 0) ||
        a.last_name.localeCompare(b.last_name)
    );
  }, [players]);

  // Deck players grouped by status (Active vs Reserve/Backup vs Absent vs Ignored)
  const deckPlayers = useMemo(() => {
    return sortedClubPlayers.filter((p) => {
      const isIgnored = playerSettings[p.idnumber]?.isIgnored;
      if (isIgnored && !showIgnored) return false;
      return true;
    }).sort((a, b) => {
      // 1. Ignored players at the very bottom
      const aIgnored = playerSettings[a.idnumber]?.isIgnored ? 1 : 0;
      const bIgnored = playerSettings[b.idnumber]?.isIgnored ? 1 : 0;
      if (aIgnored !== bIgnored) return aIgnored - bIgnored;

      // 2. Unavailable (Absent) players below active/backups
      const aAbsent = availability[a.idnumber] === 'unavailable' ? 1 : 0;
      const bAbsent = availability[b.idnumber] === 'unavailable' ? 1 : 0;
      if (aAbsent !== bAbsent) return aAbsent - bAbsent;

      // 3. Persistent backups below active players
      const aBackup = playerSettings[a.idnumber]?.isBackup ? 1 : 0;
      const bBackup = playerSettings[b.idnumber]?.isBackup ? 1 : 0;
      if (aBackup !== bBackup) return aBackup - bBackup;
      
      return 0; // The original sorting (Elo) is preserved within groups
    });
  }, [sortedClubPlayers, availability, playerSettings, showIgnored]);

  const globalAssignments = useMemo(() => {
    const map = new Map<number, string>();
    Object.entries(draftCompositions).forEach(([tNum, draft]) => {
      Object.entries(draft).forEach(([bNum, pId]) => {
        if (pId !== null) {
          map.set(pId, `Éq. ${tNum} - Éch. ${bNum}`);
        }
      });
    });
    return map;
  }, [draftCompositions]);

  // Auto-scroll to first eligible player when team changes
  useEffect(() => {
    if (!activeTeam) return;
    const div = activeTeam.division;
    const limit = RESERVE_ELO_LIMITS[div] || 9999;
    
    const targetPlayer = deckPlayers.find(p => {
      if (globalAssignments.has(p.idnumber)) return false; // Exclude already assigned
      if (availability[p.idnumber] === 'unavailable') return false; // Exclude absent
      if (playerSettings[p.idnumber]?.isIgnored) return false; // Exclude ignored

      const titularMatch = (p.titular || '').match(/(\d+)/);
      const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
      
      if (titularTeam === teamNumber) return true; // Is titular for this team
      if (titularTeam > 0 && titularTeam < teamNumber) return false; // Cannot play down
      
      return (p.assignedrating || 0) <= limit;
    });

    if (targetPlayer) {
      setTimeout(() => {
        const el = document.getElementById(`deck-player-${targetPlayer.idnumber}`);
        const container = document.getElementById('deck-container');
        if (el && container) {
          container.scrollTo({
            top: el.offsetTop - container.offsetTop - 10,
            behavior: 'smooth'
          });
        }
      }, 150); // Small delay for render
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamIndex]);

  const currentlyAssignedIds = new Set(
    Object.values(currentDraft).filter((id): id is number => id !== null && id !== undefined)
  );

  const handleBoardClick = (board: number, currentOccupantId: number | undefined) => {
    if (selectedDeckPlayerId !== null) {
      assignPlayerToBoard(teamNumber, board, selectedDeckPlayerId);
      setSelectedDeckPlayerId(null);
    } else if (currentOccupantId) {
      assignPlayerToBoard(teamNumber, board, null);
    }
  };

  const handleAutoFill = () => {
    const eligiblePlayers = sortedClubPlayers.filter(p => {
      const status = availability[p.idnumber] || 'tentative';
      if (status === 'unavailable') return false;
      if (playerSettings[p.idnumber]?.isIgnored) return false;
      // Do not auto-fill players that are already assigned to ANY board in ANY team
      if (globalAssignments.has(p.idnumber)) return false;
      return true;
    });

    const eligibleIds = eligiblePlayers.map(p => p.idnumber);
    autoFillTeam(teamNumber, boardCount, eligibleIds);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Simulateur de Composition & Règles FRBE
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Sélectionnez un joueur dans le deck, puis cliquez sur un échiquier pour l'y assigner.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Player Deck (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2 shrink-0">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                Deck des joueurs ({deckPlayers.length})
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowIgnored(!showIgnored)}
                  className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md transition-colors ${
                    showIgnored ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  title="Afficher/Masquer les joueurs ignorés"
                >
                  {showIgnored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold bg-white/5 px-2 py-1 rounded-md text-slate-300 hover:bg-white/10 transition-colors"
                  title="Gérer les joueurs (Saison)"
                >
                  <Settings className="h-3 w-3" /> Config
                </button>
              </div>
            </div>

            <div id="deck-container" className="mt-4 flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar relative" style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '400px' }}>
              {deckPlayers.map((p) => {
                const status = availability[p.idnumber] || 'tentative';
                const isSelected = selectedDeckPlayerId === p.idnumber;
                const assignmentStr = globalAssignments.get(p.idnumber);
                const isAssignedHere = currentlyAssignedIds.has(p.idnumber);
                
                const isIgnored = playerSettings[p.idnumber]?.isIgnored;
                const isBackup = playerSettings[p.idnumber]?.isBackup;
                const isAbsent = status === 'unavailable';

                return (
                  <div
                    key={p.idnumber}
                    id={`deck-player-${p.idnumber}`}
                    onClick={() => setSelectedDeckPlayerId(isSelected ? null : p.idnumber)}
                    className={`cursor-pointer flex flex-col rounded-xl border p-3 transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400'
                        : isIgnored
                        ? 'bg-black/40 border-white/5 opacity-50 grayscale hover:opacity-80'
                        : isAbsent
                        ? 'bg-rose-950/20 border-rose-900/30 opacity-70 hover:opacity-100'
                        : isAssignedHere
                        ? 'bg-emerald-500/10 border-emerald-500/20 opacity-70 hover:opacity-100'
                        : assignmentStr
                        ? 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                        : isBackup
                        ? 'bg-slate-900/50 border-white/5 opacity-80 hover:bg-white/5 hover:opacity-100'
                        : 'bg-black/20 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-bold ${isSelected ? 'text-indigo-300' : isIgnored ? 'text-slate-500 line-through' : isAbsent ? 'text-rose-400/70' : 'text-slate-200'}`}>
                          {p.last_name} {p.first_name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                          <span><strong className={isIgnored ? '' : 'text-slate-300'}>{p.assignedrating || 'NC'}</strong> Elo</span>
                          {p.titular && (
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">
                              Tit. {p.titular}
                            </span>
                          )}
                          {isBackup && (
                            <span className="rounded-md bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px]">
                              Réserve Permanente
                            </span>
                          )}
                          {isAbsent && !isIgnored && (
                            <span className="rounded-md bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[9px]">
                              Absent Ronde
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'available'); }}
                          className={`rounded-md p-1.5 transition-all ${
                            status === 'available'
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : 'bg-white/5 text-slate-500 border border-transparent hover:text-emerald-400'
                          }`}
                          title="Présent pour cette ronde"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'tentative'); }}
                          className={`rounded-md p-1.5 transition-all ${
                            status === 'tentative'
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              : 'bg-white/5 text-slate-500 border border-transparent hover:text-amber-400'
                          }`}
                          title="À confirmer"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'unavailable'); }}
                          className={`rounded-md p-1.5 transition-all ${
                            status === 'unavailable'
                              ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                              : 'bg-white/5 text-slate-500 border border-transparent hover:text-rose-400'
                          }`}
                          title="Absent pour cette ronde"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {assignmentStr && !isIgnored && (
                      <div className={`mt-2 text-[10px] font-medium ${isAssignedHere ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isAssignedHere ? 'Assigné à cette équipe' : `Déjà placé : ${assignmentStr}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Teams Builder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Team Tabs (Flex Wrap) */}
          <div className="glass-panel p-3 flex flex-wrap items-center gap-2">
            {teams.map((t, idx) => (
              <button
                key={t.name}
                type="button"
                onClick={() => { setSelectedTeamIndex(idx); setSelectedDeckPlayerId(null); }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 border ${
                  selectedTeamIndex === idx
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                Équipe {idx + 1}
                <span className="ml-2 text-[10px] opacity-70 font-normal">
                  Div {t.division}{t.index}
                </span>
              </button>
            ))}
          </div>

          {/* Validation & Scouting Banner */}
          <div
            className={`rounded-2xl border p-5 backdrop-blur-md transition-colors ${
              !validation.isValid
                ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(243,66,113,0.1)]'
                : validation.hasWarnings
                ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className={`flex items-center gap-3 font-bold text-sm ${
                  !validation.isValid ? 'text-rose-400' : validation.hasWarnings ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {!validation.isValid ? (
                    <><AlertOctagon className="h-6 w-6 animate-pulse" /><span>Non conforme (Règles FRBE)</span></>
                  ) : validation.hasWarnings ? (
                    <><AlertTriangle className="h-6 w-6" /><span>Avertissements FRBE</span></>
                  ) : (
                    <><CheckCircle className="h-6 w-6" /><span>Composition valide</span></>
                  )}
                </div>
                
                {/* List of violations / warnings */}
                {validation.violations.length > 0 && (
                  <div className="mt-3 space-y-1 text-xs">
                    {validation.violations.map((v, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 font-medium ${
                          v.type === 'error' ? 'text-rose-300' : 'text-amber-300'
                        }`}
                      >
                        <span className="text-white/30 mt-0.5">•</span>
                        <span>{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matchup Stats */}
              <div className="flex items-center gap-4 bg-black/30 rounded-xl p-3 border border-white/5 shrink-0">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Moyenne {clubName}</div>
                  <div className="text-xl font-bold text-slate-100">{validation.averageElo || 'NC'}</div>
                </div>
                {teamScout && (
                  <>
                    <Swords className="h-5 w-5 text-indigo-400 opacity-50" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">{teamScout.opponentTeamName}</div>
                      <div className="text-xl font-bold text-slate-300">{teamScout.opponentAverageElo || 'NC'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Boards Assignment Grid */}
          <div className="glass-panel p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
              <h3 className="font-bold text-slate-100 text-sm">
                Échiquiers ({validation.assignedCount} / {validation.totalBoards})
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFill}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                  title="Remplit automatiquement les places vides de cette équipe avec les joueurs du deck (triés par Elo)"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto-fill
                </button>
                <button
                  onClick={() => clearDraft(teamNumber)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Vider l'équipe
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {assignedBoards.map((b) => {
                const isSelectedForDrop = selectedDeckPlayerId !== null && !b.player;
                const willReplace = selectedDeckPlayerId !== null && b.player;
                
                return (
                  <div
                    key={b.board}
                    onClick={() => handleBoardClick(b.board, b.player?.idnumber)}
                    className={`flex items-center gap-4 rounded-xl border p-3 transition-all duration-200 ${
                      selectedDeckPlayerId !== null
                        ? 'cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30'
                        : b.player ? 'cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400' : 'bg-black/20 border-white/5'
                    } ${
                      !b.player ? 'border-dashed border-white/20 bg-black/20' : 'border-white/10 bg-black/40'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold shrink-0 shadow-inner ${
                      b.player 
                        ? 'bg-indigo-500/20 border-indigo-500/20 text-indigo-300' 
                        : 'bg-white/5 border-white/10 text-slate-500'
                    }`}>
                      {b.board}
                    </span>

                    <div className="flex-1 min-w-0">
                      {b.player ? (
                        <div>
                          <div className={`font-bold text-sm truncate ${willReplace ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {b.player.last_name} {b.player.first_name}
                          </div>
                          <div className={`text-xs mt-0.5 ${willReplace ? 'line-through text-slate-600' : 'text-slate-400'}`}>
                            {b.player.assignedrating || 'NC'} Elo
                          </div>
                        </div>
                      ) : (
                        <div className={`text-sm italic ${isSelectedForDrop ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
                          {isSelectedForDrop ? 'Cliquer pour assigner' : 'Échiquier vide'}
                        </div>
                      )}
                    </div>

                    {b.player && selectedDeckPlayerId === null && (
                      <div className="text-slate-500 p-2">
                        <X className="h-5 w-5" />
                      </div>
                    )}
                    {willReplace && (
                      <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider p-2">
                        Remplacer
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <PlayerSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        players={players}
      />
    </div>
  );
};

