import React, { useState } from 'react';
import { useClub } from '../../context/ClubContext';
import { ClubSelectorModal } from './ClubSelectorModal';
import {
  Trophy,
  Users,
  Compass,
  FileSpreadsheet,
  Share2,
  RotateCw,
  Building2,
} from 'lucide-react';

export type TabType = 'standings' | 'players' | 'scouting' | 'simulator' | 'exports';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isLoading,
}) => {
  const { clubId, clubName } = useClub();
  const [modalOpen, setModalOpen] = useState(false);

  const navItems = [
    { id: 'standings', label: 'Classements Équipes', icon: Trophy },
    { id: 'players', label: 'Performance Joueurs', icon: Users },
    { id: 'scouting', label: 'Scouting & Matchs', icon: Compass },
    { id: 'simulator', label: 'Simulateur & Règles FRBE', icon: FileSpreadsheet },
    { id: 'exports', label: 'Exports & Mails', icon: Share2 },
  ] as const;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Interclubs FRBE 2026–2027
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Tableau de Bord Capitaine
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
              title="Changer de club"
            >
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>
                Club <strong className="text-slate-900 font-bold">{clubId}</strong> ({clubName})
              </span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
              title="Actualiser les données FRBE"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex space-x-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <ClubSelectorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
