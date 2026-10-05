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
        className="absolute inset-0 bg-[#1A1918]/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-none bg-[#F9F8F6] border border-[#E2DFD8] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD8] shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[#1A1918] font-serif">Gestion de l'Effectif (Saison)</h3>
            <p className="text-xs text-[#6E6A64] mt-1 font-mono">
              Définissez les paramètres permanents pour chaque joueur (ignoré, réserve par défaut).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-none p-2 text-[#6E6A64] hover:bg-[#E2DFD8] hover:text-[#1A1918] transition-colors border border-transparent hover:border-[#E2DFD8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 mb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6E6A64]" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-none border border-[#E2DFD8] bg-white pl-10 pr-4 py-2 text-sm text-[#1A1918] placeholder-[#6E6A64] focus:border-[#1A1918] focus:outline-none focus:ring-1 focus:ring-[#1A1918] transition-colors font-medium"
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
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-none border transition-colors ${
                  isIgnored ? 'bg-[#F9F8F6] border-[#E2DFD8] opacity-75' : isBackup ? 'bg-white border-[#E2DFD8]' : 'bg-white border-[#E2DFD8]'
                }`}
              >
                <div>
                  <div className={`font-bold font-serif ${isIgnored ? 'text-[#6E6A64] line-through' : 'text-[#1A1918]'}`}>
                    {p.last_name} {p.first_name}
                  </div>
                  <div className="text-xs text-[#6E6A64] mt-0.5 font-mono">
                    {p.assignedrating || 'NC'} Elo {p.titular ? ` • Titulaire ${p.titular}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isBackup', !isBackup)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      isBackup
                        ? 'bg-[#1A1918] text-white border border-[#1A1918]'
                        : 'bg-white text-[#6E6A64] border border-[#E2DFD8] hover:bg-[#F9F8F6] hover:text-[#1A1918]'
                    }`}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    Toujours Réserve
                  </button>

                  <button
                    onClick={() => setPlayerSetting(p.idnumber, 'isIgnored', !isIgnored)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      isIgnored
                        ? 'bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/30'
                        : 'bg-white text-[#6E6A64] border border-[#E2DFD8] hover:bg-[#F9F8F6] hover:text-[#1A1918]'
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
