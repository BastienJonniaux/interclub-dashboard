import React, { useState } from 'react';
import { ClubProvider, useClub } from './context/ClubContext';
import { SimulatorProvider } from './context/SimulatorContext';
import { useClubData } from './hooks/useClubData';
import { Navbar, TabType } from './components/layout/Navbar';
import { StandingsTab } from './components/standings/StandingsTab';
import { PlayerPerformanceTab } from './components/players/PlayerPerformanceTab';
import { ScoutingTab } from './components/scouting/ScoutingTab';
import { SimulatorTab } from './components/simulator/SimulatorTab';
import { ExportsTab } from './components/exports/ExportsTab';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('standings');
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F9F8F6]">
        <Loader2 className="h-10 w-10 text-[#1E5E3A] animate-spin" />
        <h3 className="mt-4 text-lg font-bold font-serif text-[#1A1918]">
          Chargement de l'Échiquier...
        </h3>
        <p className="mt-1 text-sm font-mono text-[#6E6A64]">
          Synchronisation FRBE pour le matricule {clubId}
        </p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-[#F9F8F6]">
        <div className="h-16 w-16 bg-white border border-[#E2DFD8] flex items-center justify-center text-[#B91C1C] mb-4 shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold font-serif text-[#1A1918]">Erreur de connexion</h3>
        <p className="mt-2 max-w-md text-base text-[#6E6A64]">
          {error || 'Impossible de charger les données du club.'}
        </p>
        <button
          onClick={refresh}
          className="mt-6 chess-button inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[#F9F8F6]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={refresh}
        isLoading={loading}
      />

      {isFallback && (
        <div className="bg-[#B45309]/10 border-b border-[#B45309] px-4 py-3 text-center text-sm font-semibold text-[#B45309]">
          Le serveur principal FRBE est indisponible. Utilisation des archives de sauvegarde.
        </div>
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 relative">
        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StandingsTab
              standings={standings}
              clubName={club.name}
              latestMatches={latestMatches}
            />
          </div>
        )}
        {activeTab === 'players' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PlayerPerformanceTab players={playerStats} clubName={club.name} />
          </div>
        )}
        {activeTab === 'scouting' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ScoutingTab scouting={scouting} clubName={club.name} />
          </div>
        )}
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SimulatorTab
              players={club.players || []}
              teams={club.teams || []}
              clubName={club.name}
              scouting={scouting}
            />
          </div>
        )}
        {activeTab === 'exports' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ExportsTab
              club={club}
              divisions={allDivisions}
              playerDirectory={playerDirectory}
              scouting={scouting}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[#E2DFD8] bg-white py-8 text-center text-sm text-[#6E6A64]">
        <div className="font-serif font-bold text-[#1A1918] mb-1">INTERCLUBS FRBE</div>
        Tableau de bord tactique officiel
      </footer>
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

