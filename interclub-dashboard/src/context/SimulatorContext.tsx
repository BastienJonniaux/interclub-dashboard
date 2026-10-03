import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClub } from './ClubContext';

export type AvailabilityStatus = 'available' | 'unavailable' | 'tentative';

export interface PlayerSettings {
  isIgnored?: boolean;
  isBackup?: boolean;
}

interface SimulatorContextType {
  availability: { [playerId: number]: AvailabilityStatus };
  setPlayerAvailability: (playerId: number, status: AvailabilityStatus) => void;
  playerSettings: { [playerId: number]: PlayerSettings };
  setPlayerSetting: (playerId: number, setting: keyof PlayerSettings, value: boolean) => void;
  draftCompositions: { [teamNumber: number]: { [board: number]: number | null } };
  assignPlayerToBoard: (teamNumber: number, board: number, playerId: number | null) => void;
  clearDraft: (teamNumber?: number) => void;
  autoFillTeam: (teamNumber: number, boardCount: number, availablePlayers: number[]) => void;
}

const SimulatorContext = createContext<SimulatorContextType>({
  availability: {},
  setPlayerAvailability: () => {},
  playerSettings: {},
  setPlayerSetting: () => {},
  draftCompositions: {},
  assignPlayerToBoard: () => {},
  clearDraft: () => {},
  autoFillTeam: () => {},
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

  const setPlayerAvailability = (playerId: number, status: AvailabilityStatus) => {
    const updated = { ...availability, [playerId]: status };
    setAvailability(updated);
    saveState(updated, playerSettings, draftCompositions);
  };

  const setPlayerSetting = (playerId: number, setting: keyof PlayerSettings, value: boolean) => {
    const updatedSettings = {
      ...playerSettings,
      [playerId]: {
        ...(playerSettings[playerId] || {}),
        [setting]: value,
      },
    };
    setPlayerSettings(updatedSettings);
    saveState(availability, updatedSettings, draftCompositions);
  };

  const assignPlayerToBoard = (teamNumber: number, board: number, playerId: number | null) => {
    let updatedDrafts = { ...draftCompositions };

    // If we are assigning a real player (not clearing), remove them from any other board across all teams
    if (playerId !== null) {
      Object.keys(updatedDrafts).forEach((tNumStr) => {
        const tNum = Number(tNumStr);
        const teamDraft = { ...updatedDrafts[tNum] };
        let teamChanged = false;
        
        Object.keys(teamDraft).forEach((bNumStr) => {
          if (teamDraft[Number(bNumStr)] === playerId) {
            delete teamDraft[Number(bNumStr)];
            teamChanged = true;
          }
        });

        if (teamChanged) {
          updatedDrafts[tNum] = teamDraft;
        }
      });
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

  return (
    <SimulatorContext.Provider
      value={{
        availability,
        setPlayerAvailability,
        playerSettings,
        setPlayerSetting,
        draftCompositions,
        assignPlayerToBoard,
        clearDraft,
        autoFillTeam
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => useContext(SimulatorContext);
