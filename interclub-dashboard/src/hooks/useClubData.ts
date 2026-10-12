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
import { LatestTeamMatch, extractLatestClubMatches } from '../domain/matches';
import { defaultRound, ACTIVE_SEASON } from '../season';

export interface ClubDataState {
  loading: boolean;
  error: string | null;
  club: ClubFrbe | null;
  venues: VenueFrbe[];
  playerStats: PlayerStats[];
  standings: DivisionStandingTable[];
  scouting: NextMatchScout[];
  latestMatches: LatestTeamMatch[];
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
  const [latestMatches, setLatestMatches] = useState<LatestTeamMatch[]>([]);
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

      // 4. Fetch all played round results up to current date
      const maxRound = Math.max(1, defaultRound(ACTIVE_SEASON));
      const roundsToFetch = Array.from({ length: maxRound }, (_, i) => i + 1);
      const seriesPromises = roundsToFetch.map((r) =>
        fetchRoundSeries(r, bypassCache).catch(() => [] as DivisionFrbe[])
      );
      const seriesResults = await Promise.all(seriesPromises);

      // Merge divisions across rounds so that each division has all played rounds
      const divMap = new Map<string, DivisionFrbe>();
      seriesResults.forEach((roundDivs) => {
        roundDivs.forEach((div) => {
          const key = `${div.division}_${div.index || 'A'}`;
          const existing = divMap.get(key);
          if (!existing) {
            divMap.set(key, {
              division: div.division,
              index: div.index || 'A',
              teams: [...div.teams],
              rounds: [...(div.rounds || [])],
            });
          } else {
            const existingRoundNumbers = new Set(existing.rounds.map((rd) => rd.round));
            (div.rounds || []).forEach((rd) => {
              if (!existingRoundNumbers.has(rd.round)) {
                existing.rounds.push(rd);
                existingRoundNumbers.add(rd.round);
              } else {
                const idx = existing.rounds.findIndex((r) => r.round === rd.round);
                if (idx >= 0) {
                  existing.rounds[idx] = rd;
                }
              }
            });
          }
        });
      });
      const mergedDivisions = Array.from(divMap.values());
      setAllDivisions(mergedDivisions);

      // 5. Calculate Player Stats across all rounds
      const stats = calculateClubPlayerStats(clubData.players || [], mergedDivisions, clubId, directory);
      setPlayerStats(stats);

      // 6. Calculate Division Standings & Scouting for each team
      const divisionStandingsList: DivisionStandingTable[] = [];
      const scoutingList: NextMatchScout[] = [];

      const allDivisionsAcrossRounds = seriesResults.map((divs, idx) => ({
        round: idx + 1,
        divisions: divs,
      }));

      (clubData.teams || []).forEach((team) => {
        const matchingDiv = mergedDivisions.find(
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
            allDivisionsAcrossRounds,
            directory,
            ourAvg
          );
          if (scout) scoutingList.push(scout);
        }
      });

      setStandings(divisionStandingsList);
      setScouting(scoutingList);

      // 7. Extract Latest Played Matches with board-by-board detail
      const latest = extractLatestClubMatches(mergedDivisions, clubId, directory);
      setLatestMatches(latest);

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
    latestMatches,
    allDivisions,
    playerDirectory,
    isFallback,
    refresh,
  };
}
