import { describe, it } from 'vitest';
import { fetchFirestoreRound } from '../../api/firestoreFallback';
import { calculateDivisionStandings } from '../standings';
import { calculateDivisionProjections } from '../projections';
import { DivisionFrbe } from '../../modelsFRBE';

describe('Real Division Integration Test', () => {
  it('runs Monte Carlo projections on a real division from Firestore mirror', async () => {
    // Fetch rounds 1 to 3
    const [r1, r2, r3] = await Promise.all([
      fetchFirestoreRound(1),
      fetchFirestoreRound(2),
      fetchFirestoreRound(3),
    ]);

    if (!r1 || r1.length === 0) {
      console.log('Firestore mirror unavailable during test, skipping network test.');
      return;
    }

    // Pick division 3A or 4A or first available division
    const target = r1.find((d) => d.division === 3 && d.index === 'A') || r1[0];
    console.log(`\n=== Testing Real Division: Division ${target.division}${target.index} ===`);

    // Merge rounds for this division
    const mergedDiv: DivisionFrbe = {
      division: target.division,
      index: target.index,
      teams: target.teams,
      rounds: [...target.rounds],
    };

    [r2, r3].forEach((roundDivs) => {
      if (!roundDivs) return;
      const match = roundDivs.find(
        (d) => d.division === target.division && d.index === target.index
      );
      if (match) {
        match.rounds.forEach((rd) => {
          if (!mergedDiv.rounds.some((r) => r.round === rd.round)) {
            mergedDiv.rounds.push(rd);
          }
        });
      }
    });

    const standings = calculateDivisionStandings(mergedDiv, 901); // 901 or any club
    const projections = calculateDivisionProjections(mergedDiv, standings, 2000);

    console.log(`\nResults after round ${projections.playedRounds} (${projections.remainingRounds} rounds remaining):`);
    console.log(`Favorite: ${projections.favoriteTeam?.teamName} (${projections.favoriteTeam?.championProbability}% 1st)`);

    console.log('\nEquipe                     | Pts | Rang Act | Exp Rang | 1er (%) | Top 2 (%) | Top 8 (Maintien) | Relég (%) | Maintien Assuré?');
    console.log('-------------------------------------------------------------------------------------------------------------------------');
    projections.teams.forEach((t) => {
      const name = t.teamName.padEnd(26, ' ').slice(0, 26);
      const pts = `${t.matchPoints} pts`.padEnd(5, ' ');
      const curRank = `${t.rank}e`.padEnd(8, ' ');
      const expRank = `${t.expectedRank}e`.padEnd(8, ' ');
      const p1 = `${t.championProbability}%`.padEnd(7, ' ');
      const p2 = `${t.top2Probability}%`.padEnd(9, ' ');
      const p8 = `${t.top8Probability}%`.padEnd(16, ' ');
      const prel = `${t.relegationProbability}%`.padEnd(9, ' ');
      const safe = t.isGuaranteedTop8 ? 'OUI (Assuré)' : 'En jeu';
      console.log(`${name} | ${pts} | ${curRank} | ${expRank} | ${p1} | ${p2} | ${p8} | ${prel} | ${safe}`);
    });
  }, 30000);
});
