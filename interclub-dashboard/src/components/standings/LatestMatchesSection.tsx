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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
              <Swords className="h-3.5 w-3.5" />
              Dernière Ronde Jouée : Ronde {latestRoundNumber}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Derniers Résultats des Matchs — {clubName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Détail des résultats échiquier par échiquier pour chaque équipe du club.</span>
            <span>•</span>
            <button
              type="button"
              onClick={toggleAll}
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              {allExpanded ? 'Tout replier ⌃' : 'Tout déplier ⌄'}
            </button>
          </div>
        </div>

        {/* Global Round summary pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Bilan Club</div>
            <div className="text-xs font-bold text-slate-800">
              <span className="text-emerald-600 font-extrabold">{totalWins}V</span>
              {totalDraws > 0 && <span className="text-amber-600 font-extrabold"> • {totalDraws}N</span>}
              {totalLosses > 0 && <span className="text-rose-600 font-extrabold"> • {totalLosses}D</span>}
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase font-bold text-indigo-500">Pts de Match</div>
            <div className="text-xs font-bold text-indigo-700">
              {totalMatchPoints} / {maxMatchPoints} pts
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-center shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pts Échiquiers</div>
            <div className="text-xs font-bold text-slate-800">
              {totalBoardPoints} / {totalPossibleBoards}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Team Matches */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {matches.map((m) => {
          const matchKey = `${m.division}${m.index}`;
          const isExpanded = !!expandedMatches[matchKey];

          return (
            <div
              key={matchKey}
              className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 transition overflow-hidden"
            >
              {/* Match Header Bar */}
              <div
                onClick={() => toggleExpand(matchKey)}
                className="flex cursor-pointer items-center justify-between p-4 bg-white border-b border-slate-100 hover:bg-slate-50/50 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {m.divisionLabel}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      {m.isHome ? (
                        <>
                          <Home className="h-3 w-3 text-emerald-600" /> Domicile
                        </>
                      ) : (
                        <>
                          <Plane className="h-3 w-3 text-blue-600" /> Extérieur
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 text-base">{m.ourTeamName}</span>
                    <span className="text-xs text-slate-400 font-semibold">vs</span>
                    <span className="font-semibold text-slate-700 text-sm">{m.opponentTeamName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>{getOutcomeBadge(m.matchOutcome, m.ourScore, m.oppScore)}</div>
                  <button
                    type="button"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Board-by-board list */}
              {isExpanded && (
                <div className="p-3">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-2.5 py-1.5 text-center">Éch.</th>
                          <th className="px-2 py-1.5">Notre Joueur</th>
                          <th className="px-2 py-1.5 text-center">Résultat</th>
                          <th className="px-2 py-1.5">Joueur Adversaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {m.boards.map((b) => {
                          const isWin = b.score === 1;
                          const isDraw = b.score === 0.5;
                          const isLoss = b.score === 0;

                          return (
                            <tr
                              key={b.board}
                              className={`hover:bg-slate-50/70 transition ${
                                isWin
                                  ? 'bg-emerald-50/20'
                                  : isLoss
                                  ? 'bg-rose-50/20'
                                  : ''
                              }`}
                            >
                              {/* Board Number & Color */}
                              <td className="px-2.5 py-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-bold text-slate-600">{b.board}</span>
                                  <span
                                    title={b.color === 'white' ? 'Blancs' : 'Noirs'}
                                    className={`inline-block h-2 w-2 rounded-full border ${
                                      b.color === 'white'
                                        ? 'bg-white border-slate-400'
                                        : 'bg-slate-900 border-slate-900'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Our Player */}
                              <td className="px-2 py-2">
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {b.ourPlayerName}
                                </div>
                                {b.ourPlayerRating > 0 && (
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {b.ourPlayerRating} Elo
                                  </div>
                                )}
                              </td>

                              {/* Score badge */}
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                    isWin
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isDraw
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {b.resultString || (isWin ? '1 - 0' : isDraw ? '½ - ½' : '0 - 1')}
                                </span>
                              </td>

                              {/* Opponent Player */}
                              <td className="px-2 py-2">
                                <div className="font-medium text-slate-700 leading-tight">
                                  {b.oppPlayerName}
                                </div>
                                {b.oppPlayerRating > 0 && (
                                  <div className="text-[10px] text-slate-400">
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
