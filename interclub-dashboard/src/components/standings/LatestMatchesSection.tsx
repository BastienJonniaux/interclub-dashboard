import React, { useState } from 'react';
import { LatestTeamMatch } from '../../domain/matches';
import { getDivisionBadgeStyle } from '../../domain/standings';
import { ChevronDown, ChevronUp, Home, Plane, Swords } from 'lucide-react';
import { PlayerHoverCard } from '../common/PlayerHoverCard';

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

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6 mt-8">
      {/* Section Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-700 rounded-md">
              <Swords className="h-3.5 w-3.5 text-slate-600" />
              Ronde {latestRoundNumber}
            </span>
          </div>
          <h3 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Résultats des Matchs — {clubName}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs sm:text-sm text-slate-500">
            <span>Scorecard officiel par équipe et échiquier.</span>
            <span className="text-slate-300 font-bold">•</span>
            <button
              type="button"
              onClick={toggleAll}
              className="font-semibold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              {allExpanded ? 'Tout replier ⌃' : 'Tout déplier ⌄'}
            </button>
          </div>
        </div>

        {/* Global Round summary pills */}
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-center shadow-xs">
            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Bilan Club</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              <span className="text-emerald-600">{totalWins}V</span>
              {totalDraws > 0 && <span className="text-amber-600"> • {totalDraws}N</span>}
              {totalLosses > 0 && <span className="text-rose-600"> • {totalLosses}D</span>}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-center shadow-xs">
            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Pts de Match</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              {totalMatchPoints} <span className="text-slate-400 font-normal">/ {maxMatchPoints}</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-center shadow-xs">
            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Pts Échiquiers</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              {totalBoardPoints} <span className="text-slate-400 font-normal">/ {totalPossibleBoards}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Team Matches */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 items-start">
        {matches.map((m) => {
          const matchKey = `${m.division}${m.index}`;
          const isExpanded = !!expandedMatches[matchKey];

          return (
            <div
              key={matchKey}
              className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl shadow-xs overflow-hidden transition-all duration-200"
            >
              {/* Match Header Bar */}
              <div
                onClick={() => toggleExpand(matchKey)}
                className={`flex cursor-pointer items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors gap-3 ${
                  isExpanded ? 'border-b border-slate-200/80' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(m.division)}`}>
                      {m.divisionLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase tracking-wider">
                      {m.isHome ? (
                        <>
                          <Home className="h-3.5 w-3.5 text-slate-700" /> DOMICILE
                        </>
                      ) : (
                        <>
                          <Plane className="h-3.5 w-3.5 text-slate-500" /> EXTÉRIEUR
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base whitespace-nowrap">
                      {m.ourTeamName}
                    </span>
                    <span className="text-xs text-slate-400 font-medium italic">vs</span>
                    <span className="font-semibold text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                      {m.opponentTeamName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div>
                    {m.matchOutcome === 'win' && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold font-mono rounded-md tabular-nums">
                        VICTOIRE ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'draw' && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[10px] font-bold font-mono rounded-md tabular-nums">
                        MATCH NUL ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'loss' && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-[10px] font-bold font-mono rounded-md tabular-nums">
                        DÉFAITE ({m.ourScore} - {m.oppScore})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label="Afficher le détail"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Board-by-board list */}
              {isExpanded && (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="px-3 py-2 text-center border-r border-slate-200/60 w-12">Éch.</th>
                        <th className="px-3 py-2 border-r border-slate-200/60">Notre Joueur</th>
                        <th className="px-3 py-2 text-center border-r border-slate-200/60 w-24">Résultat</th>
                        <th className="px-3 py-2 text-right">Adversaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {m.boards.map((b) => {
                        const isWin = b.score === 1;
                        const isDraw = b.score === 0.5;

                        return (
                          <tr
                            key={b.board}
                            className="hover:bg-slate-50/80 transition-colors h-[38px]"
                          >
                            {/* Board Number & Color */}
                            <td className="px-3 py-1.5 text-center whitespace-nowrap bg-slate-50/50 border-r border-slate-200/60 font-mono tabular-nums">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-bold text-slate-800 text-xs">{b.board}</span>
                                <span
                                  title={b.color === 'white' ? 'Blancs' : 'Noirs'}
                                  className={`inline-block h-2.5 w-2.5 rounded-xs border ${
                                    b.color === 'white'
                                      ? 'bg-white border-slate-400'
                                      : 'bg-slate-900 border-slate-900'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Our Player */}
                            <td className="px-3 py-1.5 border-r border-slate-200/60">
                              <div className="flex items-center gap-2">
                                <PlayerHoverCard playerName={b.ourPlayerName} expectedElo={b.ourPlayerRating}>
                                  <span className="font-semibold text-slate-800 truncate max-w-[130px] sm:max-w-[170px] inline-block hover:underline underline-offset-2 cursor-pointer">
                                    {b.ourPlayerName}
                                  </span>
                                </PlayerHoverCard>
                                {b.ourPlayerRating > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono tabular-nums bg-slate-100 px-1 rounded">
                                    {b.ourPlayerRating}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Score badge */}
                            <td className="px-3 py-1.5 text-center whitespace-nowrap border-r border-slate-200/60">
                              <span
                                className={`inline-block px-2 py-0.5 text-[11px] font-bold font-mono tabular-nums rounded border ${
                                  isWin
                                    ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                                    : isDraw
                                    ? 'text-amber-700 border-amber-200 bg-amber-50'
                                    : 'text-rose-700 border-rose-200 bg-rose-50'
                                }`}
                              >
                                {b.resultString || (isWin ? '1-0' : isDraw ? '½-½' : '0-1')}
                              </span>
                            </td>

                            {/* Opponent Player */}
                            <td className="px-3 py-1.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {b.oppPlayerRating > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono tabular-nums bg-slate-100 px-1 rounded">
                                    {b.oppPlayerRating}
                                  </span>
                                )}
                                <PlayerHoverCard playerName={b.oppPlayerName} expectedElo={b.oppPlayerRating}>
                                  <span className="font-semibold text-slate-600 truncate max-w-[130px] sm:max-w-[170px] inline-block hover:underline underline-offset-2 cursor-pointer">
                                    {b.oppPlayerName}
                                  </span>
                                </PlayerHoverCard>
                              </div>
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
        })}
      </div>
    </div>
  );
};
