import { describe, it } from 'vitest';
import { fetchFirestoreRound } from '../../api/firestoreFallback';
import { fetchPlayerDirectory } from '../../api/frbeClient';
import { calculateDivisionStandings } from '../standings';
import { calculateDivisionProjections } from '../projections';
import { DivisionFrbe } from '../../modelsFRBE';

describe('Real Division Integration Test', () => {
  it('compares Elo mode vs Neutral 50-50 mode on Division 3C', async () => {
    let r1, r2, r3, directory;
    try {
      [r1, r2, r3, directory] = await Promise.all([
        fetchFirestoreRound(1),
        fetchFirestoreRound(2),
        fetchFirestoreRound(3),
        fetchPlayerDirectory().catch(() => new Map()),
      ]);
    } catch {
      console.log('Network unavailable in test environment, skipping live division test.');
      return;
    }

    if (!r1) return;

    const target = r1.find((d) => d.division === 3 && d.index === 'C');
    if (!target) return;

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

    console.log(`\n=== COMPARATIF DIVISION 3C (Ronde 3 / 8 rondes restantes) ===`);
    console.log('\nÉquipe                    | Pts  | Elo  | Montée ÉLO (%) | Montée NEUTRE 50-50 (%) | Rang Exp Élo | Rang Exp Neutre');
    console.log('------------------------------------------------------------------------------------------------------------------');
    projections.teams.forEach((t) => {
      const neutral = projections.teamsNeutral.find((nt) => nt.pairingNumber === t.pairingNumber)!;
      const name = t.teamName.padEnd(25, ' ').slice(0, 25);
      const pts = `${t.matchPoints} pts`.padEnd(5, ' ');
      const elo = `${t.seasonAvgElo}`.padEnd(5, ' ');
      const pElo = `${t.promotionProbability.toFixed(1)}%`.padEnd(14, ' ');
      const pNeut = `${neutral.promotionProbability.toFixed(1)}%`.padEnd(23, ' ');
      const expElo = `${t.expectedRank.toFixed(1)}e`.padEnd(12, ' ');
      const expNeut = `${neutral.expectedRank.toFixed(1)}e`;
      console.log(`${name} | ${pts} | ${elo} | ${pElo} | ${pNeut} | ${expElo} | ${expNeut}`);
    });
  }, 30000);
});
