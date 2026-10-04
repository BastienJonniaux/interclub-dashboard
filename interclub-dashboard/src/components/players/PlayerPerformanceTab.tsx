import React, { useState, useMemo } from 'react';
import { PlayerStats } from '../../domain/performance';
import { Search, Flame, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  players: PlayerStats[];
  clubName: string;
}

export const PlayerPerformanceTab: React.FC<Props> = ({ players, clubName }) => {
  const [search, setSearch] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<number | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchSearch =
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString().includes(search);
      const matchActive = !filterActiveOnly || p.gamesPlayed > 0;
      return matchSearch && matchActive;
    });
  }, [players, search, filterActiveOnly]);

  const activePlayers = players.filter((p) => p.gamesPlayed > 0);
  const totalGames = players.reduce((s, p) => s + p.gamesPlayed, 0);
  const totalScore = players.reduce((s, p) => s + p.score, 0);

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="bg-[#1A1918] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2DFD8]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-white tracking-tight">
            Performance des Joueurs — {clubName}
          </h2>
          <p className="text-sm text-[#E2DFD8] mt-2 max-w-3xl leading-relaxed">
            Suivi individuel, scores, points et Performance Tournoi (TPR) par division.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 px-4 py-2 text-center rounded-sm">
            <span className="text-[10px] uppercase font-bold text-[#E2DFD8] tracking-widest">Joueurs Actifs</span>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {activePlayers.length} / {players.length}
            </div>
          </div>
          <div className="bg-white text-[#1A1918] px-4 py-2 text-center rounded-sm border border-[#E2DFD8]">
            <span className="text-[10px] uppercase font-bold text-[#6E6A64] tracking-widest">Points Club</span>
            <div className="text-lg font-bold font-mono text-[#1A1918] mt-0.5">
              {totalScore} / {totalGames} pts
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between chess-panel p-4 bg-white border border-[#E2DFD8]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6E6A64]" />
          <input
            type="text"
            placeholder="Rechercher un joueur (nom, matricule)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-none border border-[#E2DFD8] bg-white pl-9 pr-4 py-2 text-sm text-[#1A1918] placeholder-[#6E6A64] focus:border-[#1A1918] focus:outline-none focus:ring-1 focus:ring-[#1A1918] transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1918] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded-none border-[#E2DFD8] text-[#1A1918] focus:ring-[#1A1918] focus:ring-offset-0 focus:ring-offset-transparent"
            />
            Uniquement les joueurs actifs
          </label>
        </div>
      </div>

      {/* Players Table */}
      <div className="overflow-hidden chess-panel bg-white border border-[#E2DFD8]">
        <div className="overflow-x-auto bg-[#F9F8F6]">
          <table className="w-full text-left text-sm text-[#1A1918]">
            <thead className="bg-[#FFFFFF] text-[10px] uppercase font-bold tracking-wider text-[#6E6A64] border-b border-[#E2DFD8]">
              <tr>
                <th className="px-4 py-3 border-r border-[#E2DFD8]">Joueur / Matricule</th>
                <th className="px-3 py-3 text-center border-r border-[#E2DFD8]">Elo FRBE</th>
                <th className="px-3 py-3 text-center border-r border-[#E2DFD8]">Titulaire</th>
                <th className="px-3 py-3 text-center border-r border-[#E2DFD8]">Parties</th>
                <th className="px-4 py-3 text-center font-bold text-[#1A1918] border-r border-[#E2DFD8]">Score</th>
                <th className="px-3 py-3 text-center border-r border-[#E2DFD8]">Perf. (TPR)</th>
                <th className="px-3 py-3 text-center border-r border-[#E2DFD8]">Diff.</th>
                <th className="px-4 py-3">Divisions jouées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD8]">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6E6A64] bg-white font-medium">
                    Aucun joueur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p) => {
                  const hasPlayed = p.gamesPlayed > 0;
                  const isHot = hasPlayed && p.score / p.gamesPlayed >= 0.75;
                  const diff = p.diff;
                  const isHovered = hoveredPlayerId === p.id;
                  const isExpanded = expandedPlayerId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`transition-colors h-[44px] ${
                          isHot
                            ? 'bg-[#B45309]/5 hover:bg-[#B45309]/10'
                            : isExpanded
                            ? 'bg-[#F9F8F6]'
                            : 'bg-white hover:bg-[#F9F8F6]'
                        }`}
                      >
                        {/* Player name with hover popover */}
                        <td
                          className="px-4 py-2 border-r border-[#E2DFD8] relative"
                          onMouseEnter={() => hasPlayed && setHoveredPlayerId(p.id)}
                          onMouseLeave={() => setHoveredPlayerId(null)}
                        >
                          <div
                            onClick={() => hasPlayed && setExpandedPlayerId(isExpanded ? null : p.id)}
                            className={`flex items-center justify-between gap-2 ${
                              hasPlayed ? 'cursor-pointer group' : ''
                            }`}
                          >
                            <div>
                              <div className="font-bold text-[#1A1918] flex items-center gap-1.5 group-hover:text-[#1E5E3A] transition-colors">
                                {p.fullName}
                                {isHot && (
                                  <span title="Joueur très en forme !">
                                    <Flame className="h-4 w-4 text-[#B45309] fill-[#B45309] inline" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#6E6A64] flex items-center gap-1 font-mono uppercase tracking-wider">
                                <span>Matr. {p.id}</span>
                              </div>
                            </div>

                            {hasPlayed && (
                              <button
                                type="button"
                                className="p-1 text-[#6E6A64] group-hover:text-[#1A1918] transition-colors"
                                title="Voir les matchs détaillés"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Hover Tooltip / Popover Tab */}
                          {isHovered && !isExpanded && hasPlayed && (
                            <div className="absolute left-6 top-full z-40 mt-1 w-84 rounded-none bg-white p-4 shadow-xl border border-[#E2DFD8] pointer-events-none">
                              <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-3 mb-3">
                                <div>
                                  <div className="font-bold text-sm text-[#1A1918] font-serif">{p.fullName}</div>
                                  <div className="text-[11px] text-[#6E6A64] mt-0.5 font-mono">
                                    Matr. {p.id} • {p.rating > 0 ? `${p.rating} Elo` : 'NC'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold font-mono text-[#1A1918]">
                                    {p.score} / {p.gamesPlayed} pt{p.score > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-[10px] text-[#6E6A64] mt-0.5 font-mono">TPR: {p.tpr}</div>
                                </div>
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918] mb-2">
                                Adversaires affrontés ({p.games.length})
                              </div>

                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                                {p.games.map((g, idx) => {
                                  const isWin = g.score === 1;
                                  const isDraw = g.score === 0.5;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 bg-[#F9F8F6] p-2.5 text-xs border border-[#E2DFD8]"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 font-semibold text-[#1A1918] truncate">
                                          <span
                                            title={g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            className={`inline-block h-2.5 w-2.5 shrink-0 border ${
                                              g.color === 'white'
                                                ? 'bg-white border-[#1A1918]'
                                                : 'bg-[#1A1918] border-[#1A1918]'
                                            }`}
                                          />
                                          <span className="truncate">{g.opponentName}</span>
                                          {g.opponentRating > 0 && (
                                            <span className="text-[10px] text-[#6E6A64] shrink-0 font-mono">
                                              ({g.opponentRating})
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-1 text-[10px] text-[#6E6A64] font-mono flex items-center gap-1.5 uppercase">
                                          <span>Ronde {g.round}</span>
                                          <span className="text-[#E2DFD8]">•</span>
                                          <span>Div {g.division}</span>
                                          <span className="text-[#E2DFD8]">•</span>
                                          <span>Éch. {g.board}</span>
                                          <span className="text-[#E2DFD8]">•</span>
                                          <span>{g.isHome ? 'Dom.' : 'Ext.'}</span>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <span
                                          className={`inline-block px-2 py-0.5 text-[11px] font-bold font-mono border ${
                                            isWin
                                              ? 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/20'
                                              : isDraw
                                              ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20'
                                              : 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/20'
                                          }`}
                                        >
                                          {g.resultString || (isWin ? '1-0' : isDraw ? '½-½' : '0-1')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-[#E2DFD8] text-center font-bold text-[#1A1918] font-mono">
                          {p.rating || 'NC'}
                        </td>

                        <td className="px-3 py-2 border-r border-[#E2DFD8] text-center">
                          {p.titular ? (
                            <span className="inline-block bg-[#F9F8F6] border border-[#E2DFD8] px-2 py-1 text-[10px] font-bold text-[#6E6A64] uppercase tracking-wider">
                              {p.titular}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6E6A64] font-mono">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-[#E2DFD8] text-center font-mono font-bold text-[#1A1918]">
                          {p.gamesPlayed}
                        </td>

                        <td className="px-4 py-2 border-r border-[#E2DFD8] text-center font-bold font-mono text-base">
                          {p.score} <span className="text-xs text-[#6E6A64] font-medium">/ {p.gamesPlayed}</span>
                        </td>

                        <td className="px-3 py-2 border-r border-[#E2DFD8] text-center font-mono">
                          {hasPlayed ? (
                            <span className="font-bold text-[#1A1918]">{p.tpr}</span>
                          ) : (
                            <span className="text-[#6E6A64]">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-[#E2DFD8] text-center font-mono">
                          {hasPlayed ? (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold ${
                                diff > 0
                                  ? 'text-[#1E5E3A]'
                                  : diff < 0
                                  ? 'text-[#B91C1C]'
                                  : 'text-[#6E6A64]'
                              }`}
                            >
                              {diff > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : diff < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span className="text-[#6E6A64]">-</span>
                          )}
                        </td>

                        <td className="px-4 py-2 bg-[#F9F8F6]">
                          <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                            {Object.entries(p.divisionsPlayed).map(([divKey, count]) => (
                              <span
                                key={divKey}
                                className="bg-white border border-[#E2DFD8] px-2 py-0.5 font-bold text-[#1A1918]"
                              >
                                D{divKey} ({count})
                              </span>
                            ))}
                            {Object.keys(p.divisionsPlayed).length === 0 && (
                              <span className="text-xs text-[#6E6A64]">-</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-row with Opponent details table */}
                      {isExpanded && hasPlayed && (
                        <tr className="bg-[#FFFFFF] border-b border-[#E2DFD8]">
                          <td colSpan={8} className="p-4 sm:p-6 bg-[#F9F8F6] border-x border-b border-[#E2DFD8]">
                            <div className="border border-[#E2DFD8] bg-white p-5 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#E2DFD8] gap-4">
                                <div>
                                  <h4 className="text-sm font-bold font-serif text-[#1A1918]">
                                    Adversaires affrontés par {p.fullName} ({p.games.length} rencontre{p.games.length > 1 ? 's' : ''})
                                  </h4>
                                  <p className="text-[11px] text-[#6E6A64] font-mono mt-1 uppercase">
                                    Matricule {p.id} • Elo officiel FRBE: {p.rating || 'NC'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 font-mono">
                                  <span className="bg-[#1A1918] text-white px-3 py-1.5 text-[11px] font-bold">
                                    Score: {p.score} / {p.gamesPlayed} pts
                                  </span>
                                  <span className="bg-white border border-[#E2DFD8] px-3 py-1.5 text-[11px] font-bold text-[#1A1918]">
                                    TPR: {p.tpr} Elo
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto border border-[#E2DFD8] bg-white">
                                <table className="w-full text-left text-xs text-[#1A1918]">
                                  <thead className="bg-[#F9F8F6] text-[10px] uppercase font-bold text-[#6E6A64] tracking-wider border-b border-[#E2DFD8]">
                                    <tr>
                                      <th className="px-4 py-2.5 border-r border-[#E2DFD8]">Ronde / Division</th>
                                      <th className="px-4 py-2.5 text-center border-r border-[#E2DFD8] w-16">Éch.</th>
                                      <th className="px-4 py-2.5 text-center border-r border-[#E2DFD8] w-24">Couleur</th>
                                      <th className="px-4 py-2.5 border-r border-[#E2DFD8]">Joueur Adversaire</th>
                                      <th className="px-4 py-2.5 text-center border-r border-[#E2DFD8] w-28">Elo Adv.</th>
                                      <th className="px-4 py-2.5 text-center">Résultat</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#E2DFD8] font-mono">
                                    {p.games.map((g, idx) => {
                                      const isWin = g.score === 1;
                                      const isDraw = g.score === 0.5;

                                      return (
                                        <tr key={idx} className="hover:bg-[#F9F8F6] transition-colors h-[38px]">
                                          <td className="px-4 py-2 font-medium text-[#1A1918] border-r border-[#E2DFD8]">
                                            Ronde {g.round} • Div {g.division} ({g.isHome ? 'Dom.' : 'Ext.'})
                                          </td>
                                          <td className="px-4 py-2 text-center font-bold text-[#1A1918] border-r border-[#E2DFD8]">
                                            {g.board}
                                          </td>
                                          <td className="px-4 py-2 text-center border-r border-[#E2DFD8]">
                                            <span className="inline-flex items-center justify-center gap-1.5 font-bold text-[#1A1918] uppercase text-[10px]">
                                              <span
                                                className={`h-2.5 w-2.5 border ${
                                                  g.color === 'white'
                                                    ? 'bg-white border-[#1A1918]'
                                                    : 'bg-[#1A1918] border-[#1A1918]'
                                                }`}
                                              />
                                              {g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 font-bold font-sans text-[#1A1918] border-r border-[#E2DFD8]">
                                            {g.opponentName}
                                          </td>
                                          <td className="px-4 py-2 text-center text-[#6E6A64] border-r border-[#E2DFD8]">
                                            {g.opponentRating > 0 ? (
                                              <span className="font-bold">{g.opponentRating}</span>
                                            ) : (
                                              <span>NC</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <span
                                              className={`inline-block px-2 py-0.5 text-[11px] font-bold border ${
                                                isWin
                                                  ? 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/20'
                                                  : isDraw
                                                  ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20'
                                                  : 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/20'
                                              }`}
                                            >
                                              {g.resultString || (isWin ? '1-0' : isDraw ? '½-½' : '0-1')}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

