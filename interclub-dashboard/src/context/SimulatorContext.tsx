import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClub } from './ClubContext';
import { RESERVE_ELO_LIMITS } from '../domain/rules/frbeValidator';

export type AvailabilityStatus = 'available' | 'unavailable' | 'tentative';

export interface PlayerSettings {
  isIgnored?: boolean;
  isBackup?: boolean;
}

interface SimulatorContextType {
  availability: { [playerId: number]: AvailabilityStatus };
  setPlayerAvailability: (playerId: number, status: AvailabilityStatus) => void;
  setAllPlayersAvailability: (playerIds: number[], status: AvailabilityStatus) => void;
  playerSettings: { [playerId: number]: PlayerSettings };
  setPlayerSetting: (playerId: number, setting: keyof PlayerSettings, value: boolean) => void;
  draftCompositions: { [teamNumber: number]: { [board: number]: number | null } };
  assignPlayerToBoard: (teamNumber: number, board: number, playerId: number | null) => void;
  swapPlayers: (playerId1: number, playerId2: number) => void;
  clearDraft: (teamNumber?: number) => void;
  autoFillTeam: (teamNumber: number, boardCount: number, availablePlayers: number[]) => void;
  autoFillAllTeams: (teams: { teamNumber: number; boardCount: number; division: number }[], availablePlayersList: any[]) => void;
}

