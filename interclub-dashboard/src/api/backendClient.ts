export interface ServerDraftResponse {
  roundNumber: number;
  seasonYear: string;
  isLocked: boolean;
  lockedAt: string | null;
  updatedAt?: string;
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

export async function checkServerHealth(): Promise<{
  online: boolean;
  database: boolean;
  message?: string;
}> {
  const baseUrl = getServerBaseUrl();
  try {
    console.info(`[Backend] Connecting to ${baseUrl}/api/health`);
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, database: data.database === 'connected' };
    }
    return { online: false, database: false };
  } catch (err: any) {
    console.warn(`[Backend] Health check failed for ${baseUrl}:`, err);
    return { online: false, database: false, message: err.message };
  }
}

export async function verifyDirectorKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${getServerBaseUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.valid;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchRoundDrafts(
  roundNumber: number,
  seasonYear?: string
): Promise<ServerDraftResponse | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/rounds/${roundNumber}/drafts`);
    if (seasonYear) url.searchParams.set('season', seasonYear);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });
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
  seasonYear?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const key = directorKey || getStoredDirectorKey();
    if (!key) {
      return { success: false, error: 'Clé Directeur requise pour sauvegarder la composition.' };
    }

    const res = await fetch(`${getServerBaseUrl()}/api/rounds/${roundNumber}/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-director-key': key,
      },
      body: JSON.stringify({
        seasonYear,
        drafts: draftsPayload,
      }),
      signal: AbortSignal.timeout(6000),
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
  seasonYear?: string
): Promise<{ success: boolean; isLocked?: boolean; message?: string; error?: string }> {
  try {
    const key = directorKey || getStoredDirectorKey();
    if (!key) {
      return { success: false, error: 'Clé Directeur requise.' };
    }

    const res = await fetch(`${getServerBaseUrl()}/api/rounds/${roundNumber}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-director-key': key,
      },
      body: JSON.stringify({ lock, seasonYear }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erreur lors du verrouillage.' };
    }

    return { success: true, isLocked: data.isLocked, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur réseau vers le serveur.' };
  }
}

export async function fetchRoundAttendances(
  roundNumber: number,
  seasonYear?: string
): Promise<Record<number, { status: string; note?: string; playerName?: string }> | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/rounds/${roundNumber}/attendances`);
    if (seasonYear) url.searchParams.set('season', seasonYear);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(4000),
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
  seasonYear?: string
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
      body: JSON.stringify({ seasonYear, attendances }),
      signal: AbortSignal.timeout(6000),
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
  seasonYear?: string
): Promise<SeasonAttendanceResponse | null> {
  try {
    const url = new URL(`${getServerBaseUrl()}/api/stats/attendance`);
    if (seasonYear) url.searchParams.set('season', seasonYear);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

