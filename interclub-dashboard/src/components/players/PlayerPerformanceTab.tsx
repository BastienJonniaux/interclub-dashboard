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
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            Performance des Joueurs — {clubName}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Suivi individuel, scores, points et Performance Tournoi (TPR) par division.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 text-center rounded-xl">
            <span className="text-xs text-slate-400">Joueurs Actifs</span>
            <div className="text-lg font-bold text-slate-100 mt-0.5">
              {activePlayers.length} / {players.length}
            </div>
          </div>
          <div className="glass-panel px-4 py-2 text-center rounded-xl bg-indigo-500/10 border-indigo-500/20">
            <span className="text-xs text-indigo-300 font-medium">Points Club</span>
            <div className="text-lg font-bold text-indigo-100 mt-0.5">
              {totalScore} / {totalGames} pts
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass-panel p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un joueur (nom, matricule)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded-sm border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 focus:ring-offset-transparent"
            />
            Afficher uniquement les joueurs actifs
          </label>
        </div>
      </div>

      {/* Players Table */}
      <div className="overflow-hidden glass-panel">
        <div className="overflow-x-auto bg-black/10">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Joueur / Matricule</th>
                <th className="px-3 py-3 text-center font-medium">Elo FRBE</th>
                <th className="px-3 py-3 text-center font-medium">Titulaire</th>
                <th className="px-3 py-3 text-center font-medium">Parties</th>
                <th className="px-4 py-3 text-center font-bold text-indigo-400">Score</th>
                <th className="px-3 py-3 text-center font-medium">Perf. (TPR)</th>
                <th className="px-3 py-3 text-center font-medium">Diff.</th>
                <th className="px-4 py-3 font-medium">Divisions jouées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun joueur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p) => {
                  const hasPlayed = p.gamesPlayed > 0;
                  const isHot = hasPlayed && p.score / p.gamesPlayed >= 0.75; // le joueur est en forme si il a marqué au moins 75% de ses points sur les parties jouées
                  const diff = p.diff;
                  const isHovered = hoveredPlayerId === p.id;
                  const isExpanded = expandedPlayerId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`transition-colors ${
                          isHot
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : isExpanded
                            ? 'bg-indigo-500/10'
                            : 'hover:bg-white/5'
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
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5 group-hover:text-indigo-400 transition-colors">
                                {p.fullName}
                                {isHot && (
                                  <span title="Joueur très en forme !">
                                    <Flame className="h-4 w-4 text-amber-400 fill-amber-400/50 inline" />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span>Matr. {p.id}</span>
                              </div>
                            </div>

                            {hasPlayed && (
                              <button
                                type="button"
                                className="p-1 text-slate-500 group-hover:text-indigo-400 transition-colors"
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
                            <div className="absolute left-6 top-full z-40 mt-1 w-84 rounded-xl glass-panel p-4 shadow-2xl pointer-events-none">
                              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                                <div>
                                  <div className="font-bold text-sm text-slate-100">{p.fullName}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    Matr. {p.id} • {p.rating > 0 ? `${p.rating} Elo` : 'NC'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-indigo-400">
                                    {p.score} / {p.gamesPlayed} pt{p.score > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">TPR: {p.tpr}</div>
                                </div>
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Adversaires affrontés ({p.games.length})
                              </div>

                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                                {p.games.map((g, idx) => {
                                  const isWin = g.score === 1;
                                  const isDraw = g.score === 0.5;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 text-xs border border-white/5"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-200 truncate">
                                          <span
                                            title={g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border ${
                                              g.color === 'white'
                                                ? 'bg-white border-slate-300 shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                                                : 'bg-slate-950 border-slate-600'
                                            }`}
                                          />
                                          <span className="truncate">{g.opponentName}</span>
                                          {g.opponentRating > 0 && (
                                            <span className="text-[10px] text-slate-500 shrink-0">
                                              ({g.opponentRating} Elo)
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1.5">
                                          <span>Ronde {g.round}</span>
                                          <span className="text-white/20">•</span>
                                          <span>Div {g.division}</span>
                                          <span className="text-white/20">•</span>
                                          <span>Éch. {g.board}</span>
                                          <span className="text-white/20">•</span>
                                          <span>{g.isHome ? 'Dom.' : 'Ext.'}</span>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <span
                                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                            isWin
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                              : isDraw
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
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

                        <td className="px-3 py-3 text-center font-semibold text-slate-200">
                          {p.rating || 'NC'}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {p.titular ? (
                            <span className="inline-block rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-300 tracking-wide">
                              {p.titular}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-medium text-slate-300">
                          {p.gamesPlayed}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-indigo-400 text-base">
                          {p.score} <span className="text-xs text-slate-500 font-medium">/ {p.gamesPlayed}</span>
                        </td>

                        <td className="px-3 py-3 text-center">
                          {hasPlayed ? (
                            <span className="font-bold text-slate-200">{p.tpr}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {hasPlayed ? (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold ${
                                diff > 0
                                  ? 'text-emerald-400'
                                  : diff < 0
                                  ? 'text-rose-400'
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
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(p.divisionsPlayed).map(([divKey, count]) => (
                              <span
                                key={divKey}
                                className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
                              >
                                Div {divKey} ({count})
                              </span>
                            ))}
                            {Object.keys(p.divisionsPlayed).length === 0 && (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-row with Opponent details table */}
                      {isExpanded && hasPlayed && (
                        <tr className="bg-black/40 border-b border-white/5">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-inner">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/10 gap-4">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-100">
                                    Adversaires affrontés par {p.fullName} ({p.games.length} rencontre{p.games.length > 1 ? 's' : ''})
                                  </h4>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Matricule {p.id} • Elo officiel FRBE: {p.rating || 'NC'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold text-indigo-300">
                                    Score: {p.score} / {p.gamesPlayed} pts
                                  </span>
                                  <span className="rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                                    TPR: {p.tpr} Elo
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-white/5 text-[10px] uppercase font-bold text-slate-400 border-b border-white/5">
                                    <tr>
                                      <th className="px-4 py-2.5">Ronde / Division</th>
                                      <th className="px-4 py-2.5 text-center">Échiquier</th>
                                      <th className="px-4 py-2.5 text-center">Couleur</th>
                                      <th className="px-4 py-2.5">Joueur Adversaire</th>
                                      <th className="px-4 py-2.5 text-center">Elo Adversaire</th>
                                      <th className="px-4 py-2.5 text-center">Résultat</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {p.games.map((g, idx) => {
                                      const isWin = g.score === 1;
                                      const isDraw = g.score === 0.5;

                                      return (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                          <td className="px-4 py-3 font-medium text-slate-300">
                                            Ronde {g.round} • Div {g.division} ({g.isHome ? 'Domicile' : 'Extérieur'})
                                          </td>
                                          <td className="px-4 py-3 text-center font-bold text-slate-300">
                                            {g.board}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-white/5">
                                              <span
                                                className={`h-2.5 w-2.5 rounded-full border ${
                                                  g.color === 'white'
                                                    ? 'bg-white border-slate-300 shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                                                    : 'bg-slate-900 border-slate-700'
                                                }`}
                                              />
                                              {g.color === 'white' ? 'Blancs' : 'Noirs'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 font-semibold text-slate-200">
                                            {g.opponentName}
                                          </td>
                                          <td className="px-4 py-3 text-center text-slate-400">
                                            {g.opponentRating > 0 ? (
                                              <span className="font-semibold">{g.opponentRating} Elo</span>
                                            ) : (
                                              <span>NC</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span
                                              className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                                                isWin
                                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                  : isDraw
                                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
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

