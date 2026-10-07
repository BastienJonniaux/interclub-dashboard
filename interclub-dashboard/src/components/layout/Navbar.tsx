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
      <header className="relative mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 chess-panel p-0 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 sm:px-6 border-b border-[#E2DFD8]">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center bg-[#1A1918] text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A64]">
                    Interclubs FRBE 2026–2027
                  </span>
                </div>
                <h1 className="text-2xl font-bold font-serif text-[#1A1918] leading-tight tracking-tight">
                  Tableau de Bord
                </h1>
              </div>
            </div>

            <div className="flex sm:hidden items-center gap-2">
               <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 chess-button-secondary"
              >
                <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 mt-4 sm:mt-0">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 chess-button-secondary text-sm"
              title="Changer de club"
            >
              <Building2 className="h-4 w-4 text-[#1A1918]" />
              <span className="font-mono">
                Club <strong className="font-bold">{clubId}</strong> <span className="font-sans">({clubName})</span>
              </span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 chess-button text-sm disabled:opacity-50"
              title="Actualiser les données FRBE"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-2 sm:px-4 py-2 bg-[#F9F8F6]">
          <nav className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#1A1918] text-white'
                      : 'bg-transparent text-[#6E6A64] hover:bg-[#E2DFD8] hover:text-[#1A1918]'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-white' : 'text-[#6E6A64]'}`} />
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
