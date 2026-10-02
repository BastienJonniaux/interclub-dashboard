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
    const willExpand = expandedDiv !== key;
    setExpandedDiv(willExpand ? key : null);
    
    if (willExpand) {
      setTimeout(() => {
        const el = document.getElementById(`details-${key}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100); // small delay to allow DOM render
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Summary Cards */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Vue d'ensemble des Équipes — {clubName}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Classement en direct de chaque équipe de votre club dans sa division respective.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 isometric-grid">
          {standings.map((divTable, idx) => {
            const our = divTable.ourTeam;
            const rank = our?.rank || '-';
            const totalTeams = divTable.teams.length;
            const isLeader = rank === 1;

            return (
              <div
                key={`${divTable.division}${divTable.index}`}
                onClick={() => toggleExpand(`${divTable.division}${divTable.index}`)}
                className="group cursor-pointer glass-panel p-5 hover:border-indigo-400/50"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
                      {divTable.divisionLabel}
                    </span>
                    <h3 className="mt-2 font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {our?.teamName || `Équipe ${divTable.divisionLabel}`}
                    </h3>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm transition-all duration-300 ${
                      isLeader
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-white/5 text-slate-300 border border-white/10 group-hover:bg-white/10'
                    }`}
                  >
                    {isLeader ? <Award className="h-5 w-5 text-amber-400" /> : `${rank}e`}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Rang</div>
                    <div className="text-sm font-bold text-slate-200">
                      {rank} / {totalTeams}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Pts Match</div>
                    <div className="text-sm font-bold text-indigo-400">
                      {our?.matchPoints ?? 0} pts
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Pts Échiq.</div>
                    <div className="text-sm font-bold text-slate-200">
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
        <h3 className="text-xl font-bold text-slate-100 tracking-tight">
          Détail des Divisions
        </h3>

        {standings.map((divTable) => {
          const key = `${divTable.division}${divTable.index}`;
          const isExpanded = expandedDiv === key;

          return (
            <div
              key={key}
              id={`details-${key}`}
              className="overflow-hidden glass-panel"
            >
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-100 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300">
                    {divTable.divisionLabel}
                  </span>
                  <span>{divTable.ourTeam?.teamName || divTable.divisionLabel}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({divTable.teams.length} équipes)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-indigo-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="overflow-x-auto border-t border-white/10 bg-black/20">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-center font-medium">Rang</th>
                        <th className="px-4 py-3 font-medium">Équipe</th>
                        <th className="px-3 py-3 text-center font-medium">J</th>
                        <th className="px-3 py-3 text-center font-medium">G</th>
                        <th className="px-3 py-3 text-center font-medium">N</th>
                        <th className="px-3 py-3 text-center font-medium">P</th>
                        <th className="px-4 py-3 text-center font-bold text-indigo-400">
                          Pts Match
                        </th>
                        <th className="px-4 py-3 text-center font-medium">Pts Échiq.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {divTable.teams.map((t) => {
                        const isOur = t.isOurClub;
                        return (
                          <tr
                            key={t.pairingNumber}
                            className={`transition-colors ${
                              isOur
                                ? 'bg-indigo-500/10 font-semibold text-indigo-100'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  t.rank === 1
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                    : t.rank === 2
                                    ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                                    : t.rank === 3
                                    ? 'bg-amber-700/30 text-amber-500 border border-amber-700/30'
                                    : 'text-slate-400'
                                }`}
                              >
                                {t.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{t.teamName}</span>
                                {isOur && (
                                  <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                                    Notre Équipe
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-slate-400">{t.played}</td>
                            <td className="px-3 py-3 text-center text-emerald-400 font-medium">{t.won}</td>
                            <td className="px-3 py-3 text-center text-slate-400">{t.drawn}</td>
                            <td className="px-3 py-3 text-center text-rose-400">{t.lost}</td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-400 text-base">
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

