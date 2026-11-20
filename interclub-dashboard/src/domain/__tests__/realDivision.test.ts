import { describe, it } from 'vitest';
import { fetchFirestoreRound } from '../../api/firestoreFallback';
import { fetchPlayerDirectory } from '../../api/frbeClient';
import { calculateDivisionStandings } from '../standings';
import { calculateDivisionProjections } from '../projections';
import { DivisionFrbe } from '../../modelsFRBE';

describe('Real Division Integration Test', () => {
  it('inspect 3C with calibrated Monte Carlo simulation', async () => {
    // Fetch rounds 1 to 3
    const [r1, r2, r3, directory] = await Promise.all([
      fetchFirestoreRound(1),
      fetchFirestoreRound(2),
      fetchFirestoreRound(3),
      fetchPlayerDirectory().catch(() => new Map()),
    ]);

    if (!r1) return;

    // Target division 3C
    const target = r1.find((d) => d.division === 3 && d.index === 'C');
    if (!target) return;

    console.log(`\n=== Calibrated Inspection: Division 3C ===`);
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

    const standings = calculateDivisionStandings(mergedDiv, 0, directory);
    const projections = calculateDivisionProjections(mergedDiv, standings, 2500);

    console.log(`\nResults after round 3 in Div 3C (rules: 1 promotion, 2 relegations):`);
    console.log(`Favorite: ${projections.favoriteTeam?.teamName} (${projections.favoriteTeam?.promotionProbability.toFixed(1)}% Montée)`);

    console.log('\nÉquipe                    | Pts  | Rang | Exp  | Montée(1er)| Maintien(Top10)| Relég(11-12) | Row Sum');
    console.log('-------------------------------------------------------------------------------------------------');
    projections.teams.forEach((t) => {
      const name = t.teamName.padEnd(25, ' ').slice(0, 25);
      const pts = `${t.matchPoints} pts`.padEnd(5, ' ');
      const curRank = `${t.rank}e`.padEnd(5, ' ');
      const expRank = `${t.expectedRank.toFixed(1)}e`.padEnd(5, ' ');
      const p1 = `${t.promotionProbability.toFixed(1)}%`.padEnd(11, ' ');
      const safe = `${t.safeProbability.toFixed(1)}%`.padEnd(15, ' ');
      const rel = `${t.relegationProbability.toFixed(1)}%`.padEnd(13, ' ');
      const rowSum = t.integerRankProbabilities.reduce((a, b) => a + b, 0);
      console.log(`${name} | ${pts} | ${curRank} | ${expRank} | ${p1} | ${safe} | ${rel} | ${rowSum}%`);
    });

    console.log('\nDistribution des rangs entiers (1er à 12e):');
    projections.teams.slice(0, 5).forEach((t) => {
      console.log(`${t.teamName.padEnd(20)}: [${t.integerRankProbabilities.join(', ')}]`);
    });
  }, 30000);
});
