import React, { useState } from 'react';
import { PlayerFrbe, TeamFrbe } from '../../modelsFRBE';
import { useSimulator, AvailabilityStatus } from '../../context/SimulatorContext';
import {
  validateTeamComposition,
  AssignedBoard,
} from '../../domain/rules/frbeValidator';
import { getBoardCountForDivision } from '../../domain/scouting';
import {
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';

interface Props {
  players: PlayerFrbe[];
  teams: TeamFrbe[];
  clubName: string;
}

export const SimulatorTab: React.FC<Props> = ({ players, teams, clubName }) => {
  const {
    availability,
    setPlayerAvailability,
    draftCompositions,
    assignPlayerToBoard,
    clearDraft,
  } = useSimulator();

  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const activeTeam = teams[selectedTeamIndex] || teams[0];
  const teamNumber = selectedTeamIndex + 1;
  const boardCount = activeTeam ? getBoardCountForDivision(activeTeam.division) : 6;

  // Build assigned boards
  const currentDraft = draftCompositions[teamNumber] || {};
  const assignedBoards: AssignedBoard[] = [];
  for (let b = 1; b <= boardCount; b++) {
    const playerId = currentDraft[b];
    const player = playerId ? players.find((p) => p.idnumber === playerId) || null : null;
    assignedBoards.push({ board: b, player });
  }

  // Validate composition
  const validation = validateTeamComposition(
    teamNumber,
    activeTeam?.division || 3,
    assignedBoards
  );

  // Available players (excluding players already assigned to this team on another board)
  const currentlyAssignedIds = new Set(
    Object.values(currentDraft).filter((id): id is number => id !== null && id !== undefined)
  );

  const availablePlayers = players.filter((p) => {
    const status = availability[p.idnumber] || 'tentative';
    return status !== 'unavailable';
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Simulateur de Composition & Règles FRBE — {clubName}
        </h2>
        <p className="text-sm text-slate-500">
          Gérez la disponibilité des joueurs, composez vos équipes et vérifiez la conformité automatique aux règlements FRBE.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Player Availability Manager (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Disponibilité de l'effectif ({players.length} joueurs)
              </h3>
            </div>

            <div className="mt-3 max-h-137.5 overflow-y-auto space-y-1.5 pr-1">
              {players.map((p) => {
                const status = availability[p.idnumber] || 'tentative';

                return (
                  <div
                    key={p.idnumber}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 hover:bg-slate-50 transition text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {p.last_name} {p.first_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Elo : <strong className="text-slate-700">{p.assignedrating || 'NC'}</strong>
                        {p.titular && (
                          <span className="ml-1.5 rounded-sm bg-slate-100 px-1 py-0.2 text-[10px] text-slate-600">
                            {p.titular}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPlayerAvailability(p.idnumber, 'available')}
                        className={`rounded-lg p-1.5 transition ${
                          status === 'available'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title="Disponible"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setPlayerAvailability(p.idnumber, 'tentative')}
                        className={`rounded-lg p-1.5 transition ${
                          status === 'tentative'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title="Incertain / À confirmer"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setPlayerAvailability(p.idnumber, 'unavailable')}
                        className={`rounded-lg p-1.5 transition ${
                          status === 'unavailable'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                        title="Indisponible"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Lineup Builder & Validation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Team selector tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {teams.map((t, idx) => (
              <button
                key={t.name}
                onClick={() => setSelectedTeamIndex(idx)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition border ${
                  selectedTeamIndex === idx
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.name} (Div {t.division}{t.index})
              </button>
            ))}
          </div>

          {/* Validation Status Banner */}
          <div
            className={`rounded-2xl border p-4 ${
              !validation.isValid
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : validation.hasWarnings
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {!validation.isValid ? (
                  <>
                    <AlertOctagon className="h-5 w-5 text-rose-600" />
                    <span>Non conforme aux règles FRBE</span>
                  </>
                ) : validation.hasWarnings ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span>Conforme avec avertissements</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span>Composition valide FRBE</span>
                  </>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold opacity-75">Moyenne Elo</span>
                <div className="text-base font-bold">
                  {validation.averageElo || 'NC'}
                </div>
              </div>
            </div>

            {/* List of violations / warnings */}
            {validation.violations.length > 0 && (
              <div className="mt-3 space-y-1 text-xs border-t border-black/10 pt-2">
                {validation.violations.map((v, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 font-medium ${
                      v.type === 'error' ? 'text-rose-700' : 'text-amber-800'
                    }`}
                  >
                    <span>•</span>
                    <span>{v.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boards Assignment Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Échiquiers ({validation.assignedCount} / {validation.totalBoards})
              </h3>
              <button
                onClick={() => clearDraft(teamNumber)}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Effacer
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {assignedBoards.map((b) => {
                return (
                  <div
                    key={b.board}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 bg-slate-50/50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-800">
                      {b.board}
                    </span>

                    <div className="flex-1">
                      <select
                        value={b.player?.idnumber || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          assignPlayerToBoard(
                            teamNumber,
                            b.board,
                            val ? parseInt(val, 10) : null
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choisir un joueur --</option>
                        {availablePlayers.map((p) => {
                          const isAssignedHere = b.player?.idnumber === p.idnumber;
                          const isAssignedOther =
                            currentlyAssignedIds.has(p.idnumber) && !isAssignedHere;

                          return (
                            <option
                              key={p.idnumber}
                              value={p.idnumber}
                              disabled={isAssignedOther}
                            >
                              {p.last_name} {p.first_name} ({p.assignedrating || 'NC'} Elo)
                              {p.titular ? ` [${p.titular}]` : ''}
                              {isAssignedOther ? ' (Déjà placé)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {b.player && (
                      <button
                        onClick={() => assignPlayerToBoard(teamNumber, b.board, null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                        title="Retirer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

