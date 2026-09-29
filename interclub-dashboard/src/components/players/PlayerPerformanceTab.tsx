import React, { useState, useMemo } from 'react';
import { PlayerStats } from '../../domain/performance';
import { Search, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  players: PlayerStats[];
  clubName: string;
}

export const PlayerPerformanceTab: React.FC<Props> = ({ players, clubName }) => {
  const [search, setSearch] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

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

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition ${
                        isHot ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {p.fullName}
                              {isHot && (
                                <span title="Joueur très en forme !">
                                  <Flame className="h-4 w-4 text-amber-500 fill-amber-500 inline" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              Matr. {p.id}
                            </div>
                          </div>
                        </div>
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

