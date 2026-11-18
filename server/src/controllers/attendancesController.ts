import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { isDirectorAuthenticated } from '../middleware/auth';
import { isRoundInPast } from '../utils/calendar';
import { DEFAULT_SEASON, getOrCreateSeason, extractClubId } from '../utils/season';

export async function getRoundAttendances(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const seasonYear = (req.query.season as string) || DEFAULT_SEASON;
    const clubId = extractClubId(req);

    if (isNaN(roundNumber)) {
      return res.status(400).json({ error: 'Numéro de ronde invalide.' });
    }

    const isPast = isRoundInPast(roundNumber);
    const isAuth = isDirectorAuthenticated(req);

    // Confidentiality protection: upcoming rounds are exclusively visible to the Director
    if (!isPast && !isAuth) {
      return res.status(403).json({
        error: `La ronde ${roundNumber} est à venir. Les disponibilités sont confidentielles et réservées au Directeur des Interclubs.`,
        isRestricted: true,
        isUpcoming: true,
      });
    }

    const season = await getOrCreateSeason(seasonYear);
    const round = await prisma.round.findUnique({
      where: {
        seasonId_clubId_roundNumber: {
          seasonId: season.id,
          clubId,
          roundNumber,
        },
      },
      include: {
        attendances: true,
      },
    });

    if (!round) {
      return res.json({ roundNumber, clubId, attendances: {} });
    }

    const attendancesMap: Record<number, {
      status: string;
      note?: string | null;
      playerName: string;
    }> = {};

    for (const att of round.attendances) {
      attendancesMap[att.playerId] = {
        status: att.status,
        note: att.note,
        playerName: att.playerName,
      };
    }

    return res.json({
      roundNumber,
      clubId,
      attendances: attendancesMap,
    });
  } catch (error) {
    console.error('Error getting attendances:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
  }
}

