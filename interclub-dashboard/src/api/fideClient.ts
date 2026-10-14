export interface FidePlayerProfile {
  id: number;
  name: string;
  federation: string;
  year?: number;
  title?: string;
  gender?: string;
  standard?: number;
  rapid?: number;
  blitz?: number;
  photo?: { small?: string; medium?: string; credit?: string };
  inactive?: boolean;
}

export interface FideRatingPoint {
  period: string; // "2024-05"
  year: number;
  month: number;
  rating: number;
}

export interface FidePlayerDetails {
  profile: FidePlayerProfile;
  ratingsHistory: {
    standard: FideRatingPoint[];
    rapid: FideRatingPoint[];
    blitz: FideRatingPoint[];
  };
}

const memoryCache = new Map<string, FidePlayerDetails | null>();

function parseRatingEntry(val: number): FideRatingPoint | null {
  const str = val.toString();
  if (str.length < 7) return null;
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10);
  const rating = parseInt(str.slice(6), 10);
  const period = `${year}-${month.toString().padStart(2, '0')}`;
  return { period, year, month, rating };
}

function cleanPlayerName(name: string): string {
  return name
    .replace(/^(Matr\.|Joueur)\s*\d+/i, '')
    .replace(/[,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchFidePlayer(
  playerName: string,
  expectedElo?: number
): Promise<FidePlayerDetails | null> {
  const cleaned = cleanPlayerName(playerName);
  if (!cleaned || cleaned.length < 3) return null;

  const cacheKey = `fide_${cleaned.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      memoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    // Ignore
  }

  try {
    const searchUrl = `https://lichess.org/api/fide/player?q=${encodeURIComponent(cleaned)}`;
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    const players: FidePlayerProfile[] = await response.json();
    if (!Array.isArray(players) || players.length === 0) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    // Match best candidate:
    // 1. If expectedElo provided, find player with closest standard rating (or rapid/blitz)
    let bestMatch = players[0];
    if (expectedElo && expectedElo > 0) {
      let minDiff = Infinity;
      for (const p of players) {
        const rating = p.standard || p.rapid || p.blitz || 0;
        const diff = Math.abs(rating - expectedElo);
        // Prioritize BEL federation if diff is close
        const bonus = p.federation === 'BEL' ? -50 : 0;
        if (diff + bonus < minDiff) {
          minDiff = diff + bonus;
          bestMatch = p;
        }
      }
    } else {
      // Prioritize BEL federation
      const belPlayer = players.find(p => p.federation === 'BEL');
      if (belPlayer) bestMatch = belPlayer;
    }

    // Fetch rating history
    let historyStandard: FideRatingPoint[] = [];
    let historyRapid: FideRatingPoint[] = [];
    let historyBlitz: FideRatingPoint[] = [];

    try {
      const histRes = await fetch(`https://lichess.org/api/fide/player/${bestMatch.id}/ratings`, {
        signal: AbortSignal.timeout(6000),
        headers: { Accept: 'application/json' },
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        if (Array.isArray(histData.standard)) {
          historyStandard = histData.standard
            .map(parseRatingEntry)
            .filter((p: FideRatingPoint | null): p is FideRatingPoint => p !== null);
        }
        if (Array.isArray(histData.rapid)) {
          historyRapid = histData.rapid
            .map(parseRatingEntry)
            .filter((p: FideRatingPoint | null): p is FideRatingPoint => p !== null);
        }
        if (Array.isArray(histData.blitz)) {
          historyBlitz = histData.blitz
            .map(parseRatingEntry)
            .filter((p: FideRatingPoint | null): p is FideRatingPoint => p !== null);
        }
      }
    } catch {
      // non-fatal, keep profile
    }

    const result: FidePlayerDetails = {
      profile: bestMatch,
      ratingsHistory: {
        standard: historyStandard,
        rapid: historyRapid,
        blitz: historyBlitz,
      },
    };

    memoryCache.set(cacheKey, result);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Ignore
    }

    return result;
  } catch (err) {
    console.warn(`Could not load FIDE data for ${cleaned}:`, err);
    memoryCache.set(cacheKey, null);
    return null;
  }
}

