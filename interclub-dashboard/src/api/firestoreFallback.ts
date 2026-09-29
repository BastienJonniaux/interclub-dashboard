import { ClubFrbe, DivisionFrbe, TeamFrbe, PlayerFrbe } from '../modelsFRBE';
import { ResultEnum } from '../models/ResultEnum';

const FIRESTORE_BASE =
  'https://firestore.googleapis.com/v1/projects/interclub-668f3/databases/(default)/documents/years/2026';

export function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const res: Record<string, any> = {};
    for (const key of Object.keys(fields)) {
      res[key] = decodeFirestoreValue(fields[key]);
    }
    return res;
  }
  return val;
}

export function decodeFirestoreDocument(doc: any): any {
  if (!doc?.fields) return null;
  const res: Record<string, any> = {};
  for (const key of Object.keys(doc.fields)) {
    res[key] = decodeFirestoreValue(doc.fields[key]);
  }
  return res;
}

function resultEnumToString(res: any): string {
  if (typeof res === 'string') return res;
  switch (res) {
    case ResultEnum.WhiteWins:
      return '1-0';
    case ResultEnum.BlackWins:
      return '0-1';
    case ResultEnum.Draw:
      return '½-½';
    case ResultEnum.WhiteFF:
      return '1-0 FF';
    case ResultEnum.BlackFF:
      return '0-1 FF';
    case ResultEnum.BothFF:
      return '0-0 FF';
    case ResultEnum.WhiteHalf:
      return '½-0';
    case ResultEnum.BlackHalf:
      return '0-½';
    case ResultEnum.TeamFF:
      return 'Team FF';
    default:
      return '0-0';
  }
}

/**
 * Fetch club from Firestore mirror when FRBE API is down
 */
export async function fetchFirestoreClub(clubId: number): Promise<ClubFrbe | null> {
  const url = `${FIRESTORE_BASE}/club/${clubId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;

  const json = await response.json();
  const data = decodeFirestoreDocument(json);
  if (!data) return null;

  const clubName = data.name || `Club ${clubId}`;
  const teams: TeamFrbe[] = (data.teams || []).map((t: any) => ({
    idclub: t.clubId || clubId,
    division: t.class || 3,
    index: t.division || 'A',
    name: t.clubName ? `${t.clubName} ${t.id}` : `${clubName} ${t.id}`,
    pairingnumber: t.pairingsNumber || 1,
    titular: [],
    playersplayed: [],
  }));

  const players: PlayerFrbe[] = (data.players || []).map((p: any) => ({
    idnumber: p.id,
    first_name: p.firstName || '',
    last_name: p.name || '',
    assignedrating: p.rating || 0,
    average: 0,
    fiderating: p.ratingFide || 0,
    natrating: p.ratingNat || 0,
    idcluborig: clubId,
    idclubvisit: 0,
    nature: 'assigned',
    period: 'september',
    titular: p.team ? `${clubName} ${p.team}` : '',
  }));

  return {
    id: data.id?.toString() || clubId.toString(),
    idclub: clubId,
    name: clubName,
    teams,
    players,
    registered: true,
  };
}

/**
 * Fetch round series from Firestore mirror when FRBE API is down
 */
export async function fetchFirestoreRound(round: number): Promise<DivisionFrbe[] | null> {
  const url = `${FIRESTORE_BASE}/roundOverview/${round}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;

  const json = await response.json();
  const data = decodeFirestoreDocument(json);
  if (!data || !Array.isArray(data.divisions)) return null;

  const divisions: DivisionFrbe[] = data.divisions.map((div: any) => {
    const encounters = (div.matches || []).map((m: any) => {
      const games = (m.games || []).map((g: any) => ({
        idnumber_home: g.playerHome?.id || null,
        idnumber_visit: g.playerAway?.id || null,
        result: resultEnumToString(g.result),
        overruled: 'NOR',
      }));

      return {
        icclub_home: m.teamHome?.clubId || 0,
        icclub_visit: m.teamAway?.clubId || 0,
        pairingnr_home: m.teamHome?.pairingsNumber || 0,
        pairingnr_visit: m.teamAway?.pairingsNumber || 0,
        matchpoint_home: m.scoreHome > m.scoreAway ? 2 : m.scoreHome === m.scoreAway ? 1 : 0,
        matchpoint_visit: m.scoreAway > m.scoreHome ? 2 : m.scoreHome === m.scoreAway ? 1 : 0,
        boardpoint2_home: Math.round((m.scoreHome || 0) * 2),
        boardpoint2_visit: Math.round((m.scoreAway || 0) * 2),
        games,
        played: m.played !== false,
        signhome_idnumber: 0,
        signhome_ts: null,
        signvisit_idnumber: 0,
        signvisit_ts: null,
      };
    });

    return {
      division: div.class,
      index: div.division,
      teams: (div.matches || []).flatMap((m: any) => [
        {
          division: div.class,
          index: div.division,
          idclub: m.teamHome?.clubId || 0,
          name: m.teamHome?.clubName ? `${m.teamHome.clubName} ${m.teamHome.id}` : '',
          pairingnumber: m.teamHome?.pairingsNumber || 0,
          titular: [],
          playersplayed: [],
        },
        {
          division: div.class,
          index: div.division,
          idclub: m.teamAway?.clubId || 0,
          name: m.teamAway?.clubName ? `${m.teamAway.clubName} ${m.teamAway.id}` : '',
          pairingnumber: m.teamAway?.pairingsNumber || 0,
          titular: [],
          playersplayed: [],
        },
      ]),
      rounds: [
        {
          round,
          rdate: '',
          encounters,
        },
      ],
    };
  });

  return divisions;
}

