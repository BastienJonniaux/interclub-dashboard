import { PrismaClient } from '../node_modules/@prisma/client/default.js';
import dotenv from '../node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: 'C:/Users/basti/OneDrive/INFO/interclub-dashboard/server/.env' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const seasons = await prisma.season.findMany();
  console.log('SEASONS:', seasons);

  const rounds = await prisma.round.findMany({
    include: {
      drafts: {
        include: {
          boards: true,
        },
      },
      attendances: true,
    },
  });
  console.log('ROUNDS COUNT:', rounds.length);
  for (const r of rounds) {
    console.log(`Round ${r.roundNumber} (id: ${r.id}, locked: ${r.isLocked}): ${r.drafts.length} drafts, ${r.attendances.length} attendances`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
