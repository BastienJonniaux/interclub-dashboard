import React, { useState } from 'react';
import { useClub } from '../../context/ClubContext';
import { X, Search, Shield, Check } from 'lucide-react';

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
  { id: 207, name: 'Échiquier Mosan' },
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
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-lg text-slate-900 tracking-tight">
              Changer de Club FRBE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Custom Club Form */}
        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold mb-1.5">
            Numéro de Club FRBE (Matricule)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Ex: 541"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600 font-mono transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Valider</span>
            </button>
          </div>
        </form>

        {/* Quick Selection Grid */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-3">
            Clubs Fréquents
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {COMMON_CLUBS.map((c) => {
              const isSelected = clubId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={`flex flex-col items-start p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full font-mono tabular-nums">
                    <span className={`font-bold text-xs ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
                      Matr. {c.id}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </div>
                  <span className="font-bold text-sm text-slate-900 truncate w-full mt-1 tracking-tight">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
