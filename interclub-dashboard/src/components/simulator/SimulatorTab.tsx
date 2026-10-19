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
import { getDivisionBadgeStyle } from '../../domain/standings';
import { PlayerSettingsModal } from './PlayerSettingsModal';
import { PlayerHoverCard } from '../common/PlayerHoverCard';
import { DirectorAuthModal } from '../common/DirectorAuthModal';
import {
  checkServerHealth,
  fetchRoundDrafts,
  saveRoundDrafts,
  lockRound,
  fetchRoundAttendances,
  saveRoundAttendances,
  getStoredDirectorKey,
} from '../../api/backendClient';
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
  Settings,
  Undo2,
  Cloud,
  CloudUpload,
  CloudDownload,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Plus,
  Copy,
} from 'lucide-react';

interface Props {
  players: PlayerFrbe[];
  teams: TeamFrbe[];
  clubName: string;
  scouting?: NextMatchScout[];
}

export const SimulatorTab: React.FC<Props> = ({ players, teams, clubName, scouting = [] }) => {
  const {
    selectedRound,
    setSelectedRound,
    draftCompositionsByRound,
    copyRoundDraft,
    availability,
    setPlayerAvailability,
    setAllPlayersAvailability,
    playerSettings,
    draftCompositions,
    assignPlayerToBoard,
    swapPlayers,
    clearDraft,
    undoDraftChange,
    canUndo,
    autoFillTeam,
    autoFillAllTeams,
    applyRoundDraftsFromExternal,
    applyAttendancesFromExternal,
  } = useSimulator();

  const [selectedTeamIndex, setSelectedTeamIndex] = useState(-1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Server & DB Sync State
  const [serverState, setServerState] = useState<{ checked: boolean; online: boolean; db: boolean }>({
    checked: false,
    online: false,
    db: false,
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'save' | 'load' | 'lock' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [roundLocked, setRoundLocked] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Check backend server health on mount
  useEffect(() => {
    checkServerHealth().then(status => {
      setServerState({ checked: true, online: status.online, db: status.database });
    });
  }, []);

  // Check round lock status when selectedRound changes
  useEffect(() => {
    fetchRoundDrafts(selectedRound).then(res => {
      if (res && !res.isRestricted) {
        setRoundLocked(res.isLocked);
      } else {
        setRoundLocked(false);
      }
    });
  }, [selectedRound]);

  const handleSaveToServer = async (retryWithKey?: boolean) => {
    const directorKey = getStoredDirectorKey();
    if (!directorKey && !retryWithKey) {
      setAuthAction('save');
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    setSyncFeedback(null);

    // Build drafts payload
    const draftsPayload: Record<number, any> = {};
    teams.forEach((t, i) => {
      const tNum = i + 1;
      const roundDraft =
        draftCompositionsByRound[selectedRound]?.[tNum] ||
        (selectedRound === 2 ? draftCompositions[tNum] : {}) ||
        {};
      const bCount = getBoardCountForDivision(t.division);
      const boards: any[] = [];
      for (let b = 1; b <= bCount; b++) {
        const pid = roundDraft[b];
        if (pid) {
          const pl = players.find(p => p.idnumber === pid);
          boards.push({
            board: b,
            playerId: pid,
            playerName: pl ? `${pl.last_name} ${pl.first_name}` : `Matr. ${pid}`,
            playerRating: pl?.assignedrating || 0,
          });
        }
      }
      draftsPayload[tNum] = {
        divisionLabel: `${t.division}${t.index || 'A'}`,
        boards,
      };
    });

    const resDrafts = await saveRoundDrafts(selectedRound, draftsPayload);
    if (!resDrafts.success) {
      setIsSaving(false);
      setSyncFeedback({ type: 'error', message: resDrafts.error || 'Erreur lors de la sauvegarde.' });
      if (resDrafts.error?.includes('Clé') || resDrafts.error?.includes('refusé')) {
        setAuthAction('save');
        setIsAuthModalOpen(true);
      }
      return;
    }

    // Also persist attendances for the round
    const attPayload: Record<number, any> = {};
    players.forEach(p => {
      const st = availability[p.idnumber] || 'tentative';
      attPayload[p.idnumber] = {
        status: st,
        playerName: `${p.last_name} ${p.first_name}`,
      };
    });
    await saveRoundAttendances(selectedRound, attPayload);

    setIsSaving(false);
    setSyncFeedback({
      type: 'success',
      message: `Compositions & présences de la ronde ${selectedRound} sauvegardées sur la base de données.`,
    });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleLoadFromServer = async () => {
    setIsLoadingServer(true);
    setSyncFeedback(null);

    const [draftRes, attRes] = await Promise.all([
      fetchRoundDrafts(selectedRound),
      fetchRoundAttendances(selectedRound),
    ]);

    if (draftRes && draftRes.isRestricted) {
      setIsLoadingServer(false);
      setSyncFeedback({
        type: 'error',
        message: draftRes.error || `La ronde ${selectedRound} est confidentielle. Accès Directeur requis.`,
      });
      setAuthAction('load');
      setIsAuthModalOpen(true);
      return;
    }

    if (!draftRes && !attRes) {
      setIsLoadingServer(false);
      setSyncFeedback({ type: 'error', message: 'Impossible de joindre le serveur ou aucune donnée trouvée.' });
      return;
    }

    let loadedCount = 0;
    if (draftRes && Object.keys(draftRes.drafts).length > 0) {
      applyRoundDraftsFromExternal(selectedRound, draftRes.drafts);
      setRoundLocked(draftRes.isLocked);
      loadedCount = Object.keys(draftRes.drafts).length;
    }

    if (attRes && Object.keys(attRes).length > 0) {
      const newAvail: Record<number, any> = {};
      for (const [k, v] of Object.entries(attRes)) {
        newAvail[Number(k)] = (v as any).status || v;
      }
      applyAttendancesFromExternal(newAvail);
    }

    setIsLoadingServer(false);
    setSyncFeedback({
      type: 'success',
      message:
        loadedCount > 0
          ? `Compositions officielles de la ronde ${selectedRound} chargées (${loadedCount} équipes).`
          : `Aucune composition officielle trouvée sur le serveur pour la ronde ${selectedRound}.`,
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleToggleLock = async () => {
    const directorKey = getStoredDirectorKey();
    if (!directorKey) {
      setAuthAction('lock');
      setIsAuthModalOpen(true);
      return;
    }

    setIsLocking(true);
    const newLockState = !roundLocked;
    const res = await lockRound(selectedRound, newLockState);
    setIsLocking(false);

    if (res.success) {
      setRoundLocked(!!res.isLocked);
      setSyncFeedback({
        type: 'success',
        message: res.message || (newLockState ? 'Ronde verrouillée.' : 'Ronde déverrouillée.'),
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    } else {
      setSyncFeedback({ type: 'error', message: res.error || 'Erreur lors du verrouillage.' });
      if (res.error?.includes('Clé') || res.error?.includes('refusé')) {
        setAuthAction('lock');
        setIsAuthModalOpen(true);
      }
    }
  };
  
  const activeTeam = teams[selectedTeamIndex] || teams[0];
  const teamNumber = selectedTeamIndex + 1;
  const boardCount = activeTeam ? getBoardCountForDivision(activeTeam.division) : 6;

  const teamScout = scouting.find((s) => s.ourTeamName === activeTeam?.name);
  const isByeRound = teamScout?.opponentTeamName.toUpperCase().includes('BYE') || false;

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

  const deckCounts = useMemo(() => {
    let present = 0;
    let unknown = 0;
    let absent = 0;
    deckPlayers.forEach(p => {
      const status = availability[p.idnumber] || 'tentative';
      if (status === 'available') present++;
      else if (status === 'unavailable') absent++;
      else unknown++;
    });
    return { present, unknown, absent };
  }, [deckPlayers, availability]);

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

  // Handle Escape key to cancel selection, Ctrl+Z to undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPlayerId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (canUndo) {
          undoDraftChange();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undoDraftChange]);

  const currentlyAssignedIds = new Set(
    Object.values(currentDraft).filter((id): id is number => id !== null && id !== undefined)
  );

  const handleBoardClick = (board: number, currentOccupantId: number | undefined) => {
    if (selectedPlayerId !== null) {
      if (selectedPlayerId === currentOccupantId) {
        // Deselect if clicking the same player
        setSelectedPlayerId(null);
      } else if (currentOccupantId) {
        swapPlayers(selectedPlayerId, currentOccupantId);
        setSelectedPlayerId(null);
      } else {
        assignPlayerToBoard(teamNumber, board, selectedPlayerId);
        setSelectedPlayerId(null);
      }
    } else if (currentOccupantId) {
      setSelectedPlayerId(currentOccupantId);
    }
  };

  const handleAutoFill = () => {
    const eligiblePlayers = sortedClubPlayers.filter(p => {
      const status = availability[p.idnumber] || 'tentative';
      if (status === 'unavailable') return false;
      if (playerSettings[p.idnumber]?.isIgnored) return false;
      if (globalAssignments.has(p.idnumber)) return false;

      // ELIGIBILITY LOGIC
      let isEligible = true;
      if (selectedTeamIndex !== -1) {
        const activeTeamLimit = activeTeam ? RESERVE_ELO_LIMITS[activeTeam.division] || 9999 : 9999;
        const titularMatch = (p.titular || '').match(/(\d+)/);
        const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
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
      }

      return isEligible;
    });

    const eligibleIds = eligiblePlayers.map(p => p.idnumber);
    autoFillTeam(teamNumber, boardCount, eligibleIds);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Simulateur de Composition & Règles FRBE
        </h2>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          Sélectionnez un joueur dans le deck, puis cliquez sur un échiquier pour l'y assigner. Validation en direct des règles FRBE et force théorique.
        </p>
      </div>

      {/* Round Stepper Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/70 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Ronde :
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => {
              const isSelected = selectedRound === r;
              const hasDraft = Object.keys(draftCompositionsByRound[r] || {}).length > 0;
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 tabular-nums ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : hasDraft
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>R{r}</span>
                  {hasDraft && !isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedRound > 1 && (
          <button
            onClick={() => copyRoundDraft(selectedRound - 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
            title={`Copier la composition de la Ronde ${selectedRound - 1} vers la Ronde ${selectedRound}`}
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            <span>Copier R{selectedRound - 1}</span>
          </button>
        )}
      </div>

      <DirectorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthAction(null);
        }}
        onSuccess={() => {
          if (authAction === 'save') {
            handleSaveToServer(true);
          } else if (authAction === 'load') {
            handleLoadFromServer();
          } else if (authAction === 'lock') {
            handleToggleLock();
          } else {
            fetchRoundDrafts(selectedRound).then((res) => {
              if (res && !res.isRestricted) setRoundLocked(res.isLocked);
            });
          }
          setAuthAction(null);
        }}
      />

      {/* Server & DB Sync Bar */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-mono text-slate-500">
            <Cloud className="h-4 w-4 text-slate-600" />
            Base de données :
          </span>
          {serverState.checked && serverState.online && serverState.db ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/80 font-bold font-mono shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Connectée (PostgreSQL)
            </span>
          ) : serverState.checked ? (
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Local (Hors-ligne)
            </span>
          ) : (
            <span className="text-slate-500 font-mono">Vérification...</span>
          )}

          {roundLocked ? (
            <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg font-bold uppercase font-mono tracking-wider shadow-xs">
              <Lock className="h-3 w-3 text-amber-400" /> Ronde verrouillée
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-mono shadow-xs">
              <Unlock className="h-3 w-3 text-amber-600" /> Brouillon modifiable
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Load from server */}
          <button
            onClick={handleLoadFromServer}
            disabled={isLoadingServer}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-800 hover:bg-slate-100 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Télécharger la composition officielle et les disponibilités de cette ronde depuis la base de données"
          >
            <CloudDownload className={`h-3.5 w-3.5 text-slate-600 ${isLoadingServer ? 'animate-bounce' : ''}`} />
            <span>{isLoadingServer ? 'Chargement...' : 'Charger du serveur'}</span>
          </button>

          {/* Save to server (Director) */}
          <button
            onClick={() => handleSaveToServer(false)}
            disabled={isSaving || roundLocked}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white border border-emerald-700 px-3.5 py-1.5 text-xs font-mono font-bold hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title={roundLocked ? 'Cette ronde est verrouillée. Déverrouillez-la pour modifier.' : 'Enregistrer la composition actuelle sur la base de données'}
          >
            <CloudUpload className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder (Serveur)'}</span>
          </button>

          {/* Toggle lock */}
          <button
            onClick={handleToggleLock}
            disabled={isLocking}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border shadow-xs transition-colors cursor-pointer ${
              roundLocked
                ? 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
            title={roundLocked ? 'Déverrouiller pour permettre de nouvelles modifications' : 'Verrouiller pour figer la composition officielle'}
          >
            {roundLocked ? <Unlock className="h-3.5 w-3.5 text-rose-600" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
            <span>{roundLocked ? 'Déverrouiller' : 'Verrouiller'}</span>
          </button>

          {/* Director Key Settings */}
          <button
            onClick={() => {
              setAuthAction(null);
              setIsAuthModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Configurer la clé secrète du Directeur"
          >
            <KeyRound className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {syncFeedback && (
        <div
          className={`p-3 text-xs rounded-xl border flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : syncFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-sky-50 text-sky-800 border-sky-200'
          }`}
        >
          <span>{syncFeedback.message}</span>
          <button onClick={() => setSyncFeedback(null)} className="font-bold underline ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        {/* Left Column: Player Deck (Fixed elegant width) */}
        <div className="w-full lg:w-96 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200/70 rounded-xl shadow-sm p-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2 shrink-0">
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  Deck des joueurs ({deckPlayers.length})
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums" title="Présents">
                    <Check className="h-3 w-3" strokeWidth={3} /> {deckCounts.present}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums" title="À confirmer">
                    <HelpCircle className="h-3 w-3" strokeWidth={3} /> {deckCounts.unknown}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums" title="Absents">
                    <X className="h-3 w-3" strokeWidth={3} /> {deckCounts.absent}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                {/* Bulk availability actions */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 divide-x divide-slate-200 shadow-xs">
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'available')}
                    className="flex items-center justify-center p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-l-md transition-colors cursor-pointer"
                    title="Mettre tous les joueurs (non ignorés) présents"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'tentative')}
                    className="flex items-center justify-center p-1.5 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                    title="Mettre tous les joueurs (non ignorés) à confirmer"
                  >
                    <HelpCircle className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setAllPlayersAvailability(deckPlayers.filter(p => !playerSettings[p.idnumber]?.isIgnored).map(p => p.idnumber), 'unavailable')}
                    className="flex items-center justify-center p-1.5 text-rose-700 hover:bg-rose-50 rounded-r-md transition-colors cursor-pointer"
                    title="Mettre tous les joueurs (non ignorés) absents"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIgnored(!showIgnored)}
                    className={`text-xs font-mono font-bold p-1.5 rounded-lg transition-colors border shadow-xs cursor-pointer ${
                      showIgnored ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Afficher/Masquer les joueurs ignorés"
                  >
                    {showIgnored ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                    title="Gérer les joueurs (Saison)"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span>Config</span>
                  </button>
                </div>
              </div>
            </div>

            <div id="deck-container" className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar relative bg-slate-50/70 border border-slate-100 rounded-xl p-2.5" style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '400px' }}>
              {deckPlayers.map((p) => {
                const status = availability[p.idnumber] || 'tentative';
                const isSelected = selectedPlayerId === p.idnumber;
                const assignmentStr = globalAssignments.get(p.idnumber);
                const isAssignedHere = currentlyAssignedIds.has(p.idnumber);
                
                const isIgnored = playerSettings[p.idnumber]?.isIgnored;
                const isBackup = playerSettings[p.idnumber]?.isBackup;
                const isAbsent = status === 'unavailable';

                // Eligibility check for the currently active team
                let isEligible = true;
                if (selectedTeamIndex !== -1) {
                  const activeTeamLimit = activeTeam ? RESERVE_ELO_LIMITS[activeTeam.division] || 9999 : 9999;
                  const titularMatch = (p.titular || '').match(/(\d+)/);
                  const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
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
                }

                return (
                  <div
                    key={p.idnumber}
                    id={`deck-player-${p.idnumber}`}
                    onClick={() => {
                      if (selectedPlayerId !== null && selectedPlayerId !== p.idnumber) {
                        swapPlayers(selectedPlayerId, p.idnumber);
                        setSelectedPlayerId(null);
                      } else {
                        setSelectedPlayerId(isSelected ? null : p.idnumber);
                      }
                    }}
                    className={`cursor-pointer flex flex-col rounded-xl border p-2.5 transition-all duration-150 ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                        : isIgnored
                        ? 'bg-slate-100/70 border-slate-200 opacity-50 grayscale hover:opacity-80'
                        : isAbsent
                        ? 'bg-rose-50/30 border-slate-200 opacity-70 hover:opacity-100'
                        : isAssignedHere
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : assignmentStr
                        ? 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                        : isBackup
                        ? 'bg-amber-50/30 border-amber-200'
                        : status === 'available'
                        ? 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    } ${!isIgnored && !isAbsent && !isSelected && !isEligible ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Pastille discrète de disponibilité */}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              status === 'available'
                                ? 'bg-emerald-500'
                                : status === 'unavailable'
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                            }`}
                            title={status === 'available' ? 'Disponible' : status === 'unavailable' ? 'Absent' : 'À confirmer'}
                          />

                          <PlayerHoverCard playerName={`${p.last_name} ${p.first_name}`} expectedElo={p.assignedrating}>
                            <span className={`font-semibold text-sm truncate cursor-pointer ${
                              isSelected
                                ? 'text-emerald-800'
                                : isIgnored
                                ? 'text-slate-400 line-through'
                                : isAbsent
                                ? 'text-rose-700/80'
                                : 'text-slate-900 hover:text-emerald-700'
                            }`}>
                              {p.last_name} {p.first_name}
                            </span>
                          </PlayerHoverCard>

                          {p.titular && (
                            <span className="bg-slate-900 text-white px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase rounded shadow-xs shrink-0">
                              Tit. {p.titular}
                            </span>
                          )}
                          {isBackup && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 text-[9px] font-bold uppercase rounded shrink-0">
                              Rés.
                            </span>
                          )}
                          {!isEligible && !isIgnored && !isAbsent && (
                            <span className="text-[9px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 shrink-0">
                              Inéligible
                            </span>
                          )}
                        </div>

                        {assignmentStr && !isIgnored && (
                          <div className={`mt-1 text-[10px] font-bold font-mono uppercase tracking-wider pl-4 ${isAssignedHere ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isAssignedHere ? 'Assigné à cette équipe' : `Déjà placé : ${assignmentStr}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Compact Elo badge */}
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 tabular-nums">
                          {p.assignedrating || 'NC'}
                        </span>

                        {/* Discreet availability toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus =
                              status === 'tentative'
                                ? 'available'
                                : status === 'available'
                                ? 'unavailable'
                                : 'tentative';
                            setPlayerAvailability(p.idnumber, nextStatus);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 bg-white transition-colors cursor-pointer"
                          title={`Disponibilité : ${status === 'available' ? 'Disponible' : status === 'unavailable' ? 'Absent' : 'À confirmer'} (Cliquer pour alterner)`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              status === 'available'
                                ? 'bg-emerald-500'
                                : status === 'unavailable'
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-[10px] text-slate-500">
                            {status === 'available' ? 'Dispo' : status === 'unavailable' ? 'Absent' : 'À conf.'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {assignmentStr && !isIgnored && (
                      <div className={`mt-2 text-[10px] font-bold font-mono uppercase tracking-wider ${isAssignedHere ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isAssignedHere ? 'Assigné à cette équipe' : `Déjà placé : ${assignmentStr}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Teams Builder (Takes all remaining width) */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Team Tabs (Segmented Control) */}
          <div className="bg-slate-100/80 border border-slate-200/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => { setSelectedTeamIndex(-1); }}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                selectedTeamIndex === -1
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Aperçu Global
            </button>
            {teams.map((t, idx) => (
              <button
                key={t.name}
                type="button"
                onClick={() => { setSelectedTeamIndex(idx); }}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all rounded-xl flex items-center gap-2 cursor-pointer ${
                  selectedTeamIndex === idx
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <span>Équipe {idx + 1}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  selectedTeamIndex === idx ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  Div {t.division}{t.index}
                </span>
              </button>
            ))}
          </div>

          {selectedTeamIndex === -1 ? (
            <div className="bg-white border border-slate-200/70 rounded-xl shadow-sm p-5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg tracking-tight">Aperçu Global des Équipes</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Vue d'ensemble de toutes les compositions du club.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undoDraftChange}
                    disabled={!canUndo}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Annuler la dernière action (Ctrl+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    <span>Annuler</span>
                  </button>
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
                    className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Auto-fill Tout</span>
                  </button>
                  <button
                    onClick={() => clearDraft()}
                    className="inline-flex items-center gap-1.5 bg-white border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Vider Tout</span>
                  </button>
                </div>
              </div>

              {/* Cross-team validation banner for Global View */}
              {crossTeamViolations.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-800 text-sm mb-2">
                    <AlertOctagon className="h-5 w-5 text-rose-600" /> Non conforme (Moyennes Inter-équipes)
                  </div>
                  <ul className="text-xs space-y-1 text-rose-700">
                    {crossTeamViolations.map((v, i) => <li key={i}>• {v.message}</li>)}
                  </ul>
                </div>
              )}

              {selectedPlayerId !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                  <div className="text-xs font-bold text-emerald-800">
                    Mode sélection actif : cliquez sur une équipe pour échanger ou assigner le joueur.
                  </div>
                  <button 
                    onClick={() => setSelectedPlayerId(null)}
                    className="bg-white border border-emerald-300 px-2.5 py-1 text-[10px] uppercase font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {teams.map((t, idx) => {
                  const tNum = idx + 1;
                  const bCount = getBoardCountForDivision(t.division);
                  const tDraft = draftCompositions[tNum] || {};
                  
                  const boards: { board: number; player: PlayerFrbe | null }[] = [];
                  for (let b = 1; b <= bCount; b++) {
                    const pid = tDraft[b];
                    const p = pid ? players.find(x => x.idnumber === pid) || null : null;
                    boards.push({ board: b, player: p });
                  }

                  const assignedCount = boards.filter(b => b.player !== null).length;
                  const totalRatings = boards.reduce((sum, b) => sum + (b.player?.assignedrating || 0), 0);
                  const avgElo = assignedCount === bCount ? Math.round(totalRatings / bCount) : null;

                  return (
                    <div
                      key={tNum}
                      className="bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Team name + Division + Segmented Completion Gauge */}
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 text-sm">
                              Équipe {tNum}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md ${getDivisionBadgeStyle(t.division)}`}>
                              Div {t.division}{t.index}
                            </span>
                          </div>

                          {/* Segmented completion gauge (crans) */}
                          <div className="flex items-center gap-1.5 shrink-0" title={`${assignedCount}/${bCount} Joueurs assignés`}>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: bCount }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 w-3.5 rounded-full transition-colors ${
                                    i < assignedCount ? 'bg-emerald-500' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
                              {assignedCount}/{bCount}
                            </span>
                          </div>
                        </div>

                        {/* Subheader: Average Elo & View Team Link */}
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-mono tabular-nums">
                          <span>
                            Moyenne : <strong className="text-slate-800">{avgElo ? `${avgElo} Elo` : 'En attente'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedTeamIndex(idx)}
                            className="text-[11px] font-sans font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            Ouvrir l'équipe →
                          </button>
                        </div>

                        {/* Board slots (mini-list) */}
                        <div className="space-y-1.5">
                          {boards.map((b) => {
                            if (b.player) {
                              return (
                                <div
                                  key={b.board}
                                  onClick={() => {
                                    if (selectedPlayerId !== null) {
                                      swapPlayers(selectedPlayerId, b.player!.idnumber);
                                      setSelectedPlayerId(null);
                                    } else {
                                      setSelectedPlayerId(b.player!.idnumber);
                                    }
                                  }}
                                  className="border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 rounded-lg p-2 text-xs flex items-center justify-between transition-colors cursor-pointer"
                                  title={selectedPlayerId !== null ? `Échanger avec ${b.player.last_name}` : `Sélectionner ${b.player.last_name}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">#{b.board}</span>
                                    <span className="font-medium text-slate-800 truncate">
                                      {b.player.last_name} {b.player.first_name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 tabular-nums shrink-0">
                                    {b.player.assignedrating || 'NC'}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={b.board}
                                onClick={() => {
                                  if (selectedPlayerId !== null) {
                                    assignPlayerToBoard(tNum, b.board, selectedPlayerId);
                                    setSelectedPlayerId(null);
                                  } else {
                                    setSelectedTeamIndex(idx);
                                  }
                                }}
                                className="border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 rounded-lg p-2 text-xs text-slate-600 flex items-center justify-between transition-colors cursor-pointer"
                                title={selectedPlayerId !== null ? `Assigner le joueur sélectionné à l'échiquier ${b.board}` : `Cliquer pour gérer cette équipe`}
                              >
                                <span className="font-mono text-[10px] font-bold text-slate-600">#{b.board}</span>
                                <span className="italic text-slate-600 text-[11px]">
                                  {selectedPlayerId !== null ? 'Cliquer pour placer le joueur' : 'Échiquier libre'}
                                </span>
                                <span className="text-[10px] text-slate-300 font-mono">-</span>
                              </div>
                            );
                          })}
                        </div>
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
                className={`border rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${
                  !validation.isValid
                    ? 'bg-rose-50/80 border-rose-200'
                    : validation.hasWarnings
                    ? 'bg-amber-50/80 border-amber-200'
                    : 'bg-emerald-50/80 border-emerald-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className={`flex items-center gap-2.5 font-bold text-base sm:text-lg tracking-tight ${
                      !validation.isValid ? 'text-rose-800' : validation.hasWarnings ? 'text-amber-800' : 'text-emerald-800'
                    }`}>
                      {!validation.isValid ? (
                        <><AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" /><span>Non conforme (Règles FRBE)</span></>
                      ) : validation.hasWarnings ? (
                        <><AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" /><span>Avertissements FRBE</span></>
                      ) : (
                        <><CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /><span>Composition conforme FRBE</span></>
                      )}
                    </div>
                    
                    {/* List of violations / warnings */}
                    {validation.violations.length > 0 && (
                      <div className="mt-3 space-y-1.5 text-xs">
                        {validation.violations.map((v, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 font-medium ${
                              v.type === 'error' ? 'text-rose-700' : 'text-amber-700'
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
                  <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs shrink-0">
                    <div className="text-center font-mono tabular-nums">
                      <div className="text-[10px] uppercase font-bold text-slate-500 font-sans tracking-wider">Moyenne {clubName}</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">{validation.averageElo || 'NC'}</div>
                    </div>
                    {teamScout && (
                      <>
                        <Swords className="h-5 w-5 text-slate-300" />
                        <div className="text-center font-mono tabular-nums">
                          <div className="text-[10px] uppercase font-bold text-slate-500 font-sans tracking-wider truncate max-w-[110px]">{teamScout.opponentTeamName}</div>
                          <div className="text-lg sm:text-xl font-bold text-slate-700">{teamScout.opponentAverageElo || 'NC'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection banner */}
              {selectedPlayerId !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                  <div className="text-xs font-bold text-emerald-800">
                    Mode sélection : cliquez sur un autre joueur (ou un échiquier vide) pour échanger ou assigner.
                  </div>
                  <button 
                    onClick={() => setSelectedPlayerId(null)}
                    className="bg-white border border-emerald-300 px-2.5 py-1 text-[10px] uppercase font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {/* Boards Assignment Grid */}
              <div className="bg-white border border-slate-200/70 rounded-xl shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                      Échiquiers ({validation.assignedCount} / {validation.totalBoards})
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={undoDraftChange}
                      disabled={!canUndo}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Annuler la dernière action (Ctrl+Z)"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Annuler</span>
                    </button>
                    <button
                      onClick={handleAutoFill}
                      disabled={isByeRound}
                      className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Remplit automatiquement les places vides de cette équipe avec les joueurs du deck (triés par Elo)"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Auto-fill</span>
                    </button>
                    <button
                      onClick={() => clearDraft(teamNumber)}
                      disabled={isByeRound}
                      className="inline-flex items-center gap-1.5 bg-white border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Vider l'équipe</span>
                    </button>
                  </div>
                </div>

                {isByeRound ? (
                  <div className="mt-6 p-8 flex flex-col items-center justify-center text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="text-3xl font-bold font-mono text-slate-400 mb-2">BYE</div>
                    <div className="text-sm text-slate-500 font-medium max-w-md">
                      L'équipe est exempte (BYE) pour cette ronde. Aucun joueur ne doit être aligné.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Segmented completion gauge (crans) */}
                    <div className="mt-4 mb-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Taux de complétion</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {validation.assignedCount} / {validation.totalBoards} échiquiers ({Math.round((validation.assignedCount / Math.max(1, validation.totalBoards)) * 100)}%)
                        </span>
                      </div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${validation.totalBoards}, minmax(0, 1fr))` }}>
                        {Array.from({ length: validation.totalBoards }).map((_, idx) => {
                          const isFilled = idx < validation.assignedCount;
                          return (
                            <div
                              key={idx}
                              className={`h-2.5 rounded-sm transition-all duration-300 ${
                                isFilled ? 'bg-emerald-500 shadow-xs' : 'bg-slate-200'
                              }`}
                              title={`Échiquier ${idx + 1} : ${isFilled ? 'Rempli' : 'Vide'}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Board station slots */}
                    <div className="space-y-3">
                      {assignedBoards.map((b) => {
                        const isThisPlayerSelected = b.player?.idnumber === selectedPlayerId;
                        const isSelectedForDrop = selectedPlayerId !== null && !b.player;
                        const willSwap = selectedPlayerId !== null && !isThisPlayerSelected && b.player;
                        
                        return (
                          <div
                            key={b.board}
                            onClick={() => handleBoardClick(b.board, b.player?.idnumber)}
                            className={`flex items-center gap-3.5 rounded-xl border p-3 transition-all duration-200 ${
                              isThisPlayerSelected 
                                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500 cursor-pointer shadow-xs'
                                : selectedPlayerId !== null
                                ? 'cursor-pointer hover:bg-slate-50 hover:border-slate-300'
                                : b.player
                                ? 'cursor-pointer hover:border-slate-300 bg-white border-slate-200/80 shadow-xs'
                                : 'border border-slate-200/80 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/30'
                            }`}
                          >
                            <span className={`flex h-9 w-9 items-center justify-center font-mono font-bold text-sm shrink-0 rounded-lg border shadow-xs ${
                              isThisPlayerSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : b.player 
                                ? 'bg-slate-900 border-slate-900 text-white' 
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}>
                              {b.board}
                            </span>

                            <div className="flex-1 min-w-0">
                              {b.player ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <PlayerHoverCard playerName={`${b.player.last_name} ${b.player.first_name}`} expectedElo={b.player.assignedrating}>
                                      <div className={`font-semibold text-sm truncate ${
                                        isThisPlayerSelected ? 'text-emerald-800' : willSwap ? 'text-slate-500' : 'text-slate-900'
                                      }`}>
                                        {b.player.last_name} {b.player.first_name}
                                      </div>
                                    </PlayerHoverCard>
                                    <div className="text-xs mt-0.5 font-mono tabular-nums text-slate-500">
                                      <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80">
                                        {b.player.assignedrating || 'NC'}
                                      </span> Elo
                                    </div>
                                  </div>

                                  <div 
                                    className={`text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isThisPlayerSelected ? 'opacity-0 pointer-events-none' : ''
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      assignPlayerToBoard(teamNumber, b.board, null);
                                    }}
                                    title="Retirer ce joueur"
                                  >
                                    <X className="h-4 w-4" />
                                  </div>
                                </div>
                              ) : (
                                <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors ${
                                  isSelectedForDrop ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600'
                                }`}>
                                  <Plus className="h-4 w-4 text-slate-400" />
                                  <span>{isSelectedForDrop ? 'Cliquer pour assigner le joueur sélectionné' : `Échiquier ${b.board} libre — Cliquer pour assigner`}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
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




