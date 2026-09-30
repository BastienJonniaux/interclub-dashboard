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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <h3 className="mt-4 text-base font-bold text-slate-800">
          Chargement des données FRBE...
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Récupération des équipes, résultats et joueurs du Club {clubId}
        </p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Erreur de chargement</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {error || 'Impossible de charger les données du club.'}
        </p>
        <button
          onClick={refresh}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={refresh}
        isLoading={loading}
      />

      {isFallback && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-medium text-amber-800">
          ⚠️ Le serveur principal de la FRBE est temporairement inaccessible (Erreur 502). Les données ont été chargées avec succès depuis le miroir de sauvegarde synchronisé.
        </div>
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 sm:px-6">
        {activeTab === 'standings' && (
          <StandingsTab
            standings={standings}
            clubName={club.name}
            latestMatches={latestMatches}
          />
        )}
        {activeTab === 'players' && (
          <PlayerPerformanceTab players={playerStats} clubName={club.name} />
        )}
        {activeTab === 'scouting' && (
          <ScoutingTab scouting={scouting} clubName={club.name} />
        )}
        {activeTab === 'simulator' && (
          <SimulatorTab
            players={club.players || []}
            teams={club.teams || []}
            clubName={club.name}
          />
        )}
        {activeTab === 'exports' && (
          <ExportsTab
            club={club}
            divisions={allDivisions}
            playerDirectory={playerDirectory}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
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

