import React from 'react';
import { ClubFrbe } from '../../modelsFRBE';
import { PlayerStats } from '../../domain/performance';
import { DivisionStandingTable } from '../../domain/standings';
import { LatestTeamMatch } from '../../domain/matches';
import { NextMatchScout } from '../../domain/scouting';
import {
  extractGiantKillers,
  extractTopScorers,
  extractTopPerformers,
  extractClubRoundSummary,
  formatChessScore,
} from '../../domain/clubHub';
import { useClubGenerations } from '../../hooks/useClubGenerations';
import { PlayerHoverCard } from '../common/PlayerHoverCard';
import { TabType } from '../layout/Navbar';
import {
  ArrowRight,
  Building2,
  Home,
  Plane,
  Loader2,
} from 'lucide-react';

interface Props {
  club: ClubFrbe;
  standings: DivisionStandingTable[];
  latestMatches: LatestTeamMatch[];
  scouting: NextMatchScout[];
  playerStats: PlayerStats[];
  onNavigateTab: (tab: TabType) => void;
  onOpenClubSelector: () => void;
}

export const ClubHubTab: React.FC<Props> = ({
  club,
  latestMatches,
  scouting,
  playerStats,
  onNavigateTab,
  onOpenClubSelector,
}) => {
  const [logoError, setLogoError] = React.useState(false);

  // Domain extractions
  const giantKillers = React.useMemo(() => extractGiantKillers(playerStats), [playerStats]);
  const topScorers = React.useMemo(() => extractTopScorers(playerStats), [playerStats]);
  const topPerformers = React.useMemo(() => extractTopPerformers(playerStats), [playerStats]);
  const roundSummary = React.useMemo(() => extractClubRoundSummary(latestMatches), [latestMatches]);

  // Asynchronous FIDE birth year & age resolution for active club players
  const { oldestPlayer, youngestPlayer, isLoading: isAgesLoading } = useClubGenerations(playerStats);

  const latestRoundNumber = roundSummary?.round || 1;
  const currentRoundMatches = latestMatches.filter((m) => m.roundNumber === latestRoundNumber);

  return (
    <div className="space-y-8 text-slate-900" data-ui="club-hub">
      {/* =========================================================================
          MASTHEAD / CLUB HEADER
          Clean, authoritative typography, flat surfaces, zero slop
         ========================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Club Crest */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-2">
              {!logoError ? (
                <img
                  src={`/clubs/${club.idclub}.png`}
                  alt={`Logo Club ${club.idclub}`}
                  className="h-full w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-mono text-xl font-bold text-slate-700 tabular-nums">
                  {club.idclub}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Club FRBE {club.idclub}</span>
                <span>•</span>
                <span>Interclubs Nationaux 2026–2027</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {club.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Tableau de bord officiel des équipes, calendrier des rondes et performances individuelles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            <button
              onClick={onOpenClubSelector}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-slate-500" />
              <span>Changer de club</span>
            </button>
          </div>
        </div>

        {/* Telemetry / KPIs de la dernière ronde */}
        {roundSummary && (
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Dernière Ronde
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
                Ronde {roundSummary.round}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {roundSummary.teamsCount} équipes engagées
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Bilan du Match
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
                <span className="text-emerald-700">{roundSummary.wins}V</span>{' '}
                <span className="text-amber-700">{roundSummary.draws}N</span>{' '}
                <span className="text-rose-700">{roundSummary.losses}D</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {roundSummary.wins >= roundSummary.losses ? 'Bilan positif' : 'Bilan à redresser'}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Points d'Échiquiers
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
                {formatChessScore(roundSummary.boardPointsWon)}{' '}
                <span className="text-sm font-normal text-slate-400">
                  / {roundSummary.totalBoardPointsPossible}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {Math.round((roundSummary.boardPointsWon / roundSummary.totalBoardPointsPossible) * 100)}% de réussite
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Joueurs Actifs
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
                {playerStats.filter((p) => p.gamesPlayed > 0).length}{' '}
                <span className="text-sm font-normal text-slate-400">
                  / {playerStats.length}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Membres alignés cette saison
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 1: TOMBEURS DE GÉANTS (EXPLOITS ELO)
          The signature chess feature: celebrating upsets against higher-rated players
         ========================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Les Tombeurs de Géants
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                Exploits Elo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Membres du club ayant battu ou neutralisé un adversaire avec un classement Elo supérieur.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('players')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span>Voir toutes les stats individuelles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {giantKillers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Aucun exploit d'écart d'Elo supérieur enregistré pour le moment.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {giantKillers.slice(0, 6).map((exploit, idx) => (
              <div
                key={`${exploit.playerId}-${exploit.round}-${idx}`}
                className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 flex flex-col justify-between transition-colors hover:border-slate-300"
              >
                <div>
                  {/* Context Header */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/70">
                    <span className="font-medium">
                      Échiquier {exploit.board} • Ronde {exploit.round} ({exploit.division})
                    </span>
                    <span className="text-slate-700 font-medium">
                      {exploit.color === 'white' ? 'Blancs' : 'Noirs'}
                    </span>
                  </div>

                  {/* Player vs Opponent */}
                  <div className="my-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <PlayerHoverCard playerName={exploit.playerName} expectedElo={exploit.playerRating}>
                          <span className="font-semibold text-sm text-slate-900 hover:underline cursor-pointer block truncate">
                            {exploit.playerName}
                          </span>
                        </PlayerHoverCard>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          Elo {exploit.playerRating}
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                          +{exploit.ratingDiff} Elo
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                      <div className="truncate">
                        <span className="text-slate-400 mr-1">vs</span>
                        <span className="font-medium text-slate-800">{exploit.opponentName}</span>{' '}
                        <span className="font-mono text-xs text-slate-500 tabular-nums">({exploit.opponentRating})</span>
                      </div>

                      <span className="font-mono font-bold text-xs shrink-0 text-slate-900 tabular-nums">
                        {exploit.resultString}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                  <span>{exploit.isWin ? 'Victoire nette' : 'Nulle de combat (+150 Elo)'}</span>
                  <span className="font-mono text-emerald-700 font-semibold tabular-nums">
                    {exploit.isWin ? '1 pt' : '½ pt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 2: BILAN DE LA DERNIÈRE RONDE
          Clean match-by-match scoreboards for all teams of the club
         ========================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Résultats de la Ronde {latestRoundNumber}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Bilan des rencontres de toutes les équipes du club lors du dernier week-end de compétition.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('standings')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span>Voir les classements détaillés</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {currentRoundMatches.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Aucun résultat disponible pour la ronde {latestRoundNumber}.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRoundMatches.map((m, idx) => {
              const isWin = m.matchOutcome === 'win';
              const isDraw = m.matchOutcome === 'draw';

              return (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 flex flex-col justify-between transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {m.ourTeamName}
                      </span>
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 tabular-nums">
                        {m.divisionLabel}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span className="font-medium text-slate-900 truncate max-w-[170px]">
                          vs {m.opponentTeamName}
                        </span>
                        <span className="text-xs flex items-center gap-1 text-slate-500">
                          {m.isHome ? (
                            <>
                              <Home className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Domicile</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-3.5 w-3.5 text-slate-500" />
                              <span>Déplacement</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span
                          className={`text-xs font-bold ${
                            isWin
                              ? 'text-emerald-700'
                              : isDraw
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {isWin ? 'Victoire' : isDraw ? 'Partage' : 'Défaite'}
                        </span>
                        <span className="font-mono font-bold text-base text-slate-900 tabular-nums">
                          {formatChessScore(m.ourScore)} – {formatChessScore(m.oppScore)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('standings')}
                    className="mt-3 pt-2 border-t border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                  >
                    <span>Détail des échiquiers & classement</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: HONNEUR & STATISTIQUES DU CLUB
          - Top Scoreurs (Points)
          - Meilleures Performances (TPR & surperformance Elo)
          - Les Générations du Club (Doyen & Espoir résolus via FIDE/Lichess)
         ========================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Tableau d'Honneur & Générations du Club
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Les meilleurs marqueurs, les surperformances tournoi (TPR) et les générations réunies sous les mêmes couleurs.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Top Scoreurs */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Top Marqueurs
                </span>
                <span className="text-xs text-slate-500">Points bruts</span>
              </div>

              {topScorers.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Aucune partie jouée.</p>
              ) : (
                <div className="space-y-2.5">
                  {topScorers.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-slate-400 w-4 shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <PlayerHoverCard playerName={p.fullName} expectedElo={p.rating}>
                            <span className="font-semibold text-slate-900 hover:underline cursor-pointer block truncate">
                              {p.fullName}
                            </span>
                          </PlayerHoverCard>
                          <span className="text-xs font-mono text-slate-500 tabular-nums">
                            Elo {p.rating || 'NC'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <span className="font-bold text-emerald-700">
                          {formatChessScore(p.score)} / {p.gamesPlayed} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200/70 text-xs text-slate-500">
              Classement selon le total de points marqués pour le club.
            </div>
          </div>

          {/* 2. Meilleures Performances (TPR & Sensation) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Top Performances (TPR)
                </span>
                <span className="text-xs text-slate-500">≥ 2 parties</span>
              </div>

              {topPerformers.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Pas encore de joueur avec 2 parties et surperformance Elo.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {topPerformers.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-slate-400 w-4 shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <PlayerHoverCard playerName={p.fullName} expectedElo={p.rating}>
                            <span className="font-semibold text-slate-900 hover:underline cursor-pointer block truncate">
                              {p.fullName}
                            </span>
                          </PlayerHoverCard>
                          <span className="text-xs font-mono text-slate-500 tabular-nums">
                            Elo {p.rating} • {p.gamesPlayed} parties
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <div className="font-bold text-slate-900">
                          TPR {p.tpr}
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">
                          +{p.diff} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200/70 text-xs text-slate-500">
              Performance Tournoi calculée selon la formule officielle FIDE.
            </div>
          </div>

          {/* 3. Les Générations du Club (Doyen & Espoir) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Les Générations du Club
                </span>
                {isAgesLoading ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                    <span>Scan FIDE...</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Actifs 2026–2027</span>
                )}
              </div>

              <div className="space-y-3">
                {/* Doyen */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Le Doyen de la Saison
                  </div>
                  {oldestPlayer ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <PlayerHoverCard playerName={oldestPlayer.playerName} expectedElo={oldestPlayer.rating}>
                          <span className="font-semibold text-sm text-slate-900 hover:underline cursor-pointer block truncate">
                            {oldestPlayer.playerName}
                          </span>
                        </PlayerHoverCard>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          Elo {oldestPlayer.rating || 'NC'} • {oldestPlayer.gamesPlayed} ronde{oldestPlayer.gamesPlayed > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <div className="text-base font-bold text-slate-900">
                          {oldestPlayer.age} ans
                        </div>
                        <span className="text-xs text-slate-500">
                          Né en {oldestPlayer.birthYear}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      {isAgesLoading ? 'Recherche en cours dans la base FIDE...' : 'Profil FIDE non renseigné'}
                    </div>
                  )}
                </div>

                {/* Espoir */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    L'Espoir du Club
                  </div>
                  {youngestPlayer ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <PlayerHoverCard playerName={youngestPlayer.playerName} expectedElo={youngestPlayer.rating}>
                          <span className="font-semibold text-sm text-slate-900 hover:underline cursor-pointer block truncate">
                            {youngestPlayer.playerName}
                          </span>
                        </PlayerHoverCard>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          Elo {youngestPlayer.rating || 'NC'} • {youngestPlayer.gamesPlayed} ronde{youngestPlayer.gamesPlayed > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <div className="text-base font-bold text-slate-900">
                          {youngestPlayer.age} ans
                        </div>
                        <span className="text-xs text-slate-500">
                          Né en {youngestPlayer.birthYear}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      {isAgesLoading ? 'Recherche en cours dans la base FIDE...' : 'Profil FIDE non renseigné'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200/70 text-xs text-slate-500">
              Âge officiel synchronisé depuis l'annuaire FIDE / Lichess pour les joueurs ayant disputé au moins une ronde.
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: PROGRAMME DE LA PROCHAINE RONDE
          Clean fixture cards with Home/Away guidance
         ========================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Prochaine Ronde (Ronde {latestRoundNumber + 1})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Affiches à venir pour toutes les équipes du club et désignation des rencontres domicile / déplacement.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('scouting')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span>Consulter l'analyse des forces adverses</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {scouting.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Calendrier de la prochaine ronde en cours d'actualisation par la Fédération.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scouting.map((s, idx) => {
              const isBye = s.opponentTeamName.toUpperCase().includes('BYE');

              return (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 flex flex-col justify-between transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {s.ourTeamName}
                      </span>
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 tabular-nums">
                        {s.divisionLabel}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">
                        Adversaire
                      </div>
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        {s.opponentTeamName}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                            isBye
                              ? 'bg-slate-200 text-slate-700'
                              : s.isHome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isBye ? (
                            'Exempt (BYE)'
                          ) : s.isHome ? (
                            <>
                              <Home className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Domicile (14h00)</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-3.5 w-3.5 text-amber-700" />
                              <span>En Déplacement</span>
                            </>
                          )}
                        </span>

                        {!isBye && (
                          <span className="font-mono text-slate-500 tabular-nums">
                            {s.boardCount} échiquiers
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('scouting')}
                    className="mt-3 pt-2 border-t border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                  >
                    <span>Repérage & compositions probables</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
