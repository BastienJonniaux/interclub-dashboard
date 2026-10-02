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
      <header className="relative z-40 mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 glass-panel">
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 sm:px-6 border-b border-white/5">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] floating-element">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
                    Interclubs FRBE 2026–2027
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 leading-tight tracking-tight">
                  Tableau de Bord
                </h1>
              </div>
            </div>

            <div className="flex sm:hidden items-center gap-2">
               <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded-xl glass-button text-slate-300"
              >
                <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl glass-button px-4 py-2 text-xs font-medium text-slate-300"
              title="Changer de club"
            >
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>
                Club <strong className="text-slate-100 font-bold">{clubId}</strong> ({clubName})
              </span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl glass-button px-4 py-2 text-xs font-medium text-slate-300 disabled:opacity-50"
              title="Actualiser les données FRBE"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-2 sm:px-4 py-2">
          <nav className="flex space-x-1 overflow-x-auto pb-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
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
