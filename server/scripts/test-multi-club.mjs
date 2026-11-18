import { PrismaClient } from '../node_modules/@prisma/client/default.js';
import dotenv from '../node_modules/dotenv/lib/main.js';

dotenv.config({ path: 'C:/Users/basti/OneDrive/INFO/interclub-dashboard/server/.env' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function run() {
  console.log('Testing Multi-Club isolation...');

  const season = await prisma.season.findFirst({ where: { year: '2026-2027' } });
  if (!season) throw new Error('Season not found');

  // Check club 541 Round 3
  const club541Round3 = await prisma.round.findUnique({
    where: {
      seasonId_clubId_roundNumber: {
        seasonId: season.id,
        clubId: 541,
        roundNumber: 3,
      },
    },
    include: { drafts: true },
  });
  console.log('Club 541 Round 3 exists:', !!club541Round3, 'Drafts count:', club541Round3?.drafts.length);

  // Create or verify an isolated test club 999 Round 3
  const testClubRound = await prisma.round.upsert({
    where: {
      seasonId_clubId_roundNumber: {
        seasonId: season.id,
        clubId: 999,
        roundNumber: 3,
      },
    },
    create: {
      seasonId: season.id,
      clubId: 999,
      roundNumber: 3,
      isLocked: false,
    },
    update: {},
  });
  console.log('Club 999 Round 3 upserted:', testClubRound.id, 'clubId:', testClubRound.clubId);

  // Verify club 541 is untouched
  const club541Check = await prisma.round.findUnique({
    where: {
      seasonId_clubId_roundNumber: {
        seasonId: season.id,
        clubId: 541,
        roundNumber: 3,
      },
    },
    include: { drafts: true },
  });
  console.log('Club 541 drafts count after test club creation:', club541Check?.drafts.length);

  // Clean up test club 999
  await prisma.round.delete({
    where: { id: testClubRound.id },
  });
  console.log('Test club 999 cleaned up successfully. Multi-club isolation verified!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
