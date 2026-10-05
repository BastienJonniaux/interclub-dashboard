import React from 'react';
import { NextMatchScout, ReadinessColor } from '../../domain/scouting';
import {
  Compass,
  Home,
  Plane,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react';

interface Props {
  scouting: NextMatchScout[];
  clubName: string;
}

export const ScoutingTab: React.FC<Props> = ({ scouting, clubName }) => {
  if (scouting.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <Compass className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-800">
          Aucun match à préparer
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Le calendrier des prochaines rondes est en cours de chargement ou indisponible.
        </p>
      </div>
    );
  }

  const getBadge = (color: ReadinessColor, reason: string) => {
    switch (color) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {reason}
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            {reason}
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200 animate-pulse">
            <AlertCircle className="h-3.5 w-3.5" />
            {reason}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1918] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2DFD8]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-white tracking-tight">
            Scouting & Prochains Matchs — {clubName}
          </h2>
          <p className="text-sm text-[#E2DFD8] mt-2 max-w-3xl leading-relaxed">
            Analyse des adversaires de la prochaine ronde, comparaison des forces et détection des besoins en renforts.
          </p>
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <div className="bg-white/10 border border-white/20 px-3 py-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E5E3A]"></span>
            <span className="text-xs font-mono font-bold tracking-widest uppercase">SYSTÈME ACTIF</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {scouting.map((scout, idx) => {
          return (
            <div
              key={idx}
              className="flex flex-col justify-between chess-panel p-6"
            >
              <div>
                {/* Header with Team & Readiness status */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2DFD8]">
                  <div>
                    <span className="chess-badge mb-2">
                      {scout.divisionLabel} • Ronde {scout.roundNumber}
                    </span>
                    <h3 className="text-xl font-bold font-serif text-[#1A1918]">
                      {scout.ourTeamName}
                    </h3>
                  </div>
                  <div className="shrink-0">{getBadge(scout.readiness, scout.readinessReason)}</div>
                </div>

                {/* Matchup Banner */}
                <div className="mt-5 bg-[#F9F8F6] p-5 border border-[#E2DFD8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#6E6A64] uppercase font-bold tracking-wider">
                        Adversaire prévu
                      </span>
                      <div className="font-bold font-serif text-[#1A1918] text-lg mt-0.5">
                        {scout.opponentTeamName}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6E6A64] font-medium">
                        {scout.isHome ? (
                          <>
                            <Home className="h-4 w-4 text-[#1E5E3A]" />
                            <span>À Domicile</span>
                          </>
                        ) : (
                          <>
                            <Plane className="h-4 w-4" />
                            <span>En Déplacement (Extérieur)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#6E6A64] uppercase font-bold tracking-wider">Échiquiers</span>
                      <div className="text-lg font-bold font-mono text-[#1A1918] mt-0.5">
                        {scout.boardCount}
                      </div>
                    </div>
                  </div>

                  {/* Team Average Elo Comparison */}
                  <div className="mt-4 pt-4 border-t border-[#E2DFD8] grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-2.5 border border-[#E2DFD8]">
                      <div className="text-[10px] text-[#6E6A64] font-bold uppercase tracking-wider mb-1">Notre Moy.</div>
                      <div className="text-sm font-bold font-mono text-[#1A1918]">
                        {scout.ourAverageElo > 0 ? `${scout.ourAverageElo}` : 'N/C'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 border border-[#E2DFD8]">
                      <div className="text-[10px] text-[#6E6A64] font-bold uppercase tracking-wider mb-1">Moy. Adv.</div>
                      <div className="text-sm font-bold font-mono text-[#1A1918]">
                        {scout.opponentAverageElo > 0 ? `${scout.opponentAverageElo}` : 'N/C'}
                      </div>
                    </div>
                    <div className="bg-[#1A1918] text-white p-2.5 border border-[#1A1918]">
                      <div className="text-[10px] text-[#E2DFD8] font-bold uppercase tracking-wider mb-1">Écart</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          scout.eloDiff >= 50
                            ? 'text-[#4ade80]'
                            : scout.eloDiff <= -50
                            ? 'text-[#f87171]'
                            : 'text-[#fbbf24]'
                        }`}
                      >
                        {scout.eloDiff > 0 ? `+${scout.eloDiff}` : scout.eloDiff}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Board-by-board tendencies */}
                <div className="mt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A64] mb-2">
                    Composition probable de l'adversaire
                  </h4>
                  <div className="border border-[#E2DFD8] bg-white overflow-hidden">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-[#E2DFD8]">
                        {scout.boardsScouting.map((b) => {
                          const tooltip =
                            b.playersSeen.length > 0
                              ? b.playersSeen
                                  .map(
                                    (p) =>
                                      `${p.name} (${p.rating > 0 ? `${p.rating} Elo` : 'NC'}) - Vu ${
                                        p.count
                                      }x`
                                  )
                                  .join('\n')
                              : undefined;

                          return (
                            <tr
                              key={b.board}
                              title={tooltip}
                              className="hover:bg-[#F9F8F6] transition-colors h-[38px] text-[13px]"
                            >
                              <td className="px-3 py-1.5 w-8 text-center border-r border-[#E2DFD8] bg-[#F9F8F6]">
                                <span className="font-bold text-[#1A1918] font-mono text-xs">
                                  {b.board}
                                </span>
                              </td>
                              <td className="px-3 py-1.5">
                                {b.isRotation ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#6E6A64] italic">
                                      Rotation ({b.playersSeen.length} j.)
                                    </span>
                                    {b.averageBoardElo > 0 && (
                                      <span className="font-mono text-[10px] text-[#6E6A64]">
                                        ~{b.averageBoardElo}
                                      </span>
                                    )}
                                  </div>
                                ) : b.frequentPlayer ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold text-[#1A1918] truncate max-w-[150px]">
                                      {b.frequentPlayer.name}
                                    </span>
                                    {b.frequentPlayer.rating > 0 && (
                                      <span className="font-mono text-[10px] text-[#6E6A64]">
                                        {b.frequentPlayer.rating}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[#6E6A64] italic">
                                    Non identifié
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action advice */}
              <div className="mt-6 border-t border-[#E2DFD8] pt-4">
                <div className="flex items-center justify-between text-[13px] text-[#1A1918] bg-[#F9F8F6] p-3 border border-[#E2DFD8]">
                  <span>
                    <strong>CONSEIL DIRECTEUR :</strong>{' '}
                    <span>
                      {scout.readiness === 'red'
                        ? 'Aligner des titulaires solides pour éviter la défaite.'
                        : scout.readiness === 'green'
                        ? 'Équipe favorite, possibilité de faire tourner les réservistes.'
                        : 'Match serré, composition type recommandée.'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

