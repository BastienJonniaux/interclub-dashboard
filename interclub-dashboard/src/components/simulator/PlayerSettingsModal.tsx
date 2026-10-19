import React, { useState } from 'react';
import { PlayerFrbe } from '../../modelsFRBE';
import { useSimulator } from '../../context/SimulatorContext';
import { X, Search, EyeOff, UserCog } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerFrbe[];
}

export const PlayerSettingsModal: React.FC<Props> = ({ isOpen, onClose, players }) => {
  const { playerSettings, setPlayerSetting } = useSimulator();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = players
    .filter(
      (p) =>
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200/80 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Gestion de l'Effectif (Saison)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Définissez les paramètres permanents pour chaque joueur (ignoré, réserve par défaut).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 mb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition-colors font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {filteredPlayers.map((p) => {
            const isIgnored = playerSettings[p.idnumber]?.isIgnored || false;
            const isBackup = playerSettings[p.idnumber]?.isBackup || false;

            return (
              <div
                key={p.idnumber}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isIgnored ? 'bg-slate-50/70 border-slate-200 opacity-60' : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                <div>
                  <div className={`font-semibold text-sm ${isIgnored ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {p.last_name} {p.first_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    <span className="font-bold text-slate-700">{p.assignedrating || 'NC'}</span> Elo {p.titular ? ` • Titulaire ${p.titular}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isBackup', !isBackup)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isBackup
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    <span>Toujours Réserve</span>
                  </button>

                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isIgnored', !isIgnored)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isIgnored
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>{isIgnored ? 'Ignoré' : 'Ignorer'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
