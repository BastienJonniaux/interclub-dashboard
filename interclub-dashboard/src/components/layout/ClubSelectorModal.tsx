import React, { useState } from 'react';
import { useClub } from '../../context/ClubContext';
import { X, Search } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_CLUBS = [
  { id: 541, name: 'Leuze-En-Hainaut' },
  { id: 401, name: 'KGSRL Gent' },
  { id: 201, name: 'CREB Bruxelles' },
  { id: 601, name: 'CRELEL Liège' },
  { id: 109, name: 'Borgerhout' },
  { id: 901, name: 'Namur Échecs' },
  { id: 501, name: 'Tournai' },
  { id: 207, name: 'Echiquier Mosan' },
];

export const ClubSelectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { clubId, setClubId } = useClub();
  const [customId, setCustomId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(customId.trim(), 10);
    if (!isNaN(id) && id > 0) {
      setClubId(id);
      onClose();
    }
  };

  const handleSelect = (id: number) => {
    setClubId(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-slate-100">Changer de Club FRBE</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <label className="block text-sm font-medium text-slate-300">
            Numéro de club FRBE (Matricule)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              placeholder="Ex: 541"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-5 py-2.5 text-sm font-semibold text-indigo-300 shadow-lg hover:bg-indigo-500/30 hover:text-indigo-200 transition-all duration-300"
            >
              <Search className="h-4 w-4" />
              Valider
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Clubs Fréquents
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {COMMON_CLUBS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`flex flex-col items-start rounded-xl p-3 text-left transition-all duration-300 border ${
                  clubId === c.id
                    ? 'border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/5 bg-black/20 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <span className={`font-bold ${clubId === c.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {c.id}
                </span>
                <span className="truncate w-full text-xs text-slate-400 mt-0.5">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
