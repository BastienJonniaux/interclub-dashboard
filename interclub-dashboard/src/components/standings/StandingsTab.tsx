import React, { useState } from 'react';
import { DivisionStandingTable, getDivisionBadgeStyle } from '../../domain/standings';
import { DivisionProjections } from '../../domain/projections';
import { LatestTeamMatch } from '../../domain/matches';
import { LatestMatchesSection } from './LatestMatchesSection';
import { DivisionProjectionsView } from './DivisionProjectionsView';
import { TeamHoverCard } from '../common/TeamHoverCard';
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  standings: DivisionStandingTable[];
  clubName: string;
  latestMatches?: LatestTeamMatch[];
  projections?: DivisionProjections[];
  autoOpenProjections?: boolean;
  onProjectionsOpened?: () => void;
}

export const StandingsTab: React.FC<Props> = ({
  standings,
  clubName,
  latestMatches,
  projections = [],
  autoOpenProjections,
  onProjectionsOpened,
}) => {
  const [expandedDiv, setExpandedDiv] = useState<string | null>(null);
  const [divViewModes, setDivViewModes] = useState<Record<string, 'standings' | 'projections'>>({});
  const [highlightedDiv, setHighlightedDiv] = useState<string | null>(null);

  const openDivisionProjections = (key: string) => {
    setExpandedDiv(key);
    setDivViewModes((prev) => ({ ...prev, [key]: 'projections' }));
    setHighlightedDiv(key);
    setTimeout(() => {
      setHighlightedDiv(null);
    }, 2500);

    setTimeout(() => {
      const el = document.getElementById(`details-${key}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  React.useEffect(() => {
    if (autoOpenProjections && standings.length > 0) {
      const target =
        standings.find((s) =>
          projections.some((p) => p.division === s.division && p.index === s.index)
        ) || standings[0];
      const key = `${target.division}${target.index}`;
      openDivisionProjections(key);
      onProjectionsOpened?.();
    }
  }, [autoOpenProjections, standings, projections, onProjectionsOpened]);

  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white shadow-xs">
        <Trophy className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-900 tracking-tight">
          Aucun classement disponible
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Les résultats de la première ronde ne sont pas encore publiés ou aucune équipe n'est trouvée.
        </p>
      </div>
    );
  }

  const toggleExpand = (key: string) => {
    const willExpand = expandedDiv !== key;
    setExpandedDiv(willExpand ? key : null);
    
    if (willExpand) {
      setTimeout(() => {
        const el = document.getElementById(`details-${key}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const renderRankDiffBadge = (diff?: number) => {
    if (diff === undefined) return null;
    if (diff > 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-md tabular-nums"
          title={`+${diff} place${diff > 1 ? 's' : ''} gagnée${diff > 1 ? 's' : ''}`}
        >
          <TrendingUp className="h-3 w-3" />
          +{diff}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md tabular-nums"
          title={`${diff} place${Math.abs(diff) > 1 ? 's' : ''} perdue${Math.abs(diff) > 1 ? 's' : ''}`}
        >
          <TrendingDown className="h-3 w-3" />
          {diff}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-md tabular-nums"
        title="Position inchangée"
      >
        <Minus className="h-2.5 w-2.5" />
      </span>
    );
  };

  const renderFormPills = (history: { round: number; matchOutcome: 'win' | 'draw' | 'loss'; teamScore: number; oppScore: number; opponentTeamName: string }[]) => {
    if (!history || history.length === 0) {
      return <span className="text-xs text-slate-400 font-mono">-</span>;
    }

    const recent = history.slice(-5);
    return (
      <div className="flex items-center gap-1.5">
        {recent.map((m, idx) => {
          let style = 'bg-slate-100 text-slate-600 border border-slate-200';
          let letter = 'N';
          if (m.matchOutcome === 'win') {
            style = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            letter = 'V';
          } else if (m.matchOutcome === 'draw') {
            style = 'bg-slate-100 text-slate-600 border border-slate-200';
            letter = 'N';
          } else if (m.matchOutcome === 'loss') {
            style = 'bg-rose-50 text-rose-700 border border-rose-200';
            letter = 'D';
          }

          return (
            <div key={idx} className="flex flex-col items-center gap-0.5">
              <span
                className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-mono font-bold shrink-0 cursor-default ${style}`}
                title={`Ronde ${m.round}: ${letter === 'V' ? 'Victoire' : letter === 'N' ? 'Nul' : 'Défaite'} (${m.teamScore} - ${m.oppScore}) vs ${m.opponentTeamName}`}
              >
                {letter}
              </span>
              <span className="text-[9px] font-mono text-slate-500 tabular-nums leading-none">
                {m.teamScore}-{m.oppScore}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Summary Cards */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Vue d'ensemble des Équipes — {clubName}
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Classement en direct, forme récente et progression de chaque équipe dans sa division respective.
            </p>
          </div>

          {projections && projections.length > 0 && (
            <button
              onClick={() => {
                const target =
                  standings.find((s) =>
                    projections.some((p) => p.division === s.division && p.index === s.index)
                  ) || standings[0];
                if (target) {
                  openDivisionProjections(`${target.division}${target.index}`);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
              title="Ouvrir la matrice de simulation Monte-Carlo et les probabilités de fin de saison"
            >
              <Sparkles className="h-4 w-4" />
              <span>Projections & Cotes Monte-Carlo</span>
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-6">
          {standings.map((divTable) => {
            const our = divTable.ourTeam;
            const rank = our?.rank || '-';
            const totalTeams = divTable.teams.length;
            const isLeader = rank === 1;

            const maxMatchPoints = (our?.played || 0) * 2;
            const matchPoints = our?.matchPoints ?? 0;
            const matchPointsPercent = maxMatchPoints > 0 ? (matchPoints / maxMatchPoints) * 100 : 0;

            const divProj = projections?.find(
              (p) => p.division === divTable.division && p.index === divTable.index
            );
            const ourProj = divProj?.ourTeam;

            return (
              <div
                key={`${divTable.division}${divTable.index}`}
                onClick={() => toggleExpand(`${divTable.division}${divTable.index}`)}
                className="group cursor-pointer bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(divTable.division)}`}>
                        {divTable.divisionLabel}
                      </span>
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {our?.teamName || `Équipe ${divTable.divisionLabel}`}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center font-mono font-bold text-base rounded-xl border ${
                          isLeader
                            ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        {isLeader ? <Award className="h-5 w-5 text-amber-600" /> : rank}
                      </div>
                      {renderRankDiffBadge(our?.rankDiff)}
                    </div>
                  </div>

                  {/* Bilan & Recent Form Section */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-500 block">
                        Bilan
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700 whitespace-nowrap">
                        {our ? `${our.won}V • ${our.drawn}N • ${our.lost}D` : '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {our ? renderFormPills(our.matchHistory) : <span className="font-mono text-slate-400 text-xs">-</span>}
                    </div>
                  </div>

                  {/* Horizontal Metrics Mini-Banner */}
                  <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200/80 bg-slate-50/80 border border-slate-200/70 rounded-xl py-2.5 px-1 text-center font-mono tabular-nums shadow-xs">
                    <div className="px-1 text-center">
                      <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-wider">
                        Rang
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {rank === 1 ? '1er' : `${rank}e`} <span className="text-[10px] font-normal text-slate-500">/{totalTeams}</span>
                      </span>
                    </div>

                    <div className="px-1 text-center">
                      <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-wider">
                        Score match
                      </span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {matchPoints} <span className="text-[10px] font-normal text-slate-500">/{maxMatchPoints} pts</span>
                      </span>
                    </div>

                    <div className="px-1 text-center">
                      <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-wider">
                        Départage
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {our?.boardPoints ?? 0} <span className="text-[10px] font-normal text-slate-500">pts</span>
                      </span>
                    </div>
                  </div>

                  {/* Projections Mini-Banner */}
                  {ourProj && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openDivisionProjections(`${divTable.division}${divTable.index}`);
                      }}
                      className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs hover:bg-indigo-50/70 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer group/proj"
                      title="Cliquer pour ouvrir directement la simulation Monte-Carlo de cette division"
                    >
                      <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider flex items-center gap-1 group-hover/proj:text-indigo-800">
                        <Sparkles className="h-3 w-3 text-indigo-500" /> Projection
                      </span>
                      {ourProj.isGuaranteedChampion ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Award className="h-3 w-3 text-amber-600" /> Champion 100%
                        </span>
                      ) : ourProj.isGuaranteedPromotion ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Trophy className="h-3 w-3 text-amber-600" /> Montée 100%
                        </span>
                      ) : ourProj.isGuaranteedSafe ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Maintien Assuré (100%)
                        </span>
                      ) : ourProj.isFavorite ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Trophy className="h-3 w-3 text-amber-600" /> Favori ({ourProj.promotionProbability.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-600">
                          {divProj?.rules.relegationSpots === 0 ? (
                            <>
                              Montée : <strong>{ourProj.promotionProbability.toFixed(1)}%</strong> &bull; Esp. : <strong>{ourProj.expectedRank.toFixed(1)}e</strong>
                            </>
                          ) : (
                            <>
                              Maintien :{' '}
                              <strong
                                className={
                                  ourProj.safeProbability >= 80 ? 'text-emerald-700' : 'text-slate-900'
                                }
                              >
                                {ourProj.safeProbability.toFixed(1)}%
                              </strong>{' '}
                              &bull; Esp. : <strong>{ourProj.expectedRank.toFixed(1)}e</strong>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latest Matches and Board-by-board Results */}
      {latestMatches && latestMatches.length > 0 && (
        <LatestMatchesSection matches={latestMatches} clubName={clubName} />
      )}

      {/* Detailed Division Tables Accordion */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Détail des Divisions
          </h3>
          <span className="text-xs text-slate-500">
            Cliquez pour inspecter la grille complète
          </span>
        </div>

        {standings.map((divTable) => {
          const key = `${divTable.division}${divTable.index}`;
          const isExpanded = expandedDiv === key;
          const divProj = projections?.find(
            (p) => p.division === divTable.division && p.index === divTable.index
          );
          const currentMode = divViewModes[key] || 'standings';

          return (
            <div
              key={key}
              id={`details-${key}`}
              className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition-all duration-300 ${
                highlightedDiv === key
                  ? 'border-indigo-400 ring-4 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200/80'
              }`}
            >
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 cursor-pointer"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <span className={`px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(divTable.division)}`}>
                    {divTable.divisionLabel}
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {divTable.ourTeam?.teamName || divTable.divisionLabel}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500">
                    ({divTable.teams.length} équipes)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-800 shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div>
                  {/* Mode Selector Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-50 border-t border-b border-slate-200/80">
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setDivViewModes((prev) => ({ ...prev, [key]: 'standings' }))}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          currentMode === 'standings'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Classement Officiel
                      </button>
                      <button
                        onClick={() => setDivViewModes((prev) => ({ ...prev, [key]: 'projections' }))}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          currentMode === 'projections'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Projections & Cotes
                      </button>
                    </div>

                    {divProj && (
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {divProj.favoriteTeam && (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md font-medium">
                            <Trophy className="h-3.5 w-3.5 text-amber-600" />
                            Favori : <strong className="font-semibold">{divProj.favoriteTeam.teamName}</strong> ({divProj.favoriteTeam.promotionProbability.toFixed(1)}%)
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[11px]">
                          {divProj.remainingRounds} ronde{divProj.remainingRounds > 1 ? 's' : ''} restante{divProj.remainingRounds > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {currentMode === 'projections' && divProj ? (
                    <div className="p-4 sm:p-6 bg-slate-50/50">
                      <DivisionProjectionsView
                        projections={divProj}
                        standingTable={divTable}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full text-left text-sm text-slate-900">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200/80">
                          <tr>
                            <th className="px-6 py-4 text-center border-r border-slate-200/60 w-28">Rang</th>
                            <th className="px-6 py-4 border-r border-slate-200/60">Équipe</th>
                            <th className="px-5 py-4 text-center border-r border-slate-200/60 hidden md:table-cell">Forme</th>
                            <th className="px-4 py-4 text-center border-r border-slate-200/60" title="Joués">J</th>
                            <th className="px-4 py-4 text-center border-r border-slate-200/60" title="Gagnés">G</th>
                            <th className="px-4 py-4 text-center border-r border-slate-200/60" title="Nuls">N</th>
                            <th className="px-4 py-4 text-center border-r border-slate-200/60" title="Perdus">P</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-900 border-r border-slate-200/60">
                              Pts Match
                            </th>
                            <th className="px-6 py-4 text-center font-bold text-slate-900">Pts Échiq.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {divTable.teams.map((t) => {
                            const isOur = t.isOurClub;
                            return (
                              <tr
                                key={t.pairingNumber}
                                className={`transition-colors ${
                                  isOur
                                    ? 'bg-emerald-50/60 font-semibold'
                                    : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="px-6 py-4 text-center border-r border-slate-200/60 font-mono tabular-nums">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center font-bold text-xs rounded-md border ${
                                        t.rank === 1
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : t.rank === 2
                                          ? 'bg-slate-200/80 text-slate-800 border-slate-300'
                                          : t.rank === 3
                                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {t.rank}
                                    </span>
                                    {renderRankDiffBadge(t.rankDiff)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-r border-slate-200/60">
                                  <div className="flex items-center gap-2.5">
                                    <TeamHoverCard team={t} divisionLabel={divTable.divisionLabel}>
                                      <span
                                        className={`text-sm cursor-pointer ${
                                          isOur ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'
                                        } hover:underline underline-offset-2 transition-colors`}
                                      >
                                        {t.teamName}
                                      </span>
                                    </TeamHoverCard>
                                    {isOur && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md">
                                        Notre Équipe
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center border-r border-slate-200/60 hidden md:table-cell">
                                  <div className="flex justify-center">
                                    {renderFormPills(t.matchHistory)}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center border-r border-slate-200/60 text-slate-500 font-mono tabular-nums">{t.played}</td>
                                <td className="px-4 py-4 text-center font-bold text-emerald-600 border-r border-slate-200/60 font-mono tabular-nums">{t.won}</td>
                                <td className="px-4 py-4 text-center border-r border-slate-200/60 text-slate-500 font-mono tabular-nums">{t.drawn}</td>
                                <td className="px-4 py-4 text-center font-bold text-rose-600 border-r border-slate-200/60 font-mono tabular-nums">{t.lost}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900 border-r border-slate-200/60 font-mono tabular-nums text-base">
                                  {t.matchPoints}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900 font-mono tabular-nums text-base">
                                  {t.boardPoints}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
