import React from 'react';
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { TabType } from './Navbar';

export interface WhatsNewFeature {
  id: string;
  badge: {
    label: string;
    variant: 'indigo' | 'emerald' | 'amber' | 'slate';
  };
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  actionLabel: string;
  actionTab?: TabType;
  actionOpenSchedule?: boolean;
  actionOpenProjections?: boolean;
}

const RECENT_FEATURES: WhatsNewFeature[] = [
  {
    id: 'projections-monte-carlo',
    badge: {
      label: '✨ NOUVEAU • v2.4',
      variant: 'indigo',
    },
    title: 'Projections de Fin de Saison & Probabilités Monte-Carlo',
    subtitle: 'Simulations probabilistes des classements, montées et maintiens',
    description:
      'Un moteur de simulation statistique complet calcule les probabilités de classement final pour chaque équipe selon 3 000 itérations de Monte-Carlo.',
    highlights: [
      'Matrice de distribution complète des places (1 à 12) avec heatmap intuitive',
      'Double modèle : Force Élo théorique (effectifs réels) vs Modèle Neutre 50-50',
      'Règles officielles FRBE intégrées par division (1 à 2 montants, 2 descendants)',
      'Détection mathématique du maintien assuré (Top 10) et favoris de division',
      'Précision validée par un backtest historique sur 2025 (±1.4 place d’écart moyen)',
    ],
    actionLabel: 'Accéder aux Projections',
    actionTab: 'standings',
    actionOpenProjections: true,
  },
  {
    id: 'frbe-validation-rules',
    badge: {
      label: 'ESSENTIEL • v2.3',
      variant: 'emerald',
    },
    title: 'Contrôle Automatisé des Règles Officielles FRBE',
    subtitle: 'Validation en temps réel des compositions d’équipes',
    description:
      'Le simulateur et le serveur vérifient en continu la conformité des alignements pour éliminer le risque d’amende ou de forfait administratif.',
    highlights: [
      'Contrôle des plafonds Élo par division (joueurs trop forts en équipe inférieure)',
      'Vérification stricte de la règle des titulaires (interdiction de descendre)',
      'Contrôle automatique des moyennes d’équipes (Équipe 1 ≥ Équipe 2)',
      'Alertes claires et guidées avant validation définitive des compositions',
    ],
    actionLabel: 'Ouvrir le Simulateur & Règles',
    actionTab: 'simulator',
  },
  {
    id: 'calendar-french-clashes',
    badge: {
      label: 'CALENDRIER • v2.2',
      variant: 'amber',
    },
    title: 'Calendrier des 11 Rondes & Détection des Conflits France',
    subtitle: 'Anticipation des doublons avec les championnats français FFE',
    description:
      'Une vue calendrier centralisée permet de planifier la saison et d’anticiper les indisponibilités des joueurs binationaux ou frontaliers.',
    highlights: [
      'Dates officielles des 11 rondes FRBE de la saison 2026–2027',
      'Repérage automatique des dates en collision avec le Top 16 et Nationales FFE (N1–N4)',
      'Accès direct aux matchs passés et adversaires à venir',
    ],
    actionLabel: 'Consulter le Calendrier & Conflits',
    actionOpenSchedule: true,
  },
  {
    id: 'high-availability-mirror',
    badge: {
      label: 'FIABILITÉ • v2.1',
      variant: 'slate',
    },
    title: 'Miroir Haute Disponibilité & Mode Hors-Ligne',
    subtitle: 'Zéro coupure même en cas de surcharge du site officiel FRBE',
    description:
      'L’application bascule automatiquement sur les données miroirs dès que le serveur de la fédération subit des ralentissements ou des coupures.',
    highlights: [
      'Synchronisation transparente en arrière-plan',
      'Consultation continue des résultats et feuilles de matchs le dimanche soir',
      'Sauvegarde cloud sécurisée des compositions avec clé directeur',
    ],
    actionLabel: 'Voir les Classements',
    actionTab: 'standings',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (action: { tab?: TabType; openSchedule?: boolean; openProjections?: boolean }) => void;
}

export const WhatsNewModal: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  const getBadgeStyle = (variant: WhatsNewFeature['badge']['variant']) => {
    switch (variant) {
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'slate':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-4xl my-auto max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 shadow-2xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Nouveautés & Mises à Jour Interclubs
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-slate-500">
                    Tableau de bord officiel FRBE
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Version 2.4 (Novembre 2026)
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Retrouvez ici le récapitulatif des dernières fonctionnalités ajoutées pour vous et votre club. Cliquez sur les boutons pour accéder directement à chaque outil.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature List */}
        <div className="p-6 overflow-y-auto space-y-6">
          {RECENT_FEATURES.map((feature, idx) => (
            <div
              key={feature.id}
              className={`p-5 rounded-xl border transition-all ${
                idx === 0
                  ? 'border-indigo-300 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getBadgeStyle(
                        feature.badge.variant
                      )}`}
                    >
                      {feature.badge.label}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-700">
                    {feature.description}
                  </p>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {feature.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => {
                      onNavigate({
                        tab: feature.actionTab,
                        openSchedule: feature.actionOpenSchedule,
                        openProjections: feature.actionOpenProjections,
                      });
                    }}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      idx === 0
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>{feature.actionLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs text-slate-500">
            Une question ou une suggestion ? Les fonctionnalités s'adaptent automatiquement aux données de votre club.
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
