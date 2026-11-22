import React, { useState, useMemo } from 'react';
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
import { CalendarScheduleModal } from './components/layout/CalendarScheduleModal';
import { WhatsNewModal } from './components/layout/WhatsNewModal';
import { extractFullSeasonSchedule, getUpcomingRoundNumber } from './domain/calendar';
import { checkServerHealth, fetchRoundDrafts } from './api/backendClient';
import { Loader2, AlertCircle, RotateCcw, Sparkles, ArrowRight, X } from 'lucide-react';

const DashboardContent: React.FC = () => {
  // Default to standings tab (original director default) with all tabs accessible
  const [activeTab, setActiveTab] = useState<TabType>('standings');
  const [isDirectorMode, setIsDirectorMode] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isClubSelectorOpen, setIsClubSelectorOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [selectedScoutingRound, setSelectedScoutingRound] = useState<number>(() => getUpcomingRoundNumber());

  // What's New / Nouveautés banner & modal state
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState<boolean>(false);
  const [autoOpenProjections, setAutoOpenProjections] = useState<boolean>(false);
  const [hasUnseenWhatsNew, setHasUnseenWhatsNew] = useState<boolean>(() => {
    try {
      return localStorage.getItem('interclub_whats_new_seen_v2_4') !== 'true';
    } catch {
      return true;
    }
  });
  const [showNoticeBanner, setShowNoticeBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('interclub_notice_dismissed_v2_4') !== 'true';
    } catch {
      return true;
    }
  });

  const handleOpenWhatsNew = () => {
    setIsWhatsNewOpen(true);
    setHasUnseenWhatsNew(false);
    try {
      localStorage.setItem('interclub_whats_new_seen_v2_4', 'true');
    } catch {}
  };

  const handleDismissNotice = () => {
    setShowNoticeBanner(false);
    try {
      localStorage.setItem('interclub_notice_dismissed_v2_4', 'true');
    } catch {}
  };

  const handleNavigateFromWhatsNew = (action: {
    tab?: TabType;
    openSchedule?: boolean;
    openProjections?: boolean;
  }) => {
    setIsWhatsNewOpen(false);
    setHasUnseenWhatsNew(false);
    setShowNoticeBanner(false);
    try {
      localStorage.setItem('interclub_whats_new_seen_v2_4', 'true');
      localStorage.setItem('interclub_notice_dismissed_v2_4', 'true');
    } catch {}

    if (action.tab) {
      setActiveTab(action.tab);
    }
    if (action.openSchedule) {
      setIsScheduleModalOpen(true);
    }
    if (action.openProjections) {
      setAutoOpenProjections(true);
    }
  };

  React.useEffect(() => {
    // Wake up Neon & backend in background on load
    checkServerHealth().catch(() => {});
  }, []);

  const { clubId } = useClub();
  const {
    loading,
    error,
    club,
    venues,
    playerStats,
    standings,
    projections,
    scouting,
    latestMatches,
    allDivisions,
    playerDirectory,
    isFallback,
    refresh,
    getScoutingForRound,
  } = useClubData();

  const fullSchedule = useMemo(() => {
    return extractFullSeasonSchedule(allDivisions, clubId, standings, playerDirectory);
  }, [allDivisions, clubId, standings, playerDirectory]);

  const handleSelectRoundFromSchedule = (roundNumber: number) => {
    setSelectedScoutingRound(roundNumber);
    setActiveTab('scouting');
    setIsScheduleModalOpen(false);
  };

  const handleDirectorAuthSuccess = () => {
    setIsDirectorMode(true);
    setIsAuthModalOpen(false);

    // Wake up Neon & backend in background
    checkServerHealth().catch(() => {});
    fetchRoundDrafts(1, undefined, clubId).catch(() => {});
  };

  const handleLockDirectorMode = () => {
    setIsDirectorMode(false);
    if (activeTab === 'simulator' || activeTab === 'exports') {
      setActiveTab('standings');
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
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
        onOpenWhatsNew={handleOpenWhatsNew}
        hasUnseenWhatsNew={hasUnseenWhatsNew}
      />

      {/* Persistent Feature Notice Banner for Director & Users */}
      {showNoticeBanner && (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-3">
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-emerald-50/70 border border-indigo-200/90 rounded-2xl p-3 sm:px-5 sm:py-2.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="text-xs sm:text-sm text-slate-800 truncate sm:overflow-visible">
                <span className="font-bold text-indigo-950">
                  Nouveau : Projections Monte-Carlo & Validation FRBE !
                </span>
                <span className="hidden md:inline text-slate-600 ml-2">
                  Simulez la fin de saison (titre, montée, maintien) et contrôlez les règles d’équipes.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleDismissNotice();
                  setActiveTab('standings');
                  setAutoOpenProjections(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Voir les Projections</span>
              </button>
              <button
                onClick={handleOpenWhatsNew}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Toutes les nouveautés</span>
              </button>
              <button
                onClick={handleDismissNotice}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                title="Masquer cette annonce"
                aria-label="Fermer la notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              onOpenSchedule={() => setIsScheduleModalOpen(true)}
            />
          </div>
        )}

        {/* Division Standings Tab */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in duration-300">
            <StandingsTab
              standings={standings}
              projections={projections}
              clubName={club.name}
              latestMatches={latestMatches}
              autoOpenProjections={autoOpenProjections}
              onProjectionsOpened={() => setAutoOpenProjections(false)}
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
            <ScoutingTab
              scouting={scouting}
              clubName={club.name}
              selectedRoundNumber={selectedScoutingRound}
              onSelectRoundNumber={setSelectedScoutingRound}
              getScoutingForRound={getScoutingForRound}
            />
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-300">
            <SimulatorTab
              players={club.players || []}
              teams={club.teams || []}
              clubName={club.name}
              clubId={clubId}
              scouting={scouting}
              schedule={fullSchedule}
              venues={venues}
            />
          </div>
        )}

        {/* Exports Tab */}
        {activeTab === 'exports' && (
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

      {/* Interclub Full Schedule & France Clash Modal */}
      <CalendarScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedule={fullSchedule}
        onSelectRound={handleSelectRoundFromSchedule}
      />

      {/* Director Password / Unlock Modal */}
      <DirectorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleDirectorAuthSuccess}
      />

      {/* What's New / Dernières Mises à Jour Modal */}
      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        onNavigate={handleNavigateFromWhatsNew}
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
