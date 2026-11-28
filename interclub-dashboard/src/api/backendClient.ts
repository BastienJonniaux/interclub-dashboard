export interface ServerDraftResponse {
  roundNumber: number;
  clubId?: number;
  seasonYear: string;
  isLocked: boolean;
  lockedAt: string | null;
  updatedAt?: string;
  savedBy?: string | null;
  drafts: Record<number, Record<number, number>>; // { teamNumber: { board: playerId } }
  boardDetails?: Record<
    number,
    Array<{
      board: number;
      playerId: number;
      playerName: string;
      playerRating: number;
    }>
  >;
  isRestricted?: boolean;
  isUpcoming?: boolean;
  error?: string;
}

export interface PlayerAttendanceStat {
  playerId: number;
  playerName: string;
  roundsRecorded: number;
  availableCount: number;
  tentativeCount: number;
  unavailableCount: number;
  gamesAssigned: number;
  attendanceRate: number; // percentage 0-100
  selectionRate: number; // percentage 0-100
  historyByRound: Record<
    number,
    {
      status: string;
      isAssigned: boolean;
      teamNumber?: number;
      boardNumber?: number;
    }
  >;
}

export interface SeasonAttendanceResponse {
  seasonYear: string;
  totalRoundsTracked: number;
  players: PlayerAttendanceStat[];
}

const STORAGE_DIRECTOR_KEY = 'interclub_director_key';
const STORAGE_AUTHOR_NAME = 'interclub_author_name';

export function getServerBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3001';
}

export function getStoredDirectorKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_DIRECTOR_KEY);
  } catch {
    return null;
  }
}

export function setStoredDirectorKey(key: string | null): void {
  try {
    if (key) {
      localStorage.setItem(STORAGE_DIRECTOR_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_DIRECTOR_KEY);
    }
  } catch {
    // Ignore
  }
}

export function getStoredAuthorName(): string | null {
  try {
    return localStorage.getItem(STORAGE_AUTHOR_NAME);
  } catch {
    return null;
  }
}

export function setStoredAuthorName(name: string | null): void {
  try {
    if (name && name.trim()) {
      localStorage.setItem(STORAGE_AUTHOR_NAME, name.trim());
    } else {
      localStorage.removeItem(STORAGE_AUTHOR_NAME);
    }
  } catch {
    // Ignore
  }
}

export const COLD_START_TIMEOUT_MS = 50_000; // 50 seconds for Render wake-up
export const PING_TIMEOUT_MS = 8_000;        // 8 seconds per ping attempt
export const DEFAULT_TIMEOUT_MS = 25_000;     // 25 seconds for normal operations

export interface SeasonConfigResponse {
  seasonYear: string;
  startYear: string;
  seasonLabel: string;
  divisionCsvFile: string;
  totalRounds: number;
  currentRound: number;
  roundDates: string[];
}

export async function fetchCurrentSeasonConfig(
  seasonYear?: string
): Promise<SeasonConfigResponse | null> {
  const baseUrl = getServerBaseUrl();
  try {
    const url = new URL(`${baseUrl}/api/season/current`);
    if (seasonYear) url.searchParams.set('season', seasonYear);
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err: any) {
    console.warn('[Backend] Could not fetch season config from server:', err);
    return null;
  }
}

export interface HealthCheckOptions {
  maxWaitMs?: number;
  onProgress?: (info: { isWakingUp: boolean; elapsedMs: number }) => void;
}

export async function checkServerHealth(options?: HealthCheckOptions): Promise<{
  online: boolean;
  database: boolean;
  isWakingUp?: boolean;
  message?: string;
}> {
  const baseUrl = getServerBaseUrl();
  const maxWaitMs = options?.maxWaitMs ?? COLD_START_TIMEOUT_MS;
  const startTime = Date.now();

  console.info(`[Backend] Connecting to ${baseUrl}/api/health (cold-start max wait: ${maxWaitMs}ms)`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        return { online: true, database: data.database === 'connected', isWakingUp: false };
      }
    } catch (_err: any) {
      const elapsed = Date.now() - startTime;
      if (elapsed + 3000 < maxWaitMs) {
        options?.onProgress?.({ isWakingUp: true, elapsedMs: elapsed });
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
    }
  }

  console.warn(`[Backend] Health check failed for ${baseUrl} after cold-start timeout (${maxWaitMs}ms)`);
  return { online: false, database: false, isWakingUp: false, message: 'Server offline or cold start timed out.' };
}

export interface VerifyKeyResult {
  valid: boolean;
  isOffline?: boolean;
  message?: string;
}

