import { z } from 'zod';

export const boardAssignmentSchema = z.object({
  board: z.number().int().min(1).max(8, 'Le numéro d\'échiquier doit être compris entre 1 et 8'),
  playerId: z.number().int().positive('Le matricule joueur doit être un entier positif'),
  playerName: z.string().max(100).optional(),
  playerRating: z.number().int().min(0).max(3500).optional(),
});

export const teamDraftSchema = z.object({
  divisionLabel: z.string().max(20).optional(),
  boards: z.array(boardAssignmentSchema).default([]),
});

export const saveDraftsSchema = z
  .object({
    seasonYear: z.string().optional(),
    clubId: z.number().int().positive().optional(),
    savedBy: z.string().max(50).optional(),
    drafts: z.record(
      z.string().regex(/^\d+$/, 'La clé d\'équipe doit être un entier numérique'),
      teamDraftSchema
    ),
  })
  .superRefine((data, ctx) => {
    // 1. Check for duplicate boards within each team
    for (const [teamKey, teamData] of Object.entries(data.drafts)) {
      const seenBoards = new Set<number>();
      for (const b of teamData.boards) {
        if (seenBoards.has(b.board)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `L'échiquier ${b.board} est assigné plusieurs fois dans l'équipe ${teamKey}.`,
            path: ['drafts', teamKey, 'boards'],
          });
        }
        seenBoards.add(b.board);
      }
    }

    // 2. Check for duplicate player across all teams in the round
    const playerToTeams = new Map<number, number[]>();
    for (const [teamKey, teamData] of Object.entries(data.drafts)) {
      const teamNumber = parseInt(teamKey, 10);
      for (const b of teamData.boards) {
        const existing = playerToTeams.get(b.playerId) || [];
        existing.push(teamNumber);
        playerToTeams.set(b.playerId, existing);
      }
    }

    for (const [playerId, teamList] of playerToTeams.entries()) {
      if (teamList.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Le joueur (matricule ${playerId}) est assigné dans plusieurs équipes différentes (${teamList.join(', ')}) pour cette même ronde.`,
          path: ['drafts'],
        });
      }
    }
  });

export const lockRoundSchema = z.object({
  lock: z.boolean().default(true),
  seasonYear: z.string().optional(),
  clubId: z.number().int().positive().optional(),
  savedBy: z.string().max(50).optional(),
});

export type SaveDraftsInput = z.infer<typeof saveDraftsSchema>;
export type LockRoundInput = z.infer<typeof lockRoundSchema>;
