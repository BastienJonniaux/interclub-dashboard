import React, { useState, useMemo } from 'react';
import { useClub } from '../../context/ClubContext';
import { X, Search, Shield, Check, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ClubEntry {
  id: number;
  name: string;
  region?: string;
}

const BELGIAN_CLUBS: ClubEntry[] = [
  { id: 541, name: 'Leuze-En-Hainaut', region: 'Hainaut' },
  { id: 601, name: 'CRELEL Liège', region: 'Liège' },
  { id: 401, name: 'KGSRL Gent', region: 'Oost-Vlaanderen' },
  { id: 201, name: 'CREB Bruxelles', region: 'Bruxelles' },
  { id: 901, name: 'Namur Échecs', region: 'Namur' },
  { id: 109, name: 'Borgerhout', region: 'Antwerpen' },
  { id: 501, name: 'Tournai', region: 'Hainaut' },
  { id: 207, name: 'Échiquier Mosan', region: 'Bruxelles' },
  { id: 514, name: "Fontaine-l'Évêque", region: 'Hainaut' },
  { id: 548, name: 'Caïssa Europe Mons', region: 'Hainaut' },
  { id: 962, name: 'Wavre', region: 'Brabant Wallon' },
  { id: 961, name: "Braine-l'Alleud", region: 'Brabant Wallon' },
  { id: 230, name: 'Boitsfort', region: 'Bruxelles' },
  { id: 229, name: 'Woluwe', region: 'Bruxelles' },
  { id: 244, name: 'Brussels Chess Club', region: 'Bruxelles' },
  { id: 226, name: 'Europchess', region: 'Bruxelles' },
  { id: 303, name: 'KBSK Brugge', region: 'West-Vlaanderen' },
  { id: 301, name: 'KOSK Oostende', region: 'West-Vlaanderen' },
  { id: 114, name: 'Mechelen', region: 'Antwerpen' },
  { id: 174, name: 'Brasschaat', region: 'Antwerpen' },
  { id: 604, name: 'KSK Rochade Eupen-Kelmis', region: 'Liège' },
  { id: 618, name: 'Échiquier Liégeois', region: 'Liège' },
  { id: 621, name: 'Ans', region: 'Liège' },
  { id: 622, name: 'Herve', region: 'Liège' },
  { id: 703, name: 'MSK Peer', region: 'Limburg' },
  { id: 726, name: 'Sint-Truiden', region: 'Limburg' },
  { id: 810, name: 'Marche-en-Famenne', region: 'Luxembourg' },
  { id: 812, name: 'Arlon', region: 'Luxembourg' },
  { id: 952, name: 'Dinant', region: 'Namur' },
  { id: 953, name: 'Ciney', region: 'Namur' },
  { id: 951, name: 'Philippeville', region: 'Namur' },
  { id: 525, name: 'CE Sambrevillois', region: 'Namur' },
];

export const ClubSelectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { clubId, setClubId } = useClub();
  const [search, setSearch] = useState('');

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BELGIAN_CLUBS;

    return BELGIAN_CLUBS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toString().includes(q) ||
        (c.region && c.region.toLowerCase().includes(q))
    );
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = (id: number) => {
    setClubId(id);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(search.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setClubId(parsed);
      onClose();
    } else if (filteredClubs.length > 0) {
      handleSelect(filteredClubs[0].id);
    }
  };

  const isNumericSearch = !isNaN(parseInt(search.trim(), 10)) && parseInt(search.trim(), 10) > 0;
  const isCustomNotFound = isNumericSearch && !BELGIAN_CLUBS.some((c) => c.id === parseInt(search.trim(), 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                Changer de Club FRBE
              </h3>
              <p className="text-xs text-slate-500">
                Sélectionnez votre club pour afficher ses résultats et son effectif.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleCustomSubmit} className="mt-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom de club, ville ou matricule (ex: Liège, 541)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-900 transition-colors font-medium"
              autoFocus
            />
            {search && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg font-mono font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Choisir
              </button>
            )}
          </div>
        </form>

        {/* Custom unlisted matricule prompt */}
        {isCustomNotFound && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shrink-0">
            <div className="text-xs text-emerald-900 font-medium">
              Charger le matricule non répertorié : <strong>Club {search.trim()}</strong>
            </div>
            <button
              onClick={() => handleSelect(parseInt(search.trim(), 10))}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer"
            >
              <span>Valider</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Club Grid / List */}
        <div className="mt-4 overflow-y-auto pr-1 space-y-2 flex-1 custom-scrollbar">
          {filteredClubs.length === 0 && !isCustomNotFound ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Aucun club trouvé pour "{search}". Vous pouvez saisir directement son numéro de matricule FRBE.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredClubs.map((c) => {
                const isSelected = clubId === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`flex items-center justify-between p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                        : 'border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <span className={`font-bold text-xs ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
                          Matr. {c.id}
                        </span>
                        {c.region && (
                          <span className="text-[10px] text-slate-400 font-sans">
                            &bull; {c.region}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-slate-900 truncate block mt-0.5 tracking-tight">
                        {c.name}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