export async function verifyDirectorKey(key: string): Promise<VerifyKeyResult> {
  const trimmed = key.trim();

  try {
    const res = await fetch(`${getServerBaseUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: trimmed }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (res.ok) {
      const data = await res.json();
      return { valid: !!data.valid, message: data.message };
    }

    // 401/403 Unauthorized: explicitly wrong key
    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({}));
      return { valid: false, message: data.error || 'Mot de passe / Clé Directeur incorrecte.' };
    }

    // 429 Too Many Requests (Rate limit)
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return {
        valid: false,
        message: data.error || 'Trop de tentatives infructueuses. Veuillez patienter 15 minutes avant de réessayer.',
      };
    }

    return { valid: false, message: `Erreur serveur HTTP ${res.status}` };
  } catch (err: any) {
    // If backend is unreachable or timed out
    console.warn('[Backend] Auth verify offline or unreachable:', err);
    return {
      valid: false,
      isOffline: true,
      message: 'Serveur backend inaccessible (port 3001). Vérifiez la connexion ou le statut du serveur.',
    };
  }
}

export async function fetchRoundDrafts(
  roundNumber: number,
  seasonYear?: string,
  clubId?: number
): Promise<ServerDraftResponse | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/rounds/${roundNumber}/drafts`);
    if (seasonYear) url.searchParams.set('season', seasonYear);
    if (clubId) url.searchParams.set('clubId', clubId.toString());

    const key = getStoredDirectorKey();
    const headers: Record<string, string> = {};
    if (key) {
      headers['x-director-key'] = key;
    }

    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(COLD_START_TIMEOUT_MS),
    });

    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      return {
        roundNumber,
        clubId,
        seasonYear: seasonYear || '2026-2027',
        isLocked: false,
        lockedAt: null,
        drafts: {},
        isRestricted: true,
        isUpcoming: !!errData.isUpcoming,
        error: errData.error || 'Ronde à venir confidentielle : réservée au Directeur des Interclubs.',
      };
    }

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Could not fetch drafts for round ${roundNumber}:`, err);
    return null;
  }
}

export async function saveRoundDrafts(
  roundNumber: number,
  draftsPayload: Record<
    number,
    {
      divisionLabel?: string;
      boards: Array<{
        board: number;
        playerId: number;
        playerName?: string;
        playerRating?: number;
      }>;
    }
  >,
  directorKey?: string,
  seasonYear?: string,
  clubId?: number,
  authorName?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const key = directorKey || getStoredDirectorKey();
    if (!key) {
      return { success: false, error: 'Clé Directeur requise pour sauvegarder la composition.' };
    }

    const effectiveAuthor = authorName || getStoredAuthorName() || undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-director-key': key,
    };
    if (effectiveAuthor) {
      headers['x-author-name'] = effectiveAuthor;
    }

    const res = await fetch(`${getServerBaseUrl()}/api/rounds/${roundNumber}/drafts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        seasonYear,
        clubId,
        drafts: draftsPayload,
        savedBy: effectiveAuthor,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erreur lors de la sauvegarde.' };
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur réseau vers le serveur.' };
  }
}

export async function lockRound(
  roundNumber: number,
  lock: boolean,
  directorKey?: string,
  seasonYear?: string,
  clubId?: number,
  authorName?: string
): Promise<{ success: boolean; isLocked?: boolean; savedBy?: string | null; message?: string; error?: string }> {
  try {
    const key = directorKey || getStoredDirectorKey();
    if (!key) {
      return { success: false, error: 'Clé Directeur requise.' };
    }

    const effectiveAuthor = authorName || getStoredAuthorName() || undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-director-key': key,
    };
    if (effectiveAuthor) {
      headers['x-author-name'] = effectiveAuthor;
    }

    const res = await fetch(`${getServerBaseUrl()}/api/rounds/${roundNumber}/lock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lock, seasonYear, clubId, savedBy: effectiveAuthor }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erreur lors du verrouillage.' };
    }

    return { success: true, isLocked: data.isLocked, savedBy: data.savedBy, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur réseau vers le serveur.' };
  }
}

export async function fetchRoundAttendances(
  roundNumber: number,
  seasonYear?: string,
  clubId?: number
): Promise<Record<number, { status: string; note?: string; playerName?: string }> | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/rounds/${roundNumber}/attendances`);
    if (seasonYear) url.searchParams.set('season', seasonYear);
    if (clubId) url.searchParams.set('clubId', clubId.toString());

    const key = getStoredDirectorKey();
    const headers: Record<string, string> = {};
    if (key) {
      headers['x-director-key'] = key;
    }

    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.attendances || {};
  } catch {
    return null;
  }
}

export async function saveRoundAttendances(
  roundNumber: number,
  attendances: Record<
    number,
    { status: string; playerName?: string; note?: string } | string
  >,
  directorKey?: string,
  seasonYear?: string,
  clubId?: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const key = directorKey || getStoredDirectorKey();
    if (!key) {
      return { success: false, error: 'Clé Directeur requise.' };
    }

    const res = await fetch(`${getServerBaseUrl()}/api/rounds/${roundNumber}/attendances`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-director-key': key,
      },
      body: JSON.stringify({ seasonYear, clubId, attendances }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erreur lors de la sauvegarde.' };
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchSeasonAttendanceStats(
  seasonYear?: string,
  clubId?: number
): Promise<SeasonAttendanceResponse | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/stats/attendance`);
    if (seasonYear) url.searchParams.set('season', seasonYear);
    if (clubId) url.searchParams.set('clubId', clubId.toString());

    const key = getStoredDirectorKey();
    const headers: Record<string, string> = {};
    if (key) {
      headers['x-director-key'] = key;
    }

    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

