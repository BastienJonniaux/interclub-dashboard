import React, { useState, useMemo } from 'react';
import { PlayerStats } from '../../domain/performance';
import { Search, Flame, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { PlayerHoverCard } from '../common/PlayerHoverCard';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Performance des Joueurs — {clubName}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Suivi individuel, scores, points et Performance Tournoi (TPR) par division.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
          <div className="bg-white border border-slate-200/70 px-4 py-2 text-center rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans block">Joueurs Actifs</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {activePlayers.length} <span className="text-xs font-normal text-slate-400">/ {players.length}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/70 px-4 py-2 text-center rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans block">Points Club</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {totalScore} <span className="text-xs font-normal text-slate-400">/ {totalGames} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/70 rounded-xl p-3.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un joueur (nom, matricule)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-400 focus:outline-hidden transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
            Uniquement les joueurs actifs
          </label>
        </div>
      </div>

      {/* Players Table */}
      <div className="overflow-hidden bg-white border border-slate-200/70 rounded-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200/70">
              <tr>
                <th className="px-5 py-3 border-r border-slate-100">Joueur / Matricule</th>
                <th className="px-3 py-3 text-center border-r border-slate-100">Elo FRBE</th>
                <th className="px-3 py-3 text-center border-r border-slate-100">Titulaire</th>
                <th className="px-3 py-3 text-center border-r border-slate-100">Parties</th>
                <th className="px-5 py-3 text-center font-bold text-slate-900 border-r border-slate-100">Score</th>
                <th className="px-3 py-3 text-center border-r border-slate-100">Perf. (TPR)</th>
                <th className="px-3 py-3 text-center border-r border-slate-100">Diff.</th>
                <th className="px-5 py-3">Divisions jouées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 bg-white font-medium">
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
                        className={`transition-colors h-[48px] ${
                          isExpanded
                            ? 'bg-slate-50'
                            : isHot
                            ? 'bg-emerald-50/25 hover:bg-emerald-50/40'
                            : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Player name with hover popover */}
                        <td
                          className="px-5 py-3 border-r border-slate-100 relative"
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
                              <div className="font-semibold text-slate-900 flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                                <span>{p.fullName}</span>
                                {isHot && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-200/90 shadow-2xs"
                                    title="Excellente performance (≥ 75% des points gagnés)"
                                  >
                                    <Flame className="h-3 w-3 text-emerald-600 fill-emerald-500" />
                                    <span>Top Perf</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wider">
                                <span>Matr. {p.id}</span>
                              </div>
                            </div>

                            {hasPlayed && (
                              <button
                                type="button"
                                className="p-1 text-slate-400 group-hover:text-slate-800 transition-colors cursor-pointer"
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
                            <div className="absolute left-6 top-full z-40 mt-1 w-84 rounded-xl bg-white p-4 shadow-xl border border-slate-200/80 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                <div>
                                  <div className="font-bold text-sm text-slate-900 tracking-tight">{p.fullName}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                                    Matr. {p.id} • {p.rating > 0 ? `${p.rating} Elo` : 'NC'}
                                  </div>
                                </div>
                                <div className="text-right font-mono tabular-nums">
                                  <div className="text-sm font-bold text-slate-900">
                                    {p.score} / {p.gamesPlayed} pt{p.score > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">TPR: {p.tpr}</div>
                                </div>
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Adversaires affrontés ({p.games.length})
                              </div>

                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                                {p.games.map((g, idx) => {
                                  const isWin = g.score === 1;
                                  const isDraw = g.score === 0.5;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 text-xs rounded-xl border border-slate-200/80"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-900 truncate max-w-[130px]">
                                          {g.opponentName}
                                        </div>
                                        <div className="text-[10px] font-mono tabular-nums text-slate-500">
                                          R{g.round} • Éch. {g.board} ({g.opponentRating || 'NC'})
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-mono tabular-nums font-bold rounded ${
                                          isWin
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : isDraw
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}
                                      >
                                        {g.resultString || (isWin ? '1-0' : isDraw ? '½-½' : '0-1')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center border-r border-slate-100 font-mono tabular-nums">
                          {p.rating > 0 ? (
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                              {p.rating}
                            </span>
                          ) : (
                            <span className="text-slate-400">NC</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center border-r border-slate-100 text-xs font-mono">
                          {p.titular ? (
                            <span className="bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold rounded shadow-xs">
                              {p.titular}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center border-r border-slate-100 font-mono tabular-nums text-slate-700 font-semibold">
                          {p.gamesPlayed}
                        </td>

                        <td className="px-5 py-3 text-center font-bold text-slate-900 border-r border-slate-100 font-mono tabular-nums">
                          {isHot ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md font-bold text-xs">
                              {p.score} / {p.gamesPlayed}
                            </span>
                          ) : (
                            <>
                              {p.score} <span className="text-slate-400 font-normal">/ {p.gamesPlayed}</span>
                            </>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center border-r border-slate-100 font-mono tabular-nums">
                          {hasPlayed ? (
                            <span className="font-bold text-slate-900">{p.tpr}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center border-r border-slate-100 font-mono tabular-nums">
                          {hasPlayed && diff !== null ? (
                            <span
                              className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-xs ${
                                diff > 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : diff < 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'text-slate-500'
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
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-5 py-3 bg-slate-50/30">
                          <div className="flex flex-wrap gap-1.5 font-mono tabular-nums text-[10px]">
                            {Object.entries(p.divisionsPlayed).map(([divKey, count]) => (
                              <span
                                key={divKey}
                                className="bg-white border border-slate-200 px-2 py-0.5 font-bold text-slate-800 rounded shadow-xs"
                              >
                                D{divKey} ({count})
                              </span>
                            ))}
                            {Object.keys(p.divisionsPlayed).length === 0 && (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-row with Opponent details table */}
                      {isExpanded && hasPlayed && (
                        <tr className="bg-white border-b border-slate-100">
                          <td colSpan={8} className="p-4 sm:p-6 bg-slate-50/40">
                            <div className="border border-slate-200/70 bg-white p-5 rounded-xl shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-4">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                                    Adversaires affrontés par {p.fullName} ({p.games.length} rencontre{p.games.length > 1 ? 's' : ''})
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 uppercase">
                                    Matricule {p.id} • Elo officiel FRBE: {p.rating || 'NC'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 font-mono tabular-nums">
                                  <span className="bg-slate-900 text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs">
                                    Score: {p.score} / {p.gamesPlayed} pts
                                  </span>
                                  <span className="bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 rounded-lg shadow-xs">
                                    TPR: {p.tpr} Elo
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto border border-slate-200/70 bg-white rounded-lg shadow-xs">
                                <table className="w-full text-left text-xs text-slate-900">
                                  <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/70">
                                    <tr>
                                      <th className="px-4 py-2.5 border-r border-slate-100">Ronde / Division</th>
                                      <th className="px-4 py-2.5 text-center border-r border-slate-100 w-16">Éch.</th>
                                      <th className="px-4 py-2.5 text-center border-r border-slate-100 w-24">Couleur</th>
                                      <th className="px-4 py-2.5 border-r border-slate-100">Joueur Adversaire</th>
                                      <th className="px-4 py-2.5 text-center border-r border-slate-100 w-28">Elo Adv.</th>
                                      <th className="px-4 py-2.5 text-center">Résultat</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                                    {p.games.map((g, idx) => {
                                      const isWin = g.score === 1;
                                      const isDraw = g.score === 0.5;

                                      return (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors h-[38px]">
                                          <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-100">
                                            Ronde {g.round} • Div {g.division} ({g.isHome ? 'Dom.' : 'Ext.'})
                                          </td>
                                          <td className="px-4 py-2 text-center font-bold text-slate-900 border-r border-slate-100">
                                            {g.board}
                                          </td>
                                          <td className="px-4 py-2 text-center border-r border-slate-100">
                                            <span className="inline-flex items-center justify-center gap-1.5 font-bold text-slate-800 uppercase text-[10px]">
                                              <span
                                                className={`h-2.5 w-2.5 rounded-xs border ${
                                                  g.color === 'white'
                                                    ? 'bg-white border-slate-400'
                                                    : 'bg-slate-900 border-slate-900'
                                                }`}
                                              />
                                              {g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 font-bold font-sans text-slate-900 border-r border-slate-100">
                                            {g.opponentName}
                                          </td>
                                          <td className="px-4 py-2 text-center text-slate-500 border-r border-slate-100">
                                            {g.opponentRating > 0 ? (
                                              <span className="font-bold text-slate-800">{g.opponentRating}</span>
                                            ) : (
                                              <span>NC</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <span
                                              className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded border ${
                                                isWin
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  : isDraw
                                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                  : 'bg-rose-50 text-rose-700 border-rose-200'
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