/**
 * Extracts a complete player directory (id -> { name, rating, clubName }) from round 1 matches
 */
export async function extractPlayersFromFirestoreRound(round: number): Promise<Map<number, { name: string; rating: number; clubName?: string }>> {
  const url = `${FIRESTORE_BASE}/roundOverview/${round}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const map = new Map<number, { name: string; rating: number; clubName?: string }>();
  if (!response.ok) return map;

  const json = await response.json();
  const data = decodeFirestoreDocument(json);
  if (!data || !Array.isArray(data.divisions)) return map;

  data.divisions.forEach((div: any) => {
    (div.matches || []).forEach((m: any) => {
      (m.games || []).forEach((g: any) => {
        if (g.playerHome?.id) {
          const numId = Number(g.playerHome.id);
          map.set(numId, {
            name: `${g.playerHome.firstName || ''} ${g.playerHome.name || ''}`.trim() || `Joueur ${numId}`,
            rating: g.playerHome.rating || 0,
            clubName: g.playerHome.clubName,
          });
        }
        if (g.playerAway?.id) {
          const numId = Number(g.playerAway.id);
          map.set(numId, {
            name: `${g.playerAway.firstName || ''} ${g.playerAway.name || ''}`.trim() || `Joueur ${numId}`,
            rating: g.playerAway.rating || 0,
            clubName: g.playerAway.clubName,
          });
        }
      });
    });
  });

  // Also fetch simplelayers to get all ~5,700 players in Belgium
  try {
    const slRes = await fetch(`${FIRESTORE_BASE}/overviews/simplelayers`, { signal: AbortSignal.timeout(10000) });
    if (slRes.ok) {
      const slJson = await slRes.json();
      const slData = decodeFirestoreDocument(slJson);
      if (Array.isArray(slData?.players)) {
        slData.players.forEach((p: any) => {
          const numId = Number(p.id);
          const existing = map.get(numId);
          if (existing) {
            if (!existing.name || existing.name.startsWith('Joueur')) {
              existing.name = p.name || existing.name;
            }
          } else {
            map.set(numId, {
              name: p.name || `Matr. ${numId}`,
              rating: 0,
            });
          }
        });
      }
    }
  } catch {
    // Non-blocking
  }

  return map;
}
