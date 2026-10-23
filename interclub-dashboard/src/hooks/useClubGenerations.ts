import { useState, useEffect, useRef } from 'react';
import { PlayerStats } from '../domain/performance';
import { fetchFidePlayer } from '../api/fideClient';

export interface PlayerAgeInfo {
  playerId: number;
  playerName: string;
  rating: number;
  gamesPlayed: number;
  score: number;
  birthYear: number;
  age: number;
  fideId?: number;
}

const STORAGE_PREFIX = 'ic_player_birth_v1_';

export function useClubGenerations(players: PlayerStats[]) {
  const [oldestPlayer, setOldestPlayer] = useState<PlayerAgeInfo | null>(null);
  const [youngestPlayer, setYoungestPlayer] = useState<PlayerAgeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resolvedCount, setResolvedCount] = useState<number>(0);

  const activePlayers = players.filter((p) => p.gamesPlayed > 0);
  const currentYear = new Date().getFullYear();

  // Keep track of active fetch loop to abort if players list changes
  const abortControllerRef = useRef<boolean>(false);

  useEffect(() => {
    abortControllerRef.current = false;
    let cancelled = false;

    if (activePlayers.length === 0) {
      setOldestPlayer(null);
      setYoungestPlayer(null);
      setIsLoading(false);
      setResolvedCount(0);
      return;
    }

    const resolvedAges: PlayerAgeInfo[] = [];

    // Helper to evaluate and update min/max
    const updateGenerations = (list: PlayerAgeInfo[]) => {
      if (list.length === 0) return;
      const sortedByAge = [...list].sort((a, b) => b.age - a.age);
      setOldestPlayer(sortedByAge[0]);
      setYoungestPlayer(sortedByAge[sortedByAge.length - 1]);
    };

    // 1. Instant pass: Read known birth years from localStorage
    const playersToFetch: PlayerStats[] = [];

    activePlayers.forEach((p) => {
      try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${p.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.year && typeof parsed.year === 'number') {
            resolvedAges.push({
              playerId: p.id,
              playerName: p.fullName,
              rating: p.rating,
              gamesPlayed: p.gamesPlayed,
              score: p.score,
              birthYear: parsed.year,
              age: currentYear - parsed.year,
              fideId: parsed.fideId,
            });
            return;
          }
        }
      } catch {
        // Fallback to fetch
      }
      playersToFetch.push(p);
    });

    if (resolvedAges.length > 0) {
      updateGenerations(resolvedAges);
      setResolvedCount(resolvedAges.length);
    }

    // If all active players were in cache, no network fetch needed
    if (playersToFetch.length === 0) {
      setIsLoading(false);
      return;
    }

    // 2. Sequential background pass for un-cached active players (with 200ms throttle)
    setIsLoading(true);

    const runFetchQueue = async () => {
      // Prioritize active players with the most games
      const queue = [...playersToFetch].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 30);

      for (const p of queue) {
        if (cancelled || abortControllerRef.current) break;

        try {
          const fideData = await fetchFidePlayer(p.fullName, p.rating);
          const birthYear = fideData?.profile?.year;

          if (birthYear && typeof birthYear === 'number' && birthYear >= 1920 && birthYear <= currentYear) {
            const age = currentYear - birthYear;
            const item: PlayerAgeInfo = {
              playerId: p.id,
              playerName: p.fullName,
              rating: p.rating,
              gamesPlayed: p.gamesPlayed,
              score: p.score,
              birthYear,
              age,
              fideId: fideData?.profile?.id,
            };

            // Cache in localStorage for future instant loads
            try {
              localStorage.setItem(
                `${STORAGE_PREFIX}${p.id}`,
                JSON.stringify({ year: birthYear, fideId: fideData?.profile?.id })
              );
            } catch {
              // Ignore storage errors
            }

            resolvedAges.push(item);
            if (!cancelled) {
              updateGenerations(resolvedAges);
              setResolvedCount(resolvedAges.length);
            }
          }
        } catch {
          // Player lookup failed or timed out, continue with next
        }

        // Throttle 200ms to be gentle with Lichess rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    runFetchQueue();

    return () => {
      cancelled = true;
      abortControllerRef.current = true;
    };
  }, [players]);

  return {
    oldestPlayer,
    youngestPlayer,
    isLoading,
    resolvedCount,
    totalActive: activePlayers.length,
  };
}
