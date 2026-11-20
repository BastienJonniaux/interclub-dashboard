import React, { useState } from 'react';
import { DivisionProjections, TeamProjection } from '../../domain/projections';
import { DivisionStandingTable } from '../../domain/standings';
import { TeamHoverCard } from '../common/TeamHoverCard';
import {
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  Info,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Props {
  projections: DivisionProjections;
  standingTable: DivisionStandingTable;
}

type SortField = 'currentRank' | 'expectedRank' | 'promotion' | 'safe' | 'relegation';
type DisplayMode = 'distribution' | 'tableau';

export const DivisionProjectionsView: React.FC<Props> = ({ projections, standingTable }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('distribution');
  const [sortField, setSortField] = useState<SortField>('currentRank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const rules = projections.rules;
  const totalTeams = projections.totalTeams;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'currentRank' || field === 'expectedRank');
    }
  };

  const sortedTeams = [...projections.teams].sort((a, b) => {
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

  const guaranteedSafeCount = projections.teams.filter((t) => t.isGuaranteedSafe).length;
  const inDangerCount = projections.teams.filter((t) => t.relegationProbability >= 50).length;

  // Cell heatmap background and text color according to probability
  const getCellHeatmapStyle = (prob: number) => {
    if (prob <= 0) {
      return 'bg-[#1a1614] text-stone-700 font-normal';
    }
    if (prob < 15) {
      return 'bg-[#4a3328] text-stone-300 font-medium';
    }
    if (prob < 30) {
      return 'bg-[#7c4430] text-stone-100 font-semibold';
    }
    if (prob < 60) {
      return 'bg-[#9864b2] text-white font-bold';
    }
    // High peak: bright lavender with dark bold text (exactly like screenshot 98, 83, 84)
    return 'bg-[#d8b4fe] text-[#2e1065] font-black shadow-inner';
  };

  // Determine promo column cutoff (e.g. 1 for Div 2-4, 6; 2 for Div 5)
  const promoCutoff = rules.promotionSpots > 0 ? rules.promotionSpots : (rules.hasTitle ? 1 : 1);
  const relegateCutoff = rules.safeRankMax; // after safeRankMax (e.g. 10), columns 11 & 12 are relegation

  return (
    <div className="space-y-4">
      {/* Informative Header Banner */}
      <div className="bg-stone-950 text-white rounded-xl p-4 sm:p-5 border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                Monte Carlo calibré (2 500 itérations)
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {projections.isSeasonCompleted
                  ? 'Saison terminée'
                  : `${projections.remainingRounds} ronde${projections.remainingRounds > 1 ? 's' : ''} restante${projections.remainingRounds > 1 ? 's' : ''}`}
              </span>
              <span className="text-xs text-stone-400">
                &bull; Règles {projections.divisionLabel} :{' '}
                <strong className="text-stone-300">
                  {rules.promotionSpots === 0
                    ? 'Champion (1er)'
                    : rules.promotionSpots === 1
                    ? '1 montant (champion)'
                    : '2 montants (1er et 2e)'}
                </strong>
                {rules.relegationSpots > 0 ? (
                  <>
                    {' '}
                    &bull; <strong className="text-rose-300">2 descentes (11e et 12e)</strong>
                  </>
                ) : (
                  <>
                    {' '}
                    &bull; <strong className="text-emerald-300">Aucune descente</strong>
                  </>
                )}
              </span>
            </div>
            <h4 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Projections de fin de saison — {projections.divisionLabel}
            </h4>
          </div>

          {/* View Mode Toggle: [ Tableau | Distribution ] */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 bg-stone-900 border border-stone-800 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setDisplayMode('tableau')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  displayMode === 'tableau'
                    ? 'bg-stone-800 text-white font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Tableau
              </button>
              <button
                onClick={() => setDisplayMode('distribution')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  displayMode === 'distribution'
                    ? 'bg-stone-800 text-white font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Distribution
              </button>
            </div>
          </div>
        </div>

        {/* Quick Badges Row */}
        <div className="mt-4 pt-3 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {projections.favoriteTeam && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-semibold text-amber-300 tracking-wider flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Favori {rules.promotionLabel}
              </span>
              <span className="font-bold text-white block mt-0.5 truncate" title={projections.favoriteTeam.teamName}>
                {projections.favoriteTeam.teamName}
              </span>
              <span className="text-[11px] font-mono font-semibold text-amber-300">
                {projections.favoriteTeam.promotionProbability.toFixed(1)}% de chance
              </span>
            </div>
          )}

          <div className="bg-stone-900/90 border border-stone-800 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-emerald-300 tracking-wider flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Maintien Assuré (Top {rules.safeRankMax})
            </span>
            <span className="text-lg font-bold text-white block mt-0.5 font-mono">
              {guaranteedSafeCount}{' '}
              <span className="text-xs font-normal text-stone-400">/{projections.totalTeams}</span>
            </span>
            <span className="text-[10px] text-stone-400">
              {guaranteedSafeCount > 0 ? 'mathématiquement sûres' : 'calcul en cours'}
            </span>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-lg p-2.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-semibold text-rose-300 tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> En Danger (Descente &ge; 50%)
            </span>
            <span className="text-lg font-bold text-white block mt-0.5 font-mono">
              {inDangerCount}{' '}
              <span className="text-xs font-normal text-stone-400">équipe{inDangerCount > 1 ? 's' : ''}</span>
            </span>
            <span className="text-[10px] text-stone-400">11e ou 12e place</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: DISTRIBUTION HEATMAP MATRIX (SCREENSHOT REPRODUCTION) */}
      {displayMode === 'distribution' && (
        <div className="bg-[#14100e] border border-stone-800 rounded-xl p-3 sm:p-5 shadow-xl overflow-x-auto text-white">
          <table className="w-full border-collapse font-sans select-none">
            <thead>
              <tr className="text-stone-400 text-xs font-mono">
                <th className="py-2.5 pr-4 text-left font-semibold text-stone-300 w-44 sm:w-56">
                  Équipe
                </th>
                {/* Ranks 1 to totalTeams */}
                {Array.from({ length: totalTeams }, (_, i) => {
                  const rankNum = i + 1;
                  const isPromoLine = rankNum === promoCutoff;
                  const isRelegateLine = rules.relegationSpots > 0 && rankNum === relegateCutoff;

                  let headerColor = 'text-stone-400';
                  if (rankNum <= promoCutoff) headerColor = 'text-amber-400 font-bold';
                  else if (rules.relegationSpots > 0 && rankNum > relegateCutoff)
                    headerColor = 'text-rose-400 font-bold';

                  return (
                    <th
                      key={rankNum}
                      className={`py-2 text-center w-8 sm:w-10 text-[11px] sm:text-xs ${headerColor} ${
                        isPromoLine ? 'border-r-2 border-r-amber-500/90 pr-0.5' : ''
                      } ${isRelegateLine ? 'border-r-2 border-r-rose-500/90 pr-0.5' : ''}`}
                    >
                      {rankNum}
                    </th>
                  );
                })}
                <th
                  onClick={() => handleSort('expectedRank')}
                  className="py-2.5 px-3 text-right font-semibold text-stone-300 cursor-pointer hover:text-white transition-colors"
                  title="Rang attendu (moyenne pondérée sur 2 500 simulations)"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Rang attendu</span>
                    <ArrowUpDown className="h-3 w-3 text-stone-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('promotion')}
                  className="py-2.5 px-3 text-right font-semibold text-amber-300 cursor-pointer hover:text-amber-200 transition-colors"
                  title={rules.hasTitle ? 'Titre de champion' : 'Chances de montée'}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>{rules.promotionLabel}</span>
                    <ArrowUpDown className="h-3 w-3 text-stone-500" />
                  </div>
                </th>
                {rules.relegationSpots > 0 && (
                  <th
                    onClick={() => handleSort('safe')}
                    className="py-2.5 pl-3 pr-2 text-right font-semibold text-emerald-300 cursor-pointer hover:text-emerald-200 transition-colors"
                    title="Chances de maintien (Top 10)"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Maintien</span>
                      <ArrowUpDown className="h-3 w-3 text-stone-500" />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((t) => {
                const standingTeam = standingTable.teams.find(
                  (st) => st.pairingNumber === t.pairingNumber
                );
                const isOur = t.isOurClub;

                return (
                  <tr
                    key={t.pairingNumber}
                    className={`border-t border-stone-850 transition-colors ${
                      isOur ? 'bg-emerald-950/30' : 'hover:bg-stone-900/40'
                    }`}
                  >
                    {/* Team Name Column */}
                    <td className="py-2.5 pr-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-stone-500 w-4 text-right">
                          {t.rank}
                        </span>
                        {standingTeam ? (
                          <TeamHoverCard team={standingTeam} divisionLabel={projections.divisionLabel}>
                            <span
                              className={`text-xs sm:text-sm truncate max-w-[130px] sm:max-w-[180px] cursor-pointer ${
                                isOur ? 'font-bold text-emerald-400' : 'font-medium text-stone-200'
                              } hover:underline`}
                              title={t.teamName}
                            >
                              {t.teamName}
                            </span>
                          </TeamHoverCard>
                        ) : (
                          <span className="text-xs sm:text-sm font-medium text-stone-200 truncate">
                            {t.teamName}
                          </span>
                        )}
                        {isOur && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 text-[8px] font-bold uppercase rounded">
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
                            isPromoLine ? 'border-r-2 border-r-amber-500/90' : ''
                          } ${isRelegateLine ? 'border-r-2 border-r-rose-500/90' : ''}`}
                        >
                          <div
                            className={`h-7 w-7 sm:h-8 sm:w-8 mx-auto flex items-center justify-center rounded text-[10px] sm:text-xs font-mono transition-transform hover:scale-105 cursor-default ${getCellHeatmapStyle(
                              val
                            )}`}
                            title={`Place ${rankNum}e : ${val}% (précis: ${t.rankProbabilities[i]}%)`}
                          >
                            {val > 0 ? val : ''}
                          </div>
                        </td>
                      );
                    })}

                    {/* Expected Rank */}
                    <td className="py-2 px-3 text-right font-mono text-xs text-stone-300">
                      {t.expectedRank.toFixed(1)}
                    </td>

                    {/* Promotion / Title Prob */}
                    <td className="py-2 px-3 text-right font-mono text-xs font-bold text-amber-300">
                      {t.isGuaranteedPromotion || t.isGuaranteedChampion
                        ? '100.0%'
                        : `${t.promotionProbability.toFixed(1)}%`}
                    </td>

                    {/* Safe / Maintien Prob */}
                    {rules.relegationSpots > 0 && (
                      <td className="py-2 pl-3 pr-2 text-right font-mono text-xs font-bold text-emerald-300">
                        {t.isGuaranteedSafe ? '100.0%' : `${t.safeProbability.toFixed(1)}%`}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Divider Legend */}
          <div className="mt-4 pt-3 border-t border-stone-850 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-400 gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-1 bg-amber-500 inline-block rounded-xs" />
                Ligne orange : Seuil de {rules.promotionLabel}
              </span>
              {rules.relegationSpots > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-1 bg-rose-500 inline-block rounded-xs" />
                  Ligne rouge : Seuil de Relégation (11e et 12e)
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 bg-[#d8b4fe] inline-block rounded-xs" />
                Pic de probabilité (&ge; 60%)
              </span>
            </div>
            <div className="text-stone-500 font-mono text-[10px]">
              Chaque ligne totalise exactement 100% (Méthode des plus forts restes)
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRADITIONAL TABLE VIEW */}
      {displayMode === 'tableau' && (
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
          <table className="w-full text-left text-sm text-slate-900">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200/80">
              <tr>
                <th
                  onClick={() => handleSort('currentRank')}
                  className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  title="Trier par rang actuel"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Rang Actuel</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-5 py-3.5 border-r border-slate-200/60">Équipe & Statut</th>
                <th className="px-3 py-3.5 text-center border-r border-slate-200/60">Pts Match</th>
                <th className="px-3 py-3.5 text-center border-r border-slate-200/60">Restants</th>
                <th
                  onClick={() => handleSort('expectedRank')}
                  className="px-3 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  title="Rang moyen obtenu dans les simulations"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Rang Espéré</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('promotion')}
                  className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  title={`Probabilité de ${rules.promotionLabel}`}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>🏆 {rules.promotionLabel}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                {rules.relegationSpots > 0 && (
                  <th
                    onClick={() => handleSort('safe')}
                    className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    title={`Maintien assuré dans le Top ${rules.safeRankMax}`}
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>🛡️ Maintien</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {rules.relegationSpots > 0 && (
                  <th
                    onClick={() => handleSort('relegation')}
                    className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    title="Probabilité de relégation (11e et 12e)"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>🔻 Relégation</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                )}
                <th className="px-5 py-3.5 text-center">Intervalle Possible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTeams.map((t) => {
                const standingTeam = standingTable.teams.find(
                  (st) => st.pairingNumber === t.pairingNumber
                );
                const isOur = t.isOurClub;

                // Status badge
                let statusBadge = null;
                if (t.isGuaranteedChampion) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-md">
                      <Award className="h-3 w-3" /> Champion Assuré
                    </span>
                  );
                } else if (t.isGuaranteedPromotion) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      <Trophy className="h-3 w-3 text-amber-600" /> Montée Assurée
                    </span>
                  );
                } else if (t.isFavorite) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      <Trophy className="h-3 w-3 text-amber-600" /> Favori ({t.promotionProbability.toFixed(1)}%)
                    </span>
                  );
                } else if (t.isGuaranteedSafe) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Maintien Assuré
                    </span>
                  );
                } else if (t.isGuaranteedRelegated) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-md">
                      <XCircle className="h-3 w-3 text-rose-600" /> Relégation Mathématique
                    </span>
                  );
                } else if (t.relegationProbability >= 50) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                      <AlertTriangle className="h-3 w-3 text-rose-600" /> En Danger ({t.relegationProbability.toFixed(1)}%)
                    </span>
                  );
                }

                return (
                  <tr
                    key={t.pairingNumber}
                    className={`transition-colors ${
                      isOur ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center font-bold text-xs rounded-md border ${
                          t.rank <= promoCutoff
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : rules.relegationSpots > 0 && t.rank > relegateCutoff
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {t.rank}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 border-r border-slate-200/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {standingTeam ? (
                            <TeamHoverCard team={standingTeam} divisionLabel={projections.divisionLabel}>
                              <span
                                className={`text-sm cursor-pointer ${
                                  isOur ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'
                                } hover:underline`}
                              >
                                {t.teamName}
                              </span>
                            </TeamHoverCard>
                          ) : (
                            <span className="font-medium text-slate-800 text-sm">{t.teamName}</span>
                          )}
                          {isOur && (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold uppercase rounded">
                              Notre Équipe
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge}
                          {t.seasonAvgElo > 0 && (
                            <span className="text-[11px] font-mono text-slate-500">
                              Elo: {t.seasonAvgElo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{t.matchPoints}</span>
                      <span className="block text-[10px] text-slate-500">{t.boardPoints} bp</span>
                    </td>

                    <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums text-slate-600">
                      {t.remaining}
                    </td>

                    <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{t.expectedRank.toFixed(1)}e</span>
                    </td>

                    <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                      <span
                        className={`text-xs font-bold ${
                          t.promotionProbability >= 40
                            ? 'text-amber-700'
                            : t.promotionProbability > 0
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {t.isGuaranteedPromotion || t.isGuaranteedChampion
                          ? '100.0% (Assuré)'
                          : `${t.promotionProbability.toFixed(1)}%`}
                      </span>
                    </td>

                    {rules.relegationSpots > 0 && (
                      <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                        {t.isGuaranteedSafe ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            100% (Assuré)
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-bold ${
                              t.safeProbability >= 85
                                ? 'text-emerald-700'
                                : t.safeProbability >= 50
                                ? 'text-slate-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {t.safeProbability.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    )}

                    {rules.relegationSpots > 0 && (
                      <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                        <span
                          className={`text-xs ${
                            t.relegationProbability >= 50
                              ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                              : t.relegationProbability > 0
                              ? 'text-slate-600'
                              : 'text-slate-300'
                          }`}
                        >
                          {t.relegationProbability.toFixed(1)}%
                        </span>
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-500">
                      [{t.minPossibleRank}e - {t.maxPossibleRank}e]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
