import React, { useState, useMemo } from 'react';
import { ClubFrbe } from '../../modelsFRBE';
import { DivisionStandingTable, getDivisionBadgeStyle } from '../../domain/standings';
import { DivisionProjections } from '../../domain/projections';
import { LatestTeamMatch } from '../../domain/matches';
import { PlayerStats } from '../../domain/performance';
import {
  extractGiantKillers,
  extractTopScorers,
  extractClubRoundSummary,
  formatChessScore,
} from '../../domain/clubHub';
import { LatestMatchesSection } from './LatestMatchesSection';
import { DivisionProjectionsView } from './DivisionProjectionsView';
import { TeamHoverCard } from '../common/TeamHoverCard';
import { PlayerHoverCard } from '../common/PlayerHoverCard';
import { TabType } from '../layout/Navbar';
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
  ChevronRight,
  Flame,
  Swords,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  standings: DivisionStandingTable[];
  clubName: string;
  club?: ClubFrbe;
  playerStats?: PlayerStats[];
  latestMatches?: LatestTeamMatch[];
  projections?: DivisionProjections[];
  autoOpenProjections?: boolean;
  onProjectionsOpened?: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const StandingsTab: React.FC<Props> = ({
  standings,
  clubName,
  club,
  playerStats = [],
  latestMatches = [],
  projections = [],
  autoOpenProjections,
  onProjectionsOpened,
  onNavigateTab,
}) => {
  const [expandedDiv, setExpandedDiv] = useState<string | null>(null);
  const [divViewModes, setDivViewModes] = useState<Record<string, 'standings' | 'projections'>>({});
  const [highlightedDiv, setHighlightedDiv] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  // Domain extractions for club summary & honors
  const roundSummary = useMemo(() => extractClubRoundSummary(latestMatches), [latestMatches]);
  const giantKillers = useMemo(() => extractGiantKillers(playerStats), [playerStats]);
  const topScorers = useMemo(() => extractTopScorers(playerStats), [playerStats]);

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

  const renderFormPills = (
    history: {
      round: number;
      matchOutcome: 'win' | 'draw' | 'loss';
      teamScore: number;
      oppScore: number;
      opponentTeamName: string;
    }[]
  ) => {
    if (!history || history.length === 0) {
      return <span className="text-xs text-slate-400 font-mono">-</span>;
    }

    const recent = history.slice(-5);
    return (
      <div className="flex items-center gap-1">
        {recent.map((m, idx) => {
          let style = 'bg-slate-100 text-slate-700 border border-slate-300';
          let letter = 'N';
          if (m.matchOutcome === 'win') {
            style = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
            letter = 'V';
          } else if (m.matchOutcome === 'draw') {
            style = 'bg-slate-100 text-slate-700 border border-slate-300';
            letter = 'N';
          } else if (m.matchOutcome === 'loss') {
            style = 'bg-rose-100 text-rose-800 border border-rose-300';
            letter = 'D';
          }

          return (
            <span
              key={idx}
              className={`inline-flex w-4 h-4 sm:w-4.5 sm:h-4.5 items-center justify-center rounded-full text-[9px] font-mono font-bold shrink-0 cursor-default shadow-2xs ${style}`}
              title={`Ronde ${m.round}: ${
                letter === 'V' ? 'Victoire' : letter === 'N' ? 'Nul' : 'Défaite'
              } (${m.teamScore} - ${m.oppScore}) vs ${m.opponentTeamName}`}
            >
              {letter}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* =========================================================================
          1. CLUB MASTHEAD & RECENT TELEMETRY (FUSED FROM HUB)
         ========================================================================= */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-2 shadow-2xs">
              {!logoError && club ? (
                <img
                  src={`/clubs/${club.idclub}.png`}
                  alt={`Logo ${clubName}`}
                  className="h-full w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Trophy className="h-7 w-7 text-amber-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <span>Club FRBE {club?.idclub || ''}</span>
                <span>•</span>
                <span>Interclubs Nationaux 2026–2027</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
                {clubName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Tableau de bord de compétition : classements en direct, forme des équipes et projections de fin de saison.
              </p>
            </div>
          </div>

          {/* Quick Action: Direct Projections Open */}
          {projections && projections.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-md transition-all cursor-pointer"
                title="Ouvrir la matrice de simulation Monte-Carlo et les probabilités de fin de saison"
              >
                <Sparkles className="h-4 w-4" />
                <span>Projections Monte-Carlo</span>
              </button>
            </div>
          )}
        </div>

        {/* Telemetry Strip of Club Results */}
        {roundSummary && (
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 font-mono tabular-nums">
            <div>
              <div className="text-xs font-sans text-slate-500 font-medium">Dernière ronde</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">Ronde {roundSummary.round}</div>
              <div className="text-[11px] font-sans text-slate-400 mt-0.5">
                {roundSummary.teamsCount} équipes engagées
              </div>
            </div>

            <div>
              <div className="text-xs font-sans text-slate-500 font-medium">Bilan ronde {roundSummary.round}</div>
              <div className="text-xl font-bold mt-0.5">
                <span className="text-emerald-700">{roundSummary.wins}V</span>{' • '}
                <span className="text-amber-700">{roundSummary.draws}N</span>{' • '}
                <span className="text-rose-700">{roundSummary.losses}D</span>
              </div>
              <div className="text-[11px] font-sans text-slate-400 mt-0.5">
                {roundSummary.wins >= roundSummary.losses ? 'Bilan positif' : 'Bilan à redresser'}
              </div>
            </div>

            <div>
              <div className="text-xs font-sans text-slate-500 font-medium">Points d'échiquiers</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {formatChessScore(roundSummary.boardPointsWon)}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  / {roundSummary.totalBoardPointsPossible}
                </span>
              </div>
              <div className="text-[11px] font-sans text-emerald-700 mt-0.5">
                {Math.round((roundSummary.boardPointsWon / roundSummary.totalBoardPointsPossible) * 100)}% de réussite
              </div>
            </div>

            <div>
              <div className="text-xs font-sans text-slate-500 font-medium">Joueurs actifs</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {playerStats.filter((p) => p.gamesPlayed > 0).length}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {playerStats.length}</span>
              </div>
              <div className="text-[11px] font-sans text-slate-400 mt-0.5">
                Membres ayant joué cette saison
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          2. VUE SYNTHÉTIQUE DES ÉQUIPES DU CLUB (CARDS GRID)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Les Équipes du Club
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Classement actuel, forme et probabilités de fin de saison pour chaque alignement.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {standings.length} équipe{standings.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5">
          {standings.map((divTable) => {
            const our = divTable.ourTeam;
            const rank = our?.rank || '-';
            const totalTeams = divTable.teams.length;
            const isLeader = rank === 1;

            const maxMatchPoints = (our?.played || 0) * 2;
            const matchPoints = our?.matchPoints ?? 0;

            const divKey = `${divTable.division}${divTable.index}`;
            const divProj = projections?.find(
              (p) => p.division === divTable.division && p.index === divTable.index
            );
            const ourProj = divProj?.ourTeam;

            return (
              <div
                key={divKey}
                onClick={() => toggleExpand(divKey)}
                className="group cursor-pointer bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(
                            divTable.division
                          )}`}
                        >
                          {divTable.divisionLabel}
                        </span>

                        {/* Recent matches form (up to 5 pills, no score clutter) */}
                        {our && our.matchHistory && our.matchHistory.length > 0 && (
                          <div className="inline-flex items-center">
                            {renderFormPills(our.matchHistory)}
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {our?.teamName || `Équipe ${divTable.divisionLabel}`}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div
                        className={`flex h-9 w-9 items-center justify-center font-mono font-bold text-sm rounded-xl border ${
                          isLeader
                            ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        {isLeader ? <Award className="h-4 w-4 text-amber-600" /> : rank}
                      </div>
                      {renderRankDiffBadge(our?.rankDiff)}
                    </div>
                  </div>

                  {/* Horizontal Metrics Mini-Banner: Rang, Pts Match, Départage */}
                  <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200/80 bg-slate-50/90 border border-slate-200/70 rounded-xl py-2 px-1 text-center font-mono tabular-nums shadow-2xs">
                    <div className="px-1 text-center">
                      <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                        Rang
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {rank === 1 ? '1er' : `${rank}e`}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/{totalTeams}</span>
                      </span>
                    </div>

                    <div className="px-1 text-center">
                      <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                        Pts Match
                      </span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {matchPoints}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/{maxMatchPoints}</span>
                      </span>
                    </div>

                    <div className="px-1 text-center">
                      <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                        Départage
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {our?.boardPoints ?? 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">pts</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projections Section: Montée & Maintien side-by-side + Expected Rank */}
                {ourProj && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* 1. Titre / Montée */}
                      <div
                        className={`rounded-xl p-2 border flex flex-col justify-between transition-colors ${
                          ourProj.isGuaranteedPromotion || ourProj.isGuaranteedChampion
                            ? 'bg-amber-100/80 border-amber-300 text-amber-950 font-bold'
                            : ourProj.promotionProbability >= 40
                            ? 'bg-amber-50/90 border-amber-300/80 text-amber-950'
                            : ourProj.promotionProbability >= 10
                            ? 'bg-amber-50/50 border-amber-200/60 text-amber-900'
                            : 'bg-slate-50 border-slate-200/70 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {divProj?.rules.hasTitle ? 'Titre' : 'Montée'}
                        </span>
                        <span className="font-mono font-bold text-xs mt-0.5">
                          {ourProj.isGuaranteedPromotion || ourProj.isGuaranteedChampion
                            ? '100% garanti'
                            : `${ourProj.promotionProbability.toFixed(1)}%`}
                        </span>
                      </div>

                      {/* 2. Maintien */}
                      {divProj && divProj.rules.relegationSpots > 0 ? (
                        <div
                          className={`rounded-xl p-2 border flex flex-col justify-between transition-colors ${
                            ourProj.isGuaranteedSafe || ourProj.safeProbability >= 99.9
                              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                              : ourProj.safeProbability < 50
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                              : 'bg-amber-50/50 border-amber-200/60 text-amber-950'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Maintien
                          </span>
                          <span
                            className={`font-mono font-bold text-xs mt-0.5 ${
                              ourProj.safeProbability < 50 ? 'text-rose-700 font-extrabold' : ''
                            }`}
                          >
                            {ourProj.isGuaranteedSafe || ourProj.safeProbability >= 99.9
                              ? '100% garanti'
                              : `${ourProj.safeProbability.toFixed(1)}%`}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2 flex flex-col justify-between text-slate-600">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Maintien
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-600 mt-0.5">
                            Assuré (Div 6)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rang attendu & Action pour ouvrir la simulation */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openDivisionProjections(divKey);
                      }}
                      className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5 group/link cursor-pointer hover:text-indigo-600 transition-colors"
                      title="Cliquer pour afficher la simulation Monte-Carlo de cette division"
                    >
                      <span>
                        Rang attendu :{' '}
                        <strong className="text-slate-800 font-bold group-hover/link:text-indigo-600 transition-colors">
                          {ourProj.expectedRank.toFixed(1)}e
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-indigo-600 font-sans text-xs font-semibold group-hover/link:translate-x-0.5 transition-transform">
                        Projections <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          3. ACCORDÉONS DÉTAILLÉS DES DIVISIONS (CLASSEMENT OU PROJECTIONS)
         ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Détail des Divisions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspectez le classement officiel complet ou activez la matrice de simulation Monte-Carlo.
            </p>
          </div>
          <span className="text-xs text-slate-500">Cliquez pour déplier</span>
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
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(
                      divTable.division
                    )}`}
                  >
                    {divTable.divisionLabel}
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {divTable.ourTeam?.teamName || divTable.divisionLabel}
                  </span>
                  <span className="text-xs text-slate-500">
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
                  {/* Clean Mode Switcher Bar */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-b border-slate-200/80">
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
                      <span className="text-slate-500 font-mono text-[11px]">
                        {divProj.remainingRounds} ronde{divProj.remainingRounds > 1 ? 's' : ''} restante{divProj.remainingRounds > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {currentMode === 'projections' && divProj ? (
                    <div className="p-3 sm:p-5 bg-slate-50/50">
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
                                  isOur ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="px-6 py-4 text-center border-r border-slate-200/60 font-mono tabular-nums">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                                        t.rank === 1
                                          ? 'bg-amber-100 text-amber-800'
                                          : isOur
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      {t.rank}
                                    </span>
                                    {renderRankDiffBadge(t.rankDiff)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-r border-slate-200/60">
                                  <div className="flex items-center gap-2">
                                    <TeamHoverCard team={t} divisionLabel={divTable.divisionLabel}>
                                      <span
                                        className={`cursor-pointer hover:underline ${
                                          isOur ? 'text-emerald-950 font-bold' : 'text-slate-900 font-medium'
                                        }`}
                                      >
                                        {t.teamName}
                                      </span>
                                    </TeamHoverCard>
                                    {isOur && (
                                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 text-[8px] font-bold uppercase rounded">
                                        Notre club
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center border-r border-slate-200/60 hidden md:table-cell">
                                  {renderFormPills(t.matchHistory)}
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

      {/* =========================================================================
          4. BILAN DE LA DERNIÈRE RONDE (MATCHS PAR ÉQUIPE ET ÉCHIQUIER)
         ========================================================================= */}
      {latestMatches && latestMatches.length > 0 && (
        <LatestMatchesSection matches={latestMatches} clubName={clubName} />
      )}

      {/* =========================================================================
          5. TABLEAU D'HONNEUR & PERFORMANCES DU CLUB (FUSED FROM HUB)
         ========================================================================= */}
      {playerStats && playerStats.length > 0 && (giantKillers.length > 0 || topScorers.length > 0) && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Tableau d'Honneur du Club
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Les exploits Elo et les meilleurs marqueurs du club en championnat cette saison.
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('players')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <span>Voir les stats de tous les joueurs</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tombeurs de Géants */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 mb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-600" />
                    Tombeurs de Géants (Exploits Elo)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">≥ +50 Elo</span>
                </div>

                {giantKillers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Aucun exploit supérieur enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {giantKillers.slice(0, 4).map((exploit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs shadow-2xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <PlayerHoverCard playerName={exploit.playerName} expectedElo={exploit.playerRating}>
                              <span className="font-bold text-slate-900 hover:underline cursor-pointer truncate">
                                {exploit.playerName}
                              </span>
                            </PlayerHoverCard>
                            <span className="text-slate-400 text-[11px] font-mono">({exploit.playerRating})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            vs {exploit.opponentName} ({exploit.opponentRating}) &bull; Éch. {exploit.board} (R{exploit.round})
                          </div>
                        </div>

                        <div className="shrink-0 text-right font-mono">
                          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            +{exploit.ratingDiff} Elo
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {exploit.isWin ? 'Victoire (1 pt)' : 'Nulle (½ pt)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Scoreurs */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 mb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                    Top Marqueurs de la Saison
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Points bruts</span>
                </div>

                {topScorers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Aucune partie enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {topScorers.slice(0, 4).map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="font-mono text-xs font-bold text-slate-400 w-4 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <PlayerHoverCard playerName={p.fullName} expectedElo={p.rating}>
                              <span className="font-bold text-slate-900 hover:underline cursor-pointer truncate block">
                                {p.fullName}
                              </span>
                            </PlayerHoverCard>
                            <span className="text-slate-400 text-[11px] font-mono">
                              Elo {p.rating || 'NC'} &bull; {p.gamesPlayed} ronde{p.gamesPlayed > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right font-mono font-bold text-emerald-700">
                          {formatChessScore(p.score)} / {p.gamesPlayed} pts
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
