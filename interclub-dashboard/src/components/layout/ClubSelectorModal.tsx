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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Changer de Club FRBE</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Numéro de club FRBE (Matricule)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              placeholder="Ex: 541"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Search className="h-4 w-4" />
              Valider
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Clubs Fréquents
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {COMMON_CLUBS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`flex flex-col items-start rounded-xl p-2.5 text-left text-xs transition border ${
                  clubId === c.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="font-bold text-slate-900">{c.id}</span>
                <span className="truncate w-full text-slate-500">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
