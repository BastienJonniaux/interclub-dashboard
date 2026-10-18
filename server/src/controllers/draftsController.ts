import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { isDirectorAuthenticated } from '../middleware/auth';
import { isRoundInPast } from '../utils/calendar';

const DEFAULT_SEASON = '2026-2027';

async function getOrCreateSeason(year: string = DEFAULT_SEASON) {
  let season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    season = await prisma.season.create({
      data: {
        year,
        isCurrent: true,
      },
    });
  }
  return season;
}

export async function getRoundDrafts(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const seasonYear = (req.query.season as string) || DEFAULT_SEASON;

    if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 11) {
      return res.status(400).json({ error: 'Numéro de ronde invalide (1 à 11 attendu).' });
    }

    const isPast = isRoundInPast(roundNumber);
    const isAuth = isDirectorAuthenticated(req);

    // Confidentiality protection: upcoming rounds are exclusively visible to the Director
    if (!isPast && !isAuth) {
      return res.status(403).json({
        error: `La ronde ${roundNumber} est à venir. Les compositions préparatoires sont confidentielles et réservées au Directeur des Interclubs.`,
        isRestricted: true,
        isUpcoming: true,
      });
    }

    const season = await getOrCreateSeason(seasonYear);
    const round = await prisma.round.findUnique({
      where: {
        seasonId_roundNumber: {
          seasonId: season.id,
          roundNumber,
        },
      },
      include: {
        drafts: {
          include: {
            boards: {
              orderBy: { boardNumber: 'asc' },
            },
          },
          orderBy: { teamNumber: 'asc' },
        },
      },
    });

    if (!round) {
      return res.json({
        roundNumber,
        seasonYear,
        isLocked: false,
        lockedAt: null,
        drafts: {},
        boardDetails: {},
      });
    }

    // Format drafts to dictionary: { [teamNumber]: { [boardNumber]: playerId } }
    const draftsDict: Record<number, Record<number, number>> = {};
    const boardDetails: Record<number, Array<{
      board: number;
      playerId: number;
      playerName: string;
      playerRating: number;
    }>> = {};

    for (const d of round.drafts) {
      draftsDict[d.teamNumber] = {};
      boardDetails[d.teamNumber] = [];

      for (const b of d.boards) {
        draftsDict[d.teamNumber][b.boardNumber] = b.playerId;
        boardDetails[d.teamNumber].push({
          board: b.boardNumber,
          playerId: b.playerId,
          playerName: b.playerName,
          playerRating: b.playerRating,
        });
      }
    }

    return res.json({
      roundNumber: round.roundNumber,
      seasonYear,
      isLocked: round.isLocked,
      lockedAt: round.lockedAt,
      updatedAt: round.updatedAt,
      drafts: draftsDict,
      boardDetails,
    });
  } catch (error) {
    console.error('Error fetching round drafts:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des compositions.' });
  }
}

export async function saveRoundDrafts(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const { seasonYear = DEFAULT_SEASON, drafts } = req.body;

    if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 11) {
      return res.status(400).json({ error: 'Numéro de ronde invalide.' });
    }

    if (!drafts || typeof drafts !== 'object') {
      return res.status(400).json({ error: 'Format des compositions invalide.' });
    }

    const season = await getOrCreateSeason(seasonYear);

    // Check if round exists and is locked
    const existingRound = await prisma.round.findUnique({
      where: {
        seasonId_roundNumber: {
          seasonId: season.id,
          roundNumber,
        },
      },
    });

    if (existingRound && existingRound.isLocked) {
      return res.status(403).json({
        error: 'Cette ronde est verrouillée. Déverrouillez-la avant de modifier les compositions.',
      });
    }

    // Upsert round and save team drafts in a transaction
    await prisma.$transaction(async (tx) => {
      const round = await tx.round.upsert({
        where: {
          seasonId_roundNumber: {
            seasonId: season.id,
            roundNumber,
          },
        },
        create: {
          seasonId: season.id,
          roundNumber,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      for (const teamKey of Object.keys(drafts)) {
        const teamNumber = parseInt(teamKey, 10);
        if (isNaN(teamNumber)) continue;

        const teamData = drafts[teamKey];
        const divisionLabel = teamData.divisionLabel || null;
        const boardsList: Array<{
          board: number;
          playerId: number;
          playerName: string;
          playerRating: number;
        }> = Array.isArray(teamData.boards) ? teamData.boards : [];

        // Upsert TeamDraft
        const teamDraft = await tx.teamDraft.upsert({
          where: {
            roundId_teamNumber: {
              roundId: round.id,
              teamNumber,
            },
          },
          create: {
            roundId: round.id,
            teamNumber,
            divisionLabel,
          },
          update: {
            divisionLabel,
            updatedAt: new Date(),
          },
        });

        // Replace board assignments
        await tx.boardAssignment.deleteMany({
          where: { teamDraftId: teamDraft.id },
        });

        if (boardsList.length > 0) {
          await tx.boardAssignment.createMany({
            data: boardsList.map((b) => ({
              teamDraftId: teamDraft.id,
              boardNumber: b.board,
              playerId: b.playerId,
              playerName: b.playerName || `Matr. ${b.playerId}`,
              playerRating: b.playerRating || 0,
            })),
          });
        }
      }
    });

    return res.json({
      success: true,
      message: `Compositions de la ronde ${roundNumber} enregistrées avec succès.`,
    });
  } catch (error) {
    console.error('Error saving round drafts:', error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement des compositions." });
  }
}

export async function toggleRoundLock(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const { lock = true, seasonYear = DEFAULT_SEASON } = req.body;

    if (isNaN(roundNumber)) {
      return res.status(400).json({ error: 'Numéro de ronde invalide.' });
    }

    const season = await getOrCreateSeason(seasonYear);

    const round = await prisma.round.upsert({
      where: {
        seasonId_roundNumber: {
          seasonId: season.id,
          roundNumber,
        },
      },
      create: {
        seasonId: season.id,
        roundNumber,
        isLocked: lock,
        lockedAt: lock ? new Date() : null,
      },
      update: {
        isLocked: lock,
        lockedAt: lock ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      roundNumber: round.roundNumber,
      isLocked: round.isLocked,
      lockedAt: round.lockedAt,
      message: round.isLocked
        ? `Ronde ${roundNumber} verrouillée : les compositions sont désormais officielles.`
        : `Ronde ${roundNumber} déverrouillée pour modification.`,
    });
  } catch (error) {
    console.error('Error locking/unlocking round:', error);
    return res.status(500).json({ error: 'Erreur lors du verrouillage de la ronde.' });
  }
}

