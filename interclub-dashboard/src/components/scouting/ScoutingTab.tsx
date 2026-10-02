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
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Scouting & Prochains Matchs — {clubName}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Analyse des adversaires de la prochaine ronde, comparaison des forces et détection des besoins en renforts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {scouting.map((scout, idx) => {
          return (
            <div
              key={idx}
              className="flex flex-col justify-between glass-panel p-6"
            >
              <div>
                {/* Header with Team & Readiness status */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/20">
                      {scout.divisionLabel} • Ronde {scout.roundNumber}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-100">
                      {scout.ourTeamName}
                    </h3>
                  </div>
                  <div className="shrink-0">{getBadge(scout.readiness, scout.readinessReason)}</div>
                </div>

                {/* Matchup Banner */}
                <div className="mt-5 rounded-xl bg-black/20 p-5 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Adversaire prévu
                      </span>
                      <div className="font-bold text-slate-200 text-lg mt-0.5">
                        {scout.opponentTeamName}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        {scout.isHome ? (
                          <>
                            <Home className="h-4 w-4 text-emerald-400" />
                            <span>À Domicile</span>
                          </>
                        ) : (
                          <>
                            <Plane className="h-4 w-4 text-blue-400" />
                            <span>En Déplacement (Extérieur)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Échiquiers</span>
                      <div className="text-lg font-bold text-indigo-400 mt-0.5">
                        {scout.boardCount}
                      </div>
                    </div>
                  </div>

                  {/* Team Average Elo Comparison */}
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 backdrop-blur-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Notre Moy.</div>
                      <div className="text-sm font-bold text-slate-200">
                        {scout.ourAverageElo > 0 ? `${scout.ourAverageElo} Elo` : 'N/C'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 backdrop-blur-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Moy. Adv.</div>
                      <div className="text-sm font-bold text-slate-200">
                        {scout.opponentAverageElo > 0 ? `${scout.opponentAverageElo} Elo` : 'N/C'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 backdrop-blur-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Écart Théo.</div>
                      <div
                        className={`text-sm font-bold ${
                          scout.eloDiff >= 50
                            ? 'text-emerald-400'
                            : scout.eloDiff <= -50
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {scout.eloDiff > 0 ? `+${scout.eloDiff}` : scout.eloDiff}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Board-by-board tendencies */}
                <div className="mt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Composition probable de l'adversaire (Tendances)
                  </h4>
                  <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
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
                        <div
                          key={b.board}
                          title={tooltip}
                          className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 font-bold text-slate-300 border border-white/5">
                              {b.board}
                            </span>

                            {b.isRotation ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-300 italic">
                                  Rotation de joueurs
                                </span>
                                {b.averageBoardElo > 0 && (
                                  <span className="rounded-md bg-white/10 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                    Moy. ~{b.averageBoardElo}
                                  </span>
                                )}
                              </div>
                            ) : b.frequentPlayer ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">
                                  {b.frequentPlayer.name}
                                </span>
                                {b.frequentPlayer.rating > 0 && (
                                  <span className="rounded-md bg-indigo-500/20 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                    {b.frequentPlayer.rating} Elo
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">
                                Joueur non encore identifié
                              </span>
                            )}
                          </div>

                          <div>
                            {b.isRotation ? (
                              <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-300">
                                {b.playersSeen.length} joueurs différents
                              </span>
                            ) : b.frequentPlayer ? (
                              <span className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[10px] font-medium text-slate-400">
                                Vu {b.frequentPlayer.timesPlayed}x à cet échiquier
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action advice */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Directeur :{' '}
                    <strong className="text-slate-200">
                      {scout.readiness === 'red'
                        ? 'Aligner des titulaires solides pour éviter la défaite.'
                        : scout.readiness === 'green'
                        ? 'Équipe favorite, possibilité de faire tourner les réservistes.'
                        : 'Match serré, composition type recommandée.'}
                    </strong>
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

