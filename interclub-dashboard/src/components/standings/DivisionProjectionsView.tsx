import React, { useState } from 'react';
import { DivisionProjections, TeamProjection, SimulationMode } from '../../domain/projections';
import { DivisionStandingTable } from '../../domain/standings';
import { TeamHoverCard } from '../common/TeamHoverCard';
import {
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Scale,
} from 'lucide-react';

interface Props {
  projections: DivisionProjections;
  standingTable: DivisionStandingTable;
}

type SortField = 'currentRank' | 'expectedRank' | 'promotion' | 'safe' | 'relegation';

export const DivisionProjectionsView: React.FC<Props> = ({ projections, standingTable }) => {
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('elo');
  const [sortField, setSortField] = useState<SortField>('currentRank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const rules = projections.rules;
  const totalTeams = projections.totalTeams;

  // Active projection teams based on selected mode (Elo vs Neutral)
  const currentTeams = simulationMode === 'elo' ? projections.teams : projections.teamsNeutral;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'currentRank' || field === 'expectedRank');
    }
  };

  const sortedTeams = [...currentTeams].sort((a, b) => {
    let diff = 0;
    switch (sortField) {
      case 'currentRank':
        diff = a.rank - b.rank;
        break;
      case 'expectedRank':
        diff = a.expectedRank - b.expectedRank;
        break;
      case 'promotion':
        diff = b.promotionProbability - a.promotionProbability;
        break;
      case 'safe':
        diff = b.safeProbability - a.safeProbability;
        break;
      case 'relegation':
        diff = b.relegationProbability - a.relegationProbability;
        break;
    }
    return sortAsc ? diff : -diff;
  });

  // Count teams that have secured or virtually secured safety (>= 99.5% or mathematically guaranteed)
  const safeCount = currentTeams.filter(
    (t) => t.isGuaranteedSafe || t.safeProbability >= 99.5
  ).length;

  const inDangerCount = currentTeams.filter((t) => t.relegationProbability >= 50).length;

  const currentFavorite = sortedTeams.reduce((fav, t) =>
    t.promotionProbability > fav.promotionProbability ? t : fav
  , sortedTeams[0]);

  // Clean light-theme heatmap cell color scale
  const getCellHeatmapStyle = (prob: number) => {
    if (prob <= 0) {
      return 'bg-transparent text-slate-300 font-normal';
    }
    if (prob < 15) {
      return 'bg-slate-100 text-slate-600 font-medium hover:bg-slate-200';
    }
    if (prob < 30) {
      return 'bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100';
    }
    if (prob < 60) {
      return 'bg-indigo-200/90 text-indigo-900 font-bold hover:bg-indigo-300';
    }
    // High peak (>= 60%): High-contrast rich indigo with white bold text
    return 'bg-indigo-600 text-white font-black shadow-xs hover:bg-indigo-700';
  };

  const promoCutoff = rules.promotionSpots > 0 ? rules.promotionSpots : (rules.hasTitle ? 1 : 1);
  const relegateCutoff = rules.safeRankMax;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {/* Streamlined Single Control Toolbar */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">
                Simulation Monte-Carlo &bull; {projections.divisionLabel}
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({projections.remainingRounds} ronde{projections.remainingRounds > 1 ? 's' : ''} restante{projections.remainingRounds > 1 ? 's' : ''})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Règles officielles :{' '}
              <strong className="text-slate-700">
                {rules.promotionSpots === 0
                  ? 'Titre de Champion'
                  : rules.promotionSpots === 1
                  ? '1 montant (champion)'
                  : '2 montants (1er et 2e)'}
              </strong>
              {rules.relegationSpots > 0 ? (
                <>
                  {' '}&bull;{' '}
                  <strong className="text-rose-600">2 descentes (11e et 12e)</strong>
                  {' '}&bull; Maintien = Top 10
                </>
              ) : (
                <>
                  {' '}&bull;{' '}
                  <strong className="text-emerald-700">Aucune descente</strong>
                </>
              )}
            </p>
          </div>

          {/* Model Toggle: [ ♟️ Modèle Élo ] [ ⚖️ Neutre (Chances 50-50) ] */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/90 rounded-xl text-xs shrink-0 font-semibold shadow-2xs">
            <button
              onClick={() => setSimulationMode('elo')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                simulationMode === 'elo'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Simulation probabiliste basée sur les cotes Elo et la force des effectifs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Modèle Élo</span>
            </button>
            <button
              onClick={() => setSimulationMode('neutral')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                simulationMode === 'neutral'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Simulation neutre (50/50 à chaque match) : probabilités basées uniquement sur les points actuels et le calendrier restant"
            >
              <Scale className="h-3.5 w-3.5 text-indigo-400" />
              <span>Modèle Neutre (50-50)</span>
            </button>
          </div>
        </div>

        {/* Compact Inline Indicators (Spacious & Clean) */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-3 sm:gap-6 flex-wrap text-xs">
          {currentFavorite && (
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-slate-500">Favori {rules.promotionLabel} :</span>
              <strong className="text-slate-900 font-semibold truncate max-w-[150px] sm:max-w-[200px]" title={currentFavorite.teamName}>
                {currentFavorite.teamName}
              </strong>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                {currentFavorite.promotionProbability.toFixed(1)}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500">Maintien Assuré :</span>
            <strong className="text-slate-900 font-mono">
              {safeCount}/{projections.totalTeams}
            </strong>
            <span className="text-slate-400 text-[11px]">
              ({safeCount > 0 ? 'sécurisées à 100%' : 'en cours'})
            </span>
          </div>

          {inDangerCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span className="text-slate-500">En Danger (≥50%) :</span>
              <strong className="text-rose-700 font-mono">
                {inDangerCount} équipe{inDangerCount > 1 ? 's' : ''}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* LIGHT-THEME DISTRIBUTION HEATMAP MATRIX */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <table className="w-full border-collapse font-sans select-none text-slate-900">
          <thead>
            <tr className="text-slate-500 text-xs font-mono border-b border-slate-200/80">
              <th className="py-2.5 pr-4 text-left font-semibold text-slate-700 w-44 sm:w-56">
                Équipe
              </th>
              {/* Ranks 1 to totalTeams */}
              {Array.from({ length: totalTeams }, (_, i) => {
                const rankNum = i + 1;
                const isPromoLine = rankNum === promoCutoff;
                const isRelegateLine = rules.relegationSpots > 0 && rankNum === relegateCutoff;

                let headerColor = 'text-slate-600';
                if (rankNum <= promoCutoff) headerColor = 'text-amber-700 font-bold';
                else if (rules.relegationSpots > 0 && rankNum > relegateCutoff)
                  headerColor = 'text-rose-700 font-bold';

                return (
                  <th
                    key={rankNum}
                    className={`py-2 text-center w-8 sm:w-10 text-[11px] sm:text-xs ${headerColor} ${
                      isPromoLine ? 'border-r-2 border-r-amber-500 pr-0.5' : ''
                    } ${isRelegateLine ? 'border-r-2 border-r-rose-400 pr-0.5' : ''}`}
                  >
                    {rankNum}
                  </th>
                );
              })}

              {/* DISTINCT BORDER SEPARATION FOR SUMMARY METRICS */}
              <th
                onClick={() => handleSort('expectedRank')}
                className="py-2.5 px-4 text-right font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors border-l-2 border-slate-200/90 pl-5"
                title="Rang attendu (moyenne pondérée sur 3 000 simulations)"
              >
                <div className="inline-flex items-center gap-1 justify-end">
                  <span>Rang attendu</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('promotion')}
                className="py-2.5 px-4 text-right font-semibold text-amber-800 cursor-pointer hover:text-amber-900 transition-colors"
                title={rules.hasTitle ? 'Titre de champion' : 'Chances de montée'}
              >
                <div className="inline-flex items-center gap-1 justify-end">
                  <span>{rules.promotionLabel}</span>
                  <ArrowUpDown className="h-3 w-3 text-amber-500" />
                </div>
              </th>
              {rules.relegationSpots > 0 && (
                <th
                  onClick={() => handleSort('safe')}
                  className="py-2.5 px-4 text-right font-semibold text-emerald-800 cursor-pointer hover:text-emerald-900 transition-colors"
                  title="Chances de maintien (Top 10)"
                >
                  <div className="inline-flex items-center gap-1 justify-end">
                    <span>Maintien</span>
                    <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTeams.map((t) => {
              const standingTeam = standingTable.teams.find(
                (st) => st.pairingNumber === t.pairingNumber
              );
              const isOur = t.isOurClub;

              return (
                <tr
                  key={t.pairingNumber}
                  className={`transition-colors ${
                    isOur ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Team Name Column */}
                  <td className="py-2.5 pr-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                        {t.rank}
                      </span>
                      {standingTeam ? (
                        <TeamHoverCard team={standingTeam} divisionLabel={projections.divisionLabel}>
                          <span
                            className={`text-xs sm:text-sm truncate max-w-[130px] sm:max-w-[180px] cursor-pointer ${
                              isOur ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'
                            } hover:underline`}
                            title={t.teamName}
                          >
                            {t.teamName}
                          </span>
                        </TeamHoverCard>
                      ) : (
                        <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                          {t.teamName}
                        </span>
                      )}
                      {isOur && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 text-[8px] font-bold uppercase rounded">
                          Club
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rank Probability Cells (1 to totalTeams) */}
                  {Array.from({ length: totalTeams }, (_, i) => {
                    const rankNum = i + 1;
                    const val = t.integerRankProbabilities[i] || 0;
                    const isPromoLine = rankNum === promoCutoff;
                    const isRelegateLine = rules.relegationSpots > 0 && rankNum === relegateCutoff;

                    return (
                      <td
                        key={rankNum}
                        className={`p-0.5 text-center ${
                          isPromoLine ? 'border-r-2 border-r-amber-500' : ''
                        } ${isRelegateLine ? 'border-r-2 border-r-rose-400' : ''}`}
                      >
                        <div
                          className={`h-7 w-7 sm:h-8 sm:w-8 mx-auto flex items-center justify-center rounded-md text-[10px] sm:text-xs font-mono transition-transform hover:scale-110 cursor-default ${getCellHeatmapStyle(
                            val
                          )}`}
                          title={`Place ${rankNum}e : ${val}% (précis : ${t.rankProbabilities[i]}%)`}
                        >
                          {val > 0 ? val : ''}
                        </div>
                      </td>
                    );
                  })}

                  {/* Expected Rank (with distinct left border separation) */}
                  <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 border-l-2 border-slate-200/90 pl-5 font-semibold">
                    {t.expectedRank.toFixed(1)}e
                  </td>

                  {/* Promotion / Title Prob */}
                  <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-amber-700">
                    {t.isGuaranteedPromotion || t.isGuaranteedChampion
                      ? '100.0%'
                      : `${t.promotionProbability.toFixed(1)}%`}
                  </td>

                  {/* Safe / Maintien Prob */}
                  {rules.relegationSpots > 0 && (
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-emerald-700">
                      {t.isGuaranteedSafe || t.safeProbability >= 99.9
                        ? '100.0%'
                        : `${t.safeProbability.toFixed(1)}%`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-1 bg-amber-500 inline-block rounded-xs" />
              Ligne orange : Seuil de {rules.promotionLabel}
            </span>
            {rules.relegationSpots > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-1 bg-rose-400 inline-block rounded-xs" />
                Ligne rouge : Seuil de Relégation (11e et 12e)
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-indigo-600 inline-block rounded-xs" />
              Bleu foncé : Forte probabilité (&ge; 60%)
            </span>
          </div>

          <div className="font-mono text-slate-400 text-[10px]">
            Tirages Monte-Carlo : 3 000 simulations par division &bull; Total lignes = 100%
          </div>
        </div>
      </div>
    </div>
  );
};
