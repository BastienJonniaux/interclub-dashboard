import React, { useState, useMemo, useEffect } from 'react';
import { PlayerFrbe, TeamFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import {
  validateTeamComposition,
  validateCrossTeamAverages,
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
    setAllPlayersAvailability,
    playerSettings,
    draftCompositions,
    assignPlayerToBoard,
    clearDraft,
    autoFillTeam,
    autoFillAllTeams
  } = useSimulator();

  const [selectedTeamIndex, setSelectedTeamIndex] = useState(-1);
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

  const crossTeamViolations = validateCrossTeamAverages(teams, draftCompositions, players);
  const relevantCrossViolations = crossTeamViolations.filter(v => v.message.includes(activeTeam?.name || ''));
  
  if (relevantCrossViolations.length > 0) {
    validation.violations.push(...relevantCrossViolations);
    if (relevantCrossViolations.some(v => v.type === 'error')) {
      validation.isValid = false;
    }
    if (relevantCrossViolations.some(v => v.type === 'warning')) {
      validation.hasWarnings = true;
    }
  }

  const sortedClubPlayers = useMemo(() => {
    return [...players].sort(
      (a, b) =>
        (b.assignedrating || 0) - (a.assignedrating || 0) ||
        a.last_name.localeCompare(b.last_name)
    );
  }, [players]);

  // Deck players grouped only by Ignored status so they don't jump when availability changes
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
      
      // Original sorting (Elo) is preserved
      return 0;
    });
  }, [sortedClubPlayers, playerSettings, showIgnored]);

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
      if (globalAssignments.has(p.idnumber)) return false;

      // ELIGIBILITY LOGIC
      const activeTeamLimit = activeTeam ? RESERVE_ELO_LIMITS[activeTeam.division] || 9999 : 9999;
      const titularMatch = (p.titular || '').match(/(\d+)/);
      const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
      let isEligible = false;
      if (titularTeam === teamNumber) {
        isEligible = true;
      } else if (titularTeam > 0 && titularTeam < teamNumber) {
        isEligible = false; // Cannot play down
      } else {
        isEligible = (p.assignedrating || 0) <= activeTeamLimit;
      }
      
      // Specific rule for Div 1: No player below 1800
      if (isEligible && activeTeam?.division === 1 && (p.assignedrating || 0) < 1800) {
        isEligible = false;
      }

      return isEligible;
    });

    const eligibleIds = eligiblePlayers.map(p => p.idnumber);
    autoFillTeam(teamNumber, boardCount, eligibleIds);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1918] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2DFD8]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-white tracking-tight">
            Simulateur de Composition & Règles FRBE
          </h2>
          <p className="text-sm text-[#E2DFD8] mt-2 max-w-3xl leading-relaxed">
            Sélectionnez un joueur dans le deck, puis cliquez sur un échiquier pour l'y assigner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Player Deck (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="chess-panel p-4 h-full flex flex-col bg-white border border-[#E2DFD8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2DFD8] gap-2 shrink-0">
              <h3 className="font-bold text-[#1A1918] text-sm flex items-center gap-2 font-serif">
                <UserPlus className="h-4 w-4 text-[#1E5E3A]" />
                Deck des joueurs ({deckPlayers.length})
              </h3>
              
              <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                {/* Bulk availability actions */}
                <div className="flex items-center border border-[#E2DFD8] bg-white divide-x divide-[#E2DFD8] mr-1">
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'available')}
                    className="flex items-center justify-center p-2 text-[#1E5E3A] hover:bg-[#1E5E3A]/10 transition-colors"
                    title="Mettre tous les joueurs (non ignorés) présents"
                  >
                    <Check className="h-3 w-3 md:h-5 md:w-5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'tentative')}
                    className="flex items-center justify-center p-2 text-[#B45309] hover:bg-[#B45309]/10 transition-colors"
                    title="Mettre tous les joueurs (non ignorés) à confirmer"
                  >
                    <HelpCircle className="h-3 w-3  md:h-5 md:w-5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'unavailable')}
                    className="flex items-center justify-center p-2 text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors"
                    title="Mettre tous les joueurs (non ignorés) absents"
                  >
                    <X className="h-3 w-3 md:h-5 md:w-5" strokeWidth={3} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIgnored(!showIgnored)}
                    className={`text-[10px] uppercase font-bold px-2 py-1.5 rounded-none transition-colors border ${
                      showIgnored ? 'bg-[#1A1918] text-white border-[#1A1918]' : 'bg-white text-[#6E6A64] border-[#E2DFD8] hover:bg-[#F9F8F6]'
                    }`}
                    title="Afficher/Masquer les joueurs ignorés"
                  >
                    {showIgnored ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold bg-white border border-[#E2DFD8] px-2 py-1.5 rounded-none text-[#1A1918] hover:bg-[#F9F8F6] transition-colors"
                    title="Gérer les joueurs (Saison)"
                  >
                    <Settings className="h-4 w-4" /> Config
                  </button>
                </div>
              </div>
            </div>

            <div id="deck-container" className="mt-4 flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar relative bg-[#F9F8F6] p-2" style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '400px' }}>
              {deckPlayers.map((p) => {
                const status = availability[p.idnumber] || 'tentative';
                const isSelected = selectedDeckPlayerId === p.idnumber;
                const assignmentStr = globalAssignments.get(p.idnumber);
                const isAssignedHere = currentlyAssignedIds.has(p.idnumber);
                
                const isIgnored = playerSettings[p.idnumber]?.isIgnored;
                const isBackup = playerSettings[p.idnumber]?.isBackup;
                const isAbsent = status === 'unavailable';

                // Eligibility check for the currently active team
                const activeTeamLimit = activeTeam ? RESERVE_ELO_LIMITS[activeTeam.division] || 9999 : 9999;
                const titularMatch = (p.titular || '').match(/(\d+)/);
                const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
                let isEligible = false;
                if (titularTeam === teamNumber) {
                  isEligible = true;
                } else if (titularTeam > 0 && titularTeam < teamNumber) {
                  isEligible = false; // Cannot play down
                } else {
                  isEligible = (p.assignedrating || 0) <= activeTeamLimit;
                }
                
                // Specific rule for Div 1: No player below 1800
                if (isEligible && activeTeam?.division === 1 && (p.assignedrating || 0) < 1800) {
                  isEligible = false;
                }

                return (
                  <div
                    key={p.idnumber}
                    id={`deck-player-${p.idnumber}`}
                    onClick={() => setSelectedDeckPlayerId(isSelected ? null : p.idnumber)}
                    className={`cursor-pointer flex flex-col rounded-none border p-3 transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#1E5E3A]/10 border-[#1E5E3A] ring-2 ring-[#1E5E3A]'
                        : isIgnored
                        ? 'bg-[#F9F8F6] border-[#E2DFD8] opacity-50 grayscale hover:opacity-80'
                        : isAbsent
                        ? 'bg-[#B91C1C]/10 border-l-8 border-[#B91C1C] opacity-75 hover:opacity-100'
                        : isAssignedHere
                        ? 'bg-[#1A1918]/10 border-l-8 border-[#1A1918] opacity-75 hover:opacity-100'
                        : assignmentStr
                        ? 'bg-white border-[#E2DFD8] opacity-70 hover:opacity-100'
                        : isBackup
                        ? 'bg-[#B45309]/10 border-l-8 border-[#B45309] opacity-90 hover:opacity-100'
                        : status === 'available'
                        ? 'bg-white border-l-8 border-[#1E5E3A] shadow-sm hover:shadow-md hover:bg-[#F9F8F6]'
                        : 'bg-white border-[#E2DFD8] hover:bg-[#F9F8F6]'
                    } ${!isIgnored && !isAbsent && !isSelected && !isEligible ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-bold font-serif ${isSelected ? 'text-[#1E5E3A]' : isIgnored ? 'text-[#6E6A64] line-through' : isAbsent ? 'text-[#B91C1C]/70' : 'text-[#1A1918]'}`}>
                          {p.last_name} {p.first_name}
                        </div>
                        <div className="text-[11px] text-[#6E6A64] mt-1 flex flex-wrap items-center gap-1.5">
                          <span><strong className={`font-mono ${isIgnored ? '' : 'text-[#1A1918]'}`}>{p.assignedrating || 'NC'}</strong> Elo</span>
                          {p.titular && (
                             <span className="bg-[#1A1918] text-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                              Tit. {p.titular}
                            </span>
                          )}
                          {isBackup && (
                            <span className="bg-white border border-[#E2DFD8] px-1.5 py-0.5 text-[9px] text-[#1A1918] font-bold uppercase">
                              Réserve
                            </span>
                          )}
                          {isAbsent && !isIgnored && (
                            <span className="bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                              Absent Ronde
                            </span>
                          )}
                          {!isEligible && !isIgnored && !isAbsent && (
                            <span className="text-[9px] font-bold text-[#B91C1C] uppercase">
                              Inéligible
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'available'); }}
                          className={`rounded-none p-1.5 transition-all border ${
                            status === 'available'
                              ? 'bg-[#1E5E3A]/20 text-[#1E5E3A] border-[#1E5E3A]'
                              : 'bg-white text-[#6E6A64] border-transparent hover:border-[#E2DFD8] hover:bg-[#F9F8F6]'
                          }`}
                          title="Présent pour cette ronde"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'tentative'); }}
                          className={`rounded-none p-1.5 transition-all border ${
                            status === 'tentative'
                              ? 'bg-[#B45309]/20 text-[#B45309] border-[#B45309]'
                              : 'bg-white text-[#6E6A64] border-transparent hover:border-[#E2DFD8] hover:bg-[#F9F8F6]'
                          }`}
                          title="À confirmer"
                        >
                          <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlayerAvailability(p.idnumber, 'unavailable'); }}
                          className={`rounded-none p-1.5 transition-all border ${
                            status === 'unavailable'
                              ? 'bg-[#B91C1C]/20 text-[#B91C1C] border-[#B91C1C]'
                              : 'bg-white text-[#6E6A64] border-transparent hover:border-[#E2DFD8] hover:bg-[#F9F8F6]'
                          }`}
                          title="Absent pour cette ronde"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {assignmentStr && !isIgnored && (
                      <div className={`mt-2 text-[10px] font-bold font-mono uppercase tracking-wider ${isAssignedHere ? 'text-[#1E5E3A]' : 'text-[#B45309]'}`}>
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
          <div className="bg-white border border-[#E2DFD8] p-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectedTeamIndex(-1); setSelectedDeckPlayerId(null); }}
              className={`px-4 py-2 text-sm font-bold transition-all duration-300 border ${
                selectedTeamIndex === -1
                  ? 'bg-[#1A1918] text-white border-[#1A1918]'
                  : 'bg-white text-[#6E6A64] border-[#E2DFD8] hover:bg-[#F9F8F6] hover:text-[#1A1918]'
              }`}
            >
              Aperçu Global
            </button>
            {teams.map((t, idx) => (
              <button
                key={t.name}
                type="button"
                onClick={() => { setSelectedTeamIndex(idx); setSelectedDeckPlayerId(null); }}
                className={`px-4 py-2 text-sm font-bold transition-all duration-300 border ${
                  selectedTeamIndex === idx
                    ? 'bg-[#1A1918] text-white border-[#1A1918]'
                    : 'bg-white text-[#6E6A64] border-[#E2DFD8] hover:bg-[#F9F8F6] hover:text-[#1A1918]'
                }`}
              >
                Équipe {idx + 1}
                <span className={`ml-2 text-[10px] font-mono ${selectedTeamIndex === idx ? 'text-[#E2DFD8]' : 'text-[#6E6A64]'}`}>
                  Div {t.division}{t.index}
                </span>
              </button>
            ))}
          </div>

          {selectedTeamIndex === -1 ? (
            <div className="chess-panel p-5 bg-white border border-[#E2DFD8] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DFD8] pb-4">
                <div>
                  <h3 className="font-bold text-[#1A1918] text-lg font-serif">Aperçu Global des Équipes</h3>
                  <p className="text-sm text-[#6E6A64]">Vue d'ensemble de toutes les compositions.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const eligiblePlayers = sortedClubPlayers.filter(p => {
                        const status = availability[p.idnumber] || 'tentative';
                        if (status === 'unavailable') return false;
                        if (playerSettings[p.idnumber]?.isIgnored) return false;
                        return true;
                      });
                      const teamsSpec = teams.map((t, i) => ({
                        teamNumber: i + 1,
                        boardCount: getBoardCountForDivision(t.division),
                        division: t.division
                      }));
                      autoFillAllTeams(teamsSpec, eligiblePlayers);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#F9F8F6] border border-[#E2DFD8] px-3 py-1.5 text-xs font-bold text-[#1A1918] hover:bg-white transition-colors"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Auto-fill Tout
                  </button>
                  <button
                    onClick={() => clearDraft()}
                    className="inline-flex items-center gap-1.5 bg-white border border-[#E2DFD8] px-3 py-1.5 text-xs font-bold text-[#B91C1C] hover:bg-[#F9F8F6] transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Vider Tout
                  </button>
                </div>
              </div>

              {/* Cross-team validation banner for Global View */}
              {crossTeamViolations.length > 0 && (
                <div className="bg-[#B91C1C]/5 border border-[#B91C1C] p-4">
                  <div className="flex items-center gap-2 font-bold font-serif text-[#B91C1C] mb-2">
                    <AlertOctagon className="h-5 w-5" /> Invalide (Moyennes Inter-équipes)
                  </div>
                  <ul className="text-sm space-y-1 text-[#B91C1C]">
                    {crossTeamViolations.map((v, i) => <li key={i}>• {v.message}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {teams.map((t, idx) => {
                  const tNum = idx + 1;
                  const bCount = getBoardCountForDivision(t.division);
                  const tDraft = draftCompositions[tNum] || {};
                  
                  let assignedPlayers = [];
                  for (let b = 1; b <= bCount; b++) {
                    const pid = tDraft[b];
                    if (pid) {
                      const p = players.find(x => x.idnumber === pid);
                      if (p) assignedPlayers.push(p);
                    }
                  }

                  const avgElo = assignedPlayers.length === bCount 
                    ? Math.round(assignedPlayers.reduce((sum, p) => sum + (p.assignedrating || 0), 0) / bCount)
                    : null;

                  return (
                    <div key={tNum} className="border border-[#E2DFD8] p-3 hover:bg-[#F9F8F6] transition-colors cursor-pointer" onClick={() => setSelectedTeamIndex(idx)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-[#1A1918] font-serif">Équipe {tNum} <span className="text-xs text-[#6E6A64] font-mono font-normal">Div {t.division}</span></div>
                        <div className="text-xs font-mono font-bold">{assignedPlayers.length}/{bCount} Joueurs</div>
                      </div>
                      <div className="text-[10px] text-[#6E6A64] mb-2">
                        Moyenne: <span className="font-bold text-[#1A1918]">{avgElo || 'NC'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignedPlayers.map(p => (
                          <span key={p.idnumber} className="text-[10px] bg-white border border-[#E2DFD8] px-1.5 py-0.5 truncate max-w-[100px]">
                            {p.last_name}
                          </span>
                        ))}
                        {assignedPlayers.length === 0 && <span className="text-[10px] text-[#6E6A64] italic">Vide</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Validation & Scouting Banner */}
              <div
            className={`border p-5 transition-colors ${
              !validation.isValid
                ? 'bg-[#B91C1C]/5 border-[#B91C1C]'
                : validation.hasWarnings
                ? 'bg-[#B45309]/5 border-[#B45309]'
                : 'bg-[#1E5E3A]/5 border-[#1E5E3A]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className={`flex items-center gap-3 font-bold font-serif text-lg ${
                  !validation.isValid ? 'text-[#B91C1C]' : validation.hasWarnings ? 'text-[#B45309]' : 'text-[#1E5E3A]'
                }`}>
                  {!validation.isValid ? (
                    <><AlertOctagon className="h-6 w-6" /><span>Non conforme (Règles FRBE)</span></>
                  ) : validation.hasWarnings ? (
                    <><AlertTriangle className="h-6 w-6" /><span>Avertissements FRBE</span></>
                  ) : (
                    <><CheckCircle className="h-6 w-6" /><span>Composition valide</span></>
                  )}
                </div>
                
                {/* List of violations / warnings */}
                {validation.violations.length > 0 && (
                  <div className="mt-4 space-y-2 text-xs">
                    {validation.violations.map((v, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 font-medium ${
                          v.type === 'error' ? 'text-[#B91C1C]' : 'text-[#B45309]'
                        }`}
                      >
                        <span className="font-bold mt-0.5">•</span>
                        <span>{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matchup Stats */}
              <div className="flex items-center gap-4 bg-white border border-[#E2DFD8] rounded-none p-3 shrink-0">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-[#6E6A64]">Moyenne {clubName}</div>
                  <div className="text-xl font-bold font-mono text-[#1A1918]">{validation.averageElo || 'NC'}</div>
                </div>
                {teamScout && (
                  <>
                    <Swords className="h-5 w-5 text-[#E2DFD8]" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase font-bold text-[#6E6A64]">{teamScout.opponentTeamName}</div>
                      <div className="text-xl font-bold font-mono text-[#1A1918]">{teamScout.opponentAverageElo || 'NC'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Boards Assignment Grid */}
          <div className="chess-panel p-5 bg-white border border-[#E2DFD8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2DFD8] gap-3">
              <h3 className="font-bold text-[#1A1918] text-sm font-serif">
                Échiquiers ({validation.assignedCount} / {validation.totalBoards})
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFill}
                  className="inline-flex items-center gap-1.5 bg-[#F9F8F6] border border-[#E2DFD8] px-3 py-1.5 text-xs font-bold text-[#1A1918] hover:bg-white transition-colors"
                  title="Remplit automatiquement les places vides de cette équipe avec les joueurs du deck (triés par Elo)"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto-fill
                </button>
                <button
                  onClick={() => clearDraft(teamNumber)}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#E2DFD8] px-3 py-1.5 text-xs font-bold text-[#B91C1C] hover:bg-[#F9F8F6] transition-colors"
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
                    className={`flex items-center gap-4 rounded-none border p-3 transition-all duration-200 ${
                      selectedDeckPlayerId !== null
                        ? 'cursor-pointer hover:bg-[#F9F8F6] hover:border-[#1A1918]'
                        : b.player ? 'cursor-pointer hover:bg-[#B91C1C]/5 hover:border-[#B91C1C] hover:text-[#B91C1C]' : 'bg-[#F9F8F6] border-[#E2DFD8]'
                    } ${
                      !b.player ? 'border-dashed border-[#E2DFD8] bg-[#F9F8F6]' : 'border-[#E2DFD8] bg-white'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                      b.player 
                        ? 'bg-[#1A1918] border-[#1A1918] text-white' 
                        : 'bg-white border-[#E2DFD8] text-[#6E6A64]'
                    }`}>
                      {b.board}
                    </span>

                    <div className="flex-1 min-w-0">
                      {b.player ? (
                        <div>
                          <div className={`font-bold font-serif text-sm truncate ${willReplace ? 'line-through text-[#6E6A64]' : 'text-[#1A1918]'}`}>
                            {b.player.last_name} {b.player.first_name}
                          </div>
                          <div className={`text-xs mt-0.5 font-mono ${willReplace ? 'line-through text-[#E2DFD8]' : 'text-[#6E6A64]'}`}>
                            {b.player.assignedrating || 'NC'} Elo
                          </div>
                        </div>
                      ) : (
                        <div className={`text-sm italic ${isSelectedForDrop ? 'text-[#1E5E3A] font-bold' : 'text-[#6E6A64]'}`}>
                          {isSelectedForDrop ? 'Cliquer pour assigner' : 'Échiquier vide'}
                        </div>
                      )}
                    </div>

                    {b.player && selectedDeckPlayerId === null && (
                      <div className="text-[#6E6A64] hover:text-[#B91C1C] transition-colors p-2">
                        <X className="h-5 w-5" />
                      </div>
                    )}
                    {willReplace && (
                      <div className="text-[#1E5E3A] text-xs font-bold font-mono tracking-wider p-2">
                        REMPLACER
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}
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

