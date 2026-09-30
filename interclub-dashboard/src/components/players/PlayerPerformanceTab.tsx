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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Performance des Joueurs — {clubName}
          </h2>
          <p className="text-sm text-slate-500">
            Suivi individuel, scores, points et Performance Tournoi (TPR) par division.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-center shadow-xs">
            <span className="text-xs text-slate-400">Joueurs Actifs</span>
            <div className="text-base font-bold text-slate-900">
              {activePlayers.length} / {players.length}
            </div>
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2 text-center shadow-xs">
            <span className="text-xs text-indigo-600 font-medium">Points Club</span>
            <div className="text-base font-bold text-indigo-700">
              {totalScore} / {totalGames} pts
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un joueur (nom, matricule)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Afficher uniquement les joueurs ayant joué
          </label>
        </div>
      </div>

      {/* Players Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Joueur / Matricule</th>
                <th className="px-3 py-3 text-center">Elo FRBE</th>
                <th className="px-3 py-3 text-center">Titulaire</th>
                <th className="px-3 py-3 text-center">Parties</th>
                <th className="px-4 py-3 text-center font-bold text-indigo-700">Score</th>
                <th className="px-3 py-3 text-center">Perf. (TPR)</th>
                <th className="px-3 py-3 text-center">Diff.</th>
                <th className="px-4 py-3">Divisions jouées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
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
                        className={`transition ${
                          isHot
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                            : isExpanded
                            ? 'bg-indigo-50/40'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Player name with hover popover */}
                        <td
                          className="px-4 py-3 relative"
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
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 group-hover:text-indigo-600 transition">
                                {p.fullName}
                                {isHot && (
                                  <span title="Joueur très en forme !">
                                    <Flame className="h-4 w-4 text-amber-500 fill-amber-500 inline" />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <span>Matr. {p.id}</span>
                              </div>
                            </div>

                            {hasPlayed && (
                              <button
                                type="button"
                                className="p-1 text-slate-300 group-hover:text-indigo-600 transition"
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
                            <div className="absolute left-6 top-full z-40 mt-1 w-84 rounded-xl bg-slate-900 text-white p-3.5 shadow-2xl border border-slate-700 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                <div>
                                  <div className="font-bold text-sm text-white">{p.fullName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    Matr. {p.id} • {p.rating > 0 ? `${p.rating} Elo` : 'NC'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-indigo-400">
                                    {p.score} / {p.gamesPlayed} pt{p.score > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-[10px] text-slate-400">TPR: {p.tpr}</div>
                                </div>
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Adversaires affrontés ({p.games.length})
                              </div>

                              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                {p.games.map((g, idx) => {
                                  const isWin = g.score === 1;
                                  const isDraw = g.score === 0.5;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/90 p-2 text-xs border border-slate-700/60"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-100 truncate">
                                          <span
                                            title={g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border ${
                                              g.color === 'white'
                                                ? 'bg-white border-slate-300'
                                                : 'bg-slate-950 border-slate-600'
                                            }`}
                                          />
                                          <span className="truncate">{g.opponentName}</span>
                                          {g.opponentRating > 0 && (
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                              ({g.opponentRating} Elo)
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-0.5 text-[10px] text-slate-400 flex items-center gap-1.5">
                                          <span>Ronde {g.round}</span>
                                          <span>•</span>
                                          <span>Div {g.division}</span>
                                          <span>•</span>
                                          <span>Éch. {g.board}</span>
                                          <span>•</span>
                                          <span>{g.isHome ? 'Dom.' : 'Ext.'}</span>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <span
                                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                            isWin
                                              ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-700'
                                              : isDraw
                                              ? 'bg-amber-900/90 text-amber-300 border border-amber-700'
                                              : 'bg-rose-900/90 text-rose-300 border border-rose-700'
                                          }`}
                                        >
                                          {g.resultString || (isWin ? '1 - 0' : isDraw ? '½ - ½' : '0 - 1')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-semibold text-slate-800">
                          {p.rating || 'NC'}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {p.titular ? (
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {p.titular}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Réserve</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-medium">
                          {p.gamesPlayed}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-indigo-700 text-base">
                          {p.score} <span className="text-xs text-slate-400">/ {p.gamesPlayed}</span>
                        </td>

                        <td className="px-3 py-3 text-center">
                          {hasPlayed ? (
                            <span className="font-bold text-slate-900">{p.tpr}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {hasPlayed ? (
                            <span
                              className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                                diff > 0
                                  ? 'text-emerald-600'
                                  : diff < 0
                                  ? 'text-rose-600'
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
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(p.divisionsPlayed).map(([divKey, count]) => (
                              <span
                                key={divKey}
                                className="rounded-md bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700"
                              >
                                Div {divKey} ({count})
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
                        <tr className="bg-indigo-50/30 border-b border-indigo-100">
                          <td colSpan={8} className="p-4">
                            <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    Adversaires affrontés par {p.fullName} ({p.games.length} rencontre{p.games.length > 1 ? 's' : ''})
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Matricule {p.id} • Elo officiel FRBE: {p.rating || 'NC'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                    Score: {p.score} / {p.gamesPlayed} pts
                                  </span>
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                    TPR: {p.tpr} Elo
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2">Ronde / Division</th>
                                      <th className="px-3 py-2 text-center">Échiquier</th>
                                      <th className="px-3 py-2 text-center">Couleur</th>
                                      <th className="px-3 py-2">Joueur Adversaire</th>
                                      <th className="px-3 py-2 text-center">Elo Adversaire</th>
                                      <th className="px-3 py-2 text-center">Résultat</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {p.games.map((g, idx) => {
                                      const isWin = g.score === 1;
                                      const isDraw = g.score === 0.5;

                                      return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-3 py-2.5 font-medium text-slate-700">
                                            Ronde {g.round} • Div {g.division} ({g.isHome ? 'Domicile' : 'Extérieur'})
                                          </td>
                                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                                            {g.board}
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                              <span
                                                className={`h-2 w-2 rounded-full border ${
                                                  g.color === 'white'
                                                    ? 'bg-white border-slate-300'
                                                    : 'bg-slate-900 border-slate-900'
                                                }`}
                                              />
                                              {g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                                            {g.opponentName}
                                          </td>
                                          <td className="px-3 py-2.5 text-center text-slate-700">
                                            {g.opponentRating > 0 ? (
                                              <span className="font-semibold">{g.opponentRating} Elo</span>
                                            ) : (
                                              <span className="text-slate-400">NC</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span
                                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                                isWin
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                  : isDraw
                                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                                              }`}
                                            >
                                              {g.resultString || (isWin ? '1 - 0' : isDraw ? '½ - ½' : '0 - 1')}
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

