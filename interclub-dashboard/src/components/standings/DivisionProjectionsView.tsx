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

type SortField = 'currentRank' | 'expectedRank' | 'champion' | 'top8' | 'relegation';

export const DivisionProjectionsView: React.FC<Props> = ({ projections, standingTable }) => {
  const [sortField, setSortField] = useState<SortField>('currentRank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [hoveredTeamPairing, setHoveredTeamPairing] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For percentages, default to descending; for ranks, default to ascending
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
      case 'champion':
        diff = b.championProbability - a.championProbability;
        break;
      case 'top8':
        diff = b.top8Probability - a.top8Probability;
        break;
      case 'relegation':
        diff = b.relegationProbability - a.relegationProbability;
        break;
    }
    return sortAsc ? diff : -diff;
  });

  const guaranteedTop8Count = projections.teams.filter((t) => t.isGuaranteedTop8).length;
  const inDangerCount = projections.teams.filter((t) => t.relegationProbability >= 50).length;

  return (
    <div className="space-y-4">
      {/* Informative Projections Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                Simulation Monte Carlo (2 500 itérations)
              </span>
              <span className="text-xs text-slate-300">
                {projections.isSeasonCompleted
                  ? 'Saison terminée'
                  : `${projections.remainingRounds} ronde${projections.remainingRounds > 1 ? 's' : ''} restante${projections.remainingRounds > 1 ? 's' : ''}`}
              </span>
            </div>
            <h4 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Projections de fin de saison — {projections.divisionLabel}
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Estimation probabiliste basée sur le calendrier restant, les cotes Elo et les départages
              officiels FRBE (points match puis points échiquier).
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 text-xs">
            {projections.favoriteTeam && (
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-semibold text-amber-300 tracking-wider flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> Favori Titre
                </span>
                <span className="font-bold text-white block mt-0.5 truncate max-w-[130px]" title={projections.favoriteTeam.teamName}>
                  {projections.favoriteTeam.teamName}
                </span>
                <span className="text-[11px] font-mono font-semibold text-amber-300">
                  {projections.favoriteTeam.championProbability}% de finir 1er
                </span>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-semibold text-emerald-300 tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Maintien Assuré
              </span>
              <span className="text-lg font-bold text-white block mt-0.5 font-mono">
                {guaranteedTop8Count}{' '}
                <span className="text-xs font-normal text-slate-300">/{projections.totalTeams}</span>
              </span>
              <span className="text-[10px] text-slate-300">
                {guaranteedTop8Count > 0 ? 'mathématiquement sûres' : 'calcul en cours'}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-lg p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-semibold text-rose-300 tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> En Danger (&ge;50%)
              </span>
              <span className="text-lg font-bold text-white block mt-0.5 font-mono">
                {inDangerCount}{' '}
                <span className="text-xs font-normal text-slate-300">équipes</span>
              </span>
              <span className="text-[10px] text-slate-300">zone rouge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
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
              <th className="px-3 py-3.5 text-center border-r border-slate-200/60" title="Points match actuels">
                Pts Match
              </th>
              <th className="px-3 py-3.5 text-center border-r border-slate-200/60" title="Matchs restants à jouer">
                Rest.
              </th>
              <th
                onClick={() => handleSort('expectedRank')}
                className="px-3 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                title="Rang moyen obtenu dans les 2 500 simulations"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Rang Espéré</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('champion')}
                className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                title="Probabilité de finir 1er (Champion)"
              >
                <div className="inline-flex items-center gap-1">
                  <span>🏆 1er</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3.5 text-center border-r border-slate-200/60" title="Probabilité de finir dans le Top 2 (Montée)">
                🥈 Top 2
              </th>
              <th
                onClick={() => handleSort('top8')}
                className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                title="Probabilité d'assurer le maintien (Top 8)"
              >
                <div className="inline-flex items-center gap-1">
                  <span>🛡️ Maintien (Top 8)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('relegation')}
                className="px-4 py-3.5 text-center border-r border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                title="Probabilité de relégation (9e à 12e place)"
              >
                <div className="inline-flex items-center gap-1">
                  <span>🔻 Relégation</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-center" title="Distribution complète des 12 rangs">
                Distribution des Rangs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTeams.map((t) => {
              const standingTeam = standingTable.teams.find((st) => st.pairingNumber === t.pairingNumber);
              const isOur = t.isOurClub;

              // Status badges
              let statusBadge = null;
              if (t.isGuaranteedChampion) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-md">
                    <Award className="h-3 w-3" /> Champion Assuré
                  </span>
                );
              } else if (t.isFavorite) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                    <Trophy className="h-3 w-3 text-amber-600" /> Favori ({t.championProbability}%)
                  </span>
                );
              } else if (t.isGuaranteedTop8) {
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
              } else if (t.relegationProbability >= 65) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                    <AlertTriangle className="h-3 w-3 text-rose-600" /> Grand Danger ({t.relegationProbability}%)
                  </span>
                );
              }

              return (
                <tr
                  key={t.pairingNumber}
                  className={`transition-colors ${
                    isOur
                      ? 'bg-emerald-50/70 font-semibold'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Current Rank */}
                  <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center font-bold text-xs rounded-md border ${
                          t.rank === 1
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : t.rank === 2
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : t.rank === 3
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : t.rank <= 8
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {t.rank}
                      </span>
                    </div>
                  </td>

                  {/* Team Name & Status */}
                  <td className="px-5 py-3.5 border-r border-slate-200/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {standingTeam ? (
                          <TeamHoverCard team={standingTeam} divisionLabel={projections.divisionLabel}>
                            <span
                              className={`text-sm cursor-pointer ${
                                isOur ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'
                              } hover:underline underline-offset-2 transition-colors`}
                            >
                              {t.teamName}
                            </span>
                          </TeamHoverCard>
                        ) : (
                          <span className="font-medium text-slate-800 text-sm">{t.teamName}</span>
                        )}
                        {isOur && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded">
                            Notre Équipe
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        <span className="text-[11px] font-mono text-slate-500">
                          {t.seasonAvgElo > 0 ? `Elo moy: ${t.seasonAvgElo}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Current Points */}
                  <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <span className="font-bold text-slate-900">{t.matchPoints}</span>
                    <span className="block text-[10px] text-slate-500">{t.boardPoints} bp</span>
                  </td>

                  {/* Remaining Matches */}
                  <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums text-slate-600">
                    {t.remaining}
                  </td>

                  {/* Expected Rank */}
                  <td className="px-3 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <span className="font-bold text-slate-900 text-sm">{t.expectedRank}e</span>
                    <span className="block text-[10px] text-slate-500">
                      [{t.minPossibleRank}e - {t.maxPossibleRank}e]
                    </span>
                  </td>

                  {/* 1st Place Prob */}
                  <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-xs font-bold ${
                          t.championProbability >= 25
                            ? 'text-amber-700'
                            : t.championProbability > 0
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {t.championProbability}%
                      </span>
                      {t.championProbability > 0 && (
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, t.championProbability)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Top 2 Prob */}
                  <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <span
                      className={`text-xs font-semibold ${
                        t.top2Probability >= 40
                          ? 'text-indigo-700 font-bold'
                          : t.top2Probability > 0
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {t.top2Probability}%
                    </span>
                  </td>

                  {/* Top 8 (Maintien) Prob */}
                  <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <div className="flex flex-col items-center gap-1">
                      {t.isGuaranteedTop8 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% (Assuré)
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold ${
                            t.top8Probability >= 85
                              ? 'text-emerald-700'
                              : t.top8Probability >= 50
                              ? 'text-slate-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {t.top8Probability}%
                        </span>
                      )}
                      {!t.isGuaranteedTop8 && (
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              t.top8Probability >= 80
                                ? 'bg-emerald-500'
                                : t.top8Probability >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, t.top8Probability)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Relegation Prob */}
                  <td className="px-4 py-3.5 text-center border-r border-slate-200/60 font-mono tabular-nums">
                    <span
                      className={`text-xs ${
                        t.relegationProbability >= 60
                          ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                          : t.relegationProbability >= 25
                          ? 'text-rose-600 font-semibold'
                          : t.relegationProbability > 0
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}
                    >
                      {t.relegationProbability}%
                    </span>
                  </td>

                  {/* Rank Distribution Micro-Chart */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-end justify-center gap-0.5 h-8 w-36 mx-auto bg-slate-50 border border-slate-200/60 rounded px-1.5 py-1">
                      {t.rankProbabilities.map((prob, rankIdx) => {
                        const rankNumber = rankIdx + 1;
                        const heightPercent = Math.max(8, (prob / 100) * 100);

                        let barColor = 'bg-slate-300';
                        if (rankNumber === 1) barColor = 'bg-amber-500';
                        else if (rankNumber <= 2) barColor = 'bg-indigo-500';
                        else if (rankNumber <= 8) barColor = 'bg-emerald-500';
                        else barColor = 'bg-rose-500';

                        const isHovered = hoveredTeamPairing === t.pairingNumber;

                        return (
                          <div
                            key={rankIdx}
                            className="flex-1 flex flex-col justify-end items-center h-full group/bar relative cursor-pointer"
                            title={`Place ${rankNumber}e: ${prob}%`}
                          >
                            <div
                              className={`w-full rounded-xs transition-all ${barColor} ${
                                prob > 0 ? 'opacity-90 hover:opacity-100' : 'opacity-20'
                              }`}
                              style={{ height: `${prob > 0 ? heightPercent : 4}%` }}
                            />
                            {/* Hover tooltip for individual rank */}
                            <div className="hidden group-hover/bar:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-mono px-1 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-30">
                              {rankNumber}e: {prob}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Explanation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Champion (1er)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" /> Montée (Top 2)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Maintien (Top 8)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" /> Relégation (9e-12e)
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Info className="h-3 w-3 shrink-0" />
          <span>Départage : Points Match &gt; Points Échiquier</span>
        </div>
      </div>
    </div>
  );
};
