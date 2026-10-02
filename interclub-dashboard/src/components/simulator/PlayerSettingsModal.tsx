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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl glass-panel p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Gestion de l'Effectif (Saison)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Définissez les paramètres permanents pour chaque joueur (ignoré, réserve par défaut).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
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
              className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
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
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                  isIgnored ? 'bg-rose-500/5 border-rose-500/20' : isBackup ? 'bg-amber-500/5 border-amber-500/20' : 'bg-black/20 border-white/5'
                }`}
              >
                <div>
                  <div className={`font-bold ${isIgnored ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {p.last_name} {p.first_name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {p.assignedrating || 'NC'} Elo {p.titular ? ` • Titulaire ${p.titular}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isBackup', !isBackup)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isBackup
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    Toujours Réserve
                  </button>

                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isIgnored', !isIgnored)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isIgnored
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Ignorer
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
