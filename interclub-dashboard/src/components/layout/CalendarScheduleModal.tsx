import React, { useState, useRef, useEffect } from 'react';
import { InterclubRoundSchedule, TeamRoundMatchup } from '../../domain/calendar';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Home,
  Plane,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: InterclubRoundSchedule[];
  onSelectRound: (roundNumber: number) => void;
}

export const CalendarScheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schedule,
  onSelectRound,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'clashes' | 'upcoming'>('all');
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});
  const [hoveredMatchup, setHoveredMatchup] = useState<{
    key: string;
    matchup: TeamRoundMatchup;
    openDown?: boolean;
  } | null>(null);

  const currentRoundRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (currentRoundRef.current) {
          currentRoundRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, filterMode]);

  if (!isOpen) return null;

  const clashCount = schedule.filter((s) => s.frenchClash.hasClash).length;

  const filteredSchedule = schedule.filter((s) => {
    if (filterMode === 'clashes') return s.frenchClash.hasClash;
    if (filterMode === 'upcoming') return s.status !== 'past';
    return true;
  });

  const toggleRound = (roundNumber: number, defaultExpanded: boolean) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [roundNumber]: prev[roundNumber] !== undefined ? !prev[roundNumber] : !defaultExpanded,
    }));
  };

  const handleCardClick = (roundNumber: number) => {
    onSelectRound(roundNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-5xl my-auto max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                <Calendar className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Calendrier des Interclubs 2026–2027 & Conflits France (FFE)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Horaire officiel des 11 rondes FRBE, détection automatique des chevauchements avec le championnat de France (N1–N4) et repérage des équipes adverses.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar & Summary */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Toutes les rondes (11)
            </button>

            <button
              onClick={() => setFilterMode('clashes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'clashes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Conflits France ({clashCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'upcoming'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Matchs à venir
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Survolez une équipe pour voir son niveau • Cliquez pour scouter la ronde
          </div>
        </div>

        {/* Schedule List */}
        <div ref={scrollContainerRef} className="p-6 overflow-y-auto space-y-4 flex-1 pb-32">
          {filteredSchedule.map((round) => {
            const hasClash = round.frenchClash.hasClash;
            const isCurrent = round.status === 'current';
            const isPast = round.status === 'past';
            const isExpanded =
              expandedRounds[round.roundNumber] !== undefined
                ? expandedRounds[round.roundNumber]
                : !isPast;

            const wins = round.matchups.filter((m) => m.matchOutcome === 'win').length;
            const draws = round.matchups.filter((m) => m.matchOutcome === 'draw').length;
            const losses = round.matchups.filter((m) => m.matchOutcome === 'loss').length;

            {/* Minimized / Collapsed Past Round */}
            if (isPast && !isExpanded) {
              return (
                <div
                  key={round.roundNumber}
                  className="border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl p-3.5 transition-all flex items-center justify-between cursor-pointer group"
                  onClick={() => toggleRound(round.roundNumber, false)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-600 text-white rounded-md">
                      Ronde {round.roundNumber}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {round.formattedDate}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-500 border border-slate-200">
                      Ronde jouée
                    </span>
                    {round.matchups.some((m) => m.played) && (
                      <span className="text-xs font-mono font-semibold text-slate-600">
                        Bilan :{' '}
                        <span className="text-emerald-700 font-bold">{wins}V</span>{' • '}
                        <span className="text-amber-700 font-bold">{draws}N</span>{' • '}
                        <span className="text-rose-700 font-bold">{losses}D</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                    <span>Afficher les {round.matchups.length} matchs</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={round.roundNumber}
                ref={isCurrent ? currentRoundRef : undefined}
                className={`border rounded-xl p-4 sm:p-5 transition-all ${
                  isCurrent
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-xs'
                    : hasClash
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Round Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                      Ronde {round.roundNumber}
                    </span>

                    <span className="text-base font-bold text-slate-900">
                      {round.formattedDate}
                    </span>

                    {/* Status Pill */}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Prochaine Ronde
                      </span>
                    )}

                    {isPast && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Ronde jouée
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* French Conflict Warning Badge */}
                    {hasClash ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-2xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span>Conflit Ronde {round.frenchClash.frenchRound} FFE (France)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        Pas de conflit France connu
                      </span>
                    )}

                    {/* Minimize button for rounds */}
                    <button
                      onClick={() => toggleRound(round.roundNumber, !isPast)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isExpanded ? 'Réduire cette ronde' : 'Déplier'}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Conflict explanation banner if applicable */}
                {hasClash && (
                  <div className="mt-3 p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Alerte composition joueurs français :</strong> Cette date coïncide avec la Ronde {round.frenchClash.frenchRound} des championnats par équipes en France (N1 à N4). Les joueurs du club licenciés en France risquent fortement d'être retenus par leur club français.
                    </div>
                  </div>
                )}

                {/* Team Matchups for this round */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {round.matchups.map((m, mIdx) => {
                    const matchupKey = `${round.roundNumber}-${m.divisionLabel}-${mIdx}`;
                    const isHovered = hoveredMatchup?.key === matchupKey;

                    return (
                      <div
                        key={matchupKey}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Open downwards if near top of viewport (< 350px) to prevent top clipping
                          const openDown = rect.top < 350;
                          setHoveredMatchup({ key: matchupKey, matchup: m, openDown });
                        }}
                        onMouseLeave={() => setHoveredMatchup(null)}
                        onClick={() => handleCardClick(round.roundNumber)}
                        className="relative p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300 transition-colors cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          {/* Matchup Header */}
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60">
                            <span className="font-bold text-slate-900 truncate">
                              {m.teamName}
                            </span>
                            <span className="font-mono text-[10px] font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                              {m.divisionLabel}
                            </span>
                          </div>

                          {/* Opponent & Location */}
                          <div className="my-2 space-y-1">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              vs {m.opponentTeamName}
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                {m.isBye ? (
                                  <span className="text-slate-400">Exempt (BYE)</span>
                                ) : m.isHome ? (
                                  <>
                                    <Home className="h-3 w-3 text-emerald-600" />
                                    <span>Domicile</span>
                                  </>
                                ) : (
                                  <>
                                    <Plane className="h-3 w-3 text-amber-600" />
                                    <span>Déplacement</span>
                                  </>
                                )}
                              </span>

                              {!m.isBye && (
                                <span className="font-mono text-slate-500 tabular-nums">
                                  {m.boardCount} éch.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Score */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          {m.played ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  m.matchOutcome === 'win'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : m.matchOutcome === 'draw'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {m.matchOutcome === 'win'
                                  ? 'Victoire'
                                  : m.matchOutcome === 'draw'
                                  ? 'Partage'
                                  : 'Défaite'}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {m.ourScore} - {m.oppScore}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 group-hover:underline text-[11px] font-semibold flex items-center gap-1">
                              <span>Scouter ce match</span>
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          )}

                          {m.opponentStats?.averageElo && (
                            <span className="text-[10px] font-mono text-slate-500">
                              ~{m.opponentStats.averageElo} Elo
                            </span>
                          )}
                        </div>

                        {/* Hover Preview Popover */}
                        {isHovered && !m.isBye && (
                          <div
                            className={`absolute ${
                              hoveredMatchup?.openDown ? 'top-full mt-2' : 'bottom-full mb-2'
                            } ${
                              mIdx % 3 === 0
                                ? 'left-0 sm:left-1/2 sm:-translate-x-1/2'
                                : mIdx % 3 === 2
                                ? 'right-0 sm:left-1/2 sm:-translate-x-1/2'
                                : 'left-1/2 -translate-x-1/2'
                            } w-72 p-3 bg-slate-900 text-white rounded-xl shadow-2xl z-50 text-xs pointer-events-none animate-in fade-in duration-100`}
                          >
                            <div className="font-bold text-emerald-400 mb-1 border-b border-slate-800 pb-1">
                              {m.opponentTeamName}
                            </div>

                            <div className="space-y-1 text-slate-300 text-[11px]">
                              {m.opponentStats?.rank ? (
                                <div className="flex justify-between">
                                  <span>Classement division :</span>
                                  <strong className="text-white">
                                    {m.opponentStats.rank}e / {m.opponentStats.totalTeams || 12}
                                  </strong>
                                </div>
                              ) : (
                                <div className="text-slate-400">Classement non disponible</div>
                              )}

                              {m.opponentStats?.matchPoints !== undefined && (
                                <div className="flex justify-between">
                                  <span>Points de match :</span>
                                  <strong className="text-white">
                                    {m.opponentStats.matchPoints} pts ({m.opponentStats.boardPoints} éch.)
                                  </strong>
                                </div>
                              )}

                              {m.opponentStats?.averageElo && (
                                <div className="flex justify-between">
                                  <span>Moyenne Elo observée :</span>
                                  <strong className="text-amber-400">
                                    ~{m.opponentStats.averageElo}
                                  </strong>
                                </div>
                              )}

                              {m.opponentStats?.recentResults && m.opponentStats.recentResults.length > 0 && (
                                <div className="pt-1.5 mt-1 border-t border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    Résultats précédents :
                                  </span>
                                  <div className="space-y-0.5">
                                    {m.opponentStats.recentResults.slice(0, 3).map((res, rIdx) => (
                                      <div key={rIdx} className="flex justify-between text-[10px]">
                                        <span className="truncate max-w-[130px]">
                                          R{res.round} vs {res.opponentName}
                                        </span>
                                        <span
                                          className={`font-mono font-bold ${
                                            res.outcome === 'win'
                                              ? 'text-emerald-400'
                                              : res.outcome === 'draw'
                                              ? 'text-amber-400'
                                              : 'text-rose-400'
                                          }`}
                                        >
                                          {res.ourScore} - {res.oppScore}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 pt-1 border-t border-slate-800 text-[9px] text-slate-400 text-center font-mono">
                              Cliquez pour ouvrir le scouting complet
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Horaires standards : tous les matchs débutent à <strong>14h00</strong>.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
