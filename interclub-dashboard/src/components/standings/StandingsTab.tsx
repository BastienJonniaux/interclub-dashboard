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
        <h2 className="text-3xl font-bold font-serif text-[#1A1918] tracking-tight">
          Vue d'ensemble des Équipes — {clubName}
        </h2>
        <p className="text-sm text-[#6E6A64] mt-2 max-w-3xl leading-relaxed">
          Classement en direct de chaque équipe de votre club dans sa division respective.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {standings.map((divTable) => {
            const our = divTable.ourTeam;
            const rank = our?.rank || '-';
            const totalTeams = divTable.teams.length;
            const isLeader = rank === 1;

            return (
              <div
                key={`${divTable.division}${divTable.index}`}
                onClick={() => toggleExpand(`${divTable.division}${divTable.index}`)}
                className="group cursor-pointer chess-panel p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="chess-badge">
                      {divTable.divisionLabel}
                    </span>
                    <h3 className="mt-3 text-lg font-bold font-serif text-[#1A1918] group-hover:text-[#1E5E3A] transition-colors">
                      {our?.teamName || `Équipe ${divTable.divisionLabel}`}
                    </h3>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center font-mono font-bold text-base border ${
                      isLeader
                        ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                        : 'bg-[#F9F8F6] text-[#1A1918] border-[#E2DFD8]'
                    }`}
                  >
                    {isLeader ? <Award className="h-5 w-5 text-[#B45309]" /> : `${rank}`}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#E2DFD8] pt-3 text-center font-mono">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6E6A64] mb-0.5">Rang</div>
                    <div className="text-base font-bold text-[#1A1918]">
                      {rank} <span className="text-xs text-[#6E6A64] font-normal">/ {totalTeams}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6E6A64] mb-0.5">Pts Match</div>
                    <div className="text-base font-bold text-[#1A1918]">
                      {our?.matchPoints ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6E6A64] mb-0.5">Pts Échiq.</div>
                    <div className="text-base font-bold text-[#1A1918]">
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
      <div className="space-y-4 pt-8 border-t border-[#E2DFD8]">
        <h3 className="text-2xl font-bold font-serif text-[#1A1918] tracking-tight">
          Détail des Divisions
        </h3>

        {standings.map((divTable) => {
          const key = `${divTable.division}${divTable.index}`;
          const isExpanded = expandedDiv === key;

          return (
            <div
              key={key}
              id={`details-${key}`}
              className="chess-panel p-0 overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between p-4 text-left bg-white hover:bg-[#F9F8F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A1918]"
              >
                <div className="flex items-center gap-4">
                  <span className="chess-badge">
                    {divTable.divisionLabel}
                  </span>
                  <span className="text-base font-bold text-[#1A1918]">{divTable.ourTeam?.teamName || divTable.divisionLabel}</span>
                  <span className="text-sm text-[#6E6A64]">
                    ({divTable.teams.length} équipes)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-[#1A1918]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-[#6E6A64]" />
                )}
              </button>

              {isExpanded && (
                <div className="overflow-x-auto border-t border-[#E2DFD8] bg-white">
                  <table className="w-full text-left text-sm text-[#1A1918]">
                    <thead className="bg-[#F9F8F6] text-[10px] uppercase tracking-wider font-semibold text-[#6E6A64] border-b border-[#E2DFD8]">
                      <tr>
                        <th className="px-4 py-2 text-center border-r border-[#E2DFD8]">Rang</th>
                        <th className="px-4 py-2 border-r border-[#E2DFD8]">Équipe</th>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8]" title="Joués">J</th>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8]" title="Gagnés">G</th>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8]" title="Nuls">N</th>
                        <th className="px-3 py-2 text-center border-r border-[#E2DFD8]" title="Perdus">P</th>
                        <th className="px-4 py-2 text-center font-bold text-[#1A1918] border-r border-[#E2DFD8]">
                          Pts Match
                        </th>
                        <th className="px-4 py-2 text-center font-bold text-[#1A1918]">Pts Échiq.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD8]">
                      {divTable.teams.map((t) => {
                        const isOur = t.isOurClub;
                        return (
                          <tr
                            key={t.pairingNumber}
                            className={`transition-colors ${
                              isOur
                                ? 'bg-[#1E5E3A]/5 font-bold'
                                : 'hover:bg-[#F9F8F6]'
                            }`}
                          >
                            <td className="px-4 py-2.5 text-center border-r border-[#E2DFD8] font-mono">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center font-bold text-xs border ${
                                  t.rank === 1
                                    ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                                    : t.rank === 2
                                    ? 'bg-[#F9F8F6] text-[#1A1918] border-[#E2DFD8]'
                                    : t.rank === 3
                                    ? 'bg-[#F9F8F6] text-[#6E6A64] border-[#E2DFD8]'
                                    : 'bg-transparent text-[#6E6A64] border-transparent'
                                }`}
                              >
                                {t.rank}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-[#E2DFD8]">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm ${isOur ? 'font-bold text-[#1E5E3A]' : 'font-medium'}`}>{t.teamName}</span>
                                {isOur && (
                                  <span className="bg-[#1E5E3A] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                    Notre Équipe
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-[#E2DFD8] text-[#6E6A64] font-mono">{t.played}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-[#1E5E3A] border-r border-[#E2DFD8] font-mono">{t.won}</td>
                            <td className="px-3 py-2.5 text-center border-r border-[#E2DFD8] text-[#6E6A64] font-mono">{t.drawn}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-[#B91C1C] border-r border-[#E2DFD8] font-mono">{t.lost}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-[#1A1918] border-r border-[#E2DFD8] font-mono">
                              {t.matchPoints}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-[#1A1918] font-mono">
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

