import { ClubFrbe, DivisionFrbe, VenueFrbe } from '../modelsFRBE';
import { getCached, setCached } from './cache';
import {
  fetchFirestoreClub,
  fetchFirestoreRound,
  extractPlayersFromFirestoreRound,
} from './firestoreFallback';

const API_BASE = import.meta.env.DEV
  ? '/api/v1/interclubs'
  : 'https://www.frbe-kbsb-ksb.be/api/v1/interclubs';

export let isFallbackMode = false;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`FRBE API error ${response.status} on ${path}`);
  }
  return response.json();
}

/**
 * Fetch club info with automatic mirror fallback
 */
export async function fetchClub(clubId: number, bypassCache = false): Promise<ClubFrbe> {
  const cacheKey = `club_${clubId}`;
  if (!bypassCache) {
    const cached = getCached<ClubFrbe>(cacheKey);
    if (cached) return cached;
  }

  // 1. Try FRBE API
  try {
    const data = await getJson<ClubFrbe>(`anon/icclub/${clubId}`);
    isFallbackMode = false;
    setCached(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(
      `Serveur FRBE inaccessible (${err}). Utilisation du miroir Firestore...`
    );
  }

  // 2. Fallback to Firestore Mirror
  try {
    const fallbackClub = await fetchFirestoreClub(clubId);
    if (fallbackClub) {
      isFallbackMode = true;
      setCached(cacheKey, fallbackClub);
      return fallbackClub;
    }
  } catch (fsErr) {
    console.error('Erreur miroir Firestore:', fsErr);
  }

  throw new Error(
    `Le serveur FRBE est actuellement indisponible (Erreur 502) et aucune sauvegarde locale n'a été trouvée pour le club ${clubId}.`
  );
}

/**
 * Fetch full results for a round with automatic mirror fallback
 */
export async function fetchRoundSeries(
  round: number,
  bypassCache = false
): Promise<DivisionFrbe[]> {
  const cacheKey = `series_round_${round}`;
  if (!bypassCache) {
    const cached = getCached<DivisionFrbe[]>(cacheKey);
    if (cached) return cached;
  }

  // 1. Try FRBE API
  try {
    const data = await getJson<DivisionFrbe[]>(`anon/icseries?round=${round}`);
    setCached(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(
      `FRBE icseries inaccessible pour la ronde ${round}. Utilisation du miroir Firestore...`
    );
  }

  // 2. Fallback to Firestore Mirror
  try {
    const fallbackDivisions = await fetchFirestoreRound(round);
    if (fallbackDivisions && fallbackDivisions.length > 0) {
      isFallbackMode = true;
      setCached(cacheKey, fallbackDivisions);
      return fallbackDivisions;
    }
  } catch (fsErr) {
    console.error('Erreur miroir Firestore round:', fsErr);
  }

  return [];
}

/**
 * Fetch venues / playing halls for a club
 */
export async function fetchVenues(
  clubId: number,
  bypassCache = false
): Promise<VenueFrbe[]> {
  const cacheKey = `venues_${clubId}`;
  if (!bypassCache) {
    const cached = getCached<VenueFrbe[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const data = await getJson<{ venues: VenueFrbe[] }>(`anon/venue/${clubId}`);
    const venues = data.venues || [];
    setCached(cacheKey, venues);
    return venues;
  } catch {
    return [];
  }
}

/**
 * Fetch complete player directory (id -> name & rating)
 */
export async function fetchPlayerDirectory(): Promise<
  Map<number, { name: string; rating: number; clubName?: string }>
> {
  const cacheKey = `player_directory_v4`;
  const cached = getCached<any>(cacheKey);
  if (cached && Object.keys(cached).length > 100) {
    return new Map(Object.entries(cached).map(([k, v]: [string, any]) => [Number(k), v]));
  }

  try {
    const dir = await extractPlayersFromFirestoreRound(1);
    if (dir.size > 0) {
      const obj = Object.fromEntries(dir.entries());
      setCached(cacheKey, obj);
    }
    return dir;
  } catch (err) {
    console.error('Error fetching player directory:', err);
    return new Map();
  }
}
