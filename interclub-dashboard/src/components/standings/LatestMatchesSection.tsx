import React, { useState } from 'react';
import { LatestTeamMatch } from '../../domain/matches';
import { Trophy, ChevronDown, ChevronUp, Home, Plane, Swords } from 'lucide-react';

interface Props {
  matches: LatestTeamMatch[];
  clubName: string;
}

export const LatestMatchesSection: React.FC<Props> = ({ matches, clubName }) => {
  // Store which match card details are expanded (default to all closed)
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  if (matches.length === 0) {
    return null;
  }

  const latestRoundNumber = matches[0]?.roundNumber || 1;

  // Aggregate stats across teams for this round
  const totalWins = matches.filter((m) => m.matchOutcome === 'win').length;
  const totalDraws = matches.filter((m) => m.matchOutcome === 'draw').length;
  const totalLosses = matches.filter((m) => m.matchOutcome === 'loss').length;
  const totalMatchPoints = matches.reduce((s, m) => s + m.matchPoints, 0);
  const maxMatchPoints = matches.length * 2;
  const totalBoardPoints = matches.reduce((s, m) => s + m.ourScore, 0);
  const totalPossibleBoards = matches.reduce((s, m) => s + m.boardCount, 0);

  const toggleExpand = (key: string) => {
    setExpandedMatches((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allExpanded = matches.length > 0 && matches.every((m) => !!expandedMatches[`${m.division}${m.index}`]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedMatches({});
    } else {
      const next: Record<string, boolean> = {};
      matches.forEach((m) => {
        next[`${m.division}${m.index}`] = true;
      });
      setExpandedMatches(next);
    }
  };

  const getOutcomeBadge = (outcome: 'win' | 'draw' | 'loss', ourScore: number, oppScore: number) => {
    switch (outcome) {
      case 'win':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            🟢 VICTOIRE ({ourScore} - {oppScore})
          </span>
        );
      case 'draw':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            🟡 MATCH NUL ({ourScore} - {oppScore})
          </span>
        );
      case 'loss':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
            🔴 DÉFAITE ({ourScore} - {oppScore})
          </span>
        );
    }
  };

  return (
    <div className="glass-panel p-5">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Swords className="h-3.5 w-3.5" />
              Dernière Ronde Jouée : Ronde {latestRoundNumber}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-bold text-slate-100 tracking-tight">
            Derniers Résultats des Matchs — {clubName}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>Détail des résultats échiquier par échiquier pour chaque équipe du club.</span>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={toggleAll}
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {allExpanded ? 'Tout replier ⌃' : 'Tout déplier ⌄'}
            </button>
          </div>
        </div>

        {/* Global Round summary pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-center backdrop-blur-md">
            <div className="text-[10px] uppercase font-bold text-slate-400">Bilan Club</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              <span className="text-emerald-400 font-extrabold">{totalWins}V</span>
              {totalDraws > 0 && <span className="text-amber-400 font-extrabold"> • {totalDraws}N</span>}
              {totalLosses > 0 && <span className="text-rose-400 font-extrabold"> • {totalLosses}D</span>}
            </div>
          </div>

          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-center backdrop-blur-md">
            <div className="text-[10px] uppercase font-bold text-indigo-300">Pts de Match</div>
            <div className="text-sm font-bold text-indigo-100 mt-0.5">
              {totalMatchPoints} / {maxMatchPoints} pts
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-center backdrop-blur-md">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pts Échiquiers</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {totalBoardPoints} / {totalPossibleBoards}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Team Matches */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {matches.map((m) => {
          const matchKey = `${m.division}${m.index}`;
          const isExpanded = !!expandedMatches[matchKey];

          return (
            <div
              key={matchKey}
              className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 transition-all duration-300 overflow-hidden group"
            >
              {/* Match Header Bar */}
              <div
                onClick={() => toggleExpand(matchKey)}
                className="flex cursor-pointer items-center justify-between p-4 bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-500/20 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300">
                      {m.divisionLabel}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      {m.isHome ? (
                        <>
                          <Home className="h-3.5 w-3.5 text-emerald-400" /> Domicile
                        </>
                      ) : (
                        <>
                          <Plane className="h-3.5 w-3.5 text-blue-400" /> Extérieur
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-bold text-slate-100 text-lg">{m.ourTeamName}</span>
                    <span className="text-xs text-slate-500 font-semibold">vs</span>
                    <span className="font-semibold text-slate-300 text-sm">{m.opponentTeamName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    {m.matchOutcome === 'win' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        🟢 VICTOIRE ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'draw' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                        🟡 MATCH NUL ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'loss' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
                        🔴 DÉFAITE ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Board-by-board list */}
              {isExpanded && (
                <div className="p-4">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 uppercase text-[10px] font-bold text-slate-400 tracking-wider border-b border-white/5">
                        <tr>
                          <th className="px-3 py-2 text-center">Éch.</th>
                          <th className="px-3 py-2">Notre Joueur</th>
                          <th className="px-3 py-2 text-center">Résultat</th>
                          <th className="px-3 py-2">Joueur Adversaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {m.boards.map((b) => {
                          const isWin = b.score === 1;
                          const isDraw = b.score === 0.5;
                          const isLoss = b.score === 0;

                          return (
                            <tr
                              key={b.board}
                              className={`hover:bg-white/5 transition-colors ${
                                isWin
                                  ? 'bg-emerald-500/5'
                                  : isLoss
                                  ? 'bg-rose-500/5'
                                  : ''
                              }`}
                            >
                              {/* Board Number & Color */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-bold text-slate-500">{b.board}</span>
                                  <span
                                    title={b.color === 'white' ? 'Blancs' : 'Noirs'}
                                    className={`inline-block h-2.5 w-2.5 rounded-full border ${
                                      b.color === 'white'
                                        ? 'bg-white border-slate-300 shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                                        : 'bg-slate-900 border-slate-700'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Our Player */}
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-slate-200">
                                  {b.ourPlayerName}
                                </div>
                                {b.ourPlayerRating > 0 && (
                                  <div className="text-[11px] text-slate-400 font-medium">
                                    {b.ourPlayerRating} Elo
                                  </div>
                                )}
                              </td>

                              {/* Score badge */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                                    isWin
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : isDraw
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {b.resultString || (isWin ? '1 - 0' : isDraw ? '½ - ½' : '0 - 1')}
                                </span>
                              </td>

                              {/* Opponent Player */}
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-slate-300">
                                  {b.oppPlayerName}
                                </div>
                                {b.oppPlayerRating > 0 && (
                                  <div className="text-[11px] text-slate-500">
                                    {b.oppPlayerRating} Elo
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