export async function saveRoundAttendances(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const { seasonYear = DEFAULT_SEASON, attendances } = req.body;
    const clubId = extractClubId(req);

    if (isNaN(roundNumber)) {
      return res.status(400).json({ error: 'Numéro de ronde invalide.' });
    }

    if (!attendances || typeof attendances !== 'object') {
      return res.status(400).json({ error: 'Format des disponibilités invalide.' });
    }

    const season = await getOrCreateSeason(seasonYear);

    const round = await prisma.round.upsert({
      where: {
        seasonId_clubId_roundNumber: {
          seasonId: season.id,
          clubId,
          roundNumber,
        },
      },
      create: {
        seasonId: season.id,
        clubId,
        roundNumber,
      },
      update: {},
    });

    // Support both dictionary format: { [playerId]: "available" }
    // and detailed format: { [playerId]: { status, playerName, note } }
    const entries: Array<{
      playerId: number;
      playerName: string;
      status: string;
      note?: string | null;
    }> = [];

    for (const key of Object.keys(attendances)) {
      const playerId = parseInt(key, 10);
      if (isNaN(playerId)) continue;

      const val = attendances[key];
      if (typeof val === 'string') {
        entries.push({
          playerId,
          playerName: `Matr. ${playerId}`,
          status: val,
        });
      } else if (typeof val === 'object' && val !== null) {
        entries.push({
          playerId,
          playerName: val.playerName || `Matr. ${playerId}`,
          status: val.status || 'tentative',
          note: val.note || null,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.playerAttendance.upsert({
          where: {
            roundId_playerId: {
              roundId: round.id,
              playerId: entry.playerId,
            },
          },
          create: {
            roundId: round.id,
            playerId: entry.playerId,
            playerName: entry.playerName,
            status: entry.status,
            note: entry.note,
          },
          update: {
            status: entry.status,
            playerName: entry.playerName,
            note: entry.note,
          },
        });
      }
    });

    return res.json({
      success: true,
      clubId,
      message: `Disponibilités pour la ronde ${roundNumber} enregistrées avec succès.`,
    });
  } catch (error) {
    console.error('Error saving attendances:', error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement des disponibilités." });
  }
}

export async function getSeasonAttendanceStats(req: Request, res: Response) {
  try {
    const seasonYear = (req.query.season as string) || DEFAULT_SEASON;
    const clubId = extractClubId(req);
    const season = await getOrCreateSeason(seasonYear);

    const isAuth = isDirectorAuthenticated(req);

    // Retrieve all rounds with attendances and team drafts for this club
    const allRounds = await prisma.round.findMany({
      where: {
        seasonId: season.id,
        clubId,
      },
      include: {
        attendances: true,
        drafts: {
          include: {
            boards: true,
          },
        },
      },
      orderBy: { roundNumber: 'asc' },
    });

    // Public privacy: Only completed / past rounds are shown to visitors; Director sees all
    const rounds = isAuth ? allRounds : allRounds.filter((r) => isRoundInPast(r.roundNumber));

    const playerMap: Record<number, {
      playerId: number;
      playerName: string;
      roundsRecorded: number;
      availableCount: number;
      tentativeCount: number;
      unavailableCount: number;
      gamesAssigned: number;
      historyByRound: Record<number, {
        status: string;
        isAssigned: boolean;
        teamNumber?: number;
        boardNumber?: number;
      }>;
    }> = {};

    for (const rd of rounds) {
      // Index assigned boards for this round
      const assignedPlayers = new Map<number, { teamNumber: number; boardNumber: number }>();
      for (const draft of rd.drafts) {
        for (const board of draft.boards) {
          assignedPlayers.set(board.playerId, {
            teamNumber: draft.teamNumber,
            boardNumber: board.boardNumber,
          });
        }
      }

      for (const att of rd.attendances) {
        if (!playerMap[att.playerId]) {
          playerMap[att.playerId] = {
            playerId: att.playerId,
            playerName: att.playerName,
            roundsRecorded: 0,
            availableCount: 0,
            tentativeCount: 0,
            unavailableCount: 0,
            gamesAssigned: 0,
            historyByRound: {},
          };
        }

        const stats = playerMap[att.playerId];
        stats.roundsRecorded += 1;
        if (att.status === 'available') stats.availableCount += 1;
        else if (att.status === 'tentative') stats.tentativeCount += 1;
        else if (att.status === 'unavailable') stats.unavailableCount += 1;

        const assignedInfo = assignedPlayers.get(att.playerId);
        const isAssigned = !!assignedInfo;
        if (isAssigned) {
          stats.gamesAssigned += 1;
        }

        stats.historyByRound[rd.roundNumber] = {
          status: att.status,
          isAssigned,
          teamNumber: assignedInfo?.teamNumber,
          boardNumber: assignedInfo?.boardNumber,
        };
      }

      // Also account for players assigned on boards even if not in attendances
      for (const [playerId, assignedInfo] of assignedPlayers.entries()) {
        if (!playerMap[playerId]) {
          playerMap[playerId] = {
            playerId,
            playerName: `Matr. ${playerId}`,
            roundsRecorded: 1,
            availableCount: 1,
            tentativeCount: 0,
            unavailableCount: 0,
            gamesAssigned: 1,
            historyByRound: {
              [rd.roundNumber]: {
                status: 'available',
                isAssigned: true,
                teamNumber: assignedInfo.teamNumber,
                boardNumber: assignedInfo.boardNumber,
              },
            },
          };
        } else if (!playerMap[playerId].historyByRound[rd.roundNumber]) {
          playerMap[playerId].gamesAssigned += 1;
          playerMap[playerId].historyByRound[rd.roundNumber] = {
            status: 'available',
            isAssigned: true,
            teamNumber: assignedInfo.teamNumber,
            boardNumber: assignedInfo.boardNumber,
          };
        }
      }
    }

    const result = Object.values(playerMap).map((p) => {
      const attendanceRate =
        p.roundsRecorded > 0
          ? Math.round(((p.availableCount + p.tentativeCount * 0.5) / p.roundsRecorded) * 100)
          : 0;

      const selectionRate =
        p.availableCount > 0 ? Math.round((p.gamesAssigned / p.availableCount) * 100) : 0;

      return {
        ...p,
        attendanceRate,
        selectionRate,
      };
    });

    // Sort by attendance rate descending, then games assigned descending
    result.sort((a, b) => b.attendanceRate - a.attendanceRate || b.gamesAssigned - a.gamesAssigned);

    return res.json({
      seasonYear,
      clubId,
      totalRoundsTracked: rounds.length,
      players: result,
    });
  } catch (error) {
    console.error('Error getting season attendance stats:', error);
    return res.status(500).json({ error: 'Erreur lors du calcul des statistiques de présence.' });
  }
}
