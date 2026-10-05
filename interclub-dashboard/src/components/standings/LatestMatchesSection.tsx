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
    <div className="chess-panel p-6 mt-8">
      {/* Section Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#E2DFD8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F9F8F6] border border-[#E2DFD8] px-2.5 py-1 text-xs font-semibold text-[#6E6A64]">
              <Swords className="h-3.5 w-3.5" />
              Ronde {latestRoundNumber}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-bold font-serif text-[#1A1918] tracking-tight">
            Résultats des Matchs — {clubName}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-sm text-[#6E6A64]">
            <span>Scorecard officiel par équipe et échiquier.</span>
            <span className="text-[#E2DFD8] font-bold">•</span>
            <button
              type="button"
              onClick={toggleAll}
              className="font-semibold text-[#1A1918] hover:text-[#1E5E3A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              {allExpanded ? 'Tout replier ⌃' : 'Tout déplier ⌄'}
            </button>
          </div>
        </div>

        {/* Global Round summary pill */}
        <div className="flex flex-wrap items-center gap-4 font-mono">
          <div className="bg-[#FFFFFF] border border-[#E2DFD8] px-4 py-2.5 text-center">
            <div className="text-[9px] uppercase font-bold text-[#6E6A64] tracking-wider mb-1">Bilan Club</div>
            <div className="text-sm font-bold text-[#1A1918]">
              <span className="text-[#1E5E3A]">{totalWins}V</span>
              {totalDraws > 0 && <span className="text-[#B45309]"> • {totalDraws}N</span>}
              {totalLosses > 0 && <span className="text-[#B91C1C]"> • {totalLosses}D</span>}
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2DFD8] px-4 py-2.5 text-center">
            <div className="text-[9px] uppercase font-bold text-[#6E6A64] tracking-wider mb-1">Pts de Match</div>
            <div className="text-sm font-bold text-[#1A1918]">
              {totalMatchPoints} / {maxMatchPoints} pts
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2DFD8] px-4 py-2.5 text-center">
            <div className="text-[9px] uppercase font-bold text-[#6E6A64] tracking-wider mb-1">Pts Échiquiers</div>
            <div className="text-sm font-bold text-[#1A1918]">
              {totalBoardPoints} / {totalPossibleBoards}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Team Matches */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {matches.map((m) => {
          const matchKey = `${m.division}${m.index}`;
          const isExpanded = !!expandedMatches[matchKey];

          return (
            <div
              key={matchKey}
              className="bg-[#FFFFFF] border border-[#E2DFD8] hover:border-[#1A1918] transition-colors overflow-hidden group"
            >
              {/* Match Header Bar */}
              <div
                onClick={() => toggleExpand(matchKey)}
                className="flex cursor-pointer items-center justify-between p-4 bg-[#F9F8F6] border-b border-[#E2DFD8] hover:bg-[#F0EFF0] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="bg-[#1A1918] text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                      {m.divisionLabel}
                    </span>
                    <span className="text-[10px] text-[#6E6A64] flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      {m.isHome ? (
                        <>
                          <Home className="h-3.5 w-3.5 text-[#1A1918]" /> DOMICILE
                        </>
                      ) : (
                        <>
                          <Plane className="h-3.5 w-3.5" /> EXTÉRIEUR
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-2.5">
                    <span className="font-bold text-[#1A1918] text-lg">{m.ourTeamName}</span>
                    <span className="text-xs text-[#6E6A64] font-medium font-serif italic">vs</span>
                    <span className="font-semibold text-[#6E6A64] text-base">{m.opponentTeamName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    {m.matchOutcome === 'win' && (
                      <span className="inline-flex items-center gap-1 bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 px-2.5 py-1 text-[10px] font-bold font-mono">
                        VICTOIRE ({m.ourScore}-{m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'draw' && (
                      <span className="inline-flex items-center gap-1 bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20 px-2.5 py-1 text-[10px] font-bold font-mono">
                        MATCH NUL ({m.ourScore}-{m.oppScore})
                      </span>
                    )}
                    {m.matchOutcome === 'loss' && (
                      <span className="inline-flex items-center gap-1 bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20 px-2.5 py-1 text-[10px] font-bold font-mono">
                        DÉFAITE ({m.ourScore}-{m.oppScore})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-[#6E6A64] hover:text-[#1A1918] transition-colors"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Board-by-board list */}
              {isExpanded && (
                <div className="p-0">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FFFFFF] text-[10px] uppercase font-bold text-[#6E6A64] tracking-wider border-b border-[#E2DFD8]">
                      <tr>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8] w-12">Éch.</th>
                        <th className="px-3 py-2 border-r border-[#E2DFD8]">Notre Joueur</th>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8] w-24">Résultat</th>
                        <th className="px-3 py-2 text-right">Adversaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD8]">
                      {m.boards.map((b) => {
                        const isWin = b.score === 1;
                        const isDraw = b.score === 0.5;
                        const isLoss = b.score === 0;

                        return (
                          <tr
                            key={b.board}
                            className={`hover:bg-[#F9F8F6] transition-colors h-[38px]`}
                          >
                            {/* Board Number & Color */}
                            <td className="px-3 py-1.5 text-center whitespace-nowrap bg-[#F9F8F6] border-r border-[#E2DFD8]">
                              <div className="flex items-center justify-center gap-1.5 font-mono">
                                <span className="font-bold text-[#1A1918] text-xs">{b.board}</span>
                                <span
                                  title={b.color === 'white' ? 'Blancs' : 'Noirs'}
                                  className={`inline-block h-2.5 w-2.5 border ${
                                    b.color === 'white'
                                      ? 'bg-white border-[#1A1918]'
                                      : 'bg-[#1A1918] border-[#1A1918]'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Our Player */}
                            <td className="px-3 py-1.5 border-r border-[#E2DFD8]">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#1A1918] truncate max-w-[130px] sm:max-w-[170px]">
                                  {b.ourPlayerName}
                                </span>
                                {b.ourPlayerRating > 0 && (
                                  <span className="text-[10px] text-[#6E6A64] font-mono">
                                    {b.ourPlayerRating}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Score badge */}
                            <td className="px-3 py-1.5 text-center whitespace-nowrap border-r border-[#E2DFD8]">
                              <span
                                className={`inline-block px-2 py-0.5 text-[11px] font-bold font-mono border ${
                                  isWin
                                    ? 'text-[#1E5E3A] border-[#1E5E3A]/20 bg-[#1E5E3A]/5'
                                    : isDraw
                                    ? 'text-[#B45309] border-[#B45309]/20 bg-[#B45309]/5'
                                    : 'text-[#B91C1C] border-[#B91C1C]/20 bg-[#B91C1C]/5'
                                }`}
                              >
                                {b.resultString || (isWin ? '1-0' : isDraw ? '½-½' : '0-1')}
                              </span>
                            </td>

                            {/* Opponent Player */}
                            <td className="px-3 py-1.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {b.oppPlayerRating > 0 && (
                                  <span className="text-[10px] text-[#6E6A64] font-mono">
                                    {b.oppPlayerRating}
                                  </span>
                                )}
                                <span className="font-semibold text-[#6E6A64] truncate max-w-[130px] sm:max-w-[170px]">
                                  {b.oppPlayerName}
                                </span>
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