const SimulatorContext = createContext<SimulatorContextType>({
  availability: {},
  setPlayerAvailability: () => {},
  setAllPlayersAvailability: () => {},
  playerSettings: {},
  setPlayerSetting: () => {},
  draftCompositions: {},
  assignPlayerToBoard: () => {},
  swapPlayers: () => {},
  clearDraft: () => {},
  autoFillTeam: () => {},
  autoFillAllTeams: () => {},
});

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { clubId } = useClub();
  const storageKey = `interclub_sim_${clubId}`;

  const [availability, setAvailability] = useState<{ [playerId: number]: AvailabilityStatus }>({});
  const [playerSettings, setPlayerSettings] = useState<{ [playerId: number]: PlayerSettings }>({});
  const [draftCompositions, setDraftCompositions] = useState<{
    [teamNumber: number]: { [board: number]: number | null };
  }>({});

  // Load from localStorage on club change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAvailability(parsed.availability || {});
        setPlayerSettings(parsed.playerSettings || {});
        setDraftCompositions(parsed.draftCompositions || {});
      } else {
        setAvailability({});
        setPlayerSettings({});
        setDraftCompositions({});
      }
    } catch {
      setAvailability({});
      setPlayerSettings({});
      setDraftCompositions({});
    }
  }, [clubId, storageKey]);

  // Save to localStorage when state changes
  const saveState = (
    newAvail: { [playerId: number]: AvailabilityStatus },
    newSettings: { [playerId: number]: PlayerSettings },
    newDrafts: { [teamNumber: number]: { [board: number]: number | null } }
  ) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          availability: newAvail,
          playerSettings: newSettings,
          draftCompositions: newDrafts,
        })
      );
    } catch {
      // Ignore
    }
  };

  const removePlayersFromDrafts = (
    playerIdsToRemove: Set<number>,
    currentDrafts: { [teamNumber: number]: { [board: number]: number | null } }
  ) => {
    let updatedDrafts = { ...currentDrafts };
    let draftsChanged = false;
    Object.keys(updatedDrafts).forEach((tNumStr) => {
      const tNum = Number(tNumStr);
      const teamDraft = { ...updatedDrafts[tNum] };
      let teamChanged = false;
      
      Object.keys(teamDraft).forEach((bNumStr) => {
        const pid = teamDraft[Number(bNumStr)];
        if (pid !== null && playerIdsToRemove.has(pid)) {
          delete teamDraft[Number(bNumStr)];
          teamChanged = true;
          draftsChanged = true;
        }
      });

      if (teamChanged) {
        updatedDrafts[tNum] = teamDraft;
      }
    });
    return { updatedDrafts, draftsChanged };
  };

  const setPlayerAvailability = (playerId: number, status: AvailabilityStatus) => {
    const updatedAvail = { ...availability, [playerId]: status };
    let updatedDrafts = { ...draftCompositions };

    if (status === 'unavailable') {
      const result = removePlayersFromDrafts(new Set([playerId]), updatedDrafts);
      if (result.draftsChanged) {
        updatedDrafts = result.updatedDrafts;
        setDraftCompositions(updatedDrafts);
      }
    }

    setAvailability(updatedAvail);
    saveState(updatedAvail, playerSettings, updatedDrafts);
  };

  const setAllPlayersAvailability = (playerIds: number[], status: AvailabilityStatus) => {
    const updatedAvail = { ...availability };
    playerIds.forEach(id => {
      updatedAvail[id] = status;
    });
    let updatedDrafts = { ...draftCompositions };

    if (status === 'unavailable') {
      const result = removePlayersFromDrafts(new Set(playerIds), updatedDrafts);
      if (result.draftsChanged) {
        updatedDrafts = result.updatedDrafts;
        setDraftCompositions(updatedDrafts);
      }
    }

    setAvailability(updatedAvail);
    saveState(updatedAvail, playerSettings, updatedDrafts);
  };

  const setPlayerSetting = (playerId: number, setting: keyof PlayerSettings, value: boolean) => {
    const updatedSettings = {
      ...playerSettings,
      [playerId]: {
        ...(playerSettings[playerId] || {}),
        [setting]: value,
      },
    };
    let updatedDrafts = { ...draftCompositions };

    if (setting === 'isIgnored' && value === true) {
      const result = removePlayersFromDrafts(new Set([playerId]), updatedDrafts);
      if (result.draftsChanged) {
        updatedDrafts = result.updatedDrafts;
        setDraftCompositions(updatedDrafts);
      }
    }

    setPlayerSettings(updatedSettings);
    saveState(availability, updatedSettings, updatedDrafts);
  };

  const assignPlayerToBoard = (teamNumber: number, board: number, playerId: number | null) => {
    let updatedDrafts = { ...draftCompositions };

    // If we are assigning a real player (not clearing), remove them from any other board across all teams
    if (playerId !== null) {
      const result = removePlayersFromDrafts(new Set([playerId]), updatedDrafts);
      updatedDrafts = result.updatedDrafts;
    }

    // Now assign them to the target team and board
    const targetTeamDraft = { ...(updatedDrafts[teamNumber] || {}) };
    if (playerId === null) {
      delete targetTeamDraft[board];
    } else {
      targetTeamDraft[board] = playerId;
    }
    updatedDrafts[teamNumber] = targetTeamDraft;

    setDraftCompositions(updatedDrafts);
    saveState(availability, playerSettings, updatedDrafts);
  };

  const swapPlayers = (playerId1: number, playerId2: number) => {
    let updatedDrafts = { ...draftCompositions };
    
    let pos1: { t: number, b: number } | null = null;
    let pos2: { t: number, b: number } | null = null;

    Object.keys(updatedDrafts).forEach((tStr) => {
      const t = Number(tStr);
      Object.keys(updatedDrafts[t]).forEach((bStr) => {
        const b = Number(bStr);
        if (updatedDrafts[t][b] === playerId1) pos1 = { t, b };
        if (updatedDrafts[t][b] === playerId2) pos2 = { t, b };
      });
    });

    // We build the changes to apply, to avoid conflicts if they are on the same team
    const updatesByTeam: { [t: number]: { [b: number]: number | null } } = {};

    if (pos1) {
      if (!updatesByTeam[pos1.t]) updatesByTeam[pos1.t] = {};
      updatesByTeam[pos1.t][pos1.b] = playerId2;
    } else if (pos2) {
      // playerId1 is in deck, they go to pos2
      if (!updatesByTeam[pos2.t]) updatesByTeam[pos2.t] = {};
      updatesByTeam[pos2.t][pos2.b] = playerId1;
    }

    if (pos2) {
      if (!updatesByTeam[pos2.t]) updatesByTeam[pos2.t] = {};
      updatesByTeam[pos2.t][pos2.b] = playerId1;
    } else if (pos1) {
      // playerId2 is in deck, they go to pos1
      if (!updatesByTeam[pos1.t]) updatesByTeam[pos1.t] = {};
      updatesByTeam[pos1.t][pos1.b] = playerId2;
    }

    // Apply all updates
    Object.keys(updatesByTeam).forEach(tStr => {
      const t = Number(tStr);
      const targetTeamDraft = { ...(updatedDrafts[t] || {}) };
      
      Object.keys(updatesByTeam[t]).forEach(bStr => {
        const b = Number(bStr);
        const val = updatesByTeam[t][b];
        if (val === null) {
          delete targetTeamDraft[b];
        } else {
          targetTeamDraft[b] = val;
        }
      });
      
      updatedDrafts[t] = targetTeamDraft;
    });

    setDraftCompositions(updatedDrafts);
    saveState(availability, playerSettings, updatedDrafts);
  };

  const clearDraft = (teamNumber?: number) => {
    let updated: { [teamNumber: number]: { [board: number]: number | null } };
    if (teamNumber) {
      updated = { ...draftCompositions, [teamNumber]: {} };
    } else {
      updated = {};
    }
    setDraftCompositions(updated);
    saveState(availability, playerSettings, updated);
  };

  const autoFillTeam = (teamNumber: number, boardCount: number, availablePlayers: number[]) => {
    // availablePlayers is already filtered by availability, not ignored, not already assigned to other teams, and sorted by ELO
    const teamDraft = { ...(draftCompositions[teamNumber] || {}) };
    
    // First, find which boards are empty
    const emptyBoards: number[] = [];
    for (let b = 1; b <= boardCount; b++) {
      if (!teamDraft[b]) emptyBoards.push(b);
    }

    // Now take the top N available players
    const toAssign = availablePlayers.slice(0, emptyBoards.length);
    
    toAssign.forEach((playerId, index) => {
      teamDraft[emptyBoards[index]] = playerId;
    });

    const updated = { ...draftCompositions, [teamNumber]: teamDraft };
    setDraftCompositions(updated);
    saveState(availability, playerSettings, updated);
  };

  const autoFillAllTeams = (teams: { teamNumber: number; boardCount: number; division: number }[], availablePlayersList: any[]) => {
    let updatedDrafts = { ...draftCompositions };
    const globalAssignedIds = new Set<number>();
    
    // Collect currently assigned to keep them or not? 
    // Usually auto-fill fills EMPTY spots.
    Object.values(updatedDrafts).forEach(teamDraft => {
      Object.values(teamDraft).forEach(id => {
        if (id !== null) globalAssignedIds.add(id);
      });
    });

    teams.forEach(({ teamNumber, boardCount, division }) => {
      const teamDraft = { ...(updatedDrafts[teamNumber] || {}) };
      const emptyBoards: number[] = [];
      for (let b = 1; b <= boardCount; b++) {
        if (!teamDraft[b]) emptyBoards.push(b);
      }

      let assignedCount = 0;
      for (const p of availablePlayersList) {
        if (assignedCount >= emptyBoards.length) break;
        if (globalAssignedIds.has(p.idnumber)) continue;
        
        // Eligibility logic
        const titularMatch = (p.titular || '').match(/(\d+)/);
        const titularTeam = titularMatch ? parseInt(titularMatch[1], 10) : 0;
        let isEligible = false;
        
        if (titularTeam === teamNumber) {
          isEligible = true;
        } else if (titularTeam > 0 && titularTeam < teamNumber) {
          isEligible = false;
        } else {
          // Check limits. RESERVE_ELO_LIMITS from domain
          const limit = RESERVE_ELO_LIMITS[division] || 9999;
          isEligible = (p.assignedrating || 0) <= limit;
        }
        
        if (isEligible && division === 1 && (p.assignedrating || 0) < 1800) {
          isEligible = false;
        }

        if (isEligible) {
          teamDraft[emptyBoards[assignedCount]] = p.idnumber;
          globalAssignedIds.add(p.idnumber);
          assignedCount++;
        }
      }
      
      updatedDrafts[teamNumber] = teamDraft;
    });

    setDraftCompositions(updatedDrafts);
    saveState(availability, playerSettings, updatedDrafts);
  };

  return (
    <SimulatorContext.Provider
      value={{
        availability,
        setPlayerAvailability,
        setAllPlayersAvailability,
        playerSettings,
        setPlayerSetting,
        draftCompositions,
        assignPlayerToBoard,
        swapPlayers,
        clearDraft,
        autoFillTeam,
        autoFillAllTeams
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => useContext(SimulatorContext);
