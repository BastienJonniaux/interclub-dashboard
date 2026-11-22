import { ClubFrbe, DivisionFrbe, VenueFrbe } from '../modelsFRBE';
import { getCached, setCached, COMPLETED_ROUND_TTL_MS } from './cache';
import { defaultRound, ACTIVE_SEASON } from '../season';
import {
  fetchFirestoreClub,
  fetchFirestoreRound,
  extractPlayersFromFirestoreRound,
} from './firestoreFallback';

const API_BASE = '/api/v1/interclubs';

let _isFallbackMode = false;

export function getIsFallbackMode(): boolean {
  return _isFallbackMode;
}

export function resetFallbackMode(): void {
  _isFallbackMode = false;
}

export function setFallbackMode(val: boolean): void {
  _isFallbackMode = val;
}

function combineSignals(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!externalSignal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal.aborted || timeoutSignal.aborted) {
    controller.abort();
    return controller.signal;
  }
  externalSignal.addEventListener('abort', onAbort, { once: true });
  timeoutSignal.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    signal: combineSignals(10000, signal),
  });
  if (!response.ok) {
    throw new Error(`FRBE API error ${response.status} on ${path}`);
  }
  return response.json();
}

/**
 * Fetch club info with automatic mirror fallback
 */
export async function fetchClub(
  clubId: number,
  bypassCache = false,
  signal?: AbortSignal
): Promise<ClubFrbe> {
  const cacheKey = `club_${clubId}`;
  if (!bypassCache) {
    const cached = getCached<ClubFrbe>(cacheKey);
    if (cached) return cached;
  }

  // 1. Try FRBE API
  try {
    const data = await getJson<ClubFrbe>(`anon/icclub/${clubId}`, signal);
    _isFallbackMode = false;
    setCached(cacheKey, data);
    return data;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }
    console.warn(
      `Serveur FRBE inaccessible (${err}). Utilisation du miroir Firestore...`
    );
  }

  // 2. Fallback to Firestore Mirror
  try {
    const fallbackClub = await fetchFirestoreClub(clubId, signal);
    if (fallbackClub) {
      _isFallbackMode = true;
      setCached(cacheKey, fallbackClub);
      return fallbackClub;
    }
  } catch (fsErr: any) {
    if (signal?.aborted || fsErr?.name === 'AbortError') {
      throw fsErr;
    }
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
  bypassCache = false,
  signal?: AbortSignal
): Promise<DivisionFrbe[]> {
  const isCompletedRound = round < defaultRound(ACTIVE_SEASON);
  const cacheKey = `series_round_${round}`;
  if (!bypassCache) {
    const cached = getCached<DivisionFrbe[]>(
      cacheKey,
      isCompletedRound ? COMPLETED_ROUND_TTL_MS : undefined
    );
    if (cached) return cached;
  }

  // 1. Try FRBE API
  try {
    const data = await getJson<DivisionFrbe[]>(`anon/icseries?round=${round}`, signal);
    setCached(cacheKey, data, {
      persistent: isCompletedRound,
      ttlMs: isCompletedRound ? COMPLETED_ROUND_TTL_MS : undefined,
    });
    return data;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }
    console.warn(
      `FRBE icseries inaccessible pour la ronde ${round}. Utilisation du miroir Firestore...`
    );
  }

  // 2. Fallback to Firestore Mirror
  try {
    const fallbackDivisions = await fetchFirestoreRound(round, ACTIVE_SEASON, signal);
    if (fallbackDivisions && fallbackDivisions.length > 0) {
      _isFallbackMode = true;
      setCached(cacheKey, fallbackDivisions, {
        persistent: isCompletedRound,
        ttlMs: isCompletedRound ? COMPLETED_ROUND_TTL_MS : undefined,
      });
      return fallbackDivisions;
    }
  } catch (fsErr: any) {
    if (signal?.aborted || fsErr?.name === 'AbortError') {
      throw fsErr;
    }
    console.error('Erreur miroir Firestore round:', fsErr);
  }

  return [];
}

/**
 * Fetch venues / playing halls for a club
 */
export async function fetchVenues(
  clubId: number,
  bypassCache = false,
  signal?: AbortSignal
): Promise<VenueFrbe[]> {
  const cacheKey = `venues_${clubId}`;
  if (!bypassCache) {
    const cached = getCached<VenueFrbe[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const data = await getJson<{ venues: VenueFrbe[] }>(`anon/venue/${clubId}`, signal);
    const venues = data.venues || [];
    setCached(cacheKey, venues);
    return venues;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }
    return [];
  }
}

/**
 * Fetch complete player directory (id -> name & rating)
 */
export async function fetchPlayerDirectory(signal?: AbortSignal): Promise<
  Map<number, { name: string; rating: number; clubName?: string }>
> {
  const cacheKey = `player_directory_v4`;
  const cached = getCached<any>(cacheKey);
  if (cached && Object.keys(cached).length > 100) {
    return new Map(Object.entries(cached).map(([k, v]: [string, any]) => [Number(k), v]));
  }

  try {
    const dir = await extractPlayersFromFirestoreRound(1, signal);
    if (dir.size > 0) {
      const obj = Object.fromEntries(dir.entries());
      setCached(cacheKey, obj);
    }
    return dir;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }
    console.error('Error fetching player directory:', err);
    return new Map();
  }
}
