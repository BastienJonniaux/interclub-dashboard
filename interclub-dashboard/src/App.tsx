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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin floating-element" />
        <h3 className="mt-4 text-base font-bold text-slate-200">
          Chargement des données FRBE...
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Récupération des équipes, résultats et joueurs du Club {clubId}
        </p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 floating-element">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Erreur de chargement</h3>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {error || 'Impossible de charger les données du club.'}
        </p>
        <button
          onClick={refresh}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-5 py-2.5 text-sm font-semibold text-indigo-300 shadow-lg hover:bg-indigo-500/30 hover:text-indigo-200 transition-all duration-300"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={refresh}
        isLoading={loading}
      />

      {isFallback && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs font-medium text-amber-200/90 backdrop-blur-md">
          ⚠️ Le serveur principal de la FRBE est temporairement inaccessible (Erreur 502). Les données ont été chargées avec succès depuis le miroir de sauvegarde synchronisé.
        </div>
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 relative z-0">
        {/* Ambient background glows for the main content area */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-screen" />

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
            />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-white/5 bg-slate-900/40 backdrop-blur-md py-6 text-center text-xs text-slate-500 z-10">
        Tableau de bord Interclubs FRBE • Conçu pour les directeurs et capitaines d'interclubs
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

