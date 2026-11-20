import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { isDirectorAuthenticated } from '../middleware/auth';
import { isRoundInPast } from '../utils/calendar';
import { DEFAULT_SEASON, getOrCreateSeason, extractClubId } from '../utils/season';
import { saveDraftsSchema, lockRoundSchema } from '../validation/schemas';
import { validateRoundDrafts, ValidationSummary, TeamDraftPayload } from '../validation/frbeRules';

export async function getRoundDrafts(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const seasonYear = (req.query.season as string) || DEFAULT_SEASON;
    const clubId = extractClubId(req);

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
        seasonId_clubId_roundNumber: {
          seasonId: season.id,
          clubId,
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
        clubId,
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
      clubId: round.clubId,
      seasonYear,
      isLocked: round.isLocked,
      lockedAt: round.lockedAt,
      updatedAt: round.updatedAt,
      savedBy: round.savedBy || null,
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
    if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 11) {
      return res.status(400).json({ error: 'Numéro de ronde invalide (1 à 11 attendu).' });
    }

    // 1. Zod schema validation (structural integrity & duplicate rejection)
    const parseResult = saveDraftsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Données de composition invalides.',
        details: parseResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { drafts } = parseResult.data;
    const seasonYear = parseResult.data.seasonYear || DEFAULT_SEASON;
    const clubId = parseResult.data.clubId || extractClubId(req);
    const authorName = (req as any).authorName || parseResult.data.savedBy || 'Directeur';

    // 2. FRBE regulations advisory validation
    const frbeValidation = validateRoundDrafts(drafts);

    const season = await getOrCreateSeason(seasonYear);

    // Check if round exists and is locked
    const existingRound = await prisma.round.findUnique({
      where: {
        seasonId_clubId_roundNumber: {
          seasonId: season.id,
          clubId,
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
          savedBy: authorName,
        },
        update: {
          updatedAt: new Date(),
          savedBy: authorName,
        },
      });

      for (const teamKey of Object.keys(drafts)) {
        const teamNumber = parseInt(teamKey, 10);
        if (isNaN(teamNumber)) continue;

        const teamData = drafts[teamKey];
        const divisionLabel = teamData.divisionLabel || null;
        const boardsList = teamData.boards || [];

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
            savedBy: authorName,
          },
          update: {
            divisionLabel,
            savedBy: authorName,
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
      clubId,
      message: `Compositions de la ronde ${roundNumber} enregistrées avec succès.`,
      validation: frbeValidation,
    });
  } catch (error) {
    console.error('Error saving round drafts:', error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement des compositions." });
  }
}

export async function toggleRoundLock(req: Request, res: Response) {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 11) {
      return res.status(400).json({ error: 'Numéro de ronde invalide (1 à 11 attendu).' });
    }

    const parseResult = lockRoundSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Paramètres de verrouillage invalides.',
        details: parseResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { lock, seasonYear = DEFAULT_SEASON } = parseResult.data;
    const clubId = parseResult.data.clubId || extractClubId(req);
    const authorName = (req as any).authorName || parseResult.data.savedBy || 'Directeur';

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
        isLocked: lock,
        lockedAt: lock ? new Date() : null,
        savedBy: authorName,
      },
      update: {
        isLocked: lock,
        lockedAt: lock ? new Date() : null,
        savedBy: authorName,
      },
    });

    // Option B: Validate FRBE rules on lock and return advisory report
    let validation: ValidationSummary | undefined;
    if (lock) {
      const fullRound = await prisma.round.findUnique({
        where: { id: round.id },
        include: {
          drafts: {
            include: {
              boards: true,
            },
          },
        },
      });

      if (fullRound && fullRound.drafts.length > 0) {
        const roundDraftsDict: Record<number, TeamDraftPayload> = {};
        for (const td of fullRound.drafts) {
          roundDraftsDict[td.teamNumber] = {
            divisionLabel: td.divisionLabel || undefined,
            boards: td.boards.map((b) => ({
              board: b.boardNumber,
              playerId: b.playerId,
              playerName: b.playerName,
              playerRating: b.playerRating,
            })),
          };
        }
        validation = validateRoundDrafts(roundDraftsDict);
      }
    }

    const warningNote = validation?.hasErrors
      ? ' (Avertissement : des infractions FRBE ont été détectées)'
      : '';

    return res.json({
      success: true,
      roundNumber: round.roundNumber,
      clubId: round.clubId,
      isLocked: round.isLocked,
      lockedAt: round.lockedAt,
      savedBy: round.savedBy,
      validation,
      message: round.isLocked
        ? `Ronde ${roundNumber} verrouillée : les compositions sont désormais officielles.${warningNote}`
        : `Ronde ${roundNumber} déverrouillée pour modification.`,
    });
  } catch (error) {
    console.error('Error locking/unlocking round:', error);
    return res.status(500).json({ error: 'Erreur lors du verrouillage de la ronde.' });
  }
}
