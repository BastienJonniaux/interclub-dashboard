import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClub } from './ClubContext';

export type AvailabilityStatus = 'available' | 'unavailable' | 'tentative';

interface SimulatorContextType {
  availability: { [playerId: number]: AvailabilityStatus };
  setPlayerAvailability: (playerId: number, status: AvailabilityStatus) => void;
  draftCompositions: { [teamNumber: number]: { [board: number]: number | null } };
  assignPlayerToBoard: (teamNumber: number, board: number, playerId: number | null) => void;
  clearDraft: (teamNumber?: number) => void;
}

const SimulatorContext = createContext<SimulatorContextType>({
  availability: {},
  setPlayerAvailability: () => {},
  draftCompositions: {},
  assignPlayerToBoard: () => {},
  clearDraft: () => {},
});

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { clubId } = useClub();
  const storageKey = `interclub_sim_${clubId}`;

  const [availability, setAvailability] = useState<{ [playerId: number]: AvailabilityStatus }>({});
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
        setDraftCompositions(parsed.draftCompositions || {});
      } else {
        setAvailability({});
        setDraftCompositions({});
      }
    } catch {
      setAvailability({});
      setDraftCompositions({});
    }
  }, [clubId, storageKey]);

  // Save to localStorage when state changes
  const saveState = (
    newAvail: { [playerId: number]: AvailabilityStatus },
    newDrafts: { [teamNumber: number]: { [board: number]: number | null } }
  ) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          availability: newAvail,
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
    saveState(updated, draftCompositions);
  };

  const assignPlayerToBoard = (teamNumber: number, board: number, playerId: number | null) => {
    const teamDraft = { ...(draftCompositions[teamNumber] || {}) };
    if (playerId === null) {
      delete teamDraft[board];
    } else {
      // If player already assigned elsewhere in this team, remove from old board
      Object.keys(teamDraft).forEach((b) => {
        if (teamDraft[Number(b)] === playerId) {
          delete teamDraft[Number(b)];
        }
      });
      teamDraft[board] = playerId;
    }

    const updated = { ...draftCompositions, [teamNumber]: teamDraft };
    setDraftCompositions(updated);
    saveState(availability, updated);
  };

  const clearDraft = (teamNumber?: number) => {
    let updated: { [teamNumber: number]: { [board: number]: number | null } };
    if (teamNumber) {
      updated = { ...draftCompositions, [teamNumber]: {} };
    } else {
      updated = {};
    }
    setDraftCompositions(updated);
    saveState(availability, updated);
  };

  return (
    <SimulatorContext.Provider
      value={{
        availability,
        setPlayerAvailability,
        draftCompositions,
        assignPlayerToBoard,
        clearDraft,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => useContext(SimulatorContext);
