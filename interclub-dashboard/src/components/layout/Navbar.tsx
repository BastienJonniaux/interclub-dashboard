import React, { useState } from 'react';
import { useClub } from '../../context/ClubContext';
import {
  Trophy,
  Users,
  Compass,
  FileSpreadsheet,
  Share2,
  RotateCw,
  Building2,
  Home,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { NextRoundBanner } from './NextRoundBanner';

export type TabType = 'hub' | 'standings' | 'players' | 'scouting' | 'simulator' | 'exports';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenClubSelector: () => void;
  isDirectorMode: boolean;
  onOpenDirectorAuth: () => void;
  onLockDirectorMode: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isLoading,
  onOpenClubSelector,
  isDirectorMode,
  onOpenDirectorAuth,
  onLockDirectorMode,
}) => {
  const { clubId, clubName } = useClub();
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    setLogoError(false);
  }, [clubId]);

  const baseNavItems = [
    { id: 'hub' as const, label: 'Le Club', icon: Home },
    { id: 'standings' as const, label: 'Classements Équipes', icon: Trophy },
    { id: 'scouting' as const, label: 'Prochains Matchs', icon: Compass },
    { id: 'players' as const, label: 'Joueurs du Club', icon: Users },
  ];

  const directorNavItems = [
    { id: 'simulator' as const, label: 'Simulateur & Règles FRBE', icon: FileSpreadsheet },
    { id: 'exports' as const, label: 'Exports & Mails', icon: Share2 },
  ];

  const navItems = isDirectorMode
    ? [...baseNavItems, ...directorNavItems]
    : baseNavItems;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6">
      <header className="relative bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 sm:px-6 border-b border-slate-100 gap-4">
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

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
            <NextRoundBanner />

            {/* Club Selector Button */}
            <button
              onClick={onOpenClubSelector}
              className="inline-flex items-center gap-2 chess-button-secondary text-sm"
              title="Changer de club"
            >
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="font-mono text-xs">
                Club <strong className="font-bold text-slate-900">{clubId}</strong>{' '}
                <span className="font-sans text-slate-500 hidden md:inline">({clubName})</span>
              </span>
            </button>

            {/* Director Mode Button */}
            {!isDirectorMode ? (
              <button
                onClick={onOpenDirectorAuth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
                title="Accès réservé au Directeur des Interclubs (Simulateur et Exports)"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Espace Directeur</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Directeur</span>
                </span>
                <button
                  onClick={onLockDirectorMode}
                  className="px-2 py-1.5 text-xs font-mono text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Verrouiller et revenir au mode invité / membre"
                >
                  Quitter
                </button>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 chess-button text-sm disabled:opacity-50"
              title="Actualiser les données FRBE"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Modern Border Tabs */}
        <div className="px-4 sm:px-6 bg-white">
          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap py-3.5 text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-slate-900 font-semibold text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </div>
  );
};
