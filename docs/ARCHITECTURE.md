# Architecture Technique & Analyse Critique — Interclub Director Dashboard

Ce document présente les choix techniques globaux du projet **Interclub Director Dashboard**, explique comment s'articulent le frontend, le backend et les API externes (FRBE, Firestore, Lichess/FIDE), et propose une **analyse critique** assortie de pistes d'amélioration concrètes.

Les décisions structurantes détaillées sont formalisées dans le dossier [`docs/adr/`](./adr/README.md).

---

## 1. Vue d'ensemble de l'architecture

Le projet est organisé en **monorepo léger** (sans outil de workspace complexe comme Turborepo ou Nx) piloté depuis le `package.json` racine :

```text
interclub-dashboard/
├── interclub-dashboard/   # Frontend SPA (React 19 + TypeScript + Vite 8 + Tailwind v4)
├── server/                # Backend API REST (Express + Prisma + PostgreSQL)
├── docs/                  # Documentation technique et ADR
├── docker-compose.yml     # Stack locale Postgres 16 + API Express
└── DEPLOYMENT.md          # Procédure de déploiement gratuit (Vercel + Render + Neon)
```

### Schéma des flux de données

```mermaid
flowchart LR
    U["Navigateur (Directeur / Membre)"] -->|"HTTPS (SPA Statique)"| V["Frontend React (Vercel)"]

    V -->|"/api/v1/interclubs/* (Rewrite/Proxy)"| FRBE["API Officielle FRBE/KBSB"]
    FRBE -.->|"Fallback si erreur / timeout (10s)"| FS["Miroir Firestore REST (Lecture seule)"]

    V -->|"GET public (recherche joueur & historique)"| LIC["API FIDE Lichess (lichess.org/api/fide)"]

    V -->|"REST + header x-director-key"| API["API Express (Render / Docker)"]
    API -->|"Prisma ORM"| DB["PostgreSQL (Neon Cloud / Docker local)"]

    V -->|"localStorage / sessionStorage"| LS["Cache TTL (15m) + Brouillons locaux + Clé Directeur"]
```

---

## 2. Synthèse des choix techniques (Stack)

| Couche | Choix retenu | Fichiers clés | Alternative écartée |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript (`~6.0.2`), Vite 8, Tailwind CSS v4, `lucide-react` | `interclub-dashboard/package.json` | Next.js (SSR inutile ici), MUI/Chakra |
| **Gestion d'état** | `React Context` (`ClubContext`, `SimulatorContext`) + `useClubData` | `src/context/`, `src/hooks/useClubData.ts` | Redux Toolkit, Zustand, TanStack Query |
| **Proxy & Sources externes** | Rewrites Vercel (`vercel.json`) + Proxy Vite (`vite.config.ts`) + Fallback Firestore REST | `src/api/frbeClient.ts`, `src/api/firestoreFallback.ts` | BFF complet côté serveur, SDK Firebase |
| **Données FIDE** | Client REST direct vers `lichess.org/api/fide` avec matching flou (Levenshtein) | `src/api/fideClient.ts` | Scraping FIDE ou base locale |
| **Backend API** | Express 4 (`^4.21.0`), TypeScript 5, Prisma 5, PostgreSQL | `server/src/index.ts`, `server/prisma/schema.prisma` | Firebase/Supabase BaaS, NestJS |
| **Authentification** | Clé secrète partagée (`DIRECTOR_KEY` / header `x-director-key`) | `server/src/middleware/auth.ts` | OAuth/JWT multi-utilisateurs |
| **Règles métier** | Calculs TPR, classements, scouting, validation FRBE 100 % côté client | `src/domain/`, `src/domain/rules/frbeValidator.ts` | Moteur de règles côté serveur |
| **Feuilles de match PDF** | HTML/CSS `@media print` isolé via `ReactDOM.createPortal` | `src/components/simulator/MatchSheetModal.tsx` | `jsPDF`, `pdfmake`, `@react-pdf/renderer` |
| **Qualité / Linting** | `oxlint` + compilation `tsc -b` | `interclub-dashboard/.oxlintrc.json` | ESLint + Vitest/Playwright |

---

## 3. Ce qui fonctionne bien (Points forts)

