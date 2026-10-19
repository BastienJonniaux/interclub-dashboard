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
import { NextRoundBanner } from './NextRoundBanner';

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
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    setLogoError(false);
  }, [clubId]);

  const navItems = [
    { id: 'standings', label: 'Classements Équipes', icon: Trophy },
    { id: 'players', label: 'Performance Joueurs', icon: Users },
    { id: 'scouting', label: 'Scouting & Matchs', icon: Compass },
    { id: 'simulator', label: 'Simulateur & Règles FRBE', icon: FileSpreadsheet },
    { id: 'exports', label: 'Exports & Mails', icon: Share2 },
  ] as const;

  return (
    <>
      <header className="relative mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center bg-slate-900 text-white rounded-xl overflow-hidden shrink-0 shadow-xs border border-slate-800">
                {!logoError ? (
                  <img
                    src={`/clubs/${clubId}.png`}
                    alt={`Logo Club ${clubId}`}
                    className="h-full w-full object-contain p-1"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Trophy className="h-5 w-5 text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Interclubs FRBE 2026–2027
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  Tableau de Bord
                </h1>
              </div>
            </div>

            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 chess-button-secondary"
                aria-label="Actualiser"
              >
                <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 mt-4 sm:mt-0">
            <NextRoundBanner />
            
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 chess-button-secondary text-sm"
              title="Changer de club"
            >
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="font-mono text-xs">
                Club <strong className="font-bold text-slate-900">{clubId}</strong> <span className="font-sans text-slate-500">({clubName})</span>
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

        {/* Tab Navigation - Modern Segmented Control */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-50/70">
          <nav className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all rounded-lg cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
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
