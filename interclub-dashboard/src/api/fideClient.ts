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
const CACHE_PREFIX = 'fide_v3_';

// Cleanup stale cache keys from previous versions
try {
  if (typeof sessionStorage !== 'undefined') {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('fide_') && !key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  }
} catch {
  // Ignore in SSR or restricted storage environments
}

function parseRatingEntry(val: number): FideRatingPoint | null {
  const str = val.toString();
  if (str.length < 7) return null;
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10);
  const rating = parseInt(str.slice(6), 10);
  const period = `${year}-${month.toString().padStart(2, '0')}`;
  return { period, year, month, rating };
}

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (é, è, ê, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPlayerName(name: string): string {
  return name
    .replace(/^(Matr\.|Joueur)\s*\d+/i, '')
    .replace(/[,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFuzzyTokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
    // Levenshtein distance <= 1 for minor typos or spelling variants (e.g. Mathias / Matthias)
    if (Math.abs(a.length - b.length) <= 1) {
      let diff = 0;
      let i = 0;
      let j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] !== b[j]) {
          diff++;
          if (diff > 1) return false;
          if (a.length > b.length) i++;
          else if (b.length > a.length) j++;
          else {
            i++;
            j++;
          }
        } else {
          i++;
          j++;
        }
      }
      return true;
    }
  }
  return false;
}

function matchBestCandidate(
  query: string,
  candidates: FidePlayerProfile[],
  expectedElo?: number
): FidePlayerProfile | null {
  const normQuery = normalizeName(query);
  const qTokens = normQuery.split(' ').filter(t => t.length > 1);
  if (qTokens.length === 0 || !Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const scored = candidates.map(p => {
    const normName = normalizeName(p.name);
    const cTokens = normName.split(' ').filter(t => t.length > 1);

    // FIDE name structure is strictly "LastName, FirstName"
    const parts = p.name.split(',');
    const lastNameTokens = normalizeName(parts[0] || '').split(' ').filter(t => t.length > 1);
    const firstNameTokens = normalizeName(parts[1] || '').split(' ').filter(t => t.length > 1);

    const hasLastNameMatch = lastNameTokens.some(lt =>
      qTokens.some(qt => isFuzzyTokenMatch(qt, lt))
    );

    const hasFirstNameMatch = firstNameTokens.some(ft =>
      qTokens.some(qt => isFuzzyTokenMatch(qt, ft))
    );

    let matchedTokens = 0;
    for (const qt of qTokens) {
      if (cTokens.some(ct => isFuzzyTokenMatch(qt, ct))) {
        matchedTokens++;
      }
    }
    const tokenRatio = matchedTokens / qTokens.length;

    // Strict reject: if query has 2+ tokens, candidate's last name MUST match at least one query token.
    // This prevents picking a completely different person who happens to share a common first name (e.g. Nicolas, Denis).
    if (qTokens.length >= 2 && !hasLastNameMatch) {
      return { player: p, score: -9999 };
    }

    let score = tokenRatio * 1000;
    if (hasLastNameMatch && hasFirstNameMatch) {
      score += 500;
    } else if (hasLastNameMatch) {
      score += 200;
    }

    // Belgian federation bonus only acts as a tie-breaker between same-name candidates
    if (p.federation === 'BEL') {
      score += 20;
    }

    // Elo proximity bonus/penalty (at most +/- 60 pts, never overrules an actual name match)
    const rating = p.standard || p.rapid || p.blitz || 0;
    if (expectedElo && expectedElo > 0 && rating > 0) {
      const diff = Math.abs(rating - expectedElo);
      score -= Math.min(60, diff * 0.1);
    }

    return { player: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score >= 700 ? scored[0].player : null;
}

export async function fetchFidePlayer(
  playerName: string,
  expectedElo?: number
): Promise<FidePlayerDetails | null> {
  const cleaned = cleanPlayerName(playerName);
  if (!cleaned || cleaned.length < 3) return null;

  const cacheKey = `${CACHE_PREFIX}${cleaned.toLowerCase()}`;
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

  // Generate sensible search queries to try in priority order:
  // 1. Direct cleaned query (e.g. "Davoust Nicolas" or "Denis Luminet")
  // 2. Reversed query (e.g. "Nicolas Davoust" or "Luminet Denis")
  // 3. Last name alone (e.g. "Davoust" or "Luminet")
  const queriesToTry: string[] = [cleaned];

  if (playerName.includes(',')) {
    const parts = playerName.split(',').map(s => s.trim());
    if (parts[0] && parts[1]) {
      queriesToTry.push(`${parts[1]} ${parts[0]}`);
      queriesToTry.push(parts[0]);
    }
  } else {
    const words = cleaned.split(' ');
    if (words.length === 2) {
      queriesToTry.push(`${words[1]} ${words[0]}`);
      queriesToTry.push(words[1]);
      queriesToTry.push(words[0]);
    }
  }

  try {
    let bestMatch: FidePlayerProfile | null = null;
    const seenQueries = new Set<string>();

    for (const q of queriesToTry) {
      const qLower = q.toLowerCase();
      if (seenQueries.has(qLower)) continue;
      seenQueries.add(qLower);

      try {
        const searchUrl = `https://lichess.org/api/fide/player?q=${encodeURIComponent(q)}`;
        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const candidates: FidePlayerProfile[] = await response.json();
          if (Array.isArray(candidates) && candidates.length > 0) {
            bestMatch = matchBestCandidate(playerName, candidates, expectedElo);
            if (bestMatch) break; // Found high-confidence match!
          }
        }
      } catch {
        // Try next fallback query
      }
    }

    if (!bestMatch) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    // Fetch rating history for the verified player
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
      // Non-fatal, profile data is preserved
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
    console.warn(`Could not load FIDE data for ${playerName}:`, err);
    memoryCache.set(cacheKey, null);
    return null;
  }
}