1. **Coût d'exploitation nul et déploiement pragmatique** :
   Frontend statique sur Vercel, API Dockerisée sur Render Free Tier, PostgreSQL serverless sur Neon, sans SDK Firebase lourd (~300 KB économisés grâce aux appels REST bruts vers Firestore).
2. **Résilience face aux pannes de la FRBE** :
   Le basculement automatique de `frbeClient.ts` vers `firestoreFallback.ts` et la persistance locale (`localStorage` dans `SimulatorContext`) évitent qu'une panne du site fédéral le dimanche matin ne bloque le directeur.
3. **Séparation nette du domaine dans le frontend** :
   Le dossier `interclub-dashboard/src/domain/` isole bien les calculs purs (TPR, classements, scouting, export mail, validation FRBE) des composants React.
4. **Expérience d'impression légère et fidèle** :
   L'utilisation de CSS `@page { size: A4 landscape }` via portail React produit des feuilles de match propres sans alourdir le bundle JS avec une librairie PDF.

---

## 4. Critique architecturale & Axes d'amélioration prioritaires

Une revue critique du code actuel met en évidence **9 fragilités concrètes**, classées par niveau d'impact :

### 🔴 Critique — Risques structurels ou de sécurité

1. **[RÉSOLU] Modèle de données multi-clubs isolé** (`server/prisma/schema.prisma`)
   - **Historique** : À l'origine, `Round` n'avait aucun champ `clubId`. Deux clubs différents écrasaient leurs compositions respectives.
   - **Correction apportée** : `clubId Int @default(541)` a été ajouté au modèle `Round` avec la contrainte unique `@@unique([seasonId, clubId, roundNumber])`. Le backend et le frontend transmettent désormais le `clubId` à chaque lecture/écriture, garantissant un cloisonnement strict par club.

