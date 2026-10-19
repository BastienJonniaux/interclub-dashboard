import React from 'react';
import { NextMatchScout, ReadinessColor } from '../../domain/scouting';
import { PlayerHoverCard } from '../common/PlayerHoverCard';
import {
  Compass,
  Home,
  Plane,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  scouting: NextMatchScout[];
  clubName: string;
}

export const ScoutingTab: React.FC<Props> = ({ scouting, clubName }) => {
  if (scouting.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white shadow-xs">
        <Compass className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-900 tracking-tight">
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
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {reason}
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 shadow-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            {reason}
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200 shadow-xs">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            {reason}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Scouting & Prochains Matchs — {clubName}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Analyse des adversaires de la prochaine ronde, comparaison des forces et détection des besoins en renforts.
          </p>
        </div>
        <div className="shrink-0">
          <div className="bg-white border border-slate-200/70 rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-700">Système Actif</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {scouting.map((scout, idx) => {
          const isBye = scout.opponentTeamName.toUpperCase().includes('BYE');
          return (
            <div
              key={idx}
              className="flex flex-col justify-between bg-white border border-slate-200/70 rounded-xl shadow-sm p-5 sm:p-6"
            >
              <div>
                {/* Header with Team & Readiness status */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-mono font-bold border border-slate-200/80 rounded-md mb-2">
                      {scout.divisionLabel} • Ronde {scout.roundNumber}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                      {scout.ourTeamName}
                    </h3>
                  </div>
                  {!isBye && (
                    <div className="shrink-0">{getBadge(scout.readiness, scout.readinessReason)}</div>
                  )}
                </div>

                {/* Matchup Banner */}
                <div className="mt-5 bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Adversaire prévu
                      </span>
                      <div className="font-bold text-slate-900 text-lg mt-0.5 tracking-tight">
                        {scout.opponentTeamName}
                      </div>
                      {!isBye && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          {scout.isHome ? (
                            <>
                              <Home className="h-4 w-4 text-emerald-600" />
                              <span>À Domicile</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-4 w-4 text-slate-500" />
                              <span>En Déplacement (Extérieur)</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {!isBye && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Échiquiers</span>
                        <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {scout.boardCount}
                        </div>
                      </div>
                    )}
                  </div>

                  {isBye ? (
                    <div className="mt-5 pt-4 border-t border-slate-200/70 text-center">
                      <div className="text-xs sm:text-sm text-slate-500 font-medium">
                        L'équipe est exempte (BYE) pour cette ronde. Aucun joueur ne doit être aligné et aucune préparation n'est nécessaire.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-200/70 grid grid-cols-3 gap-3 text-center font-mono tabular-nums">
                      <div className="bg-white p-2.5 border border-slate-200/70 rounded-xl shadow-xs">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Notre Moy.</div>
                        <div className="text-sm font-bold text-slate-900">
                          {scout.ourAverageElo > 0 ? `${scout.ourAverageElo}` : 'N/C'}
                        </div>
                      </div>
                      <div className="bg-white p-2.5 border border-slate-200/70 rounded-xl shadow-xs">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Moy. Adv.</div>
                        <div className="text-sm font-bold text-slate-900">
                          {scout.opponentAverageElo > 0 ? `${scout.opponentAverageElo}` : 'N/C'}
                        </div>
                      </div>
                      <div className="bg-white p-2.5 border border-slate-200/70 rounded-xl shadow-xs">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Écart</div>
                        <div
                          className={`text-sm font-bold ${
                            scout.eloDiff >= 50
                              ? 'text-emerald-700'
                              : scout.eloDiff <= -50
                              ? 'text-rose-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {scout.eloDiff > 0 ? `+${scout.eloDiff}` : scout.eloDiff}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isBye && (
                  <div className="mt-5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Composition probable de l'adversaire
                    </h4>
                    <div className="border border-slate-200/70 bg-white rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
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
                                className="hover:bg-slate-50/80 transition-colors h-[38px] text-[13px]"
                              >
                                <td className="px-3 py-1.5 w-10 text-center border-r border-slate-100 bg-slate-50 font-mono tabular-nums">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {b.board}
                                  </span>
                                </td>
                                <td className="px-3.5 py-1.5">
                                  {b.isRotation ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-500 italic text-xs">
                                        Rotation ({b.playersSeen.length} joueurs)
                                      </span>
                                      {b.averageBoardElo > 0 && (
                                        <span className="font-mono tabular-nums text-[11px] text-slate-600 bg-slate-100 px-1 rounded">
                                          ~{b.averageBoardElo}
                                        </span>
                                      )}
                                    </div>
                                  ) : b.frequentPlayer ? (
                                    <div className="flex items-center justify-between w-full">
                                      <PlayerHoverCard playerName={b.frequentPlayer.name} expectedElo={b.frequentPlayer.rating}>
                                        <span className="font-semibold text-slate-800 truncate max-w-[170px] inline-block hover:underline underline-offset-2 cursor-pointer">
                                          {b.frequentPlayer.name}
                                        </span>
                                      </PlayerHoverCard>
                                      {b.frequentPlayer.rating > 0 && (
                                        <span className="font-mono tabular-nums text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                          {b.frequentPlayer.rating}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">
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
                )}
              </div>

              {/* Action advice */}
              {!isBye && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="text-xs sm:text-sm text-slate-800 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 shadow-xs">
                    <strong className="text-slate-900 font-bold uppercase tracking-wider text-[11px] font-mono mr-1.5">Conseil Directeur :</strong>
                    <span className="text-slate-600">
                      {scout.readiness === 'red'
                        ? 'Aligner des titulaires solides pour sécuriser les points.'
                        : scout.readiness === 'green'
                        ? 'Équipe favorite, possibilité de faire tourner les réservistes.'
                        : 'Match serré, composition type recommandée.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
