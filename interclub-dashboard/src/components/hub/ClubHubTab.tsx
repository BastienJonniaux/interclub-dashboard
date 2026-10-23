import React from 'react';
import { ClubFrbe } from '../../modelsFRBE';
import { PlayerStats } from '../../domain/performance';
import { DivisionStandingTable } from '../../domain/standings';
import { LatestTeamMatch } from '../../domain/matches';
import { NextMatchScout } from '../../domain/scouting';
import {
  extractGiantKillers,
  extractUndefeatedPlayers,
  extractTopScorers,
  extractClubRoundSummary,
} from '../../domain/clubHub';
import {
  Trophy,
  Swords,
  Flame,
  ArrowRight,
  Shield,
  Home,
  Plane,
  Building2,
  Sparkles,
} from 'lucide-react';
import { TabType } from '../layout/Navbar';

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
  const giantKillers = React.useMemo(() => extractGiantKillers(playerStats), [playerStats]);
  const undefeatedPlayers = React.useMemo(() => extractUndefeatedPlayers(playerStats), [playerStats]);
  const topScorers = React.useMemo(() => extractTopScorers(playerStats), [playerStats]);
  const roundSummary = React.useMemo(() => extractClubRoundSummary(latestMatches), [latestMatches]);

  const [logoError, setLogoError] = React.useState(false);

  // Group latest matches by round
  const latestRoundNumber = roundSummary?.round || 1;
  const currentRoundMatches = latestMatches.filter((m) => m.roundNumber === latestRoundNumber);

  return (
    <div className="space-y-8">
      {/* Club Hero Banner */}
      <div className="relative bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center bg-slate-900 text-white rounded-2xl overflow-hidden shrink-0 shadow-md border border-slate-800">
              {!logoError ? (
                <img
                  src={`/clubs/${club.idclub}.png`}
                  alt={`Logo Club ${club.idclub}`}
                  className="h-full w-full object-contain p-2"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Trophy className="h-8 w-8 text-amber-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded-md">
                  Matricule {club.idclub}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Interclubs FRBE 2026–2027
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1.5">
                {club.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Espace membres & supporters &bull; Résultats en direct et calendrier des équipes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenClubSelector}
              className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 px-3.5 py-2 text-xs font-mono font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-slate-500" />
              <span>Changer de club</span>
            </button>
          </div>
        </div>

        {/* Round Summary Bar if matches played */}
        {roundSummary && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-slate-900 text-white shadow-xs">
                Ronde {roundSummary.round}
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                Bilan du week-end :
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-700">
                <strong className="text-emerald-700">{roundSummary.wins}V</strong> &bull;{' '}
                <strong className="text-amber-700">{roundSummary.draws}N</strong> &bull;{' '}
                <strong className="text-rose-700">{roundSummary.losses}D</strong>
              </span>
            </div>

            <div className="text-xs font-mono text-slate-500 tabular-nums">
              Points d'échiquiers remportés :{' '}
              <strong className="text-slate-900 font-bold">
                {roundSummary.boardPointsWon} / {roundSummary.totalBoardPointsPossible} pts
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: LES TOMBEURS DE GÉANTS (EXPLOITS ELO) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shadow-xs">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Les Tombeurs de Géants</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Exploits Elo
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Membres du club ayant battu ou neutralisé un adversaire mieux classé qu'eux.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('players')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
          >
            <span>Voir toutes les stats individuelles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {giantKillers.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            Aucun exploit répertorié pour le moment. Que la prochaine ronde apporte de belles victoires !
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {giantKillers.slice(0, 6).map((exploit, idx) => (
              <div
                key={idx}
                className="bg-slate-50/60 border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      +{exploit.ratingDiff} Elo d'écart !
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Ronde {exploit.round} &bull; Éch. {exploit.board}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center justify-between">
                      <span className="truncate">{exploit.playerName}</span>
                      <span className="font-mono text-xs text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded ml-2 shrink-0">
                        {exploit.playerRating}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                      <span className={`font-bold ${exploit.isWin ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {exploit.isWin ? 'a battu' : 'a tenu en échec'}
                      </span>
                      <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                        {exploit.opponentName}
                      </span>
                      <span className="font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] ml-auto shrink-0">
                        {exploit.opponentRating} Elo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Div {exploit.division}</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200/80">
                    Résultat : {exploit.resultString}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: DERNIERS RÉSULTATS DES ÉQUIPES */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Derniers Résultats des Équipes (Ronde {latestRoundNumber})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Scores détaillés et oppositions du week-end dernier.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('standings')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
          >
            <span>Voir le tableau complet des classements</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {currentRoundMatches.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            Aucun résultat disponible pour cette ronde.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRoundMatches.map((m, idx) => {
              const isWin = m.matchOutcome === 'win';
              const isDraw = m.matchOutcome === 'draw';

              return (
                <div
                  key={idx}
                  className="bg-slate-50/60 border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                      <span className="font-bold text-slate-900 text-sm">
                        {m.ourTeamName}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {m.divisionLabel}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                          vs {m.opponentTeamName}
                        </span>
                        <span className="text-[10px] font-mono flex items-center gap-1">
                          {m.isHome ? (
                            <>
                              <Home className="h-3 w-3 text-emerald-600" />
                              <span>Domicile</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-3 w-3 text-slate-400" />
                              <span>Déplacement</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 mt-2">
                        <span className="text-xs font-semibold text-slate-700">Score match</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                              isWin
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isDraw
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isWin ? 'Victoire' : isDraw ? 'Nul' : 'Défaite'}
                          </span>
                          <span className="font-bold font-mono text-base text-slate-900 tabular-nums">
                            {m.ourScore} - {m.oppScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('standings')}
                    className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>Voir classement de la division</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: PROCHAINE RONDE & PROGRAMME */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Programme de la Prochaine Ronde (Ronde {latestRoundNumber + 1})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Calendrier des matchs à venir et déplacements prévus.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('scouting')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
          >
            <span>Voir l'analyse des forces & scouting</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {scouting.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            Calendrier de la prochaine ronde en cours de publication.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scouting.map((s, idx) => {
              const isBye = s.opponentTeamName.toUpperCase().includes('BYE');

              return (
                <div
                  key={idx}
                  className="bg-slate-50/60 border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                      <span className="font-bold text-slate-900 text-sm">
                        {s.ourTeamName}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {s.divisionLabel}
                      </span>
                    </div>

                    <div className="my-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Adversaire
                      </span>
                      <div className="font-bold text-slate-900 text-sm truncate mt-0.5">
                        {s.opponentTeamName}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs font-mono">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] ${
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
                              <Home className="h-3.5 w-3.5 text-emerald-600" />
                              <span>À Domicile (14h)</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-3.5 w-3.5 text-amber-600" />
                              <span>En Déplacement</span>
                            </>
                          )}
                        </span>

                        {!isBye && (
                          <span className="text-slate-500 tabular-nums">
                            {s.boardCount} échiquiers
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('scouting')}
                    className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>Détails & adversaires probables</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: TABLEAU D'HONNEUR DU CLUB (INVAINCUS & TOP SCOREURS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Les Invaincus */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Les Invaincus de la Saison
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              &ge; 2 parties
            </span>
          </div>

          {undefeatedPlayers.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Pas encore de joueur avec 2 parties et 0 défaite.
            </p>
          ) : (
            <div className="space-y-2.5">
              {undefeatedPlayers.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">
                      {p.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Matr. {p.id} &bull; Elo {p.rating || 'NC'}
                    </span>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold text-xs">
                      {p.score} / {p.gamesPlayed} pts
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Invaincu
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Scoreurs */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                <Flame className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Meilleurs Scoreurs du Club
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('players')}
              className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              Tous les joueurs &rarr;
            </button>
          </div>

          {topScorers.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Aucun match enregistré pour le moment.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topScorers.map((p, rank) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                      {rank + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 block truncate">
                        {p.fullName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        TPR: {p.tpr} Elo
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="font-bold text-slate-900 text-xs">
                      {p.score} / {p.gamesPlayed} pts
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {Math.round((p.score / p.gamesPlayed) * 100)}% de victoires
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