2. **[RÉSOLU] Sécurité de la clé Directeur (`DIRECTOR_KEY`), CORS strict et traçabilité d'audit** (`server/src/middleware/auth.ts`, `server/src/index.ts`, `server/src/routes/api.ts`, `server/prisma/schema.prisma`)
   - **Historique** : Clé par défaut codée en dur (`'director1234'`) dans le backend et frontend, transmission en query string (`req.query.directorKey`), absence de limitation de débit sur `/api/auth/verify`, configuration CORS permissive (`callback(null, true)`), et absence totale de traçabilité (`savedBy` inexistant).
   - **Corrections apportées** :
     - Élimination du fallback par défaut en production (rejet strict au démarrage si `DIRECTOR_KEY` n'est pas configuré).
     - Comparaison cryptographique en temps constant (`crypto.timingSafeEqual`) pour prévenir les attaques temporelles.
     - Rejet strict HTTP 400 de tout secret passé dans l'URL (query string) ; utilisation obligatoire des en-têtes HTTP `x-director-key` ou `Authorization: Bearer`.
     - Protection anti-brute-force par `express-rate-limit` (10 tentatives / 15 min par IP).
     - Filtrage CORS strict et normalisé rejetant formellement toute origine non autorisée.
     - Audit et traçabilité : champ `savedBy` dans PostgreSQL/Prisma (`Round`, `TeamDraft`) avec mémorisation de l'auteur dans `DirectorAuthModal.tsx` et affichage dans la barre d'état du simulateur.

3. **[RÉSOLU] Suite de tests automatisés et pipeline CI GitHub Actions** (`vitest`, `node:test`, `.github/workflows/ci.yml`)
   - **Historique** : Ni le frontend ni le backend ne contenaient de suite de tests, laissant les règles critiques FRBE et la sécurité vulnérables aux régressions silencieuses.
   - **Corrections apportées** :
     - **Frontend** : Installation de **Vitest** (standard moderne natif Vite/TypeScript) pour tester le domaine pur :
       - `src/domain/rules/__tests__/frbeValidator.test.ts` (13 tests) : descente de titulaire interdite, seuils de réserve, division 1 (seuil 1800 et top 4 à 2000), tolérance de permutation d'échiquiers et règles de moyennes croisées inter-équipes.
       - `src/domain/__tests__/performance.test.ts` (12 tests) : inversion des résultats en fonction de la perspective domicile/visiteur, forfaits et scores partiels.
     - **Backend** : Tests unitaires via le test runner natif de Node.js (`node:test` via `tsx`) :
       - `server/src/middleware/__tests__/auth.test.ts` (14 tests) : comparaison en temps constant `safeCompareKeys`, rejet strict des secrets dans les query strings, extraction d'auteur et garde-fou au démarrage en production.
     - **Pipeline CI** : Création du workflow `.github/workflows/ci.yml` exécutant à chaque push et Pull Request sur `main` les suites de tests et la compilation TypeScript/Vite/Prisma en environnement isolé.

### 🟠 Majeur — Maintenabilité & Cohérence technique

4. **[RÉSOLU] Unification du calendrier et autorité de saison** (`server/src/utils/season.ts`, `server/src/utils/calendar.ts`, `GET /api/season/current`, `firestoreFallback.ts`)
   - **Historique** : La saison `'2026-2027'` et les 11 dates de rondes étaient dupliquées et codées en dur à 4 endroits (`season.ts`, `calendar.ts`, contrôleurs serveur, `firestoreFallback.ts:5`), avec des formats hétérogènes (`'2026'` vs `'2026-2027'`).
   - **Corrections apportées** :
     - **Backend comme autorité** : `server/src/utils/season.ts` centralise la configuration des saisons (`DEFAULT_SEASON = '2026-2027'`), les calendriers officiels (`OFFICIAL_SEASON_CALENDARS`) et expose `GET /api/season/current`.
     - `calendar.ts` consomme désormais directement `getRoundDatesForSeason` au lieu de dupliquer un tableau de dates distinct.
     - **Normalisation universelle** : ajout de `normalizeSeasonYear` et `getSeasonStartYear` front & back permettant d'interchanger `'2026'`, `'2026-2027'`, `'2026–2027'` sans bug de casting.
     - **Nettoyage Firestore** : `firestoreFallback.ts` utilise dynamiquement `ACTIVE_SEASON` au lieu d'une URL codée en dur sur `/years/2026`.
     - **Tests unitaires** : 11 nouveaux tests dédiés (`server/src/utils/__tests__/season.test.ts` et `interclub-dashboard/src/domain/__tests__/season.test.ts`).

5. **[RÉSOLU] Validation de schéma Zod et règles FRBE côté serveur** (`server/src/validation/schemas.ts`, `server/src/validation/frbeRules.ts`, `draftsController.ts`)
   - **Historique** : L'API Express acceptait n'importe quel payload JSON sans validation structurelle, permettant l'injection de doublons d'échiquiers, de matricules invalides ou du même joueur dans deux équipes différentes à la même ronde.
   - **Corrections apportées** :
     - **Validation stricte de schéma (Zod)** : validation de `POST /api/rounds/:roundNumber/drafts` et `POST /api/rounds/:roundNumber/lock`. Rejet strict avec code HTTP 400 si un échiquier est dupliqué au sein d'une équipe, si un joueur est aligné dans plusieurs équipes pour la même ronde, ou si les numéros d'échiquiers dépassent la limite (1..8).
     - **Validateur de règles FRBE côté serveur** : implémentation de `validateRoundDrafts` vérifiant la complétude par division, l'interdiction de descente de titulaire, les plafonds Elo des réserves, les contraintes de Division 1 et les moyennes croisées.
     - **Comportement adapté (Brouillon vs Verrouillage)** : les brouillons en cours d'élaboration restent sauvegardables avec retour d'un rapport de validation informatif ; lors du verrouillage officiel (`POST /lock`), le serveur effectue une vérification exhaustive et signale les éventuelles infractions dans le message de statut.
     - **Tests unitaires dédiés** : 15 nouveaux tests unitaires (`schemas.test.ts` et `frbeRules.test.ts`).

6. **[RÉSOLU] Suppression du code mort et consolidation des modèles** (`src/modelsFRBE.ts`, suppression de `src/frbeGatewayCalls.ts` et `src/models/`)
   - **Historique** : Présence de 21 fichiers obsolètes issus d'anciens prototypes, dont `src/frbeGatewayCalls.ts` (84 lignes orphelines court-circuitant le proxy) et 20 fichiers de modèles dans `src/models/` dont seul `ResultEnum` était encore importé.
   - **Corrections apportées** :
     - Rapatriement de `ResultEnum` au sein de `src/modelsFRBE.ts`.
     - Mise à jour des imports dans `src/utility.ts` et `src/api/firestoreFallback.ts`.
     - Suppression définitive de `src/frbeGatewayCalls.ts` et de l'intégralité du dossier `src/models/` (21 fichiers supprimés).
     - Nettoyage du graphe de dépendances et réduction de la dette technique.

### 🟡 Mineur — Performance & Ergonomie technique

7. **[RÉSOLU] Gestion du cache, annulation des requêtes et encapsulation du fallback** (`useClubData.ts`, `cache.ts`, `frbeClient.ts`, `fideClient.ts`, `firestoreFallback.ts`)
   - **Historique** : Au chargement, `useClubData` lançait en parallèle toutes les rondes `1..maxRound` (`Promise.all`) sans possibilité d'annulation si le `clubId` changeait ou lors du démontage du composant, causant des *race conditions*. De plus, `isFallbackMode` était exportée comme variable globale mutable (`export let isFallbackMode = false` dans `frbeClient.ts`), `clearCache()` omettait de purger les clés `fide_v3_*` ainsi que le cache mémoire, et les résultats immuables des rondes passées expiraient toutes les 15 minutes en `sessionStorage`.
   - **Corrections apportées** :
     - **Annulation par AbortController** : intégration d'un `AbortController` dans le hook `useClubData.ts` avec nettoyage `useEffect`, et propagation du signal d'annulation à l'ensemble des requêtes (`fetchClub`, `fetchRoundSeries`, `fetchVenues`, `fetchPlayerDirectory` et miroir Firestore).
     - **Encapsulation propre du mode dégradé** : élimination de `export let isFallbackMode`, remplacé par `getIsFallbackMode()`, `setFallbackMode()` et `resetFallbackMode()`.
     - **Vidage exhaustif multi-stockages** : mise à niveau de `clearCache()` pour purger à la fois `frbe_cache_*` et `fide_*` sur `sessionStorage` et `localStorage`, complété par `clearFideMemoryCache()`.
     - **Persistance différentielle** : conservation des rondes clôturées et validées (`round < defaultRound(ACTIVE_SEASON)`) en `localStorage` avec un TTL long de 30 jours (`COMPLETED_ROUND_TTL_MS`), réduisant drastiquement les requêtes réseau répétitives vers les serveurs FRBE.
     - **Tests unitaires dédiés** : nouveaux tests unitaires complets sous Vitest (`src/api/__tests__/cache.test.ts` et `src/api/__tests__/frbeClient.test.ts`).

8. **[RÉSOLU] Résilience face au Cold Start du Render Free Tier** (`backendClient.ts`, `SimulatorTab.tsx`)
   - **Historique** : Sur le plan gratuit Render, l'instance du serveur backend s'endort après 15 minutes d'inactivité, imposant un temps de réveil de 30 à 50 secondes. Les timeouts initiaux trop courts (`4000 ms` pour `/api/health`, `5000 ms` pour `fetchRoundDrafts`) faisaient échouer prématurément les requêtes et affichaient à tort un état "Local (Hors-ligne)".
   - **Corrections apportées** :
     - **Timeouts progressifs et résilients** : configuration de `COLD_START_TIMEOUT_MS = 50_000` et `DEFAULT_TIMEOUT_MS = 25_000` dans `backendClient.ts` pour couvrir intégralement la phase de démarrage du conteneur Render et la connexion PostgreSQL.
     - **Retry automatique avec notification de progression** : `checkServerHealth` implémente une boucle de nouvelle tentative adaptative avec callback `onProgress({ isWakingUp: true, elapsedMs })`.
     - **Feedback visuel distinct dans l'interface** : `SimulatorTab.tsx` distingue désormais clairement la phase de réveil d'une panne réelle via un badge ambre animé avec spinner `Loader2` (*"Réveil du serveur Render en cours..."*), basculant automatiquement vers l'état connecté dès la fin de l'initialisation et déclenchant la synchronisation des brouillons.
     - **Tests unitaires dédiés** : suite de tests simulant le cold start et vérifiant la résilience des retries (`src/api/__tests__/backendClient.test.ts`).

9. **[RÉSOLU] Génération et téléchargement direct de feuilles de match en PDF binaire** (`MatchSheetModal.tsx`, `src/domain/pdf/matchSheetPdf.ts`)
   - **Historique** : L'impression des feuilles de match reposait exclusivement sur le moteur d'impression natif du navigateur (`window.print()`), soumis à la variabilité des options locales des navigateurs (en-têtes URL, marges, case graphiques d'arrière-plan) et ne permettait pas de générer un fichier `.pdf` autonome téléchargeable d'un clic pour archivage ou diffusion électronique. De plus, le bas de page portait en dur le nom d'un club (*"Echiquier Leuzois"*).
   - **Corrections apportées** :
     - **Moteur vectoriel PDF autonome (`pdf-lib`)** : implémentation de `src/domain/pdf/matchSheetPdf.ts` générant des documents PDF binaires A4 Paysage conformes aux spécifications officielles FRBE.
     - **Polices standard sans surcharge réseau** : utilisation de `StandardFonts.Helvetica` et `StandardFonts.HelveticaBold` (0 KB de police embarquée) avec assainissement d'encodage WinAnsi (`sanitizeText`) préservant l'intégralité des accents français.
     - **Téléchargement direct en un clic** : ajout de boutons de téléchargement direct dans `MatchSheetModal.tsx` permettant d'exporter soit une feuille isolée pour une équipe, soit l'ensemble des feuilles de match de toutes les équipes en un seul document multi-pages.
     - **Dynamisation multi-clubs** : intégration dynamique du nom du club organisateur dans toutes les métadonnées et le pied de page officiel (`clubName || 'Interclubs FRBE'`).
     - **Tests unitaires dédiés** : tests unitaires sous Vitest (`src/domain/pdf/__tests__/matchSheetPdf.test.ts`) validant la conformité binaire du PDF, les dimensions de page A4 et le rendu multi-pages.

---

## 5. Index des Architecture Decision Records (ADR)

- [ADR-001 : Stack Frontend SPA (React 19, Vite 8, Tailwind v4, Contexts)](./adr/001-frontend-react-vite-tailwind.md)
- [ADR-002 : Proxy FRBE, Cache `sessionStorage` et Miroir Firestore REST](./adr/002-frbe-proxy-cache-and-firestore-fallback.md)
- [ADR-003 : Backend Express + Prisma + PostgreSQL (Neon / Render)](./adr/003-backend-express-prisma-postgresql.md)
- [ADR-004 : Authentification par Clé Partagée (`DIRECTOR_KEY`) et Confidentialité](./adr/004-director-key-authentication-and-privacy.md)
- [ADR-005 : Logique Métier et Validation FRBE côté Client](./adr/005-client-side-domain-logic-and-duplication.md)
- [ADR-006 : Génération des Feuilles de Match via `@media print` et `createPortal`](./adr/006-native-print-portal-match-sheets.md)
- [ADR-007 : Stratégie de Tests Automatisés et Pipeline CI (Vitest, Node test, GitHub Actions)](./adr/007-automated-testing-strategy-and-ci.md)
- [ADR-008 : Unification de la Saison et Autorité du Calendrier](./adr/008-centralized-season-and-calendar-authority.md)
- [ADR-009 : Validation de Schéma Zod et Règles Métier FRBE Côté Serveur](./adr/009-server-side-validation-zod-and-frbe-rules.md)
- [ADR-010 : Moteur de simulation Monte Carlo et projections de classement](./adr/010-monte-carlo-standings-projections.md)
- [ADR-011 : Stratégie de mise en cache, persistance et annulation des requêtes réseau](./adr/011-cache-management-and-network-burst-optimization.md)
- [ADR-012 : Résilience aux démarrages à froid (Cold Start) du serveur Render Free-Tier](./adr/012-render-cold-start-resilience-and-retries.md)
- [ADR-013 : Génération et téléchargement direct de feuilles de match en PDF binaire (pdf-lib)](./adr/013-binary-pdf-match-sheet-generation-pdf-lib.md)
