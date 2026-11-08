import React, { useState, useEffect, useMemo } from 'react';
import { NextMatchScout, ReadinessColor } from '../../domain/scouting';
import { ROUND_DATES } from '../../season';
import { getFrenchClash, formatDateFrench } from '../../domain/calendar';
import { PlayerHoverCard } from '../common/PlayerHoverCard';
import {
  Compass,
  Home,
  Plane,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  scouting: NextMatchScout[];
  clubName: string;
  selectedRoundNumber?: number;
  onSelectRoundNumber?: (round: number) => void;
  getScoutingForRound?: (round: number) => NextMatchScout[];
}

export const ScoutingTab: React.FC<Props> = ({
  scouting,
  clubName,
  selectedRoundNumber,
  onSelectRoundNumber,
  getScoutingForRound,
}) => {
  // Determine default round from provided scouting or prop
  const defaultRound = selectedRoundNumber || (scouting.length > 0 ? scouting[0].roundNumber : 1);
  const [activeRound, setActiveRound] = useState<number>(defaultRound);

  useEffect(() => {
    if (selectedRoundNumber) {
      setActiveRound(selectedRoundNumber);
    }
  }, [selectedRoundNumber]);

  const handleRoundChange = (r: number) => {
    setActiveRound(r);
    if (onSelectRoundNumber) {
      onSelectRoundNumber(r);
    }
  };

  // Determine displayed scouts for the active round
  const displayedScouts = useMemo(() => {
    if (getScoutingForRound) {
      const customScouts = getScoutingForRound(activeRound);
      if (customScouts.length > 0) return customScouts;
    }
    // Fallback: if active round matches default scouting
    if (scouting.length > 0 && scouting[0].roundNumber === activeRound) {
      return scouting;
    }
    return scouting;
  }, [getScoutingForRound, activeRound, scouting]);

  const activeRoundDateStr = ROUND_DATES[activeRound - 1] || '2026-10-11';
  const activeFrenchClash = getFrenchClash(activeRoundDateStr);
  const { full: activeFormattedDate } = formatDateFrench(activeRoundDateStr);

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
      {/* Header and Round Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Scouting & Préparation des Matchs — {clubName}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Analyse des forces adverses par ronde, détection des besoins en renforts et anticipation des absences.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <div className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase text-slate-700">
              Ronde {activeRound} • {activeFormattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Round Selector Bar (R1 to R11) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
          <Calendar className="h-4 w-4 text-emerald-700" />
          <span>Sélectionner une ronde :</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {ROUND_DATES.map((dateStr, idx) => {
            const rNum = idx + 1;
            const isSelected = activeRound === rNum;
            const clash = getFrenchClash(dateStr);

            return (
              <button
                key={rNum}
                onClick={() => handleRoundChange(rNum)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
                title={`Ronde ${rNum} (${dateStr})${clash.hasClash ? ' — ⚠️ Conflit France !' : ''}`}
              >
                <span>R{rNum}</span>
                {clash.hasClash && (
                  <span
                    className={`ml-1 text-[10px] font-bold ${
                      isSelected ? 'text-amber-300' : 'text-amber-600'
                    }`}
                  >
                    ⚠️
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* French Conflict Warning Banner if active round clashes */}
      {activeFrenchClash.hasClash && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-5 text-xs text-amber-950 flex items-start gap-3.5 shadow-xs animate-in fade-in duration-150">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-800 border border-amber-300 shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <div className="font-bold text-sm text-amber-900 flex items-center gap-2 flex-wrap">
              <span>Alerte Conflit Calendrier France (Ronde {activeFrenchClash.frenchRound} FFE N1–N4)</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                {activeFormattedDate}
              </span>
            </div>
            <p className="mt-1 text-amber-800 leading-relaxed">
              La <strong>Ronde {activeRound}</strong> se joue le même jour que les interclubs français. Vos joueurs affiliés en France risquent de prioriser leur club français. Prévoyez des remplaçants pour combler d'éventuelles absences !
            </p>
          </div>
        </div>
      )}

      {/* Matchups Scouting Cards */}
      {displayedScouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white shadow-xs">
          <Compass className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-900 tracking-tight">
            Aucun match à préparer pour la Ronde {activeRound}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Le calendrier ou les données de cette ronde sont en cours de chargement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {displayedScouts.map((scout, idx) => {
            const isBye = scout.opponentTeamName.toUpperCase().includes('BYE');
            return (
              <div
                key={idx}
                className="flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl shadow-xs p-5 sm:p-6"
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
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Moyenne Elo
                          </span>
                          <div className="font-bold text-slate-900 text-lg font-mono tabular-nums mt-0.5">
                            {scout.opponentAverageElo > 0 ? scout.opponentAverageElo : 'NC'}
                          </div>
                          {scout.ourAverageElo > 0 && scout.opponentAverageElo > 0 && (
                            <span
                              className={`text-[11px] font-mono font-bold ${
                                scout.eloDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {scout.eloDiff > 0 ? `+${scout.eloDiff}` : scout.eloDiff} Elo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Board Scouting Breakdown */}
                  {!isBye && scout.boardsScouting.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Composition adverse probable ({scout.boardCount} échiquiers)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Basé sur {scout.pastRoundsCount} ronde(s) jouée(s)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {scout.boardsScouting.map((b) => (
                          <div
                            key={b.board}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-500 w-5">
                                #{b.board}
                              </span>
                              {b.frequentPlayer ? (
                                <div>
                                  <PlayerHoverCard
                                    playerName={b.frequentPlayer.name}
                                    expectedElo={b.frequentPlayer.rating}
                                  >
                                    <span className="font-semibold text-slate-900 hover:underline cursor-pointer">
                                      {b.frequentPlayer.name}
                                    </span>
                                  </PlayerHoverCard>
                                  <span className="text-[10px] text-slate-500 font-mono ml-2">
                                    {b.frequentPlayer.percentage}% des matchs ({b.frequentPlayer.timesPlayed}x)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Joueur variable / Rotation</span>
                              )}
                            </div>

                            <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                              {b.averageBoardElo > 0 ? `${b.averageBoardElo} Elo` : 'NC'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
