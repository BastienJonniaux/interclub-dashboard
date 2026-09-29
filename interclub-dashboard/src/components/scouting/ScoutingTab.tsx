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
        <h2 className="text-xl font-bold text-slate-900">
          Scouting & Prochains Matchs — {clubName}
        </h2>
        <p className="text-sm text-slate-500">
          Analyse des adversaires de la prochaine ronde, comparaison des forces et détection des besoins en renforts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {scouting.map((scout, idx) => {
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition"
            >
              <div>
                {/* Header with Team & Readiness status */}
                <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {scout.divisionLabel} • Ronde {scout.roundNumber}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {scout.ourTeamName}
                    </h3>
                  </div>
                  <div>{getBadge(scout.readiness, scout.readinessReason)}</div>
                </div>

                {/* Matchup Banner */}
                <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">
                        Adversaire prévu
                      </span>
                      <div className="font-bold text-slate-900 text-base">
                        {scout.opponentTeamName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        {scout.isHome ? (
                          <>
                            <Home className="h-3.5 w-3.5 text-emerald-600" />
                            <span>À Domicile</span>
                          </>
                        ) : (
                          <>
                            <Plane className="h-3.5 w-3.5 text-blue-600" />
                            <span>En Déplacement (Extérieur)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400">Échiquiers</span>
                      <div className="text-base font-bold text-indigo-600">
                        {scout.boardCount} échiquiers
                      </div>
                    </div>
                  </div>
                </div>

                {/* Board-by-board tendencies */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Composition probable de l'adversaire (Tendances)
                  </h4>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                    {scout.boardsScouting.map((b) => (
                      <div
                        key={b.board}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-600">
                            {b.board}
                          </span>
                          {b.frequentPlayer ? (
                            <span className="font-semibold text-slate-800">
                              Matr. {b.frequentPlayer.id}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              Joueur non encore identifié
                            </span>
                          )}
                        </div>

                        <div>
                          {b.frequentPlayer ? (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Vu {b.frequentPlayer.timesPlayed}x à cet échiquier
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action advice */}
              <div className="mt-5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Directeur :{' '}
                    <strong className="text-slate-800">
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

