import React, { useState } from 'react';
import { ClubProvider, useClub } from './context/ClubContext';
import { SimulatorProvider } from './context/SimulatorContext';
import { useClubData } from './hooks/useClubData';
import { Navbar, TabType } from './components/layout/Navbar';
import { ClubHubTab } from './components/hub/ClubHubTab';
import { StandingsTab } from './components/standings/StandingsTab';
import { PlayerPerformanceTab } from './components/players/PlayerPerformanceTab';
import { ScoutingTab } from './components/scouting/ScoutingTab';
import { SimulatorTab } from './components/simulator/SimulatorTab';
import { ExportsTab } from './components/exports/ExportsTab';
import { DirectorAuthModal } from './components/common/DirectorAuthModal';
import { ClubSelectorModal } from './components/layout/ClubSelectorModal';
import { checkServerHealth, fetchRoundDrafts } from './api/backendClient';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';

const DashboardContent: React.FC = () => {
  // Default to guest-friendly "hub" tab
  const [activeTab, setActiveTab] = useState<TabType>('hub');
  const [isDirectorMode, setIsDirectorMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isClubSelectorOpen, setIsClubSelectorOpen] = useState<boolean>(false);

  const { clubId } = useClub();
  const {
    loading,
    error,
    club,
    playerStats,
    standings,
    scouting,
    latestMatches,
    allDivisions,
    playerDirectory,
    isFallback,
    refresh,
  } = useClubData();

  const handleDirectorAuthSuccess = () => {
    setIsDirectorMode(true);
    setIsAuthModalOpen(false);

    // Wake up Neon & backend in background
    checkServerHealth().catch(() => {});
    fetchRoundDrafts(1).catch(() => {});
  };

  const handleLockDirectorMode = () => {
    setIsDirectorMode(false);
    if (activeTab === 'simulator' || activeTab === 'exports') {
      setActiveTab('hub');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
        <h3 className="mt-4 text-lg font-bold text-slate-900 tracking-tight">
          Chargement de l'Échiquier...
        </h3>
        <p className="mt-1 text-sm font-mono text-slate-500">
          Synchronisation FRBE pour le matricule {clubId}
        </p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
        <div className="h-16 w-16 bg-white border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mb-4 shadow-xs">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Erreur de connexion</h3>
        <p className="mt-2 max-w-md text-base text-slate-600">
          {error || 'Impossible de charger les données du club.'}
        </p>
        <button
          onClick={refresh}
          className="mt-6 chess-button inline-flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={refresh}
        isLoading={loading}
        onOpenClubSelector={() => setIsClubSelectorOpen(true)}
        isDirectorMode={isDirectorMode}
        onOpenDirectorAuth={() => setIsAuthModalOpen(true)}
        onLockDirectorMode={handleLockDirectorMode}
      />

      {isFallback && (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-amber-800">
            Le serveur principal FRBE est indisponible. Utilisation des archives de sauvegarde.
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 relative">
        {/* Hub Tab (Guest / Member default) */}
        {activeTab === 'hub' && (
          <div className="animate-in fade-in duration-300">
            <ClubHubTab
              club={club}
              standings={standings}
              latestMatches={latestMatches}
              scouting={scouting}
              playerStats={playerStats}
              onNavigateTab={setActiveTab}
              onOpenClubSelector={() => setIsClubSelectorOpen(true)}
            />
          </div>
        )}

        {/* Division Standings Tab */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in duration-300">
            <StandingsTab
              standings={standings}
              clubName={club.name}
              latestMatches={latestMatches}
            />
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="animate-in fade-in duration-300">
            <PlayerPerformanceTab players={playerStats} clubName={club.name} />
          </div>
        )}

        {/* Next Matches / Scouting Tab */}
        {activeTab === 'scouting' && (
          <div className="animate-in fade-in duration-300">
            <ScoutingTab scouting={scouting} clubName={club.name} />
          </div>
        )}

        {/* Simulator Tab (Director Only) */}
        {activeTab === 'simulator' && isDirectorMode && (
          <div className="animate-in fade-in duration-300">
            <SimulatorTab
              players={club.players || []}
              teams={club.teams || []}
              clubName={club.name}
              scouting={scouting}
            />
          </div>
        )}

        {/* Exports Tab (Director Only) */}
        {activeTab === 'exports' && isDirectorMode && (
          <div className="animate-in fade-in duration-300">
            <ExportsTab
              club={club}
              divisions={allDivisions}
              playerDirectory={playerDirectory}
              scouting={scouting}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 text-center text-sm text-slate-500">
        <div className="font-bold text-slate-900 tracking-tight mb-1">INTERCLUBS FRBE</div>
        Tableau de bord officiel &bull; Fédération Royale Belge des Échecs
      </footer>

      {/* Club Selector Modal */}
      <ClubSelectorModal
        isOpen={isClubSelectorOpen}
        onClose={() => setIsClubSelectorOpen(false)}
      />

      {/* Director Password / Unlock Modal */}
      <DirectorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleDirectorAuthSuccess}
      />
    </div>
  );
};

export function App() {
  return (
    <ClubProvider>
      <SimulatorProvider>
        <DashboardContent />
      </SimulatorProvider>
    </ClubProvider>
  );
}

export default App;
