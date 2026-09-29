import React, { createContext, useContext, useState, useEffect } from 'react';

interface ClubContextType {
  clubId: number;
  setClubId: (id: number) => void;
  clubName: string;
  setClubName: (name: string) => void;
}

const DEFAULT_CLUB_ID = 541; // Leuze-En-Hainaut

const ClubContext = createContext<ClubContextType>({
  clubId: DEFAULT_CLUB_ID,
  setClubId: () => {},
  clubName: 'Leuze-En-Hainaut',
  setClubName: () => {},
});

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clubId, setClubIdState] = useState<number>(() => {
    const saved = localStorage.getItem('interclub_selected_club_id');
    return saved ? parseInt(saved, 10) : DEFAULT_CLUB_ID;
  });

  const [clubName, setClubName] = useState<string>('Leuze-En-Hainaut');

  const setClubId = (id: number) => {
    setClubIdState(id);
    localStorage.setItem('interclub_selected_club_id', id.toString());
  };

  return (
    <ClubContext.Provider value={{ clubId, setClubId, clubName, setClubName }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => useContext(ClubContext);
