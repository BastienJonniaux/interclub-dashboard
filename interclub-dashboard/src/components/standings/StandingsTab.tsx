import React, { useState } from 'react';
import { DivisionStandingTable } from '../../domain/standings';
import { LatestTeamMatch } from '../../domain/matches';
import { LatestMatchesSection } from './LatestMatchesSection';
import { Trophy, ChevronDown, ChevronUp, Award } from 'lucide-react';

interface Props {
  standings: DivisionStandingTable[];
  clubName: string;
  latestMatches?: LatestTeamMatch[];
}

export const StandingsTab: React.FC<Props> = ({ standings, clubName, latestMatches }) => {
  const [expandedDiv, setExpandedDiv] = useState<string | null>(null);

  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <Trophy className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-800">
          Aucun classement disponible
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Les résultats de la première ronde ne sont pas encore publiés ou aucune équipe n'est trouvée.
        </p>
      </div>
    );
  }

  const toggleExpand = (key: string) => {
    setExpandedDiv(expandedDiv === key ? null : key);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Vue d'ensemble des Équipes — {clubName}
        </h2>
        <p className="text-sm text-slate-500">
          Classement en direct de chaque équipe de votre club dans sa division respective.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {standings.map((divTable) => {
            const our = divTable.ourTeam;
            const rank = our?.rank || '-';
            const totalTeams = divTable.teams.length;
            const isLeader = rank === 1;

            return (
              <div
                key={`${divTable.division}${divTable.index}`}
                onClick={() => toggleExpand(`${divTable.division}${divTable.index}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {divTable.divisionLabel}
                    </span>
                    <h3 className="mt-1 font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {our?.teamName || `Équipe ${divTable.divisionLabel}`}
                    </h3>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                      isLeader
                        ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-xs'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isLeader ? <Award className="h-5 w-5 text-amber-600" /> : `${rank}e`}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <div className="text-xs text-slate-400">Rang</div>
                    <div className="text-sm font-bold text-slate-800">
                      {rank} / {totalTeams}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Pts Match</div>
                    <div className="text-sm font-bold text-indigo-600">
                      {our?.matchPoints ?? 0} pts
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Pts Échiq.</div>
                    <div className="text-sm font-bold text-slate-800">
                      {our?.boardPoints ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latest Matches and Board-by-board Results */}
      {latestMatches && latestMatches.length > 0 && (
        <LatestMatchesSection matches={latestMatches} clubName={clubName} />
      )}

      {/* Detailed Division Tables Accordion */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-slate-900">
          Détail des Divisions
        </h3>

        {standings.map((divTable) => {
          const key = `${divTable.division}${divTable.index}`;
          const isExpanded = expandedDiv === key;

          return (
            <div
              key={key}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                    {divTable.divisionLabel}
                  </span>
                  <span>{divTable.ourTeam?.teamName || divTable.divisionLabel}</span>
                  <span className="text-xs text-slate-400">
                    ({divTable.teams.length} équipes)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-center">Rang</th>
                        <th className="px-4 py-3">Équipe</th>
                        <th className="px-3 py-3 text-center">J</th>
                        <th className="px-3 py-3 text-center">G</th>
                        <th className="px-3 py-3 text-center">N</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-4 py-3 text-center font-bold text-indigo-700">
                          Pts Match
                        </th>
                        <th className="px-4 py-3 text-center">Pts Échiq.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {divTable.teams.map((t) => {
                        const isOur = t.isOurClub;
                        return (
                          <tr
                            key={t.pairingNumber}
                            className={`transition ${
                              isOur
                                ? 'bg-indigo-50/70 font-semibold text-indigo-950'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  t.rank === 1
                                    ? 'bg-amber-100 text-amber-800'
                                    : t.rank === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : t.rank === 3
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {t.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{t.teamName}</span>
                                {isOur && (
                                  <span className="rounded-sm bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                    Notre Équipe
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">{t.played}</td>
                            <td className="px-3 py-3 text-center text-emerald-600 font-medium">{t.won}</td>
                            <td className="px-3 py-3 text-center text-slate-500">{t.drawn}</td>
                            <td className="px-3 py-3 text-center text-rose-500">{t.lost}</td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-700 text-base">
                              {t.matchPoints}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">
                              {t.boardPoints}
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

