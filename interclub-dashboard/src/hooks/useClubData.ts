import { useState, useEffect, useCallback } from 'react';
import { useClub } from '../context/ClubContext';
import {
  fetchClub,
  fetchRoundSeries,
  fetchVenues,
  fetchPlayerDirectory,
  isFallbackMode,
} from '../api/frbeClient';
import { clearCache } from '../api/cache';
import { ClubFrbe, DivisionFrbe, VenueFrbe } from '../modelsFRBE';
import { calculateClubPlayerStats, PlayerStats } from '../domain/performance';
import { calculateDivisionStandings, DivisionStandingTable } from '../domain/standings';
import { scoutNextMatch, NextMatchScout } from '../domain/scouting';

export interface ClubDataState {
  loading: boolean;
  error: string | null;
  club: ClubFrbe | null;
  venues: VenueFrbe[];
  playerStats: PlayerStats[];
  standings: DivisionStandingTable[];
  scouting: NextMatchScout[];
  allDivisions: DivisionFrbe[];
  playerDirectory: Map<number, { name: string; rating: number; clubName?: string }>;
  isFallback: boolean;
  refresh: () => Promise<void>;
}

export function useClubData(): ClubDataState {
  const { clubId, setClubName } = useClub();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [club, setClub] = useState<ClubFrbe | null>(null);
  const [venues, setVenues] = useState<VenueFrbe[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [standings, setStandings] = useState<DivisionStandingTable[]>([]);
  const [scouting, setScouting] = useState<NextMatchScout[]>([]);
  const [allDivisions, setAllDivisions] = useState<DivisionFrbe[]>([]);
  const [playerDirectory, setPlayerDirectory] = useState<
    Map<number, { name: string; rating: number; clubName?: string }>
  >(new Map());
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const loadData = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch club details
      const clubData = await fetchClub(clubId, bypassCache);
      setClub(clubData);
      setClubName(clubData.name);

      // 2. Fetch venues
      const venuesData = await fetchVenues(clubId, bypassCache).catch(() => []);
      setVenues(venuesData);

      // 3. Fetch player directory (all players names & ratings)
      const directory = await fetchPlayerDirectory();
      (clubData.players || []).forEach((p) => {
        directory.set(p.idnumber, {
          name: `${p.first_name} ${p.last_name}`.trim(),
          rating: p.assignedrating || 0,
          clubName: clubData.name,
        });
      });
      setPlayerDirectory(directory);

      // 4. Fetch round 1 results
      const roundsToFetch = [1];
      const seriesPromises = roundsToFetch.map((r) =>
        fetchRoundSeries(r, bypassCache).catch(() => [] as DivisionFrbe[])
      );
      const seriesResults = await Promise.all(seriesPromises);
      const currentRoundDivisions = seriesResults[0] || [];
      setAllDivisions(currentRoundDivisions);

      // 5. Calculate Player Stats
      const stats = calculateClubPlayerStats(clubData.players || [], currentRoundDivisions, clubId);
      setPlayerStats(stats);

      // 6. Calculate Division Standings & Scouting for each team
      const divisionStandingsList: DivisionStandingTable[] = [];
      const scoutingList: NextMatchScout[] = [];

      (clubData.teams || []).forEach((team) => {
        const matchingDiv = currentRoundDivisions.find(
          (d) => d.division === team.division && (d.index || 'A') === (team.index || 'A')
        );

        if (matchingDiv) {
          const divStandings = calculateDivisionStandings(matchingDiv, clubId);
          divisionStandingsList.push(divStandings);

          // Calculate our team average Elo from titulars
          const titulars = (clubData.players || []).filter(
            (p) => p.titular && p.titular.includes(team.name)
          );
          const ourAvg =
            titulars.length > 0
              ? Math.round(
                  titulars.reduce((s, p) => s + (p.assignedrating || 0), 0) / titulars.length
                )
              : 0;

          const scout = scoutNextMatch(
            matchingDiv,
            clubId,
            [{ round: 1, divisions: currentRoundDivisions }],
            directory,
            ourAvg
          );
          if (scout) scoutingList.push(scout);
        }
      });

      setStandings(divisionStandingsList);
      setScouting(scoutingList);
      setIsFallback(isFallbackMode);
    } catch (err: any) {
      console.error('Failed to load club data:', err);
      setError(err.message || 'Impossible de récupérer les données.');
    } finally {
      setLoading(false);
    }
  }, [clubId, setClubName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = async () => {
    clearCache();
    await loadData(true);
  };

  return {
    loading,
    error,
    club,
    venues,
    playerStats,
    standings,
    scouting,
    allDivisions,
    playerDirectory,
    isFallback,
    refresh,
  };
}
